-- Add audit_logs table to Azure SQL Database
-- Run this manually in Azure SQL Query Editor

CREATE TABLE audit_logs (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    hospital_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER,
    entra_oid NVARCHAR(255),
    
    -- Event Details
    event_type NVARCHAR(100) NOT NULL, -- 'patient-created', 'data-accessed', 'case-updated'
    resource_type NVARCHAR(100), -- 'patient', 'case', 'lab_report'
    resource_id NVARCHAR(255),
    action NVARCHAR(100),
    
    -- Context
    details NVARCHAR(MAX), -- JSON: additional context
    ip_address NVARCHAR(50),
    user_agent NVARCHAR(500),
    
    -- Timestamp
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE INDEX idx_audit_logs_hospital_id ON audit_logs(hospital_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entra_oid ON audit_logs(entra_oid);

PRINT 'audit_logs table created successfully!';
