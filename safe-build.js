#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCommand(cmd, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 ${description}...`);
    console.log(`Running: ${cmd}`);
    
    const child = exec(cmd, { 
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'production' },
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    child.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    
    child.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} completed successfully`);
        resolve();
      } else {
        console.error(`❌ ${description} failed with exit code ${code}`);
        reject(new Error(`${description} failed`));
      }
    });
    
    child.on('error', (error) => {
      console.error(`❌ ${description} error:`, error);
      reject(error);
    });
  });
}

async function ensureDirectories() {
  const dirs = [
    'dist', // Use 'dist' instead of 'public' to avoid Dokploy static detection
    'src/content/pages',
    'src/content/encyclopedia',
    'src/site/images/slide'
  ];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

async function main() {
  try {
    console.log('🚀 Starting safe build process...');
    
    await ensureDirectories();
    
    // Build static files
    await runCommand('node tools/build-static.js', 'Building static files');
    
    // Build pages
    await runCommand('node tools/build-pages.js', 'Building pages');
    
    // Build CSS with memory limits
    await runCommand('postcss src/tailwind.css -o dist/assets/css/tailwind.css --env production', 'Building CSS');
    
    // Rename dist to public after build to avoid Dokploy static detection during build
    if (fs.existsSync('public')) {
      fs.rmSync('public', { recursive: true, force: true });
    }
    fs.renameSync('dist', 'public');
    
    console.log('\n🎉 Build completed successfully!');
    console.log('📁 Files are ready in public/ directory');
    
  } catch (error) {
    console.error('\n💥 Build failed:', error.message);
    process.exit(1);
  }
}

main();
