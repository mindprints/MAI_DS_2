// Git operations on the working repo. All commands run in config.repoDir.
const { execFile } = require('child_process');
const { config } = require('./config');

function git(args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      'git',
      args,
      { cwd: config.repoDir, maxBuffer: 10 * 1024 * 1024, ...opts },
      (err, stdout, stderr) => {
        if (err) reject(new Error(`git ${args.join(' ')} failed: ${stderr || err.message}`));
        else resolve(stdout.trim());
      },
    );
  });
}

async function setup() {
  await git(['config', 'user.name', config.gitUserName]);
  await git(['config', 'user.email', config.gitUserEmail]);
  if (config.githubToken && config.githubRepo) {
    await git([
      'remote',
      'set-url',
      'origin',
      `https://x-access-token:${config.githubToken}@github.com/${config.githubRepo}.git`,
    ]);
  }
  const branch = await git(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch !== config.agentBranch) {
    await git(['fetch', 'origin']);
    await git(['checkout', config.agentBranch]);
  }
}

async function pull() {
  await git(['pull', '--ff-only', 'origin', config.agentBranch]);
}

async function status() {
  const branch = await git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const last = await git(['log', '-1', '--format=%h %s (%cr)']);
  const dirty = await git(['status', '--short']);
  return { branch, last, dirty };
}

async function diffStat(ref) {
  return git(['diff', '--stat', ...(ref ? [ref] : [])]);
}

// Stage everything, commit if there are changes, push. Returns the commit
// summary or null when nothing changed.
async function commitAndPush(message) {
  await git(['add', '-A']);
  const staged = await git(['status', '--short']);
  if (!staged) return null;
  await git(['commit', '-m', message]);
  await git(['push', 'origin', config.agentBranch]);
  const stat = await git(['show', '--stat', '--format=%h %s', 'HEAD']);
  return stat;
}

// Merge the agent branch into main and push. Used by /approve.
async function approveToMain() {
  await git(['fetch', 'origin']);
  await git(['checkout', config.mainBranch]);
  try {
    await git(['pull', '--ff-only', 'origin', config.mainBranch]);
    await git(['merge', '--no-edit', config.agentBranch]);
    await git(['push', 'origin', config.mainBranch]);
    const last = await git(['log', '-1', '--format=%h %s']);
    return last;
  } finally {
    await git(['checkout', config.agentBranch]);
  }
}

module.exports = { git, setup, pull, status, diffStat, commitAndPush, approveToMain };
