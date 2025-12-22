/**
 * Hospital-Scoped Data Access Layer
 * 
 * CRITICAL SECURITY:
 * - ALL queries MUST include hospital_id filtering
 * - No user should EVER see another hospital's data
 * - Hospital ID comes from verified Entra token, NOT from client
 * 
 * PATTERN:
 * Every query follows: .where(eq(table.hospitalId, hospitalId))
 * Hospital ID is NEVER accepted from frontend requests
 */

import { db } from "../db/index";
import {
    hospitals,
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
} from "../../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// ============================================================================
// PATIENT SERVICE - Hospital Scoped
// ============================================================================

export class HospitalPatientService {
    /**
     * Get all patients for a hospital
     */
    static async getPatients(hospitalId: string): Promise<Patient[]> {
        return await db
            .select()
            .from(patients)
            .where(eq(patients.hospitalId, hospitalId))
            .orderBy(desc(patients.createdAt));
    }

    /**
     * Get a single patient by ID (hospital-scoped)
     * Returns null if patient doesn't exist or belongs to different hospital
     */
    static async getPatient(hospitalId: string, patientId: string): Promise<Patient | null> {
        const [patient] = await db
            .select()
            .from(patients)
            .where(and(
                eq(patients.id, patientId),
                eq(patients.hospitalId, hospitalId)  // CRITICAL: Hospital isolation
            ))
            .limit(1);

        return patient || null;
    }

    /**
     * Create a new patient
     * 
     * SECURITY:
     * - hospitalId comes from verified token, NOT from request body
     * - createdByUserId comes from verified token, NOT from request body
     * - Frontend CANNOT specify hospital_id
     */
    static async createPatient(
        hospitalId: string,
        userId: string,
        data: Omit<InsertPatient, 'hospitalId' | 'createdByUserId'>
    ): Promise<Patient> {
        console.log(`[DATA] Creating patient in hospital: ${hospitalId.substring(0, 8)}...`);

        const [patient] = await db
            .insert(patients)
            .values({
                ...data,
                hospitalId,        // FORCED from token - never from client
                createdByUserId: userId,  // FORCED from token - never from client
            })
            .returning();

        console.log(`✅ [DATA] Patient created: ${patient.id} by user ${userId.substring(0, 8)}...`);
        return patient;
    }

    /**
     * Update patient (hospital-scoped)
     */
    static async updatePatient(
        hospitalId: string,
        patientId: string,
        data: Partial<Omit<InsertPatient, 'hospitalId' | 'createdByUserId'>>
    ): Promise<Patient | null> {
        const [updated] = await db
            .update(patients)
            .set({ ...data, updatedAt: new Date() })
            .where(and(
                eq(patients.id, patientId),
                eq(patients.hospitalId, hospitalId)  // CRITICAL: Hospital isolation
            ))
            .returning();

        return updated || null;
    }

    /**
     * Delete patient (hospital-scoped)
     */
    static async deletePatient(hospitalId: string, patientId: string): Promise<boolean> {
        const result = await db
            .delete(patients)
            .where(and(
                eq(patients.id, patientId),
                eq(patients.hospitalId, hospitalId)  // CRITICAL: Hospital isolation
            ))
            .returning();

        return result.length > 0;
    }

    /**
     * Search patients by name or MRN (hospital-scoped)
     */
    static async searchPatients(hospitalId: string, query: string): Promise<Patient[]> {
        return await db
            .select()
            .from(patients)
            .where(and(
                eq(patients.hospitalId, hospitalId),  // CRITICAL: Hospital isolation
                sql`(
          lower(${patients.firstName}) LIKE lower(${`%${query}%`}) OR
          lower(${patients.lastName}) LIKE lower(${`%${query}%`}) OR
          lower(${patients.mrn}) LIKE lower(${`%${query}%`})
        )`
            ))
            .orderBy(desc(patients.createdAt));
    }
}

// ============================================================================
// CASE SERVICE - Hospital Scoped
// ============================================================================

export class HospitalCaseService {
    /**
     * Get all cases for a hospital
     */
    static async getCases(hospitalId: string): Promise<Case[]> {
        return await db
            .select()
            .from(cases)
            .where(eq(cases.hospitalId, hospitalId))
            .orderBy(desc(cases.createdAt));
    }

    /**
     * Get a single case by ID (hospital-scoped)
     */
    static async getCase(hospitalId: string, caseId: string): Promise<Case | null> {
        const [result] = await db
            .select()
            .from(cases)
            .where(and(
                eq(cases.id, caseId),
                eq(cases.hospitalId, hospitalId)
            ))
            .limit(1);

        return result || null;
    }

    /**
     * Get cases for a specific patient (hospital-scoped)
     */
    static async getCasesByPatient(hospitalId: string, patientId: string): Promise<Case[]> {
        return await db
            .select()
            .from(cases)
            .where(and(
                eq(cases.patientId, patientId),
                eq(cases.hospitalId, hospitalId)
            ))
            .orderBy(desc(cases.createdAt));
    }

    /**
     * Create a new case
     */
    static async createCase(
        hospitalId: string,
        userId: string,
        data: Omit<InsertCase, 'hospitalId' | 'createdByUserId'>
    ): Promise<Case> {
        const [newCase] = await db
            .insert(cases)
            .values({
                ...data,
                hospitalId,
                createdByUserId: userId,
            })
            .returning();

        return newCase;
    }

    /**
     * Update case (hospital-scoped)
     */
    static async updateCase(
        hospitalId: string,
        caseId: string,
        data: Partial<Omit<InsertCase, 'hospitalId' | 'createdByUserId'>>
    ): Promise<Case | null> {
        const [updated] = await db
            .update(cases)
            .set({ ...data, updatedAt: new Date() })
            .where(and(
                eq(cases.id, caseId),
                eq(cases.hospitalId, hospitalId)
            ))
            .returning();

        return updated || null;
    }

    /**
     * Get dashboard statistics (hospital-scoped)
     */
    static async getDashboardStats(hospitalId: string) {
        const [totalPatients] = await db
            .select({ count: sql<number>`count(*)` })
            .from(patients)
            .where(eq(patients.hospitalId, hospitalId));

        const [totalCases] = await db
            .select({ count: sql<number>`count(*)` })
            .from(cases)
            .where(eq(cases.hospitalId, hospitalId));

        const [activeCases] = await db
            .select({ count: sql<number>`count(*)` })
            .from(cases)
            .where(and(
                eq(cases.hospitalId, hospitalId),
                eq(cases.status, "active")
            ));

        const recentCases = await db
            .select()
            .from(cases)
            .where(eq(cases.hospitalId, hospitalId))
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
// LAB REPORT SERVICE - Hospital Scoped
// ============================================================================

export class HospitalLabReportService {
    static async getLabReportsByPatient(
        hospitalId: string,
        patientId: string
    ): Promise<LabReport[]> {
        return await db
            .select()
            .from(labReports)
            .where(and(
                eq(labReports.patientId, patientId),
                eq(labReports.hospitalId, hospitalId)
            ))
            .orderBy(desc(labReports.reportDate));
    }

    static async createLabReport(
        hospitalId: string,
        userId: string,
        data: Omit<InsertLabReport, 'hospitalId' | 'orderedByUserId'>
    ): Promise<LabReport> {
        const [report] = await db
            .insert(labReports)
            .values({
                ...data,
                hospitalId,
                orderedByUserId: userId,
            })
            .returning();

        return report;
    }
}

// ============================================================================
// CHAT SERVICE - Hospital Scoped
// ============================================================================

export class HospitalChatService {
    static async getChatMessagesByCase(
        hospitalId: string,
        caseId: string
    ): Promise<ChatMessage[]> {
        return await db
            .select()
            .from(chatMessages)
            .where(and(
                eq(chatMessages.caseId, caseId),
                eq(chatMessages.hospitalId, hospitalId)
            ))
            .orderBy(desc(chatMessages.createdAt));
    }

    static async createChatMessage(
        hospitalId: string,
        userId: string,
        data: Omit<InsertChatMessage, 'hospitalId' | 'userId'>
    ): Promise<ChatMessage> {
        const [message] = await db
            .insert(chatMessages)
            .values({
                ...data,
                hospitalId,
                userId,
            })
            .returning();

        return message;
    }
}

// ============================================================================
// AUDIT SERVICE - Hospital Scoped
// ============================================================================

export class HospitalAuditService {
    static async createAuditLog(
        hospitalId: string,
        userId: string,
        entraOid: string,
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
                hospitalId,
                userId,
                entraOid,
                ...data,
            })
            .returning();

        return log;
    }

    static async getAuditLogs(
        hospitalId: string,
        limit: number = 100
    ): Promise<AuditLog[]> {
        return await db
            .select()
            .from(auditLogs)
            .where(eq(auditLogs.hospitalId, hospitalId))
            .orderBy(desc(auditLogs.createdAt))
            .limit(limit);
    }
}

// ============================================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================================
export const TenantPatientService = HospitalPatientService;
export const TenantCaseService = HospitalCaseService;
export const TenantLabReportService = HospitalLabReportService;
export const TenantChatService = HospitalChatService;
export const TenantAuditService = HospitalAuditService;
