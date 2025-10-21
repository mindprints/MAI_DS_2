const { getFile, putFile, listDir } = require('./_github.js');
const cheerio = require('cheerio');

function isSafeSlug(slug) {
  return /^[a-z0-9\-]+$/i.test(slug);
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
          const nextText = byId.get(id);
          child.data = typeof nextText === 'string' ? nextText : '';
        }      }
    });
  });

  return $.root().html();
}

async function listEventSlugs() {
  const entries = await listDir('src/site/pages/events');
  const slugs = [];
  for (const e of Array.isArray(entries) ? entries : []) {
    if (e.name && e.name.endsWith('.html')) {
      slugs.push(e.name.replace('.html', ''));
    }
  }
  return slugs.sort();
}

function resolveEventPath(slug, locale) {
  if (locale === 'sv') {
    return `src/site/sv/pages/events/${slug}.html`;
  }
  return `src/site/pages/events/${slug}.html`;
}

module.exports = async function handler(req, res) {
  try {
    const { method } = req;

    if (method === 'GET') {
      // List events
      if (req.query.list === '1') {
        const slugs = await listEventSlugs();
        return res.status(200).json({ slugs });
      }
      
      // Get event segments
      const slug = String(req.query.slug || '');
      const locale = String(req.query.locale || 'en');
      if (!isSafeSlug(slug) || (locale !== 'en' && locale !== 'sv')) {
        return res.status(400).json({ error: 'bad params' });
      }
      const eventPath = resolveEventPath(slug, locale);
      const { content } = await getFile(eventPath);
      const segments = getTextSegments(content);
      return res.status(200).json({ slug, locale, path: eventPath, segments });
    }

    if (method === 'PUT') {
      const slug = String(req.query.slug || '');
      const locale = String(req.query.locale || 'en');
      if (!isSafeSlug(slug) || (locale !== 'en' && locale !== 'sv')) {
        return res.status(400).json({ error: 'bad params' });
      }
      const eventPath = resolveEventPath(slug, locale);
      const body = req.body || {};
      const updates = Array.isArray(body.updates) ? body.updates : [];
      const { content } = await getFile(eventPath);
      const next = applyTextUpdates(content, updates);
      await putFile(eventPath, next, `chore(admin): update event text segments for ${slug}.${locale}`);
      const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
      if (hook) { try { await fetch(hook, { method: 'POST' }); } catch(e){} }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

