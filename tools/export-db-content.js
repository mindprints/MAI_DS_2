#!/usr/bin/env node
// Exports DB content to /public/db/*.json for the static site to consume.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: false
});

async function main() {
  const outDir = path.resolve(process.cwd(), 'public', 'db');
  const outDirAssets = path.resolve(process.cwd(), 'public', 'assets', 'db');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(outDirAssets, { recursive: true });

  const client = await pool.connect();

  // 1) Texts
  const textsRes = await client.query(`
    SELECT key, lang, body
    FROM text_snippets
    ORDER BY key, lang
  `);
  // Shape as { [key]: { en: "...", sv: "..." } }
  const texts = {};
  for (const r of textsRes.rows) {
    const k = r.key;
    const lang = (r.lang || 'en').toLowerCase();
    texts[k] = texts[k] || {};
    texts[k][lang] = r.body;
  }

  // 2) Media
  const mediaRes = await client.query(`
    SELECT key, storage_url AS url, mime_type, alt_text, credit, width, height, size_bytes
    FROM media_assets
    ORDER BY key
  `);
  const media = {};
  for (const r of mediaRes.rows) media[r.key] = r;

  // 3) Encyclopedia (MVP)
  const encyRes = await client.query(`
    SELECT slug, lang, status, title, summary_md, body_md
    FROM encyclopedia_entries
    ORDER BY slug, lang
  `);
  const encyclopedia = {};
  for (const r of encyRes.rows) {
    const s = r.slug;
    encyclopedia[s] = encyclopedia[s] || {};
    encyclopedia[s][r.lang] = {
      status: r.status,
      title: r.title,
      summary_md: r.summary_md || '',
      body_md: r.body_md || ''
    };
  }

  await client.release();
  await pool.end();

  const textsJson = JSON.stringify(texts, null, 2);
  const mediaJson = JSON.stringify(media, null, 2);
  const encyJson = JSON.stringify(encyclopedia, null, 2);
  // primary location
  fs.writeFileSync(path.join(outDir, 'texts.json'), textsJson);
  fs.writeFileSync(path.join(outDir, 'media.json'), mediaJson);
  fs.writeFileSync(path.join(outDir, 'encyclopedia.json'), encyJson);
  // fallback location under assets
  fs.writeFileSync(path.join(outDirAssets, 'texts.json'), textsJson);
  fs.writeFileSync(path.join(outDirAssets, 'media.json'), mediaJson);
  fs.writeFileSync(path.join(outDirAssets, 'encyclopedia.json'), encyJson);

  console.log('✓ Exported to public/db/{texts.json, media.json, encyclopedia.json}');
}

main().catch(e => { console.error(e); process.exit(1); });
