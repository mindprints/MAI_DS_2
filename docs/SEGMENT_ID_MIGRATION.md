# Segment ID Migration Guide

## Overview

This guide explains how to migrate your HTML files to use stable `data-segment-id` attributes, making the admin editor more robust and preventing alignment issues between EN/SV versions.

## The Problem

The admin editor previously used **DOM node paths** (like `0/1/2/3`) to identify text segments. This caused issues when:
- HTML structures differ slightly between EN and SV
- Missing closing tags create DOM mismatches
- Whitespace or comments create different node trees

## The Solution

Add `data-segment-id` attributes to editable text elements:

```html
<!-- Before (fragile) -->
<h1>Learn AI with us!</h1>

<!-- After (robust) -->
<h1 data-segment-id="index-span-h1-0">Learn AI with us!</h1>
```

These IDs are:
- ✅ **Stable** - Won't change with HTML structure
- ✅ **Unique** - Each segment has its own ID
- ✅ **Readable** - Format: `{page}-{parent}-{tag}-{index}`
- ✅ **Language-agnostic** - Same ID for EN and SV versions

## Migration Steps

### 1. Preview Changes (Dry Run)

First, see what will change without modifying files:

```bash
node tools/add-segment-ids.js --dry-run
```

Expected output:
```
🚀 Adding data-segment-id attributes to HTML files

📋 DRY RUN MODE - No files will be modified

📄 index
   EN segments: 45
   SV segments: 45
   Sample IDs: index-div-h1-0, index-div-p-1, index-div-span-2
   🔍 DRY RUN - no changes made

📄 about
   EN segments: 28
   SV segments: 28
   Sample IDs: about-div-h2-0, about-div-p-1, about-section-span-2
   🔍 DRY RUN - no changes made

...

✨ Migration complete!
```

### 2. Apply Migration

Once you're satisfied with the preview, apply the changes:

```bash
node tools/add-segment-ids.js
```

Output:
```
🚀 Adding data-segment-id attributes to HTML files

📄 index
   EN segments: 45
   SV segments: 45
   Sample IDs: index-div-h1-0, index-div-p-1, index-div-span-2
   ✅ Updated both files

...

✨ Migration complete!

📝 Next steps:
  1. Review the changes in your editor
  2. Test the admin interface
  3. Commit the changes to git
```

### 3. Review Changes

Check the modified files in your editor:

```bash
git diff src/site/index.html
git diff src/site/sv/index.html
```

You should see `data-segment-id` attributes added to text elements:

```diff
- <h1 class="text-3xl font-bold">Learn AI with us!</h1>
+ <h1 class="text-3xl font-bold" data-segment-id="index-div-h1-0">Learn AI with us!</h1>
```

### 4. Test Admin Interface

1. **Start admin server:**
   ```bash
   npm run admin
   ```

2. **Access admin:**
   - Open: http://localhost:5179/admin
   - Login with your credentials

3. **Test segment editing:**
   - Go to "Files" mode
   - Select "index" page
   - Verify EN and SV segments align perfectly
   - Edit some text and save
   - Reload and verify changes persist

### 5. Commit Changes

Once everything works:

```bash
git add src/site/ src/content/
git commit -m "feat: add data-segment-id attributes for robust admin editing"
git push
```

## How It Works

### Migration Script Logic

1. **Read HTML files** - Loads both EN and SV versions
2. **Parse DOM** - Uses cheerio to find text nodes
3. **Generate IDs** - Creates stable IDs based on context
4. **Add attributes** - Inserts `data-segment-id` to elements
5. **Write files** - Saves updated HTML (unless dry run)

### Admin Editor Updates

The admin's `dom.js` now:

1. **Checks for segment IDs first:**
   ```javascript
   $('[data-segment-id]').each((_, el) => {
     // Use stable ID
   });
   ```

2. **Falls back to DOM paths:**
   ```javascript
   if (segments.length === 0) {
     // Use old method for backwards compatibility
   }
   ```

This ensures:
- ✅ New files with IDs work perfectly
- ✅ Old files without IDs still work (backwards compatible)
- ✅ No breaking changes

## Affected Files

The migration processes:

### Main Pages
- `src/site/index.html` + `src/site/sv/index.html`

### Content Pages (12 pairs)
- `src/content/pages/about.{en,sv}.html`
- `src/content/pages/contact.{en,sv}.html`
- `src/content/pages/events.{en,sv}.html`
- `src/content/pages/explore.{en,sv}.html`
- `src/content/pages/journal.{en,sv}.html`
- `src/content/pages/learn-more.{en,sv}.html`
- `src/content/pages/membership.{en,sv}.html`
- `src/content/pages/plan-workshop.{en,sv}.html`
- `src/content/pages/privacy.{en,sv}.html`
- `src/content/pages/resources.{en,sv}.html`
- `src/content/pages/tailored.{en,sv}.html`

### Encyclopedia Pages (6 pairs)
- `src/content/encyclopedia/ai-winter-1974-1980.{en,sv}.html`
- `src/content/encyclopedia/backpropagation-1986.{en,sv}.html`
- `src/content/encyclopedia/dartmouth-1956.{en,sv}.html`
- `src/content/encyclopedia/imagenet-alexnet-2012.{en,sv}.html`
- `src/content/encyclopedia/perceptron.{en,sv}.html`
- `src/content/encyclopedia/transformers-2017.{en,sv}.html`

**Total:** 38 files (19 EN + 19 SV)

## Segment ID Format

IDs follow this pattern: `{page}-{parent}-{tag}-{index}`

**Examples:**

```html
<!-- Main heading -->
<h1 data-segment-id="index-div-h1-0">Learn AI with us!</h1>

<!-- Paragraph in section -->
<p data-segment-id="about-section-p-5">We are experts...</p>

<!-- Span in list item -->
<li>
  <span data-segment-id="events-li-span-12">Workshop Date</span>
</li>
```

**Components:**
- `index` / `about` - Page name
- `div` / `section` / `li` - Parent tag
- `h1` / `p` / `span` - Element tag
- `0` / `5` / `12` - Sequential index

## Troubleshooting

### Issue: Segment Count Mismatch

**Symptoms:**
```
📄 index
   EN segments: 45
   SV segments: 43
   ⚠️  WARNING: Segment count mismatch!
```

**Solution:**
1. Check for HTML structure differences
2. Look for missing closing tags
3. Verify both versions have matching elements
4. Fix structure, then re-run migration

### Issue: Changes Not Applied

**Symptoms:**
- Dry run shows changes
- Running without `--dry-run` shows no updates

**Solution:**
1. Check file permissions
2. Verify files aren't read-only
3. Run with elevated permissions if needed

### Issue: Admin Still Uses Old IDs

**Symptoms:**
- Migration complete
- Admin shows DOM path IDs (0/1/2/3)

**Solution:**
1. Restart admin server: `npm run admin`
2. Hard refresh browser: Ctrl+Shift+R
3. Clear browser cache
4. Verify `admin/dom.js` was updated

## Best Practices

### When Adding New Content

1. **Add to both EN and SV** at the same time
2. **Use same structure** - Keep DOM trees identical
3. **Add segment ID manually:**
   ```html
   <p data-segment-id="newpage-div-p-0">New content</p>
   ```

4. **Use consistent naming:**
   - Page name: Lowercase, no spaces
   - Follow existing pattern
   - Increment index sequentially

### Maintaining Alignment

✅ **Do:**
- Keep HTML structures identical
- Add/remove elements in both versions together
- Use the migration script after major restructuring
- Test admin after structure changes

❌ **Don't:**
- Edit only one language version's structure
- Remove segment IDs manually
- Change existing ID formats
- Rely on DOM paths for new content

## Re-running Migration

You can safely re-run the migration script:

```bash
# It will skip elements that already have data-segment-id
node tools/add-segment-ids.js
```

The script:
- ✅ Preserves existing IDs
- ✅ Only adds new IDs where missing
- ✅ Won't duplicate or overwrite

## Rollback

If you need to revert:

```bash
# Undo file changes
git checkout src/site/ src/content/

# Or revert specific files
git checkout src/site/index.html src/site/sv/index.html
```

The admin will fall back to DOM path method automatically.

## Future Enhancements

Potential improvements:

1. **Auto-generate IDs on build**
   - Add to build pipeline
   - Always have fresh IDs

2. **Validate alignment**
   - Check EN/SV segment counts match
   - Report structure differences

3. **ID regeneration**
   - Re-index all IDs
   - Fix gaps in sequence

4. **Visual editor**
   - WYSIWYG admin interface
   - Direct text editing without IDs

## Summary

✅ **Migration Benefits:**
- Robust text editing regardless of structure
- EN/SV alignment always correct
- Admin editor survives HTML changes
- Better developer experience

📝 **Quick Reference:**

```bash
# Preview changes
node tools/add-segment-ids.js --dry-run

# Apply migration
node tools/add-segment-ids.js

# Test
npm run admin
```

🎉 **You're all set!** Your admin editor is now bulletproof against structure mismatches.

