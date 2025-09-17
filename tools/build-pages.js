#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const templatesDir = path.join(rootDir, 'src', 'templates', 'pages');
const contentDir = path.join(rootDir, 'src', 'content', 'pages');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function renderTemplate(template, data) {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, key) => {
    if (!(key in data)) {
      throw new Error(`Missing template variable: ${key}`);
    }
    return data[key];
  });
}

function loadContentModules() {
  return fs.readdirSync(contentDir)
    .filter((file) => file.endsWith('.js'))
    .map((file) => ({
      module: require(path.join(contentDir, file)),
      file,
    }));
}

let generated = 0;
const modules = loadContentModules();

for (const { module: pageModule, file } of modules) {
  const { template, locales, prepare } = pageModule;
  if (!template || !locales) {
    throw new Error(`Invalid page module ${file}: missing template or locales export.`);
  }

  const templatePath = path.join(templatesDir, `${template}.html`);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found for ${file}: ${templatePath}`);
  }
  const templateHtml = fs.readFileSync(templatePath, 'utf8');

  for (const [locale, rawData] of Object.entries(locales)) {
    const outputPath = path.join(publicDir, rawData.output);
    ensureDir(path.dirname(outputPath));

    const baseData = { ...rawData };
    const assetsPrefix = rawData.assetsPrefix || '..';

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
    if (!('boardImageSrc' in baseData)) {
      baseData.boardImageSrc = `${assetsPrefix}/images/MAI_styrelse_logo.webp`;
    }

    const preparedData = prepare ? prepare(locale, baseData) : baseData;
    const rendered = renderTemplate(templateHtml, preparedData);
    fs.writeFileSync(outputPath, rendered, 'utf8');
    generated += 1;
  }
}

console.log(`Generated ${generated} localized page(s).`);
