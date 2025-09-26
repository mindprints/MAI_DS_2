#!/usr/bin/env node
require('dotenv').config();
/**
 * Import MAI exports into Postgres.
 *
 * Supports files in the given directory:
 *  - image-files.json: [{ path, size, mtime, sha1 }]
 *  - image-refs.json:  [{ tag, file, src, alt, ... }]
 *  - pages-and-ency.json: [{ kind:"encyclopedia", slug, locale|lang, segments:[{text,...}], ... }]
 *  - texts.json (optional): [{ key, lang, body, notes? }]
 *
 * Usage:
 *   node import_exports.js ./exports
 *   node import_exports.js ./exports --dry   # parse only, no DB writes
 *
 * Env:
 *   DATABASE_URL=postgres://user:pass@host:port/db   (preferred)
 *   or:
 *   PGHOST=... PGPORT=... PGUSER=... PGPASSWORD=... PGDATABASE=...
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const args = process.argv.slice(2);
const dirArg = args[0] || './exports';
// resolve to an absolute path based on where you run the command
const dir = path.resolve(process.cwd(), dirArg);

const isDry = args.includes('--dry');

function loadJSON(name) {
    const p = path.join(dir, name);
    if (!fs.existsSync(p)) {
      console.log(`(skip) not found: ${p}`);
      return null;
    }
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) {
      console.error(`Failed to parse ${p}: ${e.message}`);
      process.exit(1);
    }
  }
  

function normExt(filename = '') {
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function mimeFromExt(ext) {
  if (ext === 'webp') return 'image/webp';
  if (ext === 'avif') return 'image/avif';
  if (ext === 'png')  return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'svg')  return 'image/svg+xml';
  return null;
}

function basename(p) {
  return String(p).split('/').pop();
}

function baseNoExt(p) {
  const b = basename(p);
  return b.replace(/\.[^.]+$/, '');
}

function keyFromFilename(fn) {
  // e.g. "img.ai-coding"
  return 'img.' + baseNoExt(fn).replace(/\s+/g, '-');
}

function normSrcToUrl(src) {
  // turn "../../images/foo.jpg" or "./images/foo.jpg" into "/images/foo.jpg"
  if (!src) return '';
  if (src.startsWith('../../')) return '/' + src.replace(/^..\//g, ''); // strip two ../
  if (src.startsWith('./'))     return '/' + src.replace(/^\.\//, '');
  if (src.startsWith('/'))      return src;
  return '/' + src;
}

async function main() {
  // Load files (any that exist)
  const imageFiles = loadJSON('image-files.json');   // array
  const imageRefs  = loadJSON('image-refs.json');    // array
  const pagesEncy  = loadJSON('pages-and-ency.json'); // array
  const textsJson  = loadJSON('texts.json');         // optional array

  // Show summary
  const summary = {
    dir,
    imageFiles: Array.isArray(imageFiles) ? imageFiles.length : 0,
    imageRefs: Array.isArray(imageRefs) ? imageRefs.length : 0,
    pagesEncy: Array.isArray(pagesEncy) ? pagesEncy.length : 0,
    texts: Array.isArray(textsJson) ? textsJson.length : 0,
    dryRun: isDry
  };
  console.log('Import summary:', summary);

  if (isDry) process.env.PGDATABASE = process.env.PGDATABASE || 'DRY_RUN';

  const client = new Client({
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.PGHOST || undefined,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
    user: process.env.PGUSER || undefined,
    password: process.env.PGPASSWORD || undefined,
    database: process.env.PGDATABASE || undefined,
    ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : false
  });

  if (!isDry) {
    await client.connect();
  }

  // Helpers
  const exec = async (sql, params) => {
    if (isDry) return { rowCount: 0 };
    return client.query(sql, params);
  };

  let totalMedia = 0, totalMediaFromRefs = 0, totalTexts = 0, totalEncy = 0;

  // 1) image-files.json → media_assets
  if (Array.isArray(imageFiles) && imageFiles.length) {
    for (const f of imageFiles) {
      const p = f.path || '';
      if (!p) continue;
      const filename = basename(p);
      const key = keyFromFilename(filename);
      // Build storage_url: if under src/site/images/, expose as /images/...
      let storage_url = '/' + p;
      const m = p.match(/^src\/site\/(images\/.*)$/);
      if (m) storage_url = '/' + m[1];

      const ext = normExt(filename);
      const mime = mimeFromExt(ext);
      const size = typeof f.size === 'number' ? f.size : null;
      const source = `export:image-files.json sha1=${f.sha1 || ''}`;

      await exec(
        `INSERT INTO media_assets (key, storage_url, mime_type, size_bytes, source, updated_at)
         VALUES ($1,$2,$3,$4,$5, now())
         ON CONFLICT (key) DO UPDATE
         SET storage_url = EXCLUDED.storage_url,
             mime_type   = COALESCE(EXCLUDED.mime_type, media_assets.mime_type),
             size_bytes  = COALESCE(EXCLUDED.size_bytes, media_assets.size_bytes),
             source      = EXCLUDED.source,
             updated_at  = now()`,
        [key, storage_url, mime, size, source]
      );
      totalMedia++;
    }
    console.log(`media_assets upserted from image-files.json: ${totalMedia}`);
  }

  // 2) image-refs.json → merge into media_assets (alt_text, mime if missing), create if absent
  if (Array.isArray(imageRefs) && imageRefs.length) {
    for (const r of imageRefs) {
      const src = normSrcToUrl(r.src || '');
      if (!src) continue;
      const filename = basename(src);
      const key = keyFromFilename(filename);
      const ext = normExt(filename);
      const mime = mimeFromExt(ext);
      const alt  = r.alt && String(r.alt).trim() ? r.alt.trim() : null;

      await exec(
        `INSERT INTO media_assets (key, storage_url, mime_type, alt_text, updated_at)
         VALUES ($1,$2,$3,$4, now())
         ON CONFLICT (key) DO UPDATE
         SET storage_url = EXCLUDED.storage_url,
             mime_type   = COALESCE(EXCLUDED.mime_type, media_assets.mime_type),
             alt_text    = COALESCE(NULLIF(EXCLUDED.alt_text,''), media_assets.alt_text),
             updated_at  = now()`,
        [key, src, mime, alt]
      );
      totalMediaFromRefs++;
    }
    console.log(`media_assets upserted from image-refs.json: ${totalMediaFromRefs}`);
  }

  // 3) texts.json (optional) → text_snippets
  if (Array.isArray(textsJson) && textsJson.length) {
    for (const t of textsJson) {
      if (!t.key || !t.lang || typeof t.body !== 'string') continue;
      await exec(
        `INSERT INTO text_snippets (key, lang, body, notes)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (key, lang) DO UPDATE
         SET body = EXCLUDED.body,
             notes = COALESCE(EXCLUDED.notes, text_snippets.notes),
             updated_at = now()`,
        [t.key, t.lang.toLowerCase(), t.body, t.notes || null]
      );
      totalTexts++;
    }
    console.log(`text_snippets upserted from texts.json: ${totalTexts}`);
  }

  // 4) pages-and-ency.json → encyclopedia_entries (kind:"encyclopedia")
  if (Array.isArray(pagesEncy) && pagesEncy.length) {
    const encys = pagesEncy.filter(o => String(o.kind).toLowerCase() === 'encyclopedia');
    for (const e of encys) {
      const slug = e.slug;
      const lang = (e.lang || e.locale || 'en').toLowerCase();
      if (!slug) continue;

      // title: explicit if exists; else humanize slug
      const title = e.title && String(e.title).trim().length ? e.title.trim()
                   : slug.replace(/[-_]/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());

      // body_md: join segments[].text with blank lines
      let body = '';
      if (Array.isArray(e.segments)) {
        body = e.segments
          .map(s => (s && typeof s.text === 'string') ? s.text.trim() : '')
          .filter(Boolean)
          .join('\n\n');
      } else if (typeof e.body_md === 'string') {
        body = e.body_md;
      }

      await exec(
        `INSERT INTO encyclopedia_entries(slug, lang, status, title, subtitle, summary_md, body_md, updated_at)
         VALUES ($1,$2,'draft',$3,NULL,NULL,$4, now())
         ON CONFLICT (slug, lang) DO UPDATE
         SET title = EXCLUDED.title,
             body_md = COALESCE(NULLIF(EXCLUDED.body_md,''), encyclopedia_entries.body_md),
             updated_at = now()`,
        [slug, lang, title, body]
      );
      totalEncy++;
    }
    console.log(`encyclopedia_entries upserted from pages-and-ency.json: ${totalEncy}`);
  }
  // Also import page texts from pages-and-ency.json (kind:"page")
if (Array.isArray(pagesEncy) && pagesEncy.length) {
    const pages = pagesEncy.filter(o => String(o.kind).toLowerCase() === 'page');
    let pageTexts = 0;
    for (const p of pages) {
      const lang = (p.lang || p.locale || (
        /\.sv\./.test(p.file || '') ? 'sv' : 'en'
      )).toLowerCase();
      const baseSlug = (p.slug
        || (p.file || '').split('/').pop().replace(/\.[^.]+$/, '')
        || 'page').toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  
      if (Array.isArray(p.segments)) {
        let idx = 0;
        for (const seg of p.segments) {
          const text = seg && typeof seg.text === 'string' ? seg.text.trim() : '';
          if (!text) continue;
          const key = `page.${baseSlug}.seg.${++idx}`;
          await exec(
            `INSERT INTO text_snippets(key, lang, body)
             VALUES ($1,$2,$3)
             ON CONFLICT (key, lang) DO UPDATE
             SET body = EXCLUDED.body, updated_at = now()`,
            [key, lang, text]
          );
          pageTexts++;
        }
      }
    }
    console.log(`text_snippets upserted from pages(kind:"page"): ${pageTexts}`);
  }
  

  if (!isDry) await client.end();
  console.log('✓ Import complete.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
