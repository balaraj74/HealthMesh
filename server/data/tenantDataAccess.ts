/**
 * Multi-Tenant Data Access Layer
 * All queries enforce tenant_id isolation
 * NO cross-tenant access possible
 */

import { db } from "../db/index";
import {
  organizations,
  users,
  patients,
  cases,
  labReports,
  chatMessages,
  auditLogs,
  type Patient,
  type InsertPatient,
  type Case,
  type InsertCase,
  type LabReport,
  type InsertLabReport,
  type ChatMessage,
  type InsertChatMessage,
  type AuditLog,
  type InsertAuditLog,
} from "../../db/multi-tenant-schema";
import { eq, and, desc, sql } from "drizzle-orm";

// ============================================================================
// PATIENT OPERATIONS - Tenant Scoped
// ============================================================================

export class TenantPatientService {
  /**
   * Get all patients for a tenant
   */
  static async getPatients(tenantId: string): Promise<Patient[]> {
    return await db
      .select()
      .from(patients)
      .where(eq(patients.tenantId, tenantId))
      .orderBy(desc(patients.createdAt));
  }

  /**
   * Get a single patient by ID (tenant-scoped)
   */
  static async getPatient(tenantId: string, patientId: string): Promise<Patient | null> {
    const result = await db
      .select()
      .from(patients)
      .where(and(eq(patients.id, patientId), eq(patients.tenantId, tenantId)))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Create a new patient (tenant-scoped)
   */
  static async createPatient(
    tenantId: string,
    userId: string,
    data: InsertPatient
  ): Promise<Patient> {
    // 1. Create patient in Azure FHIR Service
    // This returns the FHIR Patient ID which we link to our SQL record
    let fhirPatientId: string | undefined;

    try {
      const { getAzureFHIR } = await import("../azure/fhir-client");
      const fhirClient = getAzureFHIR();

      // We need to construct a full patient object for the FHIR client
      // Since 'data' is InsertPatient, we'll map it to the expected format
      const patientForFhir: any = {
        demographics: data.demographics,
        diagnoses: data.diagnoses || [],
        medications: data.medications || [],
        allergies: data.allergies || [],
      };

      const result = await fhirClient.createPatientBundle(patientForFhir);
      fhirPatientId = result.patientId;
      console.log(`[FHIR] Created patient in Azure FHIR Service: ${fhirPatientId}`);
    } catch (error) {
      console.error("[FHIR] Failed to create patient in FHIR service:", error);
      // We proceed to create in SQL even if FHIR fails, but log the error
      // In a strict mode, we might want to throw here
    }

    // 2. Create patient in SQL Database (Tenant Scoped)
    const [patient] = await db
      .insert(patients)
      .values({
        ...data,
        tenantId, // CRITICAL: Force tenant_id
        createdBy: userId,
        fhirPatientId, // Link to FHIR resource
      })
      .returning();

    return patient;
  }

  /**
   * Update patient (tenant-scoped)
   */
  static async updatePatient(
    tenantId: string,
    patientId: string,
    data: Partial<InsertPatient>
  ): Promise<Patient | null> {
    const [updated] = await db
      .update(patients)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(patients.id, patientId), eq(patients.tenantId, tenantId)))
      .returning();

    return updated || null;
  }

  /**
   * Delete patient (tenant-scoped)
   */
  static async deletePatient(tenantId: string, patientId: string): Promise<boolean> {
    const result = await db
      .delete(patients)
      .where(and(eq(patients.id, patientId), eq(patients.tenantId, tenantId)))
      .returning();

    return result.length > 0;
  }

  /**
   * Search patients by name or MRN (tenant-scoped)
   */
  static async searchPatients(tenantId: string, query: string): Promise<Patient[]> {
    return await db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.tenantId, tenantId),
          sql`(
            lower(${patients.firstName}) LIKE lower(${`%${query}%`}) OR
            lower(${patients.lastName}) LIKE lower(${`%${query}%`}) OR
            lower(${patients.mrn}) LIKE lower(${`%${query}%`})
          )`
        )
      )
      .orderBy(desc(patients.createdAt));
  }
}

// ============================================================================
// CASE OPERATIONS - Tenant Scoped
// ============================================================================

export class TenantCaseService {
  /**
   * Get all cases for a tenant
   */
  static async getCases(tenantId: string): Promise<Case[]> {
    return await db
      .select()
      .from(cases)
      .where(eq(cases.tenantId, tenantId))
      .orderBy(desc(cases.createdAt));
  }

  /**
   * Get a single case by ID (tenant-scoped)
   */
  static async getCase(tenantId: string, caseId: string): Promise<Case | null> {
    const result = await db
      .select()
      .from(cases)
      .where(and(eq(cases.id, caseId), eq(cases.tenantId, tenantId)))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get cases for a specific patient (tenant-scoped)
   */
  static async getCasesByPatient(tenantId: string, patientId: string): Promise<Case[]> {
    return await db
      .select()
      .from(cases)
      .where(and(eq(cases.patientId, patientId), eq(cases.tenantId, tenantId)))
      .orderBy(desc(cases.createdAt));
  }

  /**
   * Create a new case (tenant-scoped)
   */
  static async createCase(
    tenantId: string,
    userId: string,
    data: InsertCase
  ): Promise<Case> {
    const [newCase] = await db
      .insert(cases)
      .values({
        ...data,
        tenantId, // CRITICAL: Force tenant_id
        createdBy: userId,
      })
      .returning();

    return newCase;
  }

  /**
   * Update case (tenant-scoped)
   */
  static async updateCase(
    tenantId: string,
    caseId: string,
    data: Partial<InsertCase>
  ): Promise<Case | null> {
    const [updated] = await db
      .update(cases)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(cases.id, caseId), eq(cases.tenantId, tenantId)))
      .returning();

    return updated || null;
  }

  /**
   * Delete case (tenant-scoped)
   */
  static async deleteCase(tenantId: string, caseId: string): Promise<boolean> {
    const result = await db
      .delete(cases)
      .where(and(eq(cases.id, caseId), eq(cases.tenantId, tenantId)))
      .returning();

    return result.length > 0;
  }

  /**
   * Get dashboard statistics (tenant-scoped)
   */
  static async getDashboardStats(tenantId: string) {
    const [totalPatients] = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients)
      .where(eq(patients.tenantId, tenantId));

    const [totalCases] = await db
      .select({ count: sql<number>`count(*)` })
      .from(cases)
      .where(eq(cases.tenantId, tenantId));

    const [activeCases] = await db
      .select({ count: sql<number>`count(*)` })
      .from(cases)
      .where(and(eq(cases.tenantId, tenantId), eq(cases.status, "active")));

    const recentCases = await db
      .select()
      .from(cases)
      .where(eq(cases.tenantId, tenantId))
      .orderBy(desc(cases.createdAt))
      .limit(10);

    return {
      totalPatients: Number(totalPatients?.count || 0),
      totalCases: Number(totalCases?.count || 0),
      activeCases: Number(activeCases?.count || 0),
      recentCases,
    };
  }
}

// ============================================================================
// LAB REPORT OPERATIONS - Tenant Scoped
// ============================================================================

export class TenantLabReportService {
  /**
   * Get lab reports for a patient (tenant-scoped)
   */
  static async getLabReportsByPatient(
    tenantId: string,
    patientId: string
  ): Promise<LabReport[]> {
    return await db
      .select()
      .from(labReports)
      .where(and(eq(labReports.patientId, patientId), eq(labReports.tenantId, tenantId)))
      .orderBy(desc(labReports.reportDate));
  }

  /**
   * Create lab report (tenant-scoped)
   */
  static async createLabReport(
    tenantId: string,
    userId: string,
    data: InsertLabReport
  ): Promise<LabReport> {
    const [report] = await db
      .insert(labReports)
      .values({
        ...data,
        tenantId, // CRITICAL: Force tenant_id
        orderedBy: userId,
      })
      .returning();

    return report;
  }
}

// ============================================================================
// CHAT OPERATIONS - Tenant Scoped
// ============================================================================

export class TenantChatService {
  /**
   * Get chat messages for a case (tenant-scoped)
   */
  static async getChatMessagesByCase(
    tenantId: string,
    caseId: string
  ): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.caseId, caseId), eq(chatMessages.tenantId, tenantId)))
      .orderBy(desc(chatMessages.createdAt));
  }

  /**
   * Create chat message (tenant-scoped)
   */
  static async createChatMessage(
    tenantId: string,
    userId: string,
    data: InsertChatMessage
  ): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values({
        ...data,
        tenantId, // CRITICAL: Force tenant_id
        userId,
      })
      .returning();

    return message;
  }
}

// ============================================================================
// AUDIT LOG OPERATIONS - Tenant Scoped
// ============================================================================

export class TenantAuditService {
  /**
   * Create audit log entry (tenant-scoped)
   */
  static async createAuditLog(
    tenantId: string,
    userId: string,
    userOid: string,
    data: {
      eventType: string;
      resourceType?: string;
      resourceId?: string;
      action?: string;
      details?: any;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<AuditLog> {
    const [log] = await db
      .insert(auditLogs)
      .values({
        tenantId, // CRITICAL: Force tenant_id
        userId,
        userOid,
        ...data,
      })
      .returning();

    return log;
  }

  /**
   * Get audit logs for tenant (tenant-scoped)
   */
  static async getAuditLogs(
    tenantId: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }
}
