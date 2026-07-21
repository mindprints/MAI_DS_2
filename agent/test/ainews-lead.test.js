// Node-only test of the AI-news repeat-avoidance helper, run against a
// throwaway repo directory. Run from the repo root:  npm test
//
// The helper finds previous posts by matching filenames, so the thing most
// worth pinning down is that it matches the names publishPost actually
// writes. If those drift apart it returns nothing, the prompt loses its
// "don't lead with this again" section, and the only symptom is a briefing
// that repeats itself weeks later.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'mai-ainews-'));
const daily = path.join(repo, 'src', 'content', 'daily');
fs.mkdirSync(daily, { recursive: true });
process.env.REPO_DIR = repo;

const post = (date, type, title) => {
  // Same shape publishPost writes: <date>.<type>.<locale>.html
  fs.writeFileSync(
    path.join(daily, `${date}.${type}.en.html`),
    `<article><h1 class="post-title">${title}</h1><p>body</p></article>\n`,
  );
  fs.writeFileSync(path.join(daily, `${date}.${type}.sv.html`), '<article><h1>svensk</h1></article>\n');
};

post('2026-07-18', 'ainews', 'Moonshot AI ships Kimi K3');
post('2026-07-19', 'ainews', 'Kimi K3 lands in Europe');
post('2026-07-20', 'ainews', 'EU opens an inquiry');
post('2026-07-20', 'onthisday', 'The perceptron turns 68');

const { recentPostTitles } = require('../jobs');

// Newest first, limited, and strictly before the requested date — today's own
// post must never be fed back as a previous lead.
const recent = recentPostTitles('ainews', { limit: 2, beforeIso: '2026-07-21' });
assert.strictEqual(recent.length, 2, `expected 2 recent leads, got ${recent.length}`);
assert.deepStrictEqual(
  recent.map((r) => r.date),
  ['2026-07-20', '2026-07-19'],
  'recent leads are not newest-first',
);
assert.strictEqual(recent[0].title, 'EU opens an inquiry', 'title not extracted from the h1');

// Types must not bleed into each other.
assert.ok(
  !recent.some((r) => /perceptron/i.test(r.title)),
  'an on-this-day post leaked into the AI-news leads',
);
const onthisday = recentPostTitles('onthisday', { limit: 2, beforeIso: '2026-07-21' });
assert.strictEqual(onthisday.length, 1);
assert.strictEqual(onthisday[0].title, 'The perceptron turns 68');

// A gap in publishing must not hide the last real post — this is why the
// helper scans the directory instead of just looking at yesterday.
const acrossGap = recentPostTitles('ainews', { limit: 1, beforeIso: '2026-07-25' });
assert.strictEqual(acrossGap[0].date, '2026-07-20', 'a publishing gap hid the previous lead');

// Regenerating today's post must not see itself.
post('2026-07-21', 'ainews', 'Today, freshly written');
const excludingToday = recentPostTitles('ainews', { limit: 2, beforeIso: '2026-07-21' });
assert.ok(
  !excludingToday.some((r) => r.date === '2026-07-21'),
  "today's own post was offered back as a previous lead",
);

// No history at all is a normal first run, not an error.
const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'mai-ainews-empty-'));
process.env.REPO_DIR = empty;
delete require.cache[require.resolve('../jobs')];
delete require.cache[require.resolve('../config')];
assert.deepStrictEqual(require('../jobs').recentPostTitles('ainews', { limit: 2 }), []);

fs.rmSync(repo, { recursive: true, force: true });
fs.rmSync(empty, { recursive: true, force: true });
console.log('ainews-lead.test.js: all checks passed');
