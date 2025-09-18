const fs = require('fs');
const path = require('path');

const ENCYC_SRC = path.join(__dirname, '..', 'encyclopedia');

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
    const href = locale === 'sv' ? `./${e.slug}.html` : `../${e.slug}.html`;
    return `<a data-term="${e.slug}" href="${href}" class="glass-card p-4 rounded-lg block hover:border-cyan-500">${e.slug}</a>`;
  }).join('\n');
}

module.exports = {
  template: 'encyclopedia-index',
  locales: {
    en: {
      output: 'pages/encyclopedia/index.html',
      lang: 'en',
      title: 'Encyclopedia • Index',
      assetsPrefix: '..',
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
      assetsPrefix: '../..',
      indexHref: '../../index.html',
      backLinkText: 'Till startsidan',
      searchPlaceholder: 'Sök termer…',
      entriesHtml: renderEntriesGrid('sv', discoverEntries()),
      headExtras: '',
      postScripts: ''
    }
  }
};
