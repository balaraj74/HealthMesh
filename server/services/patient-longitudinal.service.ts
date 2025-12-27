import sql from 'mssql';

/**
 * Patient Longitudinal Data Service
 * Fetches complete patient history for QR dashboard
 * FHIR R4 compliant data aggregation
 */

export interface PatientLongitudinalData {
  patient: PatientDemographics;
  identifiers: PatientIdentifiers;
  clinicalCases: ClinicalCase[];
  medications: Medication[];
  labResults: LabResult[];
  allergies: Allergy[];
  conditions: ChronicCondition[];
  aiInsights: AIInsight[];
  riskScores: RiskScore;
  timeline: TimelineEvent[];
  alerts: ClinicalAlert[];
}

interface PatientDemographics {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string;
  contactNumber?: string;
  email?: string;
  address?: string;
  emergencyContact?: string;
  emergencyContactNumber?: string;
}

interface PatientIdentifiers {
  fhirPatientId: string;
  masterPatientIdentifier: string;
  hospitalId: number;
  hospitalName: string;
}

interface ClinicalCase {
  id: number;
  caseNumber: string;
  chiefComplaint: string;
  diagnosis?: string;
  treatmentPlan?: string;
  status: string;
  priority: string;
  admissionDate: string;
  dischargeDate?: string;
  assignedDoctorName: string;
  department?: string;
  duration: string;
}

interface Medication {
  id: number;
  medicationName: string;
  dosage: string;
  frequency: string;
  route: string;
  status: string;
  prescribedBy: string;
  prescriptionDate: string;
  startDate?: string;
  endDate?: string;
  indication?: string;
  isActive: boolean;
}

interface LabResult {
  id: number;
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  interpretation: string;
  category: string;
  observedDate: string;
  status: string;
  isAbnormal: boolean;
}

interface Allergy {
  id: number;
  allergen: string;
  category: string;
  severity: string;
  reaction: string;
  status: string;
  onsetDate?: string;
  verified: boolean;
}

interface ChronicCondition {
  id: number;
  conditionName: string;
  clinicalStatus: string;
  severity?: string;
  onsetDate?: string;
  diagnosedBy?: string;
  isActive: boolean;
}

interface AIInsight {
  id: number;
  insightType: string;
  category: string;
  title: string;
  summary: string;
  riskLevel?: string;
  confidenceScore?: number;
  recommendations?: any[];
  generatedAt: string;
  reviewed: boolean;
}

interface RiskScore {
  overall: number;
  cardiovascular?: number;
  diabetes?: number;
  respiratory?: number;
  riskFactors: string[];
}

interface TimelineEvent {
  id: string;
  type: 'admission' | 'diagnosis' | 'medication' | 'lab' | 'discharge' | 'allergy' | 'condition';
  title: string;
  description: string;
  timestamp: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  icon?: string;
  metadata?: any;
}

interface ClinicalAlert {
  id: string;
  type: 'allergy' | 'condition' | 'medication' | 'risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: string;
  actionRequired: boolean;
}

export class PatientLongitudinalService {
  /**
   * Fetch complete longitudinal patient data
   */
  static async getPatientLongitudinalData(
    pool: sql.ConnectionPool,
    patientId: string,
    hospitalId: string
  ): Promise<PatientLongitudinalData> {
    // Fetch all data in parallel for performance
    // Internal methods use any type to be flexible with string UUIDs from Azure SQL
    const [
      patientData,
      qrData,
      casesData,
      medicationsData,
      labsData,
      allergiesData,
      conditionsData,
      aiInsightsData
    ] = await Promise.all([
      this.getPatientDemographics(pool, patientId, hospitalId),
      this.getPatientIdentifiers(pool, patientId, hospitalId),
      this.getClinicalCases(pool, patientId, hospitalId),
      this.getMedications(pool, patientId, hospitalId),
      this.getLabResults(pool, patientId, hospitalId),
      this.getAllergies(pool, patientId, hospitalId),
      this.getConditions(pool, patientId, hospitalId),
      this.getAIInsights(pool, patientId, hospitalId)
    ]);

    // Generate timeline from all events
    const timeline = this.generateTimeline(
      casesData,
      medicationsData,
      labsData,
      allergiesData,
      conditionsData
    );

    // Generate clinical alerts
    const alerts = this.generateAlerts(
      allergiesData,
      conditionsData,
      medicationsData,
      aiInsightsData
    );

    // Calculate risk scores
    const riskScores = this.calculateRiskScores(
      conditionsData,
      medicationsData,
      labsData,
      aiInsightsData
    );

    return {
      patient: patientData,
      identifiers: qrData,
      clinicalCases: casesData,
      medications: medicationsData,
      labResults: labsData,
      allergies: allergiesData,
      conditions: conditionsData,
      aiInsights: aiInsightsData,
      riskScores,
      timeline,
      alerts
    };
  }

  private static async getPatientDemographics(
    pool: sql.ConnectionPool,
    patientId: string,
    hospitalId: string
  ): Promise<PatientDemographics> {
    const result = await pool.request()
      .input('patient_id', sql.NVarChar, patientId)
      .input('hospital_id', sql.NVarChar, hospitalId)
      .query(`
        SELECT 
          id, first_name, last_name, date_of_birth, gender,
          mrn, contact_phone, contact_email, demographics
        FROM patients
        WHERE id = @patient_id AND hospital_id = @hospital_id
      `);

    const row = result.recordset[0];
    let demographics: any = {};
    try {
      if (row.demographics) {
        demographics = JSON.parse(row.demographics);
      }
    } catch (e) {
      console.error('Failed to parse demographics JSON', e);
    }

    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      dateOfBirth: row.date_of_birth,
      gender: row.gender,
      bloodGroup: demographics.bloodGroup || 'Unknown',
      contactNumber: row.contact_phone,
      email: row.contact_email,
      address: demographics.address || '',
      emergencyContact: demographics.emergencyContact || '',
      emergencyContactNumber: demographics.emergencyContactNumber || ''
    };
  }

  private static async getPatientIdentifiers(
    pool: sql.ConnectionPool,
    patientId: string,
    hospitalId: string
  ): Promise<PatientIdentifiers> {
    const result = await pool.request()
      .input('patient_id', sql.NVarChar, patientId)
      .input('hospital_id', sql.NVarChar, hospitalId)
      .query(`
        SELECT 
          qr.fhir_patient_id,
          qr.master_patient_identifier,
          h.id as hospital_id,
          h.name as hospital_name
        FROM patient_qr_codes qr
        INNER JOIN hospitals h ON qr.hospital_id = h.id
        WHERE qr.patient_id = @patient_id 
          AND qr.hospital_id = @hospital_id
          AND qr.is_active = 1
        ORDER BY qr.created_at DESC
      `);

    const row = result.recordset[0];
    return {
      fhirPatientId: row.fhir_patient_id,
      masterPatientIdentifier: row.master_patient_identifier,
      hospitalId: row.hospital_id,
      hospitalName: row.hospital_name
    };
  }

  private static async getClinicalCases(
    pool: sql.ConnectionPool,
    patientId: string,
    hospitalId: string
  ): Promise<ClinicalCase[]> {
    const result = await pool.request()
      .input('patient_id', sql.NVarChar, patientId)
      .input('hospital_id', sql.NVarChar, hospitalId)
      .query(`
        SELECT 
          c.id, c.case_type, c.chief_complaint, c.diagnosis,
          c.treatment_plan, c.status, c.priority,
          c.created_at, c.updated_at,
          u.name as doctor_name
        FROM clinical_cases c
        LEFT JOIN users u ON c.assigned_doctor_id = u.id
        WHERE c.patient_id = @patient_id AND c.hospital_id = @hospital_id
        ORDER BY c.created_at DESC
      `);

    return result.recordset.map(row => ({
      id: row.id,
      caseNumber: row.id.substring(0, 8).toUpperCase(),
      chiefComplaint: row.chief_complaint,
      diagnosis: row.diagnosis,
      treatmentPlan: row.treatment_plan,
      status: row.status,
      priority: row.priority,
      admissionDate: row.created_at,
      dischargeDate: row.updated_at,
      assignedDoctorName: row.doctor_name || 'Not Assigned',
      department: row.case_type,
      duration: this.calculateDuration(row.created_at, row.updated_at)
    }));
  }

  private static async getMedications(
    pool: sql.ConnectionPool,
    patientId: string,
    hospitalId: string
  ): Promise<Medication[]> {
    const result = await pool.request()
      .input('patient_id', sql.NVarChar, patientId)
      .input('hospital_id', sql.NVarChar, hospitalId)
      .query(`
        SELECT 
          id, medication_name, dosage, frequency, route,
          status, start_date, end_date, notes, prescriber,
          created_at
        FROM patient_medications_qr
        WHERE patient_id = @patient_id AND hospital_id = @hospital_id
        ORDER BY created_at DESC
      `);

    return result.recordset.map(row => ({
      id: row.id,
      medicationName: row.medication_name,
      dosage: row.dosage,
      frequency: row.frequency,
      route: row.route,
      status: row.status,
      prescribedBy: row.prescriber || 'Unknown',
      prescriptionDate: row.created_at,
      startDate: row.start_date,
      endDate: row.end_date,
      indication: row.notes,
      isActive: row.status === 'active'
    }));
  }

  private static async getLabResults(
    pool: sql.ConnectionPool,
    patientId: string,
    hospitalId: string
  ): Promise<LabResult[]> {
    const result = await pool.request()
      .input('patient_id', sql.NVarChar, patientId)
      .input('hospital_id', sql.NVarChar, hospitalId)
      .query(`
        SELECT 
          id, test_name, test_code, value, unit, reference_range,
          status, collected_at, result_at, created_at
        FROM lab_results_qr
        WHERE patient_id = @patient_id AND hospital_id = @hospital_id
        ORDER BY collected_at DESC, created_at DESC
      `);

    return result.recordset.map(row => ({
      id: row.id,
      testName: row.test_name,
      value: row.value,
      unit: row.unit,
      referenceRange: row.reference_range,
      interpretation: row.status || 'normal',
      category: row.test_code || 'General',
      observedDate: row.collected_at || row.created_at,
      status: row.status,
      isAbnormal: row.status === 'abnormal' || row.status === 'critical'
    }));
  }

  private static async getAllergies(
    pool: sql.ConnectionPool,
    patientId: string,
    hospitalId: string
  ): Promise<Allergy[]> {
    const result = await pool.request()
      .input('patient_id', sql.NVarChar, patientId)
      .input('hospital_id', sql.NVarChar, hospitalId)
      .query(`
        SELECT 
          id, substance, reaction, severity,
          status, onset_date, created_at
        FROM patient_allergies_qr
        WHERE patient_id = @patient_id AND hospital_id = @hospital_id
        ORDER BY severity DESC, onset_date DESC
      `);

    return result.recordset.map(row => ({
      id: row.id,
      allergen: row.substance,
      category: 'Medication',
      severity: row.severity,
      reaction: row.reaction,
      status: row.status,
      onsetDate: row.onset_date,
      verified: true
    }));
  }

  private static async getConditions(
    pool: sql.ConnectionPool,
    patientId: string,
    hospitalId: string
  ): Promise<ChronicCondition[]> {
    const result = await pool.request()
      .input('patient_id', sql.NVarChar, patientId)
      .input('hospital_id', sql.NVarChar, hospitalId)
      .query(`
        SELECT 
          id, condition_name, icd_code, status, severity,
          onset_date, abatement_date, created_at
        FROM patient_conditions_qr
        WHERE patient_id = @patient_id AND hospital_id = @hospital_id
        ORDER BY onset_date DESC
      `);

    return result.recordset.map(row => ({
      id: row.id,
      conditionName: row.condition_name,
      clinicalStatus: row.status,
      severity: row.severity,
      onsetDate: row.onset_date,
      diagnosedBy: row.icd_code ? `ICD: ${row.icd_code}` : 'Unknown',
      isActive: row.status === 'active'
    }));
  }

  private static async getAIInsights(
    pool: sql.ConnectionPool,
    patientId: string,
    hospitalId: string
  ): Promise<AIInsight[]> {
    const result = await pool.request()
      .input('patient_id', sql.NVarChar, patientId)
      .input('hospital_id', sql.NVarChar, hospitalId)
      .query(`
        SELECT 
          id, insight_type, title, description,
          severity, confidence, ai_model, related_data,
          generated_at, is_active
        FROM ai_clinical_insights
        WHERE patient_id = @patient_id 
          AND hospital_id = @hospital_id
          AND is_active = 1
        ORDER BY severity DESC, generated_at DESC
      `);

    return result.recordset.map(row => ({
      id: row.id,
      insightType: row.insight_type,
      category: row.ai_model || 'Clinical',
      title: row.title,
      summary: row.description,
      riskLevel: row.severity,
      confidenceScore: row.confidence,
      recommendations: row.related_data ? JSON.parse(row.related_data) : [],
      generatedAt: row.generated_at,
      reviewed: row.is_active
    }));
  }

  private static generateTimeline(
    cases: ClinicalCase[],
    medications: Medication[],
    labs: LabResult[],
    allergies: Allergy[],
    conditions: ChronicCondition[]
  ): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    // Add case events
    cases.forEach(c => {
      events.push({
        id: `case-${c.id}`,
        type: 'admission',
        title: c.chiefComplaint,
        description: `Case #${c.caseNumber} - ${c.status}`,
        timestamp: c.admissionDate,
        severity: c.priority === 'critical' ? 'critical' : c.priority === 'high' ? 'high' : 'medium',
        metadata: c
      });

      if (c.diagnosis) {
        events.push({
          id: `diagnosis-${c.id}`,
          type: 'diagnosis',
          title: 'Diagnosis Recorded',
          description: c.diagnosis,
          timestamp: c.admissionDate,
          severity: 'medium',
          metadata: c
        });
      }
    });

    // Add medication events
    medications.forEach(m => {
      if (m.isActive) {
        events.push({
          id: `med-${m.id}`,
          type: 'medication',
          title: m.medicationName,
          description: `${m.dosage}, ${m.frequency}`,
          timestamp: m.prescriptionDate,
          severity: 'low',
          metadata: m
        });
      }
    });

    // Add lab events (only abnormal)
    labs.filter(l => l.isAbnormal).forEach(l => {
      events.push({
        id: `lab-${l.id}`,
        type: 'lab',
        title: l.testName,
        description: `${l.value} ${l.unit || ''} - ${l.interpretation}`,
        timestamp: l.observedDate,
        severity: l.interpretation === 'critical' ? 'critical' : 'medium',
        metadata: l
      });
    });

    // Add allergy events
    allergies.forEach(a => {
      events.push({
        id: `allergy-${a.id}`,
        type: 'allergy',
        title: `Allergy: ${a.allergen}`,
        description: `${a.severity} - ${a.reaction}`,
        timestamp: a.onsetDate || new Date().toISOString(),
        severity: a.severity === 'life-threatening' ? 'critical' : a.severity === 'severe' ? 'high' : 'medium',
        metadata: a
      });
    });

    // Add condition events
    conditions.filter(c => c.isActive).forEach(c => {
      events.push({
        id: `condition-${c.id}`,
        type: 'condition',
        title: c.conditionName,
        description: `Status: ${c.clinicalStatus}`,
        timestamp: c.onsetDate || new Date().toISOString(),
        severity: c.severity === 'severe' ? 'high' : 'medium',
        metadata: c
      });
    });

    // Sort by timestamp (most recent first)
    return events.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  private static generateAlerts(
    allergies: Allergy[],
    conditions: ChronicCondition[],
    medications: Medication[],
    aiInsights: AIInsight[]
  ): ClinicalAlert[] {
    const alerts: ClinicalAlert[] = [];

    // Critical allergies
    allergies
      .filter(a => a.status === 'active' && (a.severity === 'severe' || a.severity === 'life-threatening'))
      .forEach(a => {
        alerts.push({
          id: `allergy-alert-${a.id}`,
          type: 'allergy',
          severity: a.severity === 'life-threatening' ? 'critical' : 'high',
          message: `⚠️ ALLERGY: ${a.allergen}`,
          details: `Reaction: ${a.reaction}`,
          actionRequired: true
        });
      });

    // Active chronic conditions
    conditions
      .filter(c => c.isActive && c.severity === 'severe')
      .forEach(c => {
        alerts.push({
          id: `condition-alert-${c.id}`,
          type: 'condition',
          severity: 'high',
          message: `Chronic Condition: ${c.conditionName}`,
          details: `Status: ${c.clinicalStatus}`,
          actionRequired: false
        });
      });

    // High-risk AI insights
    aiInsights
      .filter(i => i.riskLevel === 'high' || i.riskLevel === 'critical')
      .forEach(i => {
        alerts.push({
          id: `ai-alert-${i.id}`,
          type: 'risk',
          severity: i.riskLevel === 'critical' ? 'critical' : 'high',
          message: i.title,
          details: i.summary,
          actionRequired: true
        });
      });

    return alerts;
  }

  private static calculateRiskScores(
    conditions: ChronicCondition[],
    medications: Medication[],
    labs: LabResult[],
    aiInsights: AIInsight[]
  ): RiskScore {
    const riskFactors: string[] = [];

    // Base risk from chronic conditions
    const activeConditions = conditions.filter(c => c.isActive);
    let overallRisk = activeConditions.length * 10;

    if (activeConditions.some(c => c.conditionName.toLowerCase().includes('diabetes'))) {
      riskFactors.push('Diabetes');
    }
    if (activeConditions.some(c => c.conditionName.toLowerCase().includes('hypertension'))) {
      riskFactors.push('Hypertension');
    }

    // Risk from abnormal labs
    const abnormalLabs = labs.filter(l => l.isAbnormal).length;
    overallRisk += abnormalLabs * 5;

    // Risk from AI insights
    const highRiskInsights = aiInsights.filter(i =>
      i.riskLevel === 'high' || i.riskLevel === 'critical'
    );
    overallRisk += highRiskInsights.length * 15;

    // Cap at 100
    overallRisk = Math.min(overallRisk, 100);

    return {
      overall: overallRisk,
      riskFactors
    };
  }

  private static calculateDuration(start: string, end?: string): string {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    if (days < 30) return `${days} days`;
    if (days < 365) return `${Math.floor(days / 30)} months`;
    return `${Math.floor(days / 365)} years`;
  }
}
