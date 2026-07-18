// Node-only test of the dashboard's repo helpers against the real repo.
// Run from dashboard/:  npm test
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const lib = require('../lib/dashlib');

const REPO = path.resolve(__dirname, '..', '..');
assert(lib.looksLikeSiteRepo(REPO), 'parent repo not recognized');

// Slides
const slides = lib.listSlides(REPO);
assert(slides.length > 0, 'no slides found');
assert(slides[0].filename && slides[0].absPath, 'slide entry missing fields');
assert(fs.existsSync(slides[0].absPath), 'slide image missing on disk');

// Prompts
const prompts = lib.listPrompts(REPO);
assert(prompts.includes('agent/prompts/on-this-day.md'), 'on-this-day prompt not listed');
assert(prompts.includes('agent/prompts/shared/html-rules.md'), 'shared prompt not listed');
const text = lib.readRepoFile(REPO, 'agent/prompts/on-this-day.md');
assert(text.includes('{{readable}}'), 'prompt content unexpected');

// Path safety
assert.throws(() => lib.readRepoFile(REPO, '../secrets.txt'), /outside repository/);
assert.throws(() => lib.readRepoFile(REPO, 'server/server.js'), /not editable/);
assert.throws(() => lib.safeAbs(REPO, 'agent/prompts/../../package.json'), /not editable/);

// Settings round-trip shape (no write to the real file)
const settings = lib.readSettings(REPO);
assert(settings.generation && settings.prices, 'settings.json missing sections');

// Notice: read defaults, write validation (in a temp repo so the real file is untouched)
const os = require('os');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mai-notice-'));
fs.mkdirSync(path.join(tmp, 'src', 'site', 'content'), { recursive: true });
const n0 = lib.readNotice(tmp);
assert.strictEqual(n0.active, false, 'missing notice should read as inactive');
lib.writeNotice(tmp, { active: true, en: 'Fully booked', sv: 'Fullbokat', until: '2026-07-20' });
const n1 = lib.readNotice(tmp);
assert.strictEqual(n1.active, true);
assert.strictEqual(n1.sv, 'Fullbokat');
assert.strictEqual(n1.until, '2026-07-20');
assert.throws(() => lib.writeNotice(tmp, { active: true, en: 'x', until: 'next week' }), /YYYY-MM-DD/);
const realNotice = lib.readNotice(REPO);
assert.strictEqual(typeof realNotice.active, 'boolean', 'repo notice.json unreadable');

// Usage aggregation on synthetic entries
const now = new Date('2026-07-18T12:00:00Z');
const entries = [
  { ts: '2026-07-18T04:00:00Z', job: 'ainews', provider: 'anthropic', model: 'claude-sonnet-5', inputTokens: 1000, outputTokens: 2000, costUsd: 0.05 },
  { ts: '2026-07-17T04:00:00Z', job: 'onthisday', provider: 'anthropic', model: 'claude-sonnet-5', inputTokens: 500, outputTokens: 1500, costUsd: 0.02 },
  { ts: '2026-06-01T04:00:00Z', job: 'edit', provider: 'anthropic', model: 'claude-sonnet-5', inputTokens: 100, outputTokens: 100, costUsd: 0.01 },
  { ts: '2026-07-18T05:00:00Z', job: 'ainews', provider: 'openrouter', model: 'x-ai/grok-4.5', inputTokens: 900, outputTokens: 1100 },
];
const sum = lib.aggregateUsage(entries, { windowDays: 30, now });
assert.strictEqual(sum.days.length, 30, 'window length wrong');
assert.strictEqual(sum.days[29].date, '2026-07-18', 'window not anchored to today');
assert.strictEqual(sum.days[29].calls, 2, 'today call count wrong');
assert.strictEqual(Math.round(sum.monthCostUsd * 100) / 100, 0.07, 'month cost wrong');
assert.strictEqual(Math.round(sum.windowCostUsd * 100) / 100, 0.07, 'window cost wrong');
assert.strictEqual(sum.totalCalls, 4);
assert.strictEqual(sum.unpricedCalls, 1, 'unpriced call not counted');
assert.strictEqual(sum.byModel[0].model, 'claude-sonnet-5', 'model sort wrong');
assert.strictEqual(sum.byModel[0].calls, 3);

console.log('DASHLIB_TESTS_OK');
