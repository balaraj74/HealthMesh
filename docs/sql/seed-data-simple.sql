-- Get hospital ID
DECLARE @hospitalId UNIQUEIDENTIFIER;
SELECT @hospitalId = id FROM hospitals WHERE tenant_id = '0ba0de08-9840-495b-9ba1-a219de9356b8';

-- Create test user
DECLARE @userId UNIQUEIDENTIFIER = NEWID();
INSERT INTO users (id, hospital_id, entra_oid, tenant_id, email, name, role)
VALUES (@userId, @hospitalId, 'test-oid-123', '0ba0de08-9840-495b-9ba1-a219de9356b8', 'test@healthmesh.com', 'Dr. Test User', 'doctor');

-- Create patients
DECLARE @patient1Id UNIQUEIDENTIFIER = NEWID();
DECLARE @patient2Id UNIQUEIDENTIFIER = NEWID();

INSERT INTO patients (id, hospital_id, first_name, last_name, date_of_birth, gender, mrn, demographics, diagnoses, medications, allergies, created_by_user_id)
VALUES 
  (@patient1Id, @hospitalId, 'Sarah', 'Johnson', '1965-03-15', 'female', 'MRN001',
   '{"address": "123 Main St, Boston, MA"}',
   '[{"code": "C50.9", "description": "Breast cancer", "stage": "IIA"}]',
   '[{"name": "Metformin", "dose": "1000mg"}]',
   '[{"allergen": "Penicillin", "severity": "severe"}]',
   @userId),
  (@patient2Id, @hospitalId, 'Michael', 'Chen', '1958-07-22', 'male', 'MRN002',
   '{"address": "456 Oak Ave, Cambridge, MA"}',
   '[{"code": "I25.10", "description": "CAD"}]',
   '[{"name": "Aspirin", "dose": "81mg"}]',
   '[]',
   @userId);

-- Create clinical cases
DECLARE @case1Id UNIQUEIDENTIFIER = NEWID();
DECLARE @case2Id UNIQUEIDENTIFIER = NEWID();

INSERT INTO clinical_cases (id, hospital_id, patient_id, assigned_doctor_id, case_type, status, priority, chief_complaint, diagnosis, treatment_plan)
VALUES
  (@case1Id, @hospitalId, @patient1Id, @userId, 'tumor-board', 'review-ready', 'high',
   'Optimal adjuvant therapy for Stage IIA ER+/PR+/HER2- breast cancer with comorbid diabetes?',
   'Stage IIA breast cancer, ER+/PR+/HER2-', 'Considering chemo + endocrine therapy'),
  (@case2Id, @hospitalId, @patient2Id, @userId, 'chronic-disease', 'analyzing', 'medium',
   'Increased fatigue and chest discomfort on exertion',
   'CAD s/p stent, new symptoms', 'Evaluation pending');

-- Create lab reports
INSERT INTO lab_reports (id, hospital_id, patient_id, case_id, report_type, test_name, test_date, results, status, ordered_by_user_id)
VALUES
  (NEWID(), @hospitalId, @patient1Id, @case1Id, 'pathology', 'Oncotype DX', GETUTCDATE(),
   '{"recurrenceScore": 18}', 'completed', @userId),
  (NEWID(), @hospitalId, @patient1Id, @case1Id, 'laboratory', 'HbA1c', GETUTCDATE(),
   '{"value": 7.2}', 'completed', @userId);

-- Create risk alerts  
INSERT INTO risk_alerts (id, hospital_id, patient_id, case_id, alert_type, severity, description, status)
VALUES
  (NEWID(), @hospitalId, @patient1Id, @case1Id, 'allergy', 'critical',
   'Severe Penicillin allergy documented', 'active'),
  (NEWID(), @hospitalId, @patient1Id, @case1Id, 'comorbidity', 'warning',
   'Diabetes - monitor glucose during chemo', 'active'),
  (NEWID(), @hospitalId, @patient2Id, @case2Id, 'symptoms', 'warning',
   'New cardiac symptoms - prompt evaluation needed', 'active');

PRINT '✅ Sample data seeded successfully!';
