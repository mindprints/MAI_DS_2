// Node-only test of the Telegram command menu. Run from the repo root: npm test
//
// The menu is what people see when they type "/" on a phone, so the failure
// that matters is advertising a command the bot does not answer. Everything
// here is offline: telegram, git and the content jobs are stubbed, so running
// the suite never posts, pushes, or calls a model.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'mai-commands-'));
fs.mkdirSync(path.join(repo, 'src/site/content'), { recursive: true });
fs.writeFileSync(
  path.join(repo, 'src/site/content/notice.json'),
  JSON.stringify({ active: false, until: null, en: 'text', sv: 'text' }),
);
process.env.REPO_DIR = repo;
process.env.TELEGRAM_CHAT_ID = '99';
process.env.TELEGRAM_ALLOWED_USER_IDS = '42';

const sent = [];
require.cache[require.resolve('../telegram')] = {
  id: 'stub-telegram', filename: 'stub-telegram', loaded: true, children: [], paths: [],
  exports: {
    sendMessage: async (_chatId, text) => { sent.push(text); },
    poll: async () => {},
    setCommands: async () => true,
  },
};
require.cache[require.resolve('../gitrepo')] = {
  id: 'stub-gitrepo', filename: 'stub-gitrepo', loaded: true, children: [], paths: [],
  exports: {
    pull: async () => {}, commitAndPush: async () => 'abc1234 stub', setup: async () => {},
    status: async () => ({ branch: 'main', last: 'abc1234 stub', dirty: '' }),
    diffStat: async () => 'stub diff',
  },
};
// Stubbed so that exercising /news and friends cannot reach a model.
const stubJob = async () => ({ skipped: true, reason: 'stubbed' });
require.cache[require.resolve('../jobs')] = {
  id: 'stub-jobs', filename: 'stub-jobs', loaded: true, children: [], paths: [],
  exports: {
    runOnThisDay: stubJob,
    runAiNews: stubJob,
    runLlmIndex: stubJob,
    runLlmUsage: stubJob,
    runQuizDraft: async () => ({ count: 0, preview: '', commit: '' }),
    runQuizPublish: stubJob,
    runQuizDiscard: stubJob,
    quizStatus: () => 'stub quiz status',
  },
};

const { onMessage, COMMANDS, menuCommands, HELP } = require('../index');
const { config } = require('../config');

// Telegram's own constraints on setMyCommands.
for (const { command, description } of COMMANDS) {
  assert.match(command, /^[a-z0-9_]{1,32}$/, `"${command}" is not a legal Telegram command name`);
  assert.ok(description.length >= 1 && description.length <= 256, `"${command}" description is out of range`);
}
const names = COMMANDS.map((c) => c.command);
assert.strictEqual(new Set(names).size, names.length, 'duplicate command in the menu');

// The menu and /help are two lists of the same thing; drift is invisible
// until someone follows one of them and it does not work.
for (const name of names) {
  assert.ok(HELP.includes(`/${name}`), `/${name} is in the Telegram menu but missing from /help`);
}

// /approve is listed only when it is enabled.
config.allowApprove = false;
assert.ok(!menuCommands().some((c) => c.command === 'approve'), '/approve listed while disabled');
config.allowApprove = true;
assert.ok(menuCommands().some((c) => c.command === 'approve'), '/approve missing while enabled');
config.allowApprove = false;

// The point of the whole file: every advertised command must be handled.
(async () => {
  for (const name of names) {
    sent.length = 0;
    await onMessage({ text: `/${name}`, chat: { id: '99' }, from: { id: '42' } });
    const reply = sent.join('\n');
    assert.ok(reply.length > 0, `/${name} produced no reply at all`);
    assert.ok(
      !/^Unknown command/.test(reply),
      `/${name} is advertised in the menu but the dispatch does not handle it`,
    );
  }

  // Control: something not in the menu still falls through to the edit path's
  // unknown-command branch, so the assertion above is actually discriminating.
  sent.length = 0;
  await onMessage({ text: '/notacommand', chat: { id: '99' }, from: { id: '42' } });
  assert.match(sent.join('\n'), /^Unknown command/, 'unknown commands no longer report as unknown');

  fs.rmSync(repo, { recursive: true, force: true });
  console.log(`commands.test.js: all checks passed (${names.length} commands)`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
