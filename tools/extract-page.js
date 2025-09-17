const fs = require('fs');
const { execSync } = require('child_process');

const [,, sourcePath, destMain, destScript] = process.argv;

if (!sourcePath || !destMain) {
  console.error('Usage: node tools/extract-page.js <git-path> <dest-main> [dest-script]');
  process.exit(1);
}

function readFromGit(path) {
  try {
    return execSync(`git show HEAD:${path}`, { encoding: 'utf8' });
  } catch (err) {
    console.error(`Failed to read ${path} from git HEAD`, err.message);
    process.exit(1);
  }
}

const html = readFromGit(sourcePath);

const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
if (!mainMatch) {
  console.error('Failed to extract <main> from', sourcePath);
  process.exit(1);
}
const mainContent = mainMatch[1].trim();
fs.writeFileSync(destMain, `${mainContent}\n`, 'utf8');

if (destScript) {
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i);
  if (scriptMatch) {
    const scriptContent = scriptMatch[1].trim();
    fs.writeFileSync(destScript, `<script>\n${scriptContent}\n</script>\n`, 'utf8');
  } else if (fs.existsSync(destScript)) {
    fs.rmSync(destScript);
  }
}
