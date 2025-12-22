/**
 * Production-Grade Multi-Tenant Database Schema
 * 
 * ARCHITECTURE:
 * - Microsoft Entra ID is the ONLY authentication source
 * - Each Entra tenant (tid) maps to ONE hospital
 * - All data is strictly isolated by hospital_id
 * 
 * SECURITY MODEL:
 * - NO local passwords
 * - NO hardcoded users  
 * - Users auto-provisioned from Entra ID on first login
 * - All queries MUST include hospital_id for isolation
 * 
 * TERMINOLOGY:
 * - tenant_id: Azure AD tenant ID (tid claim) - identifies the organization
 * - hospital_id: Internal UUID - used for data isolation
 * - entra_oid: Azure AD object ID (oid claim) - unique user identifier
 */

import { sqliteTable, text, integer, index, unique } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ============================================================================
// HOSPITALS TABLE (formerly "organizations")
// Each Microsoft Entra ID tenant = One hospital
// ============================================================================
export const hospitals = sqliteTable(
  "hospitals",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id").notNull().unique(), // Azure AD tenant ID (tid) - 1:1 mapping
    name: text("name").notNull(),
    domain: text("domain"), // e.g., "contosohospital.onmicrosoft.com"
    settings: text("settings", { mode: "json" }), // {fhir_endpoint, locale, timezone}
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  },
  (table) => ({
    tenantIdIdx: index("idx_hospitals_tenant_id").on(table.tenantId),
  })
);

// ============================================================================
// USERS TABLE
// Users authenticated via Azure Entra ID ONLY
// Auto-provisioned on first login
// ============================================================================
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    entraOid: text("entra_oid").notNull(), // Azure AD object ID (oid) - unique user identifier
    tenantId: text("tenant_id").notNull(), // Azure AD tenant ID (tid)
    hospitalId: text("hospital_id").notNull(), // FK to hospitals.id - for data isolation
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: text("role").default("doctor").notNull(), // 'admin', 'doctor', 'nurse'
    department: text("department"), // Optional: Cardiology, Emergency, etc.
    lastLogin: integer("last_login", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  },
  (table) => ({
    hospitalIdIdx: index("idx_users_hospital_id").on(table.hospitalId),
    entraOidIdx: index("idx_users_entra_oid").on(table.entraOid),
    uniqueEntraOidTenant: unique("uq_entra_oid_tenant").on(table.entraOid, table.tenantId),
  })
);

// ============================================================================
// PATIENTS TABLE
// Hospital-scoped patient records
// ============================================================================
export const patients = sqliteTable(
  "patients",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    hospitalId: text("hospital_id").notNull(), // CRITICAL: Hospital isolation
    fhirPatientId: text("fhir_patient_id"), // Link to Azure FHIR Service

    // Demographics
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    dateOfBirth: text("date_of_birth"), // ISO string YYYY-MM-DD
    gender: text("gender"),
    mrn: text("mrn"), // Medical Record Number - unique per hospital

    // Contact
    contactPhone: text("contact_phone"),
    contactEmail: text("contact_email"),

    // Medical Data (JSON)
    demographics: text("demographics", { mode: "json" }),
    diagnoses: text("diagnoses", { mode: "json" }),
    medications: text("medications", { mode: "json" }),
    allergies: text("allergies", { mode: "json" }),

    // Metadata
    createdByUserId: text("created_by_user_id").notNull(), // FK to users.id
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  },
  (table) => ({
    hospitalIdIdx: index("idx_patients_hospital_id").on(table.hospitalId),
    fhirIdIdx: index("idx_patients_fhir_id").on(table.fhirPatientId),
    mrnIdx: index("idx_patients_mrn").on(table.hospitalId, table.mrn),
  })
);

// ============================================================================
// CASES TABLE
// Clinical decision support cases - hospital scoped
// ============================================================================
export const cases = sqliteTable(
  "cases",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    hospitalId: text("hospital_id").notNull(), // CRITICAL: Hospital isolation
    patientId: text("patient_id").notNull(),

    // Case Details
    caseType: text("case_type").notNull(),
    title: text("title"),
    description: text("description"),
    status: text("status").default("draft").notNull(),
    priority: text("priority").default("medium").notNull(),

    // Clinical Data (JSON)
    symptoms: text("symptoms", { mode: "json" }),
    clinicalData: text("clinical_data", { mode: "json" }),
    aiAnalysis: text("ai_analysis", { mode: "json" }),
    recommendations: text("recommendations", { mode: "json" }),

    // Workflow
    assignedToUserId: text("assigned_to_user_id"),
    reviewedByUserId: text("reviewed_by_user_id"),
    reviewNotes: text("review_notes"),

    // Metadata
    createdByUserId: text("created_by_user_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
    closedAt: integer("closed_at", { mode: "timestamp" }),
  },
  (table) => ({
    hospitalIdIdx: index("idx_cases_hospital_id").on(table.hospitalId),
    patientIdIdx: index("idx_cases_patient_id").on(table.patientId),
    statusIdx: index("idx_cases_status").on(table.hospitalId, table.status),
  })
);

// ============================================================================
// LAB_REPORTS TABLE
// Hospital scoped laboratory results
// ============================================================================
export const labReports = sqliteTable(
  "lab_reports",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    hospitalId: text("hospital_id").notNull(),
    patientId: text("patient_id").notNull(),
    caseId: text("case_id"),

    // Report Details
    testName: text("test_name").notNull(),
    testCode: text("test_code"),
    testCategory: text("test_category"),
    reportDate: integer("report_date", { mode: "timestamp" }).notNull(),
    status: text("status").default("pending").notNull(),

    // Results (JSON)
    results: text("results", { mode: "json" }),
    interpretation: text("interpretation"),
    criticalFlags: text("critical_flags", { mode: "json" }),

    // Metadata
    orderedByUserId: text("ordered_by_user_id"),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  },
  (table) => ({
    hospitalIdIdx: index("idx_lab_reports_hospital_id").on(table.hospitalId),
    patientIdIdx: index("idx_lab_reports_patient_id").on(table.patientId),
  })
);

// ============================================================================
// CHAT_MESSAGES TABLE
// Clinician AI chat - hospital scoped
// ============================================================================
export const chatMessages = sqliteTable(
  "chat_messages",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    hospitalId: text("hospital_id").notNull(),
    userId: text("user_id").notNull(),
    caseId: text("case_id"),

    // Message Details
    role: text("role").notNull(), // 'user' or 'assistant'
    content: text("content").notNull(),
    context: text("context", { mode: "json" }),

    // Metadata
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  },
  (table) => ({
    hospitalIdIdx: index("idx_chat_messages_hospital_id").on(table.hospitalId),
    userIdIdx: index("idx_chat_messages_user_id").on(table.userId),
    caseIdIdx: index("idx_chat_messages_case_id").on(table.caseId),
  })
);

// ============================================================================
// AUDIT_LOGS TABLE
// HIPAA-compliant audit trail - hospital scoped
// ============================================================================
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    hospitalId: text("hospital_id").notNull(),
    userId: text("user_id"),
    entraOid: text("entra_oid"), // Azure AD OID for traceability

    // Event Details
    eventType: text("event_type").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    action: text("action"),

    // Context
    details: text("details", { mode: "json" }),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    // Timestamp
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  },
  (table) => ({
    hospitalIdIdx: index("idx_audit_logs_hospital_id").on(table.hospitalId),
    createdAtIdx: index("idx_audit_logs_created_at").on(table.hospitalId, table.createdAt),
    entraOidIdx: index("idx_audit_logs_entra_oid").on(table.entraOid),
    eventTypeIdx: index("idx_audit_logs_event_type").on(table.hospitalId, table.eventType),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================
export const hospitalsRelations = relations(hospitals, ({ many }) => ({
  users: many(users),
  patients: many(patients),
  cases: many(cases),
  auditLogs: many(auditLogs),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  hospital: one(hospitals, {
    fields: [users.hospitalId],
    references: [hospitals.id],
  }),
  createdPatients: many(patients),
  createdCases: many(cases),
  chatMessages: many(chatMessages),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  hospital: one(hospitals, {
    fields: [patients.hospitalId],
    references: [hospitals.id],
  }),
  creator: one(users, {
    fields: [patients.createdByUserId],
    references: [users.id],
  }),
  cases: many(cases),
  labReports: many(labReports),
}));

export const casesRelations = relations(cases, ({ one, many }) => ({
  hospital: one(hospitals, {
    fields: [cases.hospitalId],
    references: [hospitals.id],
  }),
  patient: one(patients, {
    fields: [cases.patientId],
    references: [patients.id],
  }),
  creator: one(users, {
    fields: [cases.createdByUserId],
    references: [users.id],
  }),
  assignee: one(users, {
    fields: [cases.assignedToUserId],
    references: [users.id],
  }),
  labReports: many(labReports),
  chatMessages: many(chatMessages),
}));

// ============================================================================
// TypeScript Types
// ============================================================================
export type Hospital = typeof hospitals.$inferSelect;
export type InsertHospital = typeof hospitals.$inferInsert;

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = typeof patients.$inferInsert;

export type Case = typeof cases.$inferSelect;
export type InsertCase = typeof cases.$inferInsert;

export type LabReport = typeof labReports.$inferSelect;
export type InsertLabReport = typeof labReports.$inferInsert;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ============================================================================
// LEGACY EXPORTS (for backward compatibility during migration)
// These will be removed in future versions
// ============================================================================
export const organizations = hospitals;
export type Organization = Hospital;
export type InsertOrganization = InsertHospital;
