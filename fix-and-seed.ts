import sql from 'mssql';

async function fixAndSeed() {
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
  
  // 1. Check what tables exist
  const tables = await pool.request().query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'
  `);
  console.log('\n📋 Current tables:', tables.recordset.map(r => r.TABLE_NAME));
  
  // 2. Check cases table columns
  const casesCols = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'cases'
  `);
  console.log('\n📋 Cases table columns:', casesCols.recordset);
  
  // 3. Rename cases to clinical_cases if needed
  const hasClinicalCases = tables.recordset.find(r => r.TABLE_NAME === 'clinical_cases');
  const hasCases = tables.recordset.find(r => r.TABLE_NAME === 'cases');
  
  if (hasCases && !hasClinicalCases) {
    console.log('\n🔄 Renaming cases -> clinical_cases...');
    await pool.request().query("EXEC sp_rename 'cases', 'clinical_cases'");
    console.log('✅ Renamed!');
  }
  
  // 4. Check clinical_cases columns and add missing ones
  const clinicalCaseCols = await pool.request().query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'clinical_cases'
  `);
  const existingCols = clinicalCaseCols.recordset.map(r => r.COLUMN_NAME);
  console.log('\n📋 clinical_cases columns:', existingCols);
  
  const requiredColumns = [
    { name: 'assigned_doctor_id', type: 'NVARCHAR(36)' },
    { name: 'chief_complaint', type: 'NVARCHAR(MAX)' },
    { name: 'diagnosis', type: 'NVARCHAR(MAX)' },
    { name: 'treatment_plan', type: 'NVARCHAR(MAX)' }
  ];
  
  for (const col of requiredColumns) {
    if (!existingCols.includes(col.name)) {
      console.log(`Adding missing column: ${col.name}...`);
      await pool.request().query(`ALTER TABLE clinical_cases ADD ${col.name} ${col.type}`);
      console.log(`✅ Added ${col.name}`);
    }
  }
  
  // 5. Get hospital ID
  const hospitalResult = await pool.request().query(`SELECT TOP 1 id FROM hospitals`);
  const hospitalId = hospitalResult.recordset[0]?.id;
  console.log('\n📍 Hospital ID:', hospitalId);
  
  if (!hospitalId) {
    console.log('❌ No hospital found');
    await pool.close();
    return;
  }
  
  // 6. Check if user exists, get or create
  let userResult = await pool.request()
    .input('hospitalId', sql.NVarChar, hospitalId)
    .query('SELECT TOP 1 id FROM users WHERE hospital_id = @hospitalId');
  
  let userId;
  if (userResult.recordset.length === 0) {
    const newUser = await pool.request()
      .input('hospitalId', sql.NVarChar, hospitalId)
      .input('entraOid', sql.NVarChar, 'seed-user-001')
      .input('tenantId', sql.NVarChar, 'e290fb02-d184-4a8c-ae49-c83b04485909')
      .input('email', sql.NVarChar, 'seed@pes.edu')
      .input('name', sql.NVarChar, 'Dr. Seed')
      .input('role', sql.NVarChar, 'doctor')
      .query(`
        INSERT INTO users (hospital_id, entra_oid, tenant_id, email, name, role)
        OUTPUT INSERTED.id
        VALUES (@hospitalId, @entraOid, @tenantId, @email, @name, @role)
      `);
    userId = newUser.recordset[0].id;
    console.log('✅ Created seed user');
  } else {
    userId = userResult.recordset[0].id;
    console.log('✅ Using existing user:', userId);
  }
  
  // 7. Check for existing patients
  const existingPatients = await pool.request()
    .input('hospitalId', sql.NVarChar, hospitalId)
    .query('SELECT COUNT(*) as count FROM patients WHERE hospital_id = @hospitalId');
  
  if (existingPatients.recordset[0].count >= 3) {
    console.log('⚠️ Patients already exist, getting IDs...');
    const patients = await pool.request()
      .input('hospitalId', sql.NVarChar, hospitalId)
      .query('SELECT id, first_name FROM patients WHERE hospital_id = @hospitalId');
    console.log('Patients:', patients.recordset);
  }
  
  // 8. Get patient IDs
  const patients = await pool.request()
    .input('hospitalId', sql.NVarChar, hospitalId)
    .query('SELECT TOP 3 id FROM patients WHERE hospital_id = @hospitalId');
  
  if (patients.recordset.length === 0) {
    console.log('❌ No patients found - run seed script first');
    await pool.close();
    return;
  }
  
  const patient1Id = patients.recordset[0]?.id;
  const patient2Id = patients.recordset[1]?.id;
  const patient3Id = patients.recordset[2]?.id;
  
  // 9. Check for existing cases
  const existingCases = await pool.request()
    .input('hospitalId', sql.NVarChar, hospitalId)
    .query('SELECT COUNT(*) as count FROM clinical_cases WHERE hospital_id = @hospitalId');
  
  if (existingCases.recordset[0].count > 0) {
    console.log('⚠️ Cases already exist, skipping case creation...');
  } else {
    // Create cases using actual columns
    const caseCols = await pool.request().query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'clinical_cases'
    `);
    console.log('\nActual clinical_cases columns:', caseCols.recordset.map(r => r.COLUMN_NAME));
    
    // Simple insert with common columns
    await pool.request()
      .input('hospitalId', sql.NVarChar, hospitalId)
      .input('patientId', sql.NVarChar, patient1Id)
      .input('caseType', sql.NVarChar, 'tumor-board')
      .input('status', sql.NVarChar, 'review-ready')
      .input('priority', sql.NVarChar, 'high')
      .input('chiefComplaint', sql.NVarChar, 'Breast cancer - optimal therapy?')
      .input('diagnosis', sql.NVarChar, 'Stage IIA breast cancer')
      .input('treatmentPlan', sql.NVarChar, 'Chemo + endocrine therapy')
      .input('userId', sql.NVarChar, userId)
      .query(`
        INSERT INTO clinical_cases (hospital_id, patient_id, case_type, status, priority, chief_complaint, diagnosis, treatment_plan, assigned_doctor_id)
        VALUES (@hospitalId, @patientId, @caseType, @status, @priority, @chiefComplaint, @diagnosis, @treatmentPlan, @userId)
      `);
    console.log('✅ Created case 1');
    
    await pool.request()
      .input('hospitalId', sql.NVarChar, hospitalId)
      .input('patientId', sql.NVarChar, patient2Id)
      .input('caseType', sql.NVarChar, 'chronic-disease')
      .input('status', sql.NVarChar, 'analyzing')
      .input('priority', sql.NVarChar, 'medium')
      .input('chiefComplaint', sql.NVarChar, 'Fatigue and chest discomfort')
      .input('diagnosis', sql.NVarChar, 'CAD post stent')
      .input('treatmentPlan', sql.NVarChar, 'Stress test ordered')
      .input('userId', sql.NVarChar, userId)
      .query(`
        INSERT INTO clinical_cases (hospital_id, patient_id, case_type, status, priority, chief_complaint, diagnosis, treatment_plan, assigned_doctor_id)
        VALUES (@hospitalId, @patientId, @caseType, @status, @priority, @chiefComplaint, @diagnosis, @treatmentPlan, @userId)
      `);
    console.log('✅ Created case 2');
    
    if (patient3Id) {
      await pool.request()
        .input('hospitalId', sql.NVarChar, hospitalId)
        .input('patientId', sql.NVarChar, patient3Id)
        .input('caseType', sql.NVarChar, 'follow-up')
        .input('status', sql.NVarChar, 'pending')
        .input('priority', sql.NVarChar, 'low')
        .input('chiefComplaint', sql.NVarChar, 'Diabetes follow-up')
        .input('diagnosis', sql.NVarChar, 'Type 2 Diabetes')
        .input('treatmentPlan', sql.NVarChar, 'Lifestyle + medication review')
        .input('userId', sql.NVarChar, userId)
        .query(`
          INSERT INTO clinical_cases (hospital_id, patient_id, case_type, status, priority, chief_complaint, diagnosis, treatment_plan, assigned_doctor_id)
          VALUES (@hospitalId, @patientId, @caseType, @status, @priority, @chiefComplaint, @diagnosis, @treatmentPlan, @userId)
        `);
      console.log('✅ Created case 3');
    }
  }
  
  // 10. Final verification
  const finalCases = await pool.request().query('SELECT COUNT(*) as count FROM clinical_cases');
  const finalPatients = await pool.request().query('SELECT COUNT(*) as count FROM patients');
  const finalLabs = await pool.request().query('SELECT COUNT(*) as count FROM lab_reports');
  
  console.log('\n🎉 Database Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Patients: ${finalPatients.recordset[0].count}`);
  console.log(`   Cases: ${finalCases.recordset[0].count}`);
  console.log(`   Lab Reports: ${finalLabs.recordset[0].count}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await pool.close();
}

fixAndSeed().catch(console.error);
