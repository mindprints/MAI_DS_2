const { contextBridge, ipcRenderer } = require('electron');

// Every call returns { ok, data } or { ok: false, error } — the renderer
// unwraps via api.call() so errors surface as exceptions with messages.
async function invoke(channel, ...args) {
  const res = await ipcRenderer.invoke(channel, ...args);
  if (!res.ok) throw new Error(res.error);
  return res.data;
}

contextBridge.exposeInMainWorld('mai', {
  repoInfo: () => invoke('repo:info'),
  repoChoose: () => invoke('repo:choose'),
  repoPull: () => invoke('repo:pull'),
  repoPublish: (message) => invoke('repo:publish', message),
  slidesList: () => invoke('slides:list'),
  slidesAdd: () => invoke('slides:add'),
  slidesRemove: (filename) => invoke('slides:remove', filename),
  slidesSaveManifest: (entries) => invoke('slides:saveManifest', entries),
  promptsList: () => invoke('prompts:list'),
  promptsRead: (rel) => invoke('prompts:read', rel),
  promptsWrite: (rel, content) => invoke('prompts:write', rel, content),
  noticeRead: () => invoke('notice:read'),
  noticeWrite: (n) => invoke('notice:write', n),
  settingsRead: () => invoke('settings:read'),
  settingsWrite: (s) => invoke('settings:write', s),
  usageSummary: () => invoke('usage:summary'),
  openrouterModels: () => invoke('openrouter:models'),
});
