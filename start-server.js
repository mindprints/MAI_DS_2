#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Ensure required directories exist
const requiredDirs = [
  'src/content/pages',
  'src/content/encyclopedia', 
  'src/site/images/slide',
  'public',
  'admin/static'
];

console.log('Checking required directories...');
for (const dir of requiredDirs) {
  if (!fs.existsSync(dir)) {
    console.log(`Creating missing directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  } else {
    console.log(`✓ Directory exists: ${dir}`);
  }
}

// Check if admin/static/index.html exists
const adminIndexPath = 'admin/static/index.html';
if (!fs.existsSync(adminIndexPath)) {
  console.error(`ERROR: Missing admin UI file: ${adminIndexPath}`);
  process.exit(1);
}

// Set Node.js memory limits for container environment
if (!process.env.NODE_OPTIONS) {
  process.env.NODE_OPTIONS = '--max-old-space-size=512';
}

console.log('Node.js version:', process.version);
console.log('Memory limit:', process.env.NODE_OPTIONS);
console.log('Starting admin server...');

// Start the server
try {
  require('./admin/server.js');
} catch (error) {
  console.error('Failed to start server:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}
