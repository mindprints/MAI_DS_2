# Database Schema Documentation

**Database:** PostgreSQL  
**Database Name:** `MAI__texts`  
**Version:** PostgreSQL 15 (likely)

---

## Overview

The Museum of Artificial Intelligence (MAI) database uses PostgreSQL to store multilingual content, media assets, and encyclopedia entries. The database is hosted on Dokploy and accessed via environment variables.

---

## Tables

### 1. `text_snippets`

Stores multilingual text content for dynamic page elements. Each text snippet is identified by a key and language combination.

**Schema:**
```sql
CREATE TABLE text_snippets (
    key TEXT NOT NULL,
    lang TEXT NOT NULL,
    body TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (key, lang)
);
```

**Columns:**
- `key` (TEXT, NOT NULL) - Unique identifier for the text snippet (e.g., `"page.home.hero.title"`)
- `lang` (TEXT, NOT NULL) - Language code (`"en"` or `"sv"`)
- `body` (TEXT) - The actual text content
- `updated_at` (TIMESTAMP) - Timestamp of last update (defaults to NOW())

**Indexes:**
```sql
CREATE INDEX idx_text_snippets_key ON text_snippets(key);
CREATE INDEX idx_text_snippets_updated ON text_snippets(updated_at DESC);
```

**Primary Key:** Composite key on `(key, lang)`

**Example Usage:**
```sql
-- Insert English text
INSERT INTO text_snippets (key, lang, body, updated_at) 
VALUES ('page.home.hero.title', 'en', 'Welcome to MAI', NOW());

-- Insert Swedish text
INSERT INTO text_snippets (key, lang, body, updated_at) 
VALUES ('page.home.hero.title', 'sv', 'Välkommen till MAI', NOW());

-- Query all languages for a key
SELECT key, lang, body FROM text_snippets WHERE key = 'page.home.hero.title';
```

---

### 2. `media_assets`

Stores metadata for media files (images, videos, etc.) used throughout the site.

**Schema:**
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
```

**Columns:**
- `key` (TEXT, PRIMARY KEY) - Unique identifier for the media asset (e.g., `"img.ai-coding"`)
- `storage_url` (TEXT, NOT NULL) - URL or path to the media file (CDN URL or relative path)
- `mime_type` (TEXT) - MIME type of the media file (e.g., `"image/webp"`, `"image/jpeg"`)
- `alt_text` (TEXT) - Alternative text for accessibility
- `credit` (TEXT) - Attribution/credit information
- `width` (INTEGER) - Image width in pixels
- `height` (INTEGER) - Image height in pixels
- `size_bytes` (INTEGER) - File size in bytes
- `created_at` (TIMESTAMP) - Timestamp of creation (defaults to NOW())
- `updated_at` (TIMESTAMP) - Timestamp of last update (defaults to NOW())

**Indexes:**
```sql
CREATE INDEX idx_media_assets_created ON media_assets(created_at DESC);
```

**Primary Key:** `key`

**Example Usage:**
```sql
-- Insert media asset
INSERT INTO media_assets (
    key, 
    storage_url, 
    mime_type, 
    alt_text, 
    width, 
    height, 
    size_bytes
) VALUES (
    'img.ai-coding',
    '/images/ai-coding.webp',
    'image/webp',
    'AI coding illustration',
    1920,
    1080,
    245678
);

-- Query media asset
SELECT * FROM media_assets WHERE key = 'img.ai-coding';
```

---

### 3. `encyclopedia_entries`

Stores encyclopedia entries with multilingual content in Markdown format.

**Schema:**
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
```

**Columns:**
- `slug` (TEXT, NOT NULL) - URL-friendly identifier (e.g., `"perceptron"`)
- `lang` (TEXT, NOT NULL) - Language code (`"en"` or `"sv"`)
- `status` (TEXT) - Publication status (defaults to `'draft'`). Common values: `'draft'`, `'published'`, `'archived'`
- `title` (TEXT) - Entry title
- `summary_md` (TEXT) - Summary text in Markdown format
- `body_md` (TEXT) - Full entry content in Markdown format
- `created_at` (TIMESTAMP) - Timestamp of creation (defaults to NOW())
- `updated_at` (TIMESTAMP) - Timestamp of last update (defaults to NOW())

**Indexes:**
```sql
CREATE INDEX idx_ency_slug ON encyclopedia_entries(slug);
CREATE INDEX idx_ency_status ON encyclopedia_entries(status);
```

**Primary Key:** Composite key on `(slug, lang)`

**Example Usage:**
```sql
-- Insert English encyclopedia entry
INSERT INTO encyclopedia_entries (
    slug, 
    lang, 
    status, 
    title, 
    summary_md, 
    body_md
) VALUES (
    'perceptron',
    'en',
    'published',
    'Perceptron',
    'The perceptron is a type of artificial neuron.',
    '# Perceptron\n\nThe perceptron is a fundamental building block...'
);

-- Query published entries
SELECT slug, lang, title FROM encyclopedia_entries 
WHERE status = 'published' 
ORDER BY slug, lang;
```

---

## Database Connection

### Environment Variables

The database connection can be configured using either:

**Option 1: Connection String**
```bash
DATABASE_URL=postgresql://user:password@host:port/database
```

**Option 2: Individual Variables**
```bash
PGHOST=31.97.73.204
PGPORT=15432
PGUSER=mindprints@gmail.com
PGPASSWORD=<your-password>
PGDATABASE=MAI__texts
PGSSL=require  # Optional: set to "require" if SSL is needed
```

### Connection Details

- **Host:** `31.97.73.204` (external) or `postgres` (internal Docker network)
- **Port:** `15432` (external) or `5432` (internal)
- **Database:** `MAI__texts` (note: two underscores)
- **User:** `mindprints@gmail.com`

---

## Data Export

The database content is exported to JSON files during build time via `tools/export-db-content.js`:

- **Texts:** `public/db/texts.json` - Format: `{ [key]: { en: "...", sv: "..." } }`
- **Media:** `public/db/media.json` - Format: `{ [key]: { url, mime_type, alt_text, ... } }`
- **Encyclopedia:** `public/db/encyclopedia.json` - Format: `{ [slug]: { en: {...}, sv: {...} } }`

These JSON files are then consumed by the frontend `small-loader` script to populate dynamic content.

---

## Usage Patterns

### Text Snippets

Text snippets use a hierarchical key naming convention:
- `page.{page-name}.{section}.{element}` - Page-specific content
- Example: `page.home.hero.title`, `page.about.intro.text`

### Media Assets

Media assets use a simple key naming convention:
- `img.{descriptive-name}` - Images
- Example: `img.ai-coding`, `img.museum-night`

### Encyclopedia Entries

Encyclopedia entries use URL-friendly slugs:
- Lowercase, hyphenated identifiers
- Example: `perceptron`, `neural-network`, `machine-learning`

---

## Notes

- All timestamps use PostgreSQL's `TIMESTAMP` type (without timezone)
- Text fields use `TEXT` type for flexibility (no length limits)
- The database supports both English (`en`) and Swedish (`sv`) languages
- Primary keys ensure data integrity and prevent duplicates
- Indexes optimize query performance for common access patterns

---

## Related Documentation

- `docs/DATABASE_FLOW.md` - Database architecture and data flow
- `docs/DB_QUICKSTART.md` - Quick start guide for database usage
- `docs/DB_ADMIN_UI.md` - Admin interface documentation
- `docs/DOKPLOY_INFRASTRUCTURE.md` - Infrastructure and deployment details

---

**Last Updated:** 2025-01-27

