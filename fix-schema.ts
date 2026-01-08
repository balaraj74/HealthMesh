import sql from 'mssql';

async function fixSchema() {
  const config = {
    server: 'healthmesh.database.windows.net',
    port: 1433,
    database: 'free-sql-db-8620205',
    user: 'healthmesh',
    password: 'Balaraj6361',
    options: { encrypt: true, trustServerCertificate: false }
  };
  
  const pool = await sql.connect(config);
  console.log('✅ Connected');
  
  // Check current columns
  const cols = await pool.request().query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'hospitals'
  `);
  console.log('Current columns:', cols.recordset.map(r => r.COLUMN_NAME));
  
  // Add tenant_id if missing
  if (!cols.recordset.find(r => r.COLUMN_NAME === 'tenant_id')) {
    await pool.request().query('ALTER TABLE hospitals ADD tenant_id NVARCHAR(100)');
    await pool.request().query('UPDATE hospitals SET tenant_id = entra_tenant_id');
    console.log('✅ Added tenant_id column');
  } else {
    console.log('tenant_id already exists');
  }
  
  // Verify
  const result = await pool.request().query('SELECT * FROM hospitals');
  console.log('Hospitals:', result.recordset);
  
  await pool.close();
}

fixSchema().catch(console.error);
