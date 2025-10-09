#!/usr/bin/env node
/*
  Generate a slides manifest JSON from images in src/site/images/slide.
  - Reads image files (.webp, .jpg, .jpeg, .png, .avif)
  - Sorts by leading number prefix if present (e.g., 12-foo.webp)
  - Derives a human title from filename if none provided elsewhere
  - Preserves existing metadata including i18n titles/descriptions
  - Writes src/site/images/slide/slides.json
*/

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const IMAGES_ROOT = path.join('src', 'site', 'images');
const ROOT = path.resolve(__dirname, '..');
const SLIDES_DIR = path.join(ROOT, 'images', 'slide');
const OUT_PATH = path.join(SLIDES_DIR, 'slides.json');
function isImageFile(name) {
  const ext = path.extname(name).toLowerCase();
  return ['.webp', '.jpg', '.jpeg', '.png', '.avif'].includes(ext);
}

function parseNumberPrefix(filename) {
  const base = path.basename(filename);
  const match = base.match(/^(\d+)[-_]/);
  return match ? parseInt(match[1], 10) : null;
}

function toTitleFromFilename(filename) {
  const base = path.basename(filename, path.extname(filename));
  // Remove numeric prefix like `12-` or `12_`
  const cleaned = base.replace(/^\d+[-_]?/, '');
  // Replace separators with space
  const spaced = cleaned.replace(/[-_]+/g, ' ').trim();
  if (!spaced) return base;
  // Title Case (basic)
  return spaced.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

async function main() {
  if (!fs.existsSync(SLIDES_DIR)) {
    console.error(`Directory not found: ${SLIDES_DIR}`);
    process.exit(1);
  }

  const entries = await fsp.readdir(SLIDES_DIR, { withFileTypes: true });
  let files = entries.filter((e) => e.isFile()).map((e) => e.name).filter(isImageFile);

  if (files.length === 0) {
    console.error('No image files found in src/site/images/slide');
    await fsp.writeFile(OUT_PATH, '[]\n');
    console.log(`Wrote empty manifest: ${OUT_PATH}`);
    return;
  }

  // Load existing manifest to preserve metadata (titles, descriptions, i18n)
  let existing = [];
  try {
    if (fs.existsSync(OUT_PATH)) {
      existing = JSON.parse(await fsp.readFile(OUT_PATH, 'utf8'));
    }
  } catch {
    existing = [];
  }
  const byFilename = new Map(Array.isArray(existing) ? existing.map(it => [it && it.filename, it]).filter(([k]) => typeof k === 'string') : []);

  const items = files.map((filename) => {
    const number = parseNumberPrefix(filename);
    const prev = byFilename.get(filename) || {};
    return {
      number: number == null ? undefined : number,
      filename,
      // Keep existing values if present; otherwise default from filename
      title: typeof prev.title === 'string' ? prev.title : toTitleFromFilename(filename),
      description: typeof prev.description === 'string' ? prev.description : '',
      // Optional i18n block: { en:{title,description}, sv:{...} }
      i18n: prev.i18n && typeof prev.i18n === 'object' ? prev.i18n : { en: { title: '', description: '' }, sv: { title: '', description: '' } }
    };
  });

  items.sort((a, b) => {
    const an = a.number ?? Number.POSITIVE_INFINITY;
    const bn = b.number ?? Number.POSITIVE_INFINITY;
    if (an !== bn) return an - bn;
    return a.filename.localeCompare(b.filename);
  });

  // Normalize numbers to sequential if undefined
  let seq = 1;
  for (const it of items) {
    if (typeof it.number !== 'number' || !Number.isFinite(it.number)) {
      it.number = seq;
    }
    seq++;
  }

  await fsp.writeFile(OUT_PATH, JSON.stringify(items, null, 2) + '\n');
  console.log(`Wrote manifest: ${OUT_PATH} (${items.length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
