// MAI Telegram editing agent: listens for instructions in an allowlisted
// Telegram chat, edits the site via Claude, pushes to the preview branch,
// and runs the two daily content jobs.
const { config, assertRuntimeConfig } = require('./config');
const telegram = require('./telegram');
const gitrepo = require('./gitrepo');
const { runEditInstruction } = require('./editor');
const jobs = require('./jobs');
const { startScheduler, nowInZone } = require('./scheduler');

let busy = false;

function isAuthorized(msg) {
  const fromId = String(msg.from?.id || '');
  const chatId = String(msg.chat?.id || '');
  if (config.chatId && chatId !== String(config.chatId)) return false;
  return config.allowedUserIds.includes(fromId);
}

async function notify(text, { html = false } = {}) {
  if (!config.chatId) return;
  try {
    await telegram.sendMessage(config.chatId, text, { html });
  } catch (err) {
    console.error('Telegram notify failed:', err.message);
  }
}

const HELP = `MAI site agent. Send a plain message to edit the site, e.g.:
"Change the hero text on the English home page to ..."

Commands:
/status — branch, last commit, pending changes
/diff — diff stat of the working tree
/ontoday — run the "on this day" essay job now
/news — run the AI news summary job now
/approve — merge the preview branch into main (if enabled)
/help — this message

Edits are committed to ${config.agentBranch} and appear on the preview site. Nothing reaches the live site without /approve.`;

async function handleEdit(msg, instruction) {
  await telegram.sendMessage(msg.chat.id, 'Working on it…');
  await gitrepo.pull().catch(() => {});
  const { summary, turns } = await runEditInstruction(instruction, {
    onProgress: (step) => console.log('  tool:', step),
  });
  const commit = await gitrepo.commitAndPush(
    `Agent edit via Telegram\n\nInstruction: ${instruction.slice(0, 400)}`,
  );
  let reply = summary || '(no summary)';
  if (commit) {
    reply += `\n\n— Pushed to ${config.agentBranch}:\n${commit}`;
    if (config.previewUrl) reply += `\nPreview: ${config.previewUrl}`;
  } else {
    reply += '\n\n— No file changes were made.';
  }
  await telegram.sendMessage(msg.chat.id, reply);
  console.log(`Edit done in ${turns} turn(s); commit: ${commit ? 'yes' : 'no'}`);
}

async function runJob(msg, name, fn) {
  await telegram.sendMessage(msg.chat.id, `Running ${name}…`);
  await gitrepo.pull().catch(() => {});
  const result = await fn({ force: false });
  if (result.skipped) {
    await telegram.sendMessage(msg.chat.id, `Skipped: ${result.reason}. (Delete today's file to regenerate.)`);
  } else {
    await telegram.sendMessage(msg.chat.id, `Published: ${result.title}\n${result.link}`);
  }
}

async function onMessage(msg) {
  const text = (msg.text || '').trim();
  if (!text) return;

  if (!isAuthorized(msg)) {
    console.warn(`Ignoring message from unauthorized chat=${msg.chat?.id} user=${msg.from?.id}`);
    return;
  }

  if (busy && !text.startsWith('/status') && !text.startsWith('/help')) {
    await telegram.sendMessage(msg.chat.id, 'Busy with a previous task — try again in a minute.');
    return;
  }

  busy = true;
  try {
    if (text === '/help' || text === '/start') {
      await telegram.sendMessage(msg.chat.id, HELP);
    } else if (text === '/status') {
      const s = await gitrepo.status();
      const { date, time } = nowInZone();
      await telegram.sendMessage(
        msg.chat.id,
        `Branch: ${s.branch}\nLast commit: ${s.last}\nPending changes: ${s.dirty || 'none'}\nAgent time: ${date} ${time} (${config.timezone})\nJobs: onthisday ${config.onThisDayTime}, news ${config.newsTime}`,
      );
    } else if (text === '/diff') {
      const d = await gitrepo.diffStat();
      await telegram.sendMessage(msg.chat.id, d || 'Working tree clean.');
    } else if (text === '/ontoday') {
      await runJob(msg, 'on-this-day', jobs.runOnThisDay);
    } else if (text === '/news') {
      await runJob(msg, 'ai-news', jobs.runAiNews);
    } else if (text === '/approve') {
      if (!config.allowApprove) {
        await telegram.sendMessage(msg.chat.id, '/approve is disabled (set AGENT_ALLOW_APPROVE=true to enable). Merge the branch on GitHub instead.');
      } else {
        await telegram.sendMessage(msg.chat.id, `Merging ${config.agentBranch} into ${config.mainBranch}…`);
        const last = await gitrepo.approveToMain();
        await telegram.sendMessage(msg.chat.id, `Merged and pushed to ${config.mainBranch}: ${last}`);
      }
    } else if (text.startsWith('/')) {
      await telegram.sendMessage(msg.chat.id, `Unknown command. ${'\n\n'}${HELP}`);
    } else {
      await handleEdit(msg, text);
    }
  } finally {
    busy = false;
  }
}

async function main() {
  assertRuntimeConfig();
  await gitrepo.setup();
  const s = await gitrepo.status();
  console.log(`Agent starting on branch ${s.branch} (${s.last}) in ${config.repoDir}`);

  startScheduler(
    [
      {
        name: 'onthisday',
        time: config.onThisDayTime,
        run: async () => {
          await gitrepo.pull().catch(() => {});
          const r = await jobs.runOnThisDay();
          if (!r.skipped) await notify(`Published: ${r.title}\n${r.link}`);
        },
      },
      {
        name: 'ainews',
        time: config.newsTime,
        run: async () => {
          await gitrepo.pull().catch(() => {});
          const r = await jobs.runAiNews();
          if (!r.skipped) await notify(`Published: ${r.title}\n${r.link}`);
        },
      },
    ],
    {
      onError: (name, err) => {
        console.error(`Job ${name} failed:`, err);
        notify(`Job ${name} failed: ${err.message}`);
      },
    },
  );

  await notify(`Agent online. Branch: ${s.branch}. Send /help for commands.`);
  await telegram.poll(onMessage);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
