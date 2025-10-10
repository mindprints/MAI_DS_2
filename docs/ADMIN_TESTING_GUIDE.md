# Admin Interface Testing Guide

## Pre-Testing Setup

### 1. Set Admin Password

Create or update `.env` file:
```bash
echo "ADMIN_PASSWORD=testpassword123" >> .env
```

### 2. Ensure Database is Running (Optional)

If you want to test database features:
```bash
# Check if PostgreSQL is configured in .env
# Should have DATABASE_URL or PG* variables set
```

### 3. Start Admin Server

```bash
npm run admin
```

Expected output:
```
Admin running on http://localhost:5179
Main site available at http://localhost:5179
Admin interface at http://localhost:5179/admin
Database connection successful (if DB configured)
```

## Testing Checklist

### Authentication Test

1. **Access Admin Without Credentials**
   - Open: http://localhost:5179/admin
   - ✅ Should see browser authentication dialog
   - ✅ Cancel should return 401 Unauthorized

2. **Login with Correct Credentials**
   - Username: `admin`
   - Password: `testpassword123` (or your ADMIN_PASSWORD)
   - ✅ Should load admin interface

3. **Test Invalid Credentials**
   - Try wrong password
   - ✅ Should be denied access
   - ✅ Browser should re-prompt

### File Mode Tests (Default)

#### Pages Editor

1. **Load Pages List**
   - ✅ Dropdown should show: `index`, and other pages
   - ✅ Select a page from dropdown

2. **View Page Segments**
   - ✅ English column shows text segments
   - ✅ Svenska column shows text segments
   - ✅ Each segment has appropriate badge (H1, P, etc.)

3. **Edit and Save**
   - Change some text in EN column
   - Change some text in SV column
   - Click "Save Text"
   - ✅ Should see success toast
   - Reload page
   - ✅ Changes should persist

#### Slides Manager

1. **Load Slides**
   - Click "Load" button
   - ✅ Should see table with existing slides
   - ✅ Each row shows preview image

2. **Upload New Slide**
   - Choose a .webp, .jpg, or .png file
   - Click "Upload"
   - ✅ Should see success toast
   - ✅ New slide appears in table

3. **Edit Slide Metadata**
   - Change order number
   - Edit EN title
   - Edit EN description
   - Edit SV title
   - Edit SV description
   - Click "Save Manifest"
   - ✅ Should see success toast

4. **Delete Slide**
   - Click "Delete" on a slide
   - Confirm deletion
   - ✅ Slide removed from list
   - ✅ Success toast appears

#### Encyclopedia Editor

1. **Load Encyclopedia List**
   - ✅ Dropdown shows encyclopedia entries
   - ✅ Can select an entry

2. **View Entry Segments**
   - ✅ English segments load
   - ✅ Svenska segments load
   - ✅ Badges show element types

3. **Edit and Save Entry**
   - Modify some text
   - Click "Save Entry"
   - ✅ Success toast appears
   - ✅ Changes persist

### Database Mode Tests

1. **Switch to Database Mode**
   - Change dropdown to "Database (Postgres)"
   - ✅ File mode panels hide
   - ✅ Database panel appears

2. **Load Database Keys**
   - Click "Load Keys"
   - ✅ Keys dropdown populates
   - ✅ Toast shows count (e.g., "Loaded 5 text keys")

3. **Filter Keys**
   - Enter prefix in filter box (e.g., "page.home")
   - Click "Load Keys"
   - ✅ Only matching keys shown

4. **View Key Values**
   - Select a key from dropdown
   - ✅ English text loads
   - ✅ Svenska text loads
   - ✅ Last updated timestamp shows

5. **Edit and Save**
   - Modify EN text
   - Modify SV text
   - Click "Save Text"
   - ✅ Success toast appears
   - Select another key and back
   - ✅ Changes persist

6. **Database Not Configured**
   - If no database configured:
   - ✅ Database mode should be disabled
   - ✅ Tooltip or message explains why

### Cross-Browser Testing

Test in multiple browsers:
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari

Each should:
- ✅ Show auth dialog correctly
- ✅ Remember credentials (session)
- ✅ All features work

### Error Handling Tests

1. **Network Error**
   - Stop admin server
   - Try to save something
   - ✅ Error toast appears
   - ✅ No crash or blank page

2. **Invalid File Upload**
   - Try to upload a .txt file
   - ✅ Should reject or show error

3. **Database Disconnect**
   - In DB mode, disconnect database
   - Try to load keys
   - ✅ Error message appears
   - ✅ Mode switches back to files

### API Integration Tests

#### Local (Dokploy-style) APIs

With admin server running:

```bash
# Test page segments API
curl http://localhost:5179/api/pages

# Test slides API
curl http://localhost:5179/api/slides

# Test encyclopedia API
curl http://localhost:5179/api/ency

# Test database API (requires auth)
curl -u admin:testpassword123 http://localhost:5179/api/db/text-snippets
```

#### Vercel/GitHub APIs

When `useGitHubAPI` is true:
- ✅ Calls `/api/admin-pages` instead
- ✅ Calls `/api/admin-slides` instead
- ✅ Database mode is disabled

Test on Vercel deployment:
- Pages use GitHub API
- Slides use GitHub API
- Each save creates git commit
- Vercel auto-rebuilds

### Performance Tests

1. **Load Time**
   - Measure time to load admin interface
   - ✅ Should be < 2 seconds

2. **Large Page**
   - Load a page with many segments
   - ✅ Renders without lag
   - ✅ Scrolling is smooth

3. **Many Slides**
   - Load slides page with 20+ images
   - ✅ Table renders quickly
   - ✅ Previews load progressively

### Security Tests

1. **Bypass Attempt**
   - Try accessing http://localhost:5179/api/pages directly
   - ✅ Should work (APIs not protected, only UI)
   
2. **Password Strength**
   - Check if weak passwords are allowed
   - ⚠️ Currently any password works (set strong one in env)

3. **HTTPS Check (Production)**
   - Access admin on production
   - ✅ Should use HTTPS
   - ✅ Credentials encrypted

## Deployment Testing

### Dokploy Deployment

1. **Set Environment Variable**
   ```bash
   # In Dokploy dashboard
   ADMIN_PASSWORD=<strong-password-here>
   ```

2. **Deploy**
   - Push changes to git
   - Dokploy auto-deploys
   - Check build logs

3. **Test Access**
   - Visit: https://app.aimuseum.site/admin
   - ✅ Auth dialog appears
   - ✅ Enter credentials
   - ✅ Admin loads

4. **Test Database Features**
   - Switch to Database mode
   - ✅ Should work (Dokploy has PostgreSQL)
   - Test all CRUD operations

5. **Test File Features**
   - Pages, Slides, Encyclopedia
   - ✅ All should work
   - Changes save to local files

### Vercel Deployment

1. **Set Environment Variable**
   ```bash
   # In Vercel dashboard
   ADMIN_PASSWORD=<strong-password-here>
   ```

2. **Deploy**
   - Push to git
   - Vercel auto-deploys

3. **Test Access**
   - Visit your Vercel URL + `/admin`
   - ✅ Auth works

4. **Test GitHub API**
   - Pages editor
   - ✅ Uses `/api/admin-pages`
   - ✅ Commits to GitHub
   - ✅ Triggers rebuild

5. **Verify Database Disabled**
   - ✅ Database mode should be disabled
   - ✅ Or shows "not configured" error

## Troubleshooting

### Issue: Admin Won't Load

**Symptoms:**
- Blank page
- JavaScript errors

**Solutions:**
1. Check browser console for errors
2. Clear browser cache
3. Verify `admin/static/index.html` exists
4. Check server logs

### Issue: Authentication Fails

**Symptoms:**
- Always shows 401 Unauthorized
- Credentials not accepted

**Solutions:**
1. Verify `ADMIN_PASSWORD` in `.env`
2. Restart admin server after env change
3. Check for typos in password
4. Try `admin` as username (not email)

### Issue: Database Mode Not Working

**Symptoms:**
- "Database not configured" error
- Can't load keys

**Solutions:**
1. Check DATABASE_URL or PG* vars in .env
2. Verify PostgreSQL is running
3. Test connection: `npm run test-db`
4. Check server logs for connection errors

### Issue: Slides Upload Fails

**Symptoms:**
- Upload button does nothing
- Error toast appears

**Solutions:**
1. Check file size (< 10MB)
2. Verify file type (.webp, .jpg, .png, .avif)
3. Check server write permissions
4. Look for errors in server logs

### Issue: Changes Don't Persist

**Symptoms:**
- Save appears to work
- On reload, changes are gone

**Solutions:**
1. Check if you're on correct deployment
2. Verify file write permissions
3. Check if using database vs files correctly
4. Look for save errors in console

## Success Criteria

All tests pass if:

- ✅ Authentication protects admin UI
- ✅ Pages editor loads and saves changes
- ✅ Slides can be uploaded, edited, deleted
- ✅ Encyclopedia entries can be edited
- ✅ Database mode works (when DB configured)
- ✅ Mode switcher works correctly
- ✅ All APIs respond correctly
- ✅ Works on Dokploy deployment
- ✅ Works on Vercel deployment (with GitHub API)
- ✅ No console errors
- ✅ Smooth user experience

## Automated Tests (Future)

Consider adding:

```javascript
// admin.test.js
describe('Admin Interface', () => {
  it('requires authentication', async () => {
    const res = await fetch('/admin');
    expect(res.status).toBe(401);
  });

  it('loads with valid credentials', async () => {
    const res = await fetch('/admin', {
      headers: {
        'Authorization': 'Basic ' + btoa('admin:password')
      }
    });
    expect(res.status).toBe(200);
  });

  // More tests...
});
```

## Report Issues

If you find bugs:

1. Note the exact steps to reproduce
2. Check browser console for errors
3. Check server logs
4. Document in GitHub issue
5. Tag with `admin` and `bug` labels

---

**Happy Testing! 🧪**

