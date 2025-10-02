# --- Build / export stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# If you have a build step, keep it; if not, this will noop if absent
RUN npm run build || true
# Export DB json to public/db/*
RUN npm run export-db

# --- Runtime: serve static site
FROM nginx:alpine
# Serve the static site from /usr/share/nginx/html
COPY --from=build /app/public /usr/share/nginx/html
# Optional: basic caching headers or custom nginx.conf can go here later
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
