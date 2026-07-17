#!/usr/bin/env node
/*
  Add photos to the home-page slide rotation in one step:
    npm run slides:add -- <photo> [<photo> ...]

  For each input image (jpg/png/webp/avif/tiff, any size):
  - converts to WebP at max 1920px wide (same settings as npm run optimize)
  - names it NN-kebab-title.webp with the next free number prefix
    (ASCII kebab-case, per the repo's image filename convention)
  - copies it into src/site/images/slide/
  then regenerates slides.json (preserving existing titles/i18n).

  Commit and push afterwards; the daily hero rotation picks slides by
  day number modulo slide count, so no other change is needed.
*/

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { execFileSync } = require('child_process');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SLIDES_DIR = path.join(ROOT, 'src', 'site', 'images', 'slide');
const MAX_WIDTH = parseInt(process.env.IMG_MAX_WIDTH || '1920', 10);
const WEBP_QUALITY = parseInt(process.env.WEBP_QUALITY || '75', 10);
const WEBP_EFFORT = parseInt(process.env.WEBP_EFFORT || '5', 10);

function asciiKebab(name) {
  const base = path.basename(name, path.extname(name)).replace(/^\d+[-_]?/, '');
  return base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics (å→a, ö→o, é→e)
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'slide';
}

function nextNumber() {
  const nums = fs.readdirSync(SLIDES_DIR)
    .map((f) => { const m = f.match(/^(\d+)[-_]/); return m ? parseInt(m[1], 10) : null; })
    .filter((n) => n !== null);
  return nums.length ? Math.max(...nums) + 1 : 1;
}

async function addOne(input, number) {
  const out = path.join(SLIDES_DIR, `${number}-${asciiKebab(input)}.webp`);
  if (fs.existsSync(out)) throw new Error(`Target already exists: ${out}`);
  const img = sharp(await fsp.readFile(input), { unlimited: true });
  const buf = await img
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT, smartSubsample: true })
    .toBuffer();
  await fsp.writeFile(out, buf);
  const kb = Math.round(buf.length / 1024);
  console.log(`Added ${path.basename(out)} (${kb}K)`);
  return out;
}

async function main() {
  const inputs = process.argv.slice(2);
  if (inputs.length === 0) {
    console.error('Usage: npm run slides:add -- <photo> [<photo> ...]');
    process.exit(1);
  }
  for (const input of inputs) {
    if (!fs.existsSync(input)) {
      console.error(`Not found: ${input}`);
      process.exit(1);
    }
  }
  let number = nextNumber();
  for (const input of inputs) {
    await addOne(input, number);
    number += 1;
  }
  execFileSync(process.execPath, [path.join(__dirname, 'generate-slides-manifest.js')], { stdio: 'inherit' });
  console.log('Done. Review titles in src/site/images/slide/slides.json, then commit and push.');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
