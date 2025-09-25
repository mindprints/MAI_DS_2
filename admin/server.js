const express = require('express');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const { exec } = require('child_process');
const { getTextSegments, applyTextUpdates } = require('./dom');

const app = express();
app.use(express.json({ limit: '10mb' }));

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'src', 'content', 'pages');
const SITE_DIR = path.join(ROOT, 'src', 'site');
const SLIDES_DIR = path.join(SITE_DIR, 'images', 'slide');
const SLIDES_MANIFEST = path.join(SLIDES_DIR, 'slides.json');
const ENCYC_DIR = path.join(ROOT, 'src', 'content', 'encyclopedia');

function assertLocale(locale) {
  if (locale !== 'en' && locale !== 'sv') {
    const err = new Error('Invalid locale');
    err.status = 400;
    throw err;
  }
}

function isSafeSlug(slug) {
  return slug === 'index' || /^[a-z0-9\-]+$/i.test(slug);
}

function resolvePageFile(slug, locale) {
  if (slug === 'index') {
    return locale === 'sv' ? path.join(SITE_DIR, 'sv', 'index.html') : path.join(SITE_DIR, 'index.html');
  }
  return path.join(CONTENT_DIR, `${slug}.${locale}.html`);
}

// Pages: list available slugs
app.get('/api/pages', async (_req, res) => {
  try {
    const files = await fsp.readdir(CONTENT_DIR);
    const slugs = new Set();
    files.forEach((f) => {
      const m = f.match(/^(.+)\.(en|sv)\.html$/);
      if (m) slugs.add(m[1]);
    });
    res.json({ slugs: Array.from(slugs).sort(), home: ['index'] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Pages: get text-only segments for a locale
app.get('/api/page-segments/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const locale = (req.query.locale || 'en').toString();
    if (!isSafeSlug(slug)) return res.status(400).json({ error: 'bad slug' });
    assertLocale(locale);
    const file = resolvePageFile(slug, locale);
    const html = await fsp.readFile(file, 'utf8');
    const segments = getTextSegments(html);
    res.json({ slug, locale, file, segments });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Pages: save text-only segments (by id path)
app.put('/api/page-segments/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const locale = (req.query.locale || 'en').toString();
    if (!isSafeSlug(slug)) return res.status(400).json({ error: 'bad slug' });
    assertLocale(locale);
    const file = resolvePageFile(slug, locale);
    const { updates } = req.body || {};
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'updates must be an array' });
    const html = await fsp.readFile(file, 'utf8');
    const next = applyTextUpdates(html, updates);
    await fsp.writeFile(file, next, 'utf8');
    res.json({ ok: true });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Encyclopedia: list available slugs
app.get('/api/ency', async (_req, res) => {
  try {
    const files = await fsp.readdir(ENCYC_DIR);
    const slugs = new Set();
    files.forEach((f) => {
      const m = f.match(/^(.+)\.(en|sv)\.html$/);
      if (m) slugs.add(m[1]);
    });
    res.json({ slugs: Array.from(slugs).sort() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Encyclopedia: get text-only segments
app.get('/api/ency-segments/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const locale = (req.query.locale || 'en').toString();
    if (!isSafeSlug(slug)) return res.status(400).json({ error: 'bad slug' });
    assertLocale(locale);
    const file = path.join(ENCYC_DIR, `${slug}.${locale}.html`);
    const html = await fsp.readFile(file, 'utf8');
    const segments = getTextSegments(html);
    res.json({ slug, locale, file, segments });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Encyclopedia: save text-only segments
app.put('/api/ency-segments/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const locale = (req.query.locale || 'en').toString();
    if (!isSafeSlug(slug)) return res.status(400).json({ error: 'bad slug' });
    assertLocale(locale);
    const file = path.join(ENCYC_DIR, `${slug}.${locale}.html`);
    const { updates } = req.body || {};
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'updates must be an array' });
    const html = await fsp.readFile(file, 'utf8');
    const next = applyTextUpdates(html, updates);
    await fsp.writeFile(file, next, 'utf8');
    res.json({ ok: true });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Slides: list files + manifest
app.get('/api/slides', async (_req, res) => {
  try {
    const entries = await fsp.readdir(SLIDES_DIR, { withFileTypes: true });
    const files = entries.filter(e => e.isFile()).map(e => e.name).filter(n => /\.(webp|jpg|jpeg|png|avif)$/i.test(n));
    let manifest = [];
    try { manifest = JSON.parse(await fsp.readFile(SLIDES_MANIFEST, 'utf8')); } catch {}
    res.json({ files, manifest });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Slides: save manifest
app.put('/api/slides', async (req, res) => {
  try {
    const manifest = Array.isArray(req.body) ? req.body : [];
    await fsp.writeFile(SLIDES_MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Slides: upload file
app.post('/api/slides/upload', express.raw({ type: '*/*', limit: '50mb' }), async (req, res) => {
  try {
    const name = req.query.name;
    if (!name || !/^[\w\-.]+$/.test(String(name))) return res.status(400).json({ error: 'bad name' });
    await fsp.writeFile(path.join(SLIDES_DIR, String(name)), req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Slides: delete file and remove from manifest
app.delete('/api/slides', async (req, res) => {
  try {
    const name = req.query.name;
    if (!name || !/^[\w\-.]+$/.test(String(name))) return res.status(400).json({ error: 'bad name' });
    const full = path.join(SLIDES_DIR, String(name));
    try { await fsp.unlink(full); } catch {}
    let manifest = [];
    try { manifest = JSON.parse(await fsp.readFile(SLIDES_MANIFEST, 'utf8')); } catch {}
    const next = Array.isArray(manifest) ? manifest.filter(it => it && it.filename !== String(name)) : [];
    await fsp.writeFile(SLIDES_MANIFEST, JSON.stringify(next, null, 2) + '\n', 'utf8');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Trigger site build
app.post('/api/build', (_req, res) => {
  exec('npm run build', { cwd: ROOT }, (err, stdout, stderr) => {
    res.json({ ok: !err, stdout, stderr });
  });
});

// Static for admin UI and slide previews
app.use('/slides-assets', express.static(SLIDES_DIR));
app.use(express.static(path.join(__dirname, 'static')));

const PORT = process.env.PORT || 5179;
app.listen(PORT, () => {
  console.log(`Admin running on http://localhost:${PORT}`);
});
