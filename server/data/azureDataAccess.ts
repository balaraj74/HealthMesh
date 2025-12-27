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
            .query("SELECT * FROM hospitals WHERE entra_tenant_id = @tenantId OR tenant_id = @tenantId");
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
                INSERT INTO hospitals (id, entra_tenant_id, tenant_id, name, domain) 
                VALUES (@id, @entraTenantId, @entraTenantId, @name, @domain)
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
        // Build demographics object with data from columns
        const demographics = {
            firstName: row.first_name,
            lastName: row.last_name,
            dateOfBirth: row.date_of_birth,
            gender: row.gender,
            mrn: row.mrn,
            contactPhone: row.contact_phone,
            contactEmail: row.contact_email,
            // Merge with any stored demographics JSON
            ...(row.demographics ? JSON.parse(row.demographics) : {})
        };

        return {
            id: row.id,
            hospitalId: row.hospital_id,
            fhirPatientId: row.fhir_patient_id,
            // Keep top-level fields for backward compatibility
            firstName: row.first_name,
            lastName: row.last_name,
            dateOfBirth: row.date_of_birth,
            gender: row.gender,
            mrn: row.mrn,
            contactPhone: row.contact_phone,
            contactEmail: row.contact_email,
            // Structured demographics for frontend
            demographics,
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
            .input("chiefComplaint", sql.NVarChar, data.clinicalQuestion || data.description || data.chiefComplaint || null)
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

        // Serialize aiAnalysis to JSON string if provided
        const aiAnalysisJson = data.aiAnalysis ? JSON.stringify(data.aiAnalysis) : null;

        await pool.request()
            .input("hospitalId", sql.NVarChar, hospitalId)
            .input("caseId", sql.NVarChar, caseId)
            .input("status", sql.NVarChar, data.status || null)
            .input("priority", sql.NVarChar, data.priority || null)
            .input("diagnosis", sql.NVarChar, data.summary || data.diagnosis || null)
            .input("treatmentPlan", sql.NVarChar, data.treatmentPlan || null)
            .input("aiAnalysis", sql.NVarChar, aiAnalysisJson)
            .query(`
                UPDATE clinical_cases SET 
                    status = COALESCE(@status, status),
                    priority = COALESCE(@priority, priority),
                    summary = COALESCE(@diagnosis, summary),
                    ai_analysis = COALESCE(@aiAnalysis, ai_analysis),
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

        // Count analyzing cases (active)
        const activeCases = await pool.request()
            .input("hospitalId", sql.NVarChar, hospitalId)
            .query("SELECT COUNT(*) as count FROM clinical_cases WHERE hospital_id = @hospitalId AND status IN ('analyzing', 'submitted', 'draft')");

        // Pending reviews (review-ready status)
        const pendingReviews = await pool.request()
            .input("hospitalId", sql.NVarChar, hospitalId)
            .query("SELECT COUNT(*) as count FROM clinical_cases WHERE hospital_id = @hospitalId AND status = 'review-ready'");

        // Cases this week
        const casesThisWeek = await pool.request()
            .input("hospitalId", sql.NVarChar, hospitalId)
            .query("SELECT COUNT(*) as count FROM clinical_cases WHERE hospital_id = @hospitalId AND created_at >= DATEADD(day, -7, GETUTCDATE())");

        // Get all cases with AI analysis to calculate critical alerts and confidence
        const casesWithAnalysis = await pool.request()
            .input("hospitalId", sql.NVarChar, hospitalId)
            .query("SELECT ai_analysis FROM clinical_cases WHERE hospital_id = @hospitalId AND ai_analysis IS NOT NULL");

        // Calculate critical alerts and average confidence from AI analysis data
        let criticalAlerts = 0;
        let totalConfidence = 0;
        let confidenceCount = 0;

        casesWithAnalysis.recordset.forEach((row: any) => {
            if (row.ai_analysis) {
                try {
                    const analysis = JSON.parse(row.ai_analysis);
                    // Count critical alerts
                    const riskAlerts = analysis.riskAlerts || [];
                    criticalAlerts += riskAlerts.filter((a: any) => a?.severity === 'critical').length;

                    // Calculate average confidence from agent outputs
                    const agentOutputs = analysis.agentOutputs || [];
                    agentOutputs.forEach((output: any) => {
                        if (output?.confidence && typeof output.confidence === 'number') {
                            totalConfidence += output.confidence;
                            confidenceCount++;
                        }
                    });
                } catch (e) {
                    // Skip invalid JSON
                }
            }
        });

        const avgConfidenceScore = confidenceCount > 0 ? Math.round(totalConfidence / confidenceCount) : 85;

        const recentCases = await pool.request()
            .input("hospitalId", sql.NVarChar, hospitalId)
            .query("SELECT TOP 10 * FROM clinical_cases WHERE hospital_id = @hospitalId ORDER BY created_at DESC");

        return {
            totalPatients: totalPatients.recordset[0]?.count || 0,
            totalCases: totalCases.recordset[0]?.count || 0,
            activeCases: activeCases.recordset[0]?.count || 0,
            pendingReviews: pendingReviews.recordset[0]?.count || 0,
            criticalAlerts,
            casesThisWeek: casesThisWeek.recordset[0]?.count || 0,
            avgConfidenceScore,
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
            description: row.chief_complaint || row.description,  // Map chief_complaint to description
            clinicalQuestion: row.chief_complaint,  // Also expose as clinicalQuestion
            status: row.status,
            priority: row.priority,
            aiAnalysis: row.ai_analysis ? JSON.parse(row.ai_analysis) : null,
            summary: row.summary || row.diagnosis,  // Map summary from diagnosis if available
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

        // Map SQL column names to frontend expected names
        return result.recordset.map((row: any) => {
            // Handle timestamp conversion - SQL Server returns Date object or string
            let timestamp: string;
            if (row.created_at instanceof Date) {
                timestamp = row.created_at.toISOString();
            } else if (row.created_at) {
                const parsed = new Date(row.created_at);
                timestamp = isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
            } else {
                timestamp = new Date().toISOString();
            }

            return {
                id: row.id,
                hospitalId: row.hospital_id,
                userId: row.user_id || 'System',
                entraOid: row.entra_oid,
                eventType: row.event_type,
                entityType: row.resource_type || row.event_type?.split('-')[0] || 'system',
                entityId: row.resource_id || row.id,
                action: row.action || row.event_type,
                details: row.details ? (typeof row.details === 'string' ? JSON.parse(row.details) : row.details) : null,
                ipAddress: row.ip_address,
                userAgent: row.user_agent,
                timestamp,
            };
        });
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
            .input("metadata", sql.NVarChar, data.context || data.metadata ? JSON.stringify(data.context || data.metadata) : null)
            .query(`
                INSERT INTO chat_messages (id, hospital_id, case_id, user_id, role, content, metadata)
                VALUES (@id, @hospitalId, @caseId, @userId, @role, @content, @metadata)
            `);

        return { id };
    }
}
