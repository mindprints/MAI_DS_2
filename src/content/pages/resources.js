const fs = require('fs');
const path = require('path');

function load(partial) {
  return fs.readFileSync(path.join(__dirname, partial), 'utf8');
}

module.exports = {
  template: 'standard',
  locales: {
    en: {
      output: 'pages/resources.html',
      lang: 'en',
      title: 'Resources • Museum of AI',
      assetsPrefix: '..',
      indexHref: '../index.html',
      backLinkText: '&larr; Back to Home',
      headExtras: '',
      mainContent: load('resources.en.html'),
      postScripts: ''
    },
    sv: {
      output: 'sv/pages/resources.html',
      lang: 'sv',
      title: 'Resurser • Museum of AI',
      assetsPrefix: '../..',
      indexHref: '../index.html',
      backLinkText: '&larr; Till startsidan',
      headExtras: '',
      mainContent: load('resources.sv.html'),
      postScripts: ''
    }
  }
};


