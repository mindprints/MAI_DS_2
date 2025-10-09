﻿const fs = require('fs');
const path = require('path');

function load(partial) {
  try {
    return fs.readFileSync(path.join(__dirname, partial), 'utf8');
  } catch (error) {
    throw new Error(`Failed to load partial "${partial}": ${error.message}`);
  }
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
      headExtras: `  <link rel="alternate" hreflang="en" href="../pages/learn-more">\n  <link rel="alternate" hreflang="sv" href="../sv/pages/learn-more">`,
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
      headExtras: `  <link rel="alternate" hreflang="sv" href="./learn-more">\n  <link rel="alternate" hreflang="en" href="../../pages/learn-more">`,
      mainContent: load('learn-more.sv.html'),
      postScripts: ''
    }
  }
};
