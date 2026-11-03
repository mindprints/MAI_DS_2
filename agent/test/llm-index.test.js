// Node-only test of the leaderboard's open/closed split. Run from the repo root:  npm test
//
// The free Artificial Analysis endpoint gives creators by display name only,
// so the split depends on names normalizing to the right keys. A miss would
// quietly move a model to the wrong column on the home page.
const assert = require('assert');
const { isOpenWeights, topModels } = require('../../tools/fetch-llm-index');

const m = (name, creator, score) => ({
  name,
  model_creator: { id: 'x', name: creator },
  evaluations: { artificial_analysis_intelligence_index: score },
});

assert.ok(isOpenWeights(m('GLM-5.3 (Max)', 'Z AI')), 'Z AI should be open');
assert.ok(isOpenWeights(m('Kimi K3.1 Pro', 'Kimi')), 'Kimi should be open');
assert.ok(isOpenWeights(m('DeepSeek V4.1', 'DeepSeek')), 'DeepSeek should be open');
assert.ok(isOpenWeights(m('OLMo 4', 'Allen Institute for AI')), 'Allen AI alias should be open');
assert.ok(isOpenWeights(m('Qwen4 32B', 'Alibaba')), 'Qwen open tier should be open');
assert.ok(!isOpenWeights(m('Qwen4 Max', 'Alibaba')), 'Qwen Max should be closed');
assert.ok(isOpenWeights(m('gpt-oss-2 120B', 'OpenAI')), 'gpt-oss should be open');
assert.ok(!isOpenWeights(m('GPT-6 Astra', 'OpenAI')), 'GPT-6 should be closed');
assert.ok(!isOpenWeights(m('Claude Opus 5.5', 'Anthropic')), 'Anthropic should be closed');
assert.ok(!isOpenWeights({ name: 'Orphan', model_creator: null }), 'missing creator must not throw');

const top = topModels(
  [m('GPT-6 Astra (xhigh)', 'OpenAI', 56.9), m('GPT-6 Astra (high)', 'OpenAI', 54), m('Claude Opus 5.5', 'Anthropic', 58.4)],
  false,
);
assert.deepStrictEqual(
  top.map((t) => `${t.name}:${t.score}`),
  ['Claude Opus 5.5:58.4', 'GPT-6 Astra:56.9'],
  'variants not collapsed to the best score',
);

console.log('llm-index.test.js: all checks passed');
