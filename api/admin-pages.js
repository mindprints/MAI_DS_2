const { getFile, putFile, listDir } = require('./_github.js');

function isSafeSlug(slug) {
  return slug === 'index' || /^[a-z0-9\-]+$/i.test(slug);
}

function resolvePagePath(slug, locale) {
  if (slug === 'index') {
    return locale === 'sv' ? 'src/site/sv/index.html' : 'src/site/index.html';
    }
  return `src/content/pages/${slug}.${locale}.html`;
}

function extractSegments(html) {
  const segments = [];
  const re = />([^<>]+)</g;
  let m;
  let i = 0;
  while ((m = re.exec(html))) {
    const raw = m[1];
    const text = raw.replace(/\s+/g, ' ').trim();
    if (text) segments.push({ id: String(i++), text });
  }
  return segments;
}

function applySegments(html, updates) {
  const byId = new Map(updates.map(u => [String(u.id), u.text]));
  let i = 0;
  return html.replace(/>([^<>]+)</g, (full, inner) => {
    const text = inner.replace(/\s+/g, ' ').trim();
    if (text && byId.has(String(i))) {
      const replacement = byId.get(String(i));
      i++;
      return '>' + replacement + '<';
    }
    if (text) i++;
    return full;
  });
}

module.exports = async function handler(req, res) {
  try {
    const { method } = req;
    if (method === 'GET') {
      if (req.query.list === '1') {
        const files = await listDir('src/content/pages');
        const slugs = new Set();
        for (const f of files) {
          const m = f.name && f.name.match(/^(.+)\.(en|sv)\.html$/);
          if (m) slugs.add(m[1]);
        }
        return res.status(200).json({ slugs: Array.from(slugs).sort(), home: ['index'] });
      }
      const slug = String(req.query.slug || 'index');
      const locale = String(req.query.locale || 'en');
      if (!isSafeSlug(slug) || (locale !== 'en' && locale !== 'sv')) return res.status(400).json({ error: 'bad params' });
      const path = resolvePagePath(slug, locale);
      const { content } = await getFile(path);
      const segments = extractSegments(content);
      return res.status(200).json({ slug, locale, path, segments });
    }
    if (method === 'PUT') {
      const slug = String(req.query.slug || 'index');
      const locale = String(req.query.locale || 'en');
      if (!isSafeSlug(slug) || (locale !== 'en' && locale !== 'sv')) return res.status(400).json({ error: 'bad params' });
      const path = resolvePagePath(slug, locale);
      const body = req.body || {};
      const updates = Array.isArray(body.updates) ? body.updates : [];
      const { content } = await getFile(path);
      const next = applySegments(content, updates);
      await putFile(path, next, `chore(admin): update text segments for ${slug}.${locale}`);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
