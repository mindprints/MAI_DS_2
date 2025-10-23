FROM node:20-alpine

WORKDIR /app

# install deps
COPY package*.json ./
RUN npm ci

# app source
COPY . .

# Build the application - ensure CSS is generated and static files are copied
RUN echo "Starting build process..." && \
    npm run build:static && \
    echo "Static files copied" && \
    npm run build:css && \
    echo "CSS built" && \
    npm run build:pages && \
    echo "Pages built" && \
    ls -la public/ && \
    ls -la public/assets/css/ && \
    echo "Build completed successfully"

# expose the port the runtime will use
ENV PORT=3000
EXPOSE 3000

# at container start: export db then start Express admin server
# Express serves both static site AND provides admin API endpoints
CMD ["sh", "-lc", "npm run export-db && npm start"]
