# Desktop Admin Dashboard Plan

Drawn up July 2026. Goal: let non-technical museum admins manage the site
without Claude Code or a terminal — visual slide management, editing the
daily-job prompts, choosing LLM vendor/model per job, and seeing what the
LLM usage costs — while avoiding vendor lock-in.

## Design rule (learned from the abandoned editing experiments)

The July 2026 cleanup removed three admin systems (GitHub-commit admin,
DB-backed editing, Mailpox) that failed by creating parallel content stores
and hosted admin surfaces. The dashboard follows the rule that made the
Telegram agent survive: **git stays the only content store; the dashboard is
a friendly git client and nothing else.** No companion server, no database,
no sync problem. It commits to `main`; Dokploy deploys, exactly as for the
Telegram agent.

Because the agent pulls the repo before every job and reads prompts
(`agent/prompts/`), settings (`agent/settings.json`), and appends usage
(`reports/llm-usage.jsonl`) from the clone, a dashboard commit reconfigures
the daily jobs on their next run with no redeploy.

## Technology: Electron

Chosen over Tauri for one decisive reason: the whole site toolchain is Node
(sharp image pipeline, slides manifest generator, build scripts), and
Electron runs it in-process. Tauri would need a bundled Node sidecar for
sharp, erasing its size advantage.

- Git access: per-admin fine-grained GitHub PAT (Contents read/write on this
  repo only), stored via Electron `safeStorage` in the OS credential store.
  Commits are attributable per admin and revocable per person.
- Repo access: local clone managed by the app (simple-git or bundled git);
  pull before every commit, small single-file commits to minimize conflicts.

## Phases

### Phase A — repo groundwork (done July 2026, this branch)

No GUI; makes the repo dashboard-ready and is useful on its own:

1. Prompts externalized to `agent/prompts/*.md` with `{{placeholders}}`
   (daily jobs + editor system prompt). Prompt history = git history.
2. `agent/settings.json`: per-job provider/model, editor model, price table.
   Empty values fall back to env vars, so behavior is unchanged until an
   admin (or the dashboard) sets something.
3. Usage logging: every LLM call appends a JSON line (tokens, searches,
   estimated USD) to `reports/llm-usage.jsonl`, committed with the content
   it produced. The agent self-reports — no Anthropic admin key ever needs
   to exist on an admin's machine.

### Phase B — dashboard MVP (first cut July 2026: `dashboard/`)

Implemented as an Electron app in `dashboard/` (see its README). Runs from
source (`npm start`); packaged installers are the remaining Phase B work.

**Connection (July 2026):** two modes. *Managed* — the app owns a private
clone in its user-data folder and authenticates with a GitHub fine-grained
token stored encrypted via `safeStorage` (OS keychain), injected only as an
HTTP auth header and never persisted to `.git/config`; all git runs
non-interactively so a bad token fails fast instead of hanging. This is the
"access outside the CLI" path for non-technical admins — a first-run Connect
panel takes a repo + token and clones. *Local* — a developer points at an
existing checkout. Both modes publish only to `main` (managed keeps its clone
on main; local refuses to publish off-main), committing then rebasing onto
`origin/main` before pushing, so concurrent agent posts and other admins'
edits are integrated. This replaced the original shared-dev-clone assumption,
which made the dashboard see the developer's uncommitted files as "pending"
and could push the wrong branch.

- **Slides manager**: thumbnail grid from `slides.json`; drag-and-drop add
  (reuses `tools/slides-add.js` pipeline: WebP conversion, numbering,
  manifest regeneration), remove, EN/SV titles.
- **Prompt studio**: view/edit `agent/prompts/*.md`, diff against history,
  revert (git provides all of this).
- **Model & cost panel**: vendor/model picker per job writing
  `agent/settings.json` (Anthropic models + OpenRouter catalog — OpenRouter
  is the anti-lock-in lever, already wired into the agent); charts from
  `reports/llm-usage.jsonl` (cost per post / month / model).
- Commit + push + "site will update in ~2 minutes" feedback.

### Phase C — structured text editing

Form-based editing for structured regions only: hero copy, offering cards,
events panel, membership/contact cards. Free-form page HTML stays with the
Telegram agent / Claude Code — a GUI over hand-authored HTML is the swamp
the abandoned experiments drowned in.

## Non-goals

- No hosted admin panel, no auth server, no database.
- No GUI editing of arbitrary `src/site/` HTML.
- The dashboard never calls an LLM itself (Phase B); deterministic
  operations only. Conversational editing remains the Telegram agent's job.
