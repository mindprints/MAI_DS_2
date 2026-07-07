// The two daily content jobs: "On this day" essay and AI news summary.
// Both are bilingual (EN + SV in one generation), write posts into
// src/content/daily/, commit + push (which triggers the preview deployment
// rebuild), and return info for the Telegram announcement.
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const { config } = require('./config');
const gitrepo = require('./gitrepo');

const DAILY_DIR = () => path.join(config.repoDir, 'src', 'content', 'daily');

function anthropic() {
  return new Anthropic({ apiKey: config.anthropicApiKey });
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
  return { iso, readable };
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

const HTML_RULES = `Format each post as a clean HTML fragment (no <html>, <head>, or <body>):
- exactly one <h1> with the title
- then 3-6 <p> paragraphs; you may use one <ul> with <li> items where it genuinely helps
- no inline styles, no scripts, no images, no headings other than the single <h1>`;

const BILINGUAL_RULES = `Produce the post in BOTH English and Swedish. The Swedish version is a natural, idiomatic translation (not word-for-word) with the same structure and facts. Keep proper nouns, product names, and quoted titles as-is.

Reply with ONLY a JSON object:
{"title_en": "...", "html_en": "...", "title_sv": "...", "html_sv": "..."}`;

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

  const client = anthropic();
  const steer = topic
    ? `\nThe museum's editor has requested that this essay be about: "${topic}". Write about that event if it is genuinely connected to this calendar date (or explain the closest true date connection honestly).`
    : '';
  const prompt = `Today is ${readable}. Write a short essay (300-450 words) for the Museum of Artificial Intelligence's "On this day" series about ONE well-documented event or milestone in the history of computing, robotics, machine learning, or artificial intelligence that happened on ${readable} (any year).${steer}

Requirements:
- Pick an event you are confident actually happened on this calendar date; prefer well-documented anniversaries (births/deaths of pioneers, product or paper releases, milestone demonstrations). If nothing significant happened on exactly this date, choose the closest notable event and say so honestly in the text.
- Audience: curious general public. Engaging, accurate, no hype.
- Connect the event briefly to today's AI landscape at the end.
- Title format: start with the year, e.g. "1956: The Dartmouth workshop convenes" / "1956: Dartmouth-konferensen inleds".

${HTML_RULES}

${BILINGUAL_RULES}`;

  // Adaptive thinking is on by default and counts against max_tokens,
  // so leave generous headroom or the reply is all thinking and no text.
  const response = await client.messages.create({
    model: config.model,
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const post = parseBilingual(text);

  const { commit, link } = await publishPost(iso, 'onthisday', post, `Daily post: on this day (${iso})\n\n${post.title_en}`);
  return { skipped: false, title: post.title_en, link, commit };
}

async function runAiNews({ force = false, topic = '' } = {}) {
  const { iso, readable } = todayParts();
  if (!force && !topic && postExists(iso, 'ainews')) {
    return { skipped: true, reason: `Post for ${iso} already exists` };
  }

  const client = anthropic();
  const steer = topic
    ? `\nThe museum's editor has requested that the LEAD story of today's briefing be: "${topic}". Research it, make it the opening item with the most depth, and cover other significant AI news after it.`
    : '';
  const prompt = `Today is ${readable} ${iso.slice(0, 4)}. Use web search to find the most significant AI news from the last 24-48 hours, then write a daily AI news summary (350-500 words) for the Museum of Artificial Intelligence's general-audience readers.${steer}

Cover a mix of what actually happened (skip categories with no real news): research breakthroughs, product releases, laws and regulation, business and finance, and notable public debate.

Requirements:
- Not overly technical: explain significance in plain language.
- 3-6 items, ONE <p> per item. Start each item's paragraph with a short bold lead-in naming the story, e.g. <p><strong>EU approves AI liability rules.</strong> Rest of the item…</p>
- Lead with the most important. Attribute claims to their sources by name in the text (e.g. "according to Reuters"), but do not include raw URLs.
- Title format: "AI news, ${readable}: " / "AI-nytt, ${readable}: " followed by a short hook about the lead item.
- Neutral tone; distinguish announcements from confirmed facts.

${HTML_RULES}

${BILINGUAL_RULES}`;

  const response = await client.messages.create({
    model: config.model,
    max_tokens: 16000,
    tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 8 }],
    messages: [{ role: 'user', content: prompt }],
  });
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const post = parseBilingual(text);

  const { commit, link } = await publishPost(iso, 'ainews', post, `Daily post: AI news (${iso})\n\n${post.title_en}`);
  return { skipped: false, title: post.title_en, link, commit };
}

// Refreshes the LLM leaderboard snapshot (home page card) by running
// tools/fetch-llm-index.js and committing the result if it changed.
async function runLlmIndex() {
  const { execFile } = require('child_process');
  await new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [path.join(config.repoDir, 'tools', 'fetch-llm-index.js')],
      { cwd: config.repoDir, env: { ...process.env, AA_API_KEY: config.aaApiKey } },
      (err, stdout, stderr) => (err ? reject(new Error(stderr || err.message)) : resolve(stdout)),
    );
  });
  const commit = await gitrepo.commitAndPush(`Daily data: LLM intelligence index (${todayParts().iso})`);
  if (!commit) return { skipped: true, reason: 'Leaderboard unchanged since last snapshot' };
  return { skipped: false, title: 'LLM intelligence index updated', link: config.previewUrl || '', commit };
}

module.exports = { runOnThisDay, runAiNews, runLlmIndex, todayParts };
