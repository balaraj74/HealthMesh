import { z } from "zod";

// Patient Demographics
export const patientDemographicsSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other", "unknown"]),
  mrn: z.string().min(1, "Medical Record Number is required"),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  address: z.string().optional(),
});

export type PatientDemographics = z.infer<typeof patientDemographicsSchema>;

// Medical Conditions/Diagnoses
export const diagnosisSchema = z.object({
  id: z.string(),
  code: z.string(),
  codeSystem: z.enum(["ICD-10", "SNOMED-CT"]),
  display: z.string(),
  status: z.enum(["active", "resolved", "inactive"]),
  onsetDate: z.string().optional(),
  notes: z.string().optional(),
});

export type Diagnosis = z.infer<typeof diagnosisSchema>;

// Medications
export const medicationSchema = z.object({
  id: z.string(),
  name: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  route: z.string().optional(),
  status: z.enum(["active", "completed", "stopped", "on-hold"]),
  startDate: z.string().optional(),
  prescriber: z.string().optional(),
});

export type Medication = z.infer<typeof medicationSchema>;

// Allergies
export const allergySchema = z.object({
  id: z.string(),
  substance: z.string(),
  reaction: z.string(),
  severity: z.enum(["mild", "moderate", "severe", "life-threatening"]),
  status: z.enum(["active", "inactive", "resolved"]),
});

export type Allergy = z.infer<typeof allergySchema>;

// Lab Results
export const labResultSchema = z.object({
  id: z.string(),
  testName: z.string(),
  value: z.string(),
  unit: z.string(),
  referenceRange: z.string().optional(),
  status: z.enum(["normal", "abnormal", "critical"]),
  collectedDate: z.string(),
  notes: z.string().optional(),
});

export type LabResult = z.infer<typeof labResultSchema>;

// Lab Report (uploaded document)
export const labReportSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  fileName: z.string(),
  fileType: z.string(),
  uploadedAt: z.string(),
  extractedData: z.array(labResultSchema).optional(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  rawText: z.string().optional(),
});

export type LabReport = z.infer<typeof labReportSchema>;

// Patient (FHIR-aligned)
export const patientSchema = z.object({
  id: z.string(),
  demographics: patientDemographicsSchema,
  diagnoses: z.array(diagnosisSchema),
  medications: z.array(medicationSchema),
  allergies: z.array(allergySchema),
  medicalHistory: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Patient = z.infer<typeof patientSchema>;

// Insert schemas
export const insertPatientSchema = patientSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPatient = z.infer<typeof insertPatientSchema>;

// Agent Types
export const agentTypeSchema = z.enum([
  "patient-context",
  "labs-reports",
  "research-guidelines",
  "risk-safety",
  "clinician-interaction",
  "orchestrator"
]);

export type AgentType = z.infer<typeof agentTypeSchema>;

// Agent Status
export const agentStatusSchema = z.enum(["idle", "processing", "completed", "error"]);
export type AgentStatus = z.infer<typeof agentStatusSchema>;

// Agent Output
export const agentOutputSchema = z.object({
  agentType: agentTypeSchema,
  status: agentStatusSchema,
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  summary: z.string().optional(),
  details: z.any().optional(),
  confidence: z.number().min(0).max(100).optional(),
  evidenceSources: z.array(z.string()).optional(),
  reasoningChain: z.array(z.string()).optional(),
});

export type AgentOutput = z.infer<typeof agentOutputSchema>;

// Risk Alert
export const riskAlertSchema = z.object({
  id: z.string(),
  type: z.enum(["drug-interaction", "contraindication", "dosage", "allergy", "comorbidity", "critical-value"]),
  severity: z.enum(["info", "warning", "critical"]),
  title: z.string(),
  description: z.string(),
  source: z.string(),
  recommendation: z.string().optional(),
  createdAt: z.string(),
});

export type RiskAlert = z.infer<typeof riskAlertSchema>;

// AI Recommendation
export const recommendationSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  agentType: agentTypeSchema,
  category: z.string(),
  title: z.string(),
  content: z.string(),
  confidence: z.number().min(0).max(100),
  evidenceSources: z.array(z.string()),
  reasoningChain: z.array(z.string()),
  status: z.enum(["pending", "accepted", "rejected", "modified"]),
  clinicianFeedback: z.string().optional(),
  createdAt: z.string(),
});

export type Recommendation = z.infer<typeof recommendationSchema>;

// Case Status
export const caseStatusSchema = z.enum([
  "draft",
  "submitted",
  "analyzing",
  "review-ready",
  "reviewed",
  "closed"
]);

export type CaseStatus = z.infer<typeof caseStatusSchema>;

// Clinical Case
export const clinicalCaseSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  caseType: z.enum(["tumor-board", "chronic-disease", "rare-disease", "general"]),
  status: caseStatusSchema,
  clinicalQuestion: z.string(),
  summary: z.string().optional(),
  agentOutputs: z.array(agentOutputSchema),
  recommendations: z.array(recommendationSchema),
  riskAlerts: z.array(riskAlertSchema),
  labReports: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  reviewedAt: z.string().optional(),
  reviewedBy: z.string().optional(),
});

export type ClinicalCase = z.infer<typeof clinicalCaseSchema>;

// Insert schemas
export const insertCaseSchema = z.object({
  patientId: z.string(),
  caseType: z.enum(["tumor-board", "chronic-disease", "rare-disease", "general"]),
  clinicalQuestion: z.string().min(1, "Clinical question is required"),
});

export type InsertCase = z.infer<typeof insertCaseSchema>;

// Audit Log Entry
export const auditLogSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  action: z.enum([
    "case-created",
    "case-updated",
    "case-analyzed",
    "patient-created",
    "patient-updated",
    "lab-uploaded",
    "lab-processed",
    "agent-invoked",
    "agent-completed",
    "recommendation-generated",
    "recommendation-reviewed",
    "clinician-feedback",
    "data-accessed"
  ]),
  entityType: z.enum(["case", "patient", "lab-report", "agent", "recommendation"]),
  entityId: z.string(),
  userId: z.string().optional(),
  details: z.any(),
  ipAddress: z.string().optional(),
});

export type AuditLog = z.infer<typeof auditLogSchema>;

// Chat Message for Clinician Interaction
export const chatMessageSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  role: z.enum(["clinician", "assistant"]),
  content: z.string(),
  timestamp: z.string(),
  agentType: agentTypeSchema.optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

// Decision Summary Report
export const decisionReportSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  generatedAt: z.string(),
  executiveSummary: z.string(),
  patientOverview: z.string(),
  agentFindings: z.array(z.object({
    agentType: agentTypeSchema,
    findings: z.string(),
    confidence: z.number(),
  })),
  recommendations: z.array(recommendationSchema),
  riskAssessment: z.string(),
  evidenceCitations: z.array(z.string()),
  auditTrail: z.array(auditLogSchema),
  disclaimer: z.string(),
});

export type DecisionReport = z.infer<typeof decisionReportSchema>;

// Dashboard Stats
export const dashboardStatsSchema = z.object({
  totalCases: z.number(),
  activeCases: z.number(),
  pendingReviews: z.number(),
  criticalAlerts: z.number(),
  casesThisWeek: z.number(),
  avgConfidenceScore: z.number(),
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// User (basic for now)
export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: z.enum(["clinician", "admin", "researcher"]),
  name: z.string(),
});

export type User = z.infer<typeof userSchema>;

export const insertUserSchema = userSchema.omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;

// API Response wrappers
export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
  });
