# MAI Site Dashboard

Desktop admin app for aimuseum.se — manage the home-page slideshow, the AI
agent's prompts and model choices, and see LLM costs, without a terminal.
Design and phases: `../docs/DASHBOARD_PLAN.md`.

The dashboard is **a friendly git client**: every action edits files in your
clone of the site repository, and the **Publish** button commits and pushes
to `main`, which Dokploy deploys (site changes live in ~2 minutes; agent
prompt/model changes apply from its next run — the agent pulls before every
job).

## Running (current dev form)

```bash
cd dashboard
npm install
npm start
```

Requirements on the machine:

- Node.js + git installed, and a clone of this repository with push access
  (the dashboard uses your normal git credentials).
- The repo clone must have had `npm install` run at its root (the slide
  pipeline uses the repo's own `sharp`).

If the dashboard is started from inside the repo (this folder), it finds the
repo automatically; otherwise use **Choose repo…** to point it at your clone.

## What it does

- **Slideshow** — thumbnail grid of the hero rotation. *Add photos…* runs
  the same pipeline as `npm run slides:add` (WebP conversion, max 1920px,
  numbering, manifest regeneration). *Remove* runs `slides-remove.js`.
  EN/SV titles edit `slides.json`.
- **Notice** — the flash banner on both home pages ("Tonight's lecture is
  fully booked"). On/off switch, EN/SV text, optional last-shown day with
  quick-set buttons; expiry is checked in the visitor's browser
  (`src/site/assets/js/notice.js` reading `/content/notice.json`), so a
  dated notice disappears on its own without a rebuild.
- **Prompts** — edit the daily-job prompts and the Telegram editor's system
  prompt (`agent/prompts/*.md`). `{{placeholders}}` must be kept.
- **Models & costs** — per-job provider/model choice written to
  `agent/settings.json` (Anthropic or OpenRouter — OpenRouter's catalog is
  fetched live for autocomplete), plus cost tiles, a 30-day daily-cost
  chart, and a per-model table from `reports/llm-usage.jsonl`.
- **Publish** — pull → commit → push with your message. Until you publish,
  changes are only in your local clone.

## Not yet done (Phase B follow-ups)

- Packaged installers (electron-builder) so admins don't need Node/npm.
- Git-less operation for non-technical admins (bundled git or
  isomorphic-git + a GitHub fine-grained PAT stored via `safeStorage`).
- Conflict UX beyond pull-before-publish.
