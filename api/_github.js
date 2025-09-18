const OWNER_REPO = process.env.GITHUB_REPO; // e.g., "yourname/MAI_DS_2"
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN;

if (!OWNER_REPO) {
  console.warn('GITHUB_REPO is not set; API routes will fail');
}

async function ghRequest(method, apiPath, body) {
  const url = `https://api.github.com/repos/${OWNER_REPO}${apiPath}`;
  const headers = { 'Accept': 'application/vnd.github+json' };
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`GitHub ${method} ${apiPath} failed: ${res.status} ${txt}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

async function listDir(path) {
  const out = await ghRequest('GET', `/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(BRANCH)}`);
  if (!Array.isArray(out)) return [];
  return out;
}

async function getFile(path) {
  const out = await ghRequest('GET', `/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(BRANCH)}`);
  const sha = out.sha;
  const content = Buffer.from(out.content || '', 'base64').toString('utf8');
  return { sha, content };
}

async function putFile(path, content, message) {
  let sha;
  try { const cur = await getFile(path); sha = cur.sha; } catch {}
  const body = {
    message: message || `Update ${path}`,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch: BRANCH,
    sha
  };
  return ghRequest('PUT', `/contents/${encodeURIComponent(path)}`, body);
}

async function putBinary(path, buffer, message) {
  let sha;
  try { const cur = await getFile(path); sha = cur.sha; } catch {}
  const body = {
    message: message || `Upload ${path}`,
    content: Buffer.from(buffer).toString('base64'),
    branch: BRANCH,
    sha
  };
  return ghRequest('PUT', `/contents/${encodeURIComponent(path)}`, body);
}

async function deleteFile(path, message) {
  const cur = await getFile(path);
  const body = {
    message: message || `Delete ${path}`,
    branch: BRANCH,
    sha: cur.sha
  };
  return ghRequest('DELETE', `/contents/${encodeURIComponent(path)}`, body);
}

module.exports = { listDir, getFile, putFile, putBinary, deleteFile };
