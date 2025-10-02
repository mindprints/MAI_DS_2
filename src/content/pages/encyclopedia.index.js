const fs = require('fs');
const path = require('path');

const ENCYC_SRC = path.join(__dirname, '..', 'encyclopedia');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readFileSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function extractTitle(html) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return '';
  return m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function discoverEntries() {
  if (!fs.existsSync(ENCYC_SRC)) return [];
  const files = fs.readdirSync(ENCYC_SRC).filter(f => /\.(en|sv)\.html$/i.test(f));
  const map = new Map();
  for (const f of files) {
    const m = f.match(/^(.+)\.(en|sv)\.html$/i);
    if (!m) continue;
    const slug = m[1];
    const locale = m[2];
    if (!map.has(slug)) map.set(slug, {});
    map.get(slug)[locale] = f;
  }
  return [...map.entries()].map(([slug, locales]) => ({ slug, locales }));
}

function renderEntriesGrid(locale, entries) {
  const items = entries.filter(e => e.locales[locale]);
  items.sort((a, b) => a.slug.localeCompare(b.slug));
  return items.map(e => {
    const href = locale === 'sv' ? `/sv/pages/encyclopedia/${e.slug}.html` : `/pages/encyclopedia/${e.slug}.html`;
    const html = readFileSafe(path.join(ENCYC_SRC, e.locales[locale]));
    const title = extractTitle(html) || e.slug;
    return `<a data-term="${e.slug}" data-title="${title}" href="${href}" class="glass-card p-4 rounded-lg block hover:border-cyan-500">
      <div class="text-slate-200 font-semibold">${title}</div>
      <div class="text-slate-400 text-sm mt-1">${e.slug}</div>
    </a>`;
  }).join('\n');
}

function buildJsonIndex(entries) {
  const out = [];
  for (const e of entries) {
    for (const locale of ['en', 'sv']) {
      if (!e.locales[locale]) continue;
      const html = readFileSafe(path.join(ENCYC_SRC, e.locales[locale]));
      const title = extractTitle(html) || e.slug;
      out.push({ slug: e.slug, locale, title, aliases: [], keywords: [] });
    }
  }
  return out;
}

module.exports = {
  template: 'encyclopedia-index',
  locales: {
    en: {
      output: 'pages/encyclopedia/index.html',
      lang: 'en',
      title: 'Encyclopedia • Index',
      assetsPrefix: '../..',
      indexHref: '../../index.html',
      backLinkText: 'Back to Home',
      searchPlaceholder: 'Search terms…',
      entriesHtml: renderEntriesGrid('en', discoverEntries()),
      headExtras: '',
      postScripts: ''
    },
    sv: {
      output: 'sv/pages/encyclopedia/index.html',
      lang: 'sv',
      title: 'Encyklopedi • Index',
      assetsPrefix: '../../..',
      indexHref: '../../../index.html',
      backLinkText: 'Till startsidan',
      searchPlaceholder: 'Sök termer…',
      entriesHtml: renderEntriesGrid('sv', discoverEntries()),
      headExtras: '',
      postScripts: ''
    }
  },
  prepare(locale, data) {
    // Write combined JSON index once per build (on EN pass)
    if (locale !== 'en') return data;
    const entries = discoverEntries();
    const idx = buildJsonIndex(entries);
    const outDir = path.join(process.cwd(), 'public', 'data');
    ensureDir(outDir);
    fs.writeFileSync(path.join(outDir, 'encyclopedia-index.json'), JSON.stringify(idx, null, 2) + '\n', 'utf8');
    return data;
  }
};
