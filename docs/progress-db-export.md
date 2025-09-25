# Content Export Pipeline

This repository now includes `tools/export-content.js`, a Node-based extractor that snapshots all static page text and image metadata. The dump is designed for seeding and validating the Postgres-backed progress database that will power the Hostinger-administered content.

## Running the extractor

```bash
node tools/export-content.js --out-dir exports
```

- `--out-dir` defaults to `<repo>/exports`; set it to any writable directory.
- The command generates four JSON files: `pages-and-ency.json`, `image-refs.json`, `image-files.json`, and `summary.json`.
- All records are sorted to keep exports deterministic, making diffing reliable.

> **Note**: Run the script in the Dokploy container (or anywhere Node is available) to ensure the same environment that will seed the database.

## JSON schema

- `pages-and-ency.json`: array of `{kind, slug, locale, file, htmlSha1, segments[]}`
  - `segments[]` contains `{id, parentTag, text, textSha1}`.
- `image-refs.json`: array of `{tag, file, src, alt, …}` capturing `<img>` and `<source>` references across every HTML file.
- `image-files.json`: array of `{path, size, mtime, sha1}` for all binaries under `src/site/images`.
- `summary.json`: counts plus the generation timestamp.

## Seeding Postgres

1. Mount or clone the repository inside the Dokploy container.
2. Run the extractor to populate an `exports/` directory.
3. Ingest JSON into the progress DB with idempotent `UPSERT`s keyed on `(kind, slug, locale, segment_id)` and `(path)`.

## Validation via JSON diff

- Keep a canonical baseline export (e.g., `exports/baseline/*.json`).
- After loading the DB, re-run the extractor and export DB contents back to JSON.
- Diff the two JSON snapshots:
  ```bash
  jq -S . exports/current/pages-and-ency.json > /tmp/current.json
  jq -S . exports/baseline/pages-and-ency.json > /tmp/baseline.json
  diff -u /tmp/baseline.json /tmp/current.json
  ```
- Repeat for `image-refs.json` and `image-files.json`.
- Integrate the diff into CI or a Dokploy health check before flipping the production site to DB-backed content.

This flow keeps the live site untouched until the progress DB mirrors the current hard-coded state.
