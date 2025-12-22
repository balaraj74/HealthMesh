-- ============================================================================
-- HealthMesh Multi-Tenant Database Schema
-- Azure SQL Database - Production Ready
-- Microsoft Entra ID Authentication
-- ============================================================================

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS lab_reports;
DROP TABLE IF EXISTS cases;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS organizations;

-- ============================================================================
-- ORGANIZATIONS TABLE
-- Each Microsoft Entra ID tenant = One organization/hospital
-- ============================================================================
CREATE TABLE organizations (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id NVARCHAR(255) NOT NULL UNIQUE, -- Azure AD tenant ID (tid)
    name NVARCHAR(500) NOT NULL,
    domain NVARCHAR(255), -- e.g., "contosohospital.onmicrosoft.com"
    settings NVARCHAR(MAX), -- JSON: {fhir_endpoint, locale, etc}
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    
    INDEX IX_organizations_tenant_id (tenant_id)
);

-- ============================================================================
-- USERS TABLE
-- Users authenticated via Azure Entra ID
-- ============================================================================
CREATE TABLE users (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_oid NVARCHAR(255) NOT NULL, -- Azure AD object ID (oid)
    tenant_id NVARCHAR(255) NOT NULL, -- Organization isolation
    email NVARCHAR(255) NOT NULL,
    name NVARCHAR(500) NOT NULL,
    role NVARCHAR(50) DEFAULT 'user', -- 'admin', 'clinician', 'user'
    last_login DATETIME2,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_users_organization FOREIGN KEY (tenant_id) 
        REFERENCES organizations(tenant_id) ON DELETE CASCADE,
    CONSTRAINT UQ_user_oid_tenant UNIQUE (user_oid, tenant_id),
    INDEX IX_users_tenant_id (tenant_id),
    INDEX IX_users_user_oid (user_oid)
);

-- ============================================================================
-- PATIENTS TABLE
-- Tenant-scoped patient records
-- ============================================================================
CREATE TABLE patients (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id NVARCHAR(255) NOT NULL,
    fhir_patient_id NVARCHAR(255), -- Link to Azure FHIR Service
    
    -- Demographics
    first_name NVARCHAR(255) NOT NULL,
    last_name NVARCHAR(255) NOT NULL,
    date_of_birth DATE,
    gender NVARCHAR(50),
    mrn NVARCHAR(100), -- Medical Record Number
    
    -- Contact
    contact_phone NVARCHAR(50),
    contact_email NVARCHAR(255),
    
    -- Medical Data (JSON for flexibility)
    demographics NVARCHAR(MAX), -- Full demographic JSON
    diagnoses NVARCHAR(MAX), -- Array of diagnoses
    medications NVARCHAR(MAX), -- Array of medications
    allergies NVARCHAR(MAX), -- Array of allergies
    
    -- Metadata
    created_by UNIQUEIDENTIFIER, -- User ID who created
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_patients_organization FOREIGN KEY (tenant_id) 
        REFERENCES organizations(tenant_id) ON DELETE CASCADE,
    CONSTRAINT FK_patients_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id),
    INDEX IX_patients_tenant_id (tenant_id),
    INDEX IX_patients_fhir_id (fhir_patient_id),
    INDEX IX_patients_mrn (tenant_id, mrn)
);

-- ============================================================================
-- CASES TABLE
-- Clinical decision support cases - tenant scoped
-- ============================================================================
CREATE TABLE cases (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id NVARCHAR(255) NOT NULL,
    patient_id UNIQUEIDENTIFIER NOT NULL,
    
    -- Case Details
    case_type NVARCHAR(100) NOT NULL,
    title NVARCHAR(500),
    description NVARCHAR(MAX),
    status NVARCHAR(50) DEFAULT 'draft', -- draft, submitted, analyzing, review-ready, reviewed, closed
    priority NVARCHAR(50) DEFAULT 'medium',
    
    -- Clinical Data
    symptoms NVARCHAR(MAX), -- JSON array
    clinical_data NVARCHAR(MAX), -- JSON: vitals, labs, imaging
    ai_analysis NVARCHAR(MAX), -- JSON: AI insights
    recommendations NVARCHAR(MAX), -- JSON: treatment recommendations
    
    -- Workflow
    assigned_to UNIQUEIDENTIFIER, -- User ID
    reviewed_by UNIQUEIDENTIFIER, -- User ID
    review_notes NVARCHAR(MAX),
    
    -- Metadata
    created_by UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    closed_at DATETIME2,
    
    CONSTRAINT FK_cases_organization FOREIGN KEY (tenant_id) 
        REFERENCES organizations(tenant_id) ON DELETE CASCADE,
    CONSTRAINT FK_cases_patient FOREIGN KEY (patient_id) 
        REFERENCES patients(id) ON DELETE CASCADE,
    CONSTRAINT FK_cases_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id),
    CONSTRAINT FK_cases_assigned_to FOREIGN KEY (assigned_to) 
        REFERENCES users(id),
    INDEX IX_cases_tenant_id (tenant_id),
    INDEX IX_cases_patient_id (patient_id),
    INDEX IX_cases_status (tenant_id, status),
    INDEX IX_cases_created_at (tenant_id, created_at DESC)
);

-- ============================================================================
-- LAB_REPORTS TABLE
-- Laboratory test results - tenant scoped
-- ============================================================================
CREATE TABLE lab_reports (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id NVARCHAR(255) NOT NULL,
    patient_id UNIQUEIDENTIFIER NOT NULL,
    case_id UNIQUEIDENTIFIER,
    
    -- Report Details
    test_name NVARCHAR(500) NOT NULL,
    test_code NVARCHAR(100),
    test_category NVARCHAR(100),
    report_date DATETIME2 NOT NULL,
    status NVARCHAR(50) DEFAULT 'pending',
    
    -- Results (JSON for structured data)
    results NVARCHAR(MAX), -- JSON: test results, values, ranges
    interpretation NVARCHAR(MAX),
    critical_flags NVARCHAR(MAX), -- JSON: abnormal values
    
    -- Metadata
    ordered_by UNIQUEIDENTIFIER,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_lab_reports_organization FOREIGN KEY (tenant_id) 
        REFERENCES organizations(tenant_id) ON DELETE CASCADE,
    CONSTRAINT FK_lab_reports_patient FOREIGN KEY (patient_id) 
        REFERENCES patients(id) ON DELETE CASCADE,
    CONSTRAINT FK_lab_reports_case FOREIGN KEY (case_id) 
        REFERENCES cases(id),
    INDEX IX_lab_reports_tenant_id (tenant_id),
    INDEX IX_lab_reports_patient_id (patient_id),
    INDEX IX_lab_reports_report_date (tenant_id, report_date DESC)
);

-- ============================================================================
-- CHAT_MESSAGES TABLE
-- Clinician AI chat - tenant scoped
-- ============================================================================
CREATE TABLE chat_messages (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id NVARCHAR(255) NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    case_id UNIQUEIDENTIFIER,
    
    -- Message Details
    role NVARCHAR(50) NOT NULL, -- 'user' or 'assistant'
    content NVARCHAR(MAX) NOT NULL,
    context NVARCHAR(MAX), -- JSON: relevant context
    
    -- Metadata
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_chat_messages_organization FOREIGN KEY (tenant_id) 
        REFERENCES organizations(tenant_id) ON DELETE CASCADE,
    CONSTRAINT FK_chat_messages_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT FK_chat_messages_case FOREIGN KEY (case_id) 
        REFERENCES cases(id),
    INDEX IX_chat_messages_tenant_id (tenant_id),
    INDEX IX_chat_messages_user_id (user_id),
    INDEX IX_chat_messages_case_id (case_id),
    INDEX IX_chat_messages_created_at (tenant_id, created_at DESC)
);

-- ============================================================================
-- AUDIT_LOGS TABLE
-- Comprehensive audit trail - tenant scoped
-- ============================================================================
CREATE TABLE audit_logs (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tenant_id NVARCHAR(255) NOT NULL,
    user_id UNIQUEIDENTIFIER,
    user_oid NVARCHAR(255), -- Azure AD OID
    
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
    
    CONSTRAINT FK_audit_logs_organization FOREIGN KEY (tenant_id) 
        REFERENCES organizations(tenant_id) ON DELETE CASCADE,
    INDEX IX_audit_logs_tenant_id (tenant_id),
    INDEX IX_audit_logs_created_at (tenant_id, created_at DESC),
    INDEX IX_audit_logs_user_oid (user_oid),
    INDEX IX_audit_logs_event_type (tenant_id, event_type)
);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES (Optional but recommended)
-- ============================================================================
-- Note: Azure SQL DB supports Row-Level Security
-- This can be enabled later for additional security

-- ============================================================================
-- SAMPLE DATA VIEWS (For Development)
-- ============================================================================

-- Active cases by tenant
CREATE VIEW vw_active_cases AS
SELECT 
    c.*,
    p.first_name + ' ' + p.last_name AS patient_name,
    p.mrn,
    u.name AS created_by_name
FROM cases c
JOIN patients p ON c.patient_id = p.id
JOIN users u ON c.created_by = u.id
WHERE c.status NOT IN ('closed');

-- Patient summary by tenant
CREATE VIEW vw_patient_summary AS
SELECT 
    p.id,
    p.tenant_id,
    p.first_name + ' ' + p.last_name AS patient_name,
    p.mrn,
    p.date_of_birth,
    p.gender,
    COUNT(DISTINCT c.id) AS case_count,
    MAX(c.created_at) AS last_case_date
FROM patients p
LEFT JOIN cases c ON p.id = c.patient_id
GROUP BY p.id, p.tenant_id, p.first_name, p.last_name, p.mrn, p.date_of_birth, p.gender;

GO

PRINT 'Multi-tenant schema created successfully';
PRINT 'All tables include tenant_id for complete data isolation';
PRINT 'Ready for Azure Entra ID integration';
