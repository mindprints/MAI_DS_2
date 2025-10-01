require('dotenv').config();
const express = require('express');
const path = require('path');
const fsp = require('fs/promises');
const { exec } = require('child_process');
const { Pool } = require('pg');
const { getTextSegments, applyTextUpdates } = require('./dom');

const app = express();
app.use(express.json({ limit: '10mb' }));

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'src', 'content', 'pages');
const SITE_DIR = path.join(ROOT, 'src', 'site');
const SLIDES_DIR = path.join(SITE_DIR, 'images', 'slide');
const SLIDES_MANIFEST = path.join(SLIDES_DIR, 'slides.json');
const ENCYC_DIR = path.join(ROOT, 'src', 'content', 'encyclopedia');

function createPgPool() {
  const url = process.env.DATABASE_URL;
  const hasDirectConfig = process.env.PGHOST || process.env.PGDATABASE || process.env.PGUSER;
  
  if (!url && !hasDirectConfig) {
    console.log('No database configuration found - running without database features');
    return null;
  }

  try {
    const cfg = url ? { connectionString: url } : {
      host: process.env.PGHOST,
      port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE
    };

    if (process.env.PGSSL === 'require') {
      cfg.ssl = { rejectUnauthorized: false };
    } else if (!cfg.ssl) {
      cfg.ssl = false;
    }

    console.log('Attempting database connection with config:', {
      host: cfg.host || 'from connection string',
      database: cfg.database || 'from connection string',
      user: cfg.user || 'from connection string',
      ssl: !!cfg.ssl
    });

    const pool = new Pool(cfg);
    pool.on('error', (err) => {
      console.error('Postgres pool error:', err);
      // Don't crash the app on database errors
    });
    
    // Test the connection but don't crash if it fails
    pool.connect()
      .then(client => {
        console.log('Database connection successful');
        client.release();
      })
      .catch(err => {
        console.error('Database connection failed, but continuing without database features:', err.message);
      });
    
    return pool;
  } catch (error) {
    console.error('Failed to create database pool, continuing without database features:', error.message);
    return null;
  }
}

const pgPool = createPgPool();

async function withDb(res, handler) {
  if (!pgPool) {
    res.status(503).json({ error: 'Database not configured' });
    return;
  }
  let client;
  try {
    client = await pgPool.connect();
    await handler(client);
  } catch (err) {
    console.error('Database operation failed:', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  } finally {
    if (client) client.release();
  }
}

function isSafeKey(key) {
  return typeof key === 'string' && /^[a-zA-Z0-9_.:-]+$/.test(key);
}

process.on('SIGINT', async () => {
  if (pgPool) await pgPool.end().catch(() => {});
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (pgPool) await pgPool.end().catch(() => {});
  process.exit(0);
});

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

// Database-backed text snippet endpoints
app.get('/api/db/text-snippets', (req, res) => {
  withDb(res, async (client) => {
    const rawPrefix = (req.query.prefix || '').toString().trim();
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit, 10) || 100));
    const values = [];
    let where = '';
    if (rawPrefix) {
      const escaped = rawPrefix.replace(/[\\_%]/g, (m) => `\\${m}`) + '%';
      values.push(escaped);
      where = `WHERE key ILIKE $1 ESCAPE '\\'`;
    }
    const keySql = `SELECT key FROM text_snippets ${where} GROUP BY key ORDER BY key ASC LIMIT ${limit}`;
    const keyRows = await client.query(keySql, values);
    const keys = keyRows.rows.map((r) => r.key);
    if (!keys.length) {
      res.json({ items: [] });
      return;
    }
    const dataRows = await client.query(
      'SELECT key, lang, body, updated_at FROM text_snippets WHERE key = ANY($1::text[]) ORDER BY key ASC, lang ASC',
      [keys]
    );
    const grouped = new Map(keys.map((k) => [k, { key: k, values: {}, updated_at: null }]));
    for (const row of dataRows.rows) {
      const item = grouped.get(row.key);
      if (!item) continue;
      const lang = (row.lang || '').toLowerCase();
      if (lang) item.values[lang] = row.body || '';
      if (row.updated_at) {
        const iso = new Date(row.updated_at).toISOString();
        if (!item.updated_at || iso > item.updated_at) item.updated_at = iso;
      }
    }
    res.json({ items: Array.from(grouped.values()) });
  });
});

app.get('/api/db/text-snippets/:key', (req, res) => {
  const key = req.params.key;
  if (!isSafeKey(key)) return res.status(400).json({ error: 'bad key' });
  withDb(res, async (client) => {
    const rows = await client.query(
      'SELECT lang, body, updated_at FROM text_snippets WHERE key = $1 ORDER BY lang ASC',
      [key]
    );
    if (!rows.rowCount) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    const out = { key, values: {}, updated_at: null };
    for (const row of rows.rows) {
      const lang = (row.lang || '').toLowerCase();
      if (lang) out.values[lang] = row.body || '';
      if (row.updated_at) {
        const iso = new Date(row.updated_at).toISOString();
        if (!out.updated_at || iso > out.updated_at) out.updated_at = iso;
      }
    }
    res.json(out);
  });
});

app.put('/api/db/text-snippets/:key', (req, res) => {
  const key = req.params.key;
  if (!isSafeKey(key)) return res.status(400).json({ error: 'bad key' });
  const body = req.body || {};
  const values = body.values && typeof body.values === 'object' ? body.values : null;
  if (!values) return res.status(400).json({ error: 'values must be an object' });

  const entries = Object.entries(values)
    .map(([lang, text]) => ({ lang: String(lang || '').toLowerCase(), text }))
    .filter(({ lang, text }) => lang && typeof text === 'string');

  if (!entries.length) return res.status(400).json({ error: 'no valid updates' });

  withDb(res, async (client) => {
    for (const { lang, text } of entries) {
      await client.query(
        `INSERT INTO text_snippets (key, lang, body, updated_at)
         VALUES ($1,$2,$3, now())
         ON CONFLICT (key, lang) DO UPDATE
         SET body = EXCLUDED.body,
             updated_at = now()`,
        [key, lang, text]
      );
    }
    res.json({ ok: true });
  });
});

// Trigger site build
app.post('/api/build', (_req, res) => {
  exec('npm run build', { cwd: ROOT }, (err, stdout, stderr) => {
    res.json({ ok: !err, stdout, stderr });
  });
});

// Static for admin UI and slide previews
app.use('/slides-assets', express.static(SLIDES_DIR));

// Serve admin UI at /admin path
app.use('/admin', express.static(path.join(__dirname, 'static')));

// Serve the main built site from public directory
app.use(express.static(path.join(ROOT, 'public')));

const PORT = process.env.PORT || 5179;
app.listen(PORT, () => {
  console.log(`Admin running on http://localhost:${PORT}`);
  console.log(`Main site available at http://localhost:${PORT}`);
  console.log(`Admin interface at http://localhost:${PORT}/admin`);
});
