const fs = require('fs');
const path = require('path');

function load(partial) {
  return fs.readFileSync(path.join(__dirname, partial), 'utf8');
}

module.exports = {
  template: 'standard',
  locales: {
    en: {
      output: 'pages/privacy.html',
      lang: 'en',
      title: 'Privacy Policy • Museum of AI',
      assetsPrefix: '..',
      indexHref: '../index.html',
      backLinkText: '&larr; Back to Home',
      headExtras: `  <link rel="alternate" hreflang="sv" href="../sv/pages/privacy.html">\n  <link rel="alternate" hreflang="en" href="./privacy.html">`,
      mainContent: load('privacy.en.html'),
      postScripts: ''
    },
    sv: {
      output: 'sv/pages/privacy.html',
      lang: 'sv',
      title: 'Integritetspolicy • Museum of AI',
      assetsPrefix: '../..',
      indexHref: '../index.html',
      backLinkText: '&larr; Till startsidan',
      headExtras: `  <link rel="alternate" hreflang="en" href="../../pages/privacy.html">\n  <link rel="alternate" hreflang="sv" href="./privacy.html">`,
      mainContent: load('privacy.sv.html'),
      postScripts: ''
    }
  }
};


