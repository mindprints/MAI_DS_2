const fs = require('fs');
const path = require('path');

function load(partial) {
  return fs.readFileSync(path.join(__dirname, partial), 'utf8');
}

module.exports = {
  template: 'standard',
  locales: {
    en: {
      output: 'pages/learn-more.html',
      lang: 'en',
      title: 'Learn More • Museum of AI',
      assetsPrefix: '..',
      indexHref: '../index.html',
      backLinkText: '&larr; Back to Home',
      headExtras: `  <link rel="alternate" hreflang="en" href="../pages/learn-more.html">\n  <link rel="alternate" hreflang="sv" href="../sv/pages/learn-more.html">`,
      mainContent: load('learn-more.en.html'),
      postScripts: ''
    },
    sv: {
      output: 'sv/pages/learn-more.html',
      lang: 'sv',
      title: 'Fördjupning • Museum of AI',
      assetsPrefix: '../..',
      indexHref: '../index.html',
      backLinkText: '&larr; Till startsidan',
      headExtras: `  <link rel="alternate" hreflang="sv" href="./learn-more.html">\n  <link rel="alternate" hreflang="en" href="../../pages/learn-more.html">`,
      mainContent: load('learn-more.sv.html'),
      postScripts: ''
    }
  }
};
