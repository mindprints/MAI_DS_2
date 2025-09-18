## MAI_DS_2 – Architecture and Developer Guide

This document describes the current structure of the site, how content is authored and built, and how deployments work (locally and on Vercel). It is intended to guide future features like the planned AI Encyclopedia so they fit cleanly into the existing pipeline.

---

### High‑level overview
- **Static-first site** with a small build pipeline that copies curated source files and renders a few template-driven pages.
- **Two content sources**:
  - Hand-authored HTML in `src/site/` (including the home pages).
  - Template-rendered pages defined in `src/content/pages/` using `src/templates/pages/`.
- **Slideshows** are data-driven via a manifest (`src/site/images/slide/slides.json`) consumed by `src/site/assets/js/script.js`.
- **Admin editing** is available in two modes:
  - Local Node server at `npm run admin` for text-only edits and slide management (no Git writes).
  - Vercel-hosted admin at `/admin` using serverless APIs that commit directly to GitHub and trigger deploys.

---

### Repository layout (key directories)

```
MAI_DS_2/
  api/                       # Vercel serverless functions (CommonJS)
    _github.js               # GitHub Contents API helper
    admin-pages.js           # Text-only page editing via GitHub
    admin-slides.js          # Slides manifest/files via GitHub

  admin/
    server.js                # Local admin API (Express)
    static/                  # Admin UI (served on Vercel at /admin/ and locally by server)
      index.html

  src/
    site/                    # Primary authored site (copied to public/)
      assets/
        css/                 # Additional authored CSS in site scope
        js/
          script.js          # Slideshow + UI behavior; loads slides manifest
      images/                # Images (copied as-is)
        slide/               # Slideshow images + slides.json manifest
      index.html             # English home page (authored by hand)
      sv/index.html          # Swedish home page (authored by hand)
      pages/…                # Authored static subpages

    content/pages/           # Template-driven localized pages (see templates)
      *.en.html              # EN partials
      *.sv.html              # SV partials
      *.js                   # Per-page module describing locales + template

    templates/pages/         # HTML templates used by build-pages.js
      standard.html
      journal.html
      …

    tailwind.css             # Tailwind entry (built to /public)

  tools/
    build-static.js          # Copies src/site → public, also copies admin/static → public/admin
    build-pages.js           # Renders content modules with templates (localized pages)
    generate-slides-manifest.js # Scans slide images and writes slides.json (preserves metadata)
    optimize-images.js       # Optional, resizes/optimizes images in-place

  public/                    # Build output (git-ignored; recreated on build)

  docs/
    ARCHITECTURE.md          # This document

  package.json
  vercel.json                # Vercel build config (build → public)
```

---

### Authoring model

- `src/site/` is the canonical source for most static pages and assets. Do not edit files in `public/` directly; they are overwritten on every build.
- The two home pages are hand-authored:
  - `src/site/index.html` (EN)
  - `src/site/sv/index.html` (SV)
- Reusable, localized pages (e.g., privacy, learn-more, research-index) are built from `src/content/pages/` modules:
  - A module exports `{ template, locales, prepare? }`.
  - Each locale entry provides `output`, `lang`, `title`, and HTML partials via a `load('*.en.html')` or `load('*.sv.html')` helper.
  - Build renders with `src/templates/pages/<template>.html` using `{{ variable }}` placeholders.

Example (trimmed from existing modules):
```js
module.exports = {
  template: 'standard',
  locales: {
    en: {
      output: 'pages/privacy.html',
      lang: 'en',
      title: 'Privacy Policy • Museum of AI',
      assetsPrefix: '..',
      mainContent: load('privacy.en.html')
    },
    sv: {
      output: 'sv/pages/privacy.html',
      lang: 'sv',
      title: 'Integritetspolicy • Museum of AI',
      assetsPrefix: '../..',
      mainContent: load('privacy.sv.html')
    }
  }
}
```

---

### Slideshows
- Images live under `src/site/images/slide/`.
- A manifest `slides.json` is read by `src/site/assets/js/script.js` at runtime.
- The script determines the correct image base path based on the current page location and renders a rotating set of slides.
- `tools/generate-slides-manifest.js` can (re)generate the manifest, preserving existing per-item metadata and optional `i18n` fields if present.
- The admin UI lets editors:
  - Upload/delete slide images.
  - Edit `title`/`description` (and optional `i18n.en/sv` fields) and the ordering `number`.

Note: The runtime script currently reads `title`/`description`. If `i18n` becomes standard across all slides, we can extend the runtime to prefer `item.i18n[lang]` when present.

---

### Build pipeline

`npm run build` performs:
1) `build:static` → `node tools/build-static.js`
   - Cleans `public/` and copies everything under `src/site/` to `public/`.
   - Copies the admin UI: `admin/static` → `public/admin/` (so Vercel can serve it at `/admin`).
2) `build:pages` → `node tools/build-pages.js`
   - Loads modules in `src/content/pages/` and renders each locale with its template into `public/`.
3) `build:css` → `postcss src/tailwind.css -o public/assets/css/tailwind.css`
   - Compiles Tailwind to a single CSS file for production.

Optional developer tools:
- `npm run generate:slides` → regenerate `slides.json` from available images.
- `npm run optimize` → in-place image optimization under `src/site/images/slide`.

`vercel.json`:
```json
{
  "cleanUrls": true,
  "buildCommand": "npm run build",
  "outputDirectory": "public"
}
```

---

### Admin editing

Admin UI is available in two modes:

1) Local dev admin
   - Start with `npm run admin` (Express server in `admin/server.js`).
   - Opens APIs at `/api/...`:
     - `GET /api/pages` → slugs
     - `GET/PUT /api/page-segments/:slug?locale=en|sv` → text-only segments (no code edits)
     - `GET/PUT/POST/DELETE /api/slides` → list/save/upload/delete
     - `POST /api/build` → local build
   - UI served at `http://localhost:5179/admin/`.

2) Vercel admin (production)
   - Static UI at `/admin/` (copied into `public/admin/`).
   - Serverless APIs under `api/`:
     - `api/admin-pages.js` → text-only segments via GitHub commits
     - `api/admin-slides.js` → slides manifest/files via GitHub commits
   - After each write, a **deploy hook** is posted to trigger a Vercel rebuild.

Admin environment variables (Vercel → Project Settings → Environment Variables):
- `GITHUB_REPO`      e.g., `mindprints/MAI_DS_2`
- `GITHUB_BRANCH`    e.g., `main`
- `GITHUB_TOKEN`     personal access token (fine-grained: Contents RW, Metadata R)
- `VERCEL_DEPLOY_HOOK_URL`  deploy hook URL for the project/branch

Local/production detection is automatic in the admin UI; it targets `/api/admin-*` only when hosted on a `*.vercel.app` domain.

---

### Git/Vercel deployment flow
- Main branch (`main`) is connected to Vercel and deploys from the `public/` folder after build.
- Vercel-hosted admin commits use GitHub Contents API and trigger the deploy hook, creating a new Production deployment.
- If branch protections require PRs/checks, direct commits will be blocked; either relax protections for the admin token or switch the admin to branch+PR flow.

Conflict note: Because builds can regenerate files while rebasing, you might see conflicts when pulling after Vercel/admin edits. Typical fix:
```
# resolve conflicts, stage files
git add <files>
# continue the rebase
git rebase --continue
# or unstage extras and continue
git restore --staged <files> && git rebase --continue
```

---

### Conventions and notes
- Do not edit `public/` directly.
- `src/site/` is authoritative for static HTML, images, and JS. The build copies it verbatim (except admin copying) – keep paths consistent.
- Localized pages use the page modules and templates; if adding new localized pages, mirror the existing pattern.
- Slides manifest is considered part of the source (`src/site/images/slide/slides.json`) – it is updated by admin or generator.
- The home pages (`src/site/index.html` & `src/site/sv/index.html`) are hand-authored; edits can be made via Vercel admin text segments (only text nodes) or directly in source.

---

### Integrating an AI Encyclopedia (recommended approach)

Goal: add a browsable, localized encyclopedia that fits the existing build and admin flows.

Suggested structure:
1) **Source location**
   - Create `src/content/encyclopedia/` to hold entries as partial HTML files:
     - `term-id.en.html`
     - `term-id.sv.html`
   - Each entry is purely content (no scripts/styles).

2) **Templates and rendering**
   - Add one or more templates in `src/templates/pages/`:
     - `encyclopedia-entry.html` for the entry page layout.
     - `encyclopedia-index.html` for the alphabetical or tagged index.
   - Create modules in `src/content/pages/`:
     - `encyclopedia-entry.js` → renders a single entry per locale given a `slug` and outputs to `pages/encyclopedia/<slug>.html` and `sv/pages/encyclopedia/<slug>.html`.
       - Implementation can iterate all files in `src/content/encyclopedia/` during build and generate N outputs per locale.
     - `encyclopedia-index.js` → renders an index page that links to all entries.

3) **Localization**
   - Keep EN/SV entry partials side-by-side (mirrors existing pattern).
   - The admin can be extended to list encyclopedia entries and expose text segments for edits (same text-only approach).

4) **Slides/Assets (optional)**
   - If entries include images, store them under `src/site/images/encyclopedia/<slug>/...` with relative links in the partials.

5) **Search (optional)**
   - Start with a simple client-side filter on the index page.
   - Later, add a lightweight JSON index (generated during build) for faster fuzzy search.

6) **Routing**
   - EN: `public/pages/encyclopedia/<slug>.html`
   - SV: `public/sv/pages/encyclopedia/<slug>.html`

7) **Admin impact**
   - The Vercel admin already supports text-only segment editing. Extend it to:
     - Discover encyclopedia entries (list files under `src/content/encyclopedia/` via serverless `admin-pages` list call – we can add a filter/prefix).
     - Expose segments for each entry per locale.

This plan stays consistent with the current build process (template rendering + static copy) and the dual admin flows.

---

### Key commands
- Build everything locally:
```
npm run build
```
- Start local admin:
```
npm run admin
# open http://localhost:5179/admin/
```
- Regenerate slides manifest:
```
npm run generate:slides
```
- Optimize slides images:
```
npm run optimize
```

---

### Troubleshooting
- Admin edits on Vercel not visible:
  - Check for new commits on GitHub and a new Vercel deployment (deploy hook).
  - Hard refresh or add `?v=timestamp` to bypass CDN cache.
- Merge conflicts after admin edits:
  - Resolve conflicts in affected files (often `src/site/index.html` or localized partials), `git add`, then `git rebase --continue`.
- 404 on local admin endpoints:
  - Ensure you’re opening the local admin server (`npm run admin`) and not the static `/public/admin/` copy. Local endpoints are under `/api/*`.

---

If you’d like, I can scaffold the encyclopedia templates/modules and extend the admin to list/edit encyclopedia entries next.
