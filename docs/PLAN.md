# Cleanup & Telegram Agent Plan

Drawn up July 2026. Tracks the transition from the abandoned editing experiments
(GitHub-commit admin, database-backed editing, Mailpox email editing) to a
simplified site plus a Telegram-driven AI editing agent.

Everything as it stood before this work is preserved in the
`archive/editing-experiments` branch and the `pre-cleanup-2026-07` tag.

## Phase 1 — Archive (done)

- Tag `pre-cleanup-2026-07` and branch `archive/editing-experiments` created and
  pushed to GitHub.
- `MAILPOX_INTEGRATION.md` and `EMAIL_EDIT_SECURITY.md` moved to
  `docs/reference/` with archive banners; `MAILPOX_GMAIL_TEMPLATES.md` deleted
  (recoverable from the archive branch).
- `DYNAMIC_WEBPAGE_CREATION.md` stays in `docs/` — it documents the current
  template build pipeline, not an experiment.

## Phase 2 — Cleanup on `main`

Remove all three abandoned editing systems:

- **GitHub-commit admin**: `api/_github.js`, `api/admin-pages.js`,
  `api/admin-slides.js`, `api/admin-events.js`, `admin/static/` placeholder UI.
- **Database-backed editing**: `pg` dependency, `tools/export-db-content.js`,
  `tools/import_exports.js`, `tools/db-content.js`, `tools/seed-demo-texts.js`,
  `test-db-connection.js`, `exports/`, the demo page, and DB-export logic in
  the Express server.
- **Mailpox**: the email webhook block in `admin/server.js` (~650 lines),
  `mailpox-main.zip`.

Then:

- Shrink `admin/server.js` to a plain site server (static `public/` +
  `POST /api/send-email` + catch-all); rename directory to `server/`.
- Delete cruft: `Dockerfile.backup`, `Dockerfile.simple`, `alternative/`,
  stray scripts (`create-events.js`, `setup_admin.sh`, ...).
- Prune `package.json`: `pg`, `express-basic-auth`, dead scripts
  (`export-db`, `seed:demo-texts`, `check-db`, `test-db`, `import-db*`).
- Rewrite `README.md` / `docs/ARCHITECTURE.md` to describe only what exists.
- **Open decision**: drop the Postgres database entirely (git becomes the
  single content source). Pending confirmation that nothing else reads it.
- Verify: `npm run build`, local Docker run, deploy to both hosts, click
  through the site, test the contact form.

## Phase 3 — Home page simplification (on `main`)

- Restructure `src/site/index.html` and `src/site/sv/index.html` around
  **Lectures / Seminars / Workshops**: hero → offerings → upcoming events →
  contact CTA. Demote or fold in "Clients", "Good/Bad/Ugly of AI", membership.
- Strip now-meaningless `data-segment-id` attributes.
- Contact/workshop forms: simplify markup and styling only. The EmailJS flow
  (`api/send-email.js`, env vars, rate limiter, CORS allowlist) is unchanged.

## Phase 4 — `preview/telegram-agent` branch

Runs on the Dokploy server (long-running bot process; Vercel Hobby cron is too
limited). Vercel keeps serving stable production until promotion.

1. **Telegram agent service** (new `agent/` directory, second Dokploy app):
   - Bot via long polling, locked to a specific channel/group ID and an
     allowlist of Telegram user IDs.
   - Claude (Agent SDK) edits `src/` in a clone of the repo, runs the build,
     pushes to the preview branch → preview deployment.
   - Replies in Telegram with a preview link + diff summary; `/approve`
     promotes to `main`. The agent never pushes to `main` directly.
2. **Cron job 1 — "On this day in…"**: daily short essay on a
   computing/robotics/ML/AI milestone for that date, rendered through the
   existing template pipeline (journal template is the natural fit).
3. **Cron job 2 — Daily AI news summary**: general-audience roundup across
   research, product releases, laws/regulation, finance. Uses web search.
4. Both cron jobs post their output to the Telegram channel (visibility +
   veto). Open decisions: bilingual EN/SV vs English-only to start;
   auto-publish with Telegram veto (recommended) vs approval-gated.

Needs from the site owner: Telegram bot token + channel ID; Anthropic API key
already in use.

## Phase 5 — Rollout

- Run the preview branch for ~2 weeks; tune prompts and guardrails.
- Merge to `main` when stable; then decide whether to consolidate hosting
  (Dokploy for everything vs keeping the Vercel mirror).
