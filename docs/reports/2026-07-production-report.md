# Production Report: The MAI Website — What We Built and What It Took

*Museum of Artificial Intelligence · 12 July 2026 · Covers the finished
production at aimuseum.se — the site, its design system, the automated
content pipeline, and the operational infrastructure — together with an
honest account of the hurdles met while refining it.*

---

## 1. The finished production

### 1.1 What a visitor sees

aimuseum.se is the bilingual (English/Swedish) public face of the Museum of
Artificial Intelligence, an independent non-profit in Stockholm. The site
presents the museum's mission — *to educate, not to sell* — through a small,
deliberate set of pages:

- **The home page**, redesigned in July 2026 as a "gallery hall": the visitor
  walks past numbered halls. *Hall 01 — Program* presents the three offering
  formats (lecture, workshop, seminar). *Hall 02 — Live* is the museum's
  daily-refreshed wing (see §1.3). *Hall 03 — Guestbook* lists the 24 client
  organizations that have learned with us, from Dramaten to the University of
  San Diego. *Hall 04 — Visit* carries the booking, membership, and contact
  calls to action.
- **Interior pages** — Explore, About, Contact, Membership, Tailored
  sessions, Plan-a-workshop, Events, Journal, Privacy, and the Daily AI
  archive — all rendered in the same design language.
- **The Daily AI page**, an archive of the automatically published daily
  content with a monthly index.

The design system ("gallery hall") is a warm near-black wall (`#0b0c0f`)
with a faint architectural grid, warm-ivory text, a single brass accent
(`#d4a04f`), Fraunces serif display headings, and IBM Plex Mono for
wayfinding labels. It was introduced on the home pages and then extended to
every interior page (§2.6), so the whole site now reads as one building.

### 1.2 The content architecture

The site is static-first and git is the single source of truth. There is no
database and no admin UI — a deliberate outcome, not an accident (§2.1).

Content comes from two sources:

1. **Hand-authored HTML** in `src/site/` — both home pages and the static
   assets. Copied verbatim to `public/` by the build.
2. **Template-rendered pages** in `src/content/pages/` — each page is a
   small JS module declaring its template, locales, and HTML partials
   (`*.en.html` / `*.sv.html`). `tools/build-pages.js` renders them through
   `src/templates/pages/*.html` with `{{ variable }}` placeholders.
   One partial edit updates both language versions' shells consistently.

`npm run build` runs four steps: copy static sources, render template
pages, compile Tailwind, and inject the daily content into the built home
pages (`tools/inject-daily.js`). The output directory `public/` is
git-ignored and rebuilt from scratch on every deploy.

### 1.3 The living museum: automated daily content

The distinctive feature of the production is that part of the museum
rewrites itself every morning. A long-running agent process (see §1.4) runs
four scheduled jobs on Stockholm time:

| Time | Job | Output |
|---|---|---|
| 06:00 | AI news briefing | Bilingual roundup of the day's AI news (with web search) |
| 06:10 | "On this day" | Bilingual short essay on a dated milestone in computing/AI history |
| 06:20 | LLM intelligence index | Leaderboard card data from the Artificial Analysis Intelligence Index |
| 06:25 | LLM usage | OpenRouter model-usage rankings and chat-app market share |

Each job writes into `src/content/` (daily HTML posts and JSON data files),
commits, and pushes straight to `main` — which triggers a production
redeploy. Every action is announced in the museum's Telegram chat, which
serves as the veto mechanism: a human sees everything the agent publishes,
minutes after it happens. Hall 02 on the home page presents the result as
"today at the museum": the archive essay, the news briefing, and three live
data cards, plus a framed artwork that rotates daily from the slide
collection.

### 1.4 The editing agent

Beyond the scheduled jobs, the same service is a Telegram-driven editing
agent: allowlisted users send plain-language instructions
("please update news and onthisday", "add X to the clients list") and a
Claude tool-use loop edits the repository clone, validates the build, and
commits with the instruction recorded in the commit message. The agent is
scoped to `src/` and `docs/`, cannot run arbitrary git commands, and
everything it does lands in git history and Telegram.

### 1.5 Contact and email

The contact and membership forms post JSON to `POST /api/send-email` on the
site's own Express server, which relays through EmailJS server-side. The
browser never talks to EmailJS directly and no keys ship to the client. The
client-side scripts (`src/content/pages/contact.*.script.html`) do the
progressive-enhancement work: topic prefill from `?topic=` (accent- and
language-insensitive), a composed rich message body, and inline feedback
states in the right language.

### 1.6 Hosting and operations

Production is consolidated on a single VPS running Dokploy (Docker Swarm):

- **`mai` app** — the site itself: Dockerfile builds `public/` and starts
  the Express server (static files + email endpoint). Redeploys
  automatically on every push to `main`.
- **`mai-agent` app** — the Telegram agent and daily jobs, a second Dokploy
  app with its own Dockerfile. Its entrypoint clones the repo into an
  ephemeral `/work` directory using a scoped GitHub fine-grained PAT.
- Environment variables live in Dokploy's own Postgres, applied to the
  swarm services at deploy time.

DNS for aimuseum.se currently sits on Vercel while serving happens on
Dokploy; retiring the Vercel project entirely is a known loose end.

---

## 2. The hurdles

The polished production above was refined through a series of wrong turns,
incidents, and recoveries. They are recorded here because each one shaped a
rule we now work by.

### 2.1 Three abandoned editing systems (2025 → July 2026)

The hardest architectural lesson predates the current design. Across late
2025 the project accumulated **three** parallel attempts at making the site
editable without touching code:

1. a GitHub-commit admin UI (serverless endpoints writing to the repo),
2. a database-backed text-editing layer (Postgres, export/import tooling,
   runtime text loaders on the home pages), and
3. **Mailpox** — editing the site by sending emails to a webhook.

None reached dependable production quality, and together they encrusted the
codebase: a ~650-line email webhook in the server, `pg` in every deploy,
runtime `/db/texts.json` loaders on the home pages, `data-segment-id`
attributes sprinkled through the authored HTML. In July 2026 all three were
archived (`archive/editing-experiments` branch, `pre-cleanup-2026-07` tag)
and removed in planned phases. The database was confirmed to have no
consumers and deleted outright; git became the single content source.

**The lesson that stuck:** the editing interface the museum actually needed
was not a CMS but a colleague — the Telegram agent (§1.4) replaced all
three experiments with less code than any one of them.

### 2.2 Email deliverability

The contact flow fought two separate battles. First, EmailJS credentials
and template logic were originally client-side; the flow was moved behind
the site's own `/api/send-email` endpoint so keys stay on the server and
the browser-facing surface is a single JSON POST. Second, delivery itself:
Hostinger's mail forwarding silently blocked the EmailJS template
recipients, which looked like a code bug but wasn't — resolved (July 2026)
by pointing the EmailJS templates at direct Gmail addresses. A residue of
that era remains as a security note: old Postgres credentials leaked into
git history via a deleted setup script; the container is not publicly
exposed but should be decommissioned.

### 2.3 Teething problems of the agent (early July 2026)

The agent went from built to live in about a week, hitting three
characteristic snags:

- **Adaptive thinking vs. token limits.** The daily jobs initially failed
  because Sonnet 5's thinking tokens consumed the output budget;
  `max_tokens` had to be raised substantially (thinking is billed and
  counted as output).
- **Production builds need dev dependencies.** The agent validates its
  edits by running the site build inside its clone — which failed under
  `NODE_ENV=production` until `npm ci --include=dev` was made explicit,
  because Tailwind and PostCSS are devDependencies.
- **Preview-branch ceremony wasn't worth it.** The original safety design
  (agent pushes to `preview/telegram-agent`, human `/approve`s a merge)
  lasted one day in practice. Telegram announcements proved to be a
  sufficient veto, the preview deployment was retired on 2026-07-08, and
  the agent now targets `main` directly. Simpler, and honest about how the
  museum actually operates.

### 2.4 The gallery-hall redesign and the hasty merge (11–12 July 2026)

The home-page redesign was developed in a remote Claude session and merged
as PR #14 late on 11 July — by the owner's own admission, "a little quick."
The next morning brought two scares:

- **"Are our EmailJS routines gone?"** No — the merge had only touched the
  home pages, `home.css`/`home.js`, the Tailwind config, and one class name
  in `inject-daily.js`. The contact/membership wiring to `/api/send-email`
  was intact, verified in the built output and by exercising the pages.
  The scare was reasonable, though: the redesign replaced both `index.html`
  files nearly wholesale (546 lines changed), and nobody had re-verified
  the site end-to-end before merging.
- **A wall of Telegram errors at 06:11–06:25** that looked like merge
  fallout but wasn't (§2.5).

**The lesson:** a redesign PR that rewrites entire pages deserves one local
`npm run build` + browser pass before merge, even when the preview looked
good. Coincidental timing will otherwise convert every unrelated failure
into merge anxiety.

### 2.5 The expired-token incident (12 July 2026)

All four daily jobs failed on the morning of 12 July with
`Invalid username or token … Authentication failed`. Diagnosis from inside
the agent container: the GitHub fine-grained PAT had expired that day — the
API returned `401 Unauthorized`. The jobs had done all their work and
committed locally; only the push failed. Nothing was lost, but the recovery
had a strict right order, discovered just in time:

1. **Push first, restart later.** The agent's `/work` clone has no volume;
   any restart re-clones and discards local commits. The four stranded
   commits were pushed from inside the *running* container (after fixing
   its remote URL with the new token) *before* anything was restarted.
2. **Persist, then apply.** The new token was written into Dokploy's
   Postgres (so future redeploys keep it) and then applied to the live
   swarm service with `docker service update --env-add`, which restarts the
   task — safe only because step 1 was already done.
3. A first attempt failed with `403`: the replacement fine-grained PAT had
   been created without **Contents: Read and write**. Fine-grained PATs
   default to nearly nothing; the permission had to be added explicitly.

**Standing risks recorded:** the current token expires **2026-09-10** —
the same failure will recur that morning unless the token is rotated first.
And the ephemeral `/work` is a deliberate simplicity trade-off that demands
the push-before-restart discipline whenever pushes are failing.

### 2.6 The lost edits, and retheming the whole site (12 July 2026)

Two edits the owner remembered making — adding the University of San Diego
to the client list, and applying the new gallery-hall scheme to the
interior pages — turned out to exist nowhere: not in any branch, not in the
old container's clone, not in stashes, dangling commits, or session
transcripts. The likeliest explanation is that they were made in the remote
session that produced PR #14 and evaporated with its workspace when the PR
merged. They were redone from scratch the same day.

The client-list addition was trivial. The retheme was the interesting
hurdle: the interior pages carry their colors as Tailwind utility classes
(`text-slate-300`, `bg-indigo-600`, `focus:ring-indigo-500`, …) spread
across ~26 content fragments in two languages. Editing every fragment would
have been a large, error-prone diff — and would have to be repeated for any
future palette change.

Instead, the scheme was applied at a single point: `styles.css` (which
every interior page loads *after* the compiled Tailwind sheet) now carries
the gallery-hall palette as CSS variables and **remaps the recurring
utility classes** onto it — `.text-slate-300 → var(--ink-dim)`,
`.bg-indigo-600 → var(--brass)` with brass-ink text, hairline borders,
brass focus rings and form accents. Because the override rules are
single-class, cascade order (not specificity) decides, and styles.css
loading last wins cleanly. The five page templates swapped Exo 2 for the
home page's Fraunces + IBM Plex set. Net effect: the entire interior
rethemed in one stylesheet and five one-line template edits, with all
content markup untouched, verified page-by-page in the browser.

**The lessons:** work that lives only in an ephemeral session workspace
does not exist — push it or lose it. And when a design system needs to
propagate through utility-class markup, remapping the utilities at one
choke point beats rewriting the markup everywhere it appears.

---

## 3. Where this leaves us

The production is coherent and largely self-operating: a designed,
bilingual museum site whose liveliest wing renews itself every morning
under human veto, hosted on infrastructure the museum controls, with git
as the single, auditable source of truth for everything.

Known loose ends, in priority order:

1. **Rotate the agent's GitHub PAT before 2026-09-10** (expiry will
   re-break the daily jobs; procedure documented from the July incident).
2. Retire the Vercel project and move aimuseum.se DNS handling in line
   with the Dokploy-only serving reality.
3. Decommission the old MAI Postgres container (leaked historical
   credentials).
4. Client logos to replace the Guestbook text list (owner preference).
5. The utility-class remap covers the classes present today; any newly
   authored fragment using an unmapped slate/indigo utility will need a
   line added to the remap block (or better, use the palette variables
   directly).
6. Encyclopedia section: removed July 2026, preserved in git history as a
   future project.
