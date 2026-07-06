# Project direction

The abandoned editing experiments (database-backed admin, GitHub-commit admin,
and the Mailpox email-based editing system) are being removed from `main`.
They are preserved in the `archive/editing-experiments` branch and the
`pre-cleanup-2026-07` tag — do not build on them.

The current plan (see `docs/PLAN.md`) is:

1. Clean up the abandoned editing systems and simplify the Express server.
2. Simplify the home page around lectures, seminars, and workshops.
3. Keep the EmailJS contact flow as-is (UI polish only).
4. Build a Telegram-driven AI editing agent plus two daily content cron jobs
   ("On this day in AI history" essay, daily AI news summary) on a
   `preview/telegram-agent` branch, hosted on the Dokploy server.
