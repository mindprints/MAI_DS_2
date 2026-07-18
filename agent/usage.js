// Per-call LLM usage log: one JSON line per generation appended to
// reports/llm-usage.jsonl in the working repo clone. The next commitAndPush
// (normally the same one that publishes the post or edit) sweeps it into git,
// so cost history accumulates in the repo with no extra infrastructure.
const fs = require('fs');
const path = require('path');
const { config } = require('./config');
const settings = require('./settings');

function usageFile() {
  return path.join(config.repoDir, 'reports', 'llm-usage.jsonl');
}

// USD cost from the price table in agent/settings.json. Only Anthropic needs
// this — OpenRouter returns cost on the response. Returns null when the model
// has no price entry (the tokens are still logged).
function computeCostUsd({ provider, model, inputTokens, outputTokens, searches }) {
  if (provider !== 'anthropic') return null;
  const prices = settings.load().prices || {};
  const p = (prices.anthropic || {})[model];
  if (!p) return null;
  let cost = (inputTokens * p.input + outputTokens * p.output) / 1e6;
  if (searches) cost += searches * ((prices.webSearchPer1000 ?? 10) / 1000);
  return Math.round(cost * 1e6) / 1e6;
}

// entry: { job, provider, model, inputTokens, outputTokens, searches?, turns?, costUsd? }
// Logging must never break publishing — failures only warn.
function record(entry) {
  const { job, provider, model, inputTokens = 0, outputTokens = 0, searches = 0, turns, costUsd } = entry;
  const line = {
    ts: new Date().toISOString(),
    job,
    provider,
    model,
    inputTokens,
    outputTokens,
    ...(searches ? { searches } : {}),
    ...(turns ? { turns } : {}),
    costUsd: costUsd ?? computeCostUsd({ provider, model, inputTokens, outputTokens, searches }),
  };
  try {
    fs.mkdirSync(path.dirname(usageFile()), { recursive: true });
    fs.appendFileSync(usageFile(), JSON.stringify(line) + '\n');
  } catch (err) {
    console.warn(`usage log failed: ${err.message}`);
  }
}

module.exports = { record, computeCostUsd };
