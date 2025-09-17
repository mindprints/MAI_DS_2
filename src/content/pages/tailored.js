const fs = require('fs');
const path = require('path');

function load(partial) {
  return fs.readFileSync(path.join(__dirname, partial), 'utf8');
}

module.exports = {
  template: 'standard',
  locales: {
    en: {
      output: 'pages/tailored.html',
      lang: 'en',
      title: 'Lectures and Workshops Tailored to Your Needs • Museum of AI',
      assetsPrefix: '..',
      indexHref: '../index.html',
      backLinkText: '&larr; Back to Home',
      headExtras: '',
      mainContent: load('tailored.en.html'),
      postScripts: ''
    },
    sv: {
      output: 'sv/pages/tailored.html',
      lang: 'sv',
      title: 'Föreläsningar och workshops anpassade • Museum of AI',
      assetsPrefix: '../..',
      indexHref: '../index.html',
      backLinkText: '&larr; Till startsidan',
      headExtras: `  <link rel="alternate" hreflang="en" href="../../pages/tailored.html">\n  <link rel="alternate" hreflang="sv" href="./tailored.html">`,
      mainContent: load('tailored.sv.html'),
      postScripts: ''
    }
  }
};


