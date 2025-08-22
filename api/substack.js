export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const feed = url.searchParams.get("feed");
  if (!feed) {
    return new Response("Missing feed", { status: 400 });
  }

  // Cache at the edge for 10 minutes
  const cacheKey = new Request(url.toString(), { method: 'GET' });
  const cache = caches.default;
  let resp = await cache.match(cacheKey);
  if (resp) return resp;

  const upstream = await fetch(feed, {
    headers: { "User-Agent": "MAI-Website/1.0 (+https://your-domain)" }
  });

  if (!upstream.ok) {
    return new Response("Upstream failed", { status: 502 });
  }

  const body = await upstream.text();

  resp = new Response(body, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, s-maxage=600, max-age=60" // 10 min edge, 1 min browser
    }
  });

  // store in edge cache
  await cache.put(cacheKey, resp.clone());
  return resp;
}
