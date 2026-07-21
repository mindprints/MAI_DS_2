# MAI Site Dashboard

Desktop admin app for aimuseum.se — manage the home-page slideshow, the AI
agent's prompts and model choices, and see LLM costs, without a terminal.
Design and phases: `../docs/DASHBOARD_PLAN.md`.

The dashboard is **a friendly git client**: every action edits files in a
clone of the site repository, and the **Publish** button commits and pushes
to `main`, which Dokploy deploys (site changes live in ~2 minutes; agent
prompt/model changes apply from its next run — the agent pulls before every
job).

## Two connection modes

- **Managed (recommended, for non-technical admins).** The dashboard keeps
  its **own private clone** in the app's user-data folder and authenticates
  with a stored GitHub access token — no terminal, no shared checkout. On
  first launch it shows a **Connect** panel: enter the repository
  (`owner/name`) and a fine-grained personal access token with **Contents:
  read and write** on that repo. The token is encrypted at rest with the OS
  keychain (Windows DPAPI) via Electron `safeStorage`. Reads (clone, pull)
  use the public repository URL — no token, so they can't hang on
  credentials; the token is used **only for push**, passed as a URL argument
  so it is never written to `.git/config` and never shown again. Connect
  does a no-op dry-run push to verify the token can write before saving it,
  so a bad/expired or under-scoped token fails at Connect with a clear
  message. Git runs non-interactively (`GIT_TERMINAL_PROMPT=0`,
  `GCM_INTERACTIVE=never`, set on the app process — not via simple-git's
  `.env()`, which would trip its unsafe-operations guard on a dev shell's
  editor/ssh env vars).
- **Local (developer).** "Use a local folder instead" points the dashboard
  at an existing checkout and uses ambient git credentials. In this mode it
  **only publishes when the checkout is on `main`** — if you've left it on a
  feature branch it refuses (loudly) rather than pushing the wrong branch.

Either way, **Publish always targets `main`**: it commits your edits, rebases
onto the latest `origin/main` (so the agent's daily posts and other admins'
changes are integrated), and pushes.

## Running (dev)

```bash
cd dashboard
npm install
npm start
```

Requirements on the machine: Node.js + git installed. For managed mode the
app clones the repo itself; for local mode, point at a checkout whose root
has had `npm install` run (the slide pipeline uses the repo's own `sharp`).

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
- **Publish** — commit → rebase onto `origin/main` → push, with your message.
  Until you publish, changes are only in the (managed or local) clone.

## Building the Windows app

```bash
cd dashboard
npm install
npm run dist
```

Output lands in `dashboard/dist/` (gitignored):

- `MAI Dashboard-0.1.0-nsis.exe` — installer, for handing to an admin.
- `MAI Dashboard-0.1.0-portable.exe` — single file, no install, for a USB
  stick or a quick trial.

Neither needs Node, npm, or a checkout on the target machine — only **git**,
which the app shells out to.

If the build dies with `Cannot create symbolic link: A required privilege is
not held by the client`, electron-builder is unpacking its `winCodeSign`
bundle, which contains macOS symlinks Windows won't create without elevation
or Developer Mode. It is only needed for signing, which we don't do, so
pre-populate its cache without the macOS half instead of elevating:

```bash
CACHE="$LOCALAPPDATA/electron-builder/Cache/winCodeSign"
node_modules/7zip-bin/win/x64/7za.exe x "$CACHE/<downloaded>.7z" \
  -o"$CACHE/winCodeSign-2.6.0" '-xr!darwin' -y
```

The app bundles its own `sharp`, so **Add Photos works in managed mode**: the
tool runner puts the bundled `node_modules` on `NODE_PATH`, which Node
searches only *after* the repo's own `node_modules` — so a local checkout
still uses its copy and the managed clone (which has none) falls back to the
bundled one. `sharp` 0.33 ships N-API prebuilt binaries, so it needs no
`electron-rebuild`; it is only `asarUnpack`ed, since a `.node` binary can't
be loaded from inside an asar.

## Not yet done (Phase B follow-ups)

- Code signing — Windows SmartScreen will warn on first run until the
  installer is signed.
- Managed mode currently assumes the site repo is **public** for read (true
  for aimuseum.se); a private repo would need the token on read too.
- Automatic token-expiry detection with a re-connect prompt.
- Richer merge-conflict resolution (today a conflicting concurrent edit is
  reported and left for a retry, not resolved in-app).
