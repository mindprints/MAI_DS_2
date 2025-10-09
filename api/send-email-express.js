// Express-compatible email handler for Dokploy and Node.js environments
// This is the Node.js version that works with Express middleware

const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';

// Basic in-memory IP rate limiter (per runtime instance)
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const LIMIT = 10; // 10 requests/10 min per IP
const ipToTimestamps = new Map();

function getIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return (
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    req.headers['forwarded'] ||
    req.ip ||
    req.connection?.remoteAddress ||
    'unknown'
  );
}

function rateLimit(ip) {
  const now = Date.now();
  const arr = ipToTimestamps.get(ip) || [];
  const recent = arr.filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  ipToTimestamps.set(ip, recent);
  return recent.length <= LIMIT;
}

function getAllowedOrigins() {
  const raw = (process.env.ALLOWED_ORIGINS || '').trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getOrigin(req) {
  const origin = req.headers['origin'] || req.headers['referer'];
  if (!origin) return '';
  try {
    return new URL(origin).origin;
  } catch {
    return origin;
  }
}

function isOriginAllowed(req) {
  const allowed = getAllowedOrigins();
  if (allowed.length === 0) return true; // allow all if not configured
  const origin = getOrigin(req);
  return origin && allowed.includes(origin);
}

function buildCorsHeaders(req) {
  const origin = getOrigin(req);
  const allowed = getAllowedOrigins();
  const allow = allowed.length === 0 || (origin && allowed.includes(origin));
  return allow
    ? {
        'Access-Control-Allow-Origin': origin || '*',
        'Vary': 'origin',
      }
    : {};
}

function sanitize(input) {
  if (typeof input !== 'string') return '';
  return input.slice(0, 5000); // cap length to avoid abuse
}

function pickTemplate(kind) {
  switch (kind) {
    case 'membership':
      // reuse contact template for membership messages by composing message
      return process.env.EMAILJS_TEMPLATE_CONTACT;
    case 'contact':
      return process.env.EMAILJS_TEMPLATE_CONTACT;
    case 'workshop':
      return process.env.EMAILJS_TEMPLATE_WORKSHOP;
    default:
      return undefined;
  }
}

async function handleSendEmail(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).set({
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      ...buildCorsHeaders(req),
    }).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).set(buildCorsHeaders(req)).json({ error: 'Method not allowed' });
  }

  if (!isOriginAllowed(req)) {
    return res.status(403).set(buildCorsHeaders(req)).json({ error: 'Origin not allowed' });
  }

  const ip = getIp(req);
  if (!rateLimit(ip)) {
    return res.status(429).set(buildCorsHeaders(req)).json({ error: 'Too many requests' });
  }

  const reqId = Math.random().toString(36).slice(2);

  try {
    const { kind, name, email, profession, message, reply_to, from_name, from_email, hp } = req.body || {};

    // Honeypot trap
    if (hp) {
      return res.status(200).set(buildCorsHeaders(req)).json({ ok: true });
    }

    const serviceId = process.env.EMAILJS_SERVICE_ID;
    const privateKey = process.env.EMAILJS_PRIVATE_KEY;
    const publicKey = process.env.EMAILJS_PUBLIC_KEY;
    const templateId = pickTemplate(kind);

    if (!serviceId || !privateKey || !publicKey || !templateId) {
      console.error('Email configuration missing:', {
        hasServiceId: !!serviceId,
        hasPrivateKey: !!privateKey,
        hasPublicKey: !!publicKey,
        hasTemplateId: !!templateId,
        kind
      });
      return res.status(500).set(buildCorsHeaders(req)).json({ error: 'Server not configured' });
    }

    // Compose message if not provided (e.g., membership)
    const safeName = sanitize(name);
    const safeEmail = sanitize(email);
    const safeProfession = sanitize(profession);
    let safeMessage = sanitize(message);

    if (!safeMessage && kind === 'membership') {
      safeMessage = [
        'Membership application',
        '',
        `Name: ${safeName || '—'}`,
        `Email: ${safeEmail || '—'}`,
        `Profession: ${safeProfession || '—'}`,
      ].join('\n');
    }

    if (!safeName || !safeEmail) {
      return res.status(400).set(buildCorsHeaders(req)).json({ error: 'Missing required fields' });
    }

    const templateParams = {
      name: safeName,
      email: safeEmail,
      profession: safeProfession,
      message: safeMessage,
      reply_to: sanitize(reply_to) || safeEmail,
      from_name: sanitize(from_name) || 'MAI Website',
      from_email: sanitize(from_email) || 'info@aimuseum.se',
      _request_id: reqId,
      _ip: ip,
    };

    const payload = {
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: templateParams,
    };

    // Forward origin to EmailJS
    const origin = getOrigin(req) || getAllowedOrigins()[0] || 'http://localhost:3000';

    // Use native fetch (available in Node.js 18+) or require node-fetch for older versions
    const fetchImpl = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
    
    const resp = await fetchImpl(EMAILJS_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${privateKey}`,
        'origin': origin,
        'referer': origin,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      console.error('Email send failed', { 
        status: resp.status, 
        statusText: resp.statusText,
        text, 
        reqId,
        serviceId,
        templateId: templateId ? 'present' : 'missing'
      });
      return res.status(502).set(buildCorsHeaders(req)).json({ error: 'Failed to send' });
    }

    console.log('Email sent successfully', { reqId, kind, to: safeEmail });
    return res.status(200).set(buildCorsHeaders(req)).json({ ok: true, id: reqId });
  } catch (err) {
    console.error('Email endpoint error', { error: err?.message, stack: err?.stack, reqId });
    return res.status(500).set(buildCorsHeaders(req)).json({ error: 'Unexpected error' });
  }
}

module.exports = { handleSendEmail };

