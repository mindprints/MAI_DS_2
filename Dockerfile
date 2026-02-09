# 1) Build stage
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# 2) Static serve stage
FROM nginx:stable-alpine

# SPA routing (React Router etc.)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Vite: dist  (if CRA, change to /app/build)
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

    location / {
        try_files $uri $uri/ /index.html;
    }
}
