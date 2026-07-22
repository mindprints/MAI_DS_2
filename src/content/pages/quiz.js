const fs = require('fs');
const path = require('path');

function load(partial) {
  try {
    return fs.readFileSync(path.join(__dirname, partial), 'utf8');
  } catch (error) {
    throw new Error(`Failed to load partial "${partial}": ${error.message}`);
  }
}

// One script for both locales: every visitor-facing string is a data-attribute
// on #quiz in the localised partial, so the logic never needs translating.
const script = load('quiz.script.html');

module.exports = {
  template: 'standard',
  locales: {
    en: {
      output: 'pages/quiz.html',
      lang: 'en',
      title: 'Test your AI knowledge • Museum of AI',
      assetsPrefix: '..',
      indexHref: '../index.html',
      backLinkText: '&larr; Back to Home',
      headExtras: `  <link rel="alternate" hreflang="sv" href="../sv/pages/quiz">\n  <link rel="alternate" hreflang="en" href="./quiz">`,
      mainContent: load('quiz.en.html'),
      postScripts: script
    },
    sv: {
      output: 'sv/pages/quiz.html',
      lang: 'sv',
      title: 'Testa dina AI-kunskaper • Museum of AI',
      assetsPrefix: '../..',
      indexHref: '../index.html',
      backLinkText: '&larr; Till startsidan',
      headExtras: `  <link rel="alternate" hreflang="en" href="../../pages/quiz">\n  <link rel="alternate" hreflang="sv" href="./quiz">`,
      mainContent: load('quiz.sv.html'),
      postScripts: script
    }
  }
};
