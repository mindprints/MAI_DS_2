# EmailJS Dokploy Fix

**Date:** October 9, 2025  
**Issue:** EmailJS working on Vercel but failing on Dokploy

## Problem Analysis

The issue was caused by the incompatibility between Vercel's Edge Runtime and Dokploy's standard Node.js Express environment.

### Root Cause

1. **Vercel Implementation** (`api/send-email.js`):
   - Uses Vercel's Edge Runtime: `export const config = { runtime: 'edge' };`
   - Automatically exposes files in `/api` directory as serverless functions
   - Uses Fetch API `Request`/`Response` objects
   - Works perfectly on Vercel

2. **Dokploy Environment**:
   - Runs standard Node.js with Express.js
   - No automatic API route exposure
   - Uses Express `req`/`res` objects
   - The Edge Runtime code doesn't work in this environment

3. **Missing Route**:
   - `admin/server.js` had no route handler for `/api/send-email`
   - Client-side forms were calling `/api/send-email` which returned 404 or error

## Solution Implemented

### 1. Created Express-Compatible Handler

**File:** `api/send-email-express.js`

- Node.js/Express compatible version of the email handler
- Uses CommonJS (`module.exports`)
- Works with Express middleware
- Handles CORS, rate limiting, and EmailJS API calls
- Identical functionality to the Edge version

### 2. Added Route to Express Server

**Modified:** `admin/server.js`

```javascript
const { handleSendEmail } = require('../api/send-email-express');

// Email sending endpoint
app.post('/api/send-email', handleSendEmail);
app.options('/api/send-email', handleSendEmail);
```

### 3. Updated Documentation

**Modified files:**
- `README.md` - Added `EMAILJS_PUBLIC_KEY` to environment variables
- `config/env.example` - Added public key example
- `setup-env.js` - Already had public key (good!)

## Environment Variables Required

Make sure ALL of these are set in your Dokploy environment:

```bash
EMAILJS_SERVICE_ID=service_zxk9avv
EMAILJS_PRIVATE_KEY=LXeCbKLzjDw8PbspmoQFz
EMAILJS_PUBLIC_KEY=Z3nM5X7zfy1eF1Rzc
EMAILJS_TEMPLATE_CONTACT=template_o3hvd4c
EMAILJS_TEMPLATE_WORKSHOP=template_0wzjtk7
ALLOWED_ORIGINS=https://app.aimuseum.site,https://aimuseum.se,https://www.aimuseum.se
```

### Missing Variable Check

Based on the screenshot provided, the Dokploy environment **already has** all the necessary EmailJS variables set. However, ensure that:

1. `EMAILJS_PUBLIC_KEY` is present (appears to be in the screenshot)
2. `ALLOWED_ORIGINS` includes your Dokploy domain: `https://app.aimuseum.site`

## Deployment Instructions

### For Dokploy

1. **Commit and Push Changes:**
   ```bash
   git add api/send-email-express.js admin/server.js
   git commit -m "fix: Add Express-compatible EmailJS handler for Dokploy"
   git push origin main
   ```

2. **Dokploy will auto-deploy** from the GitHub webhook

3. **Verify Environment Variables** in Dokploy dashboard:
   - Navigate to your project
   - Click "Environment Variables"
   - Ensure all EmailJS variables are present
   - Especially check `EMAILJS_PUBLIC_KEY`

4. **Test the endpoint:**
   ```bash
   curl -X POST https://app.aimuseum.site/api/send-email \
     -H "Content-Type: application/json" \
     -H "Origin: https://app.aimuseum.site" \
     -d '{
       "kind": "contact",
       "name": "Test User",
       "email": "test@example.com",
       "message": "Test message"
     }'
   ```

   Expected response: `{"ok":true,"id":"..."}`

### For Vercel

No changes needed! The existing `api/send-email.js` continues to work as-is with Edge Runtime.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Browser                          │
│                 (Contact/Workshop Forms)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ POST /api/send-email
                     │
         ┌───────────┴────────────┐
         │                        │
         ▼                        ▼
┌──────────────────┐    ┌──────────────────┐
│     Vercel       │    │     Dokploy      │
├──────────────────┤    ├──────────────────┤
│ Edge Runtime     │    │ Node.js/Express  │
│                  │    │                  │
│ api/             │    │ admin/server.js  │
│  send-email.js   │    │   │              │
│  (Edge handler)  │    │   └─→ require    │
│                  │    │    send-email-   │
│                  │    │    express.js    │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
            ┌────────────────┐
            │  EmailJS API   │
            │  (REST)        │
            └────────────────┘
```

## Testing Checklist

After deployment, test the following on **Dokploy (app.aimuseum.site)**:

- [ ] Contact form submission
- [ ] Workshop request form
- [ ] Membership form
- [ ] Check browser console for errors
- [ ] Verify email arrives in inbox
- [ ] Test rate limiting (10 requests should work, 11th should fail)
- [ ] Test CORS with different origins

## Troubleshooting

### If emails still don't send on Dokploy:

1. **Check logs:**
   ```bash
   # In Dokploy dashboard
   Application → Logs
   # Look for errors like:
   # - "Email configuration missing"
   # - "Email send failed"
   # - "Failed to send"
   ```

2. **Verify environment variables:**
   ```bash
   # SSH to VPS or use Dokploy shell
   docker exec mai-app-container env | grep EMAILJS
   ```

3. **Check if route is registered:**
   ```bash
   curl https://app.aimuseum.site/api/send-email
   # Should return: {"error":"Method not allowed"}
   # NOT 404
   ```

4. **Test with verbose logging:**
   Add to `api/send-email-express.js` temporarily:
   ```javascript
   console.log('Environment check:', {
     EMAILJS_SERVICE_ID: process.env.EMAILJS_SERVICE_ID?.substring(0, 8),
     EMAILJS_PRIVATE_KEY: process.env.EMAILJS_PRIVATE_KEY ? 'SET' : 'MISSING',
     EMAILJS_PUBLIC_KEY: process.env.EMAILJS_PUBLIC_KEY ? 'SET' : 'MISSING',
     EMAILJS_TEMPLATE_CONTACT: process.env.EMAILJS_TEMPLATE_CONTACT,
     EMAILJS_TEMPLATE_WORKSHOP: process.env.EMAILJS_TEMPLATE_WORKSHOP,
   });
   ```

### Common Issues

**Issue:** "Server not configured" error
- **Solution:** Check all EmailJS environment variables are set in Dokploy

**Issue:** "Origin not allowed" error
- **Solution:** Add your domain to `ALLOWED_ORIGINS` environment variable

**Issue:** "Too many requests" error
- **Solution:** This is expected rate limiting. Wait 10 minutes or adjust limits in code

**Issue:** "Failed to send" (502 error)
- **Solution:** Check EmailJS dashboard for API errors, verify keys are correct

## Verification

After pushing changes, verify:

1. ✅ Dokploy auto-builds and deploys
2. ✅ Container starts successfully (check logs)
3. ✅ `/api/send-email` endpoint returns proper CORS headers on OPTIONS
4. ✅ POST request to `/api/send-email` processes without errors
5. ✅ Email arrives at destination
6. ✅ Vercel deployment still works (not broken by changes)

## Files Changed

- ✅ `api/send-email-express.js` - New Express-compatible handler (created)
- ✅ `admin/server.js` - Added email routes (modified)
- ✅ `README.md` - Updated EmailJS docs (modified)
- ✅ `config/env.example` - Added public key (modified)
- ✅ `docs/EMAILJS_DOKPLOY_FIX.md` - This documentation (created)

## Next Steps

1. Push changes to GitHub
2. Monitor Dokploy deployment logs
3. Test email forms on app.aimuseum.site
4. If successful, mark issue as resolved
5. Consider adding automated tests for email endpoint

---

**Status:** ✅ Solution implemented, ready for deployment  
**Priority:** High (production issue)  
**Estimated fix time:** Immediate (after git push and auto-deploy)

