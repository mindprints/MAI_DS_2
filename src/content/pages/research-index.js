const fs = require('fs');
const path = require('path');

function load(partial) {
  return fs.readFileSync(path.join(__dirname, partial), 'utf8');
}

module.exports = {
  template: 'standard',
  locales: {
    en: {
      output: 'pages/research-index.html',
      lang: 'en',
      title: 'Research Index • Museum of AI',
      assetsPrefix: '..',
      indexHref: '../index.html',
      backLinkText: '&larr; Back to Home',
      headExtras: `  <link rel="alternate" hreflang="en" href="./research-index.html">\n  <link rel="alternate" hreflang="sv" href="../sv/pages/research_index.html">`,
      mainContent: load('research-index.en.html'),
      postScripts: '\n' + load('research-index.script.html')
    },
    sv: {
      output: 'sv/pages/research_index.html',
      lang: 'sv',
      title: 'Forskningsindex • Museum of AI',
      assetsPrefix: '../..',
      indexHref: '../index.html',
      backLinkText: '&larr; Till startsidan',
      headExtras: `  <link rel="alternate" hreflang="en" href="../../pages/research-index.html">\n  <link rel="alternate" hreflang="sv" href="./research_index.html">`,
      mainContent: load('research-index.sv.html'),
      postScripts: '\n' + load('research-index.script.html')
    }
  }
};


