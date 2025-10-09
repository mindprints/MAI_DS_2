# Dokploy VPS Infrastructure - Complete Guide

**Date:** October 2, 2025  
**Primary Domain:** app.aimuseum.site  
**VPS Provider:** Hostinger  
**Platform:** Dokploy (Docker-based PaaS)

---

## Table of Contents

1. [Overview](#overview)
2. [Infrastructure Architecture](#infrastructure-architecture)
3. [Dokploy Platform](#dokploy-platform)
4. [Database Setup](#database-setup)
5. [Application Deployment](#application-deployment)
6. [Networking & Domains](#networking--domains)
7. [Resource Allocation](#resource-allocation)
8. [Adding New Services](#adding-new-services)
9. [Subdomain Configuration](#subdomain-configuration)
10. [Monitoring & Logs](#monitoring--logs)
11. [Backup & Recovery](#backup--recovery)
12. [Security](#security)
13. [Troubleshooting](#troubleshooting)

---

## Overview

### What is Dokploy?

**Dokploy** is a self-hosted Platform-as-a-Service (PaaS) similar to Heroku or Vercel, but running on your own VPS. It provides:

- **Docker-based deployments** - Each app runs in isolated containers
- **Git integration** - Auto-deploy on push
- **Database management** - Built-in PostgreSQL, MySQL, MongoDB, Redis
- **Reverse proxy** - Automatic SSL with Traefik
- **Environment variables** - Secure config management
- **Resource limits** - CPU/memory controls per app

### Current Setup

```
┌─────────────────────────────────────────────────────────────┐
│                    Hostinger VPS                            │
│                    31.97.73.204                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Dokploy Control Plane                     │ │
│  │              (Docker + Traefik)                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │                                   │
│         ┌────────────────┼────────────────┐                 │
│         ▼                ▼                ▼                 │
│  ┌──────────┐   ┌──────────────┐  ┌──────────────┐        │
│  │PostgreSQL│   │  MAI App     │  │  (Future)    │        │
│  │ Database │   │  Container   │  │  Services    │        │
│  │          │   │              │  │              │        │
│  │MAI__texts│   │  Node.js 20  │  │  n8n?        │        │
│  │  Port:   │   │  Express     │  │  Subdomain?  │        │
│  │  15432   │   │  Port: 3000  │  │              │        │
│  └──────────┘   └──────────────┘  └──────────────┘        │
│       │                │                                     │
└───────┼────────────────┼─────────────────────────────────────┘
        │                │
        │         ┌──────▼──────┐
        │         │   Traefik   │
        │         │   Reverse   │
        │         │   Proxy     │
        │         └──────┬──────┘
        │                │
        │                │ HTTPS (443)
        │                │ HTTP (80 → 443)
        │                ▼
        │    ┌────────────────────────┐
        │    │  app.aimuseum.site     │
        │    │  (SSL via Let's Encrypt)│
        │    └────────────────────────┘
        │
        └─────── Internal network only
```

---

## Infrastructure Architecture

### VPS Details

**Server:**
- **IP Address:** 31.97.73.204
- **Provider:** Hostinger
- **OS:** Linux (likely Ubuntu/Debian)
- **RAM:** Estimated 2-4GB
- **CPU:** Estimated 2-4 cores
- **Storage:** SSD-based

**Dokploy Installation:**
- **Port:** 80 (HTTP), 443 (HTTPS)
- **Admin Panel:** Typically at a specific port or subdomain
- **Docker Engine:** Running all services
- **Traefik:** Reverse proxy with automatic SSL

### Network Architecture

```
Internet
   │
   ▼
DNS (A Record: app.aimuseum.site → 31.97.73.204)
   │
   ▼
Hostinger VPS (31.97.73.204)
   │
   ├─ Port 80 (HTTP) ─────────┐
   ├─ Port 443 (HTTPS) ────────┼─→ Traefik
   ├─ Port 15432 (PostgreSQL)─ │   (Reverse Proxy)
   │  (Internal only)          │
   └─ Dokploy Admin Port       │
      (Typically 3000 or 8080) │
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Docker Network     │
                    │   (Internal)         │
                    └──────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
            ┌─────────────┐      ┌─────────────┐
            │ mai-app     │      │ postgres    │
            │ container   │──────│ container   │
            │ Port: 3000  │      │ Port: 5432  │
            └─────────────┘      └─────────────┘
                    │
                    │ Exposed via Traefik
                    ▼
            app.aimuseum.site
```

### Container Communication

**Internal Docker Network:**
- Containers communicate via Docker network names
- PostgreSQL accessible at: `postgres:5432` (internal) or `localhost:15432` (from VPS)
- No external exposure of database (secure by default)

---

## Dokploy Platform

### How Dokploy Works

1. **Project Creation:**
   - Create new project in Dokploy dashboard
   - Connect to GitHub repository
   - Specify branch (usually `main`)

2. **Build Detection:**
   - Dokploy detects Dockerfile
   - Reads `dokploy.json` for config
   - Sets up build context

3. **Automatic Deployment:**
   - Git push to main branch
   - Webhook triggers Dokploy
   - Docker image builds
   - Container starts with new image
   - Traefik routes traffic to new container
   - Old container removed

4. **Zero-Downtime Deployments:**
   - New container starts before old one stops
   - Health checks ensure readiness
   - Traffic switches over
   - Rollback available if needed

### Dokploy Configuration

**File:** `dokploy.json` (in your repo root)

```json
{
  "name": "mai-ds-2",
  "type": "docker",
  "dockerfile": "Dockerfile",
  "buildContext": ".",
  "ports": [
    { "containerPort": 80, "protocol": "tcp" }
  ],
  "environment": {
    "NODE_ENV": "production"
  },
  "healthCheck": {
    "enabled": true,
    "path": "/",
    "interval": 30,
    "timeout": 10,
    "retries": 3
  },
  "resources": {
    "memory": "512Mi",
    "cpu": "0.5"
  }
}
```

**Key Settings:**
- **memory:** 512MB allocated to container
- **cpu:** 0.5 cores (50% of one CPU)
- **healthCheck:** Traefik checks `/` every 30 seconds
- **containerPort:** 80 mapped internally (Traefik handles external routing)

### Environment Variables in Dokploy

**Set via Dokploy Dashboard:**

```bash
# Database Connection
DATABASE_URL=postgresql://mindprints@gmail.com:<db-password>@postgres:5432/MAI__texts
# OR individual vars:
PGHOST=postgres
PGPORT=5432
PGUSER=mindprints@gmail.com
PGPASSWORD=<db-password>
PGDATABASE=MAI__textsPGSSL=

# Application
NODE_ENV=production
PORT=3000
NODE_OPTIONS=--max-old-space-size=512

# EmailJS (optional)
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_PRIVATE_KEY=your_private_key
EMAILJS_TEMPLATE_CONTACT=your_contact_template
EMAILJS_TEMPLATE_WORKSHOP=your_workshop_template

# CORS
ALLOWED_ORIGINS=https://aimuseum.se,https://www.aimuseum.se,https://app.aimuseum.site
```

**Important Notes:**
- Variables are encrypted at rest
- Only available to the container
- Not visible in public logs
- Can be updated without code changes

---

## Database Setup

### PostgreSQL Configuration

**Database Service in Dokploy:**

```yaml
# Created via Dokploy dashboard
Type: PostgreSQL
Version: 15 (likely)
Name: MAI_postgres
Database: MAI__texts
User: mindprints@gmail.com
Password: [encrypted]
Port: 15432 (external), 5432 (internal)
Storage: Persistent volume
```

**Volume Mounting:**
```
Docker Volume: dokploy_mai_postgres_data
Mount Point: /var/lib/postgresql/data
Persistence: Yes (survives container restarts)
```

### Database Schema

**Tables:**

1. **text_snippets**
```sql
CREATE TABLE text_snippets (
    key TEXT NOT NULL,
    lang TEXT NOT NULL,
    body TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (key, lang)
);

-- Indexes
CREATE INDEX idx_text_snippets_key ON text_snippets(key);
CREATE INDEX idx_text_snippets_updated ON text_snippets(updated_at DESC);
```

2. **media_assets**
```sql
CREATE TABLE media_assets (
    key TEXT PRIMARY KEY,
    storage_url TEXT NOT NULL,
    mime_type TEXT,
    alt_text TEXT,
    credit TEXT,
    width INTEGER,
    height INTEGER,
    size_bytes INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_media_assets_created ON media_assets(created_at DESC);
```

3. **encyclopedia_entries**
```sql
CREATE TABLE encyclopedia_entries (
    slug TEXT NOT NULL,
    lang TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    title TEXT,
    summary_md TEXT,
    body_md TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (slug, lang)
);

-- Indexes
CREATE INDEX idx_ency_slug ON encyclopedia_entries(slug);
CREATE INDEX idx_ency_status ON encyclopedia_entries(status);
```

### Database Backup

**Automatic Backups (Dokploy):**
- Dokploy may provide automatic daily backups
- Check Dokploy dashboard for backup settings
- Retention typically 7-30 days

**Manual Backup:**
```bash
# From VPS (SSH access required)
docker exec mai_postgres pg_dump -U mindprints@gmail.com MAI__texts > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i mai_postgres psql -U mindprints@gmail.com MAI__texts < backup_20251002.sql
```

**Recommended Backup Strategy:**
1. **Daily:** Automated via Dokploy or cron
2. **Weekly:** Download to local machine
3. **Before major changes:** Manual backup
4. **Test restores:** Monthly verification

---

## Application Deployment

### Build Process

**Triggered by:** Git push to `main` branch

**Steps:**

1. **Dokploy Webhook** receives notification from GitHub
2. **Git Pull** - Latest code fetched
3. **Docker Build** - Using your Dockerfile:
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build || true
   ENV PORT=3000
   EXPOSE 3000
   CMD ["sh", "-lc", "npm run export-db && npm start"]
   ```
4. **Image Created** - Unique tag (e.g., `mai-ds-2:build-123`)
5. **Container Started** - New container from image
6. **Health Check** - Waits for `/` to return 200 OK
7. **Traffic Switch** - Traefik routes to new container
8. **Old Container Removed** - After grace period

**Build Time:** Approximately 2-3 minutes

### Runtime Behavior

**Container Startup:**
```bash
# What happens when container starts:
1. npm run export-db    # Exports DB to JSON files
2. npm start            # Starts Express server
3. Express listens on PORT 3000
4. Traefik detects and routes traffic
```

**Express Server Responsibilities:**
- Serve static files from `/public`
- Serve admin UI at `/admin`
- Provide API endpoints at `/api/db/*`
- Connect to PostgreSQL
- Handle admin CRUD operations

**Automatic Restarts:**
- Container crashes → Dokploy restarts it
- VPS reboot → Dokploy starts all containers
- Database connection lost → Express retries

---

## Networking & Domains

### DNS Configuration

**Current Setup:**

```
Domain: app.aimuseum.site
Type: A Record
Value: 31.97.73.204
TTL: 3600 (1 hour)
```

**Managed by:** Likely Hostinger or external DNS provider (Cloudflare?)

### SSL/TLS Certificates

**Traefik + Let's Encrypt:**
- Automatic SSL certificate issuance
- Renewal every 60 days (automatic)
- HTTP → HTTPS redirect (automatic)
- Certificate stored in Dokploy volumes

**Verification:**
```bash
# Check certificate
openssl s_client -connect app.aimuseum.site:443 -servername app.aimuseum.site
```

### Port Mapping

```
External → Internal

443 (HTTPS) → Traefik → Port 3000 (MAI App)
80 (HTTP)   → Traefik → Redirect to 443
15432       → PostgreSQL:5432 (if exposed)
```

**Traefik Configuration** (auto-generated by Dokploy):
```yaml
# Conceptual - actual config managed by Dokploy
http:
  routers:
    mai-app:
      rule: "Host(`app.aimuseum.site`)"
      service: mai-app-service
      tls:
        certResolver: letsencrypt
  services:
    mai-app-service:
      loadBalancer:
        servers:
          - url: "http://mai-app:3000"
```

---

## Resource Allocation

### Current Allocation

**MAI Application Container:**
- **Memory:** 512 MB (hard limit)
- **CPU:** 0.5 cores (50% of one CPU)
- **Storage:** Shared VPS disk space
- **Network:** Shared VPS bandwidth

**PostgreSQL Container:**
- **Memory:** Likely 512 MB - 1 GB
- **CPU:** Shared (no hard limit)
- **Storage:** Persistent volume (~10-20 GB estimated)

### Resource Monitoring

**Check container resources:**
```bash
# Via Dokploy dashboard or SSH:
docker stats mai-app
docker stats postgres-container

# Output shows:
# - CPU usage %
# - Memory usage / Limit
# - Network I/O
# - Block I/O
```

### Scaling Considerations

**Current capacity:**
- **Concurrent users:** ~100-500 (estimated)
- **Requests/second:** ~50-100
- **Database connections:** 10 (pool size)

**When to scale up:**
- Memory usage consistently > 80%
- CPU usage consistently > 70%
- Response times > 1 second
- Database connection pool exhausted

**Scaling options:**
1. **Vertical:** Increase VPS RAM/CPU
2. **Horizontal:** Add more containers (load balancer)
3. **Database:** Separate database server
4. **CDN:** Offload static assets (Cloudflare, Bunny)

---

## Adding New Services

### Example: Adding n8n (Workflow Automation)

**Step 1: Create New Application in Dokploy**

```yaml
Name: n8n-automation
Type: Docker (from Docker Hub image)
Image: n8nio/n8n:latest
Port: 5678
Domain: n8n.aimuseum.site
```

**Step 2: Configure Environment Variables**

```bash
N8N_HOST=n8n.aimuseum.site
N8N_PORT=5678
N8N_PROTOCOL=https
WEBHOOK_URL=https://n8n.aimuseum.site/

# Database (use same PostgreSQL)
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=postgres
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=mindprints@gmail.com
DB_POSTGRESDB_PASSWORD=<same-password>

# Timezone
GENERIC_TIMEZONE=Europe/Stockholm
TZ=Europe/Stockholm
```

**Step 3: Create Database**

```sql
-- Connect to PostgreSQL via Dokploy or CLI
CREATE DATABASE n8n OWNER "mindprints@gmail.com";
```

**Step 4: Deploy**

- Dokploy pulls image
- Container starts
- Traefik routes `n8n.aimuseum.site` to container
- SSL certificate issued automatically

**Step 5: DNS Setup**

```
Add DNS Record:
Type: A
Name: n8n
Value: 31.97.73.204
```

**Step 6: Access**

Visit: `https://n8n.aimuseum.site`

### Other Services You Can Add

**Development Tools:**
- **Code Server** (VS Code in browser): `code.aimuseum.site`
- **Gitea** (Self-hosted Git): `git.aimuseum.site`
- **Jenkins** (CI/CD): `ci.aimuseum.site`

**Productivity Tools:**
- **NextCloud** (File storage): `files.aimuseum.site`
- **Bitwarden** (Password manager): `pass.aimuseum.site`
- **Monica** (CRM): `crm.aimuseum.site`

**Monitoring:**
- **Uptime Kuma** (Status page): `status.aimuseum.site`
- **Grafana** (Metrics): `metrics.aimuseum.site`
- **Plausible** (Analytics): `analytics.aimuseum.site`

**CMS/Admin:**
- **Strapi** (Headless CMS): `cms.aimuseum.site`
- **Ghost** (Blog): `blog.aimuseum.site`
- **Metabase** (Data visualization): `data.aimuseum.site`

---

## Subdomain Configuration

### DNS Setup Process

**For each new subdomain:**

1. **Add DNS A Record:**
   ```
   Type: A
   Name: subdomain (e.g., "api", "blog", "n8n")
   Value: 31.97.73.204
   TTL: 3600
   ```

2. **Wait for propagation** (5-60 minutes)

3. **Verify:**
   ```bash
   nslookup subdomain.aimuseum.site
   ping subdomain.aimuseum.site
   ```

### Dokploy Domain Routing

**When creating new app in Dokploy:**

1. Go to app settings
2. Set "Domain" field: `subdomain.aimuseum.site`
3. Dokploy automatically:
   - Configures Traefik rule
   - Issues SSL certificate
   - Routes traffic

**No manual Traefik config needed!**

### Wildcard Subdomain (Optional)

**For unlimited subdomains:**

```
Type: A
Name: *
Value: 31.97.73.204
```

Then any `*.aimuseum.site` resolves to your VPS.

**Use cases:**
- User subdomains: `user1.aimuseum.site`
- Branch previews: `feature-123.aimuseum.site`
- Per-client sites: `client-a.aimuseum.site`

---

## Monitoring & Logs

### Application Logs

**View in Dokploy Dashboard:**
1. Navigate to your application
2. Click "Logs" tab
3. Real-time streaming logs
4. Filter by time range

**Via CLI (if you have SSH):**
```bash
# Real-time logs
docker logs -f mai-app-container

# Last 100 lines
docker logs --tail 100 mai-app-container

# Logs from last hour
docker logs --since 1h mai-app-container
```

### Database Logs

```bash
# PostgreSQL logs
docker logs postgres-container

# Specific queries (if logging enabled)
docker exec postgres-container cat /var/lib/postgresql/data/log/postgresql-*.log
```

### Metrics to Watch

**Application Health:**
- Response time < 500ms
- Error rate < 1%
- CPU usage < 70%
- Memory usage < 80%
- Database connections < 8/10

**Database Health:**
- Query time < 100ms
- Connection pool not exhausted
- Disk space > 20% free
- No locks or deadlocks

### Setting Up Monitoring

**Option 1: Uptime Kuma**
```bash
# Add via Dokploy
Image: louislam/uptime-kuma:latest
Port: 3001
Domain: status.aimuseum.site

# Monitor:
- https://app.aimuseum.site (every 60s)
- https://app.aimuseum.site/admin (every 300s)
- PostgreSQL connection
```

**Option 2: Grafana + Prometheus**
- More complex but powerful
- Visualize metrics over time
- Alert on thresholds

---

## Backup & Recovery

### What to Backup

1. **PostgreSQL Database** (Critical)
   - All tables and data
   - Frequency: Daily
   - Retention: 30 days

2. **Uploaded Files** (if any)
   - User uploads
   - Frequency: Daily
   - Retention: 30 days

3. **Environment Variables** (Important)
   - Export from Dokploy
   - Store securely offline
   - Update when changed

4. **Configuration Files**
   - `dokploy.json`
   - Git tracked (automatic via repo)

### Backup Scripts

**PostgreSQL Backup:**
```bash
#!/bin/bash
# backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="mai_backup_${DATE}.sql.gz"

docker exec mai_postgres pg_dump \
  -U mindprints@gmail.com \
  -d MAI__texts \
  --clean --if-exists \
  | gzip > "/backups/${BACKUP_FILE}"

# Keep only last 30 days
find /backups -name "mai_backup_*.sql.gz" -mtime +30 -delete

echo "Backup complete: ${BACKUP_FILE}"
```

**Automated via cron:**
```bash
# Run daily at 2 AM
0 2 * * * /root/backup-database.sh >> /var/log/backup.log 2>&1
```

### Recovery Procedures

**Database Restore:**
```bash
# 1. Stop application
docker stop mai-app-container

# 2. Restore database
gunzip < backup_20251002.sql.gz | \
  docker exec -i postgres-container psql \
  -U mindprints@gmail.com -d MAI__texts

# 3. Restart application
docker start mai-app-container
```

**Full Disaster Recovery:**

1. **Provision new VPS**
2. **Install Dokploy**
3. **Restore PostgreSQL** from backup
4. **Connect GitHub** repository
5. **Set environment variables** (from backup)
6. **Deploy** application
7. **Update DNS** to new IP
8. **Verify** everything works

**Estimated time:** 2-4 hours

---

## Security

### Current Security Measures

**✅ Implemented:**
- HTTPS with valid SSL certificates
- Database not exposed to internet (internal only)
- Environment variables encrypted
- Docker container isolation
- Regular security updates (Dokploy handles)

**⚠️ To Consider:**

1. **Admin Authentication**
   - Currently no auth on `/admin`
   - Recommendation: Add basic auth or OAuth

2. **Rate Limiting**
   - No rate limiting on API endpoints
   - Recommendation: Add express-rate-limit

3. **Database Backups**
   - Need automated backups configured
   - Recommendation: Daily cron job

4. **Firewall Rules**
   - May not be configured
   - Recommendation: Only allow 80, 443, SSH

### Security Hardening Steps

**1. Add Basic Auth to Admin:**
```javascript
// In admin/server.js
const basicAuth = require('express-basic-auth');

app.use('/admin', basicAuth({
  users: { 'admin': process.env.ADMIN_PASSWORD },
  challenge: true,
  realm: 'MAI Admin'
}));
```

**2. Add Rate Limiting:**
```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', apiLimiter);
```

**3. Database Connection Security:**
```javascript
// Use SSL for database connection
const pool = new Pool({
  ...config,
  ssl: {
    rejectUnauthorized: false // or true with proper certs
  }
});
```

**4. Security Headers:**
```javascript
const helmet = require('helmet');
app.use(helmet());
```

---

## Troubleshooting

### Common Issues

**1. Container Won't Start**

```bash
# Check logs
docker logs mai-app-container

# Common causes:
- Port already in use
- Missing environment variables
- Database connection failed
- Syntax error in code

# Fix:
- Stop conflicting containers
- Set required env vars in Dokploy
- Check database is running
- Review code changes
```

**2. Database Connection Failed**

```bash
# Verify database is running
docker ps | grep postgres

# Check connection string
echo $DATABASE_URL

# Test connection
docker exec mai-app-container node test-db-connection.js

# Fix:
- Ensure DATABASE_URL has correct: MAI__texts (two underscores)
- Restart database container
- Check network connectivity
```

**3. SSL Certificate Issues**

```bash
# Check certificate
curl -vI https://app.aimuseum.site

# Renewal failed?
# Dokploy > Traefik > Certificates > Force Renewal

# Or SSH to VPS:
docker exec traefik-container traefik-certs-dumper
```

**4. Out of Memory**

```bash
# Check memory usage
docker stats

# If app container using > 450MB:
# 1. Increase memory limit in dokploy.json
# 2. Or optimize Node.js memory:
NODE_OPTIONS=--max-old-space-size=400

# Or restart container to clear memory:
docker restart mai-app-container
```

**5. Slow Performance**

```bash
# Check resource usage
docker stats

# Check database queries
# Enable slow query log in PostgreSQL

# Solutions:
- Add database indexes
- Optimize queries
- Implement caching (Redis)
- Upgrade VPS plan
```

### Getting Help

**Dokploy Community:**
- GitHub: https://github.com/Dokploy/dokploy
- Discord: (check Dokploy website)
- Documentation: Dokploy docs

**Hostinger Support:**
- Live chat for VPS issues
- SSH access issues
- Network/DNS issues

**Your Development:**
- Logs in Dokploy dashboard
- `docs/` folder in your repo
- This infrastructure guide

---

## Best Practices

### Development Workflow

1. **Local Development:**
   ```bash
   npm start  # Test with local DB or mocked data
   ```

2. **Test Before Push:**
   ```bash
   npm run build  # Ensure build succeeds
   npm test       # Run tests (when you add them)
   ```

3. **Commit & Push:**
   ```bash
   git add .
   git commit -m "feat: descriptive message"
   git push origin main
   ```

4. **Monitor Deployment:**
   - Watch Dokploy build logs
   - Check application logs after deploy
   - Visit site to verify

5. **Rollback if Needed:**
   - Dokploy > Deployments > Previous Build > Rollback

### Database Migrations

**When changing schema:**

1. **Create migration file:**
   ```sql
   -- migrations/001_add_column.sql
   ALTER TABLE text_snippets ADD COLUMN category TEXT;
   ```

2. **Test locally** first

3. **Backup production database**

4. **Run migration:**
   ```bash
   docker exec -i postgres-container psql -U mindprints@gmail.com -d MAI__texts < migration.sql
   ```

5. **Deploy code** that uses new schema

### Environment Variable Management

1. **Never commit `.env`** to git
2. **Document all variables** in `config/env.example`
3. **Keep Dokploy in sync** with code requirements
4. **Backup env vars** securely offline

### Cost Management

**Estimate Monthly Costs:**
- VPS (Hostinger): $10-30/month
- Domain: $10-15/year
- Total: ~$12-32/month

**Optimization:**
- Use image optimization (smaller assets)
- Implement caching (reduce CPU)
- Clean old Docker images (free space)
- Monitor bandwidth usage

---

## Quick Reference

### Important URLs

```
Production Site:    https://app.aimuseum.site
Admin Interface:    https://app.aimuseum.site/admin
Database Exports:   https://app.aimuseum.site/db/texts.json
Dokploy Dashboard:  https://[dokploy-ip-or-domain]:port
```

### Important Commands

```bash
# View logs
docker logs -f mai-app-container

# Restart container
docker restart mai-app-container

# Database backup
docker exec mai_postgres pg_dump -U mindprints@gmail.com MAI__texts > backup.sql

# Check resources
docker stats

# List containers
docker ps -a
```

### Important Files

```
Dockerfile              - Container definition
dokploy.json           - Dokploy config
admin/server.js        - Express server
tools/export-db-content.js - Database export
src/site/assets/js/small-loader.js - Frontend loader
```

### Environment Variables Template

```bash
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/MAI__texts
PORT=3000
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=512

# Application
ALLOWED_ORIGINS=https://app.aimuseum.site
```

---

## Future Enhancements

### Short-term (1-3 months)

- [ ] Add authentication to admin
- [ ] Implement automated backups
- [ ] Add monitoring (Uptime Kuma)
- [ ] Set up staging environment
- [ ] Implement rate limiting

### Medium-term (3-6 months)

- [ ] Add n8n for automation workflows
- [ ] Create `blog.aimuseum.site` with Ghost
- [ ] Implement Redis for caching
- [ ] Add CDN for static assets
- [ ] Database optimization (indexes)

### Long-term (6-12 months)

- [ ] Horizontal scaling (multiple containers)
- [ ] Separate database server
- [ ] Advanced monitoring (Grafana)
- [ ] CI/CD pipeline improvements
- [ ] Performance optimization

---

## Conclusion

Your Dokploy VPS infrastructure is well-architected for:
- ✅ **Scalability** - Easy to add new services
- ✅ **Reliability** - Docker isolation + auto-restart
- ✅ **Security** - HTTPS, internal database, container isolation
- ✅ **Maintainability** - Git-based deployments, clear structure
- ✅ **Cost-effective** - Single VPS hosts multiple services

**Next steps:**
1. Review this document
2. Set up subdomain for next service (e.g., n8n)
3. Configure automated backups
4. Add monitoring

**Questions?** Reference this guide or check the other docs in the `docs/` folder!

---

**Document Version:** 1.0  
**Last Updated:** October 2, 2025  
**Maintained by:** MAI Development Team


