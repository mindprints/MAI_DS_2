# Database Admin UI - User Guide

**New Database-First Admin Interface for Dokploy/PostgreSQL**

## Overview

The new admin interface is optimized for managing content in PostgreSQL database on Dokploy. It replaces the file-based admin with a clean, modern UI focused on CRUD operations for `text_snippets` table.

---

## Features

### ✨ Key Features

1. **Database-First Design**
   - No mode switcher - pure database operations
   - Direct PostgreSQL read/write via API
   - Real-time content editing

2. **Key Browser**
   - List all text snippet keys
   - Search/filter by key name
   - Quick key selection

3. **Bilingual Editor**
   - Side-by-side EN/SV editing
   - Large text areas for comfortable editing
   - Auto-save with Ctrl/Cmd+S

4. **Create New Keys**
   - Modal interface for creating new snippets
   - Key validation (alphanumeric, dots, colons, hyphens)
   - Create with EN, SV, or both

5. **Modern UI**
   - Dark theme optimized for long editing sessions
   - Responsive layout (works on tablets)
   - Toast notifications for feedback
   - Metadata display (last updated timestamp)

---

## How to Use

### Accessing the Admin

**Dokploy:**
```
https://app.aimuseum.site/admin
```

**Localhost:**
```
http://localhost:3000/admin
# (when running npm start or npm run admin)
```

### Loading Keys

1. Click **"Load Keys"** button in the sidebar
2. Wait for keys to load from database
3. Keys appear in alphabetical order
4. Badge shows total count

### Searching Keys

1. Type in the **"Search Keys"** input field
2. Results filter in real-time
3. Examples:
   - `page.home` - finds all homepage keys
   - `hero` - finds all hero section keys
   - `title` - finds all title keys

### Editing Content

1. Click a key in the sidebar
2. Content loads in the editor
3. Edit EN and/or SV text
4. Click **"Save Changes"** or press `Ctrl+S` / `Cmd+S`
5. Toast notification confirms save
6. Timestamp updates automatically

### Creating New Keys

1. Click **"+ Create New"** button
2. Enter key name (e.g., `page.about.hero.title`)
3. Enter English text (optional)
4. Enter Swedish text (optional)
5. Click **"Create"**
6. New key appears in list and is selected

**Key Naming Convention:**
```
page.<pagename>.<section>.<element>

Examples:
✅ page.home.hero.title
✅ page.about.team.description
✅ shared.nav.contact
✅ component.card-1.title

❌ Page Home Title (spaces not allowed)
❌ page/home/title (slashes not allowed)
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` / `Cmd+S` | Save current key |
| `Escape` | Close create modal |
| `Enter` (in search) | Focus first result |

---

## Technical Details

### API Endpoints Used

1. **List Keys**
   ```
   GET /api/db/text-snippets?limit=200
   Returns: { items: [{ key, values: {en, sv}, updated_at }] }
   ```

2. **Get Single Key**
   ```
   GET /api/db/text-snippets/:key
   Returns: { key, values: {en, sv}, updated_at }
   ```

3. **Create/Update Key**
   ```
   PUT /api/db/text-snippets/:key
   Body: { values: { en: "text", sv: "text" } }
   ```

### Database Table

```sql
text_snippets (
  key TEXT,
  lang TEXT,  -- 'en' or 'sv'
  body TEXT,
  updated_at TIMESTAMP,
  PRIMARY KEY (key, lang)
)
```

---

## Workflow

### Adding New Content to Site

1. **Create in Database** (using admin)
   ```
   Key: page.services.title
   EN: Our Services
   SV: Våra Tjänster
   ```

2. **Add to HTML** (in source files)
   ```html
   <h1 data-key="page.services.title">Fallback Text</h1>
   ```

3. **Deploy** (push to GitHub)
   - Dokploy rebuilds
   - `npm run export-db` runs
   - JSON files updated
   - Small-loader replaces content

4. **Verify** (on live site)
   - Visit page
   - Check DevTools: `/db/texts.json` loaded
   - Content appears dynamically

---

## Comparison: Old vs New

| Feature | Old Admin (Files) | New Admin (Database) |
|---------|------------------|---------------------|
| Mode Switcher | ✅ Yes | ❌ No (DB only) |
| File Editing | ✅ HTML files | ❌ Not available |
| DB Editing | ⚠️ Basic | ✅ Full-featured |
| UI Design | Functional | ✨ Modern & polished |
| Search | ❌ No | ✅ Yes |
| Create Keys | ❌ No | ✅ Yes |
| Side-by-side Edit | ❌ No | ✅ Yes |
| Metadata Display | ❌ No | ✅ Yes |
| Keyboard Shortcuts | ❌ No | ✅ Yes |

---

## Troubleshooting

### "Database not configured" Error

**Symptoms:** Admin shows error toast on load

**Solutions:**
1. Check Dokploy environment variables are set:
   ```
   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
   ```
2. Verify database is accessible from container
3. Check `admin/server.js` logs for connection errors

### Keys Don't Load

**Symptoms:** "Load Keys" button doesn't populate list

**Solutions:**
1. Check browser console for JavaScript errors
2. Verify `/api/db/text-snippets` endpoint responds
3. Check database has data: `SELECT * FROM text_snippets LIMIT 5;`

### Save Doesn't Work

**Symptoms:** "Save failed" toast appears

**Solutions:**
1. Check key name is valid (alphanumeric + dots/colons/hyphens)
2. Verify at least one language has content
3. Check browser console for API errors
4. Verify database write permissions

### Content Doesn't Appear on Site

**Symptoms:** Saved to DB but not showing on website

**Possible causes:**
1. **Export not run** - Deploy to trigger `npm run export-db`
2. **Wrong key name** - Check HTML `data-key` matches database key exactly
3. **Cache** - Hard refresh browser (Ctrl+Shift+R)
4. **Small-loader not active** - Check page includes small-loader script

---

## Future Enhancements

Planned features for future versions:

- [ ] **Delete keys** - Remove keys from database
- [ ] **Bulk import** - Import multiple keys from CSV/JSON
- [ ] **Usage tracker** - Show which pages use each key
- [ ] **History/audit log** - Track who changed what when
- [ ] **Media management** - Upload images to CDN, manage `media_assets` table
- [ ] **Encyclopedia editor** - WYSIWYG editor for encyclopedia entries
- [ ] **Preview mode** - See how content looks on actual pages
- [ ] **Conflict detection** - Warn if key already exists
- [ ] **Validation rules** - Require certain keys to have content

---

## Best Practices

### Key Naming

✅ **Do:**
- Use lowercase
- Use dots to separate hierarchy
- Be descriptive
- Follow consistent pattern

❌ **Don't:**
- Use spaces
- Use special characters (except dots, colons, hyphens, underscores)
- Make keys too long
- Use inconsistent patterns

### Content Guidelines

✅ **Do:**
- Provide both EN and SV when possible
- Keep text concise
- Use proper punctuation
- Test on live site after saving

❌ **Don't:**
- Leave both languages empty
- Include HTML tags (use plain text)
- Copy-paste from Word (can add hidden characters)
- Save without testing

### Workflow Tips

1. **Plan keys in advance** - Document key structure before creating
2. **Test locally first** - Use `npm start` and test at localhost
3. **Backup before bulk changes** - Export database before major edits
4. **Use search effectively** - Filter by page or section name
5. **Commit often** - Push changes regularly to Dokploy

---

## Support

For issues or questions:
1. Check this documentation first
2. Review `docs/CURRENT_STATE_EVALUATION.md` for architecture
3. Check Dokploy build logs for errors
4. Test database connection with `npm run test-db`

---

**Happy editing! 🎨**

