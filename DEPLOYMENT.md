# Deployment Guide

The site deploys to two targets: Vercel (static + serverless API) and
Dokploy (Docker container running the Express server).

## Dokploy Deployment

Dokploy builds the `Dockerfile` at the repo root: it installs dependencies,
runs the site build, and starts the Express server (`npm start`), which
serves `public/` and the `POST /api/send-email` endpoint.

### Steps

1. Push to the Git repository.
2. In Dokploy: create/point an application at the repo; it detects the
   `Dockerfile` (see also `dokploy.json`).
3. Configure environment variables (below) and deploy.

### Environment Variables

```bash
NODE_ENV=production
PORT=5179

# Email sending (contact + workshop forms)
EMAILJS_SERVICE_ID=your-service-id
EMAILJS_PRIVATE_KEY=your-private-key
EMAILJS_PUBLIC_KEY=your-public-key
EMAILJS_TEMPLATE_CONTACT=your-contact-template
EMAILJS_TEMPLATE_WORKSHOP=your-workshop-template
ALLOWED_ORIGINS=https://aimuseum.se,https://www.aimuseum.se
```

See `config/env.example` for a local `.env` template.

## Local Docker Testing

```bash
docker build -t mai-ds-2 .
docker run -p 3000:5179 --env-file .env mai-ds-2
# or
docker-compose up --build
```

Visit `http://localhost:3000`.

## Vercel Deployment

Configured via `vercel.json`:

```json
{
  "cleanUrls": true,
  "buildCommand": "npm run build",
  "outputDirectory": "public"
}
```

Vercel additionally serves the serverless endpoints in `api/`
(`send-email`, `og-image`, `substack`). Set the same EmailJS environment
variables in Vercel Project Settings.

## Troubleshooting

1. **Build fails**: check that all dependencies are in `package.json`.
2. **Contact form errors**: verify the EmailJS env vars and that the
   requesting domain is present in `ALLOWED_ORIGINS`.
3. **Stale content after deploy**: hard refresh or append `?v=timestamp` to
   bypass CDN cache.
4. Check Dokploy application logs for detailed errors during deployment.
