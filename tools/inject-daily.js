#!/usr/bin/env node
// Injects the latest daily posts (on-this-day + AI news cards) and the
// daily rotating hero image into the built home pages. Runs as the last
// build step, replacing the <!-- DAILY_IMAGE --> and <!-- DAILY_CARDS -->
// markers in public/index.html and public/sv/index.html.
const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const dailyDir = path.join(rootDir, 'src', 'content', 'daily');
const slidesManifest = path.join(rootDir, 'src', 'site', 'images', 'slide', 'slides.json');

const STRINGS = {
  en: {
    archiveLabel: 'FROM THE ARCHIVE — ON THIS DAY',
    newsLabel: 'TODAY IN AI',
    readEssay: 'Read the essay →',
    readBriefing: 'Read the briefing →',
    credit: 'MAI AI-generated content',
    allPosts: 'All daily posts →',
    dailyBase: 'pages/daily',
    from: 'from',
    dateLocale: 'en-GB',
  },
  sv: {
    archiveLabel: 'UR ARKIVET — PÅ DENNA DAG',
    newsLabel: 'IDAG INOM AI',
    readEssay: 'Läs essän →',
    readBriefing: 'Läs sammanfattningen →',
    credit: 'MAI AI-genererat innehåll',
    allPosts: 'Alla dagliga inlägg →',
    dailyBase: '/sv/pages/daily',
    from: 'från',
    dateLocale: 'sv-SE',
  },
};

function todayIsoStockholm() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function latestPost(type, locale) {
  if (!fs.existsSync(dailyDir)) return null;
  const files = fs
    .readdirSync(dailyDir)
    .filter((f) => f.match(new RegExp(`^\\d{4}-\\d{2}-\\d{2}\\.${type}\\.en\\.html$`)))
    .sort()
    .reverse();
  if (files.length === 0) return null;
  const date = files[0].slice(0, 10);
  const localized = path.join(dailyDir, `${date}.${type}.${locale}.html`);
  const file = fs.existsSync(localized) ? localized : path.join(dailyDir, files[0]);
  const html = fs.readFileSync(file, 'utf8');
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';
  const pMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  const excerptRaw = pMatch ? pMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';
  const excerpt = excerptRaw.length > 200 ? excerptRaw.slice(0, 200).trimEnd() + '…' : excerptRaw;
  return { date, type, title, excerpt };
}

function staleDate(post, locale) {
  if (!post || post.date === todayIsoStockholm()) return '';
  const [y, m, d] = post.date.split('-').map(Number);
  const label = new Intl.DateTimeFormat(STRINGS[locale].dateLocale, { day: 'numeric', month: 'long' }).format(new Date(y, m - 1, d));
  return `<span style="font-size:0.7rem;color:#8a7a5c;margin-left:10px;">(${STRINGS[locale].from} ${label})</span>`;
}

function archiveCard(post, locale) {
  const s = STRINGS[locale];
  if (!post) return '';
  const yearMatch = post.title.match(/^(\d{3,4})\s*:\s*(.*)$/);
  const year = yearMatch ? yearMatch[1] : '';
  const title = yearMatch ? yearMatch[2] : post.title;
  const href = `${s.dailyBase}/${post.date}-onthisday.html`;
  return `
        <a href="${href}" class="block rounded-xl transition hover:-translate-y-0.5" style="background:#291f14;border:1px solid #8a6d3b;box-shadow:inset 0 0 0 3px #291f14, inset 0 0 0 4px rgba(138,109,59,0.35);padding:22px 24px;font-family:Georgia,'Times New Roman',serif;">
          <div style="font-size:0.7rem;letter-spacing:0.2em;color:#d4a04f;margin-bottom:12px;">${s.archiveLabel}${staleDate(post, locale)}</div>
          <div style="display:flex;gap:14px;align-items:baseline;flex-wrap:wrap;">
            ${year ? `<span style="font-size:2.6rem;color:#e8c583;line-height:1;">${year}</span>` : ''}
            <span style="font-size:1.15rem;color:#f0e6d2;line-height:1.35;flex:1;min-width:12rem;">${title}</span>
          </div>
          <p style="font-size:0.9rem;color:#b8a37e;line-height:1.6;margin-top:12px;">${post.excerpt}</p>
          <div style="font-size:0.85rem;color:#d4a04f;margin-top:14px;">${s.readEssay}</div>
        </a>`;
}

function newsCard(post, locale) {
  const s = STRINGS[locale];
  if (!post) return '';
  const href = `${s.dailyBase}/${post.date}-ainews.html`;
  return `
        <a href="${href}" class="block rounded-r-xl transition hover:-translate-y-0.5" style="background:#16222f;border:1px solid #164e63;border-left:3px solid #22d3ee;padding:22px 24px;">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:12px;">
            <span class="daily-live-dot" style="width:8px;height:8px;border-radius:50%;background:#22d3ee;display:inline-block;"></span>
            <span style="font-size:0.7rem;letter-spacing:0.2em;color:#67e8f9;">${s.newsLabel}${staleDate(post, locale)}</span>
          </div>
          <div style="font-size:1.15rem;font-weight:700;color:#e2f4f8;line-height:1.35;">${post.title}</div>
          <p style="font-size:0.9rem;color:#7da5b8;line-height:1.6;margin-top:12px;">${post.excerpt}</p>
          <div style="font-size:0.85rem;color:#22d3ee;margin-top:14px;">${s.readBriefing}</div>
        </a>`;
}

function cardsSection(locale) {
  const s = STRINGS[locale];
  const onthisday = latestPost('onthisday', locale);
  const ainews = latestPost('ainews', locale);
  if (!onthisday && !ainews) return '';
  return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto items-stretch">
${archiveCard(onthisday, locale)}
${newsCard(ainews, locale)}
      </div>
      <div class="max-w-6xl mx-auto flex justify-between items-center mt-3 px-1">
        <span style="font-size:0.72rem;color:#64748b;letter-spacing:0.06em;">${s.credit}</span>
        <a href="${s.dailyBase}.html" style="font-size:0.72rem;color:#64748b;" class="hover:text-cyan-400 transition">${s.allPosts}</a>
      </div>`;
}

// Daily rotating hero image from the slide bank (deterministic by date).
function dailyImage(locale) {
  let slides;
  try {
    slides = JSON.parse(fs.readFileSync(slidesManifest, 'utf8')).filter((sl) => sl && sl.filename);
  } catch (e) {
    return '';
  }
  if (slides.length === 0) return '';
  const dayNumber = Math.floor(Date.parse(todayIsoStockholm()) / 86400000);
  const slide = slides[dayNumber % slides.length];
  const prefix = locale === 'sv' ? '../images/slide/' : 'images/slide/';
  const alt = (slide.title || 'Museum of AI').replace(/"/g, '&quot;');
  return `<img src="${prefix}${slide.filename}" alt="${alt}" class="w-64 h-96 md:w-80 md:h-[500px] object-cover rounded-xl shadow-2xl" loading="eager">`;
}

function inject(file, locale) {
  if (!fs.existsSync(file)) {
    console.warn(`inject-daily: ${file} not found, skipping`);
    return;
  }
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  html = html.replace(/<!-- DAILY_IMAGE -->/g, dailyImage(locale));
  html = html.replace(/<!-- DAILY_CARDS -->/g, cardsSection(locale));
  if (html !== before) {
    fs.writeFileSync(file, html, 'utf8');
    console.log(`Injected daily content into ${path.relative(rootDir, file)}`);
  } else {
    console.warn(`inject-daily: no markers found in ${path.relative(rootDir, file)}`);
  }
}

inject(path.join(rootDir, 'public', 'index.html'), 'en');
inject(path.join(rootDir, 'public', 'sv', 'index.html'), 'sv');
