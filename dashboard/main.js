// Electron main process: window + IPC. All repo work happens here (renderer is
// sandboxed); the dashboard is a git client over the site repo — it edits
// content files, runs the existing tools/slides-*.js pipeline, and publishes
// by commit + push to main (Dokploy deploys from there).
//
// Two modes (see docs/DASHBOARD_PLAN.md):
//  - "managed" (recommended, for non-technical admins): the app owns a private
//    clone in its userData dir and authenticates with a stored GitHub token —
//    no terminal, no shared checkout, always publishes to main.
//  - "local" (dev): point at an existing clone and use its ambient git creds.
const { app, BrowserWindow, ipcMain, dialog, safeStorage } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');
const lib = require('./lib/dashlib');
const secretsLib = require('./lib/secrets');

const MAIN_BRANCH = 'main';
let win;

// ---------- Config + secrets ----------

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

function managedClonePath() {
  return path.join(app.getPath('userData'), 'site-clone');
}

const secrets = secretsLib.makeSecrets(
  {
    isAvailable: () => safeStorage.isEncryptionAvailable(),
    encrypt: (s) => safeStorage.encryptString(s),
    decrypt: (buf) => safeStorage.decryptString(buf),
  },
  () => path.join(app.getPath('userData'), 'github-token.enc'),
);

// Resolve the active repo path for the configured mode. managed → the private
// clone (once it exists); local → configured path or the dev default (the
// dashboard living inside the site repo).
function repoPath() {
  const cfg = loadConfig();
  if (cfg.mode === 'managed') {
    const clone = managedClonePath();
    return lib.looksLikeSiteRepo(clone) ? clone : null;
  }
  if (cfg.repoPath && lib.looksLikeSiteRepo(cfg.repoPath)) return cfg.repoPath;
  const parent = path.resolve(__dirname, '..');
  if (lib.looksLikeSiteRepo(parent)) return parent;
  return null;
}

function isManaged() {
  return loadConfig().mode === 'managed';
}

// ---------- Helpers ----------

// Non-interactive git in `dir`: GIT_TERMINAL_PROMPT=0 makes a missing/expired
// credential fail fast with an error instead of hanging the app on a hidden
// prompt (the reported "everything freezes" symptom); GCM_INTERACTIVE=never
// suppresses any Git Credential Manager popup.
function git(dir) {
  const repo = dir || repoPath();
  if (!repo) throw new Error('No site repository configured');
  return simpleGit(repo).env({
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GCM_INTERACTIVE: 'never',
  });
}

// Args that inject the stored token as an auth header for a remote git op in
// managed mode. In local mode there's no token; git uses ambient credentials.
function authArgs() {
  if (!isManaged()) return [];
  const token = secrets.load();
  if (!token) throw new Error('Not connected — no GitHub token stored. Use Connect to set it up.');
  return secretsLib.authHeaderArgs(token);
}

function scrub(err) {
  const token = isManaged() ? secrets.load() : null;
  const msg = secretsLib.redact(err && err.message ? err.message : String(err), token);
  const e = new Error(msg);
  return e;
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

function handle(channel, fn) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return ok(await fn(...args));
    } catch (err) {
      return { ok: false, error: scrub(err).message };
    }
  });
}

const NONINTERACTIVE_ENV = () => ({ ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' });

// ---------- IPC ----------

// Connection / setup state for the header and the setup panel.
handle('setup:status', () => {
  const cfg = loadConfig();
  const repo = repoPath();
  return {
    mode: cfg.mode === 'managed' ? 'managed' : 'local',
    githubRepo: cfg.githubRepo || '',
    connected: Boolean(repo),
    hasToken: secrets.has(),
    secureStorage: secrets.available(),
    repoPath: repo,
  };
});

// Managed mode: clone the repo into the app's private dir using the token,
// verify it's the museum site, then store the token encrypted. The token is
// used only as an auth header (never written to .git/config or shown back).
handle('setup:connectManaged', async ({ githubRepo, token }) => {
  if (!secrets.available()) {
    throw new Error('This computer has no secure storage available, so the access token cannot be stored safely. Use "Site folder…" with a local copy instead.');
  }
  const repo = secretsLib.normalizeRepo(githubRepo);
  const t = String(token || '').trim();
  if (!t) throw new Error('Please paste your GitHub access token.');

  const clone = managedClonePath();
  fs.rmSync(clone, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(clone), { recursive: true });

  // Clone with the token injected as a header; store the plain URL as origin.
  await simpleGit(path.dirname(clone))
    .env(NONINTERACTIVE_ENV())
    .raw([...secretsLib.authHeaderArgs(t), 'clone', '--branch', MAIN_BRANCH, secretsLib.publicRemoteUrl(repo), clone]);

  if (!lib.looksLikeSiteRepo(clone)) {
    fs.rmSync(clone, { recursive: true, force: true });
    throw new Error('That repository does not look like the museum website (missing src/site or agent/). Check the owner/name.');
  }

  const g = simpleGit(clone);
  await g.addConfig('user.name', 'MAI Dashboard');
  await g.addConfig('user.email', 'dashboard@aimuseum.se');

  secrets.save(t);
  saveConfig({ ...loadConfig(), mode: 'managed', githubRepo: repo });
  return { connected: true, githubRepo: repo };
});

handle('setup:disconnect', () => {
  secrets.clear();
  fs.rmSync(managedClonePath(), { recursive: true, force: true });
  saveConfig({ ...loadConfig(), mode: 'local' });
  return true;
});

handle('repo:info', async () => {
  const repo = repoPath();
  if (!repo) return { repo: null, mode: loadConfig().mode === 'managed' ? 'managed' : 'local' };
  const g = git(repo);
  const status = await g.status();
  const log = await g.log({ maxCount: 1 });
  return {
    repo,
    mode: isManaged() ? 'managed' : 'local',
    githubRepo: loadConfig().githubRepo || '',
    branch: status.current,
    onMainBranch: status.current === MAIN_BRANCH,
    dirty: status.files.map((f) => `${f.working_dir}${f.index} ${f.path}`.trim()),
    behind: status.behind,
    ahead: status.ahead,
    lastCommit: log.latest ? `${log.latest.hash.slice(0, 7)} ${log.latest.message}` : '',
  };
});

// Local (dev) mode only: point at an existing checkout.
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
  saveConfig({ ...loadConfig(), mode: 'local', repoPath: chosen });
  return chosen;
});

handle('repo:pull', async () => {
  await git().raw([...authArgs(), 'pull', '--ff-only', 'origin', MAIN_BRANCH]);
  return true;
});

// Publish = commit local edits, integrate remote main, push to main. Always
// targets main so the deploy branch is what changes. Managed mode owns its
// clone and keeps it on main; local mode refuses to publish off-main rather
// than silently pushing a feature branch.
handle('repo:publish', async (message) => {
  const repo = repoPath();
  if (!repo) throw new Error('No site repository configured.');
  const g = git(repo);

  const branch = (await g.revparse(['--abbrev-ref', 'HEAD'])).trim();
  if (branch !== MAIN_BRANCH) {
    if (isManaged()) {
      await g.checkout(MAIN_BRANCH);
    } else {
      throw new Error(`The site folder is on branch "${branch}", but the dashboard publishes to "${MAIN_BRANCH}". Switch it to ${MAIN_BRANCH}, or use Connect to set up a managed copy.`);
    }
  }

  const status = await g.status();
  if (status.files.length === 0 && status.ahead === 0) {
    return { published: false, reason: 'No changes to publish.' };
  }
  if (status.files.length > 0) {
    await g.add(['-A']);
    await g.commit(message || 'Dashboard edit');
  }

  // Integrate anything new on origin/main (agent posts, other admins) before
  // pushing. Rebase keeps history linear; on conflict, abort and report
  // cleanly rather than leaving the clone mid-rebase.
  try {
    await g.raw([...authArgs(), 'pull', '--rebase', 'origin', MAIN_BRANCH]);
  } catch (err) {
    await g.raw(['rebase', '--abort']).catch(() => {});
    throw new Error('Could not merge the latest site changes automatically — someone may have edited the same content. Nothing was published; please try again in a moment.');
  }

  await g.raw([...authArgs(), 'push', 'origin', `HEAD:${MAIN_BRANCH}`]);
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
