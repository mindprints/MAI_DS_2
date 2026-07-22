// MAI Telegram editing agent: listens for instructions in an allowlisted
// Telegram chat, edits the site via Claude, pushes to the preview branch,
// and runs the two daily content jobs.
const { config, assertRuntimeConfig } = require('./config');
const telegram = require('./telegram');
const gitrepo = require('./gitrepo');
const { runEditInstruction } = require('./editor');
const jobs = require('./jobs');
const notice = require('./notice');
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
/ontoday <event> — regenerate today's essay about a specific anniversary
/news — run the AI news summary job now
/news <topic> — regenerate today's briefing with <topic> as the lead story
/llmindex — refresh the LLM leaderboard card now
/llmusage — refresh the OpenRouter usage card now
/approve — merge the preview branch into main (if enabled)
/help — this message

Flash notice on the home pages (one at a time):
/notice — show what is up right now
/notice content <text> — set the text (English and Swedish)
/notice sv <text> — correct the Swedish version
/notice post — put it up; it stays until removed
/notice remove — take it down
Expiry dates stay in the dashboard; /notice post clears any date it finds.

Quiz (the rotating current-events questions; the evergreen ones are hand-written and untouched):
/quiz — what is drafted or live right now
/quiz draft — research and draft new questions for review
/quiz draft <topic> — draft them about a particular subject
/quiz publish — put the drafted questions on the site
/quiz discard — throw the draft away
Nothing reaches the site until you send /quiz publish.

Edits are committed to ${config.agentBranch} and deploy to ${config.previewUrl || 'the site'}.`;

// What Telegram offers in the "/" menu. Only top-level commands exist as far
// as Telegram is concerned, so /notice carries its subcommands in the
// description. Ordered by how often they get used, since that is the order
// the menu shows. Keep in step with HELP — a test asserts they agree.
const COMMANDS = [
  { command: 'notice', description: 'Flash notice — /notice, content <text>, sv <text>, post, remove' },
  { command: 'status', description: 'Branch, last commit, pending changes' },
  { command: 'news', description: 'Run the AI news summary now (/news <topic> to steer the lead)' },
  { command: 'ontoday', description: 'Run the "on this day" essay now (/ontoday <event> to steer it)' },
  { command: 'diff', description: 'Diff stat of the working tree' },
  { command: 'quiz', description: 'Quiz questions — /quiz, draft [topic], publish, discard' },
  { command: 'llmindex', description: 'Refresh the LLM leaderboard card' },
  { command: 'llmusage', description: 'Refresh the OpenRouter usage card' },
  { command: 'help', description: 'What I can do' },
];

// /approve is only listed when it is actually enabled — offering a command
// that answers "that is disabled" is worse than not offering it.
function menuCommands() {
  return config.allowApprove
    ? [...COMMANDS, { command: 'approve', description: `Merge ${config.agentBranch} into ${config.mainBranch}` }]
    : COMMANDS;
}

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

async function runJob(msg, name, fn, topic = '') {
  await telegram.sendMessage(msg.chat.id, topic ? `Running ${name} (lead: ${topic})…` : `Running ${name}…`);
  await gitrepo.pull().catch(() => {});
  const result = await fn({ force: false, topic });
  if (result.skipped) {
    await telegram.sendMessage(msg.chat.id, `Skipped: ${result.reason}. (Add a topic, e.g. "/news <topic>", to regenerate today's post.)`);
  } else {
    await telegram.sendMessage(msg.chat.id, `Published: ${result.title}\n${result.link}`);
  }
}

const NOTICE_USAGE =
  'Use: /notice · /notice content <text> · /notice sv <text> · /notice post · /notice remove';

// The flash notice is a single file, so these subcommands edit one notice
// rather than managing a list. Durations stay in the dashboard: /notice post
// clears "until", so a posted notice runs until /notice remove takes it down.
async function handleNotice(msg, arg) {
  // Pull first — the dashboard writes this same file, and clobbering an edit
  // made there would be silent.
  await gitrepo.pull().catch(() => {});
  const current = notice.read();

  const sub = arg.split(/\s+/)[0] || '';
  const body = arg.slice(sub.length).trim();

  if (!sub) {
    await telegram.sendMessage(msg.chat.id, notice.describe(current));
    return;
  }

  let next;
  let what;
  if (sub === 'content' || sub === 'sv') {
    if (!body) {
      await telegram.sendMessage(msg.chat.id, `Send the text too, e.g. "/notice ${sub} Doors open at 18:00".`);
      return;
    }
    next = sub === 'sv' ? { ...current, sv: body } : { ...current, en: body, sv: body };
    what = sub === 'sv' ? 'Swedish text updated.' : 'Text set, in both languages.';
    if (!current.active) what += ' Not posted yet — send /notice post when you want it up.';
  } else if (sub === 'post') {
    if (!current.en.trim() && !current.sv.trim()) {
      await telegram.sendMessage(msg.chat.id, 'Nothing to post yet — set the text first with /notice content <text>.');
      return;
    }
    next = { ...current, active: true, until: null };
    what = notice.isExpired(current)
      ? `Expiry date (${current.until}) cleared and the notice is back up.`
      : 'Notice is up.';
  } else if (sub === 'remove') {
    if (!current.active) {
      await telegram.sendMessage(msg.chat.id, `Nothing is posted right now.\n\n${notice.describe(current)}`);
      return;
    }
    next = { ...current, active: false };
    what = 'Notice taken down. The text is kept, so /notice post puts it back.';
  } else {
    await telegram.sendMessage(msg.chat.id, `Unknown notice command "${sub}".\n\n${NOTICE_USAGE}`);
    return;
  }

  notice.write(next);
  const commit = await gitrepo.commitAndPush(`Notice: ${sub} via Telegram`);
  let reply = `${what}\n\n${notice.describe(notice.read())}`;
  reply += commit
    ? `\n\n— Pushed to ${config.agentBranch}; live once the site redeploys.`
    : '\n\n— Already in that state, nothing to push.';
  await telegram.sendMessage(msg.chat.id, reply);
}

const QUIZ_USAGE = 'Use: /quiz · /quiz draft [topic] · /quiz publish · /quiz discard';

// Two steps on purpose. The evergreen questions are hand-verified; these are
// not, so drafting and publishing are separate commands with the editor's
// reading in between. /quiz draft only ever writes quiz-pending.json, which
// the site does not read.
async function handleQuiz(msg, arg) {
  await gitrepo.pull().catch(() => {});
  const sub = arg.split(/\s+/)[0] || '';
  const body = arg.slice(sub.length).trim();

  if (!sub) {
    await telegram.sendMessage(msg.chat.id, jobs.quizStatus());
    return;
  }

  if (sub === 'draft') {
    await telegram.sendMessage(
      msg.chat.id,
      body ? `Researching quiz questions about "${body}"…` : 'Researching current AI news for quiz questions…',
    );
    const r = await jobs.runQuizDraft({ topic: body });
    await telegram.sendMessage(
      msg.chat.id,
      `Drafted ${r.count} question(s). ✓ marks the answer I believe is correct — check the facts before publishing.\n\n${r.preview}\n\nSend /quiz publish to put these on the site, or /quiz discard to bin them.`,
    );
    return;
  }

  if (sub === 'publish') {
    const r = await jobs.runQuizPublish();
    if (r.skipped) {
      await telegram.sendMessage(msg.chat.id, r.reason);
      return;
    }
    await telegram.sendMessage(
      msg.chat.id,
      `Published ${r.published} question(s)${r.replaced ? `, replacing the previous ${r.replaced}` : ''}. Live once the site redeploys.`,
    );
    return;
  }

  if (sub === 'discard') {
    const r = await jobs.runQuizDiscard();
    await telegram.sendMessage(msg.chat.id, r.skipped ? r.reason : 'Draft discarded. The live quiz is unchanged.');
    return;
  }

  await telegram.sendMessage(msg.chat.id, `Unknown quiz command "${sub}".\n\n${QUIZ_USAGE}`);
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
    } else if (text === '/ontoday' || text.startsWith('/ontoday ')) {
      await runJob(msg, 'on-this-day', jobs.runOnThisDay, text.slice('/ontoday'.length).trim());
    } else if (text === '/news' || text.startsWith('/news ')) {
      await runJob(msg, 'ai-news', jobs.runAiNews, text.slice('/news'.length).trim());
    } else if (text === '/llmindex') {
      await runJob(msg, 'llm-index', jobs.runLlmIndex);
    } else if (text === '/llmusage') {
      await runJob(msg, 'llm-usage', jobs.runLlmUsage);
    } else if (text === '/notice' || text.startsWith('/notice ')) {
      await handleNotice(msg, text.slice('/notice'.length).trim());
    } else if (text === '/quiz' || text.startsWith('/quiz ')) {
      await handleQuiz(msg, text.slice('/quiz'.length).trim());
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

  // Cosmetic, and Telegram is a third party that can be having a bad day —
  // never let this stop the bot from coming up.
  try {
    await telegram.setCommands(menuCommands());
    console.log(`Registered ${menuCommands().length} commands with Telegram.`);
  } catch (err) {
    console.warn('Could not register the Telegram command menu:', err.message);
  }

  startScheduler(
    [
      // Scheduled runs are silent on success — Telegram only carries replies
      // to the editor's own messages and critical errors (onError below).
      {
        name: 'onthisday',
        time: config.onThisDayTime,
        run: async () => {
          await gitrepo.pull().catch(() => {});
          const r = await jobs.runOnThisDay();
          if (!r.skipped) console.log(`onthisday published: ${r.title}`);
        },
      },
      {
        name: 'ainews',
        time: config.newsTime,
        run: async () => {
          await gitrepo.pull().catch(() => {});
          const r = await jobs.runAiNews();
          if (!r.skipped) console.log(`ainews published: ${r.title}`);
        },
      },
      {
        name: 'llmindex',
        time: config.llmIndexTime,
        run: async () => {
          if (!config.aaApiKey) return;
          await gitrepo.pull().catch(() => {});
          await jobs.runLlmIndex();
        },
      },
      {
        name: 'llmusage',
        time: config.llmUsageTime,
        run: async () => {
          if (!config.openRouterApiKey) return;
          await gitrepo.pull().catch(() => {});
          await jobs.runLlmUsage();
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

  await telegram.poll(onMessage);
}

// Guarded so the message handlers can be required from a test without the
// bot starting to poll. The entrypoint runs `node /app/agent/index.js`, so
// this holds in production.
if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}

module.exports = { onMessage, handleNotice, COMMANDS, menuCommands, HELP };
