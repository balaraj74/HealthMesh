# 📊 HealthMesh - SQL & FHIR Schema Design

> **Version:** 1.0  
> **Last Updated:** January 2026  
> **Database:** Azure SQL Database  
> **FHIR Version:** R4 (4.0.1)  
> **Purpose:** Multi-tenant clinical data storage with FHIR R4 compliance

---

## 📋 Table of Contents

1. [Schema Overview](#schema-overview)
2. [Multi-Tenancy Architecture](#multi-tenancy-architecture)
3. [Core Tables](#core-tables)
4. [Clinical Tables](#clinical-tables)
5. [Agent Output Tables](#agent-output-tables)
6. [Audit & Compliance Tables](#audit--compliance-tables)
7. [FHIR Resource Mappings](#fhir-resource-mappings)
8. [Indexes & Performance](#indexes--performance)
9. [Sample Queries](#sample-queries)

---

## Schema Overview

### Entity Relationship Diagram (Simplified)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│  hospitals  │────<│    users    │     │  audit_logs     │
└─────────────┘     └─────────────┘     └─────────────────┘
       │                   │                     ▲
       │                   │                     │
       ▼                   ▼                     │
┌─────────────┐     ┌─────────────┐     ┌───────┴─────────┐
│  patients   │────<│clinical_cases│    │ All tables have │
└─────────────┘     └─────────────┘     │ audit tracking  │
       │                   │            └─────────────────┘
       │                   │
       ▼                   ▼
┌─────────────┐     ┌─────────────────┐
│ diagnoses   │     │  agent_outputs  │
│ medications │     │  recommendations│
│ allergies   │     │  risk_alerts    │
│ lab_results │     │  chat_messages  │
└─────────────┘     └─────────────────┘
```

### Database Naming Conventions

| Convention | Example |
|------------|---------|
| Tables | `snake_case`, plural | `patients`, `clinical_cases` |
| Columns | `snake_case` | `first_name`, `date_of_birth` |
| Primary Keys | `id` (UUID) | `id` |
| Foreign Keys | `{table}_id` | `patient_id`, `hospital_id` |
| Timestamps | `{action}_at` | `created_at`, `updated_at` |
| Booleans | `is_{state}` | `is_active`, `is_deleted` |
| Enums | `{field}_type` | `case_type`, `alert_type` |

---

## Multi-Tenancy Architecture

### Row-Level Security Model

All tenant-scoped tables include `hospital_id` for complete data isolation.

```sql
-- Enable Row-Level Security
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Create security policy
CREATE POLICY patient_hospital_isolation ON patients
    USING (hospital_id = current_setting('app.current_hospital_id')::uuid);
```

### Tenant Identification Flow

```
1. User authenticates via Microsoft Entra ID
2. JWT contains tenant_id claim (Azure AD tenant)
3. Backend maps tenant_id → hospital_id
4. All queries automatically scoped by hospital_id
```

---

## Core Tables

### hospitals

Multi-tenant hospital/organization registry.

```sql
CREATE TABLE hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    organization_type VARCHAR(50) DEFAULT 'hospital',
    -- Options: 'hospital', 'clinic', 'health_system', 'research_center'
    
    -- External Identifiers
    azure_tenant_id VARCHAR(255) UNIQUE,  -- Microsoft Entra tenant
    fhir_organization_id VARCHAR(255),     -- FHIR Organization resource ID
    npi VARCHAR(20),                       -- National Provider Identifier
    
    -- Contact
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    phone VARCHAR(50),
    email VARCHAR(255),
    
    -- Settings
    settings JSONB DEFAULT '{}',
    -- Example: {"theme": "light", "timezone": "Asia/Kolkata", "default_language": "en"}
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    subscription_tier VARCHAR(50) DEFAULT 'standard',
    -- Options: 'trial', 'standard', 'enterprise'
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT hospitals_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- Indexes
CREATE INDEX idx_hospitals_azure_tenant ON hospitals(azure_tenant_id);
CREATE INDEX idx_hospitals_active ON hospitals(is_active) WHERE is_active = true;
```

### users

User accounts linked to Microsoft Entra ID.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Hospital Association
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    
    -- Identity
    email VARCHAR(255) NOT NULL,
    username VARCHAR(100),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(255),
    
    -- Azure AD Integration
    azure_ad_object_id VARCHAR(255) UNIQUE,  -- Azure AD user object ID
    azure_ad_upn VARCHAR(255),               -- User Principal Name
    
    -- Professional Info
    role VARCHAR(50) NOT NULL DEFAULT 'doctor',
    -- Options: 'admin', 'doctor', 'nurse', 'pharmacist', 'lab_tech', 'viewer'
    specialty VARCHAR(100),
    license_number VARCHAR(100),
    npi VARCHAR(20),
    
    -- Preferences
    preferences JSONB DEFAULT '{}',
    -- Example: {"notifications": true, "dark_mode": false}
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_role_valid CHECK (role IN ('admin', 'doctor', 'nurse', 'pharmacist', 'lab_tech', 'viewer')),
    UNIQUE(hospital_id, email)
);

-- Indexes
CREATE INDEX idx_users_hospital ON users(hospital_id);
CREATE INDEX idx_users_azure_ad ON users(azure_ad_object_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(hospital_id, role);
```

---

## Clinical Tables

### patients

Patient demographics and identifiers.

```sql
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Hospital Association (Multi-tenancy)
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    
    -- External Identifiers
    mrn VARCHAR(100) NOT NULL,                -- Medical Record Number
    fhir_patient_id VARCHAR(255),             -- FHIR Patient resource ID
    qr_token VARCHAR(500) UNIQUE,             -- Encrypted QR token for patient access
    qr_token_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Demographics (FHIR Patient compliant)
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    -- Options: 'male', 'female', 'other', 'unknown' (FHIR AdministrativeGender)
    
    -- Contact Information
    phone VARCHAR(50),
    email VARCHAR(255),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    
    -- Emergency Contact
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(50),
    emergency_contact_relationship VARCHAR(50),
    
    -- Insurance
    insurance_provider VARCHAR(255),
    insurance_policy_number VARCHAR(100),
    
    -- Clinical Identifiers
    blood_type VARCHAR(10),
    -- Options: 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'
    
    -- Medical History (Free text summary)
    medical_history TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_deceased BOOLEAN DEFAULT false,
    deceased_at TIMESTAMP WITH TIME ZONE,
    
    -- AI Summary Cache
    ai_summary JSONB,
    ai_summary_updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT patients_mrn_not_empty CHECK (LENGTH(TRIM(mrn)) > 0),
    CONSTRAINT patients_gender_valid CHECK (gender IN ('male', 'female', 'other', 'unknown')),
    UNIQUE(hospital_id, mrn)
);

-- Indexes
CREATE INDEX idx_patients_hospital ON patients(hospital_id);
CREATE INDEX idx_patients_mrn ON patients(hospital_id, mrn);
CREATE INDEX idx_patients_name ON patients(hospital_id, last_name, first_name);
CREATE INDEX idx_patients_dob ON patients(hospital_id, date_of_birth);
CREATE INDEX idx_patients_qr_token ON patients(qr_token) WHERE qr_token IS NOT NULL;
CREATE INDEX idx_patients_fhir ON patients(fhir_patient_id) WHERE fhir_patient_id IS NOT NULL;
```

### diagnoses

Patient conditions/diagnoses (FHIR Condition resource mapping).

```sql
CREATE TABLE diagnoses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Associations
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    clinical_case_id UUID REFERENCES clinical_cases(id) ON DELETE SET NULL,
    
    -- FHIR Identifiers
    fhir_condition_id VARCHAR(255),
    
    -- Coding (FHIR CodeableConcept)
    code VARCHAR(50) NOT NULL,              -- ICD-10, SNOMED code
    code_system VARCHAR(100) NOT NULL,      -- 'ICD-10', 'SNOMED-CT', 'ICD-9'
    display VARCHAR(500) NOT NULL,          -- Human-readable name
    
    -- Clinical Details
    category VARCHAR(50) DEFAULT 'encounter-diagnosis',
    -- Options: 'problem-list-item', 'encounter-diagnosis', 'health-concern'
    
    clinical_status VARCHAR(50) NOT NULL DEFAULT 'active',
    -- Options: 'active', 'recurrence', 'relapse', 'inactive', 'remission', 'resolved'
    
    verification_status VARCHAR(50) DEFAULT 'confirmed',
    -- Options: 'unconfirmed', 'provisional', 'differential', 'confirmed', 'refuted', 'entered-in-error'
    
    severity VARCHAR(20),
    -- Options: 'mild', 'moderate', 'severe'
    
    -- Timing
    onset_date DATE,
    abatement_date DATE,
    recorded_date DATE DEFAULT CURRENT_DATE,
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT diagnoses_status_valid CHECK (
        clinical_status IN ('active', 'recurrence', 'relapse', 'inactive', 'remission', 'resolved')
    )
);

-- Indexes
CREATE INDEX idx_diagnoses_patient ON diagnoses(patient_id);
CREATE INDEX idx_diagnoses_hospital ON diagnoses(hospital_id);
CREATE INDEX idx_diagnoses_code ON diagnoses(code_system, code);
CREATE INDEX idx_diagnoses_status ON diagnoses(patient_id, clinical_status);
CREATE INDEX idx_diagnoses_active ON diagnoses(patient_id) WHERE clinical_status = 'active';
```

### medications

Patient medication list (FHIR MedicationStatement mapping).

```sql
CREATE TABLE medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Associations
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    clinical_case_id UUID REFERENCES clinical_cases(id) ON DELETE SET NULL,
    
    -- FHIR Identifiers
    fhir_medication_statement_id VARCHAR(255),
    
    -- Medication Details
    name VARCHAR(255) NOT NULL,             -- Drug name
    generic_name VARCHAR(255),
    brand_name VARCHAR(255),
    
    -- RxNorm/NDC Coding
    rxcui VARCHAR(50),                      -- RxNorm Concept Unique Identifier
    ndc VARCHAR(50),                        -- National Drug Code
    
    -- Dosage
    dosage VARCHAR(100),                    -- e.g., "500mg"
    dosage_value DECIMAL(10,3),             -- Numeric value
    dosage_unit VARCHAR(20),                -- e.g., "mg", "ml"
    
    -- Administration
    route VARCHAR(50),                      -- 'oral', 'IV', 'topical', etc.
    frequency VARCHAR(100),                 -- e.g., "twice daily", "every 8 hours"
    instructions TEXT,
    
    -- Timing
    start_date DATE,
    end_date DATE,
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    -- Options: 'active', 'completed', 'entered-in-error', 'intended', 'stopped', 'on-hold', 'unknown', 'not-taken'
    
    reason_for_use VARCHAR(500),
    reason_stopped VARCHAR(500),
    
    -- Prescriber
    prescribed_by UUID REFERENCES users(id),
    prescribed_date DATE,
    
    -- Pharmacy
    pharmacy_name VARCHAR(255),
    refills_remaining INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT medications_status_valid CHECK (
        status IN ('active', 'completed', 'entered-in-error', 'intended', 'stopped', 'on-hold', 'unknown', 'not-taken')
    )
);

-- Indexes
CREATE INDEX idx_medications_patient ON medications(patient_id);
CREATE INDEX idx_medications_hospital ON medications(hospital_id);
CREATE INDEX idx_medications_name ON medications(LOWER(name));
CREATE INDEX idx_medications_rxcui ON medications(rxcui) WHERE rxcui IS NOT NULL;
CREATE INDEX idx_medications_active ON medications(patient_id) WHERE status = 'active';
```

### allergies

Patient allergy/intolerance records (FHIR AllergyIntolerance mapping).

```sql
CREATE TABLE allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Associations
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    
    -- FHIR Identifiers
    fhir_allergy_intolerance_id VARCHAR(255),
    
    -- Substance
    substance VARCHAR(255) NOT NULL,        -- Allergen name
    substance_code VARCHAR(50),             -- RxNorm/SNOMED code
    substance_code_system VARCHAR(100),
    
    -- Type
    allergy_type VARCHAR(50) DEFAULT 'allergy',
    -- Options: 'allergy', 'intolerance'
    
    category VARCHAR(50),
    -- Options: 'food', 'medication', 'environment', 'biologic'
    
    -- Reaction Details
    reaction VARCHAR(500) NOT NULL,         -- Description of reaction
    reaction_code VARCHAR(50),              -- SNOMED code for reaction
    manifestation VARCHAR(255),             -- e.g., "Hives", "Anaphylaxis"
    
    -- Severity
    severity VARCHAR(20) NOT NULL DEFAULT 'moderate',
    -- Options: 'mild', 'moderate', 'severe'
    
    criticality VARCHAR(20) DEFAULT 'unable-to-assess',
    -- Options: 'low', 'high', 'unable-to-assess'
    
    -- Clinical Status
    clinical_status VARCHAR(50) DEFAULT 'active',
    -- Options: 'active', 'inactive', 'resolved'
    
    verification_status VARCHAR(50) DEFAULT 'confirmed',
    -- Options: 'unconfirmed', 'confirmed', 'refuted', 'entered-in-error'
    
    -- Timing
    onset_date DATE,
    recorded_date DATE DEFAULT CURRENT_DATE,
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT allergies_severity_valid CHECK (severity IN ('mild', 'moderate', 'severe')),
    CONSTRAINT allergies_criticality_valid CHECK (criticality IN ('low', 'high', 'unable-to-assess'))
);

-- Indexes
CREATE INDEX idx_allergies_patient ON allergies(patient_id);
CREATE INDEX idx_allergies_hospital ON allergies(hospital_id);
CREATE INDEX idx_allergies_substance ON allergies(LOWER(substance));
CREATE INDEX idx_allergies_active ON allergies(patient_id) WHERE clinical_status = 'active';
```

### lab_results

Laboratory test results (FHIR Observation mapping).

```sql
CREATE TABLE lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Associations
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    clinical_case_id UUID REFERENCES clinical_cases(id) ON DELETE SET NULL,
    
    -- FHIR Identifiers
    fhir_observation_id VARCHAR(255),
    
    -- Test Identification
    test_name VARCHAR(255) NOT NULL,
    loinc_code VARCHAR(50),                 -- LOINC code
    loinc_display VARCHAR(255),
    
    -- Result
    value_numeric DECIMAL(15,5),            -- Numeric result
    value_string VARCHAR(500),              -- Text result (for qualitative tests)
    value_unit VARCHAR(50),                 -- Unit of measure
    
    -- Reference Ranges
    reference_range_low DECIMAL(15,5),
    reference_range_high DECIMAL(15,5),
    reference_range_text VARCHAR(255),      -- e.g., "3.5-5.0 mEq/L"
    
    -- Interpretation
    interpretation VARCHAR(20),
    -- Options: 'normal', 'abnormal', 'critical', 'high', 'low', 'critically_high', 'critically_low'
    interpretation_code VARCHAR(10),        -- HL7 v2: 'N', 'A', 'AA', 'H', 'L', 'HH', 'LL'
    
    -- Status
    status VARCHAR(50) DEFAULT 'final',
    -- Options: 'registered', 'preliminary', 'final', 'amended', 'corrected', 'cancelled', 'entered-in-error'
    
    -- Timing
    collected_at TIMESTAMP WITH TIME ZONE,
    resulted_at TIMESTAMP WITH TIME ZONE,
    
    -- Source
    lab_name VARCHAR(255),
    ordering_provider UUID REFERENCES users(id),
    
    -- Document Intelligence
    extracted_from_document BOOLEAN DEFAULT false,
    source_document_id UUID,
    extraction_confidence DECIMAL(5,2),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT lab_results_has_value CHECK (value_numeric IS NOT NULL OR value_string IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_lab_results_patient ON lab_results(patient_id);
CREATE INDEX idx_lab_results_hospital ON lab_results(hospital_id);
CREATE INDEX idx_lab_results_case ON lab_results(clinical_case_id);
CREATE INDEX idx_lab_results_test ON lab_results(LOWER(test_name));
CREATE INDEX idx_lab_results_loinc ON lab_results(loinc_code) WHERE loinc_code IS NOT NULL;
CREATE INDEX idx_lab_results_date ON lab_results(patient_id, collected_at DESC);
CREATE INDEX idx_lab_results_abnormal ON lab_results(patient_id) WHERE interpretation IN ('abnormal', 'critical', 'critically_high', 'critically_low');
```

### clinical_cases

Clinical case/encounter for analysis.

```sql
CREATE TABLE clinical_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Associations
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id),
    
    -- Case Details
    case_number VARCHAR(100),
    case_type VARCHAR(50) NOT NULL DEFAULT 'general-medicine',
    -- Options: 'general-medicine', 'cardiology', 'oncology', 'infectious-disease', 
    --          'endocrinology', 'neurology', 'pulmonology', 'gastroenterology', 'other'
    
    -- Clinical Question (Input)
    clinical_question TEXT NOT NULL,
    chief_complaint VARCHAR(500),
    history_of_present_illness TEXT,
    
    -- Status Workflow
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    -- Options: 'draft', 'submitted', 'analyzing', 'review-ready', 'reviewed', 'closed'
    
    priority VARCHAR(20) DEFAULT 'routine',
    -- Options: 'stat', 'urgent', 'routine'
    
    -- Vitals at Case Creation
    vitals JSONB,
    -- Schema: {"respiratoryRate": 18, "oxygenSaturation": 96, ...}
    
    -- Lab Values at Case Creation
    lab_values JSONB,
    -- Schema: {"creatinine": 1.2, "bilirubin": 0.8, ...}
    
    -- Final Outputs
    analysis_summary TEXT,
    final_recommendation TEXT,
    final_confidence VARCHAR(20),
    -- Options: 'low', 'medium', 'high'
    
    -- Review
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    -- Agent Processing
    agent_run_id VARCHAR(255),              -- Correlation ID for agent pipeline
    agent_started_at TIMESTAMP WITH TIME ZONE,
    agent_completed_at TIMESTAMP WITH TIME ZONE,
    agent_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT cases_status_valid CHECK (
        status IN ('draft', 'submitted', 'analyzing', 'review-ready', 'reviewed', 'closed')
    )
);

-- Indexes
CREATE INDEX idx_cases_patient ON clinical_cases(patient_id);
CREATE INDEX idx_cases_hospital ON clinical_cases(hospital_id);
CREATE INDEX idx_cases_status ON clinical_cases(hospital_id, status);
CREATE INDEX idx_cases_assigned ON clinical_cases(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_cases_created ON clinical_cases(hospital_id, created_at DESC);
CREATE INDEX idx_cases_pending ON clinical_cases(hospital_id) WHERE status IN ('submitted', 'analyzing');
```

---

## Agent Output Tables

### agent_outputs

Stores output from each clinical agent.

```sql
CREATE TABLE agent_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Associations
    clinical_case_id UUID NOT NULL REFERENCES clinical_cases(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    
    -- Agent Identification
    agent_type VARCHAR(50) NOT NULL,
    -- Options: 'triage', 'diagnostic', 'guideline', 'medication-safety', 'evidence', 'synthesis'
    
    agent_run_id VARCHAR(255),              -- Correlation ID
    execution_order INTEGER,                -- 1-6 order of execution
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'running',
    -- Options: 'pending', 'running', 'completed', 'error'
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    
    -- Output
    summary TEXT,                           -- Human-readable summary
    details JSONB NOT NULL,                 -- Full structured output
    raw_response TEXT,                      -- Raw LLM response (for debugging)
    
    -- Quality Metrics
    confidence DECIMAL(5,2),                -- 0-100
    evidence_source_count INTEGER,
    
    -- Reasoning Chain
    reasoning_chain JSONB,                  -- Array of reasoning steps
    
    -- Model Info
    model_name VARCHAR(100),                -- e.g., 'gpt-4o'
    model_version VARCHAR(50),
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    
    -- Error Handling
    error_message TEXT,
    error_code VARCHAR(50),
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT agent_outputs_type_valid CHECK (
        agent_type IN ('triage', 'diagnostic', 'guideline', 'medication-safety', 'evidence', 'synthesis')
    )
);

-- Indexes
CREATE INDEX idx_agent_outputs_case ON agent_outputs(clinical_case_id);
CREATE INDEX idx_agent_outputs_hospital ON agent_outputs(hospital_id);
CREATE INDEX idx_agent_outputs_type ON agent_outputs(clinical_case_id, agent_type);
CREATE INDEX idx_agent_outputs_run ON agent_outputs(agent_run_id);
CREATE INDEX idx_agent_outputs_created ON agent_outputs(created_at DESC);
```

### recommendations

AI-generated recommendations.

```sql
CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Associations
    clinical_case_id UUID NOT NULL REFERENCES clinical_cases(id) ON DELETE CASCADE,
    agent_output_id UUID REFERENCES agent_outputs(id) ON DELETE SET NULL,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    
    -- Recommendation
    type VARCHAR(50) NOT NULL,
    -- Options: 'diagnostic', 'therapeutic', 'monitoring', 'referral', 'follow-up', 'safety', 'other'
    
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Priority
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    -- Options: 'critical', 'high', 'medium', 'low'
    
    -- Evidence
    guideline_source VARCHAR(255),          -- e.g., "ACC/AHA 2023"
    evidence_level VARCHAR(20),             -- e.g., "Class I, Level A"
    confidence DECIMAL(5,2),
    
    -- Reasoning
    rationale TEXT,
    supporting_evidence JSONB,              -- Array of evidence items
    
    -- Timing
    time_frame VARCHAR(50),                 -- 'immediate', 'within_hours', 'within_days', 'routine'
    
    -- Action Status
    status VARCHAR(20) DEFAULT 'pending',
    -- Options: 'pending', 'accepted', 'rejected', 'completed', 'deferred'
    
    actioned_by UUID REFERENCES users(id),
    actioned_at TIMESTAMP WITH TIME ZONE,
    action_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT recommendations_priority_valid CHECK (priority IN ('critical', 'high', 'medium', 'low'))
);

-- Indexes
CREATE INDEX idx_recommendations_case ON recommendations(clinical_case_id);
CREATE INDEX idx_recommendations_hospital ON recommendations(hospital_id);
CREATE INDEX idx_recommendations_priority ON recommendations(clinical_case_id, priority);
CREATE INDEX idx_recommendations_pending ON recommendations(clinical_case_id) WHERE status = 'pending';
```

### risk_alerts

High-priority safety alerts.

```sql
CREATE TABLE risk_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Associations
    clinical_case_id UUID NOT NULL REFERENCES clinical_cases(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    agent_output_id UUID REFERENCES agent_outputs(id) ON DELETE SET NULL,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    
    -- Alert Details
    alert_type VARCHAR(50) NOT NULL,
    -- Options: 'drug-interaction', 'allergy', 'contraindication', 'critical-value', 
    --          'clinical-deterioration', 'dosing-error', 'other'
    
    severity VARCHAR(20) NOT NULL,
    -- Options: 'critical', 'high', 'moderate', 'low'
    
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Clinical Context
    affected_medications JSONB,             -- Array of medication names
    affected_conditions JSONB,              -- Array of condition names
    triggering_values JSONB,                -- Lab values or vitals that triggered
    
    -- Recommended Action
    recommended_action TEXT,
    alternative_suggested VARCHAR(255),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active',
    -- Options: 'active', 'acknowledged', 'resolved', 'dismissed', 'expired'
    
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledgment_notes TEXT,
    
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    -- Expiry
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT risk_alerts_severity_valid CHECK (severity IN ('critical', 'high', 'moderate', 'low'))
);

-- Indexes
CREATE INDEX idx_risk_alerts_case ON risk_alerts(clinical_case_id);
CREATE INDEX idx_risk_alerts_patient ON risk_alerts(patient_id);
CREATE INDEX idx_risk_alerts_hospital ON risk_alerts(hospital_id);
CREATE INDEX idx_risk_alerts_active ON risk_alerts(hospital_id) WHERE status = 'active';
CREATE INDEX idx_risk_alerts_critical ON risk_alerts(hospital_id) WHERE severity = 'critical' AND status = 'active';
CREATE INDEX idx_risk_alerts_type ON risk_alerts(alert_type);
```

### chat_messages

Clinician-agent conversation history.

```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Associations
    clinical_case_id UUID NOT NULL REFERENCES clinical_cases(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Message
    role VARCHAR(20) NOT NULL,
    -- Options: 'user', 'assistant', 'system'
    
    content TEXT NOT NULL,
    
    -- AI Response Metadata
    model_name VARCHAR(100),
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    response_time_ms INTEGER,
    
    -- References
    referenced_agent_outputs JSONB,         -- Array of agent_output IDs referenced
    citations JSONB,                        -- Array of citation objects
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chat_messages_role_valid CHECK (role IN ('user', 'assistant', 'system'))
);

-- Indexes
CREATE INDEX idx_chat_messages_case ON chat_messages(clinical_case_id);
CREATE INDEX idx_chat_messages_hospital ON chat_messages(hospital_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(clinical_case_id, created_at);
```

---

## Audit & Compliance Tables

### audit_logs

Comprehensive audit trail for HIPAA compliance.

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Context
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Session Info
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Action
    action VARCHAR(100) NOT NULL,
    -- Examples: 'patient.view', 'patient.create', 'case.analyze', 'report.export'
    
    action_category VARCHAR(50) NOT NULL,
    -- Options: 'authentication', 'patient_access', 'case_management', 
    --          'ai_analysis', 'data_export', 'configuration', 'security'
    
    -- Entity
    entity_type VARCHAR(50),
    -- Options: 'patient', 'case', 'user', 'hospital', 'agent_output', etc.
    entity_id UUID,
    
    -- Details
    description TEXT,
    old_value JSONB,                        -- Previous state (for updates)
    new_value JSONB,                        -- New state (for updates)
    metadata JSONB,                         -- Additional context
    
    -- Result
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    
    -- PHI Access
    accessed_phi BOOLEAN DEFAULT false,
    phi_fields_accessed JSONB,              -- Array of field names accessed
    access_purpose VARCHAR(100),            -- 'treatment', 'operations', 'research'
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Partition key for time-based partitioning
    audit_date DATE GENERATED ALWAYS AS (DATE(created_at)) STORED
);

-- Indexes
CREATE INDEX idx_audit_logs_hospital ON audit_logs(hospital_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_date ON audit_logs(audit_date);
CREATE INDEX idx_audit_logs_phi ON audit_logs(hospital_id, audit_date) WHERE accessed_phi = true;

-- Partitioning by month (for large-scale deployments)
-- CREATE TABLE audit_logs_y2026m01 PARTITION OF audit_logs
--     FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

### qr_access_logs

QR-based patient access audit.

```sql
CREATE TABLE qr_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Associations
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    accessed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Access Details
    qr_token_hash VARCHAR(64) NOT NULL,     -- SHA-256 hash of token (not the token itself)
    access_purpose VARCHAR(100) NOT NULL,
    -- Options: 'clinical_care', 'emergency', 'research', 'billing', 'audit'
    
    -- Result
    access_granted BOOLEAN NOT NULL,
    denial_reason VARCHAR(255),
    
    -- Session
    ip_address INET,
    device_info JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    token_issued_at TIMESTAMP WITH TIME ZONE,
    token_expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_qr_access_patient ON qr_access_logs(patient_id);
CREATE INDEX idx_qr_access_hospital ON qr_access_logs(hospital_id);
CREATE INDEX idx_qr_access_user ON qr_access_logs(accessed_by);
CREATE INDEX idx_qr_access_date ON qr_access_logs(created_at DESC);
CREATE INDEX idx_qr_access_denied ON qr_access_logs(hospital_id) WHERE access_granted = false;
```

---

## FHIR Resource Mappings

### Mapping Reference

| HealthMesh Table | FHIR Resource | Key Mappings |
|------------------|---------------|--------------|
| `patients` | `Patient` | demographics, identifiers |
| `diagnoses` | `Condition` | code, clinicalStatus, verificationStatus |
| `medications` | `MedicationStatement` | medication, dosage, status |
| `allergies` | `AllergyIntolerance` | substance, reaction, criticality |
| `lab_results` | `Observation` | code (LOINC), value, interpretation |
| `clinical_cases` | `Encounter` | type, status, period |
| `hospitals` | `Organization` | name, identifier, address |
| `users` | `Practitioner` | name, identifier, qualification |

### FHIR Patient Resource Mapping

```json
{
  "resourceType": "Patient",
  "id": "{{patients.fhir_patient_id}}",
  "identifier": [
    {
      "system": "urn:healthmesh:mrn",
      "value": "{{patients.mrn}}"
    }
  ],
  "name": [
    {
      "family": "{{patients.last_name}}",
      "given": ["{{patients.first_name}}", "{{patients.middle_name}}"]
    }
  ],
  "gender": "{{patients.gender}}",
  "birthDate": "{{patients.date_of_birth}}",
  "address": [
    {
      "line": ["{{patients.address_line1}}", "{{patients.address_line2}}"],
      "city": "{{patients.city}}",
      "state": "{{patients.state}}",
      "postalCode": "{{patients.postal_code}}",
      "country": "{{patients.country}}"
    }
  ],
  "telecom": [
    {
      "system": "phone",
      "value": "{{patients.phone}}"
    },
    {
      "system": "email",
      "value": "{{patients.email}}"
    }
  ],
  "contact": [
    {
      "relationship": [{"text": "{{patients.emergency_contact_relationship}}"}],
      "name": {"text": "{{patients.emergency_contact_name}}"},
      "telecom": [{"value": "{{patients.emergency_contact_phone}}"}]
    }
  ]
}
```

### FHIR Condition Resource Mapping

```json
{
  "resourceType": "Condition",
  "id": "{{diagnoses.fhir_condition_id}}",
  "clinicalStatus": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
        "code": "{{diagnoses.clinical_status}}"
      }
    ]
  },
  "verificationStatus": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
        "code": "{{diagnoses.verification_status}}"
      }
    ]
  },
  "category": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/condition-category",
          "code": "{{diagnoses.category}}"
        }
      ]
    }
  ],
  "severity": {
    "coding": [
      {
        "system": "http://snomed.info/sct",
        "display": "{{diagnoses.severity}}"
      }
    ]
  },
  "code": {
    "coding": [
      {
        "system": "http://hl7.org/fhir/sid/icd-10",
        "code": "{{diagnoses.code}}",
        "display": "{{diagnoses.display}}"
      }
    ]
  },
  "subject": {
    "reference": "Patient/{{diagnoses.patient_id}}"
  },
  "onsetDateTime": "{{diagnoses.onset_date}}",
  "recordedDate": "{{diagnoses.recorded_date}}",
  "note": [
    {
      "text": "{{diagnoses.notes}}"
    }
  ]
}
```

---

## Indexes & Performance

### Primary Query Patterns

| Query Pattern | Supporting Index |
|---------------|------------------|
| List patients by hospital | `idx_patients_hospital` |
| Find patient by MRN | `idx_patients_mrn` |
| Active medications for patient | `idx_medications_active` |
| Active allergies for patient | `idx_allergies_active` |
| Recent lab results | `idx_lab_results_date` |
| Pending cases for hospital | `idx_cases_pending` |
| Active critical alerts | `idx_risk_alerts_critical` |
| PHI access audit | `idx_audit_logs_phi` |

### Index Maintenance

```sql
-- Reindex tables with high update frequency
REINDEX TABLE clinical_cases;
REINDEX TABLE agent_outputs;
REINDEX TABLE audit_logs;

-- Analyze for query planner
ANALYZE patients;
ANALYZE clinical_cases;
ANALYZE agent_outputs;

-- Vacuum to reclaim space
VACUUM ANALYZE;
```

---

## Sample Queries

### Get Complete Patient Profile

```sql
SELECT 
    p.*,
    COALESCE(
        json_agg(DISTINCT jsonb_build_object(
            'code', d.code,
            'display', d.display,
            'status', d.clinical_status
        )) FILTER (WHERE d.id IS NOT NULL AND d.clinical_status = 'active'),
        '[]'
    ) AS active_diagnoses,
    COALESCE(
        json_agg(DISTINCT jsonb_build_object(
            'name', m.name,
            'dosage', m.dosage,
            'frequency', m.frequency
        )) FILTER (WHERE m.id IS NOT NULL AND m.status = 'active'),
        '[]'
    ) AS active_medications,
    COALESCE(
        json_agg(DISTINCT jsonb_build_object(
            'substance', a.substance,
            'reaction', a.reaction,
            'severity', a.severity
        )) FILTER (WHERE a.id IS NOT NULL AND a.clinical_status = 'active'),
        '[]'
    ) AS allergies
FROM patients p
LEFT JOIN diagnoses d ON d.patient_id = p.id
LEFT JOIN medications m ON m.patient_id = p.id
LEFT JOIN allergies a ON a.patient_id = p.id
WHERE p.id = $1 AND p.hospital_id = $2
GROUP BY p.id;
```

### Get Case with All Agent Outputs

```sql
SELECT 
    c.*,
    p.first_name || ' ' || p.last_name AS patient_name,
    p.mrn,
    COALESCE(
        json_agg(
            jsonb_build_object(
                'agent_type', ao.agent_type,
                'status', ao.status,
                'summary', ao.summary,
                'confidence', ao.confidence,
                'details', ao.details,
                'duration_ms', ao.duration_ms
            ) ORDER BY ao.execution_order
        ) FILTER (WHERE ao.id IS NOT NULL),
        '[]'
    ) AS agent_outputs
FROM clinical_cases c
JOIN patients p ON p.id = c.patient_id
LEFT JOIN agent_outputs ao ON ao.clinical_case_id = c.id
WHERE c.id = $1 AND c.hospital_id = $2
GROUP BY c.id, p.id;
```

### Get Active Risk Alerts Dashboard

```sql
SELECT 
    ra.id,
    ra.alert_type,
    ra.severity,
    ra.title,
    ra.description,
    ra.recommended_action,
    ra.created_at,
    p.first_name || ' ' || p.last_name AS patient_name,
    p.mrn,
    c.case_number
FROM risk_alerts ra
JOIN clinical_cases c ON c.id = ra.clinical_case_id
JOIN patients p ON p.id = c.patient_id
WHERE ra.hospital_id = $1
  AND ra.status = 'active'
ORDER BY 
    CASE ra.severity 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'moderate' THEN 3 
        ELSE 4 
    END,
    ra.created_at DESC
LIMIT 50;
```

### PHI Access Audit Report

```sql
SELECT 
    DATE(al.created_at) AS access_date,
    u.email AS user_email,
    u.role AS user_role,
    al.action,
    al.entity_type,
    p.mrn AS patient_mrn,
    al.access_purpose,
    al.ip_address,
    COUNT(*) AS access_count
FROM audit_logs al
JOIN users u ON u.id = al.user_id
LEFT JOIN patients p ON p.id = al.entity_id AND al.entity_type = 'patient'
WHERE al.hospital_id = $1
  AND al.accessed_phi = true
  AND al.created_at >= NOW() - INTERVAL '30 days'
GROUP BY 
    DATE(al.created_at),
    u.email,
    u.role,
    al.action,
    al.entity_type,
    p.mrn,
    al.access_purpose,
    al.ip_address
ORDER BY access_date DESC, access_count DESC;
```

---

## Migration Scripts

### Initial Schema Creation

```bash
# Generate migration
npm run db:generate

# Apply to database
npm run db:push

# Or using raw SQL
psql $DATABASE_URL -f migrations/001_initial_schema.sql
```

---

*Document Version: 1.0*  
*Last Updated: January 2026*  
*Database: Azure SQL Database / PostgreSQL 14+*  
*FHIR Version: R4 (4.0.1)*
