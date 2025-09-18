const fs = require('fs');
const path = require('path');

function loadFile(p) {
  return fs.readFileSync(p, 'utf8');
}

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

module.exports = {
  template: 'encyclopedia-entry',
  locales: (() => {
    const entries = discoverEntries();
    const out = { en: {}, sv: {} };
    for (const { slug, locales } of entries) {
      if (locales.en) {
        out.en[slug] = {
          output: `pages/encyclopedia/${slug}.html`,
          lang: 'en',
          title: `Encyclopedia • ${slug}`,
          assetsPrefix: '..',
          indexHref: '../../index.html',
          backLinkText: 'Back to Home',
          encyIndexHref: '../encyclopedia/index.html',
          encyIndexText: 'All Terms',
          headExtras: '',
          mainContent: loadFile(path.join(ENCYC_SRC, locales.en)),
          postScripts: ''
        };
      }
      if (locales.sv) {
        out.sv[slug] = {
          output: `sv/pages/encyclopedia/${slug}.html`,
          lang: 'sv',
          title: `Encyklopedi • ${slug}`,
          assetsPrefix: '../..',
          indexHref: '../../index.html',
          backLinkText: 'Till startsidan',
          encyIndexHref: '../encyclopedia/index.html',
          encyIndexText: 'Alla termer',
          headExtras: '',
          mainContent: loadFile(path.join(ENCYC_SRC, locales.sv)),
          postScripts: ''
        };
      }
    }
    return out;
  })(),
};
