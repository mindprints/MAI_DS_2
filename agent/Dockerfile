# Telegram editing agent — deployed as a second Dokploy app from this repo.
# Build context must be the repository root:
#   docker build -f agent/Dockerfile -t mai-agent .
FROM node:20-alpine

RUN apk add --no-cache git

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# The agent needs a real git clone to pull/push. At container start the
# entrypoint clones the repo into /work using GITHUB_TOKEN and runs the
# agent against it (REPO_DIR=/work).
ENV REPO_DIR=/work
COPY agent/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
