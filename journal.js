// File: journal.js
function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    // remove images if present
    div.querySelectorAll('img, figure').forEach(el => el.remove());
    return div.textContent || div.innerText || '';
  }
  
  function truncate(txt, n = 160) {
    return txt.length > n ? txt.slice(0, n).trimEnd() + '…' : txt;
  }
  
  function toDate(el) {
    const raw = el?.textContent || '';
    const d = new Date(raw);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
  }
  
  function cardHtml({ title, link, date, excerpt }) {
    return `
      <article class="glass-card rounded-xl p-5 flex flex-col">
        <h3 class="text-lg font-bold leading-tight"><a class="hover:underline" href="${link}" target="_blank" rel="noopener">${title}</a></h3>
        <p class="text-slate-400 text-sm mt-1">${date}</p>
        <p class="text-slate-300 mt-3">${truncate(excerpt)}</p>
        <div class="mt-4">
          <a class="text-cyan-400 hover:text-cyan-300" href="${link}" target="_blank" rel="noopener">Read more →</a>
        </div>
      </article>
    `;
  }
  
  async function loadPosts() {
    const postsEl = document.getElementById('posts');
    const errEl = document.getElementById('posts-error');
  
    try {
      const res = await fetch('/api/substack');
      if (!res.ok) throw new Error('bad response');
      const xml = await res.text();
  
      const doc = new DOMParser().parseFromString(xml, 'text/xml');
      const items = Array.from(doc.querySelectorAll('item')).slice(0, 9);
  
      if (!items.length) throw new Error('no items');
  
      const cards = items.map(item => {
        const title = item.querySelector('title')?.textContent || 'Untitled';
        const link  = item.querySelector('link')?.textContent || '#';
        const date  = toDate(item.querySelector('pubDate'));
        const encoded = item.querySelector('content\\:encoded')?.textContent; // CDATA
        const desc = item.querySelector('description')?.textContent;
        const excerpt = stripHtml(encoded || desc || '');
        return cardHtml({ title, link, date, excerpt });
      }).join('');
  
      postsEl.innerHTML = cards;
    } catch (e) {
      errEl.classList.remove('hidden');
    }
  }
  
  document.addEventListener('DOMContentLoaded', loadPosts);
  