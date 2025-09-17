const fs = require('fs');
const path = require('path');

function load(part) {
  return fs.readFileSync(path.join(__dirname, part), 'utf8');
}

module.exports = {
  template: 'standard',
  locales: {
    en: {
      output: 'pages/explore.html',
      lang: 'en',
      title: 'Explore • Museum of AI',
      assetsPrefix: '..',
      indexHref: '../index.html',
      backLinkText: '&larr; Back to Home',
      headExtras: `  <link rel="alternate" hreflang="en" href="../pages/explore.html">\n  <link rel="alternate" hreflang="sv" href="../sv/pages/explore.html">`,
      mainContent: load('explore.en.html'),
      postScripts: ''
    },
    sv: {
      output: 'sv/pages/explore.html',
      lang: 'sv',
      title: 'Utforska • Museum of AI',
      assetsPrefix: '../..',
      indexHref: '../index.html',
      backLinkText: '&larr; Till startsidan',
      headExtras: `  <link rel="alternate" hreflang="sv" href="./explore.html">\n  <link rel="alternate" hreflang="en" href="../../pages/explore.html">`,
      mainContent: load('explore.sv.html'),
      postScripts: ''
    }
  }
};
