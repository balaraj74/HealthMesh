import Database from 'better-sqlite3';
import path from 'path';
import { storage } from '../storage';

/**
 * Patient Longitudinal Data Service - SQLite Version
 * Fetches complete patient history for QR dashboard
 * FHIR R4 compliant data aggregation
 */

const dbPath = path.join(process.cwd(), 'healthmesh.db');

function getDb(): Database.Database {
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    return db;
}

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
    id: number | string;
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
    id: string;
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

export class PatientLongitudinalServiceSQLite {
    /**
     * Fetch complete longitudinal patient data
     */
    static async getPatientLongitudinalData(
        patientId: number | string,
        hospitalId: number = 1
    ): Promise<PatientLongitudinalData> {
        const db = getDb();

        // Get patient from in-memory storage (since that's where demo patients are)
        const memPatient = await storage.getPatient(patientId.toString());

        // Get QR identifiers from SQLite
        const qrData = db.prepare(`
      SELECT 
        fhir_patient_id, master_patient_identifier
      FROM patient_qr_codes
      WHERE patient_id = ? AND hospital_id = ? AND is_active = 1
      ORDER BY created_at DESC
      LIMIT 1
    `).get(patientId, hospitalId) as any;

        // Build patient demographics from memory storage
        const patientData: PatientDemographics = memPatient ? {
            id: memPatient.id,
            firstName: memPatient.demographics?.firstName || 'Unknown',
            lastName: memPatient.demographics?.lastName || 'Patient',
            dateOfBirth: memPatient.demographics?.dateOfBirth || '1990-01-01',
            gender: memPatient.demographics?.gender || 'unknown',
            bloodGroup: undefined,
            contactNumber: memPatient.demographics?.contactPhone,
            email: memPatient.demographics?.contactEmail,
            address: memPatient.demographics?.address
        } : {
            id: patientId as number,
            firstName: 'Demo',
            lastName: 'Patient',
            dateOfBirth: '1990-01-01',
            gender: 'unknown'
        };

        // Build identifiers
        const identifiers: PatientIdentifiers = {
            fhirPatientId: qrData?.fhir_patient_id || `FHIR-${hospitalId}-${patientId}`,
            masterPatientIdentifier: qrData?.master_patient_identifier || `MPI-${hospitalId}-${patientId}`,
            hospitalId,
            hospitalName: 'HealthMesh Hospital'
        };

        // Get clinical cases from memory storage
        const allCases = await storage.getCases();
        const patientCases = allCases.filter(c => c.patientId === patientId.toString());
        const clinicalCases: ClinicalCase[] = patientCases.map(c => ({
            id: c.id,
            caseNumber: `CASE-${c.id.slice(-6)}`,
            chiefComplaint: c.clinicalQuestion || 'Clinical consultation',
            diagnosis: c.summary,
            treatmentPlan: undefined,
            status: c.status,
            priority: 'medium',
            admissionDate: c.createdAt,
            dischargeDate: undefined,
            assignedDoctorName: 'Dr. HealthMesh AI',
            department: c.caseType,
            duration: this.calculateDuration(c.createdAt)
        }));

        // Get medications from memory or SQLite
        let medications: Medication[] = [];
        if (memPatient?.medications) {
            medications = memPatient.medications.map((m: any, idx: number) => ({
                id: idx + 1,
                medicationName: m.name,
                dosage: m.dosage || '',
                frequency: m.frequency || '',
                route: m.route || 'oral',
                status: m.status || 'active',
                prescribedBy: m.prescriber || 'Doctor',
                prescriptionDate: m.startDate || new Date().toISOString(),
                startDate: m.startDate,
                endDate: m.endDate,
                indication: undefined,
                isActive: m.status === 'active'
            }));
        } else {
            const dbMeds = db.prepare(`
        SELECT * FROM patient_medications 
        WHERE patient_id = ? AND hospital_id = ?
        ORDER BY prescription_date DESC
      `).all(patientId, hospitalId) as any[];

            medications = dbMeds.map(m => ({
                id: m.id,
                medicationName: m.medication_name,
                dosage: m.dosage,
                frequency: m.frequency,
                route: m.route || 'oral',
                status: m.status,
                prescribedBy: 'Doctor',
                prescriptionDate: m.prescription_date,
                startDate: m.start_date,
                endDate: m.end_date,
                indication: m.indication,
                isActive: m.status === 'active'
            }));
        }

        // Get lab results from SQLite
        const dbLabs = db.prepare(`
      SELECT * FROM lab_results 
      WHERE patient_id = ? AND hospital_id = ?
      ORDER BY observed_datetime DESC
    `).all(patientId, hospitalId) as any[];

        const labResults: LabResult[] = dbLabs.map(l => ({
            id: l.id,
            testName: l.test_name,
            value: l.value,
            unit: l.unit,
            referenceRange: l.reference_range,
            interpretation: l.interpretation || 'normal',
            category: l.category,
            observedDate: l.observed_datetime,
            status: l.status,
            isAbnormal: l.interpretation !== 'normal'
        }));

        // Get allergies from memory or SQLite
        let allergies: Allergy[] = [];
        if (memPatient?.allergies) {
            allergies = memPatient.allergies.map((a: any, idx: number) => ({
                id: idx + 1,
                allergen: a.substance || a.allergen || 'Unknown',
                category: 'medication',
                severity: a.severity || 'moderate',
                reaction: a.reaction || 'Unknown reaction',
                status: a.status || 'active',
                onsetDate: undefined,
                verified: true
            }));
        } else {
            const dbAllergies = db.prepare(`
        SELECT * FROM patient_allergies 
        WHERE patient_id = ? AND hospital_id = ?
        ORDER BY severity DESC
      `).all(patientId, hospitalId) as any[];

            allergies = dbAllergies.map(a => ({
                id: a.id,
                allergen: a.allergen,
                category: a.category,
                severity: a.severity,
                reaction: a.reaction,
                status: a.status,
                onsetDate: a.onset_date,
                verified: !!a.verified
            }));
        }

        // Get conditions from memory diagnoses or SQLite
        let conditions: ChronicCondition[] = [];
        if (memPatient?.diagnoses) {
            conditions = memPatient.diagnoses.map((d: any, idx: number) => ({
                id: idx + 1,
                conditionName: d.display || d.description || 'Unknown',
                clinicalStatus: d.status || 'active',
                severity: undefined,
                onsetDate: d.onsetDate,
                diagnosedBy: undefined,
                isActive: d.status === 'active'
            }));
        } else {
            const dbConditions = db.prepare(`
        SELECT * FROM patient_conditions 
        WHERE patient_id = ? AND hospital_id = ?
        ORDER BY onset_date DESC
      `).all(patientId, hospitalId) as any[];

            conditions = dbConditions.map(c => ({
                id: c.id,
                conditionName: c.condition_name,
                clinicalStatus: c.clinical_status,
                severity: c.severity,
                onsetDate: c.onset_date,
                diagnosedBy: undefined,
                isActive: c.clinical_status === 'active'
            }));
        }

        // Get AI insights from SQLite
        const dbInsights = db.prepare(`
      SELECT * FROM ai_clinical_insights 
      WHERE patient_id = ? AND hospital_id = ? AND is_active = 1 AND dismissed = 0
      ORDER BY risk_level DESC, generated_at DESC
    `).all(patientId, hospitalId) as any[];

        const aiInsights: AIInsight[] = dbInsights.map(i => ({
            id: i.id,
            insightType: i.insight_type,
            category: i.insight_category,
            title: i.title,
            summary: i.summary,
            riskLevel: i.risk_level,
            confidenceScore: i.confidence_score,
            recommendations: i.recommendations ? JSON.parse(i.recommendations) : [],
            generatedAt: i.generated_at,
            reviewed: !!i.reviewed
        }));

        // Generate timeline
        const timeline = this.generateTimeline(
            clinicalCases,
            medications,
            labResults,
            allergies,
            conditions
        );

        // Generate alerts
        const alerts = this.generateAlerts(
            allergies,
            conditions,
            medications,
            aiInsights
        );

        // Calculate risk scores
        const riskScores = this.calculateRiskScores(
            conditions,
            medications,
            labResults,
            aiInsights
        );

        db.close();

        return {
            patient: patientData,
            identifiers,
            clinicalCases,
            medications,
            labResults,
            allergies,
            conditions,
            aiInsights,
            riskScores,
            timeline,
            alerts
        };
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
        if (activeConditions.some(c => c.conditionName.toLowerCase().includes('cancer') || c.conditionName.toLowerCase().includes('neoplasm'))) {
            riskFactors.push('Oncology History');
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

export default PatientLongitudinalServiceSQLite;
