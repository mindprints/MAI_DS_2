FROM node:20-alpine

WORKDIR /app

# install deps
COPY package*.json ./
RUN npm ci

# app source
COPY . .

# if you have a build step, keep it; otherwise this will no-op
RUN npm run build || true

# expose the port the runtime will use
ENV PORT=3000
EXPOSE 3000

# at container start: export db then start Express admin server
# Express serves both static site AND provides admin API endpoints
CMD ["sh", "-lc", "npm run export-db && npm start"]
