-- Create QR Tables for HealthMesh
-- Run this in Azure SQL Query Editor

-- Patient QR Codes Table
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'patient_qr_codes')
BEGIN
    CREATE TABLE patient_qr_codes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        patient_id NVARCHAR(100) NOT NULL,
        hospital_id NVARCHAR(100) NOT NULL,
        fhir_patient_id NVARCHAR(255) NOT NULL,
        master_patient_identifier NVARCHAR(255) NOT NULL,
        qr_token NVARCHAR(1000) NOT NULL,
        qr_token_hash NVARCHAR(255) NOT NULL,
        qr_image_url NVARCHAR(1000),
        token_issued_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        token_expires_at DATETIME2,
        is_active BIT NOT NULL DEFAULT 1,
        revocation_reason NVARCHAR(500),
        revoked_at DATETIME2,
        revoked_by_user_id NVARCHAR(100),
        created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        created_by_user_id NVARCHAR(100) NOT NULL,
        updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );
    PRINT 'Created patient_qr_codes table';
END
GO

-- QR Scan Audit Table
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'qr_scan_audit')
BEGIN
    CREATE TABLE qr_scan_audit (
        id INT IDENTITY(1,1) PRIMARY KEY,
        qr_code_id INT NOT NULL,
        patient_id NVARCHAR(100) NOT NULL,
        hospital_id NVARCHAR(100) NOT NULL,
        scanned_by_user_id NVARCHAR(100) NOT NULL,
        scanned_by_role NVARCHAR(100),
        scan_timestamp DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        access_purpose NVARCHAR(500),
        access_granted BIT NOT NULL,
        denial_reason NVARCHAR(500),
        ip_address NVARCHAR(100),
        user_agent NVARCHAR(500),
        device_type NVARCHAR(100),
        location_data NVARCHAR(500),
        session_id NVARCHAR(255),
        request_id NVARCHAR(255),
        data_views NVARCHAR(MAX),
        export_performed BIT DEFAULT 0,
        print_performed BIT DEFAULT 0
    );
    PRINT 'Created qr_scan_audit table';
END
GO

-- Create indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_QR_PatientId')
BEGIN
    CREATE INDEX IX_QR_PatientId ON patient_qr_codes(patient_id);
    PRINT 'Created IX_QR_PatientId index';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_QR_TokenHash')
BEGIN
    CREATE INDEX IX_QR_TokenHash ON patient_qr_codes(qr_token_hash);
    PRINT 'Created IX_QR_TokenHash index';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ScanAudit_PatientId')
BEGIN
    CREATE INDEX IX_ScanAudit_PatientId ON qr_scan_audit(patient_id);
    PRINT 'Created IX_ScanAudit_PatientId index';
END
GO

PRINT 'QR Tables setup complete!';
