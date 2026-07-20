// Encrypted token storage. The GitHub token is written to disk only after
// encryption via Electron's safeStorage (OS keychain / DPAPI), never in
// plaintext. The backend (safeStorage + file path) is injected so the pure
// logic is testable with a fake in plain node.
const fs = require('fs');

// backend: { encrypt(str)->Buffer, decrypt(Buffer)->str, isAvailable()->bool }
// fileArg: absolute path to the encrypted token blob, or a function returning
// it (deferred so it can depend on Electron's userData path, ready post-launch).
function makeSecrets(backend, fileArg) {
  // Resolve on each call: with Electron the path depends on userData, which is
  // only valid after the app is ready (this factory runs at module load).
  const filePath = () => (typeof fileArg === 'function' ? fileArg() : fileArg);
  return {
    available() {
      try {
        return backend.isAvailable();
      } catch {
        return false;
      }
    },

    has() {
      return fs.existsSync(filePath());
    },

    save(token) {
      if (!token || typeof token !== 'string') throw new Error('Token must be a non-empty string');
      if (!backend.isAvailable()) {
        throw new Error('Secure storage is unavailable on this system, so the token cannot be saved safely.');
      }
      const enc = backend.encrypt(token.trim());
      fs.writeFileSync(filePath(), enc);
    },

    // Returns the token string, or null if none stored / undecryptable.
    load() {
      const file = filePath();
      if (!fs.existsSync(file)) return null;
      try {
        return backend.decrypt(fs.readFileSync(file));
      } catch {
        return null;
      }
    },

    clear() {
      try {
        fs.unlinkSync(filePath());
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
    },
  };
}

// Normalize "owner/name" (also accepts a full github URL) or throw.
function normalizeRepo(githubRepo) {
  const repo = String(githubRepo || '').trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/, '');
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    throw new Error(`Repository must look like "owner/name", got: ${githubRepo}`);
  }
  return repo;
}

// Authenticated remote URL, passed as a command ARGUMENT to clone/fetch/push
// (never stored as origin), so git authenticates non-interactively without a
// credential helper and the token is never written to .git/config. GitHub
// accepts a PAT as the password with the x-access-token username.
//
// Passing the token this way (vs. simple-git's .env() or a `-c` config) avoids
// simple-git's block-unsafe-operations guard, which scans any explicitly
// passed env and refuses when it sees editor/ssh/pager vars a dev shell has.
function authedRemoteUrl(githubRepo, token) {
  if (!token) throw new Error('No token available for authenticated git operation');
  return `https://x-access-token:${encodeURIComponent(token)}@github.com/${normalizeRepo(githubRepo)}.git`;
}

// Public remote URL (no token) — stored as the clone's origin and shown in UI.
function publicRemoteUrl(githubRepo) {
  return `https://github.com/${normalizeRepo(githubRepo)}.git`;
}

// Redact a token anywhere it might appear in an error string or command echo,
// so a failure message never leaks the secret to the UI or logs.
function redact(text, token) {
  if (!text || !token) return text;
  return String(text).split(token).join('***');
}

module.exports = { makeSecrets, normalizeRepo, authedRemoteUrl, publicRemoteUrl, redact };
