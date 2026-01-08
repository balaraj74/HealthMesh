import sql from 'mssql';

async function seedData() {
  const config = {
    server: 'healthmesh.database.windows.net',
    port: 1433,
    database: 'free-sql-db-8620205',
    user: 'healthmesh',
    password: 'Balaraj6361',
    options: { encrypt: true, trustServerCertificate: false }
  };
  
  const pool = await sql.connect(config);
  console.log('✅ Connected to Azure SQL');
  
  const pesTenantId = 'e290fb02-d184-4a8c-ae49-c83b04485909';
  
  // Get hospital ID
  const hospitalResult = await pool.request()
    .input('tenantId', sql.NVarChar, pesTenantId)
    .query('SELECT id FROM hospitals WHERE tenant_id = @tenantId');
  
  if (hospitalResult.recordset.length === 0) {
    console.error('❌ Hospital not found for tenant');
    await pool.close();
    return;
  }
  
  const hospitalId = hospitalResult.recordset[0].id;
  console.log('📍 Hospital ID:', hospitalId);
  
  // Check if data already exists
  const existingPatients = await pool.request()
    .input('hospitalId', sql.NVarChar, hospitalId)
    .query('SELECT COUNT(*) as count FROM patients WHERE hospital_id = @hospitalId');
  
  if (existingPatients.recordset[0].count > 0) {
    console.log('⚠️ Data already seeded, skipping...');
    await pool.close();
    return;
  }
  
  // Create test user
  const userResult = await pool.request()
    .input('hospitalId', sql.NVarChar, hospitalId)
    .input('entraOid', sql.NVarChar, 'test-oid-pes-001')
    .input('tenantId', sql.NVarChar, pesTenantId)
    .input('email', sql.NVarChar, 'PES1UG24CS560@stu.pes.edu')
    .input('name', sql.NVarChar, 'Dr. Balaraj')
    .input('role', sql.NVarChar, 'doctor')
    .query(`
      INSERT INTO users (hospital_id, entra_oid, tenant_id, email, name, role)
      OUTPUT INSERTED.id
      VALUES (@hospitalId, @entraOid, @tenantId, @email, @name, @role)
    `);
  const userId = userResult.recordset[0].id;
  console.log('✅ Created user:', userId);
  
  // Create Patient 1 - Sarah Johnson (Breast Cancer)
  const patient1Result = await pool.request()
    .input('hospitalId', sql.NVarChar, hospitalId)
    .input('firstName', sql.NVarChar, 'Sarah')
    .input('lastName', sql.NVarChar, 'Johnson')
    .input('dob', sql.NVarChar, '1965-03-15')
    .input('gender', sql.NVarChar, 'female')
    .input('mrn', sql.NVarChar, 'MRN001')
    .input('demographics', sql.NVarChar, JSON.stringify({ address: '123 Main St, Boston, MA', phone: '555-0101' }))
    .input('diagnoses', sql.NVarChar, JSON.stringify([{ code: 'C50.9', description: 'Breast cancer', stage: 'IIA' }]))
    .input('medications', sql.NVarChar, JSON.stringify([{ name: 'Metformin', dose: '1000mg', frequency: 'twice daily' }]))
    .input('allergies', sql.NVarChar, JSON.stringify([{ allergen: 'Penicillin', severity: 'severe', reaction: 'anaphylaxis' }]))
    .input('userId', sql.NVarChar, userId)
    .query(`
      INSERT INTO patients (hospital_id, first_name, last_name, date_of_birth, gender, mrn, demographics, diagnoses, medications, allergies, created_by_user_id)
      OUTPUT INSERTED.id
      VALUES (@hospitalId, @firstName, @lastName, @dob, @gender, @mrn, @demographics, @diagnoses, @medications, @allergies, @userId)
    `);
  const patient1Id = patient1Result.recordset[0].id;
  console.log('✅ Created patient: Sarah Johnson');
  
  // Create Patient 2 - Michael Chen (CAD)
  const patient2Result = await pool.request()
    .input('hospitalId', sql.NVarChar, hospitalId)
    .input('firstName', sql.NVarChar, 'Michael')
    .input('lastName', sql.NVarChar, 'Chen')
    .input('dob', sql.NVarChar, '1958-07-22')
    .input('gender', sql.NVarChar, 'male')
    .input('mrn', sql.NVarChar, 'MRN002')
    .input('demographics', sql.NVarChar, JSON.stringify({ address: '456 Oak Ave, Cambridge, MA', phone: '555-0102' }))
    .input('diagnoses', sql.NVarChar, JSON.stringify([{ code: 'I25.10', description: 'Coronary artery disease' }]))
    .input('medications', sql.NVarChar, JSON.stringify([{ name: 'Aspirin', dose: '81mg', frequency: 'daily' }, { name: 'Metoprolol', dose: '50mg', frequency: 'twice daily' }]))
    .input('allergies', sql.NVarChar, JSON.stringify([]))
    .input('userId', sql.NVarChar, userId)
    .query(`
      INSERT INTO patients (hospital_id, first_name, last_name, date_of_birth, gender, mrn, demographics, diagnoses, medications, allergies, created_by_user_id)
      OUTPUT INSERTED.id
      VALUES (@hospitalId, @firstName, @lastName, @dob, @gender, @mrn, @demographics, @diagnoses, @medications, @allergies, @userId)
    `);
  const patient2Id = patient2Result.recordset[0].id;
  console.log('✅ Created patient: Michael Chen');
  
  // Create Patient 3 - Emily Rodriguez (Diabetes)
  const patient3Result = await pool.request()
    .input('hospitalId', sql.NVarChar, hospitalId)
    .input('firstName', sql.NVarChar, 'Emily')
    .input('lastName', sql.NVarChar, 'Rodriguez')
    .input('dob', sql.NVarChar, '1972-11-08')
    .input('gender', sql.NVarChar, 'female')
    .input('mrn', sql.NVarChar, 'MRN003')
    .input('demographics', sql.NVarChar, JSON.stringify({ address: '789 Elm St, Somerville, MA', phone: '555-0103' }))
    .input('diagnoses', sql.NVarChar, JSON.stringify([{ code: 'E11.9', description: 'Type 2 Diabetes Mellitus' }]))
    .input('medications', sql.NVarChar, JSON.stringify([{ name: 'Metformin', dose: '500mg', frequency: 'twice daily' }, { name: 'Lisinopril', dose: '10mg', frequency: 'daily' }]))
    .input('allergies', sql.NVarChar, JSON.stringify([{ allergen: 'Sulfa drugs', severity: 'moderate', reaction: 'rash' }]))
    .input('userId', sql.NVarChar, userId)
    .query(`
      INSERT INTO patients (hospital_id, first_name, last_name, date_of_birth, gender, mrn, demographics, diagnoses, medications, allergies, created_by_user_id)
      OUTPUT INSERTED.id
      VALUES (@hospitalId, @firstName, @lastName, @dob, @gender, @mrn, @demographics, @diagnoses, @medications, @allergies, @userId)
    `);
  const patient3Id = patient3Result.recordset[0].id;
  console.log('✅ Created patient: Emily Rodriguez');
  
  // Create Case 1 - Tumor Board for Sarah
  const case1Result = await pool.request()
    .input('hospitalId', sql.NVarChar, hospitalId)
    .input('patientId', sql.NVarChar, patient1Id)
    .input('doctorId', sql.NVarChar, userId)
    .input('caseType', sql.NVarChar, 'tumor-board')
    .input('status', sql.NVarChar, 'review-ready')
    .input('priority', sql.NVarChar, 'high')
    .input('chiefComplaint', sql.NVarChar, 'Optimal adjuvant therapy for Stage IIA ER+/PR+/HER2- breast cancer with comorbid diabetes?')
    .input('diagnosis', sql.NVarChar, 'Stage IIA breast cancer, ER+/PR+/HER2-')
    .input('treatmentPlan', sql.NVarChar, 'Considering chemotherapy + endocrine therapy. Need to evaluate cardiac function and diabetes management.')
    .query(`
      INSERT INTO cases (hospital_id, patient_id, assigned_doctor_id, case_type, status, priority, chief_complaint, diagnosis, treatment_plan)
      OUTPUT INSERTED.id
      VALUES (@hospitalId, @patientId, @doctorId, @caseType, @status, @priority, @chiefComplaint, @diagnosis, @treatmentPlan)
    `);
  const case1Id = case1Result.recordset[0].id;
  console.log('✅ Created case: Tumor Board Review');
  
  // Create Case 2 - Chronic Disease for Michael
  const case2Result = await pool.request()
    .input('hospitalId', sql.NVarChar, hospitalId)
    .input('patientId', sql.NVarChar, patient2Id)
    .input('doctorId', sql.NVarChar, userId)
    .input('caseType', sql.NVarChar, 'chronic-disease')
    .input('status', sql.NVarChar, 'analyzing')
    .input('priority', sql.NVarChar, 'medium')
    .input('chiefComplaint', sql.NVarChar, 'Increased fatigue and chest discomfort on exertion')
    .input('diagnosis', sql.NVarChar, 'CAD status post stent placement, new symptoms')
    .input('treatmentPlan', sql.NVarChar, 'Cardiac stress test ordered, medication review pending')
    .query(`
      INSERT INTO cases (hospital_id, patient_id, assigned_doctor_id, case_type, status, priority, chief_complaint, diagnosis, treatment_plan)
      OUTPUT INSERTED.id
      VALUES (@hospitalId, @patientId, @doctorId, @caseType, @status, @priority, @chiefComplaint, @diagnosis, @treatmentPlan)
    `);
  const case2Id = case2Result.recordset[0].id;
  console.log('✅ Created case: Chronic Disease Management');
  
  // Create Case 3 - Follow-up for Emily
  const case3Result = await pool.request()
    .input('hospitalId', sql.NVarChar, hospitalId)
    .input('patientId', sql.NVarChar, patient3Id)
    .input('doctorId', sql.NVarChar, userId)
    .input('caseType', sql.NVarChar, 'follow-up')
    .input('status', sql.NVarChar, 'pending')
    .input('priority', sql.NVarChar, 'low')
    .input('chiefComplaint', sql.NVarChar, 'Routine diabetes follow-up, elevated HbA1c on last visit')
    .input('diagnosis', sql.NVarChar, 'Type 2 Diabetes - suboptimal control')
    .input('treatmentPlan', sql.NVarChar, 'Lifestyle counseling, consider medication adjustment')
    .query(`
      INSERT INTO cases (hospital_id, patient_id, assigned_doctor_id, case_type, status, priority, chief_complaint, diagnosis, treatment_plan)
      OUTPUT INSERTED.id
      VALUES (@hospitalId, @patientId, @doctorId, @caseType, @status, @priority, @chiefComplaint, @diagnosis, @treatmentPlan)
    `);
  const case3Id = case3Result.recordset[0].id;
  console.log('✅ Created case: Diabetes Follow-up');
  
  // Create Lab Reports
  await pool.request()
    .input('hospitalId', sql.NVarChar, hospitalId)
    .input('patientId', sql.NVarChar, patient1Id)
    .input('caseId', sql.NVarChar, case1Id)
    .input('reportType', sql.NVarChar, 'pathology')
    .input('testName', sql.NVarChar, 'Oncotype DX')
    .input('results', sql.NVarChar, JSON.stringify({ recurrenceScore: 18, riskCategory: 'intermediate', recommendation: 'Consider adjuvant chemotherapy' }))
    .input('status', sql.NVarChar, 'completed')
    .input('userId', sql.NVarChar, userId)
    .query(`
      INSERT INTO lab_reports (hospital_id, patient_id, case_id, report_type, test_name, test_date, results, status, ordered_by_user_id)
      VALUES (@hospitalId, @patientId, @caseId, @reportType, @testName, GETUTCDATE(), @results, @status, @userId)
    `);
  console.log('✅ Created lab report: Oncotype DX');
  
  await pool.request()
    .input('hospitalId', sql.NVarChar, hospitalId)
    .input('patientId', sql.NVarChar, patient1Id)
    .input('caseId', sql.NVarChar, case1Id)
    .input('reportType', sql.NVarChar, 'laboratory')
    .input('testName', sql.NVarChar, 'HbA1c')
    .input('results', sql.NVarChar, JSON.stringify({ value: 7.2, unit: '%', referenceRange: '4.0-5.6%', interpretation: 'Elevated - diabetes not well controlled' }))
    .input('status', sql.NVarChar, 'completed')
    .input('userId', sql.NVarChar, userId)
    .query(`
      INSERT INTO lab_reports (hospital_id, patient_id, case_id, report_type, test_name, test_date, results, status, ordered_by_user_id)
      VALUES (@hospitalId, @patientId, @caseId, @reportType, @testName, GETUTCDATE(), @results, @status, @userId)
    `);
  console.log('✅ Created lab report: HbA1c');
  
  await pool.request()
    .input('hospitalId', sql.NVarChar, hospitalId)
    .input('patientId', sql.NVarChar, patient2Id)
    .input('caseId', sql.NVarChar, case2Id)
    .input('reportType', sql.NVarChar, 'laboratory')
    .input('testName', sql.NVarChar, 'Lipid Panel')
    .input('results', sql.NVarChar, JSON.stringify({ totalCholesterol: 210, ldl: 130, hdl: 42, triglycerides: 180, interpretation: 'LDL elevated, HDL low' }))
    .input('status', sql.NVarChar, 'completed')
    .input('userId', sql.NVarChar, userId)
    .query(`
      INSERT INTO lab_reports (hospital_id, patient_id, case_id, report_type, test_name, test_date, results, status, ordered_by_user_id)
      VALUES (@hospitalId, @patientId, @caseId, @reportType, @testName, GETUTCDATE(), @results, @status, @userId)
    `);
  console.log('✅ Created lab report: Lipid Panel');
  
  await pool.request()
    .input('hospitalId', sql.NVarChar, hospitalId)
    .input('patientId', sql.NVarChar, patient3Id)
    .input('caseId', sql.NVarChar, case3Id)
    .input('reportType', sql.NVarChar, 'laboratory')
    .input('testName', sql.NVarChar, 'Comprehensive Metabolic Panel')
    .input('results', sql.NVarChar, JSON.stringify({ glucose: 156, creatinine: 1.1, bun: 22, sodium: 140, potassium: 4.2, interpretation: 'Fasting glucose elevated' }))
    .input('status', sql.NVarChar, 'completed')
    .input('userId', sql.NVarChar, userId)
    .query(`
      INSERT INTO lab_reports (hospital_id, patient_id, case_id, report_type, test_name, test_date, results, status, ordered_by_user_id)
      VALUES (@hospitalId, @patientId, @caseId, @reportType, @testName, GETUTCDATE(), @results, @status, @userId)
    `);
  console.log('✅ Created lab report: CMP');
  
  // Summary
  console.log('\n🎉 Database seeded successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Created:');
  console.log('   • 1 User (Dr. Balaraj)');
  console.log('   • 3 Patients');
  console.log('   • 3 Clinical Cases');
  console.log('   • 4 Lab Reports');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  await pool.close();
}

seedData().catch(console.error);
