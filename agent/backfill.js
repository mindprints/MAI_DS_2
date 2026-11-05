// One-off backfill for days the agent missed (e.g. it was down after a
// reboot). Writes "on this day" and AI news posts for each date in a range
// into src/content/daily/ WITHOUT committing, so the batch can be read first
// and then committed and pushed once (one deploy instead of one per post).
//
//   node agent/backfill.js 2026-10-18 2026-11-02 [--only onthisday|ainews] [--roundup] [--force]
//
// --roundup replaces the per-day AI news with one catch-up briefing filed
// under the last date: a news search pinned to a single day weeks ago comes
// back thin and tends to leak in later events, while a roundup of the period
// is what readers actually missed.
//
// Days that already have a post are skipped unless --force. Runs oldest first
// so each AI news briefing sees the previous backfilled leads and doesn't
// repeat them. A failed day is reported and the run carries on; rerun the
// same range to retry just the gaps.
const jobs = require('./jobs');

const JOBS = {
  onthisday: jobs.runOnThisDay,
  ainews: jobs.runAiNews,
};

function parseArgs(argv) {
  const pos = argv.filter((a) => !a.startsWith('--'));
  const onlyIdx = argv.indexOf('--only');
  const only = onlyIdx !== -1 ? argv[onlyIdx + 1] : '';
  if (only && !JOBS[only]) throw new Error(`--only must be one of: ${Object.keys(JOBS).join(', ')}`);
  const [from, to = from] = pos.filter((a) => a !== only);
  if (!from) throw new Error('Usage: node agent/backfill.js FROM [TO] [--only onthisday|ainews] [--force]');
  return { from, to, only, force: argv.includes('--force'), roundup: argv.includes('--roundup') };
}

function dateRange(from, to) {
  jobs.partsFor(from);
  jobs.partsFor(to);
  if (to < from) throw new Error(`End date ${to} is before start date ${from}`);
  const out = [];
  for (let d = new Date(`${from}T12:00:00Z`); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

async function main() {
  const { from, to, only, force, roundup } = parseArgs(process.argv.slice(2));
  const types = only ? [only] : Object.keys(JOBS);
  const failed = [];
  const run = async (label, fn) => {
    try {
      const r = await fn();
      console.log(`${label}: ${r.skipped ? `skipped (${r.reason})` : r.title}`);
    } catch (err) {
      failed.push(label);
      console.error(`${label}: FAILED — ${err.message}`);
    }
  };
  for (const date of dateRange(from, to)) {
    for (const type of types) {
      if (roundup && type === 'ainews') continue;
      await run(`${date} ${type}`, () => JOBS[type]({ date, force, publish: false }));
    }
  }
  if (roundup && types.includes('ainews')) {
    await run(`${from}..${to} ainews roundup`, () => jobs.runAiNews({ date: to, since: from, force, publish: false }));
  }
  console.log(failed.length ? `\n${failed.length} failed: ${failed.join(', ')}` : '\nAll done.');
  console.log('Nothing is committed. Review src/content/daily/, then commit and push.');
  if (failed.length) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { dateRange, parseArgs };
