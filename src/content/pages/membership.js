const fs = require('fs');
const path = require('path');

function load(partial) {
  return fs.readFileSync(path.join(__dirname, partial), 'utf8');
}

module.exports = {
  template: 'standard',
  locales: {
    en: {
      output: 'pages/membership.html',
      lang: 'en',
      title: 'Membership • Museum of AI',
      assetsPrefix: '..',
      indexHref: '../index.html',
      backLinkText: '&larr; Back to Home',
      headExtras: `  <link rel="alternate" hreflang="sv" href="../sv/pages/membership">\n  <link rel="alternate" hreflang="en" href="./membership">`,
      mainContent: load('membership.en.html'),
      postScripts: '\n' + load('membership.en.script.html')
    },
    sv: {
      output: 'sv/pages/membership.html',
      lang: 'sv',
      title: 'Medlemskap • Museum of AI',
      assetsPrefix: '../..',
      indexHref: '../index.html',
      backLinkText: '&larr; Till startsidan',
      headExtras: `  <link rel="alternate" hreflang="en" href="../../pages/membership">\n  <link rel="alternate" hreflang="sv" href="./membership">`,
      mainContent: load('membership.sv.html'),
      postScripts: '\n' + load('membership.sv.script.html')
    }
  }
};
