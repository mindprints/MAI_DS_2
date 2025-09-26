#!/usr/bin/env node
require('dotenv').config();
/*
  Optimize images in place with sensible defaults.
  - Targets a directory (default: src/site/images/slide)
  - Resizes images wider than MAX_WIDTH to MAX_WIDTH
  - Re-encodes WebP with quality/effort tuned for web
  - Creates a timestamped backup copy before overwriting
*/

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

const IMAGES_ROOT = path.join('src', 'site', 'images');
const DEFAULT_TARGET = path.join(IMAGES_ROOT, 'slide');
const TARGET_DIR = path.resolve(process.argv[2] || DEFAULT_TARGET);
const MAX_WIDTH = parseInt(process.env.IMG_MAX_WIDTH || '1920', 10);
const WEBP_QUALITY = parseInt(process.env.WEBP_QUALITY || '75', 10);
const WEBP_EFFORT = parseInt(process.env.WEBP_EFFORT || '5', 10); // 0..6

const ts = new Date()
  .toISOString()
  .replace(/[-:]/g, '')
  .replace('T', '-')
  .slice(0, 15);

const BACKUP_ROOT = path.join(IMAGES_ROOT, '_backup', ts);

function isImageFile(name) {
  const ext = path.extname(name).toLowerCase();
  return ['.webp', '.jpg', '.jpeg', '.png', '.avif'].includes(ext);
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function fileSize(p) {
  try {
    const s = await fsp.stat(p);
    return s.size;
  } catch {
    return 0;
  }
}

async function backupFile(srcPath) {
  const rel = path.relative(IMAGES_ROOT, srcPath);
  const backupPath = path.join(BACKUP_ROOT, rel);
  await ensureDir(path.dirname(backupPath));
  await fsp.copyFile(srcPath, backupPath);
  return backupPath;
}

async function optimizeWebP(srcPath) {
  const input = await fsp.readFile(srcPath);
  const img = sharp(input, { unlimited: true });
  const meta = await img.metadata();
  const width = meta.width || 0;

  let pipeline = img.rotate();
  if (width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }

  const buf = await pipeline
    .webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT, smartSubsample: true })
    .toBuffer();

  const tmpPath = srcPath + '.opt.tmp';
  await fsp.writeFile(tmpPath, buf);
  try { await fsp.unlink(srcPath); } catch {}
  await fsp.rename(tmpPath, srcPath);
}

async function optimizeJpegPng(srcPath) {
  const ext = path.extname(srcPath).toLowerCase();
  const input = await fsp.readFile(srcPath);
  const img = sharp(input, { unlimited: true });
  const meta = await img.metadata();
  const width = meta.width || 0;
  let pipeline = img.rotate();
  if (width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }

  if (ext === '.jpg' || ext === '.jpeg') {
    const buf = await pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    const tmpPath = srcPath + '.opt.tmp';
    await fsp.writeFile(tmpPath, buf);
    try { await fsp.unlink(srcPath); } catch {}
    await fsp.rename(tmpPath, srcPath);
  } else if (ext === '.png') {
    const buf = await pipeline.png({ compressionLevel: 9 }).toBuffer();
    const tmpPath = srcPath + '.opt.tmp';
    await fsp.writeFile(tmpPath, buf);
    try { await fsp.unlink(srcPath); } catch {}
    await fsp.rename(tmpPath, srcPath);
  }
}

async function processFile(p) {
  const before = await fileSize(p);
  await backupFile(p);
  const ext = path.extname(p).toLowerCase();
  if (ext === '.webp') {
    await optimizeWebP(p);
  } else if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
    await optimizeJpegPng(p);
  } else if (ext === '.avif') {
    // Re-encode AVIF at modest effort/quality
    const input = await fsp.readFile(p);
    const img = sharp(input, { unlimited: true });
    const meta = await img.metadata();
    let pipeline = img.rotate();
    if ((meta.width || 0) > MAX_WIDTH) {
      pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
    }
    const buf = await pipeline.avif({ quality: 45, effort: 4 }).toBuffer();
    const tmpPath = p + '.opt.tmp';
    await fsp.writeFile(tmpPath, buf);
    try { await fsp.unlink(p); } catch {}
    await fsp.rename(tmpPath, p);
  }
  const after = await fileSize(p);
  const saved = before - after;
  const pct = before > 0 ? ((saved / before) * 100).toFixed(1) : '0.0';
  const rel = path.relative('.', p);
  console.log(`${rel}  ${before} -> ${after} bytes  (-${saved} bytes, ${pct}%)`);
}

async function main() {
  const target = TARGET_DIR;
  if (!fs.existsSync(target)) {
    console.error(`Directory not found: ${target}`);
    process.exit(1);
  }

  const entries = await fsp.readdir(target, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => path.join(target, e.name))
    .filter(isImageFile)
    .filter((p) => !p.startsWith(path.join(IMAGES_ROOT, '_backup')));

  if (files.length === 0) {
    console.log('No images found to optimize.');
    return;
  }

  await ensureDir(path.join(BACKUP_ROOT, path.relative(IMAGES_ROOT, target)));
  console.log(`Backup originals to: ${BACKUP_ROOT}`);
  console.log(`Optimizing ${files.length} images in: ${target}`);

  for (const file of files) {
    try {
      await processFile(file);
    } catch (err) {
      console.error(`Failed to optimize ${file}:`, err.message);
    }
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
