-- HealthMesh Azure SQL Database Schema
-- Multi-tenant healthcare platform with Microsoft Entra ID authentication

-- Hospitals Table (One per Entra tenant)
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

-- Users Table (Auto-provisioned from Entra ID)
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

-- Patients Table
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

-- Clinical Cases Table
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

-- Seed initial hospital and test data
INSERT INTO hospitals (id, tenant_id, name, domain)
VALUES (
    NEWID(),
    '0ba0de08-9840-495b-9ba1-a219de9356b8',
    'General Hospital',
    'healthmesh.onmicrosoft.com'
);

PRINT 'Schema created successfully!';
