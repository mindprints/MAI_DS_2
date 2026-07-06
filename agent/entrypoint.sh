#!/bin/sh
set -e

: "${GITHUB_REPO:?GITHUB_REPO is required (e.g. mindprints/MAI_DS_2)}"
: "${GITHUB_TOKEN:?GITHUB_TOKEN is required}"
: "${AGENT_BRANCH:=preview/telegram-agent}"
: "${REPO_DIR:=/work}"

if [ ! -d "$REPO_DIR/.git" ]; then
  echo "Cloning $GITHUB_REPO ($AGENT_BRANCH) into $REPO_DIR..."
  git clone --branch "$AGENT_BRANCH" \
    "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git" "$REPO_DIR"
  echo "Installing site dependencies in $REPO_DIR (for build validation)..."
  # --include=dev: the site build needs devDependencies (tailwind/postcss)
  # even when NODE_ENV=production.
  cd "$REPO_DIR" && npm ci --include=dev && cd /app
fi

exec node /app/agent/index.js
