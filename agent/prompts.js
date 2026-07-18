// Loads prompt templates from agent/prompts/ in the working repo clone
// (config.repoDir) — not next to this file. The agent pulls the repo before
// every job, so a committed prompt edit takes effect on the next run without
// rebuilding or redeploying the agent image.
const fs = require('fs');
const path = require('path');
const { config } = require('./config');

function promptPath(name) {
  return path.join(config.repoDir, 'agent', 'prompts', `${name}.md`);
}

// Renders agent/prompts/<name>.md, substituting {{placeholder}} tokens from
// vars. Unknown placeholders throw so a typo in an edited prompt fails loudly
// instead of publishing a post with literal "{{steer}}" in it.
function render(name, vars = {}) {
  const raw = fs.readFileSync(promptPath(name), 'utf8');
  return raw
    .replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (key in vars) return vars[key];
      throw new Error(`Prompt ${name}.md uses unknown placeholder {{${key}}}`);
    })
    .trim();
}

module.exports = { render };
