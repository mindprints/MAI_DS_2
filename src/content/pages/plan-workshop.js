const fs = require('fs');
const path = require('path');

function load(partial) {
  return fs.readFileSync(path.join(__dirname, partial), 'utf8');
}

module.exports = {
  template: 'standard',
  locales: {
    en: {
      output: 'pages/plan-workshop.html',
      lang: 'en',
      title: 'Plan a Workshop or Lecture • Museum of AI',
      assetsPrefix: '..',
      indexHref: '../index.html',
      backLinkText: '&larr; Back to Home',
      headExtras: `  <link rel="alternate" hreflang="en" href="../pages/plan-workshop.html">\n  <link rel="alternate" hreflang="sv" href="../sv/pages/plan-workshop.html">`,
      mainContent: load('plan-workshop.en.html'),
      postScripts: '\n' + load('plan-workshop.en.script.html')
    },
    sv: {
      output: 'sv/pages/plan-workshop.html',
      lang: 'sv',
      title: 'Planera workshop eller föreläsning • Museum of AI',
      assetsPrefix: '../..',
      indexHref: '../index.html',
      backLinkText: '&larr; Till startsidan',
      headExtras: `  <link rel="alternate" hreflang="sv" href="./plan-workshop.html">\n  <link rel="alternate" hreflang="en" href="../../pages/plan-workshop.html">`,
      mainContent: load('plan-workshop.sv.html'),
      postScripts: '\n' + load('plan-workshop.sv.script.html')
    }
  }
};


