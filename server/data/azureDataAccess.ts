/**
 * Azure SQL Data Access Layer
 * 
 * Hospital-scoped data operations using Azure SQL Database.
 * All queries enforce hospital_id filtering for data isolation.
 */

import { getPool, generateUUID, sql } from "../db/azure-sql";

// ============================================================================
// HOSPITAL SERVICE
// ============================================================================

export class AzureHospitalService {
    static async findByTenantId(tenantId: string) {
        const pool = await getPool();
        const result = await pool.request()
            .input("tenantId", sql.NVarChar, tenantId)
            .query("SELECT * FROM hospitals WHERE tenant_id = @tenantId");
        return result.recordset[0] || null;
    }

    static async create(data: { entraTenantId: string; name: string; domain?: string }) {
        const pool = await getPool();
        const id = generateUUID();
        await pool.request()
            .input("id", sql.NVarChar, id)
            .input("entraTenantId", sql.NVarChar, data.entraTenantId)
            .input("name", sql.NVarChar, data.name)
            .input("domain", sql.NVarChar, data.domain || null)
            .query(`
                INSERT INTO hospitals (id, tenant_id, name, domain) 
                VALUES (@id, @entraTenantId, @name, @domain)
            `);
        return { id, ...data };
    }
}

// ============================================================================
// USER SERVICE
// ============================================================================

export class AzureUserService {
    static async findByEntraOid(entraOid: string, tenantId: string) {
        const pool = await getPool();
        const result = await pool.request()
            .input("entraOid", sql.NVarChar, entraOid)
            .input("tenantId", sql.NVarChar, tenantId)
            .query("SELECT * FROM users WHERE entra_oid = @entraOid AND tenant_id = @tenantId");
        return result.recordset[0] || null;
    }

    static async create(data: {
        hospitalId: string;
        entraOid: string;
        tenantId: string;
        email: string;
        name?: string;
        role?: string;
    }) {
        const pool = await getPool();
        const id = generateUUID();
        await pool.request()
            .input("id", sql.NVarChar, id)
            .input("hospitalId", sql.NVarChar, data.hospitalId)
            .input("entraOid", sql.NVarChar, data.entraOid)
            .input("tenantId", sql.NVarChar, data.tenantId)
            .input("email", sql.NVarChar, data.email)
            .input("name", sql.NVarChar, data.name || null)
            .input("role", sql.NVarChar, data.role || "doctor")
            .query(`
                INSERT INTO users (id, hospital_id, entra_oid, tenant_id, email, name, role) 
                VALUES (@id, @hospitalId, @entraOid, @tenantId, @email, @name, @role)
            `);
        return { id, ...data };
        return { id, ...data };
    }

    static async updateLastLogin(id: string) {
        const pool = await getPool();
        await pool.request()
            .input("id", sql.NVarChar, id)
            .query("UPDATE users SET last_login = GETUTCDATE() WHERE id = @id");
    }
}

// ============================================================================
// PATIENT SERVICE - Hospital Scoped
// ============================================================================

export class AzurePatientService {
    static async getPatients(hospitalId: string) {
        const pool = await getPool();
        const result = await pool.request()
            .input("hospitalId", sql.NVarChar, hospitalId)
            .query(`
                SELECT * FROM patients 
                WHERE hospital_id = @hospitalId 
                ORDER BY created_at DESC
            `);
        return result.recordset.map(this.mapPatient);
    }

    static async getPatient(hospitalId: string, patientId: string) {
        const pool = await getPool();
        const result = await pool.request()
            .input("hospitalId", sql.NVarChar, hospitalId)
            .input("patientId", sql.NVarChar, patientId)
            .query(`
                SELECT * FROM patients 
                WHERE id = @patientId AND hospital_id = @hospitalId
            `);
        return result.recordset[0] ? this.mapPatient(result.recordset[0]) : null;
    }

    static async createPatient(hospitalId: string, userId: string, data: any) {
        const pool = await getPool();
        const id = generateUUID();

        await pool.request()
            .input("id", sql.NVarChar, id)
            .input("hospitalId", sql.NVarChar, hospitalId)
            .input("firstName", sql.NVarChar, data.firstName)
            .input("lastName", sql.NVarChar, data.lastName)
            .input("dateOfBirth", sql.NVarChar, data.dateOfBirth || null)
            .input("gender", sql.NVarChar, data.gender || null)
            .input("mrn", sql.NVarChar, data.mrn)
            .input("contactPhone", sql.NVarChar, data.contactPhone || null)
            .input("contactEmail", sql.NVarChar, data.contactEmail || null)
            .input("demographics", sql.NVarChar, JSON.stringify(data.demographics || null))
            .input("diagnoses", sql.NVarChar, JSON.stringify(data.diagnoses || []))
            .input("medications", sql.NVarChar, JSON.stringify(data.medications || []))
            .input("allergies", sql.NVarChar, JSON.stringify(data.allergies || []))
            .input("createdByUserId", sql.NVarChar, userId)
            .query(`
                INSERT INTO patients (id, hospital_id, first_name, last_name, date_of_birth, 
                    gender, mrn, contact_phone, contact_email, demographics, diagnoses, 
                    medications, allergies, created_by_user_id)
                VALUES (@id, @hospitalId, @firstName, @lastName, @dateOfBirth, 
                    @gender, @mrn, @contactPhone, @contactEmail, @demographics, @diagnoses,
                    @medications, @allergies, @createdByUserId)
            `);

        return this.getPatient(hospitalId, id);
    }

    static async updatePatient(hospitalId: string, patientId: string, data: any) {
        const pool = await getPool();
        const updates: string[] = [];
        const request = pool.request()
            .input("hospitalId", sql.NVarChar, hospitalId)
            .input("patientId", sql.NVarChar, patientId);

        if (data.firstName) { updates.push("first_name = @firstName"); request.input("firstName", sql.NVarChar, data.firstName); }
        if (data.lastName) { updates.push("last_name = @lastName"); request.input("lastName", sql.NVarChar, data.lastName); }
        if (data.dateOfBirth) { updates.push("date_of_birth = @dateOfBirth"); request.input("dateOfBirth", sql.NVarChar, data.dateOfBirth); }
        if (data.gender) { updates.push("gender = @gender"); request.input("gender", sql.NVarChar, data.gender); }
        if (data.mrn) { updates.push("mrn = @mrn"); request.input("mrn", sql.NVarChar, data.mrn); }

        updates.push("updated_at = GETUTCDATE()");

        await request.query(`
            UPDATE patients SET ${updates.join(", ")} 
            WHERE id = @patientId AND hospital_id = @hospitalId
        `);

        return this.getPatient(hospitalId, patientId);
    }

    static async deletePatient(hospitalId: string, patientId: string) {
        const pool = await getPool();
        const result = await pool.request()
            .input("hospitalId", sql.NVarChar, hospitalId)
            .input("patientId", sql.NVarChar, patientId)
            .query("DELETE FROM patients WHERE id = @patientId AND hospital_id = @hospitalId");
        return (result.rowsAffected[0] || 0) > 0;
    }

    static async searchPatients(hospitalId: string, query: string) {
        const pool = await getPool();
        const result = await pool.request()
            .input("hospitalId", sql.NVarChar, hospitalId)
            .input("query", sql.NVarChar, `%${query}%`)
            .query(`
                SELECT * FROM patients 
                WHERE hospital_id = @hospitalId 
                AND (first_name LIKE @query OR last_name LIKE @query OR mrn LIKE @query)
                ORDER BY created_at DESC
            `);
        return result.recordset.map(this.mapPatient);
    }

    private static mapPatient(row: any) {
        return {
            id: row.id,
            hospitalId: row.hospital_id,
            fhirPatientId: row.fhir_patient_id,
            firstName: row.first_name,
            lastName: row.last_name,
            dateOfBirth: row.date_of_birth,
            gender: row.gender,
            mrn: row.mrn,
            contactPhone: row.contact_phone,
            contactEmail: row.contact_email,
            demographics: row.demographics ? JSON.parse(row.demographics) : null,
            diagnoses: row.diagnoses ? JSON.parse(row.diagnoses) : [],
            medications: row.medications ? JSON.parse(row.medications) : [],
            allergies: row.allergies ? JSON.parse(row.allergies) : [],
            createdByUserId: row.created_by_user_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}

// ============================================================================
// CASE SERVICE - Hospital Scoped
// ============================================================================

export class AzureCaseService {
    static async getCases(hospitalId: string) {
        const pool = await getPool();
        const result = await pool.request()
            .input("hospitalId", sql.NVarChar, hospitalId)
            .query("SELECT * FROM clinical_cases WHERE hospital_id = @hospitalId ORDER BY created_at DESC");
        return result.recordset.map(this.mapCase);
    }

    static async getCase(hospitalId: string, caseId: string) {
        const pool = await getPool();
        const result = await pool.request()
            .input("hospitalId", sql.NVarChar, hospitalId)
            .input("caseId", sql.NVarChar, caseId)
            .query("SELECT * FROM clinical_cases WHERE id = @caseId AND hospital_id = @hospitalId");
        return result.recordset[0] ? this.mapCase(result.recordset[0]) : null;
    }

    static async getCasesByPatient(hospitalId: string, patientId: string) {
        const pool = await getPool();
        const result = await pool.request()
            .input("hospitalId", sql.NVarChar, hospitalId)
            .input("patientId", sql.NVarChar, patientId)
            .query("SELECT * FROM clinical_cases WHERE patient_id = @patientId AND hospital_id = @hospitalId ORDER BY created_at DESC");
        return result.recordset.map(this.mapCase);
    }

    static async createCase(hospitalId: string, userId: string, data: any) {
        const pool = await getPool();
        const id = generateUUID();

        await pool.request()
            .input("id", sql.NVarChar, id)
            .input("hospitalId", sql.NVarChar, hospitalId)
            .input("patientId", sql.NVarChar, data.patientId)
            .input("assignedDoctorId", sql.NVarChar, userId)
            .input("caseType", sql.NVarChar, data.caseType || "general")
            .input("chiefComplaint", sql.NVarChar, data.description || data.chiefComplaint || null)
            .input("status", sql.NVarChar, data.status || "active")
            .input("priority", sql.NVarChar, data.priority || "medium")
            .query(`
                INSERT INTO clinical_cases (id, hospital_id, patient_id, assigned_doctor_id, case_type, chief_complaint, status, priority)
                VALUES (@id, @hospitalId, @patientId, @assignedDoctorId, @caseType, @chiefComplaint, @status, @priority)
            `);

        return this.getCase(hospitalId, id);
    }

    static async updateCase(hospitalId: string, caseId: string, data: any) {
        const pool = await getPool();
        await pool.request()
            .input("hospitalId", sql.NVarChar, hospitalId)
            .input("caseId", sql.NVarChar, caseId)
            .input("status", sql.NVarChar, data.status || null)
            .input("priority", sql.NVarChar, data.priority || null)
            .input("diagnosis", sql.NVarChar, data.diagnosis || data.aiAnalysis || null)
            .input("treatmentPlan", sql.NVarChar, data.treatmentPlan || null)
            .query(`
                UPDATE clinical_cases SET 
                    status = COALESCE(@status, status),
                    priority = COALESCE(@priority, priority),
                    diagnosis = COALESCE(@diagnosis, diagnosis),
                    treatment_plan = COALESCE(@treatmentPlan, treatment_plan),
                    updated_at = GETUTCDATE()
                WHERE id = @caseId AND hospital_id = @hospitalId
            `);
        return this.getCase(hospitalId, caseId);
    }

    static async getDashboardStats(hospitalId: string) {
        const pool = await getPool();

        const totalPatients = await pool.request()
            .input("hospitalId", sql.NVarChar, hospitalId)
            .query("SELECT COUNT(*) as count FROM patients WHERE hospital_id = @hospitalId");

        const totalCases = await pool.request()
            .input("hospitalId", sql.NVarChar, hospitalId)
            .query("SELECT COUNT(*) as count FROM clinical_cases WHERE hospital_id = @hospitalId");

        const activeCases = await pool.request()
            .input("hospitalId", sql.NVarChar, hospitalId)
            .query("SELECT COUNT(*) as count FROM clinical_cases WHERE hospital_id = @hospitalId AND status = 'active'");

        const recentCases = await pool.request()
            .input("hospitalId", sql.NVarChar, hospitalId)
            .query("SELECT TOP 10 * FROM clinical_cases WHERE hospital_id = @hospitalId ORDER BY created_at DESC");

        return {
            totalPatients: totalPatients.recordset[0]?.count || 0,
            totalCases: totalCases.recordset[0]?.count || 0,
            activeCases: activeCases.recordset[0]?.count || 0,
            recentCases: recentCases.recordset.map(this.mapCase)
        };
    }

    private static mapCase(row: any) {
        return {
            id: row.id,
            hospitalId: row.hospital_id,
            patientId: row.patient_id,
            caseType: row.case_type,
            title: row.title,
            description: row.description,
            status: row.status,
            priority: row.priority,
            aiAnalysis: row.ai_analysis ? JSON.parse(row.ai_analysis) : null,
            createdByUserId: row.created_by_user_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}

// ============================================================================
// AUDIT SERVICE - Hospital Scoped
// ============================================================================

export class AzureAuditService {
    static async createAuditLog(hospitalId: string, userId: string, entraOid: string, data: {
        eventType: string;
        resourceType?: string;
        resourceId?: string;
        action?: string;
        details?: any;
        ipAddress?: string;
        userAgent?: string;
    }) {
        try {
            const pool = await getPool();
            const id = generateUUID();

            await pool.request()
                .input("id", sql.NVarChar, id)
                .input("hospitalId", sql.NVarChar, hospitalId)
                .input("userId", sql.NVarChar, userId)
                .input("entraOid", sql.NVarChar, entraOid)
                .input("eventType", sql.NVarChar, data.eventType)
                .input("resourceType", sql.NVarChar, data.resourceType || null)
                .input("resourceId", sql.NVarChar, data.resourceId || null)
                .input("action", sql.NVarChar, data.action || null)
                .input("details", sql.NVarChar, data.details ? JSON.stringify(data.details) : null)
                .input("ipAddress", sql.NVarChar, data.ipAddress || null)
                .input("userAgent", sql.NVarChar, data.userAgent || null)
                .query(`
                    INSERT INTO audit_logs (id, hospital_id, user_id, entra_oid, event_type, resource_type, resource_id, action, details, ip_address, user_agent)
                    VALUES (@id, @hospitalId, @userId, @entraOid, @eventType, @resourceType, @resourceId, @action, @details, @ipAddress, @userAgent)
                `);

            return { id };
        } catch (error) {
            // Audit logging is optional - don't block operations if it fails
            console.error('[AUDIT] Failed to create audit log:', error);
            return { id: null };
        }
    }

    static async getAuditLogs(hospitalId: string, limit: number = 100) {
        const pool = await getPool();
        const result = await pool.request()
            .input("hospitalId", sql.NVarChar, hospitalId)
            .input("limit", sql.Int, limit)
            .query(`
                SELECT TOP (@limit) * FROM audit_logs 
                WHERE hospital_id = @hospitalId 
                ORDER BY created_at DESC
            `);
        return result.recordset;
    }
}

// ============================================================================
// LAB REPORT SERVICE
// ============================================================================

export class AzureLabReportService {
    static async getLabReportsByPatient(hospitalId: string, patientId: string) {
        const pool = await getPool();
        const result = await pool.request()
            .input("hospitalId", sql.NVarChar, hospitalId)
            .input("patientId", sql.NVarChar, patientId)
            .query(`
                SELECT * FROM lab_reports 
                WHERE hospital_id = @hospitalId AND patient_id = @patientId
                ORDER BY report_date DESC
            `);
        return result.recordset;
    }

    static async createLabReport(hospitalId: string, userId: string, data: any) {
        const pool = await getPool();
        const id = generateUUID();

        await pool.request()
            .input("id", sql.NVarChar, id)
            .input("hospitalId", sql.NVarChar, hospitalId)
            .input("patientId", sql.NVarChar, data.patientId)
            .input("caseId", sql.NVarChar, data.caseId || null)
            .input("reportType", sql.NVarChar, data.reportType || null)
            .input("results", sql.NVarChar, JSON.stringify(data.results || null))
            .input("status", sql.NVarChar, data.status || "pending")
            .input("orderedByUserId", sql.NVarChar, userId)
            .query(`
                INSERT INTO lab_reports (id, hospital_id, patient_id, case_id, report_type, results, status, ordered_by_user_id, report_date)
                VALUES (@id, @hospitalId, @patientId, @caseId, @reportType, @results, @status, @orderedByUserId, GETUTCDATE())
            `);

        return { id };
    }
}

// ============================================================================
// CHAT SERVICE
// ============================================================================

export class AzureChatService {
    static async getChatMessagesByCase(hospitalId: string, caseId: string) {
        const pool = await getPool();
        const result = await pool.request()
            .input("hospitalId", sql.NVarChar, hospitalId)
            .input("caseId", sql.NVarChar, caseId)
            .query(`
                SELECT * FROM chat_messages 
                WHERE hospital_id = @hospitalId AND case_id = @caseId
                ORDER BY created_at ASC
            `);
        return result.recordset;
    }

    static async createChatMessage(hospitalId: string, userId: string, data: any) {
        const pool = await getPool();
        const id = generateUUID();

        await pool.request()
            .input("id", sql.NVarChar, id)
            .input("hospitalId", sql.NVarChar, hospitalId)
            .input("caseId", sql.NVarChar, data.caseId || null)
            .input("userId", sql.NVarChar, userId)
            .input("role", sql.NVarChar, data.role || "user")
            .input("content", sql.NVarChar, data.content)
            .input("metadata", sql.NVarChar, data.metadata ? JSON.stringify(data.metadata) : null)
            .query(`
                INSERT INTO chat_messages (id, hospital_id, case_id, user_id, role, content, metadata)
                VALUES (@id, @hospitalId, @caseId, @userId, @role, @content, @metadata)
            `);

        return { id };
    }
}
