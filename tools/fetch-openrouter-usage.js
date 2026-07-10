#!/usr/bin/env node
// Fetches OpenRouter's daily model-rankings dataset and writes a small usage
// snapshot (top models and top AI labs by share of tokens routed through
// OpenRouter over the last 7 complete UTC days) to src/content/llm-usage.json.
// The snapshot is committed to git by the agent's daily job, so site builds
// never need the API key and always have data.
//
// This is deliberately a single, named lens on AI usage — OpenRouter's own
// API traffic, developer/agent-skewed, no consumer chatbots — not a claim
// about world usage. OpenRouter's dataset terms require the citation
// "Source: OpenRouter (openrouter.ai/rankings), as of {as_of}", rendered on
// the card by tools/inject-daily.js.
//
// Requires OPENROUTER_API_KEY in the environment (or .env); any valid key
// works (the dataset endpoints are read-only and free).
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const RANKINGS_URL = 'https://openrouter.ai/api/v1/datasets/rankings-daily';
const MODELS_URL = 'https://openrouter.ai/api/v1/models';
const OUT_FILE = path.join(process.cwd(), 'src', 'content', 'llm-usage.json');
const TOP_N = 3;
const WINDOW_DAYS = 7;

// Rankings permaslugs pin a release date and variant
// (e.g. "anthropic/claude-4.7-opus-20260416", "tencent/hy3-20260706:free");
// the public models list uses the canonical slug. Merge variants and dated
// releases into the canonical model.
function canonicalSlug(permaslug) {
  return permaslug.replace(/:[a-z0-9-]+$/i, '').replace(/-\d{8}$/, '');
}

// Fallbacks for lab names when a model is not in the public models list.
const LAB_NAMES = {
  openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google', 'x-ai': 'xAI',
  'meta-llama': 'Meta', mistralai: 'Mistral', deepseek: 'DeepSeek',
  qwen: 'Qwen', 'z-ai': 'Z.ai', moonshotai: 'Moonshot AI', minimax: 'MiniMax',
  tencent: 'Tencent', xiaomi: 'Xiaomi', stepfun: 'StepFun', bytedance: 'ByteDance',
  nvidia: 'NVIDIA', microsoft: 'Microsoft', amazon: 'Amazon', cohere: 'Cohere',
};

function fallbackNames(slug) {
  const [prefix, model] = slug.split('/');
  const lab = LAB_NAMES[prefix] || prefix.charAt(0).toUpperCase() + prefix.slice(1);
  const name = (model || slug)
    .split('-')
    .map((w) => (w.match(/\d/) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
  return { lab, name };
}

async function getJson(url, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

function isoDaysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

function pct(tokens, total) {
  return Math.round((tokens / total) * 1000) / 10;
}

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');

  // Last 7 complete UTC days (today's partial day would skew shares).
  const startDate = isoDaysAgo(WINDOW_DAYS);
  const endDate = isoDaysAgo(1);
  const rankings = await getJson(
    `${RANKINGS_URL}?start_date=${startDate}&end_date=${endDate}`,
    { Authorization: `Bearer ${apiKey}` },
  );
  if (!Array.isArray(rankings.data) || rankings.data.length === 0) {
    throw new Error('Rankings API returned no rows');
  }

  // Display names from the public models list ("Creator: Model Name").
  const modelNames = new Map();
  for (const m of (await getJson(MODELS_URL)).data || []) {
    modelNames.set(m.id, m.name);
  }

  // Sum tokens per canonical model across the window. The aggregated `other`
  // row counts toward the total, so shares are of ALL OpenRouter traffic.
  const byModel = new Map();
  let totalTokens = 0;
  for (const row of rankings.data) {
    const tokens = Number(row.total_tokens);
    totalTokens += tokens;
    if (row.model_permaslug === 'other') continue;
    const slug = canonicalSlug(row.model_permaslug);
    byModel.set(slug, (byModel.get(slug) || 0) + tokens);
  }

  const byLab = new Map();
  const models = [];
  for (const [slug, tokens] of byModel) {
    const listed = modelNames.get(slug);
    const { lab, name } = listed
      ? { lab: listed.split(': ')[0], name: listed.split(': ').slice(1).join(': ') || listed }
      : fallbackNames(slug);
    byLab.set(lab, (byLab.get(lab) || 0) + tokens);
    models.push({ name, lab, tokens });
  }
  models.sort((a, b) => b.tokens - a.tokens);

  const snapshot = {
    fetched_at: new Date().toISOString().slice(0, 10),
    as_of: rankings.meta?.as_of || new Date().toISOString(),
    window_start: startDate,
    window_end: endDate,
    source: 'OpenRouter (openrouter.ai/rankings)',
    source_url: 'https://openrouter.ai/rankings',
    models: models.slice(0, TOP_N).map((m) => ({ name: m.name, lab: m.lab, share: pct(m.tokens, totalTokens) })),
    labs: [...byLab.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N)
      .map(([name, tokens]) => ({ name, share: pct(tokens, totalTokens) })),
  };
  if (snapshot.models.length < TOP_N || snapshot.labs.length < TOP_N) {
    throw new Error('Fewer models than expected; snapshot not written');
  }
  fs.writeFileSync(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${path.relative(process.cwd(), OUT_FILE)} (window ${startDate}..${endDate})`);
  console.log('models:', snapshot.models.map((m) => `${m.name} ${m.share}%`).join(', '));
  console.log('labs:  ', snapshot.labs.map((l) => `${l.name} ${l.share}%`).join(', '));
}

main().catch((err) => {
  console.error('fetch-openrouter-usage failed:', err.message);
  process.exit(1);
});
