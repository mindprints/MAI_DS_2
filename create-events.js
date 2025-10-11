const fs = require('fs');
const path = require('path');

const events = [
  {
    slug: 'robotics-workshop',
    enTitle: 'Robotics Workshop',
    svTitle: 'Robotikworkshop',
    enSubtitle: 'Hands-on session with autonomous robotic systems',
    svSubtitle: 'Praktisk session med autonoma robotsystem',
    month: 'MAR',
    svMonth: 'MAR',
    color: 'cyan'
  },
  {
    slug: 'future-of-creative-ai',
    enTitle: 'Future of Creative AI',
    svTitle: 'Framtiden för kreativ AI',
    enSubtitle: 'How generative models are transforming arts and design',
    svSubtitle: 'Hur generativa modeller förändrar konst och design',
    month: 'MAY',
    svMonth: 'MAJ',
    color: 'violet'
  },
  {
    slug: 'ai-in-medicine',
    enTitle: 'AI in Medicine',
    svTitle: 'AI inom medicin',
    enSubtitle: 'Breakthroughs in disease diagnosis and treatment',
    svSubtitle: 'Genombrott i sjukdomsdiagnostik och behandling',
    month: 'SEP',
    svMonth: 'SEP',
    color: 'pink'
  }
];

const template = (lang, event) => `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${lang === 'en' ? event.enTitle : event.svTitle} - Museum of Artificial Intelligence</title>
  <link rel="stylesheet" href="${lang === 'sv' ? '../../../' : '../../'}assets/css/tailwind.css">
  <link rel="stylesheet" href="${lang === 'sv' ? '../../../' : '../../'}assets/css/styles.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
  <header class="w-full">
    <div class="container mx-auto px-4 py-6">
      <a href="${lang === 'sv' ? '../../' : '../../'}index.html" class="text-slate-300 hover:text-white inline-flex items-center">
        <i class="fa-solid fa-home mr-2"></i> ${lang === 'en' ? 'Home' : 'Hem'}
      </a>
    </div>
  </header>
  <nav class="container mx-auto px-4 mb-8">
    <div class="glass-card p-4 rounded-xl">
      <h3 class="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wide">${lang === 'en' ? 'Other Events' : 'Andra evenemang'}</h3>
      <div class="flex flex-wrap gap-3">
        <a href="ai-ethics-symposium.html" class="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-full text-sm font-medium transition">${lang === 'en' ? 'AI Ethics Symposium' : 'Symposium om AI-etik'}</a>
        ${event.slug === 'robotics-workshop' ? `<span class="px-4 py-2 bg-cyan-600 text-white rounded-full text-sm font-medium">${lang === 'en' ? 'Robotics Workshop' : 'Robotikworkshop'}</span>` : `<a href="robotics-workshop.html" class="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-full text-sm font-medium transition">${lang === 'en' ? 'Robotics Workshop' : 'Robotikworkshop'}</a>`}
        ${event.slug === 'future-of-creative-ai' ? `<span class="px-4 py-2 bg-violet-600 text-white rounded-full text-sm font-medium">${lang === 'en' ? 'Future of Creative AI' : 'Framtiden för kreativ AI'}</span>` : `<a href="future-of-creative-ai.html" class="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-full text-sm font-medium transition">${lang === 'en' ? 'Future of Creative AI' : 'Framtiden för kreativ AI'}</a>`}
        ${event.slug === 'ai-in-medicine' ? `<span class="px-4 py-2 bg-pink-600 text-white rounded-full text-sm font-medium">${lang === 'en' ? 'AI in Medicine' : 'AI inom medicin'}</span>` : `<a href="ai-in-medicine.html" class="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-full text-sm font-medium transition">${lang === 'en' ? 'AI in Medicine' : 'AI inom medicin'}</a>`}
      </div>
    </div>
  </nav>
  <main class="py-8">
    <div class="container mx-auto px-4">
      <div class="glass-card p-8 rounded-xl border-l-4 border-${event.color}-500">
        <div class="flex items-center mb-6">
          <div class="mr-6">
            <div class="text-5xl font-bold text-${event.color}-300">${lang === 'en' ? event.month : event.svMonth}</div>
            <div class="text-slate-300 font-medium text-xl">2026</div>
          </div>
          <div>
            <h1 class="text-4xl font-bold mb-2">${lang === 'en' ? event.enTitle : event.svTitle}</h1>
            <p class="text-xl text-slate-400">${lang === 'en' ? event.enSubtitle : event.svSubtitle}</p>
          </div>
        </div>
        <div class="mt-8 space-y-6 text-slate-300 text-lg leading-relaxed">
          <p>${lang === 'en' ? 'Event details coming soon...' : 'Evenemangsdetaljer kommer snart...'}</p>
        </div>
      </div>
      <div class="text-center mt-12">
        <a href="../contact.html" class="glass-card hover:border-${event.color}-500 px-8 py-4 rounded-full font-bold transition duration-300 inline-flex items-center">
          ${lang === 'en' ? 'Contact us for more information' : 'Kontakta oss för mer information'}
          <i class="fa-solid fa-arrow-right ml-3"></i>
        </a>
      </div>
    </div>
  </main>
  <script src="${lang === 'sv' ? '../../../' : '../../'}assets/js/script.js"></script>
</body>
</html>`;

// Create directories if they don't exist
const enDir = path.join(__dirname, 'public', 'pages', 'events');
const svDir = path.join(__dirname, 'public', 'sv', 'pages', 'events');

if (!fs.existsSync(enDir)) fs.mkdirSync(enDir, { recursive: true });
if (!fs.existsSync(svDir)) fs.mkdirSync(svDir, { recursive: true });

// Create all event files
events.forEach(event => {
  const enPath = path.join(enDir, `${event.slug}.html`);
  const svPath = path.join(svDir, `${event.slug}.html`);
  
  fs.writeFileSync(enPath, template('en', event));
  fs.writeFileSync(svPath, template('sv', event));
  
  console.log(`Created ${event.slug} in both languages`);
});

console.log('All event pages created!');

