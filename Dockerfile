FROM node:20-alpine

WORKDIR /app

# install deps
COPY package*.json ./
RUN npm ci

# app source
COPY . .

# Build the application (static copy, pages, CSS, daily-content injection)
RUN npm run build

# expose the port the runtime will use
ENV PORT=3000
EXPOSE 3000

# at container start: run the Express server (serves public/ + /api/send-email)
CMD ["sh", "-lc", "npm start"]
