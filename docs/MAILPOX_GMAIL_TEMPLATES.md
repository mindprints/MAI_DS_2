<style>
  /* GitHub / Docs readers still render this, keeps table narrower */
  table.mailpox-table td, table.mailpox-table th {
    padding: 0.5rem 0.75rem;
  }
</style>

# Mailpox Gmail Template Pack

We use Gmail’s built-in **Templates** feature (a.k.a. canned responses) so editors can send authenticated Mailpox emails quickly. This guide ships two ready-made HTML layouts—**Light** and **Dark**—that mirror the voice and structure of the refreshed Mailpox demo page.

> ✅ Both templates already include the edit address (`edit@aimuseum.se`) and a placeholder for `{{EDIT_SECRET_TOKEN}}` so you can safely rotate credentials without redesigning anything.

---

## Files

| Mode  | Path | Notes |
| --- | --- | --- |
| Light | `docs/templates/mailpox-gmail-light.html` | Uses white cards, pale-blue accents, shows both key-format and natural-language snippets. |
| Dark | `docs/templates/mailpox-gmail-dark.html` | Mirrors the “Night Shift” aesthetic with high-contrast teal/amber highlights. |

Each file is self-contained HTML with inline styles (fully compatible with Gmail’s composer). Open them in your browser to preview before importing.

---

## Prerequisites

1. **Enable Templates in Gmail**: `Settings → See all settings → Advanced → Templates → Enable → Save`.
2. Confirm you can mail from an **allowed editor account** (matches `ALLOWED_EDITOR_EMAILS`).
3. Copy the production/staging value of `EDIT_SECRET_TOKEN` so it can replace the placeholder.

---

## Import Instructions

1. **Open the desired HTML file** (light or dark) in a browser and copy everything (`Ctrl/Cmd+A`, then `Ctrl/Cmd+C`). Inline styles mean no assets are required.
2. **Compose a new message in Gmail.**
3. Switch the compose window to plain mode (optional) and **paste** the HTML. Gmail keeps inline CSS.
4. Replace the placeholder token with the real one:
   - Use search (`Ctrl/Cmd+F`) for `{{EDIT_SECRET_TOKEN}}`.
   - Paste the actual secret (from environment or secrets manager).
5. Update the subject line field with something descriptive like **“Mailpox demo update — Light template”** so the template list clearly shows which mode you are inserting. (The token already appears in the body, so authentication requirements are satisfied.)
6. In the compose window, open `⋮ More options → Templates → Save draft as template → Save as new template`. Overwrite the suggested name with something memorable, e.g. **Mailpox — Light (Staging)**.
7. Repeat for the dark variant so editors can pick whichever works with their Gmail theme.

> 🔐 When the token rotates, open the template (Templates → Insert), edit the token pill in the body, and re-save with `Templates → Save draft as template → Overwrite template`. No subject change is required for verification as long as the body contains the token.

---

## Anatomy of the Template

Both modes share the same content blocks so Mailpox always receives the right cues:

- **Subject suggestion** – already includes the token in brackets to satisfy Layer 4 authentication.
- **Token pill** – bold text block reminding editors which token is currently embedded.
- **Key-format snippet** – a `<pre>` block containing at least two `[demo.*]` keys ready for copy/paste.
- **Natural language brief** – italic blockquote that demonstrates freeform instructions.
- **Footer reminder** – tells editors to rotate tokens and duplicate templates per locale if needed.

If you need to highlight other keys, edit the `<pre>` block in the HTML file before importing into Gmail.

---

## Usage Tips

- Pin both templates under Gmail’s template menu so onboarding editors can choose “Light” or “Dark” quickly, and give each template a subject that mirrors its mode.
- Keep **per-environment copies** (e.g., “Mailpox – Light (staging)” vs “Mailpox – Light (prod)”) so the correct token lives inside each one.
- For multilingual edits, duplicate the template and swap the sample keys/paragraph with the localized text before saving as a separate Gmail template.
- If an editor prefers a pure-text email, they can still copy just the `[demo.*]` section; the template ensures the token and recipient stay correct.

---

Need to target another mail client (Outlook, Apple Mail)? Copy these HTML files as a baseline and reapply the same colors/structure—the key is that **`edit@aimuseum.se` + token** ship together every time.
