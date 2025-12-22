
import sql from 'mssql';
import { getAzureConfig } from './azure/config';

export async function initializeSQLDatabase() {
    console.log('Initializing Azure SQL Database schema...');

    const config = getAzureConfig();

    // Ensure we have config
    if (!config.sql.server || !config.sql.user) {
        console.log('Azure SQL configuration missing, skipping initialization.');
        return;
    }

    const sqlConfig = {
        user: config.sql.user,
        password: config.sql.password,
        database: config.sql.database,
        server: config.sql.server,
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
        },
        options: config.sql.options
    };

    try {
        const pool = await sql.connect(sqlConfig);

        // Create Patients Table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Patients' and xtype='U')
      CREATE TABLE Patients (
        id NVARCHAR(50) PRIMARY KEY,
        mrn NVARCHAR(50) NOT NULL,
        firstName NVARCHAR(100),
        lastName NVARCHAR(100),
        dateOfBirth DATE,
        gender NVARCHAR(20),
        data NVARCHAR(MAX), -- Store full JSON for flexibility
        createdAt DATETIME2 DEFAULT GETDATE(),
        updatedAt DATETIME2 DEFAULT GETDATE()
      )
    `);
        console.log('✓ Patients table verified');

        // Create Cases Table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Cases' and xtype='U')
      CREATE TABLE Cases (
        id NVARCHAR(50) PRIMARY KEY,
        patientId NVARCHAR(50) NOT NULL, -- FK to Patients.id logically
        caseType NVARCHAR(50),
        status NVARCHAR(50),
        clinicalQuestion NVARCHAR(MAX),
        recommendations NVARCHAR(MAX), -- JSON
        riskAlerts NVARCHAR(MAX), -- JSON
        createdAt DATETIME2 DEFAULT GETDATE(),
        updatedAt DATETIME2 DEFAULT GETDATE(),
        INDEX IX_Cases_PatientId (patientId)
      )
    `);
        console.log('✓ Cases table verified');

        // Create AgentResults Table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AgentResults' and xtype='U')
      CREATE TABLE AgentResults (
        id NVARCHAR(50) PRIMARY KEY,
        caseId NVARCHAR(50) NOT NULL,
        agentType NVARCHAR(50),
        status NVARCHAR(50),
        confidence FLOAT,
        summary NVARCHAR(MAX),
        data NVARCHAR(MAX), -- Full JSON output
        startedAt DATETIME2,
        completedAt DATETIME2,
        createdAt DATETIME2 DEFAULT GETDATE(),
        INDEX IX_AgentResults_CaseId (caseId)
      )
    `);
        console.log('✓ AgentResults table verified');

        // Create LabReports Table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LabReports' and xtype='U')
      CREATE TABLE LabReports (
        id NVARCHAR(50) PRIMARY KEY,
        caseId NVARCHAR(50) NOT NULL,
        fileName NVARCHAR(255),
        fileType NVARCHAR(50),
        status NVARCHAR(50),
        extractedData NVARCHAR(MAX), -- JSON
        rawText NVARCHAR(MAX),
        uploadedAt DATETIME2 DEFAULT GETDATE(),
        INDEX IX_LabReports_CaseId (caseId)
      )
    `);
        console.log('✓ LabReports table verified');

        // Create ChatMessages Table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ChatMessages' and xtype='U')
      CREATE TABLE ChatMessages (
        id NVARCHAR(50) PRIMARY KEY,
        caseId NVARCHAR(50) NOT NULL,
        role NVARCHAR(20),
        content NVARCHAR(MAX),
        agentType NVARCHAR(50),
        timestamp DATETIME2 DEFAULT GETDATE(),
        INDEX IX_ChatMessages_CaseId (caseId)
      )
    `);
        console.log('✓ ChatMessages table verified');

        // Create AuditLogs Table
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AuditLogs' and xtype='U')
      CREATE TABLE AuditLogs (
        id NVARCHAR(50) PRIMARY KEY,
        entityType NVARCHAR(50),
        entityId NVARCHAR(50),
        action NVARCHAR(50),
        userId NVARCHAR(50),
        details NVARCHAR(MAX), -- JSON
        timestamp DATETIME2 DEFAULT GETDATE(),
        INDEX IX_AuditLogs_EntityId (entityId),
        INDEX IX_AuditLogs_Timestamp (timestamp)
      )
    `);
        console.log('✓ AuditLogs table verified');

        console.log('✓ SQL Database initialization complete');
        await pool.close();

    } catch (err) {
        console.error('Error initializing SQL database:', err);
        throw err;
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    initializeSQLDatabase().catch(console.error);
}
