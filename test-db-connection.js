#!/usr/bin/env node

/**
 * Database Connection Test Script
 * Tests connection to MAIdb PostgreSQL database
 */

require('dotenv').config();
const { Pool } = require('pg');

async function testConnection() {
  console.log('🔍 Testing database connection...\n');

  // Get connection details from environment variables
  const url = process.env.DATABASE_URL;
  const hasDirectConfig = process.env.PGHOST || process.env.PGDATABASE || process.env.PGUSER;
  
  if (!url && !hasDirectConfig) {
    console.error('❌ No database configuration found in environment variables');
    console.log('\nPlease set one of the following:');
    console.log('  DATABASE_URL=postgresql://user:pass@host:port/database');
    console.log('  OR individual PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE variables');
    process.exit(1);
  }

  let config;
  try {
    if (url) {
      console.log('📡 Using DATABASE_URL connection string');
      config = { connectionString: url };
    } else {
      console.log('📡 Using individual PostgreSQL environment variables');
      config = {
        host: process.env.PGHOST,
        port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE
      };
    }

    // Add SSL configuration
    if (process.env.PGSSL === 'require') {
      config.ssl = { rejectUnauthorized: false };
    } else if (!config.ssl) {
      config.ssl = false;
    }

    console.log('🔧 Connection configuration:');
    console.log(`   Host: ${config.host || 'from connection string'}`);
    console.log(`   Port: ${config.port || 'from connection string'}`);
    console.log(`   User: ${config.user || 'from connection string'}`);
    console.log(`   Database: ${config.database || 'from connection string'}`);
    console.log(`   SSL: ${config.ssl ? 'enabled' : 'disabled'}`);
    console.log('');

  } catch (error) {
    console.error('❌ Failed to parse database configuration:', error.message);
    process.exit(1);
  }

  // Test connection
  let pool;
  try {
    console.log('🚀 Attempting to connect...');
    pool = new Pool(config);
    
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Test basic query
    console.log('\n📊 Testing basic query...');
    const result = await client.query('SELECT version(), current_database(), current_user, now()');
    
    console.log('📋 Database Information:');
    console.log(`   PostgreSQL Version: ${result.rows[0].version.split(' ')[0]}`);
    console.log(`   Current Database: ${result.rows[0].current_database}`);
    console.log(`   Current User: ${result.rows[0].current_user}`);
    console.log(`   Server Time: ${result.rows[0].now}`);
    
    // Test if text_snippets table exists
    console.log('\n🔍 Checking for text_snippets table...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'text_snippets'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ text_snippets table exists');
      
      // Count records
      const countResult = await client.query('SELECT COUNT(*) as count FROM text_snippets');
      console.log(`   Records in text_snippets: ${countResult.rows[0].count}`);
    } else {
      console.log('⚠️  text_snippets table does not exist');
      console.log('   You may need to run database migrations or create the table');
    }
    
    client.release();
    console.log('\n🎉 All tests passed! Database is ready to use.');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    
    // Provide helpful error messages
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Check if the database server is running');
      console.error('   - Verify the host and port are correct');
      console.error('   - Ensure the external port (15432) is accessible');
    } else if (error.code === '28P01') {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Check username and password');
      console.error('   - Verify the user has access to the database');
    } else if (error.code === '3D000') {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Check if the database name is correct');
      console.error('   - Verify the database exists on the server');
    }
    
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n👋 Connection test interrupted');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n👋 Connection test terminated');
  process.exit(0);
});

// Run the test
testConnection().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});

