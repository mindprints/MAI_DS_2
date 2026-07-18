// Electron main process: window + IPC. All repo work happens here (renderer is
// sandboxed); the dashboard is a git client over the site repo — it edits
// content files, runs the existing tools/slides-*.js pipeline, and publishes
// by commit + push to main (Dokploy deploys from there).
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');
const lib = require('./lib/dashlib');

let win;

// ---------- Config (repo path) ----------

function configFile() {
  return path.join(app.getPath('userData'), 'config.json');
}

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configFile(), 'utf8'));
  } catch {
    return {};
  }
}

function saveConfig(cfg) {
  fs.mkdirSync(path.dirname(configFile()), { recursive: true });
  fs.writeFileSync(configFile(), JSON.stringify(cfg, null, 2), 'utf8');
}

function repoPath() {
  const cfg = loadConfig();
  if (cfg.repoPath && lib.looksLikeSiteRepo(cfg.repoPath)) return cfg.repoPath;
  // Dev default: the dashboard lives inside the site repo.
  const parent = path.resolve(__dirname, '..');
  if (lib.looksLikeSiteRepo(parent)) return parent;
  return null;
}

// ---------- Helpers ----------

function git() {
  const repo = repoPath();
  if (!repo) throw new Error('No site repository configured');
  return simpleGit(repo);
}

// Run a repo tool (tools/slides-add.js etc.) with the Electron binary in
// plain-Node mode, so it works the same in dev and when packaged.
function runTool(script, args) {
  const repo = repoPath();
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [path.join(repo, 'tools', script), ...args],
      {
        cwd: repo,
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
        maxBuffer: 10 * 1024 * 1024,
        timeout: 5 * 60 * 1000,
      },
      (err, stdout = '', stderr = '') => {
        resolve({ ok: !err, output: `${stdout}\n${stderr}`.trim() });
      },
    );
  });
}

const ok = (data) => ({ ok: true, data });
const fail = (err) => ({ ok: false, error: err.message || String(err) });

function handle(channel, fn) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return ok(await fn(...args));
    } catch (err) {
      return fail(err);
    }
  });
}

// ---------- IPC ----------

handle('repo:info', async () => {
  const repo = repoPath();
  if (!repo) return { repo: null };
  const status = await git().status();
  const log = await git().log({ maxCount: 1 });
  return {
    repo,
    branch: status.current,
    dirty: status.files.map((f) => `${f.working_dir}${f.index} ${f.path}`.trim()),
    behind: status.behind,
    ahead: status.ahead,
    lastCommit: log.latest ? `${log.latest.hash.slice(0, 7)} ${log.latest.message}` : '',
  };
});

handle('repo:choose', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Choose the site folder (your copy of the website files)',
    defaultPath: repoPath() || app.getPath('home'),
    properties: ['openDirectory'],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  const chosen = res.filePaths[0];
  if (!lib.looksLikeSiteRepo(chosen)) {
    throw new Error('That folder does not look like the site repository (missing src/site or agent/).');
  }
  saveConfig({ ...loadConfig(), repoPath: chosen });
  return chosen;
});

handle('repo:pull', async () => {
  await git().pull('origin', undefined, { '--ff-only': null });
  return true;
});

handle('repo:publish', async (message) => {
  const g = git();
  const before = await g.status();
  if (before.files.length === 0 && before.ahead === 0) {
    return { published: false, reason: 'No changes to publish.' };
  }
  // Pull first so the push is a fast-forward for the remote.
  await g.fetch();
  const status = await g.status();
  if (status.behind > 0 && status.files.length > 0) {
    await g.stash();
    try {
      await g.pull('origin', undefined, { '--ff-only': null });
    } finally {
      await g.stash(['pop']);
    }
  } else if (status.behind > 0) {
    await g.pull('origin', undefined, { '--ff-only': null });
  }
  if ((await g.status()).files.length > 0) {
    await g.add(['-A']);
    await g.commit(message || 'Dashboard edit');
  }
  await g.push('origin');
  const log = await g.log({ maxCount: 1 });
  return { published: true, commit: `${log.latest.hash.slice(0, 7)} ${log.latest.message}` };
});

handle('slides:list', () => lib.listSlides(repoPath()));

handle('slides:add', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Choose photos to add to the slideshow',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'tif', 'tiff'] }],
  });
  if (res.canceled || res.filePaths.length === 0) return { added: false };
  const result = await runTool('slides-add.js', res.filePaths);
  if (!result.ok) throw new Error(result.output || 'slides-add failed');
  return { added: true, output: result.output };
});

handle('slides:remove', async (filename) => {
  const result = await runTool('slides-remove.js', [filename]);
  if (!result.ok) throw new Error(result.output || 'slides-remove failed');
  return result.output;
});

handle('slides:saveManifest', (entries) => {
  lib.saveSlidesManifest(repoPath(), entries);
  return true;
});

handle('prompts:list', () => lib.listPrompts(repoPath()));
handle('prompts:read', (rel) => lib.readRepoFile(repoPath(), rel));
handle('prompts:write', (rel, content) => {
  lib.writeRepoFile(repoPath(), rel, content);
  return true;
});

handle('notice:read', () => lib.readNotice(repoPath()));
handle('notice:write', (notice) => lib.writeNotice(repoPath(), notice));

handle('settings:read', () => lib.readSettings(repoPath()));
handle('settings:write', (settings) => {
  lib.writeSettings(repoPath(), settings);
  return true;
});

handle('usage:summary', () => lib.aggregateUsage(lib.readUsage(repoPath())));

handle('openrouter:models', async () => {
  const resp = await fetch('https://openrouter.ai/api/v1/models');
  if (!resp.ok) throw new Error(`OpenRouter catalog: HTTP ${resp.status}`);
  const data = await resp.json();
  return (data.data || []).map((m) => m.id).sort();
});

// ---------- Window ----------

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    title: 'MAI Site Dashboard',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.removeMenu();
  // Surface renderer errors in the terminal (npm start) for debuggability.
  win.webContents.on('console-message', (event, level, message) => {
    if (level >= 2) console.log(`[renderer] ${message}`);
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
