// Node-only test of the quiz question gate. Run from the repo root: npm test
//
// validateQuizQuestions is the only thing between model output and a public
// quiz, so the failures that matter here are the ones that would reach a
// visitor as a question marking the wrong option correct. Everything is
// offline: git is stubbed and no model is called.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'mai-quiz-'));
fs.mkdirSync(path.join(repo, 'src/site/content'), { recursive: true });

const BANK = {
  version: 1,
  updated: '2026-07-22',
  evergreen: [
    {
      id: 'token',
      answer: 1,
      en: { q: 'What is a token?', options: ['a', 'b', 'c', 'd'], why: 'because' },
      sv: { q: 'Vad är en token?', options: ['a', 'b', 'c', 'd'], why: 'därför' },
    },
  ],
  current: [],
};
const bankFile = path.join(repo, 'src/site/content/quiz.json');
const pendingFile = path.join(repo, 'src/site/content/quiz-pending.json');
fs.writeFileSync(bankFile, JSON.stringify(BANK, null, 2));

process.env.REPO_DIR = repo;

const commits = [];
require.cache[require.resolve('../gitrepo')] = {
  id: 'stub-gitrepo', filename: 'stub-gitrepo', loaded: true, children: [], paths: [],
  exports: {
    commitAndPush: async (msg) => { commits.push(msg); return 'stubsha'; },
    pull: async () => {},
  },
};

const jobs = require('../jobs');

function good(overrides) {
  return Object.assign(
    {
      id: 'new-thing',
      answer: 2,
      en: { q: 'What happened?', options: ['w', 'x', 'y', 'z'], why: 'Because of this.' },
      sv: { q: 'Vad hände?', options: ['w', 'x', 'y', 'z'], why: 'På grund av detta.' },
    },
    overrides,
  );
}

function rejects(label, question, taken = new Set()) {
  assert.throws(
    () => jobs.validateQuizQuestions([question], taken),
    (err) => err instanceof Error,
    `should have rejected: ${label}`,
  );
}

// The happy path stays accepted, or every rejection below proves nothing.
assert.deepStrictEqual(jobs.validateQuizQuestions([good()], new Set()).length, 1);

// An answer index past the end of the options would mark nothing correct and
// leave the visitor unable to score — the worst silent failure of the lot.
rejects('answer out of range', good({ answer: 4 }));
rejects('negative answer', good({ answer: -1 }));
rejects('non-integer answer', good({ answer: 1.5 }));
rejects('answer as string', good({ answer: '2' }));

// Mismatched option counts desync the languages: the shared index would point
// at a different option in Swedish than in English.
rejects('five options in en', good({ en: { q: 'q', options: ['a', 'b', 'c', 'd', 'e'], why: 'w' } }));
rejects('three options in sv', good({ sv: { q: 'q', options: ['a', 'b', 'c'], why: 'w' } }));

// A missing translation would render as undefined on the Swedish page.
rejects('no sv at all', good({ sv: undefined }));
rejects('empty question text', good({ en: { q: '   ', options: ['a', 'b', 'c', 'd'], why: 'w' } }));
rejects('empty explanation', good({ sv: { q: 'q', options: ['a', 'b', 'c', 'd'], why: '' } }));
rejects('blank option', good({ en: { q: 'q', options: ['a', '', 'c', 'd'], why: 'w' } }));

// Duplicate options mean two correct answers, or an unanswerable question.
rejects('duplicate options', good({ en: { q: 'q', options: ['a', 'A', 'c', 'd'], why: 'w' } }));

// The page uses textContent, so markup is not an injection risk — but it would
// display as literal angle brackets, so keep it out of the data.
rejects('markup in option', good({ en: { q: 'q', options: ['<b>a</b>', 'b', 'c', 'd'], why: 'w' } }));
rejects('markup in explanation', good({ en: { q: 'q', options: ['a', 'b', 'c', 'd'], why: '<script>x</script>' } }));

// Ids must be usable and must not collide with a question already in the bank.
rejects('non-kebab id', good({ id: 'Not Kebab' }));
rejects('id already in bank', good({ id: 'token' }), new Set(['token']));
assert.throws(
  () => jobs.validateQuizQuestions([good(), good()], new Set()),
  /duplicate id/,
  'two questions sharing an id should be rejected',
);

// Shape failures at the top level.
assert.throws(() => jobs.validateQuizQuestions([], new Set()), /no questions/);
assert.throws(() => jobs.validateQuizQuestions(null, new Set()), /no questions/);
assert.throws(
  () => jobs.validateQuizQuestions(Array.from({ length: 9 }, (_, i) => good({ id: `q-${i}` })), new Set()),
  /max/,
  'an unbounded reply should be capped',
);

// --- publish flow -----------------------------------------------------------

// Publishing with nothing drafted must not touch the bank.
(async () => {
  const before = fs.readFileSync(bankFile, 'utf8');
  const none = await jobs.runQuizPublish();
  assert.strictEqual(none.skipped, true, 'publish with no draft should skip');
  assert.strictEqual(fs.readFileSync(bankFile, 'utf8'), before, 'bank must be untouched');

  // A draft is invisible to the site until published: it lives in its own file.
  fs.writeFileSync(pendingFile, JSON.stringify({ drafted: '2026-07-22', questions: [good()] }));
  const live = JSON.parse(fs.readFileSync(bankFile, 'utf8'));
  assert.strictEqual(live.current.length, 0, 'drafting must not add to the live bank');

  const published = await jobs.runQuizPublish();
  assert.strictEqual(published.published, 1);
  const after = JSON.parse(fs.readFileSync(bankFile, 'utf8'));
  assert.strictEqual(after.current.length, 1, 'published question should land in current');
  assert.strictEqual(after.evergreen.length, 1, 'evergreen must never be rewritten');
  assert.strictEqual(after.evergreen[0].id, 'token');
  assert.ok(!fs.existsSync(pendingFile), 'pending file should be consumed');

  // Publishing replaces the rotating set rather than growing it.
  fs.writeFileSync(pendingFile, JSON.stringify({ drafted: '2026-08-01', questions: [good({ id: 'later-thing' })] }));
  const second = await jobs.runQuizPublish();
  assert.strictEqual(second.replaced, 1, 'should report what it replaced');
  const final = JSON.parse(fs.readFileSync(bankFile, 'utf8'));
  assert.strictEqual(final.current.length, 1, 'current should not accumulate');
  assert.strictEqual(final.current[0].id, 'later-thing');

  // A corrupt draft must not be publishable.
  fs.writeFileSync(pendingFile, JSON.stringify({ drafted: 'x', questions: [good({ answer: 99 })] }));
  await assert.rejects(() => jobs.runQuizPublish(), /answer/, 'invalid draft must not publish');
  const untouched = JSON.parse(fs.readFileSync(bankFile, 'utf8'));
  assert.strictEqual(untouched.current[0].id, 'later-thing', 'failed publish must leave the bank alone');

  // Discard clears it without touching the live bank.
  const dropped = await jobs.runQuizDiscard();
  assert.strictEqual(dropped.skipped, false);
  assert.ok(!fs.existsSync(pendingFile));
  assert.strictEqual(
    JSON.parse(fs.readFileSync(bankFile, 'utf8')).current[0].id,
    'later-thing',
    'discard must not change what is live',
  );

  assert.ok(commits.length >= 3, 'each state change should have been committed');
  console.log('QUIZ_TESTS_OK');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
