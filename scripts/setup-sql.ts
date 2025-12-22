#!/usr/bin/env tsx
/**
 * HealthMesh - Azure SQL Database Setup Script
 * Initializes schema and seeds demo data
 */

import { azureSQL } from '../server/db/sql-client';
import { initializeSchema, seedDemoData } from '../server/db/sql-schema';

async function setup() {
  console.log('🚀 HealthMesh Azure SQL Setup');
  console.log('================================\n');

  try {
    // Step 1: Test connection
    console.log('Step 1/3: Testing database connection...');
    await azureSQL.connect();
    console.log('✅ Connection successful\n');

    // Step 2: Initialize schema
    console.log('Step 2/3: Initializing database schema...');
    await initializeSchema();
    console.log('✅ Schema created\n');

    // Step 3: Seed demo data
    console.log('Step 3/3: Seeding demo data...');
    await seedDemoData();
    console.log('✅ Data seeded\n');

    console.log('================================');
    console.log('🎉 Setup complete! Your database is ready.');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run: npm run dev');
    console.log('2. Open: http://localhost:5000');
    console.log('3. Demo with pre-loaded patient data!');
    console.log('================================\n');

    await azureSQL.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Verify AZURE_SQL_CONNECTION_STRING in .env');
    console.error('2. Check password is correct (no spaces)');
    console.error('3. Ensure Azure SQL firewall allows your IP');
    console.error('   → Add your IP: https://portal.azure.com → SQL Server → Firewalls and virtual networks');
    
    await azureSQL.disconnect();
    process.exit(1);
  }
}

setup();
