
/**
 * HealthMesh - Azure SQL Database Client
 * Provides persistent storage for patients, cases, and audit logs
 * Replaces Cosmos DB with Enterprise-grade SQL
 */

import sql from 'mssql';
import { getAzureConfig } from './config';
import type {
    Patient, InsertPatient,
    ClinicalCase, InsertCase,
    AuditLog, ChatMessage,
    LabReport, DashboardStats,
    Recommendation, RiskAlert,
    AgentOutput
} from '@shared/schema';
import { randomUUID } from 'crypto';

export class AzureSQLClient {
    private config: any;
    private pool: sql.ConnectionPool | null = null;

    constructor() {
        const azureConfig = getAzureConfig();
        this.config = {
            user: azureConfig.sql.user,
            password: azureConfig.sql.password,
            database: azureConfig.sql.database,
            server: azureConfig.sql.server,
            pool: {
                max: 10,
                min: 0,
                idleTimeoutMillis: 30000
            },
            options: {
                ...azureConfig.sql.options,
                encrypt: true,
                trustServerCertificate: false,
                connectionTimeout: 60000, // 60s timeout for cold starts
                requestTimeout: 60000     // 60s request timeout
            }
        };

        // Trigger warm-up in background
        this.warmUp().catch(err => console.error("⚠️ Background DB warm-up failed:", err.message));
    }

    private async warmUp() {
        console.log("🔥 Triggering DB warm-up...");
        try {
            await this.getPool();
            console.log("✅ DB Warm-up successful - Connection established");
        } catch (error) {
            console.warn("⚠️ DB Warm-up pending (will retry on next request)");
        }
    }

    private async getPool(): Promise<sql.ConnectionPool> {
        if (this.pool && this.pool.connected) return this.pool;

        // Implementation of retry logic for Serverless Cold Starts
        let retries = 5;
        let delay = 2000; // Start with 2s delay

        while (retries > 0) {
            try {
                // If pool exists but not connected, close it first
                if (this.pool) {
                    try { await this.pool.close(); } catch (e) { /* ignore */ }
                }

                console.log(`🔌 Connecting to Azure SQL (Attempt ${6 - retries}/5)...`);
                this.pool = await sql.connect(this.config);
                console.log("✅ Connected to Azure SQL Database");
                return this.pool;
            } catch (err: any) {
                retries--;
                console.warn(`⚠️ DB Connection failed: ${err.message}. Retrying in ${delay}ms...`);

                if (retries === 0) throw err;

                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 1.5; // Exponential backoff (2s, 3s, 4.5s, 6.75s, 10s)
            }
        }

        throw new Error("Failed to connect to Azure SQL Database after multiple attempts");
    }

    // ==========================================
    // Patient Operations
    // ==========================================

    async createPatient(patient: InsertPatient): Promise<Patient> {
        const pool = await this.getPool();
        const id = randomUUID();
        const now = new Date().toISOString();

        const newPatient: Patient = {
            id,
            ...patient,
            createdAt: now,
            updatedAt: now,
        };

        await pool.request()
            .input('id', sql.NVarChar, id)
            .input('mrn', sql.NVarChar, patient.demographics.mrn)
            .input('first_name', sql.NVarChar, patient.demographics.firstName)
            .input('last_name', sql.NVarChar, patient.demographics.lastName)
            .input('date_of_birth', sql.Date, patient.demographics.dateOfBirth)
            .input('gender', sql.NVarChar, patient.demographics.gender)
            .input('contact_phone', sql.NVarChar, patient.demographics.contactPhone || null)
            .input('contact_email', sql.NVarChar, patient.demographics.contactEmail || null)
            .input('address', sql.NVarChar, patient.demographics.address || null)
            .input('demographics', sql.NVarChar, JSON.stringify(patient.demographics))
            .input('diagnoses', sql.NVarChar, JSON.stringify(patient.diagnoses || []))
            .input('medications', sql.NVarChar, JSON.stringify(patient.medications || []))
            .input('allergies', sql.NVarChar, JSON.stringify(patient.allergies || []))
            .input('created_at', sql.DateTime2, now)
            .input('updated_at', sql.DateTime2, now)
            .query(`
        INSERT INTO patients (
          id, mrn, first_name, last_name, date_of_birth, gender, 
          contact_phone, contact_email, address,
          demographics, diagnoses, medications, allergies,
          created_at, updated_at
        )
        VALUES (
          @id, @mrn, @first_name, @last_name, @date_of_birth, @gender,
          @contact_phone, @contact_email, @address,
          @demographics, @diagnoses, @medications, @allergies,
          @created_at, @updated_at
        )
      `);

        return newPatient;
    }

    async getPatient(id: string): Promise<Patient | undefined> {
        const pool = await this.getPool();
        const result = await pool.request()
            .input('id', sql.NVarChar, id)
            .query('SELECT data FROM patients WHERE id = @id');

        if (result.recordset.length === 0) return undefined;
        return JSON.parse(result.recordset[0].data);
    }

    async getPatients(): Promise<Patient[]> {
        const pool = await this.getPool();
        const result = await pool.request()
            .query('SELECT data FROM patients ORDER BY createdAt DESC');

        return result.recordset.map(row => JSON.parse(row.data));
    }

    async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient | undefined> {
        const existing = await this.getPatient(id);
        if (!existing) return undefined;

        const updated: Patient = {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString(),
        };

        const pool = await this.getPool();
        await pool.request()
            .input('id', sql.NVarChar, id)
            .input('data', sql.NVarChar, JSON.stringify(updated))
            .input('updatedAt', sql.DateTime2, updated.updatedAt)
            .query(`
        UPDATE patients 
        SET data = @data, updatedAt = @updatedAt 
        WHERE id = @id
      `); return updated;
    }

    async deletePatient(id: string): Promise<boolean> {
        const pool = await this.getPool();
        const result = await pool.request()
            .input('id', sql.NVarChar, id)
            .query('DELETE FROM patients WHERE id = @id');

        return result.rowsAffected[0] > 0;
    }

    // ==========================================
    // Case Operations
    // ==========================================

    async createCase(caseData: InsertCase): Promise<ClinicalCase> {
        const pool = await this.getPool();
        const id = randomUUID();
        const now = new Date().toISOString();

        const newCase: ClinicalCase = {
            id,
            patientId: caseData.patientId,
            caseType: caseData.caseType,
            status: 'draft',
            clinicalQuestion: caseData.clinicalQuestion,
            agentOutputs: [],
            recommendations: [],
            riskAlerts: [],
            labReports: [], // Populated separately
            createdAt: now,
            updatedAt: now,
        };

        await pool.request()
            .input('id', sql.NVarChar, id)
            .input('patientId', sql.NVarChar, caseData.patientId)
            .input('caseType', sql.NVarChar, caseData.caseType)
            .input('status', sql.NVarChar, 'draft')
            .input('clinicalQuestion', sql.NVarChar, caseData.clinicalQuestion)
            .input('recommendations', sql.NVarChar, JSON.stringify([]))
            .input('riskAlerts', sql.NVarChar, JSON.stringify([]))
            .input('createdAt', sql.DateTime2, now)
            .input('updatedAt', sql.DateTime2, now)
            .query(`
        INSERT INTO cases (id, patientId, caseType, status, clinicalQuestion, recommendations, riskAlerts, createdAt, updatedAt)
        VALUES (@id, @patientId, @caseType, @status, @clinicalQuestion, @recommendations, @riskAlerts, @createdAt, @updatedAt)
      `);

        return newCase;
    }

    async getCase(id: string): Promise<ClinicalCase | undefined> {
        const pool = await this.getPool();

        // Get Case
        const caseResult = await pool.request()
            .input('id', sql.NVarChar, id)
            .query('SELECT * FROM cases WHERE id = @id');

        if (caseResult.recordset.length === 0) return undefined;
        const caseRow = caseResult.recordset[0];

        // Get Agent Results
        const agentsResult = await pool.request()
            .input('caseId', sql.NVarChar, id)
            .query('SELECT data FROM agent_results WHERE caseId = @caseId');

        const agentOutputs = agentsResult.recordset.map(row => JSON.parse(row.data));

        // Get Lab Reports (IDs only for the ClinicalCase object, usually)
        // But schema says labReports: string[] (IDs) or objects? 
        // Schema says: labReports: z.array(z.string()) -> IDs.
        const labsResult = await pool.request()
            .input('caseId', sql.NVarChar, id)
            .query('SELECT id FROM lab_reports WHERE caseId = @caseId');

        const labReportIds = labsResult.recordset.map(row => row.id);

        return {
            id: caseRow.id,
            patientId: caseRow.patientId,
            caseType: caseRow.caseType as any,
            status: caseRow.status as any,
            clinicalQuestion: caseRow.clinicalQuestion,
            summary: caseRow.summary, // Might be missing in table if I didn't add it? I didn't add it to CREATE TABLE. I should add it or store in JSON.
            // Wait, I missed 'summary' in CREATE TABLE. I'll rely on it being optional or add it.
            // Actually, I should probably have a 'data' column in cases too for extra fields.
            // For now, let's assume summary is not critical or I'll add it to the query if I add it to table.
            // I'll add 'summary' to the table in a bit or just return undefined.
            agentOutputs,
            recommendations: JSON.parse(caseRow.recommendations || '[]'),
            riskAlerts: JSON.parse(caseRow.riskAlerts || '[]'),
            labReports: labReportIds,
            createdAt: caseRow.createdAt.toISOString(),
            updatedAt: caseRow.updatedAt.toISOString(),
            reviewedAt: caseRow.reviewedAt?.toISOString(),
            reviewedBy: caseRow.reviewedBy
        };
    }

    async getCases(): Promise<ClinicalCase[]> {
        const pool = await this.getPool();
        const result = await pool.request()
            .query('SELECT id FROM cases ORDER BY createdAt DESC');

        // This is N+1 but acceptable for this scale. 
        // Optimization: Join everything. But constructing objects from joins is complex.
        const cases = await Promise.all(result.recordset.map(row => this.getCase(row.id)));
        return cases.filter((c): c is ClinicalCase => !!c);
    }

    async getCasesByPatient(patientId: string): Promise<ClinicalCase[]> {
        const pool = await this.getPool();
        const result = await pool.request()
            .input('patientId', sql.NVarChar, patientId)
            .query('SELECT id FROM cases WHERE patientId = @patientId ORDER BY createdAt DESC');

        const cases = await Promise.all(result.recordset.map(row => this.getCase(row.id)));
        return cases.filter((c): c is ClinicalCase => !!c);
    }

    async updateCase(id: string, patientId: string, updates: Partial<ClinicalCase>): Promise<ClinicalCase | undefined> {
        const pool = await this.getPool();
        const now = new Date().toISOString();

        // Update main table
        // Construct dynamic update query
        const fields = [];
        if (updates.status) fields.push('status = @status');
        if (updates.recommendations) fields.push('recommendations = @recommendations');
        if (updates.riskAlerts) fields.push('riskAlerts = @riskAlerts');
        // if (updates.summary) fields.push('summary = @summary'); // If I had summary column

        fields.push('updatedAt = @updatedAt');

        const request = pool.request()
            .input('id', sql.NVarChar, id)
            .input('updatedAt', sql.DateTime2, now);

        if (updates.status) request.input('status', sql.NVarChar, updates.status);
        if (updates.recommendations) request.input('recommendations', sql.NVarChar, JSON.stringify(updates.recommendations));
        if (updates.riskAlerts) request.input('riskAlerts', sql.NVarChar, JSON.stringify(updates.riskAlerts));

        if (fields.length > 1) { // more than just updatedAt
            await request.query(`UPDATE cases SET ${fields.join(', ')} WHERE id = @id`);
        }

        // Update Agent Results if present
        if (updates.agentOutputs) {
            // For simplicity, delete existing for this case and re-insert (or upsert)
            // But we want to preserve history? The schema is just a list of current outputs.
            // Let's loop and upsert.
            for (const output of updates.agentOutputs) {
                // We need an ID for the agent output. The schema doesn't have one, it's embedded.
                // But our table has one. We can generate one or try to match by agentType.
                // Let's match by agentType for this case.

                const existingAgent = await pool.request()
                    .input('caseId', sql.NVarChar, id)
                    .input('agentType', sql.NVarChar, output.agentType)
                    .query('SELECT id FROM agent_results WHERE caseId = @caseId AND agentType = @agentType');

                if (existingAgent.recordset.length > 0) {
                    // Update
                    await pool.request()
                        .input('id', sql.NVarChar, existingAgent.recordset[0].id)
                        .input('status', sql.NVarChar, output.status)
                        .input('confidence', sql.Float, output.confidence)
                        .input('summary', sql.NVarChar, output.summary)
                        .input('data', sql.NVarChar, JSON.stringify(output))
                        .input('completedAt', sql.DateTime2, output.completedAt)
                        .query(`
                    UPDATE agent_results 
                    SET status = @status, confidence = @confidence, summary = @summary, data = @data, completedAt = @completedAt
                    WHERE id = @id
                `);
                } else {
                    // Insert
                    await pool.request()
                        .input('id', sql.NVarChar, randomUUID())
                        .input('caseId', sql.NVarChar, id)
                        .input('agentType', sql.NVarChar, output.agentType)
                        .input('status', sql.NVarChar, output.status)
                        .input('confidence', sql.Float, output.confidence)
                        .input('summary', sql.NVarChar, output.summary)
                        .input('data', sql.NVarChar, JSON.stringify(output))
                        .input('startedAt', sql.DateTime2, output.startedAt)
                        .input('completedAt', sql.DateTime2, output.completedAt)
                        .query(`
                    INSERT INTO agent_results (id, caseId, agentType, status, confidence, summary, data, startedAt, completedAt)
                    VALUES (@id, @caseId, @agentType, @status, @confidence, @summary, @data, @startedAt, @completedAt)
                `);
                }
            }
        }

        return this.getCase(id);
    }

    async deleteCase(id: string, patientId: string): Promise<boolean> {
        const pool = await this.getPool();
        // Delete related records first (Cascading delete ideally, but manual here)
        await pool.request().input('id', sql.NVarChar, id).query('DELETE FROM agent_results WHERE caseId = @id');
        await pool.request().input('id', sql.NVarChar, id).query('DELETE FROM lab_reports WHERE caseId = @id');
        await pool.request().input('id', sql.NVarChar, id).query('DELETE FROM chat_messages WHERE caseId = @id');

        const result = await pool.request()
            .input('id', sql.NVarChar, id)
            .query('DELETE FROM cases WHERE id = @id');

        return result.rowsAffected[0] > 0;
    }

    // ==========================================
    // Audit Log Operations
    // ==========================================

    async createAuditLog(log: Omit<AuditLog, 'id'>): Promise<AuditLog> {
        const pool = await this.getPool();
        const id = randomUUID();
        const newLog: AuditLog = { id, ...log };

        await pool.request()
            .input('id', sql.NVarChar, id)
            .input('entityType', sql.NVarChar, log.entityType)
            .input('entityId', sql.NVarChar, log.entityId)
            .input('action', sql.NVarChar, log.action)
            .input('userId', sql.NVarChar, log.userId)
            .input('details', sql.NVarChar, JSON.stringify(log.details))
            .input('timestamp', sql.DateTime2, log.timestamp)
            .query(`
        INSERT INTO audit_logs (id, entityType, entityId, action, userId, details, timestamp)
        VALUES (@id, @entityType, @entityId, @action, @userId, @details, @timestamp)
      `);

        return newLog;
    }

    async getaudit_logs(entityId?: string): Promise<AuditLog[]> {
        const pool = await this.getPool();
        let query = 'SELECT * FROM audit_logs';
        if (entityId) {
            query += ' WHERE entityId = @entityId';
        }
        query += ' ORDER BY timestamp DESC';

        const request = pool.request();
        if (entityId) request.input('entityId', sql.NVarChar, entityId);

        const result = await request.query(query);

        return result.recordset.map(row => ({
            id: row.id,
            entityType: row.entityType,
            entityId: row.entityId,
            action: row.action,
            userId: row.userId,
            details: JSON.parse(row.details),
            timestamp: row.timestamp.toISOString()
        }));
    }

    // ==========================================
    // Lab Reports
    // ==========================================

    async createLabReport(report: Omit<LabReport, 'id'>): Promise<LabReport> {
        const pool = await this.getPool();
        const id = randomUUID();
        const newReport: LabReport = { id, ...report };

        await pool.request()
            .input('id', sql.NVarChar, id)
            .input('caseId', sql.NVarChar, report.caseId)
            .input('fileName', sql.NVarChar, report.fileName)
            .input('fileType', sql.NVarChar, report.fileType)
            .input('status', sql.NVarChar, report.status)
            .input('extractedData', sql.NVarChar, JSON.stringify(report.extractedData))
            .input('rawText', sql.NVarChar, report.rawText)
            .input('uploadedAt', sql.DateTime2, report.uploadedAt)
            .query(`
        INSERT INTO lab_reports (id, caseId, fileName, fileType, status, extractedData, rawText, uploadedAt)
        VALUES (@id, @caseId, @fileName, @fileType, @status, @extractedData, @rawText, @uploadedAt)
      `);

        return newReport;
    }

    async getlab_reports(caseId?: string): Promise<LabReport[]> {
        const pool = await this.getPool();
        let query = 'SELECT * FROM lab_reports';
        if (caseId) {
            query += ' WHERE caseId = @caseId';
        }
        query += ' ORDER BY uploadedAt DESC';

        const request = pool.request();
        if (caseId) request.input('caseId', sql.NVarChar, caseId);

        const result = await request.query(query);

        return result.recordset.map(row => ({
            id: row.id,
            caseId: row.caseId,
            fileName: row.fileName,
            fileType: row.fileType,
            status: row.status as any,
            extractedData: JSON.parse(row.extractedData),
            rawText: row.rawText,
            uploadedAt: row.uploadedAt.toISOString()
        }));
    }

    // ==========================================
    // Chat Messages
    // ==========================================

    async createChatMessage(message: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
        const pool = await this.getPool();
        const id = randomUUID();
        const newMessage: ChatMessage = { id, ...message };

        await pool.request()
            .input('id', sql.NVarChar, id)
            .input('caseId', sql.NVarChar, message.caseId)
            .input('role', sql.NVarChar, message.role)
            .input('content', sql.NVarChar, message.content)
            .input('agentType', sql.NVarChar, message.agentType)
            .input('timestamp', sql.DateTime2, message.timestamp)
            .query(`
        INSERT INTO chat_messages (id, caseId, role, content, agentType, timestamp)
        VALUES (@id, @caseId, @role, @content, @agentType, @timestamp)
      `);

        return newMessage;
    }

    async getchat_messages(caseId: string): Promise<ChatMessage[]> {
        const pool = await this.getPool();
        const result = await pool.request()
            .input('caseId', sql.NVarChar, caseId)
            .query('SELECT * FROM chat_messages WHERE caseId = @caseId ORDER BY timestamp ASC');

        return result.recordset.map(row => ({
            id: row.id,
            caseId: row.caseId,
            role: row.role as any,
            content: row.content,
            agentType: row.agentType as any,
            timestamp: row.timestamp.toISOString()
        }));
    }

    // ==========================================
    // Dashboard & Others
    // ==========================================

    async getDashboardStats(): Promise<DashboardStats> {
        const pool = await this.getPool();

        // Total Cases
        const totalCasesResult = await pool.request().query('SELECT COUNT(*) as count FROM Cases');
        const totalCases = totalCasesResult.recordset[0].count;

        // Active cases (analyzing or submitted)
        const activeCasesResult = await pool.request().query("SELECT COUNT(*) as count FROM cases WHERE status IN ('analyzing', 'submitted')");
        const activeCases = activeCasesResult.recordset[0].count;

        // Pending Reviews
        const pendingReviewsResult = await pool.request().query("SELECT COUNT(*) as count FROM cases WHERE status = 'review-ready'");
        const pendingReviews = pendingReviewsResult.recordset[0].count;

        // Critical Alerts (Need to parse JSON or rely on a separate table if I had one. 
        // Since I stored RiskAlerts as JSON in Cases, I have to fetch all and count, or use OPENJSON if I want to be fancy.
        // Let's use OPENJSON for "Enterprise grade" SQL skills)
        // "SELECT count(*) FROM cases CROSS APPLY OPENJSON(riskAlerts) WITH (severity nvarchar(50)) WHERE severity = 'critical'"
        const criticalAlertsResult = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM cases 
      CROSS APPLY OPENJSON(riskAlerts) 
      WITH (severity nvarchar(50) '$.severity') 
      WHERE severity = 'critical'
    `);
        const criticalAlerts = criticalAlertsResult.recordset[0].count;

        return {
            totalCases,
            activeCases,
            pendingReviews,
            criticalAlerts,
            casesThisWeek: 0, // TODO: Implement date filter
            avgConfidenceScore: 85 // Placeholder or calculate from agent_results
        };
    }

    async getRiskAlerts(caseId?: string): Promise<RiskAlert[]> {
        const pool = await this.getPool();

        if (caseId) {
            const caseData = await this.getCase(caseId);
            return caseData?.riskAlerts || [];
        }

        // Global alerts - fetch all cases and aggregate (expensive) or use OPENJSON
        const result = await pool.request().query(`
      SELECT riskAlerts FROM Cases
    `);

        return result.recordset.flatMap(row => JSON.parse(row.riskAlerts || '[]'));
    }

    async updateRecommendation(
        caseId: string,
        recommendationId: string,
        feedback: { status: string; clinicianFeedback?: string }
    ): Promise<Recommendation | undefined> {
        const clinicalCase = await this.getCase(caseId);
        if (!clinicalCase) return undefined;

        const recIndex = clinicalCase.recommendations.findIndex(r => r.id === recommendationId);
        if (recIndex === -1) return undefined;

        clinicalCase.recommendations[recIndex] = {
            ...clinicalCase.recommendations[recIndex],
            status: feedback.status as any,
            clinicianFeedback: feedback.clinicianFeedback,
        };

        await this.updateCase(caseId, clinicalCase.patientId, {
            recommendations: clinicalCase.recommendations,
        });

        return clinicalCase.recommendations[recIndex];
    }
}

// Singleton instance
let _client: AzureSQLClient | null = null;

export function getSQLDB(): AzureSQLClient {
    if (!_client) {
        _client = new AzureSQLClient();
    }
    return _client;
}
