# Admin Authentication Setup

## Overview

The MAI admin interface is now protected with HTTP Basic Authentication. This provides a simple but effective security layer for the admin panel.

## Setup Instructions

### 1. Set Admin Password

Add the `ADMIN_PASSWORD` environment variable to your deployment:

#### Local Development (.env file)
```bash
ADMIN_PASSWORD=your-secure-password-here
```

#### Dokploy
1. Go to your Dokploy dashboard
2. Select the MAI application
3. Navigate to "Environment Variables"
4. Add new variable:
   - Name: `ADMIN_PASSWORD`
   - Value: Your secure password
5. Redeploy the application

#### Vercel
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add new variable:
   - Name: `ADMIN_PASSWORD`
   - Value: Your secure password
   - Environments: Production, Preview, Development
4. Redeploy

### 2. Default Password

If `ADMIN_PASSWORD` is not set, the default password is `changeme`.

**⚠️ WARNING:** Always set a secure password in production!

## Accessing the Admin

1. Navigate to: `https://app.aimuseum.site/admin` (or your local URL)
2. Browser will show authentication dialog
3. Enter credentials:
   - **Username:** `admin`
   - **Password:** Your `ADMIN_PASSWORD` value

## Security Features

- **HTTPS:** Credentials encrypted in transit
- **Challenge Response:** Browser-based password prompt
- **Simple Setup:** No complex authentication system needed
- **Environment-based:** Password stored securely in env vars

## Password Best Practices

1. **Use Strong Passwords:** Minimum 16 characters, mix of letters, numbers, symbols
2. **Unique Password:** Don't reuse passwords from other services
3. **Rotate Regularly:** Change password every 90 days
4. **Secure Storage:** Never commit passwords to git

## Updating Authentication (Future)

For production environments, consider upgrading to:
- JWT-based authentication
- OAuth/SSO integration
- Role-based access control (RBAC)
- Multi-factor authentication (MFA)

## Troubleshooting

### Can't Access Admin
- Check if `ADMIN_PASSWORD` is set in environment
- Verify you're using username `admin`
- Clear browser cache/cookies
- Check browser console for errors

### Password Not Working
- Redeploy after changing environment variable
- Check for typos in password
- Ensure no extra spaces in env var value

### Locked Out
- Update `ADMIN_PASSWORD` in deployment platform
- Redeploy the application
- Use new password to login

## Technical Details

### Implementation
```javascript
// admin/server.js
const basicAuth = require('express-basic-auth');

app.use('/admin', basicAuth({
  users: { 'admin': process.env.ADMIN_PASSWORD || 'changeme' },
  challenge: true,
  realm: 'MAI Admin Area'
}));
```

### How It Works
1. User requests `/admin`
2. Express-basic-auth middleware intercepts request
3. Browser shows authentication dialog
4. User enters username/password
5. Middleware validates against env var
6. If valid, serves admin interface
7. If invalid, shows 401 Unauthorized

### HTTP Headers
```
WWW-Authenticate: Basic realm="MAI Admin Area"
Authorization: Basic <base64-encoded-credentials>
```

## References

- [express-basic-auth documentation](https://www.npmjs.com/package/express-basic-auth)
- [HTTP Basic Authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

