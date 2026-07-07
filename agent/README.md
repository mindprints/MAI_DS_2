# MAI Telegram Editing Agent

A long-running Node service that lets museum staff edit the website by
sending instructions to a Telegram bot, and that publishes two daily posts:

- **On this day** (default 07:30 Stockholm) — a short essay on a
  computing/robotics/ML/AI milestone that happened on today's date.
- **AI news** (default 17:30 Stockholm) — a general-audience roundup of the
  day's AI news (research, products, regulation, finance), written with
  live web search.

Posts land in `src/content/daily/` and are rendered by the existing build
into `pages/daily.html` (index) and `pages/daily/<date>-<type>.html`.

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
   Dockerfile path `agent/Dockerfile`, on the preview branch, with the
   environment variables below.
6. Point a preview deployment (Vercel preview or a third Dokploy app) at
   the preview branch and set `PREVIEW_URL` to its address.

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
PREVIEW_URL=https://preview.aimuseum.se

# Optional (defaults shown)
ANTHROPIC_MODEL=claude-sonnet-5
AGENT_BRANCH=preview/telegram-agent
MAIN_BRANCH=main
AGENT_ALLOW_APPROVE=false
AGENT_TIMEZONE=Europe/Stockholm
AGENT_ONTHISDAY_TIME=07:30
AGENT_NEWS_TIME=17:30
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
