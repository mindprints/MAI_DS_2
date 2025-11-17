require('dotenv').config();
const express = require('express');
const basicAuth = require('express-basic-auth');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');
const { Pool } = require('pg');
const { handleSendEmail } = require('../api/send-email-express');
const mailpox = require('../mailpox/core');
const mailpoxAdapter = require('../mailpox/adapter-aimuseum');

const ROOT = path.resolve(__dirname, '..');

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

process.on('SIGINT', async () => {
  if (pgPool) await pgPool.end().catch(() => { });
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (pgPool) await pgPool.end().catch(() => { });
  process.exit(0);
});

// Email sending endpoint (handles contact forms, workshop requests, membership)
app.post('/api/send-email', handleSendEmail);
app.options('/api/send-email', handleSendEmail);

// Mailpox content endpoint
app.get('/api/mailpox/content', async (req, res) => {
  try {
    const content = await mailpoxAdapter.fetchAllContent(pgPool);
    res.json(content);
  } catch (error) {
    console.error('❌ Error fetching Mailpox content:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mailpox simulator endpoint
app.post('/api/mailpox/simulate', async (req, res) => {
  try {
    const { content, emailBody } = req.body;
    const analysisResult = await mailpox.processEdit(content, emailBody);
    res.json(analysisResult);
  } catch (error) {
    console.error('❌ Error in Mailpox simulation:', error);
    res.status(500).json({ error: error.message });
  }
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

    // Skip non-email.received events early
    if (body.type && body.type !== 'email.received') {
      console.log('⏭️ Skipping non-email.received event:', body.type);
      return res.status(200).json({ message: 'Event type not processed' });
    }

    if (body.type === 'email.received') {
      // Resend email.received event format - webhook only contains metadata, not body
      console.log('📧 Processing email.received event');

      const data = body.data || body;
      const emailId = data.email_id || data.id || body.email_id;

      // Extract metadata from webhook
      from = data.from || data.sender || body.from;
      to = data.to || data.recipients || [data.recipient] || body.to;
      subject = data.subject || body.subject;
      headers = data.headers || body.headers || {};

      // Resend webhook doesn't include body - need to fetch it via API
      if (emailId) {
        console.log('📥 Fetching email content from Resend API, email_id:', emailId);
        try {
          const resendApiKey = process.env.RESEND_API_KEY;
          if (!resendApiKey) {
            throw new Error('RESEND_API_KEY not configured');
          }

          // Fetch full email content from Resend API
          const emailResponse = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            }
          });

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            throw new Error(`Resend API error: ${emailResponse.status} - ${errorText}`);
          }

          const emailData = await emailResponse.json();
          console.log('✅ Email content fetched from Resend API');

          // Extract body content from API response
          html = emailData.html || emailData.htmlBody;
          text = emailData.text || emailData.textBody || emailData.body;

          // Update metadata if API provides more complete info
          if (!from && emailData.from) from = emailData.from;
          if (!to && emailData.to) to = emailData.to;
          if (!subject && emailData.subject) subject = emailData.subject;
          if (emailData.headers) headers = { ...headers, ...emailData.headers };

        } catch (error) {
          console.error('❌ Failed to fetch email content from Resend API:', error.message);
          // Continue with metadata only - might still be able to process
        }
      } else {
        console.warn('⚠️ No email_id found in webhook event - cannot fetch email body');
        console.log('📦 Event structure:', JSON.stringify(body, null, 2).substring(0, 500));
      }
    } else {
      // Fallback to direct email data format (if Resend sends full content)
      console.log('📧 Processing direct email data format');
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
      console.warn('⚠️ Email has no body content (text or HTML) - skipping');
      console.log('📦 Event type:', body.type || 'unknown');
      return res.status(200).json({ message: 'Email has no body content, skipping' });
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

    // Fetch all content from the database
    const allContent = await mailpoxAdapter.fetchAllContent(pgPool);

    // Use Mailpox to process the edit
    const analysisResult = await mailpox.processEdit(allContent, emailBody);

    console.log('🤖 Mailpox Analysis:', analysisResult);

    // Apply the edits to the database
    for (const change of analysisResult.changes) {
      if (change.matchFound && change.confidence >= 0.7) {
        await mailpoxAdapter.applyEdit(pgPool, change);
      }
    }

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

// Protect admin UI with basic authentication
app.use('/admin', basicAuth({
  users: { 'admin': process.env.ADMIN_PASSWORD || 'changeme' },
  challenge: true,
  realm: 'MAI Admin Area'
}));

// Serve admin UI at /admin path
app.use('/admin', express.static(path.join(__dirname, 'static')));

// Fallback route for missing static files
app.get('*', (req, res) => {
  const isApiOrAdmin = req.path.startsWith('/api/') || req.path.startsWith('/admin/');
  if (isApiOrAdmin) {
    // API/admin routes should have been handled already; if not, it's a 404
    return res.status(404).json({ error: 'Not found' });
  }

  // Check if the path looks like a direct file request (e.g., /about.html, /style.css)
  const hasFileExtension = path.extname(req.path).length > 0;

  if (hasFileExtension) {
    // If it's a file request that wasn't caught by express.static, it's a definitive 404.
    // This prevents the SPA fallback from serving index.html for missing assets.
    return res.status(404).send(`File not found: ${req.path}`);
  }

  // For paths without extensions (e.g., /about, /contact), serve index.html.
  // This supports client-side routing for a potential SPA structure.
  const indexPath = path.join(ROOT, 'public', 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // This case is unlikely if the build is successful, but it's a good fallback.
    res.status(404).send('Page not found and index.html is missing.');
  }
});

const PORT = process.env.PORT || 5179;
app.listen(PORT, () => {
  console.log(`Admin running on http://localhost:${PORT}`);
  console.log(`Main site available at http://localhost:${PORT}`);
  console.log(`Admin interface at http://localhost:${PORT}/admin`);
});
