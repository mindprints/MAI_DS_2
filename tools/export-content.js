#!/usr/bin/env node
const path = require('path');
const fsp = require('fs/promises');
const crypto = require('crypto');
const { getTextSegments } = require('../admin/dom');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'src', 'content');
const PAGES_DIR = path.join(CONTENT_DIR, 'pages');
const ENCYC_DIR = path.join(CONTENT_DIR, 'encyclopedia');
const SITE_DIR = path.join(ROOT, 'src', 'site');
const SITE_HTML = [
  { slug: 'index', locale: 'en', file: path.join(SITE_DIR, 'index.html') },
  { slug: 'index', locale: 'sv', file: path.join(SITE_DIR, 'sv', 'index.html') },
];
const IMAGES_DIR = path.join(SITE_DIR, 'images');

function sha1(data) {
  return crypto.createHash('sha1').update(data).digest('hex');
}

function usage() {
  console.log('Usage: node tools/export-content.js [--out-dir exports]');
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

function parseArgs(argv) {
  const args = { outDir: path.join(ROOT, 'exports') };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg.startsWith('--out-dir=')) {
      args.outDir = path.resolve(ROOT, arg.split('=')[1]);
    } else if (arg === '--out-dir') {
      const next = argv[i + 1];
      if (!next) throw new Error('Missing value for --out-dir');
      args.outDir = path.resolve(ROOT, next);
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

async function readPageFiles(dir) {
  const entries = await fsp.readdir(dir);
  const items = [];
  entries.sort();
  for (const name of entries) {
    const match = name.match(/^([a-z0-9\-]+)\.(en|sv)\.html$/i);
    if (!match) continue;
    items.push({
      slug: match[1],
      locale: match[2].toLowerCase(),
      file: path.join(dir, name),
    });
  }
  return items;
}

async function loadTextRecords() {
  const records = [];
  const pageFiles = await readPageFiles(PAGES_DIR);
  const encycloFiles = await readPageFiles(ENCYC_DIR);
  const seen = new Set();

  function addRecord(rec) {
    const key = `${rec.kind}:${rec.slug}:${rec.locale}`;
    if (seen.has(key)) return;
    seen.add(key);
    records.push(rec);
  }

  for (const { slug, locale, file } of pageFiles) {
    const html = await fsp.readFile(file, 'utf8');
    addRecord({
      kind: 'page',
      slug,
      locale,
      file: path.relative(ROOT, file),
      htmlSha1: sha1(html),
      segments: getTextSegments(html).map((seg) => ({
        id: seg.id,
        parentTag: seg.parentTag,
        text: seg.text,
        textSha1: sha1(seg.text),
      })),
    });
  }

  for (const { slug, locale, file } of encycloFiles) {
    const html = await fsp.readFile(file, 'utf8');
    addRecord({
      kind: 'encyclopedia',
      slug,
      locale,
      file: path.relative(ROOT, file),
      htmlSha1: sha1(html),
      segments: getTextSegments(html).map((seg) => ({
        id: seg.id,
        parentTag: seg.parentTag,
        text: seg.text,
        textSha1: sha1(seg.text),
      })),
    });
  }

  for (const { slug, locale, file } of SITE_HTML) {
    try {
      const html = await fsp.readFile(file, 'utf8');
      addRecord({
        kind: 'page',
        slug,
        locale,
        file: path.relative(ROOT, file),
        htmlSha1: sha1(html),
        segments: getTextSegments(html).map((seg) => ({
          id: seg.id,
          parentTag: seg.parentTag,
          text: seg.text,
          textSha1: sha1(seg.text),
        })),
      });
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  records.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    if (a.slug !== b.slug) return a.slug.localeCompare(b.slug);
    if (a.locale !== b.locale) return a.locale.localeCompare(b.locale);
    return 0;
  });

  return records;
}

async function collectHtmlFiles() {
  const htmlFiles = [];
  const targets = [PAGES_DIR, ENCYC_DIR, path.join(SITE_DIR)];

  async function walk(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        htmlFiles.push(full);
      }
    }
  }

  for (const dir of targets) {
    try {
      await walk(dir);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  htmlFiles.sort();
  return htmlFiles;
}

function normalizeSrcSet(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

async function collectImageReferences() {
  const cheerio = require('cheerio');
  const htmlFiles = await collectHtmlFiles();
  const refs = [];

  for (const fullPath of htmlFiles) {
    const html = await fsp.readFile(fullPath, 'utf8');
    const $ = cheerio.load(html, { decodeEntities: false });
    const relative = path.relative(ROOT, fullPath);

    $('img').each((_, el) => {
      const src = $(el).attr('src') || '';
      refs.push({
        tag: 'img',
        file: relative,
        src,
        alt: $(el).attr('alt') || '',
        loading: $(el).attr('loading') || '',
        decoding: $(el).attr('decoding') || '',
      });
      const srcset = normalizeSrcSet($(el).attr('srcset'));
      srcset.forEach((item) => {
        refs.push({
          tag: 'img-srcset',
          file: relative,
          src: item,
          alt: $(el).attr('alt') || '',
        });
      });
    });

    $('source').each((_, el) => {
      const srcset = normalizeSrcSet($(el).attr('srcset'));
      srcset.forEach((item) => {
        refs.push({
          tag: 'source',
          file: relative,
          src: item,
          media: $(el).attr('media') || '',
          type: $(el).attr('type') || '',
        });
      });
    });
  }

  refs.sort((a, b) => {
    if (a.src !== b.src) return a.src.localeCompare(b.src);
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    return a.tag.localeCompare(b.tag);
  });

  return refs;
}

async function collectImageFiles() {
  const files = [];

  async function walk(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        const stat = await fsp.stat(full);
        files.push({
          path: path.relative(ROOT, full),
          size: stat.size,
          mtime: stat.mtime.toISOString(),
          sha1: sha1(await fsp.readFile(full)),
        });
      }
    }
  }

  try {
    await walk(IMAGES_DIR);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    process.exit(0);
  }

  await ensureDir(args.outDir);

  const textRecords = await loadTextRecords();
  const imageRefs = await collectImageReferences();
  const imageFiles = await collectImageFiles();

  const summary = {
    generatedAt: new Date().toISOString(),
    root: path.basename(ROOT),
    totals: {
      textRecords: textRecords.length,
      segments: textRecords.reduce((sum, rec) => sum + rec.segments.length, 0),
      imageRefs: imageRefs.length,
      imageFiles: imageFiles.length,
    },
  };

  await Promise.all([
    fsp.writeFile(path.join(args.outDir, 'pages-and-ency.json'), JSON.stringify(textRecords, null, 2) + '\n', 'utf8'),
    fsp.writeFile(path.join(args.outDir, 'image-refs.json'), JSON.stringify(imageRefs, null, 2) + '\n', 'utf8'),
    fsp.writeFile(path.join(args.outDir, 'image-files.json'), JSON.stringify(imageFiles, null, 2) + '\n', 'utf8'),
    fsp.writeFile(path.join(args.outDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8'),
  ]);

  console.log(`Export complete → ${args.outDir}`);
  console.log(`  Text records: ${summary.totals.textRecords}`);
  console.log(`  Segments:     ${summary.totals.segments}`);
  console.log(`  Image refs:   ${summary.totals.imageRefs}`);
  console.log(`  Image files:  ${summary.totals.imageFiles}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
