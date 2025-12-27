import {
  type User, type InsertUser,
  type Patient, type InsertPatient,
  type ClinicalCase, type InsertCase,
  type LabReport, type AuditLog, type ChatMessage,
  type Recommendation, type RiskAlert, type DashboardStats,
  type AgentOutput
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Patients
  getPatients(): Promise<Patient[]>;
  getPatient(id: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  deletePatient(id: string): Promise<boolean>;

  // Cases
  getCases(): Promise<ClinicalCase[]>;
  getCase(id: string): Promise<ClinicalCase | undefined>;
  createCase(caseData: InsertCase): Promise<ClinicalCase>;
  updateCase(id: string, updates: Partial<ClinicalCase>): Promise<ClinicalCase | undefined>;
  deleteCase(id: string): Promise<boolean>;

  // Lab Reports
  getLabReports(caseId?: string): Promise<LabReport[]>;
  createLabReport(report: Omit<LabReport, 'id'>): Promise<LabReport>;
  updateLabReport(id: string, updates: Partial<LabReport>): Promise<LabReport | undefined>;

  // Audit Logs
  getAuditLogs(entityId?: string): Promise<AuditLog[]>;
  createAuditLog(log: Omit<AuditLog, 'id'>): Promise<AuditLog>;

  // Chat Messages
  getChatMessages(caseId: string): Promise<ChatMessage[]>;
  createChatMessage(message: Omit<ChatMessage, 'id'>): Promise<ChatMessage>;

  // Recommendations
  updateRecommendation(caseId: string, recommendationId: string, feedback: { status: string; clinicianFeedback?: string }): Promise<Recommendation | undefined>;

  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;

  // Risk Alerts
  getRiskAlerts(caseId?: string): Promise<RiskAlert[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private patients: Map<string, Patient>;
  private cases: Map<string, ClinicalCase>;
  private labReports: Map<string, LabReport>;
  private auditLogs: Map<string, AuditLog>;
  private chatMessages: Map<string, ChatMessage>;

  constructor() {
    this.users = new Map();
    this.patients = new Map();
    this.cases = new Map();
    this.labReports = new Map();
    this.auditLogs = new Map();
    this.chatMessages = new Map();
    
    this.initializeDemoData();
  }

  private initializeDemoData() {
    const now = new Date().toISOString();
    
    const patient1: Patient = {
      id: "patient-001",
      demographics: {
        firstName: "Sarah",
        lastName: "Johnson",
        dateOfBirth: "1965-03-15",
        gender: "female",
        mrn: "MRN-2024-001",
        contactPhone: "(555) 234-5678",
        contactEmail: "sarah.johnson@email.com",
        address: "123 Medical Center Drive, Boston, MA 02115"
      },
      diagnoses: [
        {
          id: "diag-001",
          code: "C50.911",
          codeSystem: "ICD-10",
          display: "Malignant neoplasm of unspecified site of right female breast",
          status: "active",
          onsetDate: "2024-01-15",
          notes: "Stage IIA, hormone receptor positive"
        },
        {
          id: "diag-002",
          code: "E11.9",
          codeSystem: "ICD-10",
          display: "Type 2 diabetes mellitus without complications",
          status: "active",
          onsetDate: "2019-06-20"
        },
        {
          id: "diag-003",
          code: "I10",
          codeSystem: "ICD-10",
          display: "Essential (primary) hypertension",
          status: "active",
          onsetDate: "2018-03-10"
        }
      ],
      medications: [
        {
          id: "med-001",
          name: "Metformin",
          dosage: "1000mg",
          frequency: "twice daily",
          route: "oral",
          status: "active",
          startDate: "2019-06-25",
          prescriber: "Dr. Williams"
        },
        {
          id: "med-002",
          name: "Lisinopril",
          dosage: "10mg",
          frequency: "once daily",
          route: "oral",
          status: "active",
          startDate: "2018-03-15",
          prescriber: "Dr. Williams"
        },
        {
          id: "med-003",
          name: "Tamoxifen",
          dosage: "20mg",
          frequency: "once daily",
          route: "oral",
          status: "active",
          startDate: "2024-02-01",
          prescriber: "Dr. Chen"
        }
      ],
      allergies: [
        {
          id: "allergy-001",
          substance: "Penicillin",
          reaction: "Hives, difficulty breathing",
          severity: "severe",
          status: "active"
        },
        {
          id: "allergy-002",
          substance: "Sulfa drugs",
          reaction: "Skin rash",
          severity: "moderate",
          status: "active"
        }
      ],
      medicalHistory: "Previous appendectomy (1995). Family history of breast cancer (mother, diagnosed at age 52). No smoking history. Occasional alcohol use.",
      createdAt: now,
      updatedAt: now
    };

    const patient2: Patient = {
      id: "patient-002",
      demographics: {
        firstName: "Michael",
        lastName: "Chen",
        dateOfBirth: "1958-08-22",
        gender: "male",
        mrn: "MRN-2024-002",
        contactPhone: "(555) 345-6789",
        contactEmail: "m.chen@email.com",
        address: "456 Healthcare Ave, Boston, MA 02116"
      },
      diagnoses: [
        {
          id: "diag-004",
          code: "I25.10",
          codeSystem: "ICD-10",
          display: "Atherosclerotic heart disease of native coronary artery without angina pectoris",
          status: "active",
          onsetDate: "2022-11-05"
        },
        {
          id: "diag-005",
          code: "E78.5",
          codeSystem: "ICD-10",
          display: "Hyperlipidemia, unspecified",
          status: "active",
          onsetDate: "2020-04-12"
        }
      ],
      medications: [
        {
          id: "med-004",
          name: "Atorvastatin",
          dosage: "40mg",
          frequency: "once daily",
          route: "oral",
          status: "active",
          startDate: "2020-04-20",
          prescriber: "Dr. Patel"
        },
        {
          id: "med-005",
          name: "Aspirin",
          dosage: "81mg",
          frequency: "once daily",
          route: "oral",
          status: "active",
          startDate: "2022-11-10",
          prescriber: "Dr. Patel"
        },
        {
          id: "med-006",
          name: "Metoprolol",
          dosage: "50mg",
          frequency: "twice daily",
          route: "oral",
          status: "active",
          startDate: "2022-11-10",
          prescriber: "Dr. Patel"
        }
      ],
      allergies: [
        {
          id: "allergy-003",
          substance: "Codeine",
          reaction: "Nausea, vomiting",
          severity: "moderate",
          status: "active"
        }
      ],
      medicalHistory: "Coronary stent placement (2022). Former smoker (quit 2022). BMI 28.5. Family history of heart disease (father had MI at age 60).",
      createdAt: now,
      updatedAt: now
    };

    const patient3: Patient = {
      id: "patient-003",
      demographics: {
        firstName: "Emily",
        lastName: "Rodriguez",
        dateOfBirth: "1992-12-03",
        gender: "female",
        mrn: "MRN-2024-003",
        contactPhone: "(555) 456-7890",
        contactEmail: "emily.r@email.com",
        address: "789 Wellness Blvd, Cambridge, MA 02139"
      },
      diagnoses: [
        {
          id: "diag-006",
          code: "G35",
          codeSystem: "ICD-10",
          display: "Multiple sclerosis",
          status: "active",
          onsetDate: "2021-07-18",
          notes: "Relapsing-remitting MS, currently stable"
        }
      ],
      medications: [
        {
          id: "med-007",
          name: "Ocrelizumab",
          dosage: "600mg",
          frequency: "every 6 months",
          route: "IV infusion",
          status: "active",
          startDate: "2021-08-15",
          prescriber: "Dr. Nakamura"
        },
        {
          id: "med-008",
          name: "Vitamin D3",
          dosage: "2000 IU",
          frequency: "once daily",
          route: "oral",
          status: "active",
          startDate: "2021-08-01",
          prescriber: "Dr. Nakamura"
        }
      ],
      allergies: [],
      medicalHistory: "Diagnosed with MS after presenting with optic neuritis. No other significant medical history. Non-smoker. Active lifestyle prior to diagnosis.",
      createdAt: now,
      updatedAt: now
    };

    this.patients.set(patient1.id, patient1);
    this.patients.set(patient2.id, patient2);
    this.patients.set(patient3.id, patient3);

    const case1: ClinicalCase = {
      id: "case-001",
      patientId: "patient-001",
      caseType: "tumor-board",
      status: "review-ready",
      clinicalQuestion: "What is the optimal adjuvant therapy regimen for this Stage IIA ER+/PR+/HER2- breast cancer patient with comorbid diabetes and hypertension? Please evaluate chemotherapy vs. endocrine therapy alone, considering her age and overall health status.",
      summary: "58-year-old female with newly diagnosed Stage IIA breast cancer. Multiple agents have analyzed her case and generated treatment recommendations.",
      agentOutputs: [
        {
          agentType: "patient-context",
          status: "completed",
          startedAt: new Date(Date.now() - 3600000).toISOString(),
          completedAt: new Date(Date.now() - 3500000).toISOString(),
          summary: "Patient is a 58-year-old female with Stage IIA ER+/PR+/HER2- breast cancer. Relevant comorbidities include Type 2 DM (controlled on Metformin) and hypertension (controlled on Lisinopril). Important allergy to Penicillin noted.",
          confidence: 95,
          evidenceSources: ["Patient EMR", "FHIR Demographics", "Medication List"]
        },
        {
          agentType: "labs-reports",
          status: "completed",
          startedAt: new Date(Date.now() - 3400000).toISOString(),
          completedAt: new Date(Date.now() - 3300000).toISOString(),
          summary: "Most recent labs show HbA1c 7.2% (slightly elevated), normal kidney and liver function. CBC within normal limits. Oncotype DX recurrence score: 18 (intermediate risk).",
          confidence: 92,
          evidenceSources: ["Lab Results 2024-01-20", "Oncotype DX Report"]
        },
        {
          agentType: "research-guidelines",
          status: "completed",
          startedAt: new Date(Date.now() - 3200000).toISOString(),
          completedAt: new Date(Date.now() - 2800000).toISOString(),
          summary: "NCCN Guidelines recommend consideration of adjuvant chemotherapy for intermediate Oncotype scores. TAILORx trial data suggests potential benefit from chemo in patients aged 50-70 with RS 16-25.",
          confidence: 88,
          evidenceSources: ["NCCN Guidelines v2.2024", "TAILORx Trial", "ASCO Guidelines"]
        },
        {
          agentType: "risk-safety",
          status: "completed",
          startedAt: new Date(Date.now() - 2700000).toISOString(),
          completedAt: new Date(Date.now() - 2600000).toISOString(),
          summary: "No major drug interactions identified. Penicillin allergy noted - avoid related antibiotics if infection prophylaxis needed. Diabetes may require closer monitoring during chemotherapy.",
          confidence: 94,
          evidenceSources: ["Drug Interaction Database", "FDA Drug Labels", "Patient Allergy Records"]
        }
      ],
      recommendations: [
        {
          id: "rec-001",
          caseId: "case-001",
          agentType: "orchestrator",
          category: "Treatment",
          title: "Consider adjuvant chemotherapy followed by endocrine therapy",
          content: "Based on the intermediate Oncotype DX score (18) and TAILORx data, there may be benefit from adding chemotherapy to endocrine therapy. Recommend discussion with patient regarding TC (docetaxel + cyclophosphamide) regimen followed by Tamoxifen continuation.",
          confidence: 85,
          evidenceSources: ["TAILORx Trial", "NCCN Guidelines", "Patient Risk Assessment"],
          reasoningChain: [
            "Oncotype DX score of 18 falls in intermediate risk category",
            "TAILORx showed potential benefit for chemo in patients 50-70 with RS 16-25",
            "Patient's controlled comorbidities do not contraindicate standard chemotherapy",
            "Penicillin allergy does not affect recommended regimen"
          ],
          status: "pending",
          createdAt: now
        },
        {
          id: "rec-002",
          caseId: "case-001",
          agentType: "risk-safety",
          category: "Monitoring",
          title: "Enhanced glucose monitoring during treatment",
          content: "Given Type 2 DM, recommend more frequent blood glucose monitoring during chemotherapy. Consider endocrinology consultation if HbA1c increases significantly.",
          confidence: 92,
          evidenceSources: ["ADA Guidelines", "Oncology-Diabetes Management Literature"],
          reasoningChain: [
            "Chemotherapy can cause glucose fluctuations",
            "Steroids used as pre-medication may elevate blood glucose",
            "Current HbA1c of 7.2% provides limited buffer"
          ],
          status: "pending",
          createdAt: now
        }
      ],
      riskAlerts: [
        {
          id: "alert-001",
          type: "allergy",
          severity: "critical",
          title: "Severe Penicillin Allergy",
          description: "Patient has documented severe allergic reaction to Penicillin (hives, difficulty breathing). Avoid all penicillin-class antibiotics.",
          source: "Patient Allergy Records",
          recommendation: "Use alternative antibiotics if infection prophylaxis required during treatment",
          createdAt: now
        },
        {
          id: "alert-002",
          type: "comorbidity",
          severity: "warning",
          title: "Diabetes Management During Chemotherapy",
          description: "Patient on Metformin for Type 2 DM. Chemotherapy and associated steroids may impact glucose control.",
          source: "Risk Assessment Agent",
          recommendation: "Coordinate with endocrinology, increase glucose monitoring frequency",
          createdAt: now
        }
      ],
      labReports: [],
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: now
    };

    const case2: ClinicalCase = {
      id: "case-002",
      patientId: "patient-002",
      caseType: "chronic-disease",
      status: "analyzing",
      clinicalQuestion: "Patient presenting with increased fatigue and mild chest discomfort on exertion. Current cardiac medications adequate? Should we consider medication adjustment or additional cardiac workup?",
      summary: "65-year-old male with CAD, presenting with new symptoms. Case under AI analysis.",
      agentOutputs: [
        {
          agentType: "patient-context",
          status: "completed",
          startedAt: new Date(Date.now() - 1800000).toISOString(),
          completedAt: new Date(Date.now() - 1700000).toISOString(),
          summary: "65-year-old male with history of CAD s/p stent (2022), hyperlipidemia. Currently on aspirin, atorvastatin, and metoprolol.",
          confidence: 94
        },
        {
          agentType: "labs-reports",
          status: "processing",
          startedAt: new Date(Date.now() - 1600000).toISOString()
        }
      ],
      recommendations: [],
      riskAlerts: [
        {
          id: "alert-003",
          type: "critical-value",
          severity: "warning",
          title: "New Cardiac Symptoms Reported",
          description: "Patient reports increased fatigue and exertional chest discomfort. Requires prompt evaluation.",
          source: "Clinical Intake",
          recommendation: "Consider stress testing or cardiology consultation",
          createdAt: now
        }
      ],
      labReports: [],
      createdAt: new Date(Date.now() - 43200000).toISOString(),
      updatedAt: now
    };

    const case3: ClinicalCase = {
      id: "case-003",
      patientId: "patient-003",
      caseType: "rare-disease",
      status: "draft",
      clinicalQuestion: "Patient with relapsing-remitting MS on Ocrelizumab for 2.5 years. Annual MRI shows no new lesions. Continue current therapy or consider alternative DMT?",
      agentOutputs: [],
      recommendations: [],
      riskAlerts: [],
      labReports: [],
      createdAt: now,
      updatedAt: now
    };

    this.cases.set(case1.id, case1);
    this.cases.set(case2.id, case2);
    this.cases.set(case3.id, case3);

    const auditLog1: AuditLog = {
      id: "audit-001",
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      action: "case-created",
      entityType: "case",
      entityId: "case-001",
      userId: "clinician-001",
      details: { caseType: "tumor-board", patientMRN: "MRN-2024-001" }
    };

    const auditLog2: AuditLog = {
      id: "audit-002",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      action: "case-analyzed",
      entityType: "case",
      entityId: "case-001",
      details: { agentsInvoked: 4, duration: "25 minutes" }
    };

    this.auditLogs.set(auditLog1.id, auditLog1);
    this.auditLogs.set(auditLog2.id, auditLog2);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getPatients(): Promise<Patient[]> {
    return Array.from(this.patients.values());
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    return this.patients.get(id);
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const patient: Patient = {
      ...insertPatient,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.patients.set(id, patient);
    return patient;
  }

  async deletePatient(id: string): Promise<boolean> {
    return this.patients.delete(id);
  }

  async getCases(): Promise<ClinicalCase[]> {
    return Array.from(this.cases.values());
  }

  async getCase(id: string): Promise<ClinicalCase | undefined> {
    return this.cases.get(id);
  }

  async createCase(insertCase: InsertCase): Promise<ClinicalCase> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const clinicalCase: ClinicalCase = {
      id,
      patientId: insertCase.patientId,
      caseType: insertCase.caseType,
      status: "draft",
      clinicalQuestion: insertCase.clinicalQuestion,
      agentOutputs: [],
      recommendations: [],
      riskAlerts: [],
      labReports: [],
      createdAt: now,
      updatedAt: now
    };
    this.cases.set(id, clinicalCase);
    return clinicalCase;
  }

  async updateCase(id: string, updates: Partial<ClinicalCase>): Promise<ClinicalCase | undefined> {
    const existingCase = this.cases.get(id);
    if (!existingCase) return undefined;
    
    const updatedCase: ClinicalCase = {
      ...existingCase,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.cases.set(id, updatedCase);
    return updatedCase;
  }

  async deleteCase(id: string): Promise<boolean> {
    return this.cases.delete(id);
  }

  async getLabReports(caseId?: string): Promise<LabReport[]> {
    const reports = Array.from(this.labReports.values());
    if (caseId) {
      return reports.filter(r => r.caseId === caseId);
    }
    return reports;
  }

  async createLabReport(report: Omit<LabReport, 'id'>): Promise<LabReport> {
    const id = randomUUID();
    const labReport: LabReport = { ...report, id };
    this.labReports.set(id, labReport);
    return labReport;
  }

  async updateLabReport(id: string, updates: Partial<LabReport>): Promise<LabReport | undefined> {
    const existing = this.labReports.get(id);
    if (!existing) return undefined;
    
    const updated: LabReport = { ...existing, ...updates };
    this.labReports.set(id, updated);
    return updated;
  }

  async getAuditLogs(entityId?: string): Promise<AuditLog[]> {
    const logs = Array.from(this.auditLogs.values());
    if (entityId) {
      return logs.filter(l => l.entityId === entityId);
    }
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async createAuditLog(log: Omit<AuditLog, 'id'>): Promise<AuditLog> {
    const id = randomUUID();
    const auditLog: AuditLog = { ...log, id };
    this.auditLogs.set(id, auditLog);
    return auditLog;
  }

  async getChatMessages(caseId: string): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(m => m.caseId === caseId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async createChatMessage(message: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
    const id = randomUUID();
    const chatMessage: ChatMessage = { ...message, id };
    this.chatMessages.set(id, chatMessage);
    return chatMessage;
  }

  async updateRecommendation(caseId: string, recommendationId: string, feedback: { status: string; clinicianFeedback?: string }): Promise<Recommendation | undefined> {
    const clinicalCase = this.cases.get(caseId);
    if (!clinicalCase) return undefined;

    const recIndex = clinicalCase.recommendations.findIndex(r => r.id === recommendationId);
    if (recIndex === -1) return undefined;

    const updatedRec: Recommendation = {
      ...clinicalCase.recommendations[recIndex],
      status: feedback.status as "pending" | "accepted" | "rejected" | "modified",
      clinicianFeedback: feedback.clinicianFeedback
    };

    clinicalCase.recommendations[recIndex] = updatedRec;
    this.cases.set(caseId, { ...clinicalCase, updatedAt: new Date().toISOString() });
    
    return updatedRec;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const cases = Array.from(this.cases.values());
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const activeCases = cases.filter(c => 
      c.status !== "closed" && c.status !== "draft"
    );

    const pendingReviews = cases.filter(c => c.status === "review-ready");

    const criticalAlerts = cases.reduce((count, c) => 
      count + c.riskAlerts.filter(a => a.severity === "critical").length, 0
    );

    const casesThisWeek = cases.filter(c => 
      new Date(c.createdAt) >= oneWeekAgo
    );

    const completedAgentOutputs = cases.flatMap(c => 
      c.agentOutputs.filter(ao => ao.status === "completed" && ao.confidence)
    );
    
    const avgConfidence = completedAgentOutputs.length > 0
      ? completedAgentOutputs.reduce((sum, ao) => sum + (ao.confidence || 0), 0) / completedAgentOutputs.length
      : 0;

    return {
      totalCases: cases.length,
      activeCases: activeCases.length,
      pendingReviews: pendingReviews.length,
      criticalAlerts,
      casesThisWeek: casesThisWeek.length,
      avgConfidenceScore: Math.round(avgConfidence)
    };
  }

  async getRiskAlerts(caseId?: string): Promise<RiskAlert[]> {
    const cases = Array.from(this.cases.values());
    if (caseId) {
      const clinicalCase = this.cases.get(caseId);
      return clinicalCase?.riskAlerts || [];
    }
    return cases.flatMap(c => c.riskAlerts);
  }
}

export const storage = new MemStorage();

// Export SQL connection pool for QR services
import sql from 'mssql';
import { getAzureConfig } from './azure/config';

let poolInstance: sql.ConnectionPool | null = null;

export async function getConnectionPool(): Promise<sql.ConnectionPool> {
    if (!poolInstance) {
        const azureConfig = getAzureConfig();
        const config = {
            user: azureConfig.sql.user,
            password: azureConfig.sql.password,
            database: azureConfig.sql.database,
            server: azureConfig.sql.server,
            pool: {
                max: 10,
                min: 0,
                idleTimeoutMillis: 30000
            },
            options: azureConfig.sql.options
        };
        poolInstance = await sql.connect(config);
    }
    return poolInstance;
}
