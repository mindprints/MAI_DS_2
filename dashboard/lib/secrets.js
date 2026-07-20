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

// Per-command git args that inject the token as an HTTP Authorization header,
// so the managed clone authenticates without an interactive credential helper
// and WITHOUT persisting the token in .git/config. GitHub accepts a PAT via
// Basic auth with the x-access-token username.
function authHeaderArgs(token) {
  if (!token) throw new Error('No token available for authenticated git operation');
  const b64 = Buffer.from(`x-access-token:${token}`).toString('base64');
  return ['-c', `http.extraHeader=Authorization: Basic ${b64}`];
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

module.exports = { makeSecrets, normalizeRepo, authHeaderArgs, publicRemoteUrl, redact };
