#!/usr/bin/env bash
set -euo pipefail

# Create admin directories
mkdir -p admin/static

# Admin backend (Express)
cat > admin/server.js << 'JS'
const express = require('express');
const fsp = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');

const app = express();
app.use(express.json({ limit: '10mb' }));

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'src', 'content', 'pages');
const SITE_DIR = path.join(ROOT, 'src', 'site');
const SLIDES_DIR = path.join(SITE_DIR, 'images', 'slide');
const SLIDES_MANIFEST = path.join(SLIDES_DIR, 'slides.json');

function isSafeSlug(name) { return /^[a-z0-9\-]+$/i.test(name); }

app.get('/api/pages', async (_req, res) => {
  try {
    const files = await fsp.readdir(CONTENT_DIR);
    const slugs = new Set();
    for (const f of files) {
      const m = f.match(/^(.+)\.(en|sv)\.html$/);
      if (m) slugs.add(m[1]);
    }
    res.json({ slugs: Array.from(slugs).sort(), home: ['index'] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/pages/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const readIf = async (p) => { try { return await fsp.readFile(p, 'utf8'); } catch { return ''; } };
    if (slug === 'index') {
      return res.json({
        en: await readIf(path.join(SITE_DIR, 'index.html')),
        sv: await readIf(path.join(SITE_DIR, 'sv', 'index.html'))
      });
    }
    if (!isSafeSlug(slug)) return res.status(400).json({ error: 'bad slug' });
    const en = await readIf(path.join(CONTENT_DIR, `${slug}.en.html`));
    const sv = await readIf(path.join(CONTENT_DIR, `${slug}.sv.html`));
    res.json({ en, sv });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/pages/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    const { en, sv } = req.body || {};
    if (slug === 'index') {
      if (typeof en === 'string') await fsp.writeFile(path.join(SITE_DIR, 'index.html'), en, 'utf8');
      if (typeof sv === 'string') await fsp.writeFile(path.join(SITE_DIR, 'sv', 'index.html'), sv, 'utf8');
      return res.json({ ok: true });
    }
    if (!isSafeSlug(slug)) return res.status(400).json({ error: 'bad slug' });
    if (typeof en === 'string') await fsp.writeFile(path.join(CONTENT_DIR, `${slug}.en.html`), en, 'utf8');
    if (typeof sv === 'string') await fsp.writeFile(path.join(CONTENT_DIR, `${slug}.sv.html`), sv, 'utf8');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/slides', async (_req, res) => {
  try {
    const entries = await fsp.readdir(SLIDES_DIR, { withFileTypes: true });
    const files = entries.filter(e => e.isFile()).map(e => e.name).filter(n => /\.(webp|jpg|jpeg|png|avif)$/i.test(n));
    let manifest = [];
    try { manifest = JSON.parse(await fsp.readFile(SLIDES_MANIFEST, 'utf8')); } catch {}
    res.json({ files, manifest });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/slides', async (req, res) => {
  try {
    const manifest = Array.isArray(req.body) ? req.body : [];
    await fsp.writeFile(SLIDES_MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/slides/upload', express.raw({ type: '*/*', limit: '50mb' }), async (req, res) => {
  try {
    const name = req.query.name;
    if (!name || !/^[\w\-.]+$/.test(name)) return res.status(400).json({ error: 'bad name' });
    await fsp.writeFile(path.join(SLIDES_DIR, name), req.body);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/build', (_req, res) => {
  exec('npm run build', { cwd: ROOT }, (err, stdout, stderr) => res.json({ ok: !err, stdout, stderr }));
});

app.use('/slides-assets', express.static(SLIDES_DIR));
app.use(express.static(path.join(__dirname, 'static')));

const PORT = process.env.PORT || 5179;
app.listen(PORT, () => console.log(`Admin running on http://localhost:${PORT}`));
JS

# Admin UI (Pages EN/SV side-by-side + basic Slides controls)
cat > admin/static/index.html << 'HTML'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MAI Admin</title>
  <style>
    body { font-family: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; margin:20px; }
    .row { display:flex; gap:16px; align-items:flex-start; }
    textarea { width:100%; height:380px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .col { flex:1; } .card { border:1px solid #ddd; padding:12px; border-radius:8px; }
    table { border-collapse:collapse; width:100%; } td,th { border:1px solid #ddd; padding:6px; }
    input[type="text"], input[type="number"] { width:100%; }
    .muted { color:#666; font-size:90%; }
    .toolbar { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  </style>
  <script>
    async function api(path, opts){const r=await fetch(path,opts);if(!r.ok)throw new Error(await r.text());return r.headers.get('content-type')?.includes('application/json')?r.json():r.text();}
    // Pages
    async function loadPages(){const m=await api('/api/pages');const sel=document.getElementById('slug');sel.innerHTML='';const all=['index',...m.slugs];for(const s of all){const o=document.createElement('option');o.value=s;o.textContent=s;sel.appendChild(o);}sel.value='index';await loadPage();}
    async function loadPage(){const slug=document.getElementById('slug').value;const d=await api('/api/pages/'+encodeURIComponent(slug));document.getElementById('en').value=d.en||'';document.getElementById('sv').value=d.sv||'';}
    async function savePage(){const slug=document.getElementById('slug').value;const body={en:en.value,sv:sv.value};await api('/api/pages/'+encodeURIComponent(slug),{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(body)});alert('Saved');}
    async function buildSite(){const r=await api('/api/build',{method:'POST'});alert(r.ok?'Build finished':'Build error');}
    // Slides
    let slidesFiles=[],slidesManifest=[];
    function getOrMakeEntry(filename){let it=slidesManifest.find(x=>x.filename===filename);if(!it){it={number:9999,filename,title:filename,description:'',i18n:{en:{title:'',description:''},sv:{title:'',description:''}}};slidesManifest.push(it);}if(!it.i18n)it.i18n={en:{title:'',description:''},sv:{title:'',description:''}};if(!it.i18n.en)it.i18n.en={title:'',description:''};if(!it.i18n.sv)it.i18n.sv={title:'',description:''};return it;}
    function renderSlides(){const tbody=document.querySelector('#slides tbody');tbody.innerHTML='';const rows=slidesFiles.map(fn=>getOrMakeEntry(fn));rows.sort((a,b)=>(a.number||9999)-(b.number||9999)||a.filename.localeCompare(b.filename));for(const it of rows){const tr=document.createElement('tr');tr.innerHTML=`<td><img src="/slides-assets/${it.filename}" alt="" width="80"></td><td><input type="number" value="${it.number||''}"></td><td class="muted">${it.filename}</td><td><input type="text" value="${(it.i18n.en.title||'').replace(/&/g,'&amp;')}"></td><td><input type="text" value="${(it.i18n.en.description||'').replace(/&/g,'&amp;')}"></td><td><input type="text" value="${(it.i18n.sv.title||'').replace(/&/g,'&amp;')}"></td><td><input type="text" value="${(it.i18n.sv.description||'').replace(/&/g,'&amp;')}"></td>`;const [imgTd,numTd,fileTd,enTitleTd,enDescTd,svTitleTd,svDescTd]=tr.children;numTd.querySelector('input').addEventListener('input',e=>{it.number=parseInt(e.target.value||'0',10)||undefined;});enTitleTd.querySelector('input').addEventListener('input',e=>{it.i18n.en.title=e.target.value;});enDescTd.querySelector('input').addEventListener('input',e=>{it.i18n.en.description=e.target.value;});svTitleTd.querySelector('input').addEventListener('input',e=>{it.i18n.sv.title=e.target.value;});svDescTd.querySelector('input').addEventListener('input',e=>{it.i18n.sv.description=e.target.value;});tbody.appendChild(tr);}}
    async function loadSlides(){const d=await api('/api/slides');slidesFiles=d.files||[];slidesManifest=Array.isArray(d.manifest)?d.manifest:[];renderSlides();}
    async function saveSlides(){await api('/api/slides',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(slidesManifest)});alert('Slides manifest saved');}
    async function uploadSlide(){const f=document.getElementById('upload').files[0];if(!f)return alert('Choose a file');const buf=await f.arrayBuffer();const r=await fetch('/api/slides/upload?name='+encodeURIComponent(f.name),{method:'POST',body:buf});if(!r.ok)return alert('Upload failed');await loadSlides();alert('Uploaded');}
    window.addEventListener('DOMContentLoaded', loadPages);
  </script>
</head>
<body>
  <h1>MAI Admin</h1>
  <section class="card">
    <h2>Pages</h2>
    <div class="toolbar">
      <label for="slug">Page:</label>
      <select id="slug" onchange="loadPage()"></select>
      <button onclick="savePage()">Save</button>
      <button onclick="buildSite()">Build</button>
    </div>
    <div class="row" style="margin-top:10px;">
      <div class="col"><h3>English</h3><textarea id="en"></textarea></div>
      <div class="col"><h3>Svenska</h3><textarea id="sv"></textarea></div>
    </div>
  </section>

  <section class="card" style="margin-top:20px;">
    <h2>Slides</h2>
    <div class="toolbar" style="margin-bottom:8px;">
      <button onclick="loadSlides()">Load</button>
      <input type="file" id="upload" accept=".webp,.jpg,.jpeg,.png,.avif">
      <button onclick="uploadSlide()">Upload</button>
      <button onclick="saveSlides()">Save Manifest</button>
    </div>
    <table id="slides">
      <thead><tr><th>Preview</th><th>#</th><th>Filename</th><th>EN Title</th><th>EN Desc</th><th>SV Title</th><th>SV Desc</th></tr></thead>
      <tbody></tbody>
    </table>
    <p class="muted">Order uses the numeric field; Build after saving to publish.</p>
  </section>
</body>
</html>
HTML

# Update manifest generator to preserve metadata + i18n
cat > tools/generate-slides-manifest.js << 'JS'
#!/usr/bin/env node
/*
  Generate a slides manifest JSON from images in src/site/images/slide.
  - Reads image files (.webp, .jpg, .jpeg, .png, .avif)
  - Sorts by leading number prefix if present (e.g., 12-foo.webp)
  - Derives a human title from filename if none provided elsewhere
  - Preserves existing metadata including i18n titles/descriptions
  - Writes src/site/images/slide/slides.json
*/
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const IMAGES_ROOT = path.join('src', 'site', 'images');
const SLIDES_DIR = path.join(IMAGES_ROOT, 'slide');
const OUT_PATH = path.join(SLIDES_DIR, 'slides.json');

function isImageFile(name) {
  const ext = path.extname(name).toLowerCase();
  return ['.webp', '.jpg', '.jpeg', '.png', '.avif'].includes(ext);
}
function parseNumberPrefix(filename) {
  const base = path.basename(filename);
  const match = base.match(/^(\d+)[-_]/);
  return match ? parseInt(match[1], 10) : null;
}
function toTitleFromFilename(filename) {
  const base = path.basename(filename, path.extname(filename));
  const cleaned = base.replace(/^\d+[-_]?/, '');
  const spaced = cleaned.replace(/[-_]+/g, ' ').trim();
  if (!spaced) return base;
  return spaced.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

async function main() {
  if (!fs.existsSync(SLIDES_DIR)) {
    console.error(`Directory not found: ${SLIDES_DIR}`);
    process.exit(1);
  }
  const entries = await fsp.readdir(SLIDES_DIR, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile()).map((e) => e.name).filter(isImageFile);

  if (files.length === 0) {
    await fsp.writeFile(OUT_PATH, '[]\n');
    console.log(`Wrote empty manifest: ${OUT_PATH}`);
    return;
  }

  let existing = [];
  try { if (fs.existsSync(OUT_PATH)) existing = JSON.parse(await fsp.readFile(OUT_PATH, 'utf8')); } catch {}
  const byFilename = new Map(Array.isArray(existing) ? existing.map(it => [it && it.filename, it]).filter(([k]) => typeof k === 'string') : []);

  const items = files.map((filename) => {
    const number = parseNumberPrefix(filename);
    const prev = byFilename.get(filename) || {};
    return {
      number: number == null ? undefined : number,
      filename,
      title: typeof prev.title === 'string' ? prev.title : toTitleFromFilename(filename),
      description: typeof prev.description === 'string' ? prev.description : '',
      i18n: (prev.i18n && typeof prev.i18n === 'object') ? prev.i18n : { en: { title: '', description: '' }, sv: { title: '', description: '' } }
    };
  });

  items.sort((a, b) => {
    const an = a.number ?? Number.POSITIVE_INFINITY;
    const bn = b.number ?? Number.POSITIVE_INFINITY;
    if (an !== bn) return an - bn;
    return a.filename.localeCompare(b.filename);
  });

  let seq = 1;
  for (const it of items) {
    if (typeof it.number !== 'number' || !Number.isFinite(it.number)) it.number = seq;
    seq++;
  }

  await fsp.writeFile(OUT_PATH, JSON.stringify(items, null, 2) + '\n');
  console.log(`Wrote manifest: ${OUT_PATH} (${items.length} entries)`);
}
main().catch((err) => { console.error(err); process.exit(1); });
JS

# Add npm script; install Express
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));p.scripts=p.scripts||{};p.scripts.admin='node admin/server.js';fs.writeFileSync('package.json',JSON.stringify(p,null,2));console.log('Added scripts.admin');"
npm i express@^4.19.2
echo "All set. Start admin with: npm run admin"
