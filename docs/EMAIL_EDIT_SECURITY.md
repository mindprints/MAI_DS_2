# Email-Based Text Editing - Security Guide

## Overview

The email-based text editing feature allows authorized users to edit website content via email. This document explains the security measures in place to prevent unauthorized access.

---

## Security Layers

The system uses **4 layers of security** to ensure only authorized emails can edit content:

### Layer 1: Resend Webhook Signature Verification

**Purpose:** Verify that webhook requests actually come from Resend, not an attacker.

**How it works:**
- Resend signs each webhook request with an HMAC-SHA256 signature
- The signature is sent in the `resend-signature` header
- We verify the signature using a secret webhook key

**Configuration:**
```bash
RESEND_WEBHOOK_SECRET=your_webhook_secret_from_resend
```

**To get your webhook secret:**
1. Go to Resend Dashboard → Webhooks
2. Create or view your webhook
3. Copy the "Signing Secret" or "Webhook Secret"

**What happens if disabled:**
- ⚠️ Warning logged, but webhook still processes
- **Recommendation:** Always enable this in production

---

### Layer 2: Dedicated Edit Email Address

**Purpose:** Ensure emails are sent to a dedicated address, not your public contact email.

**How it works:**
- Only emails sent to `EDIT_EMAIL_ADDRESS` are processed
- Regular contact emails to `info@aimuseum.se` or `contact@aimuseum.se` are ignored
- This prevents accidental processing of normal emails
- **Supports email aliases:** If using Hostinger aliases, emails forwarded to the final mailbox are also accepted

**Configuration:**
```bash
EDIT_EMAIL_ADDRESS=edit@aimuseum.se
EDIT_FINAL_MAILBOX=admin@aimuseum.se  # Optional: final mailbox after alias forwarding
```

**Setup Options:**

**Option A: Direct Email Address (Recommended)**
1. Create a dedicated email address: `edit@aimuseum.se`
2. Configure Resend to forward emails from this address to your webhook
3. **Important:** Do NOT forward emails from your public contact addresses

**Option B: Email Alias (Hostinger)**
1. Create an alias `edit@aimuseum.se` that forwards to `admin@aimuseum.se`
2. Set `EDIT_EMAIL_ADDRESS=edit@aimuseum.se`
3. Set `EDIT_FINAL_MAILBOX=admin@aimuseum.se`
4. Configure Resend to forward emails from `admin@aimuseum.se` to your webhook
5. The system will accept emails sent to either `edit@aimuseum.se` (original) or `admin@aimuseum.se` (after forwarding)

**What happens if not configured:**
- `EDIT_EMAIL_ADDRESS` defaults to `edit@aimuseum.se`
- `EDIT_FINAL_MAILBOX` defaults to `admin@aimuseum.se`
- **Recommendation:** Use a dedicated address like `edit@aimuseum.se` or `content-edit@aimuseum.se`

**Hostinger Alias Handling:**
- When Hostinger forwards an alias email, the "to" field may be rewritten to the final mailbox
- The system checks multiple email headers (`x-original-to`, `envelope-to`, etc.) to detect the original recipient
- If the email is sent to the final mailbox but `EDIT_FINAL_MAILBOX` is configured, it will be accepted

---

### Layer 3: Allowed Sender Email List

**Purpose:** Only allow specific email addresses to send edit requests.

**How it works:**
- Checks the `from` field of incoming emails
- Only processes emails from addresses in the allowed list
- Rejects all other senders

**Configuration:**
```bash
ALLOWED_EDITOR_EMAILS=admin@aimuseum.se,content@aimuseum.se,your-personal@email.com
```

**Format:**
- Comma-separated list of email addresses
- Case-insensitive matching
- Whitespace is trimmed automatically

**What happens if not configured:**
- ❌ **All requests are rejected** (security by default)
- System returns 500 error: "Server configuration error"

**Best Practices:**
- Only include trusted email addresses
- Use organization email addresses when possible
- Avoid personal email addresses unless necessary
- Review and update regularly

---

### Layer 4: Secret Token Verification

**Purpose:** Require a secret token in the email subject or body as an additional authentication factor.

**How it works:**
- Checks if the secret token appears in the email subject OR body
- Case-insensitive matching
- Acts as a "password" that must be included in every edit request

**Configuration:**
```bash
EDIT_SECRET_TOKEN=your-secret-token-here
```

**Example email:**
```
Subject: Edit Request - your-secret-token-here

[page.home.hero.title]
Welcome to the Museum!
```

**What happens if not configured:**
- ⚠️ Warning logged, but token check is skipped
- **Recommendation:** Always use a strong, unique token

**Best Practices:**
- Use a long, random token (at least 32 characters)
- Don't use dictionary words or common phrases
- Store securely (environment variable, not in code)
- Rotate periodically

**Generating a secure token:**
```bash
# Using OpenSSL
openssl rand -hex 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Complete Security Setup

### Step 1: Configure Environment Variables

Add these to your `.env` file or Dokploy environment variables:

```bash
# Required for webhook signature verification
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# Required - dedicated email address for edits
EDIT_EMAIL_ADDRESS=edit@aimuseum.se

# Optional - final mailbox after alias forwarding (for Hostinger aliases)
# If edit@aimuseum.se is an alias forwarding to admin@aimuseum.se, set this:
EDIT_FINAL_MAILBOX=admin@aimuseum.se

# Required - list of allowed sender emails
ALLOWED_EDITOR_EMAILS=admin@aimuseum.se,content@aimuseum.se

# Required - secret token for additional security
EDIT_SECRET_TOKEN=your-long-random-secret-token-here

# Optional - trigger rebuild after edits
TRIGGER_REBUILD=true
```

### Step 2: Configure Resend

1. **Create a dedicated email address:**
   - In Resend Dashboard → Domains
   - Add `edit@aimuseum.se` (or your chosen address)

2. **Set up webhook:**
   - Go to Resend Dashboard → Webhooks
   - Create new webhook
   - URL: `https://your-domain.com/api/webhook/email`
   - Events: Select "Email Received" or "Email Bounced"
   - Copy the webhook secret → set as `RESEND_WEBHOOK_SECRET`

3. **Configure email forwarding:**
   - Set up email forwarding from `edit@aimuseum.se` to trigger the webhook
   - **Important:** Do NOT forward emails from your public contact addresses

### Step 3: Test the Setup

Visit the test endpoint:
```
GET https://your-domain.com/api/webhook/email/test
```

Expected response:
```json
{
  "status": "ready",
  "security": {
    "hasAnthropicKey": true,
    "hasResendKey": true,
    "hasDatabaseUrl": true,
    "hasWebhookSecret": true,
    "hasSecretToken": true,
    "editEmailAddress": "edit@aimuseum.se",
    "allowedEmailsCount": 2,
    "allowedEmailsConfigured": true,
    "secretTokenConfigured": true
  },
  "warnings": []
}
```

If you see warnings, address them before using in production.

---

## How to Send Edit Requests

### Email Format

Send an email to `edit@aimuseum.se` with:

1. **Subject:** Must include your secret token
   ```
   Edit Request - your-secret-token-here
   ```

2. **Body:** Include the edit request
   ```
   [page.home.hero.title]
   Welcome to the Museum of Artificial Intelligence!
   ```

### Example Email

```
To: edit@aimuseum.se
Subject: Website Edit - your-secret-token-here

[page.home.hero.title]
Welcome to the Museum of Artificial Intelligence!

[page.about.intro.text]
We are a museum dedicated to exploring the world of AI.
```

### What Happens

1. ✅ Email arrives at `edit@aimuseum.se`
2. ✅ Resend forwards to webhook with signature
3. ✅ Webhook verifies Resend signature
4. ✅ System checks email is to `edit@aimuseum.se`
5. ✅ System checks sender is in allowed list
6. ✅ System checks token is in subject/body
7. ✅ AI analyzes the edit request
8. ✅ Database is updated
9. ✅ Confirmation email is sent back

---

## Security Best Practices

### ✅ DO:

- Use a dedicated email address for edits (`edit@aimuseum.se`)
- Keep your secret token secure and rotate it periodically
- Only add trusted email addresses to `ALLOWED_EDITOR_EMAILS`
- Enable webhook signature verification in production
- Monitor webhook logs for suspicious activity
- Use strong, unique tokens (32+ characters)
- Test security configuration regularly

### ❌ DON'T:

- Use your public contact email (`info@aimuseum.se`) for edits
- Share your secret token publicly
- Add untrusted email addresses to the allowed list
- Disable webhook signature verification in production
- Use weak tokens (short, dictionary words, etc.)
- Store tokens in code or version control

---

## Troubleshooting

### "Invalid signature" error

**Problem:** Webhook signature verification failing

**Solutions:**
1. Verify `RESEND_WEBHOOK_SECRET` matches Resend dashboard
2. Check webhook URL is correct in Resend
3. Ensure webhook is receiving requests from Resend

### "Email must be sent to dedicated edit address" error

**Problem:** Email was sent to wrong address or alias forwarding issue

**Solutions:**
1. Verify email was sent to `EDIT_EMAIL_ADDRESS` (check `EDIT_EMAIL_ADDRESS` env var)
2. If using Hostinger aliases, set `EDIT_FINAL_MAILBOX` to your final mailbox address
3. Check Resend email forwarding configuration
4. Check webhook logs for actual recipient addresses received
5. Verify Resend is forwarding emails correctly

**For Hostinger Aliases:**
- If `edit@aimuseum.se` is an alias forwarding to `admin@aimuseum.se`:
  - Set `EDIT_EMAIL_ADDRESS=edit@aimuseum.se`
  - Set `EDIT_FINAL_MAILBOX=admin@aimuseum.se`
  - The system will accept emails sent to either address

### "Unauthorized sender" error

**Problem:** Sender email not in allowed list

**Solutions:**
1. Check `ALLOWED_EDITOR_EMAILS` includes your email
2. Verify email address matches exactly (case-insensitive)
3. Check for typos in environment variable

### "Secret token required" error

**Problem:** Token not found in email

**Solutions:**
1. Include token in email subject OR body
2. Verify `EDIT_SECRET_TOKEN` matches what you're using
3. Check for typos in token

---

## Monitoring & Logging

All security checks are logged:

- ✅ Successful verifications: `✅ Resend signature verified`
- ❌ Failed checks: `❌ Invalid Resend webhook signature`
- ⚠️ Missing config: `⚠️ RESEND_WEBHOOK_SECRET not set`

Monitor your logs for:
- Repeated failed authentication attempts
- Unusual sender addresses
- Missing security configurations

---

## Summary

Your email-based editing system is now protected by **4 security layers**:

1. 🔐 **Resend webhook signature** - Verifies requests come from Resend
2. 📧 **Dedicated email address** - Separates edit emails from regular emails
3. ✅ **Allowed sender list** - Only processes emails from trusted addresses
4. 🔑 **Secret token** - Requires token in every edit request

**Regular contact emails to your museum will NOT be processed** because they:
- Are sent to `info@aimuseum.se` (not `edit@aimuseum.se`)
- Don't include the secret token
- May not be from allowed senders

This ensures your normal email channel remains unaffected while providing secure email-based editing for authorized users.

---

**Last Updated:** 2025-01-27

