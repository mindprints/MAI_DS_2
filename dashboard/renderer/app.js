/* Renderer logic. All disk/git work goes through window.mai (see preload.js). */
const $ = (sel) => document.querySelector(sel);

const ANTHROPIC_MODELS = ['claude-sonnet-5', 'claude-sonnet-4-6', 'claude-opus-4-8', 'claude-haiku-4-5'];
const JOBS = [
  { key: 'onthisday', label: '"On this day" essay', kind: 'generation' },
  { key: 'ainews', label: 'AI news briefing', kind: 'generation' },
  { key: 'editor', label: 'Telegram editor', kind: 'editor' },
];

let slides = [];
let currentPrompt = null;
let settingsDoc = null;

// ---------- Toast ----------

let toastTimer;
function toast(msg, ms = 3500) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

async function run(btn, fn) {
  const prev = btn && btn.textContent;
  if (btn) { btn.disabled = true; btn.textContent = 'Working…'; }
  try {
    return await fn();
  } catch (err) {
    toast(err.message, 6000);
    return null;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = prev; }
  }
}

// ---------- Repo header / publish bar ----------

async function refreshRepo() {
  try {
    const info = await window.mai.repoInfo();
    if (!info.repo) {
      $('#repo-line').textContent = 'No site repository found — use "Choose repo…" to point at your clone.';
      $('#publish-bar').hidden = true;
      return;
    }
    $('#repo-line').textContent = `${info.repo} — branch ${info.branch}, last: ${info.lastCommit}`;
    const pending = info.dirty.length + (info.ahead || 0);
    $('#publish-bar').hidden = pending === 0;
    $('#pending-summary').textContent = info.dirty.length
      ? `${info.dirty.length} unpublished change${info.dirty.length === 1 ? '' : 's'}`
      : `${info.ahead} committed change${info.ahead === 1 ? '' : 's'} not yet pushed`;
  } catch (err) {
    $('#repo-line').textContent = err.message;
  }
}

// ---------- Slides ----------

function fileUrl(absPath) {
  return encodeURI('file:///' + absPath.replace(/\\/g, '/'));
}

async function loadSlides() {
  slides = await window.mai.slidesList();
  const grid = $('#slides-grid');
  grid.textContent = '';
  for (const s of slides) {
    const card = document.createElement('div');
    card.className = 'slide-card';

    const img = document.createElement('img');
    img.src = fileUrl(s.absPath);
    img.alt = s.title || s.filename;
    card.appendChild(img);

    const body = document.createElement('div');
    body.className = 'body';

    const row = document.createElement('div');
    row.className = 'row';
    const name = document.createElement('span');
    name.className = 'filename';
    name.textContent = s.filename;
    const del = document.createElement('button');
    del.className = 'danger';
    del.textContent = 'Remove';
    del.addEventListener('click', () => removeSlide(del, s));
    row.append(name, del);
    body.appendChild(row);

    for (const lang of ['en', 'sv']) {
      const label = document.createElement('label');
      label.textContent = lang === 'en' ? 'Title (English)' : 'Titel (svenska)';
      const input = document.createElement('input');
      input.type = 'text';
      input.value = (s.i18n && s.i18n[lang] && s.i18n[lang].title) || '';
      input.addEventListener('input', () => {
        s.i18n = s.i18n || {};
        s.i18n[lang] = s.i18n[lang] || { title: '', description: '' };
        s.i18n[lang].title = input.value;
      });
      label.appendChild(input);
      body.appendChild(label);
    }

    card.appendChild(body);
    grid.appendChild(card);
  }
}

async function removeSlide(btn, s) {
  if (!confirm(`Remove "${s.filename}" from the slideshow?\nThe image file is deleted (recoverable from git history until published… and from history after).`)) return;
  await run(btn, async () => {
    await window.mai.slidesRemove(s.filename);
    toast(`Removed ${s.filename}`);
    await loadSlides();
    await refreshRepo();
  });
}

// ---------- Prompts ----------

const PROMPT_LABELS = {
  'agent/prompts/on-this-day.md': '"On this day" essay',
  'agent/prompts/ai-news.md': 'AI news briefing',
  'agent/prompts/editor-system.md': 'Telegram editor (system)',
  'agent/prompts/shared/html-rules.md': 'Shared: HTML rules',
  'agent/prompts/shared/bilingual-rules.md': 'Shared: bilingual rules',
};

async function loadPrompts() {
  const list = await window.mai.promptsList();
  const aside = $('#prompt-list');
  aside.textContent = '';
  for (const rel of list) {
    const btn = document.createElement('button');
    btn.textContent = PROMPT_LABELS[rel] || rel.replace('agent/prompts/', '');
    btn.dataset.rel = rel;
    btn.addEventListener('click', () => openPrompt(rel));
    aside.appendChild(btn);
  }
}

async function openPrompt(rel) {
  const content = await window.mai.promptsRead(rel);
  currentPrompt = rel;
  $('#prompt-name').textContent = PROMPT_LABELS[rel] || rel;
  const editor = $('#prompt-editor');
  editor.value = content;
  editor.disabled = false;
  $('#btn-save-prompt').disabled = false;
  for (const b of document.querySelectorAll('#prompt-list button')) {
    b.classList.toggle('active', b.dataset.rel === rel);
  }
}

// ---------- Flash notice ----------

function todayIso(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function noticeStatusLine() {
  const active = $('#notice-active').checked;
  const until = $('#notice-until').value;
  const el = $('#notice-status');
  if (!active) {
    el.textContent = 'Hidden — visitors see nothing.';
    el.classList.remove('on');
  } else if (until && until < todayIso()) {
    el.textContent = `Was visible until ${until} — now expired and hidden.`;
    el.classList.remove('on');
  } else {
    el.textContent = until ? `Visible through ${until}.` : 'Visible until you switch it off.';
    el.classList.add('on');
  }
}

async function loadNotice() {
  const n = await window.mai.noticeRead();
  $('#notice-active').checked = n.active;
  $('#notice-en').value = n.en || '';
  $('#notice-sv').value = n.sv || '';
  $('#notice-until').value = n.until || '';
  noticeStatusLine();
}

// ---------- Models & costs ----------

function modelRow(job) {
  const row = document.createElement('div');
  row.className = 'model-row';
  const label = document.createElement('span');
  label.className = 'job';
  label.textContent = job.label;

  const providerSel = document.createElement('select');
  providerSel.dataset.job = job.key;
  if (job.kind === 'generation') {
    for (const [value, text] of [['', 'Default (server setting)'], ['anthropic', 'Anthropic'], ['openrouter', 'OpenRouter']]) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = text;
      providerSel.appendChild(opt);
    }
  } else {
    const opt = document.createElement('option');
    opt.value = 'anthropic';
    opt.textContent = 'Anthropic (fixed)';
    providerSel.appendChild(opt);
    providerSel.disabled = true;
  }

  const modelInput = document.createElement('input');
  modelInput.type = 'text';
  modelInput.placeholder = 'model id (empty = default)';
  modelInput.dataset.job = job.key;
  modelInput.setAttribute('list', 'models-anthropic');
  providerSel.addEventListener('change', () => {
    modelInput.setAttribute('list', providerSel.value === 'openrouter' ? 'models-openrouter' : 'models-anthropic');
  });

  row.append(label, providerSel, modelInput);
  return row;
}

async function loadModels() {
  settingsDoc = await window.mai.settingsRead();
  const rowsEl = $('#model-rows');
  rowsEl.textContent = '';
  for (const job of JOBS) rowsEl.appendChild(modelRow(job));

  const gen = settingsDoc.generation || {};
  for (const job of JOBS) {
    const sel = document.querySelector(`select[data-job="${job.key}"]`);
    const input = document.querySelector(`input[data-job="${job.key}"]`);
    if (job.kind === 'generation') {
      sel.value = (gen[job.key] && gen[job.key].provider) || '';
      input.value = (gen[job.key] && gen[job.key].model) || '';
      if (sel.value === 'openrouter') input.setAttribute('list', 'models-openrouter');
    } else {
      input.value = settingsDoc.editorModel || '';
    }
  }

  const dlA = $('#models-anthropic');
  dlA.textContent = '';
  for (const m of ANTHROPIC_MODELS) {
    const opt = document.createElement('option');
    opt.value = m;
    dlA.appendChild(opt);
  }
  // OpenRouter catalog is nice-to-have; ignore failures (offline etc.)
  window.mai.openrouterModels().then((models) => {
    const dl = $('#models-openrouter');
    dl.textContent = '';
    for (const m of models) {
      const opt = document.createElement('option');
      opt.value = m;
      dl.appendChild(opt);
    }
  }).catch(() => {});
}

function collectSettings() {
  const out = { ...settingsDoc };
  out.generation = JSON.parse(JSON.stringify(settingsDoc.generation || {}));
  for (const job of JOBS) {
    const input = document.querySelector(`input[data-job="${job.key}"]`);
    if (job.kind === 'generation') {
      const sel = document.querySelector(`select[data-job="${job.key}"]`);
      out.generation[job.key] = { provider: sel.value, model: input.value.trim() };
    } else {
      out.editorModel = input.value.trim();
    }
  }
  return out;
}

// ---------- Cost panel ----------

const usd = (n) => '$' + (Math.round(n * 100) / 100).toFixed(2);

function renderTiles(sum) {
  const tiles = [
    { label: 'This month', value: usd(sum.monthCostUsd) },
    { label: 'Last 30 days', value: usd(sum.windowCostUsd) },
    { label: 'LLM calls logged', value: String(sum.totalCalls) },
  ];
  if (sum.unpricedCalls) {
    tiles.push({ label: 'Calls without price data', value: String(sum.unpricedCalls) });
  }
  const el = $('#stat-tiles');
  el.textContent = '';
  for (const t of tiles) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    const v = document.createElement('div');
    v.className = 'value';
    v.textContent = t.value;
    const l = document.createElement('div');
    l.className = 'label';
    l.textContent = t.label;
    tile.append(v, l);
    el.appendChild(tile);
  }
}

function renderChart(days) {
  const W = 820; const H = 200;
  const pad = { top: 10, right: 8, bottom: 22, left: 44 };
  const iw = W - pad.left - pad.right;
  const ih = H - pad.top - pad.bottom;
  const max = Math.max(0.01, ...days.map((d) => d.costUsd));
  const barW = iw / days.length;

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Bar chart of daily LLM cost in US dollars over the last 30 days');

  // gridlines + y labels (3 ticks)
  for (let i = 0; i <= 3; i++) {
    const val = (max / 3) * i;
    const y = pad.top + ih - (ih * i) / 3;
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', pad.left); line.setAttribute('x2', W - pad.right);
    line.setAttribute('y1', y); line.setAttribute('y2', y);
    line.setAttribute('class', i === 0 ? 'baseline' : 'gridline');
    svg.appendChild(line);
    const label = document.createElementNS(svgNS, 'text');
    label.setAttribute('x', pad.left - 6); label.setAttribute('y', y + 3);
    label.setAttribute('text-anchor', 'end');
    label.textContent = usd(val);
    svg.appendChild(label);
  }

  const tooltip = $('#chart-tooltip');
  days.forEach((d, i) => {
    const h = Math.round((d.costUsd / max) * ih);
    const x = pad.left + i * barW + barW * 0.15;
    const y = pad.top + ih - h;
    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', barW * 0.7);
    rect.setAttribute('height', Math.max(h, d.costUsd > 0 ? 2 : 0));
    rect.setAttribute('rx', Math.min(3, barW * 0.35));
    rect.setAttribute('class', 'bar');
    rect.addEventListener('mousemove', (ev) => {
      tooltip.hidden = false;
      tooltip.textContent = `${d.date} — ${usd(d.costUsd)} (${d.calls} call${d.calls === 1 ? '' : 's'})`;
      tooltip.style.left = `${ev.clientX + 12}px`;
      tooltip.style.top = `${ev.clientY - 28}px`;
    });
    rect.addEventListener('mouseleave', () => { tooltip.hidden = true; });
    svg.appendChild(rect);

    if (i % 5 === 0 || i === days.length - 1) {
      const label = document.createElementNS(svgNS, 'text');
      label.setAttribute('x', pad.left + i * barW + barW / 2);
      label.setAttribute('y', H - 6);
      label.setAttribute('text-anchor', 'middle');
      label.textContent = d.date.slice(5);
      svg.appendChild(label);
    }
  });

  const holder = $('#cost-chart');
  holder.textContent = '';
  holder.appendChild(svg);
}

function renderModelTable(byModel) {
  const tbody = $('#model-table tbody');
  tbody.textContent = '';
  for (const m of byModel) {
    const tr = document.createElement('tr');
    const cells = [
      m.model || '?', m.provider || '?',
      String(m.calls), m.inputTokens.toLocaleString(), m.outputTokens.toLocaleString(), usd(m.costUsd),
    ];
    cells.forEach((text, i) => {
      const td = document.createElement('td');
      if (i >= 2) td.className = 'num';
      td.textContent = text;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
  if (byModel.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'muted';
    td.textContent = 'No usage logged yet — data appears after the agent runs with the new logging.';
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

async function loadCosts() {
  const sum = await window.mai.usageSummary();
  renderTiles(sum);
  renderChart(sum.days);
  renderModelTable(sum.byModel);
}

// ---------- Tabs & wiring ----------

function showTab(name) {
  for (const b of document.querySelectorAll('.tab')) b.classList.toggle('active', b.dataset.tab === name);
  for (const p of document.querySelectorAll('.tab-panel')) p.hidden = true;
  $(`#tab-${name}`).hidden = false;
}

async function refreshAll() {
  await refreshRepo();
  await Promise.all([loadSlides(), loadNotice(), loadPrompts(), loadModels(), loadCosts()]);
}

document.addEventListener('DOMContentLoaded', () => {
  for (const b of document.querySelectorAll('.tab')) {
    b.addEventListener('click', () => showTab(b.dataset.tab));
  }

  $('#btn-refresh').addEventListener('click', (e) => run(e.target, refreshAll));

  $('#btn-choose-repo').addEventListener('click', (e) => run(e.target, async () => {
    const chosen = await window.mai.repoChoose();
    if (chosen) await refreshAll();
  }));

  $('#btn-publish').addEventListener('click', (e) => run(e.target, async () => {
    const msg = $('#publish-message').value.trim() || 'Dashboard edit';
    const res = await window.mai.repoPublish(msg);
    toast(res.published ? `Published: ${res.commit} — the site updates in a couple of minutes.` : res.reason);
    $('#publish-message').value = '';
    await refreshRepo();
  }));

  $('#btn-add-slides').addEventListener('click', (e) => run(e.target, async () => {
    const res = await window.mai.slidesAdd();
    if (res.added) {
      toast('Photos added and converted. Review titles, then Publish.');
      await loadSlides();
      await refreshRepo();
    }
  }));

  $('#btn-save-titles').addEventListener('click', (e) => run(e.target, async () => {
    await window.mai.slidesSaveManifest(slides);
    toast('Titles saved. Publish to put them live.');
    await refreshRepo();
  }));

  $('#notice-active').addEventListener('change', noticeStatusLine);
  $('#notice-until').addEventListener('change', noticeStatusLine);
  for (const b of document.querySelectorAll('.until-row button[data-days]')) {
    b.addEventListener('click', () => {
      $('#notice-until').value = todayIso(Number(b.dataset.days) - 1);
      noticeStatusLine();
    });
  }
  $('#notice-clear-until').addEventListener('click', () => {
    $('#notice-until').value = '';
    noticeStatusLine();
  });

  $('#btn-save-notice').addEventListener('click', (e) => run(e.target, async () => {
    const active = $('#notice-active').checked;
    const en = $('#notice-en').value.trim();
    const sv = $('#notice-sv').value.trim();
    if (active && !en && !sv) {
      throw new Error('The notice is switched on but has no text — write something or switch it off.');
    }
    await window.mai.noticeWrite({ active, en, sv, until: $('#notice-until').value || null });
    toast('Notice saved. Publish to put it live.');
    noticeStatusLine();
    await refreshRepo();
  }));

  $('#btn-save-prompt').addEventListener('click', (e) => run(e.target, async () => {
    if (!currentPrompt) return;
    await window.mai.promptsWrite(currentPrompt, $('#prompt-editor').value);
    toast('Prompt saved. Publish to put it live — it applies from the next run.');
    await refreshRepo();
  }));

  $('#btn-save-settings').addEventListener('click', (e) => run(e.target, async () => {
    await window.mai.settingsWrite(collectSettings());
    toast('Model choices saved. Publish to put them live.');
    await refreshRepo();
  }));

  refreshAll();
});
