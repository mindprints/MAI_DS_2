// Minimal daily scheduler: fires each job once per day at the configured
// HH:MM in the configured timezone. Checks every 30 seconds.
const { config } = require('./config');

function nowInZone() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

// jobs: [{ name, time: "HH:MM", run: async () => {} }]
function startScheduler(jobs, { onError } = {}) {
  const lastRun = new Map();
  const tick = async () => {
    const { date, time } = nowInZone();
    for (const job of jobs) {
      if (time === job.time && lastRun.get(job.name) !== date) {
        lastRun.set(job.name, date);
        try {
          await job.run();
        } catch (err) {
          if (onError) onError(job.name, err);
          else console.error(`Job ${job.name} failed:`, err);
        }
      }
    }
  };
  const interval = setInterval(tick, 30 * 1000);
  return () => clearInterval(interval);
}

module.exports = { startScheduler, nowInZone };
