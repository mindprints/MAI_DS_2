// Minimal Telegram Bot API client using native fetch (Node 18+).
const { config } = require('./config');

const API = () => `https://api.telegram.org/bot${config.botToken}`;
const MAX_LEN = 4000; // Telegram hard limit is 4096; keep margin for tags.

async function api(method, params = {}) {
  const res = await fetch(`${API()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const body = await res.json().catch(() => ({}));
  if (!body.ok) {
    throw new Error(`Telegram ${method} failed: ${body.description || res.status}`);
  }
  return body.result;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendMessage(chatId, text, { html = false } = {}) {
  const chunks = [];
  let rest = String(text);
  while (rest.length > 0) {
    chunks.push(rest.slice(0, MAX_LEN));
    rest = rest.slice(MAX_LEN);
  }
  for (const chunk of chunks) {
    await api('sendMessage', {
      chat_id: chatId,
      text: chunk,
      ...(html ? { parse_mode: 'HTML' } : {}),
      disable_web_page_preview: true,
    });
  }
}

// Long-poll loop. Calls onMessage(msg) for each incoming message.
// Skips any backlog that accumulated while the bot was offline.
async function poll(onMessage, { signal } = {}) {
  let offset = 0;
  try {
    const backlog = await api('getUpdates', { offset: -1, timeout: 0 });
    if (backlog.length > 0) offset = backlog[backlog.length - 1].update_id + 1;
  } catch (err) {
    console.warn('Could not read Telegram backlog:', err.message);
  }

  while (!signal?.aborted) {
    let updates;
    try {
      updates = await api('getUpdates', {
        offset,
        timeout: 50,
        allowed_updates: ['message', 'channel_post'],
      });
    } catch (err) {
      console.error('Telegram poll error:', err.message);
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    for (const update of updates) {
      offset = update.update_id + 1;
      const msg = update.message || update.channel_post;
      if (!msg) continue;
      try {
        await onMessage(msg);
      } catch (err) {
        console.error('Error handling message:', err);
        try {
          await sendMessage(msg.chat.id, `Error: ${err.message}`);
        } catch (_) {}
      }
    }
  }
}

// Register the command list Telegram shows in the "/" menu. Purely cosmetic —
// the bot answers a command whether or not it is registered — so a failure
// here must never stop the agent from starting.
async function setCommands(commands) {
  return api('setMyCommands', { commands });
}

module.exports = { sendMessage, poll, escapeHtml, setCommands };
