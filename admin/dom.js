const cheerio = require('cheerio');

const SKIP_TAGS = new Set(['script', 'style']);

function getNodePath(node) {
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

function getTextSegments(html) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const segments = [];

  $('*').each((_, el) => {
    if (SKIP_TAGS.has(el.tagName)) return;
    const contents = el.children || [];
    contents.forEach((child) => {
      if (child.type === 'text') {
        const raw = child.data || '';
        const text = raw.replace(/\s+/g, ' ').trim();
        if (text) {
          segments.push({
            id: getNodePath(child),
            parentTag: el.tagName,
            text
          });
        }
      }
    });
  });

  return segments;
}

function applyTextUpdates(html, updates) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const byId = new Map(updates.map((u) => [u.id, u.text]));

  $('*').each((_, el) => {
    if (SKIP_TAGS.has(el.tagName)) return;
    const contents = el.children || [];
    contents.forEach((child) => {
      if (child.type === 'text') {
        const id = getNodePath(child);
        if (byId.has(id)) {
          $(child).replaceWith(byId.get(id));
        }
      }
    });
  });

  return $.root().html();
}

module.exports = {
  getTextSegments,
  applyTextUpdates,
};
