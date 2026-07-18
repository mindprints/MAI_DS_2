// Pure filesystem helpers for the dashboard — everything takes the repo path
// explicitly so the module is testable with plain node (no Electron).
const fs = require('fs');
const path = require('path');

// Files the renderer is allowed to read/write, as repo-relative prefixes.
// The dashboard is a content tool, not a code editor.
const WRITABLE_PREFIXES = [
  'agent/prompts/',
  'agent/settings.json',
  'src/site/images/slide/slides.json',
  'src/site/content/notice.json',
];

function safeAbs(repo, rel) {
  const normalized = path.posix.normalize(String(rel).replace(/\\/g, '/'));
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
    throw new Error(`Path outside repository: ${rel}`);
  }
  if (!WRITABLE_PREFIXES.some((p) => normalized === p || normalized.startsWith(p))) {
    throw new Error(`Path not editable from the dashboard: ${rel}`);
  }
  return path.join(repo, normalized);
}

function looksLikeSiteRepo(dir) {
  return fs.existsSync(path.join(dir, 'src', 'site', 'images', 'slide', 'slides.json'))
    && fs.existsSync(path.join(dir, 'agent'));
}

// ---------- Slides ----------

const SLIDES_REL = 'src/site/images/slide/slides.json';

function listSlides(repo) {
  const dir = path.join(repo, 'src', 'site', 'images', 'slide');
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'slides.json'), 'utf8'));
  return manifest.map((s) => ({ ...s, absPath: path.join(dir, s.filename) }));
}

// entries: full manifest array as edited by the UI (absPath stripped).
function saveSlidesManifest(repo, entries) {
  const clean = entries.map(({ absPath, ...rest }) => rest);
  fs.writeFileSync(safeAbs(repo, SLIDES_REL), JSON.stringify(clean, null, 2) + '\n', 'utf8');
}

// ---------- Prompts ----------

function listPrompts(repo) {
  const base = path.join(repo, 'agent', 'prompts');
  const out = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.name.endsWith('.md')) {
        out.push('agent/prompts/' + path.relative(base, abs).replace(/\\/g, '/'));
      }
    }
  })(base);
  return out.sort();
}

function readRepoFile(repo, rel) {
  return fs.readFileSync(safeAbs(repo, rel), 'utf8');
}

function writeRepoFile(repo, rel, content) {
  fs.writeFileSync(safeAbs(repo, rel), content, 'utf8');
}

// ---------- Settings ----------

const SETTINGS_REL = 'agent/settings.json';

function readSettings(repo) {
  return JSON.parse(fs.readFileSync(path.join(repo, SETTINGS_REL), 'utf8'));
}

function writeSettings(repo, settingsObj) {
  // Round-trip through JSON to reject non-serializable input early.
  const text = JSON.stringify(settingsObj, null, 2) + '\n';
  JSON.parse(text);
  fs.writeFileSync(safeAbs(repo, SETTINGS_REL), text, 'utf8');
}

// ---------- Flash notice ----------

const NOTICE_REL = 'src/site/content/notice.json';
const EMPTY_NOTICE = { active: false, until: null, en: '', sv: '' };

function readNotice(repo) {
  const file = path.join(repo, NOTICE_REL);
  if (!fs.existsSync(file)) return { ...EMPTY_NOTICE };
  return { ...EMPTY_NOTICE, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
}

function writeNotice(repo, notice) {
  const clean = {
    active: Boolean(notice.active),
    until: notice.until ? String(notice.until) : null,
    en: String(notice.en || ''),
    sv: String(notice.sv || ''),
  };
  if (clean.until && !/^\d{4}-\d{2}-\d{2}$/.test(clean.until)) {
    throw new Error(`"until" must be a YYYY-MM-DD date, got: ${clean.until}`);
  }
  fs.writeFileSync(safeAbs(repo, NOTICE_REL), JSON.stringify(clean, null, 2) + '\n', 'utf8');
  return clean;
}

// ---------- Usage log ----------

function readUsage(repo) {
  const file = path.join(repo, 'reports', 'llm-usage.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// Aggregates for the cost panel. days: [{date: 'YYYY-MM-DD', costUsd, calls}]
// covering the last `windowDays` days (including zero days); byModel keyed on
// "provider model"; monthCostUsd = current calendar month.
function aggregateUsage(entries, { windowDays = 30, now = new Date() } = {}) {
  const dayKey = (d) => d.toISOString().slice(0, 10);
  const monthKey = now.toISOString().slice(0, 7);

  const days = [];
  const dayIndex = new Map();
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = dayKey(d);
    dayIndex.set(key, days.length);
    days.push({ date: key, costUsd: 0, calls: 0 });
  }

  const byModel = new Map();
  let monthCostUsd = 0;
  let windowCostUsd = 0;
  let unpricedCalls = 0;

  for (const e of entries) {
    const cost = typeof e.costUsd === 'number' ? e.costUsd : 0;
    if (typeof e.costUsd !== 'number') unpricedCalls++;
    const ts = String(e.ts || '');
    if (ts.slice(0, 7) === monthKey) monthCostUsd += cost;
    const idx = dayIndex.get(ts.slice(0, 10));
    if (idx !== undefined) {
      days[idx].costUsd += cost;
      days[idx].calls += 1;
      windowCostUsd += cost;
    }
    const mk = `${e.provider || '?'} ${e.model || '?'}`;
    const m = byModel.get(mk) || {
      provider: e.provider, model: e.model, calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0,
    };
    m.calls += 1;
    m.inputTokens += e.inputTokens || 0;
    m.outputTokens += e.outputTokens || 0;
    m.costUsd += cost;
    byModel.set(mk, m);
  }

  return {
    days,
    byModel: [...byModel.values()].sort((a, b) => b.costUsd - a.costUsd),
    monthCostUsd,
    windowCostUsd,
    totalCalls: entries.length,
    unpricedCalls,
  };
}

module.exports = {
  looksLikeSiteRepo,
  listSlides,
  saveSlidesManifest,
  listPrompts,
  readRepoFile,
  writeRepoFile,
  readSettings,
  writeSettings,
  readNotice,
  writeNotice,
  readUsage,
  aggregateUsage,
  safeAbs,
};
