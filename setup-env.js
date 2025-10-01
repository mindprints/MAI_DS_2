#!/usr/bin/env node

/**
 * Environment Setup Helper
 * Helps create .env file with correct database configuration
 */

const fs = require('fs');
const path = require('path');

const envContent = `# Database Configuration for MAIdb
# Copy this to .env and update with your actual values

# Option 1: Using DATABASE_URL (recommended)
DATABASE_URL=postgresql://mindprints@gmail.com:6+ezx6+JqmrMekSNtU@v@31.97.73.204:15432/MAI__texts

# Option 2: Using individual PostgreSQL variables
PGHOST=31.97.73.204
PGPORT=15432
PGUSER=mindprints@gmail.com
PGPASSWORD=6+ezx6+JqmrMekSNtU@v
PGDATABASE=MAI__texts
PGSSL=

# Other required environment variables
NODE_ENV=production
PORT=3000
NODE_OPTIONS=--max-old-space-size=512

# EmailJS configuration (replace with your actual values)
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_PRIVATE_KEY=your_private_key
EMAILJS_PUBLIC_KEY=your_public_key
EMAILJS_TEMPLATE_CONTACT=your_contact_template_id
EMAILJS_TEMPLATE_WORKSHOP=your_workshop_template_id

# CORS/Origin security
ALLOWED_ORIGINS=http://localhost:3000,https://aimuseum.se,https://www.aimuseum.se
`;

function setupEnv() {
  const envPath = '.env';
  
  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env file already exists');
    console.log('   Backing up to .env.backup');
    fs.copyFileSync(envPath, '.env.backup');
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env file with database configuration');
  console.log('📝 Please update EmailJS values with your actual credentials');
  console.log('🔧 Run "node test-db-connection.js" to test the database connection');
}

setupEnv();

