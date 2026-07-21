// Runs every *.test.js in this directory, each in its own process so the
// agent's module cache and REPO_DIR stubbing in one file cannot leak into the
// next. Exits non-zero on the first failure. Adding a test file is enough to
// have it run — there is no list to keep up to date.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.test.js'))
  .sort();

if (files.length === 0) {
  console.error('No test files found in', dir);
  process.exit(1);
}

for (const file of files) {
  try {
    execFileSync(process.execPath, [path.join(dir, file)], { stdio: 'inherit' });
  } catch {
    console.error(`\nFAILED: ${file}`);
    process.exit(1);
  }
}

console.log(`\n${files.length} test file(s) passed.`);
