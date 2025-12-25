import sql from 'mssql';

const config: sql.config = {
  server: 'healthmeshdevsql23qydhgf.database.windows.net',
  database: 'healthmesh',
  user: 'healthmeshadmin',
  password: 'HealthMesh@2025!',
  options: {
    encrypt: true,
    trustServerCertificate: false,
    connectTimeout: 30000,
    requestTimeout: 30000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

async function initializeDatabase() {
  console.log('🔵 Connecting to Azure SQL Database...');
  console.log(`Server: ${config.server}`);
  console.log(`Database: ${config.database}\n`);

  try {
    const pool = await sql.connect(config);
    console.log('✅ Connected successfully!\n');

    // Create hospitals table
    console.log('Creating hospitals table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'hospitals')
      BEGIN
        CREATE TABLE hospitals (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          tenant_id NVARCHAR(255) NOT NULL UNIQUE,
          name NVARCHAR(500) NOT NULL,
          domain NVARCHAR(500),
          settings NVARCHAR(MAX),
          created_at DATETIME2 DEFAULT GETUTCDATE(),
          updated_at DATETIME2 DEFAULT GETUTCDATE()
        );
        CREATE INDEX idx_hospitals_tenant_id ON hospitals(tenant_id);
        PRINT '✅ Hospitals table created';
      END
      ELSE
        PRINT 'ℹ️  Hospitals table already exists';
    `);

    // Create users table
    console.log('Creating users table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
      BEGIN
        CREATE TABLE users (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          entra_oid NVARCHAR(255) NOT NULL,
          tenant_id NVARCHAR(255) NOT NULL,
          hospital_id UNIQUEIDENTIFIER NOT NULL,
          email NVARCHAR(500) NOT NULL,
          name NVARCHAR(500) NOT NULL,
          role NVARCHAR(50) DEFAULT 'doctor',
          department NVARCHAR(200),
          last_login DATETIME2,
          created_at DATETIME2 DEFAULT GETUTCDATE(),
          updated_at DATETIME2 DEFAULT GETUTCDATE(),
          FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
          CONSTRAINT uq_entra_oid_tenant UNIQUE(entra_oid, tenant_id)
        );
        CREATE INDEX idx_users_hospital_id ON users(hospital_id);
        CREATE INDEX idx_users_entra_oid ON users(entra_oid);
        PRINT '✅ Users table created';
      END
      ELSE
        PRINT 'ℹ️  Users table already exists';
    `);

    // Create patients table
    console.log('Creating patients table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'patients')
      BEGIN
        CREATE TABLE patients (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          hospital_id UNIQUEIDENTIFIER NOT NULL,
          fhir_patient_id NVARCHAR(255),
          first_name NVARCHAR(200) NOT NULL,
          last_name NVARCHAR(200) NOT NULL,
          date_of_birth DATE,
          gender NVARCHAR(50),
          mrn NVARCHAR(200),
          contact_phone NVARCHAR(50),
          contact_email NVARCHAR(500),
          demographics NVARCHAR(MAX),
          diagnoses NVARCHAR(MAX),
          medications NVARCHAR(MAX),
          allergies NVARCHAR(MAX),
          created_by_user_id UNIQUEIDENTIFIER NOT NULL,
          created_at DATETIME2 DEFAULT GETUTCDATE(),
          updated_at DATETIME2 DEFAULT GETUTCDATE(),
          FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
          FOREIGN KEY (created_by_user_id) REFERENCES users(id)
        );
        CREATE INDEX idx_patients_hospital_id ON patients(hospital_id);
        CREATE INDEX idx_patients_mrn ON patients(mrn);
        PRINT '✅ Patients table created';
      END
      ELSE
        PRINT 'ℹ️  Patients table already exists';
    `);

    // Create clinical_cases table
    console.log('Creating clinical_cases table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'clinical_cases')
      BEGIN
        CREATE TABLE clinical_cases (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          hospital_id UNIQUEIDENTIFIER NOT NULL,
          patient_id UNIQUEIDENTIFIER NOT NULL,
          assigned_doctor_id UNIQUEIDENTIFIER NOT NULL,
          case_type NVARCHAR(100) NOT NULL,
          status NVARCHAR(50) DEFAULT 'active',
          priority NVARCHAR(50) DEFAULT 'medium',
          chief_complaint NVARCHAR(MAX),
          diagnosis NVARCHAR(MAX),
          treatment_plan NVARCHAR(MAX),
          agents_data NVARCHAR(MAX),
          created_at DATETIME2 DEFAULT GETUTCDATE(),
          updated_at DATETIME2 DEFAULT GETUTCDATE(),
          FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
          FOREIGN KEY (patient_id) REFERENCES patients(id),
          FOREIGN KEY (assigned_doctor_id) REFERENCES users(id)
        );
        CREATE INDEX idx_cases_hospital_id ON clinical_cases(hospital_id);
        CREATE INDEX idx_cases_patient_id ON clinical_cases(patient_id);
        CREATE INDEX idx_cases_status ON clinical_cases(status);
        PRINT '✅ Clinical cases table created';
      END
      ELSE
        PRINT 'ℹ️  Clinical cases table already exists';
    `);

    // Create lab_reports table
    console.log('Creating lab_reports table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'lab_reports')
      BEGIN
        CREATE TABLE lab_reports (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          hospital_id UNIQUEIDENTIFIER NOT NULL,
          patient_id UNIQUEIDENTIFIER NOT NULL,
          case_id UNIQUEIDENTIFIER,
          report_type NVARCHAR(100) NOT NULL,
          test_name NVARCHAR(500) NOT NULL,
          test_date DATETIME2 NOT NULL,
          results NVARCHAR(MAX),
          status NVARCHAR(50) DEFAULT 'pending',
          ordered_by_user_id UNIQUEIDENTIFIER NOT NULL,
          created_at DATETIME2 DEFAULT GETUTCDATE(),
          updated_at DATETIME2 DEFAULT GETUTCDATE(),
          FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
          FOREIGN KEY (patient_id) REFERENCES patients(id),
          FOREIGN KEY (case_id) REFERENCES clinical_cases(id),
          FOREIGN KEY (ordered_by_user_id) REFERENCES users(id)
        );
        CREATE INDEX idx_lab_reports_hospital_id ON lab_reports(hospital_id);
        CREATE INDEX idx_lab_reports_patient_id ON lab_reports(patient_id);
        PRINT '✅ Lab reports table created';
      END
      ELSE
        PRINT 'ℹ️  Lab reports table already exists';
    `);

    // Create risk_alerts table
    console.log('Creating risk_alerts table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'risk_alerts')
      BEGIN
        CREATE TABLE risk_alerts (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          hospital_id UNIQUEIDENTIFIER NOT NULL,
          patient_id UNIQUEIDENTIFIER NOT NULL,
          case_id UNIQUEIDENTIFIER,
          alert_type NVARCHAR(100) NOT NULL,
          severity NVARCHAR(50) NOT NULL,
          description NVARCHAR(MAX),
          status NVARCHAR(50) DEFAULT 'active',
          created_at DATETIME2 DEFAULT GETUTCDATE(),
          resolved_at DATETIME2,
          FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
          FOREIGN KEY (patient_id) REFERENCES patients(id),
          FOREIGN KEY (case_id) REFERENCES clinical_cases(id)
        );
        CREATE INDEX idx_risk_alerts_hospital_id ON risk_alerts(hospital_id);
        CREATE INDEX idx_risk_alerts_patient_id ON risk_alerts(patient_id);
        CREATE INDEX idx_risk_alerts_status ON risk_alerts(status);
        PRINT '✅ Risk alerts table created';
      END
      ELSE
        PRINT 'ℹ️  Risk alerts table already exists';
    `);

    // Seed initial hospital
    console.log('\nSeeding initial data...');
    const hospitalResult = await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM hospitals WHERE tenant_id = '0ba0de08-9840-495b-9ba1-a219de9356b8')
      BEGIN
        INSERT INTO hospitals (tenant_id, name, domain)
        VALUES ('0ba0de08-9840-495b-9ba1-a219de9356b8', 'General Hospital', 'healthmesh.onmicrosoft.com');
        SELECT CAST(SCOPE_IDENTITY() AS NVARCHAR(50)) as id;
        PRINT '✅ Initial hospital created';
      END
      ELSE
        PRINT 'ℹ️  Hospital already exists';
    `);

    console.log('\n✅ Database initialization complete!');
    console.log('\n📊 Database Status:');
    
    const tables = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    
    console.log('Tables created:');
    tables.recordset.forEach((row: any) => {
      console.log(`  - ${row.TABLE_NAME}`);
    });

    await pool.close();
    console.log('\n✅ Connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

initializeDatabase();
