// The natural-language editor gained a run_daily_job tool so plain-text
// requests ("please try the jobs again") can trigger the morning jobs, not
// just the /news and /ontoday slash commands. This pins that the tool routes
// to the right runner, forwards the topic, and reports skips. Jobs are stubbed
// so the test never reaches a model or pushes.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'mai-editor-'));
process.env.REPO_DIR = repo;
process.env.TELEGRAM_CHAT_ID = '99';
process.env.TELEGRAM_ALLOWED_USER_IDS = '42';
process.env.ANTHROPIC_API_KEY = 'stub';

const calls = [];
require.cache[require.resolve('../jobs')] = {
  id: 'stub-jobs', filename: 'stub-jobs', loaded: true, children: [], paths: [],
  exports: {
    runAiNews: async (opts) => { calls.push(['news', opts]); return { skipped: false, title: 'AI news today', link: 'https://aimuseum.se/x', commit: 'abc1234' }; },
    runOnThisDay: async (opts) => { calls.push(['onthisday', opts]); return { skipped: true, reason: 'Post for 2026-07-26 already exists' }; },
    runLlmIndex: async (opts) => { calls.push(['llmindex', opts]); return { skipped: false, title: 'LLM intelligence index updated', link: '', commit: 'def5678' }; },
    runLlmUsage: async (opts) => { calls.push(['llmusage', opts]); return { skipped: true, reason: 'Usage shares unchanged' }; },
  },
};

const { execTool, TOOLS } = require('../editor');

(async () => {
  // The tool is advertised to the model.
  const tool = TOOLS.find((t) => t.name === 'run_daily_job');
  assert.ok(tool, 'run_daily_job tool is missing from TOOLS');
  assert.deepStrictEqual(
    tool.input_schema.properties.job.enum,
    ['news', 'onthisday', 'llmindex', 'llmusage'],
    'run_daily_job job enum drifted',
  );

  // A published job reports its title, link and commit.
  const news = await execTool('run_daily_job', { job: 'news' });
  assert.match(news, /AI news today/, 'news result did not include the title');
  assert.match(news, /aimuseum\.se\/x/, 'news result did not include the link');
  assert.match(news, /abc1234/, 'news result did not include the commit');
  assert.deepStrictEqual(calls.at(-1), ['news', { force: false, topic: '' }], 'news runner got the wrong args');

  // A topic is trimmed and forwarded (it forces regeneration downstream).
  await execTool('run_daily_job', { job: 'news', topic: '  big launch  ' });
  assert.deepStrictEqual(calls.at(-1), ['news', { force: false, topic: 'big launch' }], 'topic was not trimmed/forwarded');

  // A skipped job surfaces the reason rather than pretending it published.
  const skipped = await execTool('run_daily_job', { job: 'onthisday' });
  assert.match(skipped, /skipped/i, 'skip was not reported as a skip');
  assert.match(skipped, /already exists/, 'skip reason was dropped');

  // llmindex/llmusage route too.
  assert.match(await execTool('run_daily_job', { job: 'llmindex' }), /def5678/, 'llmindex did not route');
  await execTool('run_daily_job', { job: 'llmusage' });
  assert.strictEqual(calls.filter((c) => c[0] === 'llmusage').length, 1, 'llmusage did not route');

  // An unknown job is refused, not silently run — and quiz is intentionally
  // not exposed here (its publish gate must stay on the /quiz flow).
  const bad = await execTool('run_daily_job', { job: 'quiz' });
  assert.match(bad, /Unknown job/, 'unknown job was not refused');

  fs.rmSync(repo, { recursive: true, force: true });
  console.log('editor.test.js: all checks passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
