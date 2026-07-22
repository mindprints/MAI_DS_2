require('dotenv').config();
const path = require('path');

function list(v) {
  return (v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const config = {
  // Telegram
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  chatId: process.env.TELEGRAM_CHAT_ID || '',
  allowedUserIds: list(process.env.TELEGRAM_ALLOWED_USER_IDS),

  // Anthropic
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',

  // Artificial Analysis (LLM leaderboard card)
  aaApiKey: process.env.AA_API_KEY || '',

  // OpenRouter (LLM usage card; any valid key works, datasets are read-only)
  openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
  // When set (e.g. "x-ai/grok-4.5"), the daily content jobs generate via
  // OpenRouter instead of the Anthropic API — cost experiment. Unset to
  // revert to config.model on Anthropic. Telegram edits always use Anthropic.
  openRouterModel: process.env.OPENROUTER_MODEL || '',

  // Git / repo
  repoDir: path.resolve(process.env.REPO_DIR || path.join(__dirname, '..')),
  agentBranch: process.env.AGENT_BRANCH || 'preview/telegram-agent',
  mainBranch: process.env.MAIN_BRANCH || 'main',
  githubRepo: process.env.GITHUB_REPO || '', // e.g. mindprints/MAI_DS_2
  githubToken: process.env.GITHUB_TOKEN || '',
  gitUserName: process.env.GIT_USER_NAME || 'MAI Telegram Agent',
  gitUserEmail: process.env.GIT_USER_EMAIL || 'agent@aimuseum.se',

  // Behavior
  allowApprove: process.env.AGENT_ALLOW_APPROVE === 'true',
  previewUrl: process.env.PREVIEW_URL || '',
  timezone: process.env.AGENT_TIMEZONE || 'Europe/Stockholm',
  onThisDayTime: process.env.AGENT_ONTHISDAY_TIME || '06:10',
  newsTime: process.env.AGENT_NEWS_TIME || '06:00',
  llmIndexTime: process.env.AGENT_LLMINDEX_TIME || '06:20',
  llmUsageTime: process.env.AGENT_LLMUSAGE_TIME || '06:25',
  // The quiz draft is monthly, not daily. Day is clamped to 1-28 by the
  // scheduler so it fires in February too.
  quizTime: process.env.AGENT_QUIZ_TIME || '06:40',
  quizDay: Number(process.env.AGENT_QUIZ_DAY || 1),
  runBuildCheck: process.env.AGENT_BUILD_CHECK !== 'false',
};

function assertRuntimeConfig() {
  const missing = [];
  if (!config.botToken) missing.push('TELEGRAM_BOT_TOKEN');
  if (!config.anthropicApiKey) missing.push('ANTHROPIC_API_KEY');
  if (config.allowedUserIds.length === 0) missing.push('TELEGRAM_ALLOWED_USER_IDS');
  if (missing.length) {
    throw new Error('Missing required environment variables: ' + missing.join(', '));
  }
}

module.exports = { config, assertRuntimeConfig };
