#!/usr/bin/env node
/**
 * Run Database Migration for Production
 * Uses better-sqlite3 or mssql if available, otherwise provides instructions
 */

const fs = require('fs');
const path = require('path');

const SQL_FILE = path.join(__dirname, '../db/migrations/fix-production-schema.sql');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║       RUNNING PRODUCTION DATABASE MIGRATION                ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Read SQL content
const sqlContent = fs.readFileSync(SQL_FILE, 'utf-8');

// Since we can't easily execute T-SQL from Node without proper drivers,
// let's use Azure CLI to execute the SQL

const { execSync } = require('child_process');

const SERVER = 'healthmeshdevsql23qydhgf';
const DATABASE = 'healthmesh';
const USERNAME = 'healthmeshadmin';
const PASSWORD = 'HealthMesh@2025!';

// Split SQL by GO statements
const batches = sqlContent
  .split(/\nGO\n/i)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && s !== 'GO');

console.log(`Found ${batches.length} SQL batches to execute\n`);

let successCount = 0;
let failCount = 0;

for (let i = 0; i < batches.length; i++) {
  const batch = batches[i];
  console.log(`\n[${i + 1}/${batches.length}] Executing batch...`);
  
  // Escape the SQL for command line
  const escapedSQL = batch.replace(/"/g, '\\"').replace(/'/g, "''");
  
  // Create a temporary SQL file for this batch
  const tempFile = `/tmp/migration_batch_${i}.sql`;
  fs.writeFileSync(tempFile, batch);
  
  try {
    // Try using sqlcmd if available
    const cmd = `sqlcmd -S ${SERVER}.database.windows.net -d ${DATABASE} -U ${USERNAME} -P "${PASSWORD}" -i ${tempFile} -C`;
    
    try {
      const output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
      console.log('✅ Success');
      if (output) console.log(output);
      successCount++;
    } catch (cmdError) {
      // sqlcmd not available, try another method
      console.log('⚠️  sqlcmd not available, trying alternative...');
      
      // As fallback, we'll create a shell script
      throw new Error('Need Azure Portal');
    }
  } catch (error) {
    console.log(`⚠️  Batch ${i + 1}: ${error.message}`);
    failCount++;
  } finally {
    // Clean up temp file
    try { fs.unlinkSync(tempFile); } catch {}
  }
}

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║       MIGRATION STATUS                                     ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log(`✅ Successful: ${successCount}`);
console.log(`⚠️  Failed: ${failCount}`);

if (failCount > 0) {
  console.log('\n⚠️  Some batches failed. Trying Azure Data Studio method...\n');
  
  // Write a combined SQL file
  const outputFile = '/tmp/production-migration.sql';
  fs.writeFileSync(outputFile, sqlContent);
  
  console.log('SQL file saved to:', outputFile);
  console.log('\nPlease run this SQL in Azure Portal Query Editor:');
  console.log('1. Go to: https://portal.azure.com');
  console.log('2. Find database: healthmesh');
  console.log('3. Click Query editor');
  console.log('4. Login with: healthmeshadmin / HealthMesh@2025!');
  console.log('5. Run the SQL\n');
}
