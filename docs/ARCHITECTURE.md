# MAI_DS_2 – Architecture and Developer Guide

This document describes the structure of the site, how content is authored
and built, and how deployments work. Updated July 2026 after the removal of
the abandoned editing experiments (see `PLAN.md`; old code lives in the
`archive/editing-experiments` branch).

---

## High-level overview

- **Static-first site** with a small build pipeline that copies curated
  source files and renders template-driven pages.
- **Two content sources**:
  - Hand-authored HTML in `src/site/` (including both home pages).
  - Template-rendered pages defined in `src/content/pages/` using
    `src/templates/pages/`.
- **Slideshows** are data-driven via a manifest
  (`src/site/images/slide/slides.json`) consumed by
  `src/site/assets/js/script.js`.
- **No database, no admin UI.** Git is the single source of truth for
  content. Editing happens in the repository (a Telegram-driven AI editing
  agent is planned — see `PLAN.md` Phase 4).

---

## Repository layout (key directories)

```
MAI_DS_2/
  api/                       # Vercel serverless functions (CommonJS/Edge)
    send-email.js            # EmailJS contact endpoint (Vercel serverless)
    send-email-express.js    # Same handler as Express middleware (Dokploy)
    og-image.js              # OG-image lookup for journal covers (Edge)
    substack.js              # Substack RSS proxy for the journal (Edge)

  server/
    server.js                # Express server: static public/ + /api/send-email

  src/
    site/                    # Primary authored site (copied to public/)
      assets/js/script.js    # Slideshow + UI behavior; loads slides manifest
      images/slide/          # Slideshow images + slides.json manifest
      index.html             # English home page (hand-authored)
      sv/index.html          # Swedish home page (hand-authored)
      pages/…                # Authored static subpages
      journal.js             # Journal page: Substack feed rendering
    content/pages/           # Template-driven localized pages
      *.en.html / *.sv.html  # EN/SV partials
      *.js                   # Per-page module describing locales + template
    content/encyclopedia/    # Encyclopedia entry partials (EN/SV)
    templates/pages/         # HTML templates used by build-pages.js
    tailwind.css             # Tailwind entry (built to public/)

  tools/
    build-static.js          # Copies src/site → public/
    build-pages.js           # Renders content modules with templates
    generate-slides-manifest.js
    optimize-images.js

  public/                    # Build output (git-ignored; recreated on build)
  config/env.example         # Environment variable template
  docs/                      # This document, PLAN.md, reference/
```

---

## Authoring model

- `src/site/` is the canonical source for most static pages and assets.
  Never edit `public/` directly; it is overwritten on every build.
- The two home pages are hand-authored:
  `src/site/index.html` (EN) and `src/site/sv/index.html` (SV).
- Reusable, localized pages (privacy, learn-more, encyclopedia, …) are built
  from `src/content/pages/` modules: a module exports
  `{ template, locales }`, each locale providing `output`, `lang`, `title`,
  and HTML partials via a `load('*.en.html')` helper. The build renders
  `src/templates/pages/<template>.html` with `{{ variable }}` placeholders.
- Encyclopedia entries live as EN/SV partial pairs in
  `src/content/encyclopedia/`; `encyclopedia.entry.js` renders one page per
  entry per locale plus a JSON index.

---

## Slideshows

- Images live under `src/site/images/slide/` with a `slides.json` manifest
  read by `script.js` at runtime.
- `npm run generate:slides` (re)generates the manifest, preserving existing
  per-item metadata and optional `i18n` fields.
- `npm run optimize` resizes/optimizes the slide images in place.

---

## Build pipeline

`npm run build` performs:
1. `build:static` — cleans `public/` and copies everything under `src/site/`.
2. `build:pages` — renders `src/content/pages/` modules into `public/`.
3. `build:css` — compiles Tailwind to `public/assets/css/tailwind.css`.

---

## Serving and deployment

- **Vercel** (static): `vercel.json` sets build command `npm run build` and
  output directory `public`. The `api/` folder provides serverless endpoints
  (contact email, journal feeds).
- **Dokploy** (Docker): the `Dockerfile` builds the site and starts
  `server/server.js` via `npm start`. The Express server serves `public/`,
  mounts `POST /api/send-email`, and falls back to `index.html` for unknown
  non-API paths.

Environment variables are documented in `config/env.example` (EmailJS keys
and the CORS origin allowlist).

---

## Journal page

`src/site/journal.js` fetches the Substack RSS feed through
`/api/substack` (proxy avoids CORS) and resolves cover images through
`/api/og-image`. Both are Vercel Edge functions and exist only on the
Vercel deployment; the script calls them same-origin and degrades gracefully
where they are absent (e.g., on Dokploy, feed covers fall back).

---

## Conventions

- Do not edit `public/` directly.
- `src/site/` is copied verbatim by the build — keep paths consistent.
- New localized pages should mirror the existing `src/content/pages/`
  module pattern.
- The slides manifest (`slides.json`) is part of the source.
- Legacy `data-segment-id` / `data-key` attributes may still appear in some
  authored HTML; they belonged to the removed editing systems and are
  scheduled for removal during the home-page simplification (PLAN Phase 3).
