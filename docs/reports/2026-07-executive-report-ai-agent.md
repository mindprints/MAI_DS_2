# Executive Report: MAI Website AI Agent — Operations, Costs & Roadmap Questions

*Museum of Artificial Intelligence · 7 July 2026 · Covers the Telegram editing
agent (@MAI_edit_bot) and the two daily content jobs running on the Dokploy VPS.*

## 1. Running costs (daily jobs only, no Telegram edits)

Verified prices (Anthropic price list, July 2026): the agent runs on Claude
Sonnet 5, at introductory pricing of $2 per million input tokens / $10 per
million output tokens through 31 August 2026, rising to $3/$15 from
1 September. Web search costs $10 per 1,000 searches plus the search results
billed as input tokens. Thinking tokens (the model's internal reasoning) are
billed as output tokens — this is why the news briefing costs more than its
visible length suggests.

Estimated per-run consumption (bilingual output):

| Job | Input | Output | Searches | Cost now | Cost from Sep 2026 |
|---|---|---|---|---|---|
| "On this day" essay | ~1K tokens | ~5K tokens | 0 | ≈ $0.05 | ≈ $0.08 |
| AI news briefing | ~25K tokens (mostly search results) | ~8K tokens | up to 8 ($0.08) | ≈ $0.21 | ≈ $0.30 |
| **Daily total** | | | | **≈ $0.26** | **≈ $0.38** |
| **Monthly total** | | | | **≈ $8** | **≈ $11** |

A realistic budget is $6–12/month now, $9–15/month after August, for the
fully automatic operation. Each Telegram edit instruction adds roughly
$0.10–0.60 depending on complexity (the editing loop re-reads files across
several rounds). Cost lever: adding prompt caching to the editing loop would
cut edit costs by well over half — about an hour of work, worthwhile if
editing becomes frequent.

## 2. Notification of depleted or near-depleted API funds

- **Built-in (already live):** when credits run out, API calls fail and every
  job failure is posted to the Telegram chat ("Job ainews failed: …") — you
  find out within hours, but only after the fact.
- **Proactive (recommended, 5 minutes):** in the Anthropic Console
  (console.anthropic.com → Settings → Billing), enable low-credit-balance
  email alerts and optionally auto-reload (automatic top-up below a
  threshold).
- **Optional enhancement:** weekly spend summary posted to Telegram via
  Anthropic's usage-reporting API. Needs an admin-scoped API key; ~half a
  day of work.

## 3. Adjusting the tone of the AI-authored articles

Tone lives in the prompts inside `agent/jobs.js` — "Engaging, accurate, no
hype", "Not overly technical", word-count targets, title formats. Today,
changing them means editing that file in the repository.

**Recommended enhancement (~1 hour):** move the editorial voice into
`docs/editorial-guidelines.md`, read by the jobs at run time. Because the
Telegram bot is allowed to edit `docs/`, tone would then be adjustable by
messaging the bot ("make the history essays more playful") — no code
changes.

Per-article steering already exists: `/news <topic>` forces the lead story;
`/ontoday <event>` picks the anniversary.

## 4. Limits of editing through the Telegram bot

**Can:** create, modify, delete any text file under `src/` (all pages, both
languages, styles, content) and `docs/`. Validates the site build before
publishing; announces every change in the chat.

**Cannot:**

- Touch anything outside `src/` and `docs/` — not its own code, the server,
  deployment configs, secrets, or DNS (path escapes are blocked and tested).
- Handle images — photos sent via Telegram are ignored; it cannot create
  binary files, only reference images already in the repository.
- See the rendered result — it verifies the build succeeds but does no
  visual review; the human eye on aimuseum.se remains the quality gate.
- Work in parallel — one instruction at a time, 30-step cap per task; break
  large redesigns into sequential instructions.
- Undo with a command — no `/undo`, but every change is a git commit, so
  "revert the change you just made" works as an instruction; nothing is lost.

Practical caution: it is instructed to mirror EN/SV pages, but when parity
matters, say so explicitly ("…on both language versions").

## 5. Tools used to search for news and historical events

- **AI news briefing:** Anthropic's server-side web search tool
  (`web_search_20260209`, dynamic result filtering), capped at 8 searches per
  briefing; reads live pages at generation time; sources named in the text.
- **"On this day" essays:** no external search — model's trained knowledge
  (extends into early 2026) with instructions to prefer well-documented
  anniversaries and be honest about loose date connections. Known weakness:
  date precision on obscure events. Giving this job web search to verify
  dates is a ~15-minute change costing at most a few cents per day.

## 6. Adding source tags to articles — effort estimate

- **News briefing: ~1–2 hours.** Search results already contain real URLs.
  Extend the model's JSON output with a `sources` list, render a "Sources"
  footer on post pages in both languages. Caveat: links come from real
  search results but may later move or sit behind paywalls.
- **History essay: ~2–3 hours**, because it must first gain web search —
  citing sources without search invites invented references. With search
  enabled, the same rendering path applies.
- **Total: about half a day** for both, including testing. Ongoing cost
  impact: only the essay-job searches, roughly +$0.01–0.08/day.

## 7. Procedure for adding a model router (cheaper models where appropriate)

The cheaper model is Claude Haiku 4.5 at $1/$5 per MTok — roughly a third of
Sonnet's standard price. Three escalation levels:

1. **Per-task model configuration (~1 hour).** Split the single
   `ANTHROPIC_MODEL` setting into per-task settings (edits / essay / news).
   Zero risk; experiment via a Dokploy environment variable.
2. **Split the translation step (~half a day).** English article with
   Sonnet, Swedish translation with Haiku. Saves roughly a third of output
   costs on the daily jobs.
3. **True instruction router (~1 day).** A cheap Haiku pre-call classifies
   each Telegram instruction (simple text swap → Haiku; structural change →
   Sonnet), with automatic retry on Sonnet if the cheap attempt fails the
   build check.

**Recommendation: not yet.** Total spend is ~$10/month; routing could save a
few dollars while adding failure modes, and Haiku is noticeably weaker at
judgment-heavy work. Revisit if usage grows ~10× or September pricing makes
costs uncomfortable. Level 1 is worth doing anytime as pure flexibility.
