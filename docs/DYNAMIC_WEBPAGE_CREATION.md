# Dynamic Webpage Creation System

This document explains how the Museum of Artificial Intelligence website dynamically generates webpages during the build process. The system uses a modular, template-based approach that supports multiple languages and content types.

## Overview

The build system creates static HTML pages from:
- **Content Modules** (`src/content/pages/`) - JavaScript files that define page data and logic
- **Templates** (`src/templates/pages/`) - HTML templates with placeholder variables
- **Static Assets** (`src/site/`) - Images, CSS, JavaScript, and other static files

## Build Process

The build process consists of three main steps executed by `npm run build`:

```bash
npm run build:static  # Copy static assets
npm run build:pages  # Generate HTML pages
npm run build:css   # Compile Tailwind CSS
```

### 1. Static Asset Building (`build-static.js`)

```12:24:tools/build-static.js
// Clean output directory
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

// Copy everything under src/site into public
fs.cpSync(srcDir, outDir, { recursive: true });
console.log('Static assets copied to public/.');
```

**What it does:**
- Cleans the `public/` directory
- Copies all files from `src/site/` to `public/`
- Copies admin UI from `admin/static/` to `public/admin/`

### 2. Page Generation (`build-pages.js`)

This is the core of the dynamic webpage creation system.

#### Content Module Discovery

```23:30:tools/build-pages.js
function loadContentModules() {
  return fs.readdirSync(contentDir)
    .filter((file) => file.endsWith('.js'))
    .map((file) => ({
      module: require(path.join(contentDir, file)),
      file,
    }));
}
```

The system scans `src/content/pages/` for JavaScript files and loads them as modules.

#### Template Rendering

```14:21:tools/build-pages.js
function renderTemplate(template, data) {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, key) => {
    if (!(key in data)) {
      throw new Error(`Missing template variable: ${key}`);
    }
    return data[key];
  });
}
```

Uses simple string replacement to inject data into HTML templates.

#### Asset Path Injection

```56:71:tools/build-pages.js
const baseData = { ...data };
const assetsPrefix = baseData.assetsPrefix || '..';

// Inject common asset paths unless already provided
if (!('tailwindHref' in baseData)) {
  baseData.tailwindHref = `${assetsPrefix}/assets/css/tailwind.css`;
}
if (!('stylesHref' in baseData)) {
  baseData.stylesHref = `${assetsPrefix}/assets/css/styles.css`;
}
if (!('scriptSrc' in baseData)) {
  baseData.scriptSrc = `${assetsPrefix}/assets/js/script.js`;
}
```

Automatically injects common asset paths based on the page's location.

### 3. CSS Compilation

```bash
postcss src/tailwind.css -o public/assets/css/tailwind.css --env production
```

Compiles Tailwind CSS for production with optimizations.

## Content Module Structure

Each content module in `src/content/pages/` must export an object with this structure:

```javascript
module.exports = {
  template: 'template-name',  // Template file to use
  locales: {                 // Language-specific data
    en: { /* English data */ },
    sv: { /* Swedish data */ }
  },
  prepare: function(locale, data) {  // Optional preprocessing
    // Modify data before rendering
    return data;
  }
};
```

### Example: Meeting Page Module

```197:257:src/content/pages/meeting.js
module.exports = {
  template: 'meeting',
  locales: {
    en: {
      output: 'pages/meeting.html',
      lang: 'en',
      title: 'Annual Meeting Documents',
      assetsPrefix: '..',
      indexHref: '../index.html',
      navHomeText: 'Back to Home',
      heroTitle: 'Annual Meeting Documents',
      heroCopy: 'Welcome to our document repository...',
      documentCards: generateDocumentCards(documents, '..'),
      // ... more data
    },
    sv: {
      output: 'sv/pages/meeting.html',
      lang: 'sv',
      title: 'Mötes- och föreningsdokument',
      assetsPrefix: '../..',
      indexHref: '../index.html',
      navHomeText: 'Till startsidan',
      heroTitle: 'Mötes- och föreningsdokument',
      heroCopy: 'Välkommen till vår dokumentarkiv...',
      documentCards: generateSwedishDocumentCards(documents, '../..'),
      // ... more data
    }
  }
};
```

## Template System

Templates are HTML files in `src/templates/pages/` that use `{{variableName}}` placeholders:

```1:17:src/templates/pages/meeting.html
<!DOCTYPE html>
<html lang="{{lang}}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;600;700;900&display=swap" rel="stylesheet">
  <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="stylesheet" href="{{tailwindHref}}">
  <link rel="stylesheet" href="{{stylesHref}}">
{{headExtras}}
```

## Multi-Language Support

The system automatically generates pages for multiple languages:

- **English pages**: Generated in `public/pages/`
- **Swedish pages**: Generated in `public/sv/pages/`

Each language version can have:
- Different content and translations
- Different asset paths (`assetsPrefix`)
- Different output locations
- Language-specific metadata

## Dynamic Content Generation

Content modules can generate dynamic content through JavaScript functions:

### Document Processing Example

```8:76:src/content/pages/meeting.js
function getDocuments() {
  const docsDir = path.join(__dirname, '../../site/documents');
  const files = fs.readdirSync(docsDir).filter(file => file.endsWith('.pdf'));
  
  return files.map(filename => {
    // Extract meaningful information from filename
    const nameWithoutExt = filename.replace('.pdf', '');
    
    // Create document metadata based on filename patterns
    let category = 'Document';
    let title = nameWithoutExt;
    let description = 'Official document';
    
    if (filename.includes('Protokoll')) {
      category = 'Minutes';
      if (filename.includes('styrelsemöte')) {
        title = filename.includes('2025') ? 'Board Meeting Minutes August 2025' : 'Board Meeting Minutes 2023-1';
        description = filename.includes('2025') ? 'Latest board meeting protocol' : 'Meeting protocol from board session';
      }
      // ... more processing
    }
    
    return {
      filename,
      category,
      title,
      description
    };
  });
}
```

### Encyclopedia Index Generation

```90:99:src/content/pages/encyclopedia.index.js
prepare(locale, data) {
  // Write combined JSON index once per build (on EN pass)
  if (locale !== 'en') return data;
  const entries = discoverEntries();
  const idx = buildJsonIndex(entries);
  const outDir = path.join(process.cwd(), 'public', 'data');
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, 'encyclopedia-index.json'), JSON.stringify(idx, null, 2) + '\n', 'utf8');
  return data;
}
```

## File Structure

```
src/
├── content/pages/          # Content modules (JavaScript)
│   ├── about.js
│   ├── meeting.js
│   ├── encyclopedia.index.js
│   └── ...
├── templates/pages/        # HTML templates
│   ├── about.html
│   ├── meeting.html
│   ├── encyclopedia-index.html
│   └── ...
└── site/                   # Static assets
    ├── images/
    ├── assets/
    ├── documents/
    └── ...

public/                     # Generated output
├── pages/                  # English pages
├── sv/pages/              # Swedish pages
├── assets/                # Static assets
└── data/                  # Generated data files
```

## Advanced Features

### Alias Outputs

Pages can generate multiple output files for clean URLs:

```javascript
locales: {
  en: {
    output: 'pages/about.html',
    aliasOutputs: ['about.html'],  // Also create root-level alias
    // ... other data
  }
}
```

### Prepare Functions

Modules can preprocess data before rendering:

```javascript
prepare(locale, data) {
  // Generate dynamic content
  data.dynamicContent = generateContent();
  
  // Write additional files
  fs.writeFileSync('output.json', JSON.stringify(data));
  
  return data;
}
```

### Asset Path Resolution

The system automatically resolves asset paths based on page location:

- Root pages (`index.html`): `assetsPrefix = '.'`
- Subdirectory pages (`pages/about.html`): `assetsPrefix = '..'`
- Nested pages (`sv/pages/about.html`): `assetsPrefix = '../..'`

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Full build process |
| `npm run build:static` | Copy static assets only |
| `npm run build:pages` | Generate HTML pages only |
| `npm run build:css` | Compile CSS only |
| `npm run optimize` | Optimize images |
| `npm run generate:slides` | Generate slides manifest |

## Benefits

1. **Modularity**: Each page is a separate module with its own logic
2. **Internationalization**: Built-in support for multiple languages
3. **Type Safety**: JavaScript modules provide compile-time checking
4. **Performance**: Generates static HTML for fast loading
5. **Maintainability**: Clear separation between content, templates, and assets
6. **Flexibility**: Easy to add new pages or modify existing ones

## Development Workflow

1. **Create content module** in `src/content/pages/`
2. **Create template** in `src/templates/pages/`
3. **Add static assets** to `src/site/`
4. **Run build** with `npm run build`
5. **Test locally** with `npm start`

This system provides a powerful, flexible foundation for creating and maintaining a multilingual website with dynamic content generation.
