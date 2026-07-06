// The two daily content jobs: "On this day" essay and AI news summary.
// Both write a post into src/content/daily/, commit + push (which triggers
// the preview deployment rebuild), and return info for the Telegram post.
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

function postPath(dateIso, type) {
  return path.join(DAILY_DIR(), `${dateIso}.${type}.en.html`);
}

function postExists(dateIso, type) {
  return fs.existsSync(postPath(dateIso, type));
}

async function publishPost(dateIso, type, html, commitMessage) {
  fs.mkdirSync(DAILY_DIR(), { recursive: true });
  fs.writeFileSync(postPath(dateIso, type), html.trim() + '\n', 'utf8');
  const commit = await gitrepo.commitAndPush(commitMessage);
  const pagePath = `pages/daily/${dateIso}-${type}.html`;
  const link = config.previewUrl ? `${config.previewUrl.replace(/\/$/, '')}/${pagePath}` : pagePath;
  return { commit, link };
}

const HTML_RULES = `Format the post as a clean HTML fragment (no <html>, <head>, or <body>):
- exactly one <h1> with the title
- then 3-6 <p> paragraphs; you may use one <ul> with <li> items where it genuinely helps
- no inline styles, no scripts, no images, no headings other than the single <h1>`;

async function runOnThisDay({ force = false } = {}) {
  const { iso, readable } = todayParts();
  if (!force && postExists(iso, 'onthisday')) {
    return { skipped: true, reason: `Post for ${iso} already exists` };
  }

  const client = anthropic();
  const prompt = `Today is ${readable}. Write a short essay (300-450 words) for the Museum of Artificial Intelligence's "On this day" series about ONE well-documented event or milestone in the history of computing, robotics, machine learning, or artificial intelligence that happened on ${readable} (any year).

Requirements:
- Pick an event you are confident actually happened on this calendar date; prefer well-documented anniversaries (births/deaths of pioneers, product or paper releases, milestone demonstrations). If nothing significant happened on exactly this date, choose the closest notable event and say so honestly in the text.
- Audience: curious general public. Engaging, accurate, no hype.
- Connect the event briefly to today's AI landscape at the end.
- Title format: start with the year, e.g. "1956: The Dartmouth workshop convenes".

${HTML_RULES}

Reply with ONLY a JSON object: {"title": "...", "html": "..."} where html follows the rules above.`;

  const response = await client.messages.create({
    model: config.model,
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const { title, html } = parseJsonReply(text);
  if (!title || !html) throw new Error('Model reply missing title or html');

  const { commit, link } = await publishPost(iso, 'onthisday', html, `Daily post: on this day (${iso})\n\n${title}`);
  return { skipped: false, title, link, commit };
}

async function runAiNews({ force = false } = {}) {
  const { iso, readable } = todayParts();
  if (!force && postExists(iso, 'ainews')) {
    return { skipped: true, reason: `Post for ${iso} already exists` };
  }

  const client = anthropic();
  const prompt = `Today is ${readable} ${iso.slice(0, 4)}. Use web search to find the most significant AI news from the last 24-48 hours, then write a daily AI news summary (350-500 words) for the Museum of Artificial Intelligence's general-audience readers.

Cover a mix of what actually happened (skip categories with no real news): research breakthroughs, product releases, laws and regulation, business and finance, and notable public debate.

Requirements:
- Not overly technical: explain significance in plain language.
- 3-6 items. Lead with the most important. Attribute claims to their sources by name in the text (e.g. "according to Reuters"), but do not include raw URLs.
- Neutral tone; distinguish announcements from confirmed facts.
- Title format: "AI news, ${readable}: " followed by a short hook about the lead item.

${HTML_RULES}

After your research, reply with ONLY a JSON object: {"title": "...", "html": "..."} where html follows the rules above.`;

  const response = await client.messages.create({
    model: config.model,
    max_tokens: 6000,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 }],
    messages: [{ role: 'user', content: prompt }],
  });
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const { title, html } = parseJsonReply(text);
  if (!title || !html) throw new Error('Model reply missing title or html');

  const { commit, link } = await publishPost(iso, 'ainews', html, `Daily post: AI news (${iso})\n\n${title}`);
  return { skipped: false, title, link, commit };
}

module.exports = { runOnThisDay, runAiNews, todayParts };
