const fs = require('fs');
const path = require('path');

function load(localPath) {
  const fullPath = path.join(__dirname, localPath);
  try {
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }
    return fs.readFileSync(fullPath, 'utf8');
  } catch (error) {
    const originalMessage = error && error.message ? error.message : String(error);
    throw new Error(`Failed to read file at ${fullPath}: ${originalMessage}`);
  }
}

module.exports = {
  template: 'standard',
  locales: {
    en: {
      output: 'mailpox.html',
      lang: 'en',
      title: 'Mailpox Demo • Museum of AI',
      assetsPrefix: '.',
      indexHref: 'index.html',
      backLinkText: '&larr; Back to Home',
      headExtras: '',
      mainContent: load('mailpox.en.html'),
      scriptSrc: 'assets/js/script.js',
      postScripts: `
        <script>
        (async function(){
          const LANG = (document.documentElement.lang || 'en').toLowerCase();
          const response = await fetch('/api/mailpox/content');
          const content = await response.json();

          document.querySelectorAll('[data-key]').forEach(el => {
            const key = el.getAttribute('data-key');
            const item = content.find(c => c.key === key && c.lang === LANG);
            if (item) {
              el.innerHTML = item.body;
            }
          });
        })();
        </script>
      `,
    },
  }
};
