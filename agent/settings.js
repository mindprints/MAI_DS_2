// Runtime agent settings, read fresh from agent/settings.json in the working
// repo clone on every use. Like the prompt templates, the file is committed to
// the repo, so changing the model for a job is a commit + push — picked up at
// the next job run, no redeploy. Env vars (ANTHROPIC_MODEL, OPENROUTER_MODEL)
// remain the fallback whenever the file is missing or a field is empty, so a
// clone without settings.json behaves exactly as before.
const fs = require('fs');
const path = require('path');
const { config } = require('./config');

function load() {
  const file = path.join(config.repoDir, 'agent', 'settings.json');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`settings.json unreadable (${err.message}); falling back to env config`);
    }
    return {};
  }
}

// Provider + model for a daily content job ("onthisday" | "ainews").
function generationFor(job) {
  const s = (load().generation || {})[job] || {};
  if (s.provider === 'openrouter' && s.model) {
    return { provider: 'openrouter', model: s.model };
  }
  if (s.provider === 'anthropic') {
    return { provider: 'anthropic', model: s.model || config.model };
  }
  // No (or empty) settings entry: legacy env behavior.
  if (config.openRouterModel) {
    return { provider: 'openrouter', model: config.openRouterModel };
  }
  return { provider: 'anthropic', model: config.model };
}

// Model for the Telegram editing loop (always Anthropic — it uses tool use).
function editorModel() {
  return load().editorModel || config.model;
}

module.exports = { load, generationFor, editorModel };
