/**
 * Multi-Tenant Database Schema (SQLite Version)
 * Azure Entra ID as single source of truth
 * All tables include tenant_id for complete isolation
 */

import { sqliteTable, text, integer, index, unique } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ============================================================================
// ORGANIZATIONS TABLE
// Each Microsoft Entra ID tenant = One organization/hospital
// ============================================================================
export const organizations = sqliteTable(
  "organizations",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id").notNull().unique(), // Azure AD tenant ID (tid)
    name: text("name").notNull(),
    domain: text("domain"), // e.g., "contosohospital.onmicrosoft.com"
    settings: text("settings", { mode: "json" }), // {fhir_endpoint, locale, timezone, etc}
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  },
  (table) => ({
    tenantIdIdx: index("idx_organizations_tenant_id").on(table.tenantId),
  })
);

// ============================================================================
// USERS TABLE
// Users authenticated via Azure Entra ID ONLY
// 
// IMPORTANT: Users are auto-provisioned from Entra ID claims only
// - userOid: Azure AD object ID (oid) - unique user identifier
// - tenantId: Azure AD tenant ID (tid) - maps to organization
// - email, name: Extracted from Entra ID token claims
// - role: Can be synced from Entra ID App Roles
// 
// ❌ NO local passwords - passwordHash is kept for migration compatibility only
// ❌ NO email/password auth - authProvider is always 'entra'
// ============================================================================
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userOid: text("user_oid").notNull(), // Azure AD object ID (oid) - source of truth
    tenantId: text("tenant_id").notNull(), // Azure AD tenant ID (tid) - org isolation
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash"), // DEPRECATED: Kept for migration only, never used
    authProvider: text("auth_provider").default("entra").notNull(), // ALWAYS 'entra'
    role: text("role").default("user").notNull(), // 'admin', 'clinician', 'user' - can sync from Entra App Roles
    lastLogin: integer("last_login", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  },
  (table) => ({
    tenantIdIdx: index("idx_users_tenant_id").on(table.tenantId),
    userOidIdx: index("idx_users_user_oid").on(table.userOid),
    uniqueUserOidTenant: unique("uq_user_oid_tenant").on(table.userOid, table.tenantId),
  })
);

// ============================================================================
// PATIENTS TABLE
// Tenant-scoped patient records
// ============================================================================
export const patients = sqliteTable(
  "patients",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id").notNull(), // CRITICAL: Tenant isolation
    fhirPatientId: text("fhir_patient_id"), // Link to Azure FHIR Service

    // Demographics
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    dateOfBirth: text("date_of_birth"), // ISO string YYYY-MM-DD
    gender: text("gender"),
    mrn: text("mrn"), // Medical Record Number

    // Contact
    contactPhone: text("contact_phone"),
    contactEmail: text("contact_email"),

    // Medical Data (JSON for flexibility)
    demographics: text("demographics", { mode: "json" }), // Full demographic details
    diagnoses: text("diagnoses", { mode: "json" }), // Array of diagnoses
    medications: text("medications", { mode: "json" }), // Array of medications
    allergies: text("allergies", { mode: "json" }), // Array of allergies

    // Metadata
    createdBy: text("created_by"), // User ID who created this patient
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  },
  (table) => ({
    tenantIdIdx: index("idx_patients_tenant_id").on(table.tenantId),
    fhirIdIdx: index("idx_patients_fhir_id").on(table.fhirPatientId),
    mrnIdx: index("idx_patients_mrn").on(table.tenantId, table.mrn),
  })
);

// ============================================================================
// CASES TABLE
// Clinical decision support cases - tenant scoped
// ============================================================================
export const cases = sqliteTable(
  "cases",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id").notNull(), // CRITICAL: Tenant isolation
    patientId: text("patient_id").notNull(),

    // Case Details
    caseType: text("case_type").notNull(),
    title: text("title"),
    description: text("description"),
    status: text("status").default("draft").notNull(),
    priority: text("priority").default("medium").notNull(),

    // Clinical Data (JSON)
    symptoms: text("symptoms", { mode: "json" }), // Array of symptoms
    clinicalData: text("clinical_data", { mode: "json" }), // {vitals, labs, imaging}
    aiAnalysis: text("ai_analysis", { mode: "json" }), // AI-generated insights
    recommendations: text("recommendations", { mode: "json" }), // Treatment recommendations

    // Workflow
    assignedTo: text("assigned_to"), // User ID
    reviewedBy: text("reviewed_by"), // User ID
    reviewNotes: text("review_notes"),

    // Metadata
    createdBy: text("created_by").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
    closedAt: integer("closed_at", { mode: "timestamp" }),
  },
  (table) => ({
    tenantIdIdx: index("idx_cases_tenant_id").on(table.tenantId),
    patientIdIdx: index("idx_cases_patient_id").on(table.patientId),
    statusIdx: index("idx_cases_status").on(table.tenantId, table.status),
    createdAtIdx: index("idx_cases_created_at").on(table.tenantId, table.createdAt),
  })
);

// ============================================================================
// LAB_REPORTS TABLE
// Laboratory test results - tenant scoped
// ============================================================================
export const labReports = sqliteTable(
  "lab_reports",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id").notNull(),
    patientId: text("patient_id").notNull(),
    caseId: text("case_id"),

    // Report Details
    testName: text("test_name").notNull(),
    testCode: text("test_code"),
    testCategory: text("test_category"),
    reportDate: integer("report_date", { mode: "timestamp" }).notNull(),
    status: text("status").default("pending").notNull(),

    // Results (JSON)
    results: text("results", { mode: "json" }), // {test_results, values, ranges}
    interpretation: text("interpretation"),
    criticalFlags: text("critical_flags", { mode: "json" }), // Abnormal values

    // Metadata
    orderedBy: text("ordered_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  },
  (table) => ({
    tenantIdIdx: index("idx_lab_reports_tenant_id").on(table.tenantId),
    patientIdIdx: index("idx_lab_reports_patient_id").on(table.patientId),
    reportDateIdx: index("idx_lab_reports_report_date").on(table.tenantId, table.reportDate),
  })
);

// ============================================================================
// CHAT_MESSAGES TABLE
// Clinician AI chat - tenant scoped
// ============================================================================
export const chatMessages = sqliteTable(
  "chat_messages",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id").notNull(),
    userId: text("user_id").notNull(),
    caseId: text("case_id"),

    // Message Details
    role: text("role").notNull(), // 'user' or 'assistant'
    content: text("content").notNull(),
    context: text("context", { mode: "json" }), // Relevant clinical context

    // Metadata
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  },
  (table) => ({
    tenantIdIdx: index("idx_chat_messages_tenant_id").on(table.tenantId),
    userIdIdx: index("idx_chat_messages_user_id").on(table.userId),
    caseIdIdx: index("idx_chat_messages_case_id").on(table.caseId),
    createdAtIdx: index("idx_chat_messages_created_at").on(table.tenantId, table.createdAt),
  })
);

// ============================================================================
// AUDIT_LOGS TABLE
// Comprehensive audit trail - tenant scoped
// ============================================================================
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id").notNull(),
    userId: text("user_id"),
    userOid: text("user_oid"), // Azure AD OID for traceability

    // Event Details
    eventType: text("event_type").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    action: text("action"),

    // Context
    details: text("details", { mode: "json" }), // Additional event context
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    // Timestamp
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  },
  (table) => ({
    tenantIdIdx: index("idx_audit_logs_tenant_id").on(table.tenantId),
    createdAtIdx: index("idx_audit_logs_created_at").on(table.tenantId, table.createdAt),
    userOidIdx: index("idx_audit_logs_user_oid").on(table.userOid),
    eventTypeIdx: index("idx_audit_logs_event_type").on(table.tenantId, table.eventType),
  })
);

// ============================================================================
// RELATIONS (for Drizzle ORM queries)
// ============================================================================
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  patients: many(patients),
  cases: many(cases),
  auditLogs: many(auditLogs),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.tenantId],
    references: [organizations.tenantId],
  }),
  createdPatients: many(patients),
  createdCases: many(cases),
  chatMessages: many(chatMessages),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [patients.tenantId],
    references: [organizations.tenantId],
  }),
  creator: one(users, {
    fields: [patients.createdBy],
    references: [users.id],
  }),
  cases: many(cases),
  labReports: many(labReports),
}));

export const casesRelations = relations(cases, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [cases.tenantId],
    references: [organizations.tenantId],
  }),
  patient: one(patients, {
    fields: [cases.patientId],
    references: [patients.id],
  }),
  creator: one(users, {
    fields: [cases.createdBy],
    references: [users.id],
  }),
  assignee: one(users, {
    fields: [cases.assignedTo],
    references: [users.id],
  }),
  labReports: many(labReports),
  chatMessages: many(chatMessages),
}));

// TypeScript Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

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
