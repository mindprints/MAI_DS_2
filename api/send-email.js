// /api/send-email.js
// Secure email sending via EmailJS REST API using a private key (server-side only)
// Runtime: Edge
export const config = { runtime: 'edge' };

const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';

// Basic in-memory IP rate limiter (per runtime instance)
// Allows up to LIMIT requests per WINDOW_MS per IP
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const LIMIT = 10; // 10 requests/10 min per IP
const ipToTimestamps = new Map();

function getIp(req) {
  const h = req.headers;
  const fwd = h.get('x-forwarded-for') || '';
  if (fwd) return fwd.split(',')[0].trim();
  return (
    h.get('cf-connecting-ip') ||
    h.get('x-real-ip') ||
    h.get('forwarded') ||
    'unknown'
  );
}

function rateLimit(ip) {
  const now = Date.now();
  const arr = ipToTimestamps.get(ip) || [];
  // purge old
  const recent = arr.filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  ipToTimestamps.set(ip, recent);
  return recent.length <= LIMIT;
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}

function getAllowedOrigins() {
  const raw = (process.env.ALLOWED_ORIGINS || '').trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function originFromHeaders(req) {
  const origin = req.headers.get('origin');
  if (origin) return origin;
  const ref = req.headers.get('referer') || '';
  try {
    return ref ? new URL(ref).origin : '';
  } catch {
    return '';
  }
}

function isOriginAllowed(req) {
  const allowed = getAllowedOrigins();
  if (allowed.length === 0) return true; // allow all if not configured
  const origin = originFromHeaders(req);
  return origin && allowed.includes(origin);
}

function buildCorsHeaders(req) {
  const origin = originFromHeaders(req);
  const allowed = getAllowedOrigins();
  const allow = allowed.length === 0 || (origin && allowed.includes(origin));
  return allow
    ? {
        'access-control-allow-origin': origin || '*',
        'vary': 'origin',
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

export default async function handler(req) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
        ...buildCorsHeaders(req),
      },
    });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, buildCorsHeaders(req));
  }

  if (!isOriginAllowed(req)) {
    return json({ error: 'Origin not allowed' }, 403, buildCorsHeaders(req));
  }

  const ip = getIp(req);
  if (!rateLimit(ip)) {
    return json({ error: 'Too many requests' }, 429, buildCorsHeaders(req));
  }

  const reqId = Math.random().toString(36).slice(2);

  try {
    const body = await req.json().catch(() => ({}));
    const { kind, name, email, profession, message, reply_to, from_name, from_email, hp } = body || {};

    // Honeypot trap
    if (hp) {
      return json({ ok: true }, 200, buildCorsHeaders(req));
    }

    const serviceId = process.env.EMAILJS_SERVICE_ID;
    const privateKey = process.env.EMAILJS_PRIVATE_KEY; // used in Authorization header
    const templateId = pickTemplate(kind);

    if (!serviceId || !privateKey || !templateId) {
      return json({ error: 'Server not configured' }, 500, buildCorsHeaders(req));
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
      return json({ error: 'Missing required fields' }, 400, buildCorsHeaders(req));
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
      template_params: templateParams,
    };

    const resp = await fetch(EMAILJS_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${privateKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      console.error('Email send failed', { status: resp.status, text, reqId });
      return json({ error: 'Failed to send' }, 502, buildCorsHeaders(req));
    }

    return json({ ok: true, id: reqId }, 200, buildCorsHeaders(req));
  } catch (err) {
    console.error('Email endpoint error', { error: err?.message, reqId });
    return json({ error: 'Unexpected error' }, 500, buildCorsHeaders(req));
  }
}


