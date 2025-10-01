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
// Ensure we're not deleting critical system directories
if (outDir === rootDir || outDir === '/' || outDir === path.dirname(rootDir)) {
  console.error('Refusing to delete unsafe directory:', outDir);
  process.exit(1);
}
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

// Copy everything under src/site into public
fs.cpSync(srcDir, outDir, { recursive: true });
console.log('Static assets copied to public/.');

// Also copy admin static UI (if present) to public/admin
try {
  const adminStatic = path.join(rootDir, 'admin', 'static');
  if (fs.existsSync(adminStatic)) {
    const dest = path.join(outDir, 'admin');
    fs.cpSync(adminStatic, dest, { recursive: true });
    console.log('Admin UI copied to public/admin/.');
  }
} catch (e) {
  console.warn('Failed to copy admin UI:', e.message);
}
