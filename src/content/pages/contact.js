const fs = require('fs');
const path = require('path');

function load(localPath) {
  return fs.readFileSync(path.join(__dirname, localPath), 'utf8');
}

module.exports = {
  template: 'standard',
  locales: {
    en: {
      output: 'pages/contact.html',
      lang: 'en',
      title: 'Contact • Museum of AI',
      assetsPrefix: '..',
      indexHref: '../index.html',
      backLinkText: '&larr; Back to Home',
      headExtras: `  <link rel="alternate" hreflang="sv" href="../sv/pages/contact.html">\n  <link rel="alternate" hreflang="en" href="./contact.html">\n  <!-- Email sending is handled server-side via /api/send-email -->`,
      mainContent: load('contact.en.html'),
      postScripts: '\n' + load('contact.en.script.html')
    },
    sv: {
      output: 'sv/pages/contact.html',
      lang: 'sv',
      title: 'Kontakt • Museum of AI',
      assetsPrefix: '../..',
      indexHref: '../index.html',
      backLinkText: '&larr; Till startsidan',
      headExtras: `  <link rel="alternate" hreflang="en" href="../../pages/contact.html">\n  <link rel="alternate" hreflang="sv" href="./contact.html">\n  <!-- E-posthantering sker server-side via /api/send-email -->`,
      mainContent: load('contact.sv.html'),
      postScripts: '\n' + load('contact.sv.script.html')
    }
  }
};
