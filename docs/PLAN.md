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

## Phase 2 — Cleanup on `main` (done July 2026)

DB confirmed to have no consumers beyond the abandoned editing flows; the
database layer was removed entirely and git is now the single content
source. The Postgres instance itself should be decommissioned (credentials
were exposed in the deleted `setup-env.js` and remain in git history —
rotate/retire them).

Removed all three abandoned editing systems:

- **GitHub-commit admin**: `api/_github.js`, `api/admin-pages.js`,
  `api/admin-slides.js`, `api/admin-events.js`, `admin/static/` placeholder UI.
- **Database-backed editing**: `pg` dependency, `tools/export-db-content.js`,
  `tools/import_exports.js`, `tools/db-content.js`, `tools/seed-demo-texts.js`,
  `test-db-connection.js`, `exports/`, the demo page, and DB-export logic in
  the Express server.
- **Mailpox**: the email webhook block in `admin/server.js` (~650 lines),
  `mailpox-main.zip`.

Also done:

- Removed the runtime `/db/texts.json` loader scripts from both home pages
  and deleted `small-loader.js`.
- Shrunk the Express server to static `public/` + `POST /api/send-email` +
  catch-all; moved from `admin/server.js` to `server/server.js`.
- Deleted cruft (`Dockerfile.backup`, `Dockerfile.simple`, `alternative/`,
  `Procfile`, `start.sh`, stray scripts) and pruned `package.json`
  (`pg`, `cheerio`, `express-basic-auth`, `@anthropic-ai/sdk`, dead scripts).
- Rewrote `README.md`, `DEPLOYMENT.md`, `docs/ARCHITECTURE.md`.

Note: legacy `data-segment-id` / `data-key` attributes in authored HTML are
left for removal during Phase 3.

## Phase 3 — Home page simplification (done July 2026)

Both home pages restructured: hero (copy names all three formats) →
offering cards re-badged LECTURE / WORKSHOP / SEMINAR → compact clients
band (all 23 names; owner prefers logos eventually) → events announcement
panel (the four placeholder event cards were removed; this section is the
landing spot for Phase 4 agent content) → compact membership + contact
cards → footer. "Good/Bad/Ugly" section removed (page still linked from
footer). Legacy `data-segment-id`/`data-key` attributes stripped and the
invalid head/body document structure repaired. EmailJS contact flow
untouched; owner switched EmailJS template recipients to direct Gmail
addresses (July 2026) to bypass Hostinger forwarding blocks.

## Phase 4 — `preview/telegram-agent` branch (built July 2026, awaiting credentials)

Implemented in `agent/` (see `agent/README.md` for setup and env vars):
Telegram long-polling bot (allowlisted chat + user ids), Claude tool-use
editing loop scoped to `src/` and `docs/`, git commit/push to the preview
branch only, `/approve` merge gate (off by default), and the two daily jobs
publishing English posts into `src/content/daily/` rendered at
`pages/daily.html`. Remaining: create the Telegram bot, deploy as a second
Dokploy app (`agent/Dockerfile`), point a preview deployment at the branch,
set env vars. Bilingual (EN/SV) daily posts deferred; posts are EN-only for
now.

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
