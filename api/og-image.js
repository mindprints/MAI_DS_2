// /api/og-image.js
// Vercel Edge Function: return { image } for a given page URL
export const config = { runtime: 'edge' };

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, s-maxage=86400, max-age=600', // 1d edge, 10m browser
      'access-control-allow-origin': '*',
      ...extra,
    },
  });
}

function extractOgImage(html) {
  // Grab all <meta ...> tags first; then inspect each (handles attr order)
  const tags = [...html.matchAll(/<meta[^>]*>/gi)].map(m => m[0]);

  for (const tag of tags) {
    const hasOg =
      /property\s*=\s*["']og:image(?::secure_url)?["']/i.test(tag) ||
      /name\s*=\s*["']twitter:image(?::src)?["']/i.test(tag);

    if (!hasOg) continue;

    const m = tag.match(/content\s*=\s*["']([^"']+)["']/i);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const target = url.searchParams.get('url');
    if (!target) return json({ error: 'Missing ?url=' }, 400);

    let base;
    try {
      base = new URL(target);
      if (!/^https?:$/.test(base.protocol)) {
        return json({ error: 'Only http(s) URLs allowed' }, 400);
      }
    } catch {
      return json({ error: 'Invalid URL' }, 400);
    }

    const resp = await fetch(base.toString(), {
      headers: {
        // Friendly UA to avoid some anti-bot blocks
        'user-agent':
          'Mozilla/5.0 (compatible; MAI-Website/1.0; +https://mindprints.substack.com)',
        'accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    if (!resp.ok) {
      return json({ error: `Upstream responded ${resp.status}` }, 502);
    }

    const html = await resp.text();
    let img = extractOgImage(html);

    // Resolve relative URLs if needed
    if (img) {
      try { img = new URL(img, base).toString(); } catch { /* ignore */ }
    }

    return json({ image: img || null });
  } catch (e) {
    return json({ error: e?.message || 'Unknown error' }, 500);
  }
}
