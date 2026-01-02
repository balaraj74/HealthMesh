-- MedicationSafetyAnalysis table for caching AI analysis results
-- Run this migration on your Azure SQL database

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MedicationSafetyAnalysis')
BEGIN
    CREATE TABLE MedicationSafetyAnalysis (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        patient_id UNIQUEIDENTIFIER NOT NULL,
        hospital_id UNIQUEIDENTIFIER NULL,
        overall_status NVARCHAR(20) NOT NULL,
        alert_count INT NOT NULL DEFAULT 0,
        high_severity_count INT NOT NULL DEFAULT 0,
        medication_fingerprint NVARCHAR(1000) NULL,
        analysis_json NVARCHAR(MAX) NOT NULL,
        ai_model NVARCHAR(50) NULL,
        confidence FLOAT NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        
        INDEX IX_MedicationSafety_Patient (patient_id),
        INDEX IX_MedicationSafety_Hospital (hospital_id),
        INDEX IX_MedicationSafety_Created (created_at DESC)
    );

    PRINT 'Created MedicationSafetyAnalysis table';
END
ELSE
BEGIN
    PRINT 'MedicationSafetyAnalysis table already exists';
END
GO
