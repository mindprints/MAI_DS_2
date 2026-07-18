// Flash notice banner on the home pages. Content lives in
// /content/notice.json (edited from the admin dashboard). The banner shows
// only when the notice is active, non-empty, and not past its "until" date
// (inclusive, checked in the visitor's local time) — so a dated notice
// disappears on its own without a rebuild.
(async () => {
  try {
    const resp = await fetch('/content/notice.json', { cache: 'no-store' });
    if (!resp.ok) return;
    const notice = await resp.json();
    if (!notice.active) return;

    if (notice.until) {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (today > notice.until) return;
    }

    const lang = (document.documentElement.lang || 'en').slice(0, 2);
    const text = ((lang === 'sv' ? notice.sv : notice.en) || notice.en || notice.sv || '').trim();
    if (!text) return;

    const el = document.getElementById('flash-notice');
    if (!el) return;
    el.querySelector('.flash-notice-text').textContent = text;
    el.hidden = false;
  } catch {
    /* no notice on any error — the banner is never load-bearing */
  }
})();
