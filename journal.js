// /journal.js  — covers + OG-image fallback, resilient in dev/prod

// ---------- helpers ----------
const FEED_URL = 'https://mindprints.substack.com/feed';
const API_BASE =
  location.protocol === 'file:' ? 'http://localhost:3000' : location.origin;

const byId = (id) => document.getElementById(id);

function cleanText(html) {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  // don't show media in the excerpt
  div.querySelectorAll('img, picture, figure, video, iframe').forEach(el => el.remove());
  const text = (div.textContent || div.innerText || '').trim().replace(/\s+/g, ' ');
  return text;
}

function firstImageFromHtml(html) {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (!match) return null;
  const src = match[1];
  if (/pixel|spacer|transparent|blank/i.test(src)) return null;
  return src;
}

function truncate(s, n = 160) {
  return s.length > n ? s.slice(0, n).trimEnd() + '…' : s;
}

async function getOgImage(pageUrl) {
  try {
    const r = await fetch(`${API_BASE}/api/og-image?url=${encodeURIComponent(pageUrl)}`);
    if (!r.ok) return null;               // if you haven't added the endpoint, this will 404 → null
    const { image } = await r.json();
    return image || null;
  } catch {
    return null;
  }
}

function cardHtml({ title, link, date, cover, excerpt }) {
  const tracked = `${link}${link.includes('?') ? '&' : '?'}utm_source=mai_website&utm_medium=referral`;
  const coverHtml = cover
    ? `<img src="${cover}" alt="${title}" loading="lazy" class="w-full h-full object-cover block">`
    : `<div class="w-full h-full bg-gradient-to-br from-indigo-700/40 to-cyan-600/30"></div>`;

  return `
    <article class="blog-card glass-card rounded-xl overflow-hidden transition duration-500 hover:shadow-xl">
      <a href="${tracked}" target="_blank" rel="noopener">
        <div class="cover">${coverHtml}</div>
        <div class="p-6">
          <div class="text-indigo-300 text-xs font-semibold mb-2">${date}</div>
          <h3 class="text-lg md:text-xl font-bold mb-2">${title}</h3>
          <p class="text-slate-300">${truncate(excerpt)}</p>
          <div class="mt-4 text-cyan-400 font-medium">Read on Substack »</div>
        </div>
      </a>
    </article>
  `;
}

// ---------- main ----------
async function loadPosts() {
  const listEl = byId('posts') || byId('blog-list');
  const errorEl = byId('posts-error');

  try {
    const res = await fetch(`${API_BASE}/api/substack?feed=${encodeURIComponent(FEED_URL)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`feed fetch failed: ${res.status}`);
    const xml = await res.text();

    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const items = Array.from(doc.querySelectorAll('item')).slice(0, 9);

    const cards = await Promise.all(items.map(async (item) => {
      const title = item.querySelector('title')?.textContent || 'Untitled';
      const link  = item.querySelector('link')?.textContent || '#';
      const pub   = item.querySelector('pubDate')?.textContent || '';
      const date  = pub ? new Date(pub).toLocaleDateString() : '';

      const html  = item.querySelector('content\\:encoded')?.textContent
                 || item.querySelector('description')?.textContent || '';

      let cover = firstImageFromHtml(html);
      if (!cover) cover = await getOgImage(link); // fallback to OG image when RSS has none

      const excerpt = cleanText(html);
      return cardHtml({ title, link, date, cover, excerpt });
    }));

    listEl.innerHTML = cards.join('') || `<div class="text-center text-slate-400 w-full">No posts yet.</div>`;
    if (errorEl) errorEl.classList.add('hidden');
  } catch (err) {
    console.error(err);
    if (errorEl) errorEl.classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', loadPosts);
