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
const llmIndexFile = path.join(rootDir, 'src', 'content', 'llm-index.json');
const llmUsageFile = path.join(rootDir, 'src', 'content', 'llm-usage.json');
const chatUsageFile = path.join(rootDir, 'src', 'content', 'chat-usage.json');

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
    llmLabel: 'MOST INTELLIGENT LLMS RIGHT NOW',
    llmClosed: 'Closed weights',
    llmOpen: 'Open weights',
    llmSource: 'Source: Artificial Analysis Intelligence Index',
    usageLabel: 'MOST USED LLMS — OPENROUTER, PAST 7 DAYS',
    usageModels: 'Top models',
    usageLabs: 'By AI lab',
    usageNote: 'Share of tokens routed via the OpenRouter API — one real slice of AI usage, not the whole picture',
    usageExplain: 'What am I looking at? Behind the scenes, apps and AI tools send text to AI models, measured in "tokens" (roughly pieces of words). OpenRouter is a popular marketplace that forwards these requests to hundreds of different models, and it publishes what flows through it. This card shows which models handled the biggest share of that traffic over the past week. It mainly reflects how developers and AI tools use models — chat apps like ChatGPT and Gemini run on their own infrastructure and are not part of these numbers; the chat-app card shows estimates for those instead.',
    usageDecimal: '.',
    chatLabel: 'MOST USED AI CHAT APPS — WORLDWIDE',
    chatNote: 'Share of monthly active users across AI chat apps; Grok, Perplexity, DeepSeek and Meta AI each sit under 5%',
    chatExplain: 'What am I looking at? These are the AI chat apps most people actually open — on the web or on their phone — measured as each app’s share of monthly active users worldwide. The numbers are estimates by the app-analytics firm Sensor Tower; no AI company publishes exact user counts. Unlike the model rankings below, this reflects everyday consumer use, and we update it when a new credible report is published rather than daily.',
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
    llmLabel: 'SMARTASTE AI-MODELLERNA JUST NU',
    llmClosed: 'Slutna vikter',
    llmOpen: 'Öppna vikter',
    llmSource: 'Källa: Artificial Analysis Intelligence Index',
    usageLabel: 'MEST ANVÄNDA LLM:ERNA — OPENROUTER, SENASTE 7 DAGARNA',
    usageModels: 'Modeller',
    usageLabs: 'AI-labb',
    usageNote: 'Andel av alla tokens via OpenRouters API — ett verkligt utsnitt av AI-användningen, inte hela bilden',
    usageExplain: 'Vad visar det här? Bakom kulisserna skickar appar och AI-verktyg text till AI-modeller, mätt i "tokens" (ungefär orddelar). OpenRouter är en populär marknadsplats som vidarebefordrar sådana anrop till hundratals olika modeller och publicerar vad som passerar. Kortet visar vilka modeller som hanterade störst andel av den trafiken den senaste veckan. Det speglar främst hur utvecklare och AI-verktyg använder modeller — chattappar som ChatGPT och Gemini kör på egen infrastruktur och ingår inte i siffrorna; kortet om chattappar visar uppskattningar för dem i stället.',
    usageDecimal: ',',
    chatLabel: 'MEST ANVÄNDA AI-CHATTAPPARNA — GLOBALT',
    chatNote: 'Andel av månatligt aktiva användare bland AI-chattappar; Grok, Perplexity, DeepSeek och Meta AI ligger var och en under 5 %',
    chatExplain: 'Vad visar det här? Det här är de AI-chattappar som flest faktiskt öppnar — på webben eller i mobilen — mätt som varje apps andel av månatligt aktiva användare globalt. Siffrorna är uppskattningar från analysföretaget Sensor Tower; inget AI-bolag publicerar exakta användartal. Till skillnad från modellrankningen nedan speglar det vardaglig konsumentanvändning, och vi uppdaterar kortet när en ny trovärdig rapport publiceras snarare än dagligen.',
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

// Compact leaderboard strip: top models by Artificial Analysis Intelligence
// Index, closed vs open weights. Reads the snapshot committed by the agent's
// daily job (tools/fetch-llm-index.js); renders nothing if it is missing.
function llmColumn(title, models) {
  const rows = models
    .map(
      (m, i) => `
            <div style="display:flex;align-items:baseline;gap:10px;padding:4px 0;">
              <span style="font-size:0.8rem;color:#7c6f9c;width:1rem;text-align:right;">${i + 1}</span>
              <span style="font-size:0.95rem;color:#ece7f8;font-weight:600;">${m.name}</span>
              <span style="font-size:0.78rem;color:#8d81ad;">${m.creator}</span>
              <span style="font-size:0.9rem;color:#c4b5fd;font-weight:700;margin-left:auto;">${m.score}</span>
            </div>`,
    )
    .join('');
  return `
          <div style="flex:1;min-width:15rem;">
            <div style="font-size:0.7rem;letter-spacing:0.15em;color:#8d81ad;text-transform:uppercase;border-bottom:1px solid #3b2f5e;padding-bottom:6px;margin-bottom:6px;">${title}</div>
${rows}
          </div>`;
}

function llmIndexCard(locale) {
  const s = STRINGS[locale];
  let snap;
  try {
    snap = JSON.parse(fs.readFileSync(llmIndexFile, 'utf8'));
  } catch (e) {
    return '';
  }
  if (!snap.closed?.length || !snap.open?.length) return '';
  const stale = staleDate({ date: snap.fetched_at }, locale);
  return `
      <div class="max-w-6xl mx-auto mt-6 rounded-xl" style="background:#1c1730;border:1px solid #4c3a80;border-left:3px solid #a78bfa;padding:18px 24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
          <span style="font-size:0.7rem;letter-spacing:0.2em;color:#c4b5fd;">${s.llmLabel}${stale}</span>
          <a href="${snap.source_url}" target="_blank" rel="noopener" style="font-size:0.7rem;color:#8d81ad;" class="hover:text-violet-300 transition">${s.llmSource} ↗</a>
        </div>
        <div style="display:flex;gap:28px;flex-wrap:wrap;">
${llmColumn(s.llmClosed, snap.closed)}
${llmColumn(s.llmOpen, snap.open)}
        </div>
      </div>`;
}

// Small "i" toggle that opens a plain-language explanation of a data card.
// A <details> element so it works without JS and on touch screens; the
// .card-info class hides the disclosure marker (rule in the home page CSS).
function infoPopover(text, { border, dim }) {
  // The panel is anchored to the card (nearest position:relative ancestor),
  // not the icon, so it never overflows the viewport on narrow screens.
  return `<details class="card-info" style="display:inline-block;margin-left:10px;vertical-align:-3px;">
            <summary style="list-style:none;cursor:pointer;width:16px;height:16px;border-radius:50%;border:1px solid ${dim};color:${dim};font-size:0.68rem;font-weight:700;letter-spacing:0;display:inline-flex;align-items:center;justify-content:center;" aria-label="info">i</summary>
            <div style="position:absolute;left:16px;right:16px;top:46px;z-index:30;max-width:36rem;background:#0d1117;border:1px solid ${border};border-radius:10px;padding:14px 16px;font-size:0.8rem;color:#c6d2dd;line-height:1.6;letter-spacing:normal;text-transform:none;box-shadow:0 10px 30px rgba(0,0,0,0.55);">${text}</div>
          </details>`;
}

// Chat-app market share: which AI assistants the general public actually
// uses. There is no live API for this — the numbers are estimates from
// published analyst reports, hand-curated in src/content/chat-usage.json
// (update it when a new credible report lands; the card shows its as-of
// date). Renders nothing if the file is missing.
function chatUsageCard(locale) {
  const s = STRINGS[locale];
  let snap;
  try {
    snap = JSON.parse(fs.readFileSync(chatUsageFile, 'utf8'));
  } catch (e) {
    return '';
  }
  if (!snap.apps?.length) return '';
  const asOf = locale === 'sv' ? snap.as_of_sv || snap.as_of : snap.as_of;
  const rows = snap.apps
    .map(
      (a, i) => `
            <div style="display:flex;align-items:baseline;gap:10px;padding:4px 0;">
              <span style="font-size:0.8rem;color:#8c6a7c;width:1rem;text-align:right;">${i + 1}</span>
              <span style="font-size:0.95rem;color:#f6e9f0;font-weight:600;">${a.name}</span>
              <span style="font-size:0.78rem;color:#bd93a8;">${a.maker}</span>
              <span style="flex:1;height:8px;border-radius:4px;background:#3d2230;overflow:hidden;min-width:6rem;"><span style="display:block;height:100%;width:${a.share}%;background:#f472b6;"></span></span>
              <span style="font-size:0.9rem;color:#f9a8d4;font-weight:700;min-width:3.2rem;text-align:right;">${String(a.share).replace('.', s.usageDecimal)}%</span>
            </div>`,
    )
    .join('');
  return `
      <div class="max-w-6xl mx-auto mt-6 rounded-xl" style="position:relative;background:#271420;border:1px solid #7c3a5c;border-left:3px solid #f472b6;padding:18px 24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
          <span style="font-size:0.7rem;letter-spacing:0.2em;color:#f9a8d4;">${s.chatLabel}${infoPopover(s.chatExplain, { border: '#7c3a5c', dim: '#bd93a8' })}</span>
          <a href="${snap.source_url}" target="_blank" rel="noopener" style="font-size:0.7rem;color:#bd93a8;" class="hover:text-pink-300 transition">Source: ${snap.source}, ${asOf} ↗</a>
        </div>
${rows}
        <div style="font-size:0.7rem;color:#8c6a7c;margin-top:10px;">${s.chatNote}</div>
      </div>`;
}

// Usage snapshot: share of tokens routed through OpenRouter over the last
// 7 complete days, top models and top AI labs. Deliberately one named lens
// (developer/agent API traffic; no consumer chatbots) — the label and note
// say so. Reads the snapshot committed by the agent's daily job
// (tools/fetch-openrouter-usage.js); renders nothing if it is missing.
// OpenRouter's dataset terms require citing "Source: OpenRouter
// (openrouter.ai/rankings), as of {as_of}".
function usageColumn(title, rows) {
  const items = rows
    .map(
      (r, i) => `
            <div style="display:flex;align-items:baseline;gap:10px;padding:4px 0;">
              <span style="font-size:0.8rem;color:#5f8f77;width:1rem;text-align:right;">${i + 1}</span>
              <span style="font-size:0.95rem;color:#e7f6ee;font-weight:600;">${r.name}</span>
              ${r.lab ? `<span style="font-size:0.78rem;color:#86b8a0;">${r.lab}</span>` : ''}
              <span style="font-size:0.9rem;color:#6ee7b7;font-weight:700;margin-left:auto;">${r.share}</span>
            </div>`,
    )
    .join('');
  return `
          <div style="flex:1;min-width:15rem;">
            <div style="font-size:0.7rem;letter-spacing:0.15em;color:#86b8a0;text-transform:uppercase;border-bottom:1px solid #2d5842;padding-bottom:6px;margin-bottom:6px;">${title}</div>
${items}
          </div>`;
}

function llmUsageCard(locale) {
  const s = STRINGS[locale];
  let snap;
  try {
    snap = JSON.parse(fs.readFileSync(llmUsageFile, 'utf8'));
  } catch (e) {
    return '';
  }
  if (!snap.models?.length || !snap.labs?.length) return '';
  const share = (v) => `${String(v).replace('.', s.usageDecimal)}%`;
  const asOf = new Intl.DateTimeFormat(s.dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(snap.as_of || snap.fetched_at));
  const stale = staleDate({ date: snap.fetched_at }, locale);
  return `
      <div class="max-w-6xl mx-auto mt-6 rounded-xl" style="position:relative;background:#12251b;border:1px solid #2d6a4f;border-left:3px solid #34d399;padding:18px 24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
          <span style="font-size:0.7rem;letter-spacing:0.2em;color:#6ee7b7;">${s.usageLabel}${stale}${infoPopover(s.usageExplain, { border: '#2d6a4f', dim: '#86b8a0' })}</span>
          <a href="${snap.source_url}" target="_blank" rel="noopener" style="font-size:0.7rem;color:#86b8a0;" class="hover:text-emerald-300 transition">Source: OpenRouter (openrouter.ai/rankings), as of ${asOf} ↗</a>
        </div>
        <div style="display:flex;gap:28px;flex-wrap:wrap;">
${usageColumn(s.usageModels, snap.models.map((m) => ({ name: m.name, lab: m.lab, share: share(m.share) })))}
${usageColumn(s.usageLabs, snap.labs.map((l) => ({ name: l.name, share: share(l.share) })))}
        </div>
        <div style="font-size:0.7rem;color:#5f8f77;margin-top:10px;">${s.usageNote}</div>
      </div>`;
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
      </div>
${llmIndexCard(locale)}
${chatUsageCard(locale)}
${llmUsageCard(locale)}`;
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
