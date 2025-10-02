# Deployment Guide

This document explains how to deploy the MAI DS 2 application to different platforms.

## Dokploy Deployment

The `/bin/sh: npm: not found` error occurs because Dokploy doesn't automatically provide a Node.js runtime. This has been resolved by adding proper Docker configuration.

### Files Added for Dokploy Support

1. **Dockerfile** - Defines the Node.js runtime environment
2. **docker-compose.yml** - For local Docker testing
3. **.dockerignore** - Optimizes Docker build performance
4. **dokploy.json** - Dokploy-specific configuration
5. **start.sh** - Startup script that builds and runs the app

### Deployment Steps

1. **Push your code** to your Git repository with the new Docker files
2. **In Dokploy**:
   - Create a new application
   - Connect your Git repository
   - Set the build context to the root directory
   - Dokploy will automatically detect the Dockerfile
   - Configure environment variables if needed (see below)
3. **Deploy** - Dokploy will build and run your container

### Environment Variables

Set these in your Dokploy application settings:

```bash
NODE_ENV=production
PORT=5179

# Optional: If using database features
DATABASE_URL=postgres://user:pass@host:port/db
# OR individual DB settings:
PGHOST=your-db-host
PGPORT=5432
PGUSER=your-db-user
PGPASSWORD=your-db-password
PGDATABASE=your-db-name

# Optional: If using email features
EMAILJS_SERVICE_ID=your-service-id
EMAILJS_PRIVATE_KEY=your-private-key
EMAILJS_TEMPLATE_CONTACT=your-contact-template
EMAILJS_TEMPLATE_WORKSHOP=your-workshop-template
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Port Configuration

- Runtime is Nginx on port 80 inside the container. Traefik routes 80/443 to it. No host port publishing.
- Main site is available at `http://your-domain/`
- Admin interface is available at `http://your-domain/admin`

## Local Docker Testing

Test the Docker setup locally before deploying:

```bash
# Build the image
docker build -t mai-ds-2 .

# Run the container
docker run -p 3000:5179 mai-ds-2

# Or use docker-compose
docker-compose up --build
```

Visit `http://localhost:3000` to test the application.

## Vercel Deployment (Existing)

Vercel deployment continues to work as before using `vercel.json`:

```json
{
  "cleanUrls": true,
  "buildCommand": "npm run build",
  "outputDirectory": "public"
}
```

## Troubleshooting

### Common Issues

1. **Build fails**: Check that all dependencies are in `package.json`
2. **Port issues**: Ensure Dokploy port mapping is correct (5179 → 80)
3. **Static files not served**: The admin server now serves both admin UI and main site
4. **Database connection**: Set environment variables for database if using DB features

### Logs

Check Dokploy application logs for detailed error messages during deployment.

### Health Check

The application includes a basic health check endpoint at `/` that serves the main site.
