// /api/substack.js  (Edge Runtime)
export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    const url  = new URL(req.url);
    const feed = url.searchParams.get('feed') || 'https://mindprints.substack.com/feed';

    const r = await fetch(feed, {
      headers: { 'user-agent': 'MAI-Website/1.0 (+https://mindprints.substack.com)' }
    });
    if (!r.ok) {
      return new Response(`Upstream failed: ${r.status}`, { status: 502 });
    }

    const xml = await r.text();
    return new Response(xml, {
      headers: {
        'content-type': 'application/rss+xml; charset=utf-8',
        'cache-control': 'public, s-maxage=600, max-age=60',
        'access-control-allow-origin': '*' // handy during local dev
      }
    });
  } catch (err) {
    return new Response('Error: ' + (err?.message || 'unknown'), { status: 500 });
  }
}
