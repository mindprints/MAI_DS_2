# Database Integration - Data Flow Diagram

## 🔄 Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DOKPLOY DEPLOYMENT FLOW                         │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   GitHub     │  Push to main branch
│  Repository  │────────────┐
└──────────────┘            │
                            ▼
                   ┌─────────────────┐
                   │     Dokploy     │  Detects push
                   │   Build System  │────────────┐
                   └─────────────────┘            │
                                                  ▼
                                       ┌──────────────────────┐
                                       │  Docker Container    │
                                       │  (node:20-alpine)    │
                                       └──────────────────────┘
                                                  │
                                    ┌─────────────┼─────────────┐
                                    ▼             ▼             ▼
                            ┌───────────┐ ┌─────────────┐ ┌──────────┐
                            │  npm ci   │ │  npm run    │ │ npm run  │
                            │  (install)│ │   build     │ │ export-db│
                            └───────────┘ └─────────────┘ └──────────┘
                                                                  │
                        ┌─────────────────────────────────────────┘
                        │
                        │  Connects to PostgreSQL
                        ▼
              ┌──────────────────────┐
              │   PostgreSQL DB      │
              │   (Dokploy VPS)      │
              │                      │
              │  ┌─────────────────┐ │
              │  │ text_snippets   │ │◄── Reads all rows
              │  │ media_assets    │ │◄── Reads all rows
              │  │ encyclopedia_   │ │◄── Reads all rows
              │  │ entries         │ │
              │  └─────────────────┘ │
              └──────────────────────┘
                        │
                        │ Query results
                        ▼
              ┌──────────────────────┐
              │  export-db-content.js│
              │  (Build step)        │
              │                      │
              │  Groups by:          │
              │  • key + lang        │
              │  • slug + lang       │
              └──────────────────────┘
                        │
                        │ Writes JSON files
                        ▼
              ┌──────────────────────┐
              │   public/db/         │
              │                      │
              │   texts.json         │◄── {key: {en:"...", sv:"..."}}
              │   media.json         │◄── {key: {url:"...", alt:...}}
              │   encyclopedia.json  │◄── {slug: {en:{...}, sv:{...}}}
              └──────────────────────┘
                        │
                        │ Also copies to fallback location
                        ▼
              ┌──────────────────────┐
              │   public/assets/db/  │
              │                      │
              │   texts.json         │
              │   media.json         │
              │   encyclopedia.json  │
              └──────────────────────┘
                        │
                        │
                        ▼
              ┌──────────────────────┐
              │   http-server        │
              │   Serves /public     │
              │   Port 3000          │
              └──────────────────────┘
                        │
                        │ HTTPS via Traefik
                        ▼
              ┌──────────────────────┐
              │  app.aimuseum.site   │
              └──────────────────────┘
```

---

## 🌐 Frontend Data Loading Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      USER VISITS WEBSITE                                │
└─────────────────────────────────────────────────────────────────────────┘

User navigates to: https://app.aimuseum.site/
                        │
                        ▼
              ┌──────────────────────┐
              │  Browser loads       │
              │  index.html          │
              └──────────────────────┘
                        │
                        │ HTML contains:
                        │ <h1 data-key="page.home.hero.title">Fallback</h1>
                        │ <img data-media-key="img.ai-coding" alt="fallback">
                        │ <script> small-loader code </script>
                        │
                        ▼
              ┌──────────────────────┐
              │  small-loader.js     │
              │  executes            │
              └──────────────────────┘
                        │
            ┌───────────┴───────────┐
            │                       │
            ▼                       ▼
   ┌─────────────────┐    ┌─────────────────┐
   │ fetch('/db/     │    │ fetch('/db/     │
   │ texts.json')    │    │ media.json')    │
   └─────────────────┘    └─────────────────┘
            │                       │
            │ If 404, try:         │ If 404, try:
            │ /assets/db/          │ /assets/db/
            │ texts.json           │ media.json
            │                       │
            └───────────┬───────────┘
                        │
                        ▼
              ┌──────────────────────┐
              │  JSON data loaded    │
              │                      │
              │  texts = {           │
              │    "page.home.hero": │
              │      {en:"Learn AI"} │
              │  }                   │
              │                      │
              │  media = {           │
              │    "img.ai-coding": {│
              │      url: "https://..│
              │    }                 │
              │  }                   │
              └──────────────────────┘
                        │
            ┌───────────┴───────────┐
            │                       │
            ▼                       ▼
   ┌─────────────────┐    ┌─────────────────┐
   │ Find all        │    │ Find all        │
   │ [data-key]      │    │ [data-media-key]│
   │ elements        │    │ elements        │
   └─────────────────┘    └─────────────────┘
            │                       │
            ▼                       ▼
   ┌─────────────────┐    ┌─────────────────┐
   │ Replace         │    │ Replace         │
   │ el.textContent  │    │ img.src         │
   │ with DB text    │    │ img.alt         │
   └─────────────────┘    └─────────────────┘
            │                       │
            └───────────┬───────────┘
                        │
                        ▼
              ┌──────────────────────┐
              │   Page now shows     │
              │   database content!  │
              └──────────────────────┘
```

---

## 🔄 Content Update Workflow

### Method 1: Database Direct Edit (Recommended for Production)

```
┌──────────────┐
│  Admin/CMS   │
│  User        │
└──────────────┘
        │
        │ Logs into https://app.aimuseum.site/admin
        ▼
┌──────────────────────┐
│   Admin UI           │
│   /admin/            │
│   (Database Mode)    │
└──────────────────────┘
        │
        │ Selects key: "page.home.hero.title"
        │ Edits EN: "Learn AI with us!"
        │ Edits SV: "Lär dig AI med oss!"
        │ Clicks SAVE
        ▼
┌──────────────────────┐
│  PUT /api/db/        │
│  text-snippets/      │
│  page.home.hero.title│
└──────────────────────┘
        │
        │ SQL: UPDATE text_snippets SET body=...
        ▼
┌──────────────────────┐
│   PostgreSQL DB      │
│   Row updated        │
│   updated_at = NOW() │
└──────────────────────┘
        │
        │ Changes saved but NOT live yet
        │
        │ Admin triggers redeploy or
        │ waits for next GitHub push
        ▼
┌──────────────────────┐
│   Dokploy rebuild    │
│   npm run export-db  │
└──────────────────────┘
        │
        ▼
┌──────────────────────┐
│   Updated JSON files │
│   public/db/*.json   │
└──────────────────────┘
        │
        ▼
┌──────────────────────┐
│   Live site updates! │
└──────────────────────┘
```

### Method 2: SQL Direct (Development/Bulk Import)

```
┌──────────────┐
│  Developer   │
│  (SQL Client)│
└──────────────┘
        │
        │ Connects to PostgreSQL
        ▼
┌──────────────────────┐
│  psql / pgAdmin /    │
│  DBeaver             │
└──────────────────────┘
        │
        │ Runs SQL:
        │ INSERT INTO text_snippets (key, lang, body, updated_at)
        │ VALUES ('page.about.title', 'en', 'About Us', NOW());
        ▼
┌──────────────────────┐
│   PostgreSQL DB      │
│   Direct write       │
└──────────────────────┘
        │
        │ Push any change to GitHub to trigger rebuild
        ▼
┌──────────────────────┐
│   Dokploy rebuild    │
│   npm run export-db  │
└──────────────────────┘
        │
        ▼
┌──────────────────────┐
│   Updated JSON files │
└──────────────────────┘
        │
        ▼
┌──────────────────────┐
│   Live site updates! │
└──────────────────────┘
```

---

## 📊 Data Transformation Flow

### Text Snippets

```
DATABASE STRUCTURE:
┌──────────────────────────────────────────────────┐
│ text_snippets table                              │
├─────────────────┬──────┬───────────┬────────────┤
│ key             │ lang │ body      │ updated_at │
├─────────────────┼──────┼───────────┼────────────┤
│ page.home.title │ en   │ Learn AI  │ 2025-10-02 │
│ page.home.title │ sv   │ Lär dig   │ 2025-10-02 │
│ page.about.hero │ en   │ About Us  │ 2025-10-01 │
│ page.about.hero │ sv   │ Om Oss    │ 2025-10-01 │
└─────────────────┴──────┴───────────┴────────────┘
        │
        │ export-db-content.js groups by key
        ▼
JSON STRUCTURE (texts.json):
{
  "page.home.title": {
    "en": "Learn AI",
    "sv": "Lär dig"
  },
  "page.about.hero": {
    "en": "About Us",
    "sv": "Om Oss"
  }
}
        │
        │ small-loader.js looks up by key + lang
        ▼
HTML RENDERING:
<html lang="en">
  <h1 data-key="page.home.title">Learn AI</h1>
</html>

<html lang="sv">
  <h1 data-key="page.home.title">Lär dig</h1>
</html>
```

### Media Assets

```
DATABASE STRUCTURE:
┌──────────────────────────────────────────────────────────────┐
│ media_assets table                                           │
├───────────────┬──────────────────────────┬──────────────────┤
│ key           │ storage_url              │ alt_text         │
├───────────────┼──────────────────────────┼──────────────────┤
│ img.ai-coding │ https://cdn.../ai.jpg    │ AI Coding        │
│ img.hero-bg   │ /images/hero.avif        │ Hero Background  │
└───────────────┴──────────────────────────┴──────────────────┘
        │
        │ export-db-content.js exports as-is
        ▼
JSON STRUCTURE (media.json):
{
  "img.ai-coding": {
    "key": "img.ai-coding",
    "url": "https://cdn.../ai.jpg",
    "mime_type": "image/jpeg",
    "alt_text": "AI Coding",
    "width": 1920,
    "height": 1080,
    "size_bytes": 245678
  }
}
        │
        │ small-loader.js looks up by key
        ▼
HTML RENDERING:
<img data-media-key="img.ai-coding" alt="fallback">
        │
        │ JavaScript replaces:
        ▼
<img src="https://cdn.../ai.jpg" alt="AI Coding">
```

---

## 🔐 Security Considerations

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                          │
└─────────────────────────────────────────────────────────────┘

1. DATABASE ACCESS
   ┌──────────────────┐
   │  PostgreSQL DB   │
   │  (Internal VPS)  │
   └──────────────────┘
   ↑
   │ Only accessible from:
   │ • Dokploy containers (build time)
   │ • Admin API (runtime)
   │ • NOT exposed to public internet
   

2. ADMIN UI
   ┌──────────────────┐
   │  /admin          │
   │  Dashboard       │
   └──────────────────┘
   ↑
   │ TODO: Add authentication
   │ Currently: Security through obscurity
   │ Recommended: Basic Auth or OAuth


3. JSON FILES
   ┌──────────────────┐
   │  /db/*.json      │
   │  (Public)        │
   └──────────────────┘
   ↑
   │ ✅ Safe to expose publicly
   │ • No sensitive data
   │ • Read-only
   │ • CORS headers allow client access


4. API ENDPOINTS
   ┌──────────────────┐
   │  /api/db/*       │
   │  (Database API)  │
   └──────────────────┘
   ↑
   │ TODO: Add API authentication
   │ Currently: Open for development
   │ Recommended: JWT or API keys
```

---

## 🎯 Performance Characteristics

```
┌─────────────────────────────────────────────────────────────┐
│                    PERFORMANCE PROFILE                      │
└─────────────────────────────────────────────────────────────┘

BUILD TIME (Dokploy)
┌────────────────────┬──────────┬────────────────────┐
│ Step               │ Duration │ Notes              │
├────────────────────┼──────────┼────────────────────┤
│ npm ci             │ ~45s     │ Downloads packages │
│ npm run build      │ ~5s      │ Static build       │
│ npm run export-db  │ ~2s      │ DB query + write   │
├────────────────────┼──────────┼────────────────────┤
│ TOTAL              │ ~52s     │ Per deployment     │
└────────────────────┴──────────┴────────────────────┘

RUNTIME (User Visit)
┌────────────────────┬──────────┬────────────────────┐
│ Step               │ Duration │ Notes              │
├────────────────────┼──────────┼────────────────────┤
│ HTML download      │ ~100ms   │ Initial page load  │
│ JSON files (2-3)   │ ~50ms    │ Parallel fetch     │
│ DOM manipulation   │ ~5ms     │ Replace content    │
├────────────────────┼──────────┼────────────────────┤
│ TOTAL overhead     │ ~55ms    │ vs static HTML     │
└────────────────────┴──────────┴────────────────────┘

DATABASE QUERIES (Export)
┌────────────────────┬──────────┬────────────────────┐
│ Table              │ Rows     │ Query Time         │
├────────────────────┼──────────┼────────────────────┤
│ text_snippets      │ ~100     │ <10ms              │
│ media_assets       │ ~50      │ <5ms               │
│ encyclopedia       │ ~20      │ <5ms               │
└────────────────────┴──────────┴────────────────────┘

SCALABILITY
┌────────────────────┬──────────┬────────────────────┐
│ Content Size       │ Impact   │ Mitigation         │
├────────────────────┼──────────┼────────────────────┤
│ 1,000 text keys    │ ~50KB    │ Negligible         │
│ 10,000 text keys   │ ~500KB   │ Consider splitting │
│ 100+ images        │ N/A      │ Only refs, not imgs│
└────────────────────┴──────────┴────────────────────┘
```

---

## 🎨 Content Management Patterns

### Pattern 1: Page-Specific Keys
```
Structure: page.<pagename>.<section>.<element>

Example:
- page.home.hero.title
- page.home.hero.subtitle
- page.home.hero.cta
- page.about.hero.title
- page.contact.form.submit
```

### Pattern 2: Shared Content Keys
```
Structure: shared.<category>.<element>

Example:
- shared.nav.home
- shared.nav.about
- shared.footer.copyright
- shared.buttons.learn-more
```

### Pattern 3: Component Keys
```
Structure: component.<name>.<instance>.<element>

Example:
- component.workshop-card.1.title
- component.workshop-card.1.description
- component.workshop-card.2.title
```

---

## 🔄 Recommended Workflow

```
1. CONTENT PLANNING
   Define keys in spreadsheet
   Document naming conventions
   
2. DATABASE POPULATION
   Write SQL scripts for bulk import
   OR use admin UI for individual entries
   
3. HTML MARKUP
   Add data-key attributes to elements
   Test locally with npm start
   
4. DEPLOYMENT
   Push to GitHub
   Dokploy rebuilds automatically
   Verify on live site
   
5. ITERATION
   Edit via admin UI or SQL
   Trigger rebuild
   Content updates live
```

---

This flow diagram provides a visual reference for understanding how data moves through your system from database to live website. Keep this handy as you build out your content!

