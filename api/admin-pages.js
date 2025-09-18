const { getFile, putFile, listDir } = require('./_github.js');
const cheerio = require('cheerio');

function isSafeSlug(slug) {
  return slug === 'index' || /^[a-z0-9\-]+$/i.test(slug);
}

function resolvePagePath(slug, locale) {
  if (slug === 'index') {
    return locale === 'sv' ? 'src/site/sv/index.html' : 'src/site/index.html';
  }
  return `src/content/pages/${slug}.${locale}.html`;
}

function getTextSegments(html) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const segments = [];
  const skip = new Set(['script', 'style']);

  function nodePath(node) {
    const parts = [];
    let cur = node;
    while (cur && cur.parent) {
      const parent = cur.parent;
      const idx = parent.children.indexOf(cur);
      parts.push(String(idx));
      cur = parent;
    }
    return parts.reverse().join('/');
  }

  $('*').each((_, el) => {
    if (skip.has(el.tagName)) return;
    const contents = el.children || [];
    contents.forEach((child) => {
      if (child.type === 'text') {
        const raw = child.data || '';
        const text = raw.replace(/\s+/g, ' ').trim();
        if (text) {
          segments.push({ id: nodePath(child), parentTag: el.tagName, text });
        }
      }
    });
  });
  return segments;
}

function applyTextUpdates(html, updates) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const byId = new Map(updates.map(u => [String(u.id), u.text]));
  const skip = new Set(['script', 'style']);

  function nodePath(node) {
    const parts = [];
    let cur = node;
    while (cur && cur.parent) {
      const parent = cur.parent;
      const idx = parent.children.indexOf(cur);
      parts.push(String(idx));
      cur = parent;
    }
    return parts.reverse().join('/');
  }

  $('*').each((_, el) => {
    if (skip.has(el.tagName)) return;
    const contents = el.children || [];
    contents.forEach((child) => {
      if (child.type === 'text') {
        const id = nodePath(child);
        if (byId.has(id)) {
          $(child).replaceWith(byId.get(id));
        }
      }
    });
  });

  return $.root().html();
}

async function triggerDeployHook() {
  try {
    const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
    if (!hook) return;
    await fetch(hook, { method: 'POST' });
  } catch (_) { /* ignore */ }
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
      const segments = getTextSegments(content);
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
      const next = applyTextUpdates(content, updates);
      await putFile(path, next, `chore(admin): update text segments for ${slug}.${locale}`);
      await triggerDeployHook();
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
