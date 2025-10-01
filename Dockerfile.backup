# Use Node.js LTS version
FROM node:18-alpine

# Install additional tools needed for building
RUN apk add --no-cache git

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose ports for both main app and admin
EXPOSE 3000 5179

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5179

# Copy and make startup script executable
COPY start.sh ./
RUN chmod +x start.sh

# Start the application using the startup script
CMD ["./start.sh"]
