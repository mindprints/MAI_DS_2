// Node-only test of the scheduler's monthly ("day") support. Run from the
// repo root: npm test
//
// The failures that matter: a monthly job firing on the wrong day, firing
// twice on the right one, or — the quiet one — never firing at all because it
// asked for a day that some month does not have.
const assert = require('assert');

process.env.AGENT_TIMEZONE = 'UTC';

const scheduler = require('../scheduler');

// Drive the clock instead of waiting on it: startScheduler takes `now`, and
// the tick it registers is captured through a fake timer.
let clock = { date: '2026-08-01', time: '06:40' };

const realSetInterval = global.setInterval;
let tick = null;
global.setInterval = (fn) => { tick = fn; return 0; };

const fired = [];
scheduler.startScheduler(
  [
    { name: 'daily', time: '06:40', run: async () => { fired.push(`daily@${clock.date}`); } },
    { name: 'monthly', time: '06:40', day: 1, run: async () => { fired.push(`monthly@${clock.date}`); } },
    // Asks for the 30th, which February never has.
    { name: 'lateday', time: '06:40', day: 30, run: async () => { fired.push(`lateday@${clock.date}`); } },
  ],
  {
    now: () => clock,
    onError: (name, err) => { throw new Error(`${name}: ${err.message}`); },
  },
);
global.setInterval = realSetInterval;
assert.ok(tick, 'startScheduler should have registered an interval');

async function at(date, time) {
  clock = { date, time };
  await tick();
}

(async () => {
  // Day 1: both the daily and the monthly job are due.
  await at('2026-08-01', '06:40');
  assert.deepStrictEqual(fired, ['daily@2026-08-01', 'monthly@2026-08-01']);

  // Same day, same minute, ticked again 30s later — neither may run twice.
  await at('2026-08-01', '06:40');
  assert.strictEqual(fired.length, 2, 'a job must not fire twice in one day');

  // Wrong time on the right day.
  fired.length = 0;
  await at('2026-09-01', '06:41');
  assert.deepStrictEqual(fired, [], 'nothing is due a minute late');

  // Day 2: the daily job runs, the monthly one does not.
  fired.length = 0;
  await at('2026-08-02', '06:40');
  assert.deepStrictEqual(fired, ['daily@2026-08-02'], 'monthly job fired on the wrong day');

  // Next month, day 1: the monthly job comes back.
  fired.length = 0;
  await at('2026-09-01', '06:40');
  assert.deepStrictEqual(fired, ['daily@2026-09-01', 'monthly@2026-09-01']);

  // The 30th-of-the-month job is clamped to the 28th, so it still fires in a
  // short February instead of being skipped for the month.
  fired.length = 0;
  await at('2027-02-28', '06:40');
  assert.ok(fired.includes('lateday@2027-02-28'), 'a day-30 job must still run in February');

  fired.length = 0;
  await at('2027-02-27', '06:40');
  assert.ok(!fired.some((f) => f.startsWith('lateday')), 'clamped job fired on the wrong day');

  console.log('SCHEDULER_TESTS_OK');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
