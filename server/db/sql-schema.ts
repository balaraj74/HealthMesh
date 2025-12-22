/**
 * HealthMesh - Azure SQL Database Schema
 * Creates tables for patients, cases, and related entities
 */

import { azureSQL } from './sql-client';

export async function initializeSchema(): Promise<void> {
  console.log('📋 Creating Azure SQL Database schema...');

  try {
    // Create Patients table
    await azureSQL.execute(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'patients')
      BEGIN
        CREATE TABLE patients (
          id NVARCHAR(50) PRIMARY KEY,
          mrn NVARCHAR(50) UNIQUE NOT NULL,
          first_name NVARCHAR(100) NOT NULL,
          last_name NVARCHAR(100) NOT NULL,
          date_of_birth DATE NOT NULL,
          gender NVARCHAR(20),
          contact_phone NVARCHAR(20),
          contact_email NVARCHAR(100),
          address NVARCHAR(500),
          demographics NVARCHAR(MAX), -- JSON
          diagnoses NVARCHAR(MAX), -- JSON array
          medications NVARCHAR(MAX), -- JSON array
          allergies NVARCHAR(MAX), -- JSON array
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE()
        );
        CREATE INDEX idx_patients_mrn ON patients(mrn);
        CREATE INDEX idx_patients_name ON patients(last_name, first_name);
      END
    `);
    console.log('✅ Patients table created');

    // Create Cases table
    await azureSQL.execute(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'cases')
      BEGIN
        CREATE TABLE cases (
          id NVARCHAR(50) PRIMARY KEY,
          patient_id NVARCHAR(50) NOT NULL,
          case_type NVARCHAR(50) NOT NULL,
          status NVARCHAR(50) NOT NULL,
          clinical_question NVARCHAR(MAX),
          summary NVARCHAR(MAX),
          agent_outputs NVARCHAR(MAX), -- JSON array
          recommendations NVARCHAR(MAX), -- JSON array
          risk_alerts NVARCHAR(MAX), -- JSON array
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE(),
          FOREIGN KEY (patient_id) REFERENCES patients(id)
        );
        CREATE INDEX idx_cases_patient ON cases(patient_id);
        CREATE INDEX idx_cases_status ON cases(status);
        CREATE INDEX idx_cases_type ON cases(case_type);
      END
    `);
    console.log('✅ Cases table created');

    // Create Lab Reports table
    await azureSQL.execute(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'lab_reports')
      BEGIN
        CREATE TABLE lab_reports (
          id NVARCHAR(50) PRIMARY KEY,
          case_id NVARCHAR(50) NOT NULL,
          report_type NVARCHAR(100),
          report_date DATE,
          file_url NVARCHAR(500),
          extracted_data NVARCHAR(MAX), -- JSON
          status NVARCHAR(50),
          created_at DATETIME2 DEFAULT GETDATE(),
          FOREIGN KEY (case_id) REFERENCES cases(id)
        );
        CREATE INDEX idx_lab_reports_case ON lab_reports(case_id);
      END
    `);
    console.log('✅ Lab Reports table created');

    // Create Audit Logs table
    await azureSQL.execute(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'audit_logs')
      BEGIN
        CREATE TABLE audit_logs (
          id NVARCHAR(50) PRIMARY KEY,
          user_id NVARCHAR(50),
          action NVARCHAR(100) NOT NULL,
          entity_type NVARCHAR(50),
          entity_id NVARCHAR(50),
          details NVARCHAR(MAX), -- JSON
          timestamp DATETIME2 DEFAULT GETDATE()
        );
        CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
        CREATE INDEX idx_audit_user ON audit_logs(user_id);
        CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
      END
    `);
    console.log('✅ Audit Logs table created');

    // Create Chat Messages table
    await azureSQL.execute(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'chat_messages')
      BEGIN
        CREATE TABLE chat_messages (
          id NVARCHAR(50) PRIMARY KEY,
          case_id NVARCHAR(50) NOT NULL,
          role NVARCHAR(20) NOT NULL,
          content NVARCHAR(MAX) NOT NULL,
          timestamp DATETIME2 DEFAULT GETDATE(),
          FOREIGN KEY (case_id) REFERENCES cases(id)
        );
        CREATE INDEX idx_chat_case ON chat_messages(case_id);
        CREATE INDEX idx_chat_timestamp ON chat_messages(timestamp);
      END
    `);
    console.log('✅ Chat Messages table created');

    // Create Users table
    await azureSQL.execute(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
      BEGIN
        CREATE TABLE users (
          id INT IDENTITY(1,1) PRIMARY KEY,
          email NVARCHAR(255) UNIQUE NOT NULL,
          password_hash NVARCHAR(255),
          name NVARCHAR(200),
          role NVARCHAR(50) DEFAULT 'user',
          created_at DATETIME2 DEFAULT GETDATE(),
          updated_at DATETIME2 DEFAULT GETDATE()
        );
        CREATE INDEX idx_users_email ON users(email);
      END
    `);
    console.log('✅ Users table created');

    console.log('🎉 Database schema initialized successfully!');
  } catch (error) {
    console.error('❌ Schema initialization failed:', error);
    throw error;
  }
}

export async function seedDemoData(): Promise<void> {
  console.log('🌱 Seeding demo data...');

  try {
    // Check if data already exists
    const existingPatients = await azureSQL.query('SELECT COUNT(*) as count FROM patients');
    if (existingPatients[0].count > 0) {
      console.log('ℹ️  Demo data already exists, skipping seed');
      return;
    }

    // Insert demo patient 1
    await azureSQL.execute(`
      INSERT INTO patients (
        id, mrn, first_name, last_name, date_of_birth, gender,
        contact_phone, contact_email, address,
        demographics, diagnoses, medications, allergies
      ) VALUES (
        @id, @mrn, @firstName, @lastName, @dob, @gender,
        @phone, @email, @address,
        @demographics, @diagnoses, @medications, @allergies
      )
    `, {
      id: 'patient-001',
      mrn: 'MRN-2024-001',
      firstName: 'Sarah',
      lastName: 'Johnson',
      dob: '1965-03-15',
      gender: 'female',
      phone: '(555) 234-5678',
      email: 'sarah.johnson@email.com',
      address: '123 Medical Center Drive, Boston, MA 02115',
      demographics: JSON.stringify({
        firstName: 'Sarah',
        lastName: 'Johnson',
        dateOfBirth: '1965-03-15',
        gender: 'female',
        mrn: 'MRN-2024-001'
      }),
      diagnoses: JSON.stringify([
        {
          id: 'diag-001',
          code: 'C50.911',
          display: 'Breast Cancer - Stage IIA',
          status: 'active'
        },
        {
          id: 'diag-002',
          code: 'E11.9',
          display: 'Type 2 Diabetes Mellitus',
          status: 'active'
        }
      ]),
      medications: JSON.stringify([
        { name: 'Tamoxifen 20mg', frequency: 'Once daily' },
        { name: 'Metformin 500mg', frequency: 'Twice daily' }
      ]),
      allergies: JSON.stringify(['Penicillin (rash)', 'Sulfa drugs (anaphylaxis)'])
    });

    console.log('✅ Demo patient created');

    // Insert demo case
    await azureSQL.execute(`
      INSERT INTO cases (
        id, patient_id, case_type, status, clinical_question, summary,
        agent_outputs, recommendations, risk_alerts
      ) VALUES (
        @id, @patientId, @caseType, @status, @question, @summary,
        @agentOutputs, @recommendations, @riskAlerts
      )
    `, {
      id: 'case-001',
      patientId: 'patient-001',
      caseType: 'tumor-board',
      status: 'review-ready',
      question: 'What is the optimal adjuvant therapy regimen for this Stage IIA breast cancer patient?',
      summary: '58-year-old female with Stage IIA breast cancer',
      agentOutputs: JSON.stringify([
        {
          agentType: 'patient-context',
          status: 'completed',
          summary: 'Patient demographics and medical history retrieved',
          confidence: 95
        }
      ]),
      recommendations: JSON.stringify([
        {
          id: 'rec-001',
          title: 'Consider adjuvant chemotherapy',
          content: 'Based on intermediate Oncotype score',
          confidence: 85
        }
      ]),
      riskAlerts: JSON.stringify([
        {
          id: 'alert-001',
          type: 'allergy',
          severity: 'critical',
          title: 'Severe Penicillin Allergy'
        }
      ])
    });

    console.log('✅ Demo case created');
    console.log('🎉 Demo data seeded successfully!');
  } catch (error) {
    console.error('❌ Data seeding failed:', error);
    throw error;
  }
}
