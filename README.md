# Museum of Artificial Intelligence Website

A modern, responsive website for the Museum of Artificial Intelligence
(aimuseum.se) featuring interactive slideshows, smooth animations, and
bilingual content (English/Swedish).

The site is static-first: all content is authored in the repository, built
into `public/`, and served either by Vercel (static) or by a small Express
server on Dokploy. There is no database and no admin interface.

> Looking for the old editing experiments (database admin, GitHub-commit
> admin, Mailpox email editing)? They were removed in July 2026. See
> `docs/PLAN.md`; the code is preserved in the `archive/editing-experiments`
> branch and the `pre-cleanup-2026-07` tag.

## Project Layout

```
MAI_DS_2/
|- src/
|  |- site/                 # Hand-authored HTML, images, JS, CSS (incl. both home pages)
|  |- templates/pages/      # Shared HTML templates for localized pages
|  |- content/pages/        # Per-page modules pairing EN/SV partials with templates
|  |- content/encyclopedia/ # Encyclopedia entry partials (EN/SV)
|  |- tailwind.css          # Tailwind entry point
|- tools/
|  |- build-static.js       # Copies src/site to public/
|  |- build-pages.js        # Renders templates + content into public/
|  |- generate-slides-manifest.js
|  |- optimize-images.js
|- server/
|  |- server.js             # Express server: static public/ + POST /api/send-email
|- agent/                   # Telegram editing agent + daily content jobs (see agent/README.md)
|- api/                     # Vercel serverless endpoints
|  |- send-email.js         # EmailJS contact form endpoint (Vercel)
|  |- send-email-express.js # Same handler for the Express server
|  |- og-image.js           # OG-image lookup for journal covers (Edge)
|  |- substack.js           # Substack RSS proxy for the journal page (Edge)
|- public/                  # Build output (generated; do not edit)
|- docs/                    # Documentation (see ARCHITECTURE.md, PLAN.md)
|- config/env.example       # Environment variable template
```

All authored input lives under `src/`. The `public/` directory is generated
at build time and must not be edited by hand.

## Building

```bash
npm install            # One-time setup
npm run build          # Copies, renders, and compiles assets into public/
```

The build runs three steps:
1. `tools/build-static.js` copies everything in `src/site` to `public/`.
2. `tools/build-pages.js` renders localized templates from `src/content/`.
3. PostCSS compiles Tailwind to `public/assets/css/tailwind.css`.

## Running

```bash
npm start              # Express server (serves public/ + email API), port 5179
# or preview the static build alone:
npx serve public
```

## Deployment

- **Vercel**: configured via `vercel.json` (build command `npm run build`,
  output directory `public`). Serverless endpoints under `api/` provide the
  contact form and journal feeds.
- **Dokploy**: Docker build via `Dockerfile` / `dokploy.json`. The container
  builds the site and runs the Express server (`npm start`).

See `DEPLOYMENT.md` for details.

## Email Sending (Contact Forms)

Contact and workshop forms send email server-side through the EmailJS REST
API — `api/send-email.js` on Vercel, the same handler mounted in
`server/server.js` on Dokploy. Configure these environment variables in your
hosting provider or a local `.env` (never commit secrets):

```
EMAILJS_SERVICE_ID=service_xxxxxxx
EMAILJS_PRIVATE_KEY=prv_xxxxxxxxxxxxxxxxxxxxxxxxx
EMAILJS_PUBLIC_KEY=your_public_key_here
EMAILJS_TEMPLATE_CONTACT=template_contact_id
EMAILJS_TEMPLATE_WORKSHOP=template_workshop_id
ALLOWED_ORIGINS=https://aimuseum.se,https://www.aimuseum.se,http://localhost:3000
```

Start from `config/env.example`. The endpoint includes a lightweight rate
limiter and origin allowlist; in the EmailJS dashboard, also enable domain
restrictions for the public site domains.

## Image Utilities

- `npm run optimize` — optimize slideshow images in `src/site/images/slide`
- `npm run generate:slides` — regenerate the `slides.json` manifest

## Development Notes

- Tailwind scans `src/site/**/*.html`, `src/templates/**/*.html`, and JS under
  `src/site/assets/js/` plus `src/site/journal.js`.
- Client-side logic lives in `src/site/assets/js/script.js` (slideshow, UI)
  and `src/site/journal.js` (Substack feed rendering).
- Localized pages pair entries in `src/content/` with templates in
  `src/templates/`; the build renders language variants into `public/`.

## Roadmap

See `docs/PLAN.md`: home page simplification and a Telegram-driven AI editing
agent with daily content jobs are planned next.
