const { listDir, getFile, putFile, putBinary, deleteFile } = require('./_github.js');

const MANIFEST_PATH = 'src/site/images/slide/slides.json';
const SLIDES_DIR = 'src/site/images/slide';

async function triggerDeployHook() {
  try {
    const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
    if (!hook) return;
    await fetch(hook, { method: 'POST' });
  } catch (_) { /* ignore */ }
}

module.exports = async function handler(req, res) {
  try {
    const { method } = req;
    if (method === 'GET') {
      const entries = await listDir(SLIDES_DIR);
      const files = (Array.isArray(entries) ? entries : []).filter(e => /\.(webp|jpg|jpeg|png|avif)$/i.test(e.name || '')).map(e => e.name);
      let manifest = [];
      try { const { content } = await getFile(MANIFEST_PATH); manifest = JSON.parse(content); } catch {}
      return res.status(200).json({ files, manifest });
    }
    if (method === 'PUT') {
      const manifest = Array.isArray(req.body) ? req.body : [];
      await putFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'chore(admin): update slides manifest');
      await triggerDeployHook();
      return res.status(200).json({ ok: true });
    }
    if (method === 'POST') {
      const { name, contentBase64 } = req.body || {};
      if (!name || !/^[\w\-.]+$/.test(String(name))) return res.status(400).json({ error: 'bad name' });
      // Ensure no path traversal
      const safeName = require('path').basename(String(name));
      if (safeName !== String(name)) return res.status(400).json({ error: 'invalid name' });
      const buffer = Buffer.from(String(contentBase64 || ''), 'base64');
      // Add file size limit (e.g., 10MB)
      if (buffer.length > 10 * 1024 * 1024) return res.status(400).json({ error: 'file too large' });
      await putBinary(`${SLIDES_DIR}/${safeName}`, buffer, `chore(admin): upload ${safeName}`);
      await triggerDeployHook();
      return res.status(200).json({ ok: true });
    }
    if (method === 'DELETE') {
      const name = String(req.query.name || '');
      if (!name || !/^[\w\-.]+$/.test(name)) return res.status(400).json({ error: 'bad name' });
      const safeName = require('path').basename(name);
      if (safeName !== name) return res.status(400).json({ error: 'invalid name' });
      await deleteFile(`${SLIDES_DIR}/${safeName}`, `chore(admin): delete ${safeName}`);
      try {
        const { content } = await getFile(MANIFEST_PATH);
        const cur = JSON.parse(content);
        const next = Array.isArray(cur) ? cur.filter(it => it && it.filename !== safeName) : [];
        await putFile(MANIFEST_PATH, JSON.stringify(next, null, 2) + '\n', 'chore(admin): prune manifest');
      } catch (err) {
        console.error(`Failed to update manifest after deletion: ${err.message}`);
      }
      await triggerDeployHook();
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
