# Database Integration - Quick Start Guide

## 🎯 Quick Verification Checklist

### 1. Check if Database Export is Working

Visit your live site and check browser DevTools (F12):
```javascript
// In browser console at https://app.aimuseum.site/
fetch('/db/texts.json').then(r => r.json()).then(console.log)
fetch('/db/media.json').then(r => r.json()).then(console.log)
```

**Expected:** JSON objects with your database content  
**If 404:** Database export didn't run or env vars missing

---

## 🔧 Environment Variables Setup (Dokploy)

In your Dokploy dashboard for this project, ensure these are set:

```bash
# Required for database connection
PGHOST=31.97.73.204           # Your Postgres host
PGPORT=15432                   # Your Postgres port
PGUSER=mindprints@gmail.com    # Your DB user
PGPASSWORD=<your-password>     # Your DB password
PGDATABASE=MAI__texts          # Your database name
PGSSL=                         # Leave empty or set to "require"

# Application settings
NODE_ENV=production
PORT=3000
NODE_OPTIONS=--max-old-space-size=512
```

---

## 📝 Adding Dynamic Content to Pages

### Step 1: Add Content to Database

```sql
-- Text snippet example
INSERT INTO text_snippets (key, lang, body, updated_at)
VALUES 
  ('page.about.hero.title', 'en', 'About Us', NOW()),
  ('page.about.hero.title', 'sv', 'Om Oss', NOW());

-- Media asset example  
INSERT INTO media_assets (key, storage_url, alt_text, mime_type)
VALUES 
  ('img.hero-background', 'https://your-cdn.com/hero.jpg', 'Hero Background', 'image/jpeg');
```

### Step 2: Add Attributes to HTML

#### For Text Content:
```html
<!-- Before -->
<h1>About Us</h1>

<!-- After -->
<h1 data-key="page.about.hero.title">About Us</h1>
```

#### For Images:
```html
<!-- Before -->
<img src="images/hero.jpg" alt="Hero Background">

<!-- After -->
<img data-media-key="img.hero-background" alt="fallback text">
```

### Step 3: Deploy
Push to GitHub → Dokploy rebuilds → Database exports → Live!

---

## 🧪 Testing Your Setup

### Local Testing

1. **Set up environment:**
```bash
# Copy and edit .env file
cp config/env.example .env
# Edit .env with your database credentials
```

2. **Test database connection:**
```bash
npm run test-db
```

3. **Export database content:**
```bash
npm run export-db
```

4. **Check generated files:**
```bash
cat public/db/texts.json
cat public/db/media.json
cat public/db/encyclopedia.json
```

5. **Start local server:**
```bash
npm start
# Visit http://localhost:3000
```

### Production Testing

1. **Check Dokploy build logs** for:
   - `"Database connection successful"`
   - `"✓ Exported to public/db/{texts.json, media.json, encyclopedia.json}"`

2. **Visit your site** with DevTools open:
   - Check Network tab for `/db/texts.json` and `/db/media.json` requests
   - Verify they return 200 OK with JSON content

3. **Verify dynamic content** loads:
   - Elements with `data-key` should show database text
   - Images with `data-media-key` should load from CDN URLs

---

## 🎨 Content Key Naming Conventions

### Text Snippets
```
page.<pagename>.<section>.<element>.<lang?>

Examples:
  page.home.hero.title
  page.about.team.description
  page.contact.form.submit
```

### Media Assets
```
img.<category>-<descriptor>

Examples:
  img.hero-main
  img.workshop-ai-coding
  img.logo-primary
  img.team-member-john
```

### Encyclopedia Entries
```
ency.<slug>

Examples:
  ency.perceptron
  ency.backpropagation
  ency.dartmouth-1956
```

---

## 🔍 Troubleshooting

### Issue: Database export fails during build

**Symptom:** Dokploy build fails or completes but no JSON files exist

**Solutions:**
1. Verify database environment variables are set in Dokploy
2. Check database is accessible from Dokploy VPS:
   ```bash
   # SSH to Dokploy and test:
   telnet 31.97.73.204 15432
   ```
3. Check Dokploy build logs for connection errors

### Issue: JSON files are empty `{}`

**Symptom:** Files exist but contain empty objects

**Solutions:**
1. Database tables are empty - add some test data
2. Export query is failing silently - check `tools/export-db-content.js` logs

### Issue: Content not updating on page

**Symptom:** Changed database content but page shows old text

**Solutions:**
1. Clear browser cache (Ctrl+Shift+R)
2. Check JSON files actually updated (view `/db/texts.json` directly)
3. Verify HTML element has correct `data-key` attribute
4. Check browser console for JavaScript errors

### Issue: Images not loading

**Symptom:** Images with `data-media-key` don't appear

**Solutions:**
1. Verify `storage_url` in database is correct and publicly accessible
2. Check CORS headers if CDN is on different domain
3. Verify image URL returns 200 OK when accessed directly
4. Check browser console for network errors

---

## 📊 Database Schema Quick Reference

### text_snippets
```sql
CREATE TABLE text_snippets (
  key TEXT,
  lang TEXT,
  body TEXT,
  updated_at TIMESTAMP,
  PRIMARY KEY (key, lang)
);
```

### media_assets
```sql
CREATE TABLE media_assets (
  key TEXT PRIMARY KEY,
  storage_url TEXT,
  mime_type TEXT,
  alt_text TEXT,
  credit TEXT,
  width INTEGER,
  height INTEGER,
  size_bytes INTEGER
);
```

### encyclopedia_entries
```sql
CREATE TABLE encyclopedia_entries (
  slug TEXT,
  lang TEXT,
  status TEXT,
  title TEXT,
  summary_md TEXT,
  body_md TEXT,
  PRIMARY KEY (slug, lang)
);
```

---

## 🚀 Quick Wins - First Content to Make Dynamic

### Priority 1: Homepage Hero Text
```html
<!-- src/site/index.html -->
<h1 data-key="page.home.hero.title">Learn AI with us!</h1>
```

```sql
INSERT INTO text_snippets (key, lang, body, updated_at) VALUES
  ('page.home.hero.title', 'en', 'Learn AI with us!', NOW()),
  ('page.home.hero.title', 'sv', 'Lär dig AI med oss!', NOW());
```

### Priority 2: Workshop Images
Replace hardcoded workshop card images with database-driven ones:

```html
<!-- src/site/index.html - Workshop cards -->
<img data-media-key="img.workshop-evolution-ai" alt="AI Evolution Workshop">
<img data-media-key="img.workshop-hands-on" alt="Hands-on Workshop">
<img data-media-key="img.workshop-human-ai" alt="Human-AI Interaction">
```

```sql
INSERT INTO media_assets (key, storage_url, alt_text) VALUES
  ('img.workshop-evolution-ai', '/images/evolution-AI.avif', 'AI Evolution Workshop'),
  ('img.workshop-hands-on', '/images/hands-on-workshops.avif', 'Hands-on Workshop'),
  ('img.workshop-human-ai', '/images/Human-AI-Interaction.avif', 'Human-AI Interaction');
```

### Priority 3: Client List
Make the client list dynamic for easy updates:

```html
<!-- Instead of hardcoded <li> elements -->
<ul id="clients-list" class="clients-list"></ul>

<script>
// Add to small-loader or separate script
fetch('/db/clients.json')
  .then(r => r.json())
  .then(clients => {
    const ul = document.getElementById('clients-list');
    clients.forEach((name, i) => {
      const li = document.createElement('li');
      li.textContent = name;
      li.className = i % 2 === 0 ? 'text-slate-300' : 'text-slate-200';
      ul.appendChild(li);
    });
  });
</script>
```

---

## 📈 Scaling the System

### Phase 1: Static Pages → Database Text ✅
- [x] Small-loader implemented
- [x] Export script working
- [ ] Add data-key to main pages
- [ ] Populate text_snippets table

### Phase 2: Static Images → CDN References
- [ ] Set up CDN (Cloudflare/Bunny/etc)
- [ ] Upload images to CDN
- [ ] Add storage_url to media_assets
- [ ] Replace img src with data-media-key

### Phase 3: Encyclopedia from Database
- [ ] Create page generator from encyclopedia_entries
- [ ] Add Markdown renderer for body_md
- [ ] Implement search/filter
- [ ] Add admin UI for encyclopedia

### Phase 4: Real-time API (Optional)
- [ ] Add API endpoints for live content
- [ ] Implement caching strategy
- [ ] Add webhook triggers for rebuilds
- [ ] Consider Redis for API caching

---

## 🛠️ Useful Commands

```bash
# Local development
npm run test-db              # Test database connection
npm run export-db            # Export DB to JSON files
npm run build                # Build static site
npm start                    # Start admin server + serve site
npm run admin                # Start admin only (same as start)

# Database management
npm run import-db:dry        # Test import from exports/ (dry run)
npm run import-db            # Import from exports/ to DB

# Production (Dokploy)
# Automatically runs: npm ci && npm run build && npm run export-db
```

---

## 📞 Support & Documentation

- **Full Evaluation:** See `docs/CURRENT_STATE_EVALUATION.md`
- **Architecture:** See `docs/ARCHITECTURE.md`
- **Deployment:** See `DEPLOYMENT.md`
- **Database Tools:** See `tools/` directory

---

**You're ready to go! Start by verifying your database connection, then add your first dynamic content.** 🎉

