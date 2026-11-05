// Node-only test of the backfill date handling. Run from the repo root:  npm test
//
// A backfilled post is filed under the date partsFor returns, so an
// off-by-one here would put every essay on the wrong calendar day.
const assert = require('assert');
const { partsFor } = require('../jobs');
const { dateRange, parseArgs } = require('../backfill');

assert.deepStrictEqual(partsFor('2026-10-18'), { iso: '2026-10-18', readable: '18 October', readableSv: '18 oktober' });
assert.strictEqual(partsFor('2026-11-01').readableSv, '1 november');
assert.throws(() => partsFor('2026-02-30'), /Bad date/);
assert.throws(() => partsFor('18/10/2026'), /Bad date/);

const range = dateRange('2026-10-30', '2026-11-02');
assert.deepStrictEqual(range, ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'], 'range crosses the month wrong');
// The DST switch (25 Oct in Sweden) must not skip or repeat a day.
assert.strictEqual(dateRange('2026-10-18', '2026-11-02').length, 16);
assert.deepStrictEqual(dateRange('2026-10-18', '2026-10-18'), ['2026-10-18']);
assert.throws(() => dateRange('2026-11-02', '2026-10-18'), /before start/);

assert.deepStrictEqual(parseArgs(['2026-10-18', '2026-11-02', '--only', 'ainews']), {
  from: '2026-10-18',
  to: '2026-11-02',
  only: 'ainews',
  force: false,
  roundup: false,
});
assert.strictEqual(parseArgs(['2026-10-18', '2026-11-02', '--roundup']).roundup, true);
assert.strictEqual(parseArgs(['2026-10-18']).to, '2026-10-18');
assert.throws(() => parseArgs(['2026-10-18', '--only', 'quiz']), /--only/);

console.log('backfill.test.js passed');
