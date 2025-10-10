#!/usr/bin/env node
/**
 * Migration Script: Add data-segment-id attributes to HTML files
 * 
 * This script adds stable `data-segment-id` attributes to text nodes in HTML files,
 * making the admin editor more robust by not relying on fragile DOM paths.
 * 
 * Usage:
 *   node tools/add-segment-ids.js --dry-run   # Preview changes
 *   node tools/add-segment-ids.js             # Apply changes
 */

const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');

const SKIP_TAGS = new Set(['script', 'style', 'code', 'pre']);
const DRY_RUN = process.argv.includes('--dry-run');

// Pages to process
const PAGES = [
  { en: 'src/site/index.html', sv: 'src/site/sv/index.html' },
  { en: 'src/content/pages/about.en.html', sv: 'src/content/pages/about.sv.html' },
  { en: 'src/content/pages/contact.en.html', sv: 'src/content/pages/contact.sv.html' },
  { en: 'src/content/pages/events.en.html', sv: 'src/content/pages/events.sv.html' },
  { en: 'src/content/pages/explore.en.html', sv: 'src/content/pages/explore.sv.html' },
  { en: 'src/content/pages/journal.en.html', sv: 'src/content/pages/journal.sv.html' },
  { en: 'src/content/pages/learn-more.en.html', sv: 'src/content/pages/learn-more.sv.html' },
  { en: 'src/content/pages/membership.en.html', sv: 'src/content/pages/membership.sv.html' },
  { en: 'src/content/pages/plan-workshop.en.html', sv: 'src/content/pages/plan-workshop.sv.html' },
  { en: 'src/content/pages/privacy.en.html', sv: 'src/content/pages/privacy.sv.html' },
  { en: 'src/content/pages/resources.en.html', sv: 'src/content/pages/resources.sv.html' },
  { en: 'src/content/pages/tailored.en.html', sv: 'src/content/pages/tailored.sv.html' },
];

// Encyclopedia pages
const ENCYCLOPEDIA = [
  'ai-winter-1974-1980',
  'backpropagation-1986',
  'dartmouth-1956',
  'imagenet-alexnet-2012',
  'perceptron',
  'transformers-2017'
];

ENCYCLOPEDIA.forEach(slug => {
  PAGES.push({
    en: `src/content/encyclopedia/${slug}.en.html`,
    sv: `src/content/encyclopedia/${slug}.sv.html`
  });
});

/**
 * Generate a stable segment ID based on context
 */
function generateSegmentId(element, index, pageType) {
  const tag = element.tagName.toLowerCase();
  const parentTag = element.parent?.tagName?.toLowerCase() || 'root';
  
  // Create a readable, stable ID
  const parts = [pageType, parentTag, tag, index];
  return parts.join('-');
}

/**
 * Extract text segments from HTML and add IDs
 */
function addSegmentIds(html, pageType) {
  const $ = cheerio.load(html, { 
    decodeEntities: false,
    xmlMode: false 
  });
  
  let segmentIndex = 0;
  const segments = [];

  // Find all text nodes and wrap them with data-segment-id
  $('*').each((_, element) => {
    if (SKIP_TAGS.has(element.tagName)) return;
    
    const $el = $(element);
    const children = element.children || [];
    
    children.forEach((child, childIndex) => {
      if (child.type === 'text') {
        const text = (child.data || '').replace(/\s+/g, ' ').trim();
        
        // Only process non-empty text nodes
        if (text) {
          // Check if parent already has data-segment-id
          const existingId = $el.attr('data-segment-id');
          
          if (!existingId) {
            // Generate new ID
            const segmentId = generateSegmentId(element, segmentIndex, pageType);
            
            // Check if there's only one text child - add ID to parent
            const textChildren = children.filter(c => c.type === 'text' && c.data.trim());
            
            if (textChildren.length === 1) {
              $el.attr('data-segment-id', segmentId);
              segments.push({ id: segmentId, tag: element.tagName, text });
              segmentIndex++;
            } else {
              // Multiple text nodes - wrap this one in a span
              const $span = $(`<span data-segment-id="${segmentId}">${text}</span>`);
              $(child).replaceWith($span);
              segments.push({ id: segmentId, tag: 'span', text });
              segmentIndex++;
            }
          } else {
            // Already has ID, just record it
            segments.push({ id: existingId, tag: element.tagName, text });
            segmentIndex++;
          }
        }
      }
    });
  });

  return {
    html: $.html(),
    segments
  };
}

/**
 * Process a page pair (EN and SV)
 */
async function processPagePair(enPath, svPath) {
  try {
    // Check if files exist
    const enExists = await fs.access(enPath).then(() => true).catch(() => false);
    const svExists = await fs.access(svPath).then(() => true).catch(() => false);

    if (!enExists || !svExists) {
      console.log(`⏭️  Skipping ${enPath} (one or both files missing)`);
      return;
    }

    // Read files
    const enHtml = await fs.readFile(enPath, 'utf8');
    const svHtml = await fs.readFile(svPath, 'utf8');

    // Extract page type from path
    const pageType = path.basename(enPath, '.en.html').replace('.html', '');

    // Add segment IDs
    const enResult = addSegmentIds(enHtml, pageType);
    const svResult = addSegmentIds(svHtml, pageType);

    // Report
    console.log(`\n📄 ${pageType}`);
    console.log(`   EN segments: ${enResult.segments.length}`);
    console.log(`   SV segments: ${svResult.segments.length}`);

    if (enResult.segments.length !== svResult.segments.length) {
      console.warn(`   ⚠️  WARNING: Segment count mismatch!`);
    }

    // Show sample IDs
    if (enResult.segments.length > 0) {
      console.log(`   Sample IDs: ${enResult.segments.slice(0, 3).map(s => s.id).join(', ')}`);
    }

    // Write files (unless dry run)
    if (!DRY_RUN) {
      await fs.writeFile(enPath, enResult.html, 'utf8');
      await fs.writeFile(svPath, svResult.html, 'utf8');
      console.log(`   ✅ Updated both files`);
    } else {
      console.log(`   🔍 DRY RUN - no changes made`);
    }

  } catch (error) {
    console.error(`❌ Error processing ${enPath}:`, error.message);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Adding data-segment-id attributes to HTML files\n');
  
  if (DRY_RUN) {
    console.log('📋 DRY RUN MODE - No files will be modified\n');
  }

  // Process all page pairs
  for (const page of PAGES) {
    await processPagePair(page.en, page.sv);
  }

  console.log('\n✨ Migration complete!');
  
  if (DRY_RUN) {
    console.log('\nRun without --dry-run to apply changes:');
    console.log('  node tools/add-segment-ids.js');
  } else {
    console.log('\n📝 Next steps:');
    console.log('  1. Review the changes in your editor');
    console.log('  2. Test the admin interface');
    console.log('  3. Commit the changes to git');
  }
}

// Run
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

