// Node-only test of the /notice command flow, run against a throwaway repo
// directory with Telegram and git stubbed out.
// Run from the repo root:  npm test
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Point the agent at a scratch repo before config.js reads REPO_DIR, and seed
// it with the shape the dashboard leaves behind: switched on, but with an
// "until" date that has already passed.
const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'mai-notice-'));
fs.mkdirSync(path.join(repo, 'src/site/content'), { recursive: true });
const noticePath = path.join(repo, 'src/site/content/notice.json');
const YESTERDAY = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
const seed = { active: true, until: YESTERDAY, en: 'Andon Labs lecture series', sv: 'Andon Labs föreläsningsserie' };
fs.writeFileSync(noticePath, JSON.stringify(seed, null, 2));

process.env.REPO_DIR = repo;
process.env.TELEGRAM_CHAT_ID = '99';
process.env.TELEGRAM_ALLOWED_USER_IDS = '42';

// Replace telegram/gitrepo in the module cache so requiring index.js neither
// talks to Telegram nor touches a real clone.
const sent = [];
let pushes = 0;
require.cache[require.resolve('../telegram')] = {
  id: 'stub-telegram', filename: 'stub-telegram', loaded: true, children: [], paths: [],
  exports: { sendMessage: async (_chatId, text) => { sent.push(text); }, poll: async () => {} },
};
require.cache[require.resolve('../gitrepo')] = {
  id: 'stub-gitrepo', filename: 'stub-gitrepo', loaded: true, children: [], paths: [],
  exports: {
    pull: async () => {},
    commitAndPush: async () => { pushes += 1; return 'abc1234 Notice'; },
    setup: async () => {},
    status: async () => ({ branch: 'main', last: 'abc1234 seed', dirty: '' }),
  },
};

const { onMessage } = require('../index');
const notice = require('../notice');

const msg = (text) => ({ text, chat: { id: '99' }, from: { id: '42' } });
const onDisk = () => JSON.parse(fs.readFileSync(noticePath, 'utf8'));
const last = () => sent[sent.length - 1] || '';
function reset() { sent.length = 0; pushes = 0; }

(async () => {
  // A notice left active past its date is configured but invisible. /notice
  // has to say so, because nothing else in Telegram reveals it.
  reset();
  await onMessage(msg('/notice'));
  assert.match(last(), /NOT VISIBLE/, '/notice did not flag the expired notice');
  assert.match(last(), new RegExp(YESTERDAY), '/notice did not name the expiry date');
  assert.strictEqual(pushes, 0, 'reading the notice should not push');

  // Posting clears the stale date — this is the whole reason durations stay
  // out of Telegram: post means "up until I remove it".
  reset();
  await onMessage(msg('/notice post'));
  assert.strictEqual(onDisk().active, true, 'post did not activate');
  assert.strictEqual(onDisk().until, null, 'post did not clear until');
  assert.strictEqual(pushes, 1, 'post did not push exactly once');
  assert.match(last(), /cleared/, 'post did not mention the cleared date');

  // Content sets both languages; the sv subcommand corrects only Swedish.
  reset();
  await onMessage(msg('/notice content Doors open at 18:00'));
  assert.strictEqual(onDisk().en, 'Doors open at 18:00');
  assert.strictEqual(onDisk().sv, 'Doors open at 18:00', 'content should fill sv too');

  reset();
  await onMessage(msg('/notice sv Dörrarna öppnar 18:00'));
  assert.strictEqual(onDisk().en, 'Doors open at 18:00', 'sv must not touch English');
  assert.strictEqual(onDisk().sv, 'Dörrarna öppnar 18:00');

  // Removing keeps the text so it can be put back up.
  reset();
  await onMessage(msg('/notice remove'));
  assert.strictEqual(onDisk().active, false, 'remove did not deactivate');
  assert.strictEqual(onDisk().en, 'Doors open at 18:00', 'remove must keep the text');

  // Removing again is a no-op rather than an empty commit.
  reset();
  await onMessage(msg('/notice remove'));
  assert.strictEqual(pushes, 0, 'removing twice should not push');
  assert.match(last(), /Nothing is posted/);

  // Guards: no text to set, and nothing to post.
  reset();
  await onMessage(msg('/notice content'));
  assert.strictEqual(pushes, 0, 'empty content should not push');
  assert.match(last(), /Send the text/);

  fs.writeFileSync(noticePath, JSON.stringify({ active: false, until: null, en: '', sv: '' }));
  reset();
  await onMessage(msg('/notice post'));
  assert.strictEqual(pushes, 0, 'posting empty text should not push');
  assert.match(last(), /Nothing to post/);

  reset();
  await onMessage(msg('/notice enable'));
  assert.strictEqual(pushes, 0);
  assert.match(last(), /Unknown notice command/);

  // A prefix match must not swallow a different command.
  reset();
  await onMessage(msg('/noticeboard'));
  assert.match(last(), /Unknown command/, '/noticeboard was captured by /notice');

  // The banner is never load-bearing: a corrupt file must not wedge the bot.
  fs.writeFileSync(noticePath, '{ not json');
  reset();
  await onMessage(msg('/notice'));
  assert.match(last(), /not posted/, 'corrupt notice.json was not handled');

  // The file shape is shared with dashboard/lib/dashlib.js, which validates
  // the same way.
  assert.throws(
    () => notice.write({ active: true, until: '20 July', en: 'x', sv: 'x' }),
    /YYYY-MM-DD/,
    'write() accepted a malformed until date',
  );

  fs.rmSync(repo, { recursive: true, force: true });
  console.log('notice.test.js: all checks passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
