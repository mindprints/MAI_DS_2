// The two daily content jobs: "On this day" essay and AI news summary.
// Both are bilingual (EN + SV in one generation), write posts into
// src/content/daily/, commit + push (which triggers the preview deployment
// rebuild), and return info for the Telegram announcement.
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const { config } = require('./config');
const gitrepo = require('./gitrepo');
const prompts = require('./prompts');
const settings = require('./settings');
const usage = require('./usage');

const DAILY_DIR = () => path.join(config.repoDir, 'src', 'content', 'daily');

function anthropic() {
  return new Anthropic({ apiKey: config.anthropicApiKey });
}

// Generation backend for the two content jobs. Provider + model come from
// agent/settings.json (falling back to ANTHROPIC_MODEL / OPENROUTER_MODEL env
// vars — see agent/settings.js). Records token usage to reports/llm-usage.jsonl
// and returns the reply text.
async function generate(prompt, { search = false, job } = {}) {
  const gen = settings.generationFor(job);
  if (gen.provider === 'openrouter') return generateOpenRouter(gen.model, prompt, { search, job });
  const client = anthropic();
  // Adaptive thinking is on by default and counts against max_tokens,
  // so leave generous headroom or the reply is all thinking and no text.
  const response = await client.messages.create({
    model: gen.model,
    max_tokens: 16000,
    ...(search ? { tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 8 }] } : {}),
    messages: [{ role: 'user', content: prompt }],
  });
  usage.record({
    job,
    provider: 'anthropic',
    model: gen.model,
    inputTokens: response.usage?.input_tokens || 0,
    outputTokens: response.usage?.output_tokens || 0,
    searches: response.usage?.server_tool_use?.web_search_requests || 0,
  });
  return response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}

async function generateOpenRouter(model, prompt, { search = false, job } = {}) {
  if (!config.openRouterApiKey) throw new Error('OpenRouter model configured but OPENROUTER_API_KEY is missing');
  const body = {
    model,
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
    // Ask OpenRouter to report token counts and cost on the response.
    usage: { include: true },
  };
  // OpenRouter web plugin (Exa): ~$0.005/request for up to 10 results,
  // injected into context and cited via url_citation annotations.
  if (search) body.plugins = [{ id: 'web', max_results: 8 }];
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.openRouterApiKey}`,
      'content-type': 'application/json',
      'HTTP-Referer': 'https://aimuseum.se',
      'X-Title': 'MAI daily jobs',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`OpenRouter ${resp.status}: ${detail.slice(0, 300)}`);
  }
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error(`OpenRouter reply contained no content (finish: ${data.choices?.[0]?.finish_reason || 'unknown'})`);
  usage.record({
    job,
    provider: 'openrouter',
    model,
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
    costUsd: typeof data.usage?.cost === 'number' ? data.usage.cost : null,
  });
  return text;
}

// Today's date parts in the configured timezone.
function todayParts() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const iso = fmt.format(new Date()); // YYYY-MM-DD
  const readable = new Intl.DateTimeFormat('en-GB', {
    timeZone: config.timezone,
    day: 'numeric',
    month: 'long',
  }).format(new Date()); // e.g. "6 July"
  const readableSv = new Intl.DateTimeFormat('sv-SE', {
    timeZone: config.timezone,
    day: 'numeric',
    month: 'long',
  }).format(new Date()); // e.g. "6 juli"
  return { iso, readable, readableSv };
}

// Extract the last JSON object from a model response, tolerating code fences
// and surrounding prose.
function parseJsonReply(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Model reply contained no JSON object');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function postPath(dateIso, type, locale) {
  return path.join(DAILY_DIR(), `${dateIso}.${type}.${locale}.html`);
}

function postExists(dateIso, type) {
  return fs.existsSync(postPath(dateIso, type, 'en'));
}

// Titles of the most recent published posts of a type, strictly before
// beforeIso, newest first. Scans the directory (rather than just checking
// "yesterday") so a skipped day doesn't hide the last real post.
function recentPostTitles(type, { limit = 2, beforeIso } = {}) {
  const dir = DAILY_DIR();
  if (!fs.existsSync(dir)) return [];
  const re = new RegExp(`^(\\d{4}-\\d{2}-\\d{2})\\.${type}\\.en\\.html$`);
  return fs
    .readdirSync(dir)
    .map((f) => {
      const m = f.match(re);
      return m ? { date: m[1], file: f } : null;
    })
    .filter((d) => d && (!beforeIso || d.date < beforeIso))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
    .map((d) => {
      const html = fs.readFileSync(path.join(dir, d.file), 'utf8');
      const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      const title = m ? m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';
      return title ? { date: d.date, title } : null;
    })
    .filter(Boolean);
}

async function publishPost(dateIso, type, post, commitMessage) {
  fs.mkdirSync(DAILY_DIR(), { recursive: true });
  fs.writeFileSync(postPath(dateIso, type, 'en'), post.html_en.trim() + '\n', 'utf8');
  if (post.html_sv) {
    fs.writeFileSync(postPath(dateIso, type, 'sv'), post.html_sv.trim() + '\n', 'utf8');
  }
  const commit = await gitrepo.commitAndPush(commitMessage);
  const pagePath = `pages/daily/${dateIso}-${type}.html`;
  const link = config.previewUrl ? `${config.previewUrl.replace(/\/$/, '')}/${pagePath}` : pagePath;
  return { commit, link };
}

// Shared prompt fragments, loaded from agent/prompts/shared/ in the repo.
function sharedRules() {
  return {
    htmlRules: prompts.render('shared/html-rules'),
    bilingualRules: prompts.render('shared/bilingual-rules'),
  };
}

function parseBilingual(text) {
  const post = parseJsonReply(text);
  if (!post.title_en || !post.html_en) throw new Error('Model reply missing title_en or html_en');
  if (!post.title_sv || !post.html_sv) throw new Error('Model reply missing title_sv or html_sv');
  return post;
}

// topic: optional steering ("write about X") — forces regeneration.
async function runOnThisDay({ force = false, topic = '' } = {}) {
  const { iso, readable } = todayParts();
  if (!force && !topic && postExists(iso, 'onthisday')) {
    return { skipped: true, reason: `Post for ${iso} already exists` };
  }

  const steer = topic
    ? `\nThe museum's editor has requested that this essay be about: "${topic}". Write about that event if it is genuinely connected to this calendar date (or explain the closest true date connection honestly).`
    : '';
  const prompt = prompts.render('on-this-day', { readable, steer, ...sharedRules() });

  const text = await generate(prompt, { job: 'onthisday' });
  const post = parseBilingual(text);

  const { commit, link } = await publishPost(iso, 'onthisday', post, `Daily post: on this day (${iso})\n\n${post.title_en}`);
  return { skipped: false, title: post.title_en, link, commit };
}

async function runAiNews({ force = false, topic = '' } = {}) {
  const { iso, readable, readableSv } = todayParts();
  if (!force && !topic && postExists(iso, 'ainews')) {
    return { skipped: true, reason: `Post for ${iso} already exists` };
  }

  const steer = topic
    ? `\nThe museum's editor has requested that the LEAD story of today's briefing be: "${topic}". Research it, make it the opening item with the most depth, and cover other significant AI news after it.`
    : '';

  // Multi-day stories (a launch that keeps generating coverage) can look
  // like "today's top news" on consecutive mornings with no other signal.
  // Tell the model what it already led with so it doesn't repeat itself.
  const recent = recentPostTitles('ainews', { limit: 2, beforeIso: iso });
  const recentLeads = recent.length
    ? `\nThe lead stor${recent.length === 1 ? 'y' : 'ies'} from your last ${recent.length} AI news briefing${recent.length === 1 ? '' : 's'} ${recent.length === 1 ? 'was' : 'were'}:\n${recent.map((r) => `- "${r.title}" (${r.date})`).join('\n')}\nDo not lead with the same story again unless something materially new and significant has happened since — if so, frame it explicitly as a fresh development ("update:", a new number, a new decision), not a recap. If it's still relevant but not today's biggest development, cover it briefly as a non-lead item instead of opening with it.\n`
    : '';

  const prompt = prompts.render('ai-news', {
    readable,
    readableSv,
    year: iso.slice(0, 4),
    steer,
    recentLeads,
    ...sharedRules(),
  });

  const text = await generate(prompt, { search: true, job: 'ainews' });
  const post = parseBilingual(text);

  const { commit, link } = await publishPost(iso, 'ainews', post, `Daily post: AI news (${iso})\n\n${post.title_en}`);
  return { skipped: false, title: post.title_en, link, commit };
}

// Runs one of the tools/fetch-*.js snapshot scripts and commits the result
// if it changed.
async function runSnapshotTool(script, extraEnv, commitMessage, title, unchangedReason) {
  const { execFile } = require('child_process');
  await new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [path.join(config.repoDir, 'tools', script)],
      { cwd: config.repoDir, env: { ...process.env, ...extraEnv } },
      (err, stdout, stderr) => (err ? reject(new Error(stderr || err.message)) : resolve(stdout)),
    );
  });
  const commit = await gitrepo.commitAndPush(commitMessage);
  if (!commit) return { skipped: true, reason: unchangedReason };
  return { skipped: false, title, link: config.previewUrl || '', commit };
}

// Refreshes the LLM leaderboard snapshot (home page card).
async function runLlmIndex() {
  return runSnapshotTool(
    'fetch-llm-index.js',
    { AA_API_KEY: config.aaApiKey },
    `Daily data: LLM intelligence index (${todayParts().iso})`,
    'LLM intelligence index updated',
    'Leaderboard unchanged since last snapshot',
  );
}

// Refreshes the OpenRouter usage snapshot (home page card).
async function runLlmUsage() {
  return runSnapshotTool(
    'fetch-openrouter-usage.js',
    { OPENROUTER_API_KEY: config.openRouterApiKey },
    `Daily data: LLM usage via OpenRouter (${todayParts().iso})`,
    'LLM usage card updated',
    'Usage shares unchanged since last snapshot',
  );
}

// ---------- Quiz ----------
// The public quiz bank has a hand-verified "evergreen" half and a rotating
// "current" half. Only the rotating half is generated, and it never goes
// straight to the site: a draft lands in quiz-pending.json for the editor to
// read in Telegram, and only an explicit publish promotes it. A wrong answer
// under the museum's name is a credibility problem, not a bug, so the gate is
// the point of the design rather than a precaution bolted on.

const QUIZ_FILE = () => path.join(config.repoDir, 'src', 'site', 'content', 'quiz.json');
const QUIZ_PENDING = () => path.join(config.repoDir, 'src', 'site', 'content', 'quiz-pending.json');

const QUIZ_OPTION_COUNT = 4;
const QUIZ_MAX_DRAFT = 6;

function readQuizBank() {
  const bank = JSON.parse(fs.readFileSync(QUIZ_FILE(), 'utf8'));
  if (!Array.isArray(bank.evergreen)) throw new Error('quiz.json has no evergreen array');
  if (!Array.isArray(bank.current)) bank.current = [];
  return bank;
}

// Model output is untrusted until it passes this. The page renders options
// with textContent, so the danger is not injection but malformed content: a
// missing translation, five options in one language and four in the other, an
// answer index pointing past the end. Any of those would reach visitors as a
// quiz that marks the wrong option correct.
function validateQuizQuestions(list, takenIds) {
  if (!Array.isArray(list) || !list.length) throw new Error('Reply contained no questions');
  if (list.length > QUIZ_MAX_DRAFT) throw new Error(`Reply had ${list.length} questions (max ${QUIZ_MAX_DRAFT})`);
  const seen = new Set();

  list.forEach((q, i) => {
    const at = `question ${i + 1}`;
    if (!q || typeof q !== 'object') throw new Error(`${at}: not an object`);
    if (typeof q.id !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(q.id)) {
      throw new Error(`${at}: id must be a kebab-case slug`);
    }
    if (seen.has(q.id)) throw new Error(`${at}: duplicate id "${q.id}"`);
    if (takenIds.has(q.id)) throw new Error(`${at}: id "${q.id}" is already in the bank`);
    seen.add(q.id);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= QUIZ_OPTION_COUNT) {
      throw new Error(`${at}: answer must be an integer 0-${QUIZ_OPTION_COUNT - 1}`);
    }

    for (const locale of ['en', 'sv']) {
      const copy = q[locale];
      if (!copy || typeof copy !== 'object') throw new Error(`${at}: missing "${locale}"`);
      for (const field of ['q', 'why']) {
        if (typeof copy[field] !== 'string' || !copy[field].trim()) {
          throw new Error(`${at}: ${locale}.${field} is empty`);
        }
        if (/<[a-z/!]/i.test(copy[field])) throw new Error(`${at}: ${locale}.${field} contains markup`);
      }
      if (!Array.isArray(copy.options) || copy.options.length !== QUIZ_OPTION_COUNT) {
        throw new Error(`${at}: ${locale} needs exactly ${QUIZ_OPTION_COUNT} options`);
      }
      const options = copy.options.map((o) => (typeof o === 'string' ? o.trim() : ''));
      if (options.some((o) => !o)) throw new Error(`${at}: ${locale} has an empty option`);
      if (options.some((o) => /<[a-z/!]/i.test(o))) throw new Error(`${at}: ${locale} option contains markup`);
      if (new Set(options.map((o) => o.toLowerCase())).size !== QUIZ_OPTION_COUNT) {
        throw new Error(`${at}: ${locale} repeats an option`);
      }
    }
  });

  return list;
}

// English-only rendering for the Telegram review message: the editor is
// checking whether the facts and the marked answer are right, and doubling
// the length with the Swedish makes that harder, not easier.
function quizPreview(questions) {
  return questions
    .map((q, i) => {
      const opts = q.en.options
        .map((o, j) => `${j === q.answer ? '✓' : '·'} ${o}`)
        .join('\n');
      return `${i + 1}. ${q.en.q}\n${opts}\n→ ${q.en.why}`;
    })
    .join('\n\n');
}

// What "/quiz" with no subcommand reports: what is live, what is waiting.
function quizStatus() {
  const bank = readQuizBank();
  const lines = [
    `Evergreen questions (hand-written, untouched by me): ${bank.evergreen.length}`,
    `Rotating questions live now: ${bank.current.length}${bank.updated ? ` — bank last updated ${bank.updated}` : ''}`,
  ];
  if (bank.current.length) {
    lines.push('', bank.current.map((q, i) => `${i + 1}. ${q.en.q}`).join('\n'));
  }
  if (fs.existsSync(QUIZ_PENDING())) {
    const pending = JSON.parse(fs.readFileSync(QUIZ_PENDING(), 'utf8'));
    lines.push(
      '',
      `A draft from ${pending.drafted} is waiting, not yet on the site:`,
      '',
      quizPreview(pending.questions),
      '',
      'Send /quiz publish to put it up, or /quiz discard to bin it.',
    );
  } else {
    lines.push('', 'No draft waiting — /quiz draft makes one.');
  }
  return lines.join('\n');
}

// topic: optional steering ("ask about X").
async function runQuizDraft({ count = 4, topic = '' } = {}) {
  const bank = readQuizBank();
  const existing = bank.evergreen.concat(bank.current);
  const taken = new Set(existing.map((q) => q.id));
  const { iso, readable } = todayParts();

  const steer = topic
    ? `\nThe museum's editor has asked that these questions focus on: "${topic}".\n`
    : '';
  // Hand over the questions already asked so the model doesn't re-ask them in
  // different words — ids alone are too terse to convey subject matter.
  const asked = existing.map((q) => q.en.q);
  const avoid = asked.length
    ? `\n## Already asked\n\nThe quiz already contains these questions. Do not duplicate their subject matter:\n\n${asked.map((q) => `- ${q}`).join('\n')}\n`
    : '';

  const prompt = prompts.render('quiz', {
    readable,
    year: iso.slice(0, 4),
    count: String(count),
    steer,
    avoid,
  });

  const text = await generate(prompt, { search: true, job: 'quiz' });
  const questions = validateQuizQuestions(parseJsonReply(text).questions, taken);

  fs.writeFileSync(
    QUIZ_PENDING(),
    JSON.stringify({ drafted: iso, questions }, null, 2) + '\n',
    'utf8',
  );
  const commit = await gitrepo.commitAndPush(
    `Quiz: draft ${questions.length} current-events question(s) for review (${iso})`,
  );
  return { count: questions.length, preview: quizPreview(questions), commit };
}

// Promotes the pending draft into the live bank, REPLACING the rotating set
// rather than appending — "current" is meant to stay small and recent, and an
// ever-growing pile of half-old questions is exactly what it exists to avoid.
async function runQuizPublish() {
  if (!fs.existsSync(QUIZ_PENDING())) {
    return { skipped: true, reason: 'No draft is waiting. Run /quiz first.' };
  }
  const pending = JSON.parse(fs.readFileSync(QUIZ_PENDING(), 'utf8'));
  const bank = readQuizBank();
  // Check ids against the evergreen half only: the rotating half is what this
  // is replacing, so a draft reusing one of its ids is fine.
  const questions = validateQuizQuestions(pending.questions, new Set(bank.evergreen.map((q) => q.id)));

  const replaced = bank.current.length;
  bank.current = questions;
  bank.updated = todayParts().iso;
  fs.writeFileSync(QUIZ_FILE(), JSON.stringify(bank, null, 2) + '\n', 'utf8');
  fs.unlinkSync(QUIZ_PENDING());

  const commit = await gitrepo.commitAndPush(
    `Quiz: publish ${questions.length} current-events question(s), replacing ${replaced}`,
  );
  return { skipped: false, published: questions.length, replaced, commit };
}

async function runQuizDiscard() {
  if (!fs.existsSync(QUIZ_PENDING())) {
    return { skipped: true, reason: 'No draft is waiting.' };
  }
  fs.unlinkSync(QUIZ_PENDING());
  const commit = await gitrepo.commitAndPush('Quiz: discard the pending draft');
  return { skipped: false, commit };
}

// recentPostTitles is exported for tests: it matches post filenames by
// pattern, so if the naming convention in publishPost ever changes it would
// quietly return nothing and the repeat-avoidance would stop working with no
// visible symptom. validateQuizQuestions is exported for the same reason —
// it is the only thing standing between model output and the public quiz.
module.exports = {
  runOnThisDay,
  runAiNews,
  runLlmIndex,
  runLlmUsage,
  runQuizDraft,
  runQuizPublish,
  runQuizDiscard,
  quizStatus,
  todayParts,
  recentPostTitles,
  validateQuizQuestions,
};
