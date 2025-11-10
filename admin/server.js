require('dotenv').config();
const express = require('express');
const basicAuth = require('express-basic-auth');
const path = require('path');
const fsp = require('fs/promises');
const { exec } = require('child_process');
const crypto = require('crypto');
const { Pool } = require('pg');
const { getTextSegments, applyTextUpdates } = require('./dom');
const { handleSendEmail } = require('../api/send-email-express');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'src', 'content', 'pages');
const SITE_DIR = path.join(ROOT, 'src', 'site');
const SLIDES_DIR = path.join(SITE_DIR, 'images', 'slide');
const SLIDES_MANIFEST = path.join(SLIDES_DIR, 'slides.json');
const ENCYC_DIR = path.join(ROOT, 'src', 'content', 'encyclopedia');
const EVENTS_DIR_EN = path.join(SITE_DIR, 'pages', 'events');
const EVENTS_DIR_SV = path.join(SITE_DIR, 'sv', 'pages', 'events');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Set Content Security Policy to allow external resources
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; " +
    "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; " +
    "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self'; " +
    "frame-src 'none';"
  );
  next();
});

// Serve the main built site from public directory FIRST
// This must come before API routes to avoid conflicts
app.use(express.static(path.join(ROOT, 'public'), {
  setHeaders: (res, filePath) => {
    // Set correct MIME types for CSS files
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
    // Set correct MIME types for JS files
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
    // Set correct MIME types for HTML files
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
  },
  // Ensure proper MIME type detection
  dotfiles: 'ignore',
  index: ['index.html']
}));

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

// Email sending endpoint (handles contact forms, workshop requests, membership)
app.post('/api/send-email', handleSendEmail);
app.options('/api/send-email', handleSendEmail);

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

// Events: list available slugs
app.get('/api/events', async (_req, res) => {
  try {
    const files = await fsp.readdir(EVENTS_DIR_EN);
    const slugs = files
      .filter((f) => f.endsWith('.html'))
      .map((f) => f.replace('.html', ''))
      .sort();
    res.json({ slugs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Events: get text-only segments
app.get('/api/event-segments/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const locale = (req.query.locale || 'en').toString();
    if (!isSafeSlug(slug)) return res.status(400).json({ error: 'bad slug' });
    assertLocale(locale);
    const file = locale === 'sv' 
      ? path.join(EVENTS_DIR_SV, `${slug}.html`)
      : path.join(EVENTS_DIR_EN, `${slug}.html`);
    const html = await fsp.readFile(file, 'utf8');
    const segments = getTextSegments(html);
    res.json({ slug, locale, file, segments });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Events: save text-only segments
app.put('/api/event-segments/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const locale = (req.query.locale || 'en').toString();
    if (!isSafeSlug(slug)) return res.status(400).json({ error: 'bad slug' });
    assertLocale(locale);
    const file = locale === 'sv' 
      ? path.join(EVENTS_DIR_SV, `${slug}.html`)
      : path.join(EVENTS_DIR_EN, `${slug}.html`);
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

// Email editing via Resend webhook - requires @anthropic-ai/sdk package
let Anthropic;
let anthropic;
try {
  Anthropic = require('@anthropic-ai/sdk');
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  console.log('✅ Anthropic SDK loaded - email editing enabled');
} catch (error) {
  console.warn('⚠️ @anthropic-ai/sdk not installed - email editing disabled');
  console.warn('   Install with: npm install @anthropic-ai/sdk');
}

// Email webhook endpoint - SECURITY: This endpoint requires multiple layers of authentication
// Use express.raw() middleware BEFORE express.json() to get raw body for signature verification
app.post('/api/webhook/email', express.raw({ type: 'application/json', limit: '10mb' }), async (req, res) => {
  try {
    // Check if Anthropic SDK is available
    if (!anthropic) {
      console.error('❌ Anthropic SDK not available - email editing disabled');
      return res.status(503).json({ error: 'Email editing service not available' });
    }
    
    console.log('📨 Received email webhook');
    
    // Get raw body for signature verification (Buffer)
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    
    // SECURITY LAYER 1: Verify Resend webhook signature
    const resendSignature = req.headers['resend-signature'] || req.headers['svix-signature'];
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    const testMode = process.env.WEBHOOK_TEST_MODE === 'true';
    
    if (testMode) {
      console.warn('⚠️ WEBHOOK_TEST_MODE enabled - signature verification bypassed');
    } else if (webhookSecret && resendSignature) {
      const isValid = verifyResendSignature(rawBody, resendSignature, webhookSecret);
      if (!isValid) {
        console.error('❌ Invalid Resend webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
      console.log('✅ Resend signature verified');
    } else if (webhookSecret) {
      console.warn('⚠️ RESEND_WEBHOOK_SECRET set but no signature header - rejecting');
      console.warn('   Set WEBHOOK_TEST_MODE=true to bypass signature for testing');
      return res.status(401).json({ error: 'Missing signature' });
    } else {
      console.warn('⚠️ RESEND_WEBHOOK_SECRET not set - webhook signature verification disabled');
    }
    
    // Parse JSON body - handle both Buffer and already-parsed object
    let body;
    if (Buffer.isBuffer(req.body)) {
      body = JSON.parse(req.body.toString());
    } else if (typeof req.body === 'object') {
      body = req.body;
    } else {
      body = JSON.parse(String(req.body));
    }
    
    // Handle Resend's email.received event format
    let from, to, subject, html, text, headers;
    
    if (body.type === 'email.received') {
      // Resend email.received event format
      console.log('📧 Processing email.received event');
      const data = body.data || body;
      from = data.from || data.sender;
      to = data.to || data.recipients || [data.recipient];
      subject = data.subject;
      html = data.html;
      text = data.text || data.body;
      headers = data.headers || {};
    } else {
      // Fallback to direct email data format
      from = body.from;
      to = body.to;
      subject = body.subject;
      html = body.html;
      text = body.text;
      headers = body.headers || {};
    }
    
    console.log('From:', from);
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Headers:', headers ? Object.keys(headers).join(', ') : 'none');
    console.log('Body length:', text ? text.length : 0, 'chars, HTML length:', html ? html.length : 0, 'chars');
    
    // Validate email has content
    if (!text && !html) {
      console.warn('⚠️ Email has no body content (text or HTML)');
      return res.status(400).json({ error: 'Email body is empty' });
    }
    
    // SECURITY LAYER 2: Verify email is sent to dedicated edit address
    // Hostinger setup: All aliases (including edit@aimuseum.se) funnel through admin@aimuseum.se
    const editEmailAddress = process.env.EDIT_EMAIL_ADDRESS || 'edit@aimuseum.se';
    const finalMailbox = process.env.EDIT_FINAL_MAILBOX || 'admin@aimuseum.se'; // All Hostinger aliases forward here
    
    // Extract recipient from various possible fields
    // Handle both string and object formats
    let recipientEmail;
    if (Array.isArray(to)) {
      recipientEmail = typeof to[0] === 'string' ? to[0] : (to[0]?.email || to[0]?.address);
    } else if (typeof to === 'string') {
      recipientEmail = to;
    } else {
      recipientEmail = to?.email || to?.address || to;
    }
    
    // Check headers for original recipient (Hostinger preserves original "to" in headers)
    const originalTo = headers?.['x-original-to'] || headers?.['envelope-to'] || headers?.['x-envelope-to'] || headers?.['x-forwarded-to'];
    const toHeader = headers?.['to'];
    
    // Collect all possible recipient addresses
    const allRecipients = [
      recipientEmail,
      originalTo,
      toHeader,
      headers?.['x-forwarded-for'],
      headers?.['delivered-to']
    ].filter(Boolean).map(e => {
      // Extract email from "Name <email@domain.com>" format
      const emailMatch = String(e).match(/<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/);
      return emailMatch ? emailMatch[1].toLowerCase() : String(e).toLowerCase();
    });
    
    // Normalize email addresses for comparison
    const editEmailLower = editEmailAddress.toLowerCase();
    const finalMailboxLower = finalMailbox.toLowerCase();
    
    // Check if email was originally sent to edit address OR arrived at final mailbox
    // Since Hostinger funnels all aliases to admin@aimuseum.se, we check headers for original recipient
    const isEditAddress = allRecipients.some(r => r.includes(editEmailLower));
    const isFinalMailbox = allRecipients.some(r => r.includes(finalMailboxLower));
    
    // Allow if:
    // 1. Original recipient was edit@aimuseum.se (check headers), OR
    // 2. Email arrived at admin@aimuseum.se AND we're expecting alias forwarding
    const isValidRecipient = isEditAddress || (isFinalMailbox && editEmailLower !== finalMailboxLower);
    
    if (!isValidRecipient) {
      console.log('❌ Email not sent to edit address or final mailbox');
      console.log('  Recipients found:', allRecipients);
      console.log('  Expected edit address:', editEmailLower);
      console.log('  Expected final mailbox:', finalMailboxLower);
      console.log('  Raw "to" field:', to);
      console.log('  Headers:', JSON.stringify(headers, null, 2));
      return res.status(403).json({ error: 'Email must be sent to dedicated edit address' });
    }
    
    if (isEditAddress) {
      console.log('✅ Email sent to edit address (original recipient):', editEmailLower);
    } else if (isFinalMailbox) {
      console.log('✅ Email sent to final mailbox (Hostinger alias forwarding):', finalMailboxLower);
      console.log('  Original recipients in headers:', allRecipients.filter(r => r.includes(editEmailLower)));
    }
    
    // SECURITY LAYER 3: Check if sender is in allowed list
    const allowedEmails = (process.env.ALLOWED_EDITOR_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const senderEmail = (from?.email || from?.address || from || '').toLowerCase();
    
    if (!allowedEmails.length) {
      console.error('❌ ALLOWED_EDITOR_EMAILS not configured - rejecting all requests');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    if (!allowedEmails.includes(senderEmail)) {
      console.log('❌ Unauthorized sender:', senderEmail, 'Allowed:', allowedEmails);
      return res.status(403).json({ error: 'Unauthorized sender' });
    }
    console.log('✅ Sender authorized:', senderEmail);
    
    // SECURITY LAYER 4: Require secret token in subject or body
    const requiredToken = process.env.EDIT_SECRET_TOKEN;
    const emailBody = text || stripHtml(html);
    const subjectLower = (subject || '').toLowerCase();
    const bodyLower = emailBody.toLowerCase();
    
    if (requiredToken) {
      const tokenInSubject = subjectLower.includes(requiredToken.toLowerCase());
      const tokenInBody = bodyLower.includes(requiredToken.toLowerCase());
      
      if (!tokenInSubject && !tokenInBody) {
        console.log('❌ Secret token not found in email');
        return res.status(403).json({ error: 'Secret token required' });
      }
      console.log('✅ Secret token verified');
    } else {
      console.warn('⚠️ EDIT_SECRET_TOKEN not set - token verification disabled');
    }
    
    // Extract the edit request from email body
    const editRequest = extractEditRequest(emailBody);
    
    if (!editRequest) {
      console.log('❌ Could not parse edit request');
      return res.status(400).json({ error: 'Invalid format' });
    }
    
    console.log('📝 Edit request:', editRequest);
    
    // Use AI to understand what to edit
    const analysisResult = await analyzeEditWithAI(editRequest);
    
    console.log('🤖 AI Analysis:', analysisResult);
    
    // Apply the edit to database
    await applyEdit(analysisResult);
    
    // Trigger rebuild if needed
    if (process.env.TRIGGER_REBUILD === 'true') {
      console.log('🔄 Triggering rebuild...');
      // Add your rebuild logic here (e.g., webhook to trigger npm run build)
    }
    
    // Send confirmation email back
    await sendConfirmationEmail(senderEmail, analysisResult);
    
    res.json({ success: true, message: 'Edit applied' });
    
  } catch (error) {
    console.error('❌ Error processing email:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify Resend webhook signature
function verifyResendSignature(payload, signature, secret) {
  try {
    // Resend uses HMAC-SHA256 for webhook signatures
    // Format: timestamp,hash
    const [timestamp, hash] = signature.split(',');
    
    if (!timestamp || !hash) {
      return false;
    }
    
    // Create expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(timestamp + '.' + payload.toString())
      .digest('hex');
    
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

// Helper: Strip HTML tags to get plain text
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Helper: Extract edit request from email
function extractEditRequest(emailBody) {
  // Look for [key] markers like: [page.home.hero.title]
  const sectionMatch = emailBody.match(/\[([^\]]+)\]/);
  
  if (sectionMatch) {
    const key = sectionMatch[1];
    // Extract content between [key] and [/key] or end of message
    const contentMatch = emailBody.match(/\[([^\]]+)\]\s*([\s\S]*?)\s*(?:\[\/\1\]|$)/);
    
    if (contentMatch) {
      return {
        key: contentMatch[1],
        newContent: contentMatch[2].trim(),
        rawEmail: emailBody
      };
    }
  }
  
  // Fallback: treat entire email as natural language request
  return {
    key: null,
    newContent: null,
    rawEmail: emailBody
  };
}

// Fetch current content from database
async function fetchCurrentContent() {
  if (!pgPool) {
    throw new Error('Database not configured');
  }
  const client = await pgPool.connect();
  try {
    const result = await client.query(
      'SELECT key, lang, body FROM text_snippets ORDER BY key, lang'
    );
    return result.rows;
  } finally {
    client.release();
  }
}

// AI analysis function
async function analyzeEditWithAI(editRequest) {
  const { key, newContent, rawEmail } = editRequest;
  
  // Fetch current content from database
  const currentContent = await fetchCurrentContent();
  
  // Format current content for AI
  const contentSummary = currentContent.slice(0, 50).map(row => 
    `${row.key} (${row.lang}): "${row.body.substring(0, 60)}..."`
  ).join('\n');
  
  const prompt = `You are helping update the Museum of Artificial Intelligence website content.

Current database content (showing first 50 entries):
${contentSummary}

User's edit request from email:
${rawEmail}

${key ? `User specified key: ${key}` : 'No key provided - you need to identify which key to edit'}
${newContent ? `New content provided:\n${newContent}` : 'User gave instructions - you need to determine what changes to make'}

The database uses this schema:
- Table: text_snippets
- Columns: key (TEXT), lang (TEXT), body (TEXT)
- Example keys: "page.home.hero.title", "page.about.intro.text"
- Languages: "en" (English) or "sv" (Swedish)

Analyze this request and return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "key": "the database key (e.g., 'page.home.hero.title')",
  "lang": "language code ('en' or 'sv')",
  "newContent": "the exact text to update to",
  "confidence": 0.95,
  "reasoning": "brief explanation of your analysis"
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });
  
  const responseText = message.content[0].text;
  console.log('🤖 AI Raw Response:', responseText);
  
  // Extract JSON from response (handle markdown code blocks)
  let jsonText = responseText;
  const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1];
  }
  
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI did not return valid JSON');
  }
  
  return JSON.parse(jsonMatch[0]);
}

// Apply edit to database
async function applyEdit(analysis) {
  if (!pgPool) {
    throw new Error('Database not configured');
  }
  
  const { key, lang, newContent } = analysis;
  const client = await pgPool.connect();
  
  try {
    // Check if entry exists
    const existingResult = await client.query(
      'SELECT body FROM text_snippets WHERE key = $1 AND lang = $2',
      [key, lang]
    );
    
    if (existingResult.rows.length > 0) {
      // Update existing entry
      await client.query(
        'UPDATE text_snippets SET body = $1, updated_at = NOW() WHERE key = $2 AND lang = $3',
        [newContent, key, lang]
      );
      console.log('✅ Updated existing entry:', key, lang);
    } else {
      // Insert new entry
      await client.query(
        'INSERT INTO text_snippets (key, lang, body, updated_at) VALUES ($1, $2, $3, NOW())',
        [key, lang, newContent]
      );
      console.log('✅ Inserted new entry:', key, lang);
    }
  } finally {
    client.release();
  }
}

// Send confirmation email via Resend
async function sendConfirmationEmail(recipientEmail, analysis) {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    console.warn('⚠️ RESEND_API_KEY not set, skipping confirmation email');
    return;
  }
  
  // Get your Resend email from env or use default
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'edit@resend.dev';
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: recipientEmail,
      subject: '✅ Edit Applied - aimuseum.se',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">✅ Your edit has been applied!</h2>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Key:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 3px;">${analysis.key}</code></p>
            <p><strong>Language:</strong> ${analysis.lang === 'en' ? '🇬🇧 English' : '🇸🇪 Swedish'}</p>
            <p><strong>AI Confidence:</strong> ${(analysis.confidence * 100).toFixed(0)}%</p>
          </div>
          
          <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>New content:</strong></p>
            <p style="margin: 0; font-style: italic;">${analysis.newContent}</p>
          </div>
          
          <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #1e40af;">
              <strong>AI Reasoning:</strong> ${analysis.reasoning}
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 14px; color: #6b7280;">
            If this edit is incorrect, please contact the administrator or make a new edit request.
          </p>
          
          <p style="font-size: 12px; color: #9ca3af;">
            Sent from Museum of Artificial Intelligence Content Management System
          </p>
        </div>
      `
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Failed to send confirmation email:', errorText);
  } else {
    console.log('📧 Confirmation email sent to:', recipientEmail);
  }
}

// Optional: Add a test endpoint to verify setup
app.get('/api/webhook/email/test', (req, res) => {
  const allowedEmails = (process.env.ALLOWED_EDITOR_EMAILS || '').split(',').map(e => e.trim());
  const editEmailAddress = process.env.EDIT_EMAIL_ADDRESS || 'edit@aimuseum.se';
  const finalMailbox = process.env.EDIT_FINAL_MAILBOX || 'admin@aimuseum.se';
  const hasSecretToken = !!process.env.EDIT_SECRET_TOKEN;
  const hasWebhookSecret = !!process.env.RESEND_WEBHOOK_SECRET;
  
  res.json({
    status: 'ready',
    security: {
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasWebhookSecret,
      hasSecretToken,
      editEmailAddress,
      finalMailbox,
      usingAlias: editEmailAddress.toLowerCase() !== finalMailbox.toLowerCase(),
      allowedEmailsCount: allowedEmails.length,
      // Don't expose actual emails or tokens in test endpoint
      allowedEmailsConfigured: allowedEmails.length > 0,
      secretTokenConfigured: hasSecretToken
    },
    warnings: [
      !hasWebhookSecret && '⚠️ RESEND_WEBHOOK_SECRET not set - webhook signature verification disabled',
      !hasSecretToken && '⚠️ EDIT_SECRET_TOKEN not set - token verification disabled',
      allowedEmails.length === 0 && '⚠️ ALLOWED_EDITOR_EMAILS not configured',
      !editEmailAddress && '⚠️ EDIT_EMAIL_ADDRESS not configured',
      editEmailAddress.toLowerCase() === finalMailbox.toLowerCase() && 'ℹ️ EDIT_EMAIL_ADDRESS and EDIT_FINAL_MAILBOX are the same - no alias forwarding detected'
    ].filter(Boolean)
  });
});

// Static for admin UI and slide previews
app.use('/slides-assets', express.static(SLIDES_DIR));

// Protect admin UI with basic authentication
app.use('/admin', basicAuth({
  users: { 'admin': process.env.ADMIN_PASSWORD || 'changeme' },
  challenge: true,
  realm: 'MAI Admin Area'
}));

// Serve admin UI at /admin path
app.use('/admin', express.static(path.join(__dirname, 'static')));

// Fallback route for missing static files - serve index.html for SPA-like behavior
app.get('*', (req, res) => {
  // Only handle requests that don't start with /api/ or /admin/
  if (!req.path.startsWith('/api/') && !req.path.startsWith('/admin/')) {
    const indexPath = path.join(ROOT, 'public', 'index.html');
    if (require('fs').existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Page not found');
    }
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

const PORT = process.env.PORT || 5179;
app.listen(PORT, () => {
  console.log(`Admin running on http://localhost:${PORT}`);
  console.log(`Main site available at http://localhost:${PORT}`);
  console.log(`Admin interface at http://localhost:${PORT}/admin`);
});