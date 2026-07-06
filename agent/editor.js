// Claude-driven editing loop: takes a natural-language instruction and
// edits the site source using file tools, scoped to src/ and docs/.
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const Anthropic = require('@anthropic-ai/sdk');
const { config } = require('./config');

const EDITABLE_PREFIXES = ['src/', 'docs/'];
const MAX_TURNS = 30;

function anthropic() {
  return new Anthropic({ apiKey: config.anthropicApiKey });
}

function safePath(rel) {
  const normalized = path.posix.normalize(String(rel).replace(/\\/g, '/'));
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
    throw new Error(`Path outside repository: ${rel}`);
  }
  if (!EDITABLE_PREFIXES.some((p) => normalized.startsWith(p) || normalized === p.slice(0, -1))) {
    throw new Error(`Path not editable (only src/ and docs/ are allowed): ${rel}`);
  }
  return path.join(config.repoDir, normalized);
}

const TOOLS = [
  {
    name: 'list_files',
    description: 'List files under a directory in the repository (recursive, relative paths). Only src/ and docs/ are accessible.',
    input_schema: {
      type: 'object',
      properties: { dir: { type: 'string', description: 'Directory, e.g. "src/site" or "src/content"' } },
      required: ['dir'],
    },
  },
  {
    name: 'read_file',
    description: 'Read a text file from the repository.',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Create or overwrite a text file in the repository (only under src/ or docs/).',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string' }, content: { type: 'string' } },
      required: ['path', 'content'],
    },
  },
  {
    name: 'delete_file',
    description: 'Delete a file in the repository (only under src/ or docs/).',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
  },
  {
    name: 'run_build',
    description: 'Run the site build (npm run build) and return the tail of its output. Use to validate changes.',
    input_schema: { type: 'object', properties: {} },
  },
];

function listFilesRec(dirAbs, baseAbs, out) {
  for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const p = path.join(dirAbs, entry.name);
    if (entry.isDirectory()) listFilesRec(p, baseAbs, out);
    else out.push(path.relative(baseAbs, p).replace(/\\/g, '/'));
  }
}

function runBuild() {
  return new Promise((resolve) => {
    execFile(
      'npm',
      ['run', 'build'],
      { cwd: config.repoDir, shell: process.platform === 'win32', maxBuffer: 10 * 1024 * 1024, timeout: 5 * 60 * 1000 },
      (err, stdout = '', stderr = '') => {
        const tail = (s) => s.split('\n').slice(-25).join('\n');
        resolve({
          ok: !err,
          output: `${tail(stdout)}\n${tail(stderr)}`.trim(),
        });
      },
    );
  });
}

async function execTool(name, input) {
  switch (name) {
    case 'list_files': {
      const abs = safePath(input.dir);
      if (!fs.existsSync(abs)) return `Directory not found: ${input.dir}`;
      const out = [];
      listFilesRec(abs, config.repoDir, out);
      return out.slice(0, 500).join('\n') || '(empty)';
    }
    case 'read_file': {
      const abs = safePath(input.path);
      if (!fs.existsSync(abs)) return `File not found: ${input.path}`;
      const content = fs.readFileSync(abs, 'utf8');
      return content.length > 100000 ? content.slice(0, 100000) + '\n…(truncated)' : content;
    }
    case 'write_file': {
      const abs = safePath(input.path);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, input.content, 'utf8');
      return `Wrote ${input.path} (${input.content.length} chars)`;
    }
    case 'delete_file': {
      const abs = safePath(input.path);
      if (!fs.existsSync(abs)) return `File not found: ${input.path}`;
      fs.unlinkSync(abs);
      return `Deleted ${input.path}`;
    }
    case 'run_build': {
      const { ok, output } = await runBuild();
      return `${ok ? 'BUILD OK' : 'BUILD FAILED'}\n${output}`;
    }
    default:
      return `Unknown tool: ${name}`;
  }
}

const SYSTEM = `You are the website editing agent for the Museum of Artificial Intelligence (aimuseum.se).
You edit the site's source files based on instructions the museum staff send via Telegram.

Repository conventions:
- src/site/ holds hand-authored HTML (including the home pages src/site/index.html in English and src/site/sv/index.html in Swedish), CSS, JS, and images. The site is bilingual: when you change user-visible text on one home page, make the equivalent change on the other language's page.
- src/content/pages/*.js are build modules pairing EN/SV HTML partials (in the same directory) with templates in src/templates/pages/. Daily generated posts live in src/content/daily/.
- public/ is build output — never edit it (you cannot; it is outside your allowed paths).
- Styling is Tailwind CSS utility classes plus src/site/assets/css/styles.css. Match the existing look (glass-card, section-title, slate/cyan/indigo palette).

Working method:
1. Locate the right file(s) with list_files/read_file before writing.
2. Make the smallest change that fulfils the instruction; preserve surrounding markup and formatting.
3. Run run_build to validate after your edits.
4. Finish with a short plain-text summary of what you changed and in which files. If the instruction is ambiguous or risky, say so in the summary instead of guessing wildly.

You cannot run git; committing and pushing happens automatically after you finish.`;

// Returns { summary, turns }.
async function runEditInstruction(instruction, { onProgress } = {}) {
  const client = anthropic();
  const messages = [{ role: 'user', content: instruction }];
  let summary = '';

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client.messages.create({
      model: config.model,
      max_tokens: 16000,
      system: SYSTEM,
      tools: TOOLS,
      messages,
    });

    const toolUses = response.content.filter((b) => b.type === 'tool_use');
    const texts = response.content.filter((b) => b.type === 'text').map((b) => b.text);

    if (toolUses.length === 0) {
      summary = texts.join('\n').trim();
      return { summary, turns: turn + 1 };
    }

    messages.push({ role: 'assistant', content: response.content });
    const results = [];
    for (const tu of toolUses) {
      if (onProgress) onProgress(`${tu.name} ${JSON.stringify(tu.input).slice(0, 120)}`);
      let result;
      try {
        result = await execTool(tu.name, tu.input);
      } catch (err) {
        result = `ERROR: ${err.message}`;
      }
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: String(result) });
    }
    messages.push({ role: 'user', content: results });
  }

  return { summary: summary || 'Stopped after reaching the tool-use turn limit.', turns: MAX_TURNS };
}

module.exports = { runEditInstruction, runBuild };
