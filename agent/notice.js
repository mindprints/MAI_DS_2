// The flash-notice banner on the two home pages. Exactly one notice exists at
// a time — it is a single JSON file, not a list — and src/site/assets/js/notice.js
// fetches it at runtime, so a change goes live with the next deploy.
//
// The dashboard's Notice tab writes the same file through its own copy of this
// logic in dashboard/lib/dashlib.js. The agent deliberately keeps a separate
// copy instead of requiring that module: dashboard/ is an Electron app, and the
// mai-agent image only rebuilds on changes under agent/, so a dependency added
// over there would break this bot at runtime long after the change landed. The
// two must agree on the file shape — change one, change the other.
const fs = require('fs');
const path = require('path');
const { config } = require('./config');
const { nowInZone } = require('./scheduler');

const NOTICE_REL = 'src/site/content/notice.json';
const EMPTY = { active: false, until: null, en: '', sv: '' };

function noticeFile() {
  return path.join(config.repoDir, NOTICE_REL);
}

function read() {
  const file = noticeFile();
  if (!fs.existsSync(file)) return { ...EMPTY };
  try {
    return { ...EMPTY, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch {
    // A corrupt file should not wedge the bot; the banner is never load-bearing.
    return { ...EMPTY };
  }
}

function write(notice) {
  const clean = {
    active: Boolean(notice.active),
    until: notice.until ? String(notice.until) : null,
    en: String(notice.en || ''),
    sv: String(notice.sv || ''),
  };
  if (clean.until && !/^\d{4}-\d{2}-\d{2}$/.test(clean.until)) {
    throw new Error(`"until" must be a YYYY-MM-DD date, got: ${clean.until}`);
  }
  fs.mkdirSync(path.dirname(noticeFile()), { recursive: true });
  fs.writeFileSync(noticeFile(), JSON.stringify(clean, null, 2) + '\n', 'utf8');
  return clean;
}

// True when a notice is switched on but its "until" date has already passed —
// the banner is configured yet invisible, which is easy to do from the
// dashboard and impossible to see from Telegram without being told.
function isExpired(notice) {
  if (!notice.active || !notice.until) return false;
  return nowInZone().date > notice.until;
}

function describe(notice) {
  const lines = [];
  if (isExpired(notice)) {
    lines.push(`Notice: ON but NOT VISIBLE — it expired ${notice.until}.`);
    lines.push('Send /notice post to clear the date and put it back up.');
  } else {
    lines.push(`Notice: ${notice.active ? 'live on the site' : 'not posted'}`);
  }
  lines.push('');
  lines.push(`EN: ${notice.en || '(empty)'}`);
  lines.push(`SV: ${notice.sv || '(empty)'}`);
  if (notice.until && !isExpired(notice)) {
    lines.push(`Expires: ${notice.until} (set from the dashboard)`);
  }
  return lines.join('\n');
}

module.exports = { read, write, describe, isExpired, EMPTY, NOTICE_REL };
