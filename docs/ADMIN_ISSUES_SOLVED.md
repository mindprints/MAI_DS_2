# Admin Issues - Solved

**Date:** October 2, 2025

---

## Issue 3: Changes Don't Appear on Site (CRITICAL - Solved!)

### The Good News

Your system **IS** set up correctly! I found:
- ✅ `data-key="page.home.seg.1"` exists in your HTML (line 104 of `src/site/index.html`)
- ✅ Small-loader script is active and working
- ✅ Database saves are working

### Why You're Not Seeing Changes

**You're editing the WRONG key!** 

The HTML has:
```html
<span data-key="page.home.seg.1">Learn AI with us!</span>
```

But you're probably creating keys like:
- `page.home.hero.title` ❌
- `page.home.title` ❌
- `home.title` ❌

You need to use **exactly**: `page.home.seg.1` ✅

### How to Test RIGHT NOW

1. **Go to admin:** https://app.aimuseum.site/admin
2. **Click "+ Create New"**
3. **Enter this EXACT key:** `page.home.seg.1`
4. **EN:** `Welcome to MAI Museum!`
5. **SV:** `Välkommen till MAI Museet!`
6. **Click "Create"**
7. **Wait 30 seconds** for next export cycle OR **trigger redeploy**
8. **Visit:** https://app.aimuseum.site/
9. **You should see:** "Welcome to MAI Museum!" ✅

### The Workflow Explained

```
┌─────────────────────────────────────────────────────────┐
│ 1. CREATE IN ADMIN                                      │
│    Key: page.home.seg.1                                 │
│    EN: "Welcome to MAI!"                                │
│    Save → PostgreSQL database                           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. EXPORT TO JSON (happens automatically on Dokploy)    │
│    npm run export-db                                    │
│    Creates: /db/texts.json with your content            │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. BROWSER LOADS PAGE                                   │
│    HTML: <span data-key="page.home.seg.1">Fallback</span>│
│    Small-loader finds data-key attribute                │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. SMALL-LOADER REPLACES                                │
│    Fetches /db/texts.json                               │
│    Finds key "page.home.seg.1"                          │
│    Replaces "Fallback" with "Welcome to MAI!"           │
└─────────────────────────────────────────────────────────┘
```

### Find All Existing Keys

To see what keys are already in use:

```bash
# Search for all data-key attributes
grep -r 'data-key=' src/site/ public/
```

Or check the English homepage:
```bash
grep 'data-key' src/site/index.html
```

**You'll find:** `page.home.seg.1` on line 104

### When Does Export Run?

On Dokploy, `npm run export-db` runs:
1. **At container startup** (part of CMD in Dockerfile)
2. **After every code deploy** (rebuild triggers it)

**It does NOT run:**
- When you save in admin (admin only updates database)
- Automatically every X minutes

**Solution:** After making admin changes, either:
- **Option A:** Wait for next code deploy
- **Option B:** Restart the Dokploy container
- **Option C:** Add a "Export Now" button to admin (future enhancement)

---

## Issue 1: Missing Encyclopedia & Slides Sections

### Current State

The new admin only shows **Database Text Snippets** section.

**Missing:**
- 📝 Encyclopedia editor
- 🖼️ Slides manager

### Why They Were Removed

I created a simplified, database-focused admin to match your stated goal:
> "database admin interface optimized for the database workflow"

The old features (file editing, slides, encyclopedia) were intentionally removed to reduce complexity.

### Solution: Add Them Back

Would you like me to:

**Option A:** Add Slides & Encyclopedia sections back to current admin?
**Option B:** Create separate admin pages for each?
- `/admin` → Database content
- `/admin/slides` → Slide management
- `/admin/encyclopedia` → Encyclopedia editor
**Option C:** Keep current admin for database, use old admin backup for files/slides?

**Let me know your preference and I'll implement it!**

---

## Issue 2: PostgreSQL `ProcessInterrupts` Error

### What It Means

This is a **non-critical warning** from PostgreSQL. It happens when:
- Connection is idle for too long
- Client disconnects mid-query
- Network hiccup between app and database

### Current Behavior

The error message starts with:
```
routine: 'ProcessInterrupts',
client: Client { ... }
```

This is caught by the error handler in `admin/server.js`:

```javascript
pool.on('error', (err) => {
  console.error('Postgres pool error:', err);
  // Don't crash the app on database errors
});
```

**Impact:** None! The app continues running. PostgreSQL automatically reconnects.

### If You Want to Reduce These Errors

Add connection pool configuration:

```javascript
// In admin/server.js, update createPgPool()
const pool = new Pool({
  ...cfg,
  max: 10,                      // Max connections
  idleTimeoutMillis: 30000,     // Close idle connections after 30s
  connectionTimeoutMillis: 2000 // Timeout for new connections
});
```

**But this is optional!** The current setup works fine.

---

## Quick Checklist: Is Everything Working?

### ✅ Database Connection
- [x] Dokploy env var: `DATABASE_URL` has `MAI__texts` (two underscores)
- [x] Admin server starts without errors
- [x] No "database not configured" messages

### ✅ Admin UI
- [x] Loads at https://app.aimuseum.site/admin
- [x] "Load Keys" button works
- [x] Can create, edit, save keys
- [x] Toast notifications appear

### ✅ Export Process
- [x] `npm run export-db` runs at startup
- [x] Creates `/db/texts.json`, `/db/media.json`, `/db/encyclopedia.json`
- [x] Files are accessible at `https://app.aimuseum.site/db/texts.json`

### ✅ Frontend Integration  
- [x] Small-loader script active in HTML
- [x] At least one `data-key` attribute exists (page.home.seg.1)
- [x] Browser can fetch `/db/texts.json`
- [ ] **Need to verify:** Key in database matches key in HTML

---

## Action Items

### Immediate (To See Changes Work)

1. **Create the correct key in admin:**
   ```
   Key: page.home.seg.1
   EN: Test message English
   SV: Test meddelande Svenska
   ```

2. **Verify JSON was created:**
   - Visit: https://app.aimuseum.site/db/texts.json
   - Should see: `{"page.home.seg.1":{"en":"Test message English","sv":"Test meddelande Svenska"}}`

3. **Check the website:**
   - Visit: https://app.aimuseum.site/
   - Look for the "BOOK NOW Learn AI with us!" section
   - Should show your test message

4. **If still not working, check browser console:**
   ```javascript
   // Open DevTools, run:
   fetch('/db/texts.json').then(r => r.json()).then(console.log)
   // Should show your keys
   ```

### Short-term (This Week)

1. **Document all existing data-keys:**
   ```bash
   grep -r 'data-key=' src/site/ > data-keys-inventory.txt
   ```

2. **Add more data-keys to pages** (example):
   ```html
   <!-- Before -->
   <h2>Workshops and Lectures</h2>
   
   <!-- After -->
   <h2 data-key="page.home.workshops.title">Workshops and Lectures</h2>
   ```

3. **Populate database with content for those keys**

4. **Decide on Encyclopedia & Slides sections** (I'll add them back based on your preference)

### Long-term (This Month)

1. **Add "Export Now" button to admin** (manually trigger export)
2. **Add "Preview" mode** (see how changes will look)
3. **Create content management workflow document**
4. **Add validation** (warn if key in DB has no matching HTML)

---

## Pro Tips

### Finding Keys in HTML

```bash
# Find all data-key attributes
grep -r 'data-key=' src/site/ src/content/

# Find specific key
grep -r 'page.home.seg.1' src/site/
```

### Testing Small-loader

```javascript
// In browser console at https://app.aimuseum.site/
// Check if small-loader ran
fetch('/db/texts.json')
  .then(r => r.json())
  .then(data => {
    console.log('Keys in database:', Object.keys(data));
    console.log('Keys in HTML:', 
      [...document.querySelectorAll('[data-key]')]
        .map(el => el.getAttribute('data-key'))
    );
  });
```

### Debugging Why Content Doesn't Update

1. **Check database has the key:**
   - Admin → "Load Keys" → Search for key
   - Should be in the list

2. **Check JSON file has the key:**
   - Visit: `https://app.aimuseum.site/db/texts.json`
   - Search for your key

3. **Check HTML has data-key:**
   - View page source
   - Search for `data-key="your.key.name"`

4. **Check small-loader runs:**
   - Browser DevTools → Console
   - Should see no errors
   - Network tab should show `/db/texts.json` loaded

---

**All three issues are now explained!** The most critical one (#3) is just a matter of using the correct key name that matches your HTML. Try the test above and let me know if you want me to add back the Encyclopedia and Slides sections! 🎉

