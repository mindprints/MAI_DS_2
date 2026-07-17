#!/usr/bin/env node
/*
  Remove photos from the home-page slide rotation:
    npm run slides:remove -- <number|filename> [...]

  Deletes the matching image(s) from src/site/images/slide/ and
  regenerates slides.json. Accepts either the number prefix (e.g. 14)
  or the exact filename (e.g. 14-invigning-skrapan.webp).
*/

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SLIDES_DIR = path.join(ROOT, 'src', 'site', 'images', 'slide');

function findTarget(arg) {
  const files = fs.readdirSync(SLIDES_DIR).filter((f) => f !== 'slides.json');
  if (files.includes(arg)) return arg;
  if (/^\d+$/.test(arg)) {
    const matches = files.filter((f) => f.match(/^(\d+)[-_]/) && parseInt(f.match(/^(\d+)[-_]/)[1], 10) === parseInt(arg, 10));
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) throw new Error(`Number ${arg} matches several files: ${matches.join(', ')} — use the full filename.`);
  }
  throw new Error(`No slide matches "${arg}".`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: npm run slides:remove -- <number|filename> [...]');
    process.exit(1);
  }
  // Resolve everything first so a typo aborts before anything is deleted.
  const targets = args.map(findTarget);
  for (const t of targets) {
    fs.unlinkSync(path.join(SLIDES_DIR, t));
    console.log(`Removed ${t}`);
  }
  execFileSync(process.execPath, [path.join(__dirname, 'generate-slides-manifest.js')], { stdio: 'inherit' });
  console.log('Done. Commit and push to deploy.');
}

try {
  main();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
