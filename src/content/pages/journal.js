const fs = require('fs');
const path = require('path');

function load(partial) {
  return fs.readFileSync(path.join(__dirname, partial), 'utf8');
}

module.exports = {
  template: 'journal',
  locales: {
    en: {
      output: 'pages/journal.html',
      lang: 'en',
      title: 'Journal • Museum of Artificial Intelligence',
      assetsPrefix: '..',
      indexHref: '../index.html',
      navHomeText: 'Home',
      logoSrc: '../images/MAI_logoTransp_mc2.png',
      logoAlt: 'MAI logo',
      ctaButtonText: 'Subscribe on Substack',
      heroTitle: 'Journal',
      heroCopy: 'Essays and updates from our Substack, <a class="underline" href="https://mindprints.substack.com/" target="_blank" rel="noopener">mindprints</a>.',
      mainContent: load('journal.en.html'),
      footerText: '&copy; 2025 Museum of Artificial Intelligence.',
      headExtras: `  <link rel="alternate" hreflang="en" href="../pages/journal.html">\n  <link rel="alternate" hreflang="sv" href="../sv/pages/journal.html">`,
      journalScriptSrc: '../journal.js',
      postScripts: ''
    },
    sv: {
      output: 'sv/pages/journal.html',
      lang: 'sv',
      title: 'Journal • Museum of Artificial Intelligence',
      assetsPrefix: '../..',
      indexHref: '../index.html',
      navHomeText: 'Start',
      logoSrc: '../../images/MAI_logoTransp_mc2.png',
      logoAlt: 'MAI logotyp',
      ctaButtonText: 'Prenumerera på Substack',
      heroTitle: 'Journal',
      heroCopy: 'Essäer och uppdateringar från vår Substack, <a class="underline" href="https://mindprints.substack.com/" target="_blank" rel="noopener">mindprints</a>.',
      mainContent: load('journal.sv.html'),
      footerText: '&copy; 2025 Museum of Artificial Intelligence.',
      headExtras: `  <link rel="alternate" hreflang="en" href="../../pages/journal.html">\n  <link rel="alternate" hreflang="sv" href="./journal.html">`,
      journalScriptSrc: '../../journal.js',
      postScripts: ''
    }
  }
};
