# MAI Telegram Editing Agent

A long-running Node service that lets museum staff edit the website by
sending instructions to a Telegram bot, and that publishes two daily posts:

- **AI news** (default 06:00 Stockholm) — a general-audience roundup of the
  day's AI news (research, products, regulation, finance), written with
  live web search.
- **On this day** (default 06:10 Stockholm) — a short essay on a
  computing/robotics/ML/AI milestone that happened on today's date.

The whole home page therefore resets in the morning before 06:30.

It also refreshes two small data snapshots daily, rendered as home page
cards by `tools/inject-daily.js`:

- **LLM intelligence** (default 06:20 Stockholm) — top LLMs by
  [Artificial Analysis](https://artificialanalysis.ai/) Intelligence Index,
  closed vs open weights, saved to `src/content/llm-index.json`.
  Requires `AA_API_KEY`; skipped if unset.
- **LLM usage** (default 06:25 Stockholm) — share of tokens routed through
  [OpenRouter](https://openrouter.ai/rankings) over the last 7 complete
  days, top models and top AI labs, saved to `src/content/llm-usage.json`.
  Deliberately one named lens (developer/agent API traffic), not a claim
  about world usage; OpenRouter's required citation is rendered on the
  card. Requires `OPENROUTER_API_KEY` (any valid key); skipped if unset.

Posts land in `src/content/daily/` and are rendered by the existing build
into `pages/daily.html` (index) and `pages/daily/<date>-<type>.html`.

## Prompts, settings, and usage log (repo-driven)

Three things are read from the **working repo clone** (not the agent image)
at job time, so committing a change to `main` reconfigures the agent on its
next run with no redeploy:

- **Prompts** — `agent/prompts/*.md`. The daily-job prompts
  (`on-this-day.md`, `ai-news.md`, shared fragments under `shared/`) and the
  Telegram editor's system prompt (`editor-system.md`). `{{placeholders}}`
  are filled in by `agent/prompts.js`; an unknown placeholder throws rather
  than publishing a broken post.
- **Settings** — `agent/settings.json`. Per-job provider/model
  (`generation.onthisday`, `generation.ainews`; provider `anthropic` or
  `openrouter`), the editor model (`editorModel`), and the price table used
  for cost logging. Empty strings mean "fall back to the env vars"
  (`ANTHROPIC_MODEL`, `OPENROUTER_MODEL`), which preserves the original
  behavior when the file is absent.
- **Usage log** — every LLM call appends one JSON line to
  `reports/llm-usage.jsonl` (timestamp, job, provider, model, tokens,
  searches, estimated USD cost) and it is committed together with the post
  or edit it belongs to. OpenRouter calls log the exact cost reported by
  OpenRouter; Anthropic calls compute cost from the `prices` table in
  `agent/settings.json` (web search billed at `webSearchPer1000`, currently
  $10/1000 searches).

These three are the groundwork for the planned desktop admin dashboard
(see `docs/DASHBOARD_PLAN.md`): the dashboard edits/commits these files and
charts the usage log, without any server-side admin surface.

## Safety model

- The agent pushes to `AGENT_BRANCH`. In production (since July 2026)
  that is `main`, so daily posts and edits go live directly — the
  after-the-fact veto is that every change is announced in the Telegram
  chat and can be reverted by instruction. Point `AGENT_BRANCH` at a
  preview branch instead to restore approval-gated publishing
  (`/approve` merges it into `MAIN_BRANCH` when
  `AGENT_ALLOW_APPROVE=true`).
- Only messages from `TELEGRAM_ALLOWED_USER_IDS` in `TELEGRAM_CHAT_ID` are
  accepted; everything else is silently ignored.
- File edits are restricted to `src/` and `docs/`, and the agent
  validates the site build before pushing.

## Telegram commands

Plain message → treated as an edit instruction ("Change the hero text…").

- `/status` — branch, last commit, pending changes, job times
- `/diff` — working-tree diff stat
- `/ontoday [event]` — run the on-this-day job now; with an event, regenerate today's essay about it
- `/news [topic]` — run the AI news job now; with a topic, regenerate today's briefing with it as lead story
- `/llmindex` — refresh the LLM leaderboard card now
- `/llmusage` — refresh the OpenRouter usage card now
- `/approve` — merge preview branch into main (if enabled)
- `/help`

## Setup

1. Create a bot with [@BotFather](https://t.me/BotFather) → get
   `TELEGRAM_BOT_TOKEN`.
2. Add the bot to your private group/channel. Get the chat id (e.g. forward
   a message to @userinfobot, or check `getUpdates`); group ids are negative
   numbers like `-1001234567890`.
3. Get each editor's numeric Telegram user id (also via @userinfobot).
4. Create a fine-grained GitHub token with Contents read/write on this repo.
5. Deploy on Dokploy as a **second application** from this repo with
   Dockerfile path `agent/Dockerfile`, on `AGENT_BRANCH`, with the
   environment variables below. In production that is `main` and
   `PREVIEW_URL` is the live site (the dedicated preview deployment was
   retired in July 2026).

## Environment variables

```
# Required
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_ALLOWED_USER_IDS=11111111,22222222
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_REPO=mindprints/MAI_DS_2      # required in Docker (clone at boot)
GITHUB_TOKEN=github_pat_...          # required in Docker

# Strongly recommended
TELEGRAM_CHAT_ID=-1001234567890      # lock the bot to one chat
PREVIEW_URL=https://aimuseum.se      # where published links point

# Optional (defaults shown)
AA_API_KEY=aa_...                    # Artificial Analysis; enables the LLM leaderboard card
AGENT_LLMINDEX_TIME=06:20
OPENROUTER_API_KEY=sk-or-...         # OpenRouter; enables the LLM usage card
AGENT_LLMUSAGE_TIME=06:25
ANTHROPIC_MODEL=claude-sonnet-5
AGENT_BRANCH=preview/telegram-agent
MAIN_BRANCH=main
AGENT_ALLOW_APPROVE=false
AGENT_TIMEZONE=Europe/Stockholm
AGENT_ONTHISDAY_TIME=06:10
AGENT_NEWS_TIME=06:00
AGENT_QUIZ_TIME=06:40                # monthly quiz draft (drafts only, never publishes)
AGENT_QUIZ_DAY=1                     # day of month, clamped to 1-28 so February still fires
GIT_USER_NAME=MAI Telegram Agent
GIT_USER_EMAIL=agent@aimuseum.se
REPO_DIR=/work                       # set automatically in Docker
```

## Local development

From a checkout of the preview branch:

```bash
# .env with at least TELEGRAM_BOT_TOKEN, TELEGRAM_ALLOWED_USER_IDS,
# ANTHROPIC_API_KEY (REPO_DIR defaults to the checkout itself)
node agent/index.js
```

Job dry runs without Telegram:

```bash
node -e "require('./agent/jobs').runOnThisDay({force:true}).then(console.log)"
```
