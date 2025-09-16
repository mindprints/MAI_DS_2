#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src', 'site');
const outDir = path.join(rootDir, 'public');

if (!fs.existsSync(srcDir)) {
  console.error('Source directory src/site not found.');
  process.exit(1);
}

// Clean output directory
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

// Copy everything under src/site into public
fs.cpSync(srcDir, outDir, { recursive: true });

console.log('Static assets copied to public/.');
