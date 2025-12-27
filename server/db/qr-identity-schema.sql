-- =====================================================
-- HealthMesh Patient QR Identity System
-- FHIR R4 Compliant Schema
-- =====================================================

-- Patient QR Codes Table
-- Stores immutable QR code tokens linked to Patient Master ID
CREATE TABLE patient_qr_codes (
    id BIGINT PRIMARY KEY IDENTITY(1,1),
    patient_id BIGINT NOT NULL,
    hospital_id BIGINT NOT NULL,
    
    -- FHIR R4 Identifiers
    fhir_patient_id NVARCHAR(255) NOT NULL UNIQUE, -- FHIR Patient.id (immutable)
    master_patient_identifier NVARCHAR(255) NOT NULL UNIQUE, -- MPI system identifier
    
    -- QR Code Data (encrypted token, no PHI)
    qr_token NVARCHAR(500) NOT NULL UNIQUE, -- Encrypted secure token
    qr_token_hash NVARCHAR(255) NOT NULL UNIQUE, -- SHA-256 hash for lookup
    qr_image_url NVARCHAR(1000), -- URL to QR code image in blob storage
    
    -- Security & Expiry
    token_issued_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    token_expires_at DATETIME2, -- NULL = never expires
    is_active BIT NOT NULL DEFAULT 1,
    revocation_reason NVARCHAR(500),
    revoked_at DATETIME2,
    revoked_by_user_id BIGINT,
    
    -- Audit
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    created_by_user_id BIGINT NOT NULL,
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    -- Constraints
    CONSTRAINT FK_PatientQR_Patient FOREIGN KEY (patient_id) 
        REFERENCES patients(id) ON DELETE CASCADE,
    CONSTRAINT FK_PatientQR_Hospital FOREIGN KEY (hospital_id) 
        REFERENCES hospitals(id) ON DELETE CASCADE,
    CONSTRAINT FK_PatientQR_CreatedBy FOREIGN KEY (created_by_user_id) 
        REFERENCES users(id),
    CONSTRAINT FK_PatientQR_RevokedBy FOREIGN KEY (revoked_by_user_id) 
        REFERENCES users(id),
    
    -- Indexes
    INDEX IX_PatientQR_PatientId (patient_id),
    INDEX IX_PatientQR_TokenHash (qr_token_hash),
    INDEX IX_PatientQR_FHIRPatientId (fhir_patient_id),
    INDEX IX_PatientQR_MPI (master_patient_identifier),
    INDEX IX_PatientQR_HospitalActive (hospital_id, is_active)
);

-- QR Scan Audit Log
-- Complete traceability for HIPAA compliance
CREATE TABLE qr_scan_audit (
    id BIGINT PRIMARY KEY IDENTITY(1,1),
    qr_code_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    hospital_id BIGINT NOT NULL,
    
    -- Scan Details
    scanned_by_user_id BIGINT NOT NULL,
    scanned_by_role NVARCHAR(100), -- doctor, nurse, admin
    scan_timestamp DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    -- Access Context
    access_purpose NVARCHAR(500), -- clinical_care, emergency, administrative
    access_granted BIT NOT NULL, -- TRUE if RBAC checks passed
    denial_reason NVARCHAR(500), -- If access denied
    
    -- Security Tracking
    ip_address NVARCHAR(100),
    user_agent NVARCHAR(500),
    device_type NVARCHAR(100), -- web, mobile, tablet
    location_data NVARCHAR(500), -- Optional: facility/department
    
    -- Session Tracking
    session_id NVARCHAR(255),
    request_id NVARCHAR(255), -- Correlation ID for debugging
    
    -- Data Accessed
    data_views NVARCHAR(MAX), -- JSON array of accessed sections
    export_performed BIT DEFAULT 0,
    print_performed BIT DEFAULT 0,
    
    -- Constraints
    CONSTRAINT FK_QRScan_QRCode FOREIGN KEY (qr_code_id) 
        REFERENCES patient_qr_codes(id),
    CONSTRAINT FK_QRScan_Patient FOREIGN KEY (patient_id) 
        REFERENCES patients(id),
    CONSTRAINT FK_QRScan_Hospital FOREIGN KEY (hospital_id) 
        REFERENCES hospitals(id),
    CONSTRAINT FK_QRScan_User FOREIGN KEY (scanned_by_user_id) 
        REFERENCES users(id),
    
    -- Indexes
    INDEX IX_QRScan_Timestamp (scan_timestamp DESC),
    INDEX IX_QRScan_Patient (patient_id, scan_timestamp DESC),
    INDEX IX_QRScan_User (scanned_by_user_id, scan_timestamp DESC),
    INDEX IX_QRScan_Hospital (hospital_id, scan_timestamp DESC),
    INDEX IX_QRScan_AccessGranted (access_granted, scan_timestamp DESC)
);

-- Medications Table (FHIR MedicationRequest)
CREATE TABLE patient_medications (
    id BIGINT PRIMARY KEY IDENTITY(1,1),
    patient_id BIGINT NOT NULL,
    case_id BIGINT, -- Optional link to clinical case
    hospital_id BIGINT NOT NULL,
    
    -- FHIR MedicationRequest fields
    fhir_medication_id NVARCHAR(255) UNIQUE,
    medication_name NVARCHAR(500) NOT NULL,
    medication_code NVARCHAR(100), -- RxNorm/SNOMED code
    dosage NVARCHAR(255),
    route NVARCHAR(100), -- oral, IV, topical, etc.
    frequency NVARCHAR(255),
    
    -- Prescription Details
    prescribed_by_user_id BIGINT NOT NULL,
    prescription_date DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    start_date DATETIME2,
    end_date DATETIME2,
    
    -- Status
    status NVARCHAR(50) NOT NULL DEFAULT 'active', -- active, completed, stopped, cancelled
    stop_reason NVARCHAR(500),
    
    -- Clinical Context
    indication NVARCHAR(1000), -- Reason for prescription
    notes NVARCHAR(MAX),
    
    -- Audit
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_Medication_Patient FOREIGN KEY (patient_id) 
        REFERENCES patients(id) ON DELETE CASCADE,
    CONSTRAINT FK_Medication_Case FOREIGN KEY (case_id) 
        REFERENCES clinical_cases(id),
    CONSTRAINT FK_Medication_Hospital FOREIGN KEY (hospital_id) 
        REFERENCES hospitals(id),
    CONSTRAINT FK_Medication_Prescriber FOREIGN KEY (prescribed_by_user_id) 
        REFERENCES users(id),
    
    INDEX IX_Medication_Patient (patient_id, status),
    INDEX IX_Medication_Case (case_id),
    INDEX IX_Medication_Status (status, prescription_date DESC)
);

-- Lab Results Table (FHIR Observation)
CREATE TABLE lab_results (
    id BIGINT PRIMARY KEY IDENTITY(1,1),
    patient_id BIGINT NOT NULL,
    case_id BIGINT,
    hospital_id BIGINT NOT NULL,
    
    -- FHIR Observation fields
    fhir_observation_id NVARCHAR(255) UNIQUE,
    test_name NVARCHAR(500) NOT NULL,
    test_code NVARCHAR(100), -- LOINC code
    category NVARCHAR(100), -- laboratory, vital-signs, imaging, etc.
    
    -- Results
    value NVARCHAR(500),
    unit NVARCHAR(100),
    reference_range NVARCHAR(255),
    interpretation NVARCHAR(100), -- normal, abnormal, critical
    
    -- Status & Timing
    status NVARCHAR(50) NOT NULL DEFAULT 'final', -- preliminary, final, amended
    observed_datetime DATETIME2 NOT NULL,
    reported_datetime DATETIME2,
    
    -- Clinical Context
    ordered_by_user_id BIGINT,
    performer NVARCHAR(255), -- Lab/facility name
    notes NVARCHAR(MAX),
    
    -- Audit
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_LabResult_Patient FOREIGN KEY (patient_id) 
        REFERENCES patients(id) ON DELETE CASCADE,
    CONSTRAINT FK_LabResult_Case FOREIGN KEY (case_id) 
        REFERENCES clinical_cases(id),
    CONSTRAINT FK_LabResult_Hospital FOREIGN KEY (hospital_id) 
        REFERENCES hospitals(id),
    CONSTRAINT FK_LabResult_OrderedBy FOREIGN KEY (ordered_by_user_id) 
        REFERENCES users(id),
    
    INDEX IX_LabResult_Patient (patient_id, observed_datetime DESC),
    INDEX IX_LabResult_Case (case_id),
    INDEX IX_LabResult_Category (category, observed_datetime DESC)
);

-- Allergies & Alerts Table
CREATE TABLE patient_allergies (
    id BIGINT PRIMARY KEY IDENTITY(1,1),
    patient_id BIGINT NOT NULL,
    hospital_id BIGINT NOT NULL,
    
    -- Allergy Details
    allergen NVARCHAR(500) NOT NULL,
    allergen_code NVARCHAR(100), -- SNOMED/RxNorm code
    category NVARCHAR(100), -- medication, food, environmental, etc.
    severity NVARCHAR(50) NOT NULL, -- mild, moderate, severe, life-threatening
    
    -- Reaction Details
    reaction NVARCHAR(1000), -- Symptoms experienced
    onset_date DATETIME2,
    
    -- Status
    status NVARCHAR(50) NOT NULL DEFAULT 'active', -- active, resolved, refuted
    verified BIT DEFAULT 0,
    verified_by_user_id BIGINT,
    verified_at DATETIME2,
    
    -- Audit
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    created_by_user_id BIGINT NOT NULL,
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_Allergy_Patient FOREIGN KEY (patient_id) 
        REFERENCES patients(id) ON DELETE CASCADE,
    CONSTRAINT FK_Allergy_Hospital FOREIGN KEY (hospital_id) 
        REFERENCES hospitals(id),
    CONSTRAINT FK_Allergy_CreatedBy FOREIGN KEY (created_by_user_id) 
        REFERENCES users(id),
    CONSTRAINT FK_Allergy_VerifiedBy FOREIGN KEY (verified_by_user_id) 
        REFERENCES users(id),
    
    INDEX IX_Allergy_Patient (patient_id, status),
    INDEX IX_Allergy_Severity (severity, status)
);

-- Chronic Conditions Table (FHIR Condition)
CREATE TABLE patient_conditions (
    id BIGINT PRIMARY KEY IDENTITY(1,1),
    patient_id BIGINT NOT NULL,
    hospital_id BIGINT NOT NULL,
    
    -- FHIR Condition fields
    fhir_condition_id NVARCHAR(255) UNIQUE,
    condition_name NVARCHAR(500) NOT NULL,
    condition_code NVARCHAR(100), -- ICD-10/SNOMED code
    category NVARCHAR(100), -- problem-list-item, encounter-diagnosis
    
    -- Clinical Status
    clinical_status NVARCHAR(50) NOT NULL, -- active, inactive, resolved
    verification_status NVARCHAR(50), -- confirmed, provisional, differential
    severity NVARCHAR(50), -- mild, moderate, severe
    
    -- Timing
    onset_date DATETIME2,
    abatement_date DATETIME2, -- When condition resolved
    recorded_date DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    -- Context
    diagnosed_by_user_id BIGINT,
    notes NVARCHAR(MAX),
    
    -- Audit
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_Condition_Patient FOREIGN KEY (patient_id) 
        REFERENCES patients(id) ON DELETE CASCADE,
    CONSTRAINT FK_Condition_Hospital FOREIGN KEY (hospital_id) 
        REFERENCES hospitals(id),
    CONSTRAINT FK_Condition_DiagnosedBy FOREIGN KEY (diagnosed_by_user_id) 
        REFERENCES users(id),
    
    INDEX IX_Condition_Patient (patient_id, clinical_status),
    INDEX IX_Condition_Status (clinical_status, recorded_date DESC)
);

-- AI Clinical Insights Table
CREATE TABLE ai_clinical_insights (
    id BIGINT PRIMARY KEY IDENTITY(1,1),
    patient_id BIGINT NOT NULL,
    hospital_id BIGINT NOT NULL,
    
    -- Insight Details
    insight_type NVARCHAR(100) NOT NULL, -- risk_score, trend_analysis, recommendation
    insight_category NVARCHAR(100), -- diagnosis, medication, preventive_care
    
    -- Content
    title NVARCHAR(500) NOT NULL,
    summary NVARCHAR(MAX) NOT NULL,
    detailed_analysis NVARCHAR(MAX),
    confidence_score DECIMAL(5,2), -- 0-100
    
    -- Risk Scoring
    risk_level NVARCHAR(50), -- low, medium, high, critical
    risk_score DECIMAL(5,2), -- 0-100
    risk_factors NVARCHAR(MAX), -- JSON array
    
    -- Recommendations
    recommendations NVARCHAR(MAX), -- JSON array
    actionable_items NVARCHAR(MAX), -- JSON array
    
    -- Context
    generated_by_model NVARCHAR(100), -- gemini-1.5-flash, gpt-4o
    data_sources NVARCHAR(MAX), -- JSON: which data was analyzed
    generated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    -- Review Status
    reviewed BIT DEFAULT 0,
    reviewed_by_user_id BIGINT,
    reviewed_at DATETIME2,
    clinician_notes NVARCHAR(MAX),
    
    -- Visibility
    is_active BIT DEFAULT 1,
    dismissed BIT DEFAULT 0,
    dismissed_reason NVARCHAR(500),
    
    -- Audit
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_AIInsight_Patient FOREIGN KEY (patient_id) 
        REFERENCES patients(id) ON DELETE CASCADE,
    CONSTRAINT FK_AIInsight_Hospital FOREIGN KEY (hospital_id) 
        REFERENCES hospitals(id),
    CONSTRAINT FK_AIInsight_ReviewedBy FOREIGN KEY (reviewed_by_user_id) 
        REFERENCES users(id),
    
    INDEX IX_AIInsight_Patient (patient_id, generated_at DESC),
    INDEX IX_AIInsight_RiskLevel (risk_level, is_active),
    INDEX IX_AIInsight_Type (insight_type, generated_at DESC)
);

-- Add FHIR fields to existing patients table (migration)
-- This would be executed as an ALTER TABLE statement
/*
ALTER TABLE patients ADD fhir_patient_id NVARCHAR(255) UNIQUE;
ALTER TABLE patients ADD master_patient_identifier NVARCHAR(255) UNIQUE;
ALTER TABLE patients ADD identifier_system NVARCHAR(255); -- e.g., "urn:oid:1.2.840.114350"
*/

-- Grant appropriate permissions (adjust based on your SQL user)
-- GRANT SELECT, INSERT, UPDATE ON patient_qr_codes TO healthmesh_app_user;
-- GRANT SELECT, INSERT ON qr_scan_audit TO healthmesh_app_user;
