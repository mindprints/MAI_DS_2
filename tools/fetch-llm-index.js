#!/usr/bin/env node
// Fetches the Artificial Analysis LLM leaderboard and writes a small snapshot
// (top models by Intelligence Index, split into closed vs open weights) to
// src/content/llm-index.json. The snapshot is committed to git by the agent's
// daily job, so site builds never need the API key and always have data.
//
// Requires AA_API_KEY in the environment (or .env). Attribution to
// https://artificialanalysis.ai/ is required by their free API terms and is
// rendered on the card by tools/inject-daily.js.
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const API_URL = 'https://artificialanalysis.ai/api/v2/data/llms/models';
const OUT_FILE = path.join(process.cwd(), 'src', 'content', 'llm-index.json');
const TOP_N = 3;

// The API has no open-weights field, so classify by creator with model-level
// exceptions. Verified July 2026: GLM (zai), MiniMax, DeepSeek, Kimi ship open
// weights; Meta's Muse and Alibaba's Qwen Max/Plus tiers are proprietary.
const OPEN_CREATORS = new Set(['deepseek', 'zai', 'kimi', 'minimax', 'xiaomi', 'nvidia', 'allenai']);
// Creators that are open by default but keep some tiers closed (name pattern → closed).
const CLOSED_MODEL_EXCEPTIONS = { alibaba: /\b(max|plus|preview)\b/i };
// Closed creators that have released specific open-weights lines.
const OPEN_MODEL_EXCEPTIONS = { openai: /gpt-oss/i, google: /gemma/i, meta: /llama/i };

function isOpenWeights(model) {
  const creator = model.model_creator?.slug || '';
  const name = model.name || '';
  if (OPEN_CREATORS.has(creator)) return true;
  if (creator === 'alibaba') return !CLOSED_MODEL_EXCEPTIONS.alibaba.test(name);
  if (OPEN_MODEL_EXCEPTIONS[creator]) return OPEN_MODEL_EXCEPTIONS[creator].test(name);
  return false;
}

// "GPT-5.5 (xhigh)" and "GPT-5.5 (high)" are reasoning-effort variants of the
// same model; keep only the best-scoring variant under the base name.
function baseName(name) {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function topModels(models, open) {
  const best = new Map();
  for (const m of models) {
    const score = m.evaluations?.artificial_analysis_intelligence_index;
    if (score == null || isOpenWeights(m) !== open) continue;
    const key = baseName(m.name);
    if (!best.has(key) || best.get(key).score < score) {
      best.set(key, {
        name: key,
        creator: m.model_creator?.name || '',
        score: Math.round(score * 10) / 10,
      });
    }
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, TOP_N);
}

async function main() {
  const apiKey = process.env.AA_API_KEY;
  if (!apiKey) throw new Error('AA_API_KEY is not set');
  const res = await fetch(API_URL, { headers: { 'x-api-key': apiKey } });
  if (!res.ok) throw new Error(`Artificial Analysis API returned ${res.status}`);
  const { data } = await res.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error('API returned no models');

  const snapshot = {
    fetched_at: new Date().toISOString().slice(0, 10),
    source: 'Artificial Analysis Intelligence Index',
    source_url: 'https://artificialanalysis.ai/',
    closed: topModels(data, false),
    open: topModels(data, true),
  };
  if (snapshot.closed.length < TOP_N || snapshot.open.length < TOP_N) {
    throw new Error('Fewer models than expected; snapshot not written');
  }
  fs.writeFileSync(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${path.relative(process.cwd(), OUT_FILE)}`);
  console.log('closed:', snapshot.closed.map((m) => `${m.name} (${m.score})`).join(', '));
  console.log('open:  ', snapshot.open.map((m) => `${m.name} (${m.score})`).join(', '));
}

main().catch((err) => {
  console.error('fetch-llm-index failed:', err.message);
  process.exit(1);
});
