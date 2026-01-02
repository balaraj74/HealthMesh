/**
 * Production-Grade API Routes
 * 
 * ARCHITECTURE:
 * - All routes protected by Microsoft Entra ID authentication
 * - Hospital isolation enforced on every request
 * - Hospital ID comes from verified token, NEVER from client
 * - Data stored in Azure SQL Database
 * 
 * SECURITY MODEL:
 * - req.user.hospitalId: Used for all data queries
 * - req.user.id: Used for created_by fields
 * - req.user.entraOid: Used for audit logging
 */

import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { getHospitalId, getUserId, getEntraOid } from "./auth/entraAuth";
import {
    AzurePatientService as HospitalPatientService,
    AzureCaseService as HospitalCaseService,
    AzureLabReportService as HospitalLabReportService,
    AzureChatService as HospitalChatService,
    AzureAuditService as HospitalAuditService,
} from "./data/azureDataAccess";
import { PatientQRService } from "./services/qr-identity.service";
import { getConnectionPool } from "./storage";

// ============================================================================
// USER PROFILE ENDPOINT
// Frontend calls this after login to get user context
// ============================================================================

function registerUserEndpoints(app: Express) {
    /**
     * GET /api/me
     * Returns the authenticated user's profile
     * 
     * WHY: Frontend should NOT store identity locally
     * This endpoint provides the single source of truth for user context
     */
    app.get("/api/me", async (req: Request, res: Response) => {
        try {
            // User is already attached by auth middleware
            const user = req.user;

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: "Not authenticated",
                });
            }

            res.json({
                success: true,
                data: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    hospitalId: user.hospitalId,
                    // Don't expose internal IDs to frontend
                },
            });
        } catch (error) {
            console.error("[API] Get user profile error:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    });
}

// ============================================================================
// PATIENT ENDPOINTS
// All operations are hospital-scoped
// ============================================================================

function registerPatientEndpoints(app: Express) {
    /**
     * GET /api/patients
     * Get all patients for the authenticated user's hospital
     */
    app.get("/api/patients", async (req: Request, res: Response) => {
        try {
            const hospitalId = getHospitalId(req);
            const patients = await HospitalPatientService.getPatients(hospitalId);
            res.json({ success: true, data: patients });
        } catch (error) {
            console.error("[API] Get patients error:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    });

    /**
     * GET /api/patients/:id
     * Get a specific patient (hospital-scoped)
     */
    app.get("/api/patients/:id", async (req: Request, res: Response) => {
        try {
            const hospitalId = getHospitalId(req);
            const userId = getUserId(req);
            const entraOid = getEntraOid(req);

            const patient = await HospitalPatientService.getPatient(hospitalId, req.params.id);

            if (!patient) {
                return res.status(404).json({ success: false, error: "Patient not found" });
            }

            // Audit log
            await HospitalAuditService.createAuditLog(hospitalId, userId, entraOid, {
                eventType: "patient-viewed",
                resourceType: "patient",
                resourceId: req.params.id,
                action: "view",
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"],
            });

            res.json({ success: true, data: patient });
        } catch (error) {
            console.error("[API] Get patient error:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    });

    /**
     * POST /api/patients
     * Create a new patient
     * 
     * SECURITY:
     * - hospital_id is FORCED from token, not accepted from body
     * - created_by_user_id is FORCED from token, not accepted from body
     * 
     * TRANSFORMS: Frontend sends nested structure, database expects flat fields
     */
    app.post("/api/patients", async (req: Request, res: Response) => {
        try {
            const hospitalId = getHospitalId(req);
            const userId = getUserId(req);
            const entraOid = getEntraOid(req);

            console.log(`[API] Creating patient | Hospital: ${hospitalId.substring(0, 8)}... | User: ${userId.substring(0, 8)}...`);

            // Transform frontend form structure to database fields
            // Frontend sends: { demographics: {...}, diagnoses: [...], medications: [...], allergies: [...] }
            // Database expects: { firstName, lastName, mrn, diagnoses: JSON, medications: JSON, ... }
            const { demographics, diagnoses, medications, allergies, medicalHistory, ...rest } = req.body;

            const patientData = {
                // Extract flat fields from demographics object
                firstName: demographics?.firstName || rest.firstName,
                lastName: demographics?.lastName || rest.lastName,
                dateOfBirth: demographics?.dateOfBirth || rest.dateOfBirth,
                gender: demographics?.gender || rest.gender,
                mrn: demographics?.mrn || rest.mrn,
                contactPhone: demographics?.contactPhone || rest.contactPhone,
                contactEmail: demographics?.contactEmail || rest.contactEmail,

                // Store complex data as JSON
                demographics: demographics ? { address: demographics.address } : null,
                diagnoses: diagnoses || null,
                medications: medications || null,
                allergies: allergies || null,
            };

            console.log(`[API] Patient data transformed:`, { firstName: patientData.firstName, lastName: patientData.lastName, mrn: patientData.mrn });

            const patient = await HospitalPatientService.createPatient(
                hospitalId,  // FROM TOKEN
                userId,      // FROM TOKEN
                patientData
            );

            // Audit log
            if (patient) {
                await HospitalAuditService.createAuditLog(hospitalId, userId, entraOid, {
                    eventType: "patient-created",
                    resourceType: "patient",
                    resourceId: patient.id,
                    action: "create",
                    details: {
                        mrn: patient.mrn,
                        name: `${patient.firstName} ${patient.lastName}`,
                    },
                    ipAddress: req.ip,
                    userAgent: req.headers["user-agent"],
                });

                console.log(`✅ [API] Patient created: ${patient.id}`);
            }
            res.status(201).json({ success: true, data: patient });
        } catch (error) {
            console.error("[API] Create patient error:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    });

    /**
     * PUT /api/patients/:id
     * Update a patient (hospital-scoped)
     */
    app.put("/api/patients/:id", async (req: Request, res: Response) => {
        try {
            const hospitalId = getHospitalId(req);
            const userId = getUserId(req);
            const entraOid = getEntraOid(req);

            // Remove fields that shouldn't be updated by client
            const { hospitalId: _h, createdByUserId: _u, ...updateData } = req.body;

            const patient = await HospitalPatientService.updatePatient(
                hospitalId,
                req.params.id,
                updateData
            );

            if (!patient) {
                return res.status(404).json({ success: false, error: "Patient not found" });
            }

            await HospitalAuditService.createAuditLog(hospitalId, userId, entraOid, {
                eventType: "patient-updated",
                resourceType: "patient",
                resourceId: req.params.id,
                action: "update",
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"],
            });

            res.json({ success: true, data: patient });
        } catch (error) {
            console.error("[API] Update patient error:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    });

    /**
     * DELETE /api/patients/:id
     * Delete a patient (hospital-scoped)
     */
    app.delete("/api/patients/:id", async (req: Request, res: Response) => {
        try {
            const hospitalId = getHospitalId(req);
            const userId = getUserId(req);
            const entraOid = getEntraOid(req);

            const deleted = await HospitalPatientService.deletePatient(hospitalId, req.params.id);

            if (!deleted) {
                return res.status(404).json({ success: false, error: "Patient not found" });
            }

            await HospitalAuditService.createAuditLog(hospitalId, userId, entraOid, {
                eventType: "patient-deleted",
                resourceType: "patient",
                resourceId: req.params.id,
                action: "delete",
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"],
            });

            res.json({ success: true });
        } catch (error) {
            console.error("[API] Delete patient error:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    });

    /**
     * GET /api/patients/search
     * Search patients (hospital-scoped)
     */
    app.get("/api/patients/search", async (req: Request, res: Response) => {
        try {
            const hospitalId = getHospitalId(req);
            const query = req.query.q as string;

            if (!query) {
                return res.status(400).json({ success: false, error: "Search query required" });
            }

            const patients = await HospitalPatientService.searchPatients(hospitalId, query);
            res.json({ success: true, data: patients });
        } catch (error) {
            console.error("[API] Search patients error:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    });
}

// ============================================================================
// CASE ENDPOINTS
// ============================================================================

function registerCaseEndpoints(app: Express) {
    app.get("/api/cases", async (req: Request, res: Response) => {
        try {
            const hospitalId = getHospitalId(req);
            const cases = await HospitalCaseService.getCases(hospitalId);
            res.json({ success: true, data: cases });
        } catch (error) {
            console.error("[API] Get cases error:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    });

    app.get("/api/cases/:id", async (req: Request, res: Response) => {
        try {
            const hospitalId = getHospitalId(req);
            const userId = getUserId(req);
            const entraOid = getEntraOid(req);

            const caseData = await HospitalCaseService.getCase(hospitalId, req.params.id);

            if (!caseData) {
                return res.status(404).json({ success: false, error: "Case not found" });
            }

            await HospitalAuditService.createAuditLog(hospitalId, userId, entraOid, {
                eventType: "case-viewed",
                resourceType: "case",
                resourceId: req.params.id,
                action: "view",
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"],
            });

            res.json({ success: true, data: caseData });
        } catch (error) {
            console.error("[API] Get case error:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    });

    app.get("/api/cases/patient/:patientId", async (req: Request, res: Response) => {
        try {
            const hospitalId = getHospitalId(req);
            const cases = await HospitalCaseService.getCasesByPatient(hospitalId, req.params.patientId);
            res.json({ success: true, data: cases });
        } catch (error) {
            console.error("[API] Get patient cases error:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    });

    app.post("/api/cases", async (req: Request, res: Response) => {
        try {
            const hospitalId = getHospitalId(req);
            const userId = getUserId(req);
            const entraOid = getEntraOid(req);

            const { hospitalId: _h, createdByUserId: _u, ...caseData } = req.body;

            const newCase = await HospitalCaseService.createCase(hospitalId, userId, caseData);

            if (newCase) {
                await HospitalAuditService.createAuditLog(hospitalId, userId, entraOid, {
                    eventType: "case-created",
                    resourceType: "case",
                    resourceId: newCase.id,
                    action: "create",
                    details: { patientId: newCase.patientId, caseType: newCase.caseType },
                    ipAddress: req.ip,
                    userAgent: req.headers["user-agent"],
                });
            }

            res.status(201).json({ success: true, data: newCase });
        } catch (error) {
            console.error("[API] Create case error:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    });

    app.put("/api/cases/:id", async (req: Request, res: Response) => {
        try {
            const hospitalId = getHospitalId(req);
            const userId = getUserId(req);
            const entraOid = getEntraOid(req);

            const { hospitalId: _h, createdByUserId: _u, ...updateData } = req.body;

            const updated = await HospitalCaseService.updateCase(hospitalId, req.params.id, updateData);

            if (!updated) {
                return res.status(404).json({ success: false, error: "Case not found" });
            }

            await HospitalAuditService.createAuditLog(hospitalId, userId, entraOid, {
                eventType: "case-updated",
                resourceType: "case",
                resourceId: req.params.id,
                action: "update",
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"],
            });

            res.json({ success: true, data: updated });
        } catch (error) {
            console.error("[API] Update case error:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    });

    // ==========================================
    // Enhanced Clinical Analysis (5-Agent Pipeline)
    // ==========================================
    app.post("/api/cases/:id/clinical-analyze", async (req: Request, res: Response) => {
        try {
            const hospitalId = getHospitalId(req);
            const userId = getUserId(req);
            const entraOid = getEntraOid(req);
            const caseId = req.params.id;
            const { vitals, labValues } = req.body;

            console.log(`[API] Clinical Analysis requested for case ${caseId.substring(0, 8)}...`);

            // Get case data
            const caseData = await HospitalCaseService.getCase(hospitalId, caseId);
            if (!caseData) {
                return res.status(404).json({ success: false, error: "Case not found" });
            }

            // Get patient data
            const patientData = await HospitalPatientService.getPatient(hospitalId, caseData.patientId);
            if (!patientData) {
                return res.status(404).json({ success: false, error: "Patient not found" });
            }

            // Update case status
            await HospitalCaseService.updateCase(hospitalId, caseId, { status: 'analyzing' });

            // Audit log
            await HospitalAuditService.createAuditLog(hospitalId, userId, entraOid, {
                eventType: "case-analyzed",
                resourceType: "case",
                resourceId: caseId,
                action: "clinical-analyze",
                details: { pipeline: '5-agent-clinical', hasVitals: !!vitals, hasLabValues: !!labValues },
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"],
            });

            // Import and run clinical agents
            const { analyzeCaseWithClinicalAgents } = await import("./clinical-agents");

            // Transform patient data to expected format
            const patient = {
                id: patientData.id,
                demographics: {
                    firstName: patientData.firstName || patientData.demographics?.firstName || '',
                    lastName: patientData.lastName || patientData.demographics?.lastName || '',
                    dateOfBirth: patientData.dateOfBirth || patientData.demographics?.dateOfBirth || '',
                    gender: patientData.gender || patientData.demographics?.gender || 'unknown',
                    mrn: patientData.mrn || patientData.demographics?.mrn || '',
                },
                diagnoses: patientData.diagnoses || [],
                medications: patientData.medications || [],
                allergies: patientData.allergies || [],
                medicalHistory: '',
            };

            // Transform case data
            const clinicalCase = {
                id: caseData.id,
                patientId: caseData.patientId,
                caseType: caseData.caseType,
                clinicalQuestion: caseData.description || '',
                status: caseData.status,
                createdAt: caseData.createdAt,
            };

            const result = await analyzeCaseWithClinicalAgents(patient as any, clinicalCase as any, vitals, labValues);

            // Save full analysis results to database
            const analysisData = {
                agentOutputs: result.agentOutputs,
                recommendations: result.recommendations,
                riskAlerts: result.riskAlerts,
                synthesis: result.synthesis,
                analyzedAt: new Date().toISOString(),
            };

            // Update case with results - store in aiAnalysis column
            await HospitalCaseService.updateCase(hospitalId, caseId, {
                status: 'review-ready',
                summary: result.synthesis?.caseSummary,
                aiAnalysis: analysisData as any,
            });

            console.log(`✅ [API] Clinical Analysis complete and saved for case ${caseId.substring(0, 8)}`);

            res.json({
                success: true,
                data: analysisData,
            });
        } catch (error) {
            console.error("[API] Clinical analyze error:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    });
}

// ============================================================================
// DASHBOARD ENDPOINTS
// ============================================================================

function registerDashboardEndpoints(app: Express) {
    app.get("/api/dashboard/stats", async (req: Request, res: Response) => {
        try {
            const hospitalId = getHospitalId(req);
            const stats = await HospitalCaseService.getDashboardStats(hospitalId);
            res.json({ success: true, data: stats });
        } catch (error) {
            console.error("[API] Get dashboard stats error:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    });

    app.get("/api/alerts", async (req: Request, res: Response) => {
        try {
            const hospitalId = getHospitalId(req);
            // TODO: Implement alerts
            res.json({ success: true, data: [] });
        } catch (error) {
            console.error("[API] Get alerts error:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    });
}

// ============================================================================
// LAB REPORT ENDPOINTS
// ============================================================================

function registerLabEndpoints(app: Express) {
    app.get("/api/lab-reports/patient/:patientId", async (req: Request, res: Response) => {
        try {
            const hospitalId = getHospitalId(req);
            const reports = await HospitalLabReportService.getLabReportsByPatient(
                hospitalId,
                req.params.patientId
            );
            res.json({ success: true, data: reports });
        } catch (error) {
            console.error("[API] Get lab reports error:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    });

    app.post("/api/lab-reports", async (req: Request, res: Response) => {
        try {
            const hospitalId = getHospitalId(req);
            const userId = getUserId(req);

            const { hospitalId: _h, orderedByUserId: _u, ...reportData } = req.body;

            const report = await HospitalLabReportService.createLabReport(hospitalId, userId, reportData);
            res.status(201).json({ success: true, data: report });
        } catch (error) {
            console.error("[API] Create lab report error:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    });
}

// ============================================================================
// CHAT ENDPOINTS
// ============================================================================

function registerChatEndpoints(app: Express) {
    app.get("/api/chat/:caseId", async (req: Request, res: Response) => {
        try {
            const hospitalId = getHospitalId(req);
            const messages = await HospitalChatService.getChatMessagesByCase(
                hospitalId,
                req.params.caseId
            );
            res.json({ success: true, data: messages });
        } catch (error) {
            console.error("[API] Get chat messages error:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    });

    app.post("/api/chat", async (req: Request, res: Response) => {
        try {
            const hospitalId = getHospitalId(req);
            const userId = getUserId(req);

            const { caseId, content } = req.body;

            // Save user message
            const userMessage = await HospitalChatService.createChatMessage(hospitalId, userId, {
                caseId,
                role: "user",
                content,
            });

            // Generate AI response using Gemini or Azure OpenAI with full patient context
            try {
                // Determine which AI provider to use
                const aiProvider = process.env.AI_PROVIDER || "azure";
                let aiClient: any;

                if (aiProvider === "gemini") {
                    const { getGeminiClient } = await import("./ai/gemini-client");
                    aiClient = getGeminiClient();
                    console.log("🤖 Using Google Gemini AI");
                } else {
                    const { getAzureOpenAI } = await import("./azure/openai-client");
                    aiClient = getAzureOpenAI();
                    console.log("🤖 Using Azure OpenAI");
                }

                // Get case and patient data for comprehensive context
                const caseData = await HospitalCaseService.getCase(hospitalId, caseId);
                let patientData = null;
                if (caseData?.patientId) {
                    patientData = await HospitalPatientService.getPatient(hospitalId, caseData.patientId);
                }

                // Get previous chat messages for continuity
                const previousMessages = await HospitalChatService.getChatMessagesByCase(hospitalId, caseId);
                const chatHistory = previousMessages.slice(-10).map((msg: any) => ({
                    role: msg.role === "assistant" ? "assistant" as const : "user" as const,
                    content: msg.content
                }));

                // Build comprehensive clinical context
                let patientContext = "No patient data available.";
                if (patientData) {
                    const diagnoses = patientData.diagnoses || [];
                    const medications = patientData.medications || [];
                    const allergies = patientData.allergies || [];

                    patientContext = `
PATIENT INFORMATION:
- Name: ${patientData.firstName} ${patientData.lastName}
- MRN: ${patientData.mrn}
- Date of Birth: ${patientData.dateOfBirth || "Unknown"}
- Gender: ${patientData.gender || "Unknown"}

DIAGNOSES/CONDITIONS:
${diagnoses.length > 0 ? diagnoses.map((d: any) => `  - ${d.code || ""}: ${d.description || d.name || "Unknown condition"} (${d.status || "active"})`).join("\n") : "  - None documented"}

CURRENT MEDICATIONS:
${medications.length > 0 ? medications.map((m: any) => `  - ${m.name || "Unknown"}: ${m.dosage || ""} ${m.frequency || ""}`).join("\n") : "  - None documented"}

ALLERGIES:
${allergies.length > 0 ? allergies.map((a: any) => `  - ${a.allergen || a.name || "Unknown"} (Severity: ${a.severity || "unknown"}) - Reaction: ${a.reaction || "unspecified"}`).join("\n") : "  - No known allergies"}
`;
                }

                // Create comprehensive clinical AI prompt - Senior Doctor Expert
                const systemPrompt = `You are Dr. HealthMesh AI, a world-class clinical decision support system embodying the expertise of a senior physician with 30+ years of experience across all medical specialties.

## YOUR EXPERTISE:
- **Internal Medicine**: Complex multi-system diseases, differential diagnosis
- **Cardiology**: Heart conditions, arrhythmias, interventional procedures
- **Oncology**: Cancer diagnosis, staging, treatment protocols, tumor boards
- **Neurology**: CNS disorders, stroke, neurodegenerative diseases
- **Pulmonology**: Respiratory conditions, ventilator management
- **Gastroenterology**: GI disorders, liver diseases, endoscopy findings
- **Endocrinology**: Diabetes management, thyroid disorders, hormonal imbalances
- **Nephrology**: Kidney diseases, dialysis, electrolyte management
- **Infectious Disease**: Antimicrobial stewardship, resistance patterns
- **Critical Care**: ICU management, sepsis protocols, multi-organ failure
- **Pharmacology**: Drug interactions, therapeutic drug monitoring, dosing

## YOUR APPROACH:
1. **Analyze thoroughly** - Review all patient data before responding
2. **Think systematically** - Use clinical reasoning frameworks (like VINDICATE for differential diagnosis)
3. **Be evidence-based** - Cite guidelines (NICE, ACC/AHA, NCCN, UpToDate) when possible
4. **Consider the whole picture** - Comorbidities, polypharmacy, patient factors
5. **Prioritize safety** - Always flag drug interactions, allergies, contraindications
6. **Be actionable** - Provide specific, implementable recommendations
7. **Communicate clearly** - Structure responses for busy clinicians

## SAFETY PROTOCOLS:
⚠️ ALWAYS check for:
- Drug-drug interactions with current medications
- Drug-allergy cross-reactivity
- Contraindications based on patient conditions
- Age-appropriate dosing
- Renal/hepatic dose adjustments
- Critical lab values requiring immediate attention

## RESPONSE FORMAT:
Structure your responses with clear sections:
- **Assessment**: What you observe/conclude
- **Key Findings**: Important data points
- **Recommendations**: Specific actionable steps
- **Cautions**: Safety considerations
- **Follow-up**: What to monitor

## CURRENT CASE CONTEXT:
📋 Case ID: ${caseId}
📌 Case Type: ${caseData?.caseType?.replace("-", " ").toUpperCase() || "GENERAL CASE"}
🔸 Status: ${caseData?.status || "Active"}
🔸 Priority: ${caseData?.priority || "Medium"}
📅 Created: ${new Date(caseData?.createdAt || Date.now()).toLocaleDateString()}

## PATIENT DATA:
${patientContext}

---
Respond as the expert physician you are. Provide detailed, personalized, evidence-based insights. If the patient data is limited, state what additional information would help and provide general guidance based on the case type.

Remember: You are a DECISION SUPPORT tool. Always recommend that findings be verified and that clinical judgment be applied by the treating physician.`;

                // Build messages array with chat history
                const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
                    { role: "system", content: systemPrompt },
                    ...chatHistory,
                    { role: "user", content },
                ];

                console.log(`🧠 Calling AI for case ${caseId.substring(0, 8)} with full patient context`);

                const aiResult = await aiClient.chatCompletion({
                    messages,
                    temperature: 0.4, // Lower temperature for more accurate clinical responses
                    maxTokens: 2048,
                });

                // Save AI response
                const aiMessage = await HospitalChatService.createChatMessage(hospitalId, userId, {
                    caseId,
                    role: "assistant",
                    content: aiResult.content,
                    metadata: JSON.stringify({
                        model: process.env.AI_PROVIDER === "gemini" ? "gemini-1.5-flash" : "gpt-4o",
                        usage: aiResult.usage,
                        patientId: patientData?.id,
                        contextIncluded: !!patientData,
                    }),
                });

                console.log(`🤖 AI responded to chat in case ${caseId.substring(0, 8)} (${aiResult.usage?.totalTokens || 0} tokens)`);

                res.status(201).json({
                    success: true,
                    data: {
                        userMessage,
                        aiMessage,
                    }
                });
            } catch (aiError: any) {
                console.error("[AI] Failed to generate response:", aiError.message);
                // Still return success since user message was saved
                res.status(201).json({ success: true, data: userMessage, error: "AI response failed" });
            }
        } catch (error) {
            console.error("[API] Create chat message error:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    });
}

// ============================================================================
// AUDIT LOG ENDPOINTS
// ============================================================================

function registerAuditEndpoints(app: Express) {
    app.get("/api/audit-logs", async (req: Request, res: Response) => {
        try {
            const hospitalId = getHospitalId(req);
            const limit = parseInt(req.query.limit as string) || 100;
            const logs = await HospitalAuditService.getAuditLogs(hospitalId, limit);
            res.json({ success: true, data: logs });
        } catch (error) {
            console.error("[API] Get audit logs error:", error);
            res.status(500).json({ success: false, error: (error as Error).message });
        }
    });
}

// ============================================================================
// PATIENT QR IDENTITY ENDPOINTS
// FHIR R4 Compliant | HIPAA-Aligned | Secure Token-Based Access
// ============================================================================

function registerQRIdentityEndpoints(app: Express) {
    /**
     * POST /api/qr/generate
     * Generate QR code for a patient
     * SECURITY: Requires authentication, validates input
     */
    app.post("/api/qr/generate", async (req: Request, res: Response) => {
        try {
            const hospitalId = getHospitalId(req);
            const userId = getUserId(req);
            const { patientId, expiryDays } = req.body;

            // Input validation
            if (!patientId || typeof patientId !== 'string') {
                return res.status(400).json({
                    success: false,
                    error: "Valid Patient ID is required"
                });
            }

            // Sanitize patient ID - allow only alphanumeric, hyphens, underscores
            const sanitizedPatientId = patientId.trim();
            if (!/^[a-zA-Z0-9\-_]+$/.test(sanitizedPatientId) || sanitizedPatientId.length > 100) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid Patient ID format"
                });
            }

            // Validate expiry days if provided
            if (expiryDays !== undefined && expiryDays !== null) {
                const days = parseInt(expiryDays, 10);
                if (isNaN(days) || days < 1 || days > 365) {
                    return res.status(400).json({
                        success: false,
                        error: "Expiry days must be between 1 and 365"
                    });
                }
            }

            // Get Azure SQL connection pool
            const pool = await getConnectionPool();

            // Use Azure SQL-based QR service
            const qrData = await PatientQRService.generatePatientQR(pool, {
                patientId: sanitizedPatientId,
                hospitalId: hospitalId,
                createdByUserId: userId,
                expiryDays: expiryDays || null
            });

            // Log QR generation
            await HospitalAuditService.createAuditLog(
                hospitalId,
                userId,
                getEntraOid(req),
                {
                    eventType: 'qr_generated',
                    resourceType: 'patient',
                    resourceId: patientId.toString(),
                    action: 'create',
                    details: {
                        fhirPatientId: qrData.fhirPatientId,
                        mpi: qrData.mpi
                    }
                }
            );

            res.json({
                success: true,
                data: {
                    qrCodeId: qrData.qrCodeId,
                    fhirPatientId: qrData.fhirPatientId,
                    masterPatientIdentifier: qrData.mpi,
                    qrImageDataUrl: qrData.qrImageDataUrl,
                    message: "QR code generated successfully"
                }
            });
        } catch (error: any) {
            console.error("[API] Generate QR error:", error.message);
            // SECURITY: Don't expose internal error details
            const isValidationError = error.message?.includes('Invalid parameter');
            res.status(isValidationError ? 400 : 500).json({
                success: false,
                error: isValidationError ? error.message : "Failed to generate QR code"
            });
        }
    });

    /**
     * POST /api/qr/scan
     * Validate QR token and return patient data for redirect
     * SECURITY: RBAC enforced | Full audit trail | Rate limited
     */
    app.post("/api/qr/scan", async (req: Request, res: Response) => {
        try {
            const hospitalId = getHospitalId(req);
            const userId = getUserId(req);
            const entraOid = getEntraOid(req);
            const { qrToken, accessPurpose } = req.body;

            // Input validation
            if (!qrToken || typeof qrToken !== 'string') {
                return res.status(400).json({
                    success: false,
                    error: "QR token is required",
                    code: 'INVALID_INPUT'
                });
            }

            // Prevent excessively long tokens (DoS protection)
            if (qrToken.length > 2000) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid token",
                    code: 'INVALID_INPUT'
                });
            }

            // Sanitize access purpose
            const sanitizedPurpose = (accessPurpose || 'clinical_care').slice(0, 100);

            // Get Azure SQL connection pool
            const pool = await getConnectionPool();

            // Step 1: Validate QR token
            const validation = await PatientQRService.validateQRToken(pool, qrToken);

            if (!validation.valid) {
                // Log failed access attempt
                await HospitalAuditService.createAuditLog(
                    hospitalId,
                    userId,
                    entraOid,
                    {
                        eventType: 'qr_scan_failed',
                        resourceType: 'patient',
                        resourceId: 'unknown',
                        action: 'read',
                        details: {
                            reason: validation.error,
                            ipAddress: req.ip,
                            userAgent: req.headers['user-agent']
                        }
                    }
                );

                return res.status(403).json({
                    success: false,
                    error: validation.error,
                    code: 'QR_VALIDATION_FAILED'
                });
            }

            const { patientId, hospitalId: qrHospitalId, fhirPatientId } = validation;

            // Step 2: RBAC - Check if user has access to this patient's hospital
            const user = req.user;
            const hasAccess = hospitalId === qrHospitalId || user?.role === 'admin';

            if (!hasAccess) {
                // Log unauthorized access attempt
                await HospitalAuditService.createAuditLog(
                    hospitalId,
                    userId,
                    entraOid,
                    {
                        eventType: 'qr_scan_unauthorized',
                        resourceType: 'patient',
                        resourceId: patientId!.toString(),
                        action: 'read',
                        details: {
                            reason: 'Hospital mismatch - cross-hospital access denied',
                            requestedHospitalId: qrHospitalId,
                            userHospitalId: hospitalId
                        }
                    }
                );

                return res.status(403).json({
                    success: false,
                    error: "Access denied - you don't have permission to access this patient's records",
                    code: 'RBAC_ACCESS_DENIED'
                });
            }

            // Step 3: Get QR code record for audit logging
            const qrRecord = await PatientQRService.getPatientQRCode(pool, patientId!, qrHospitalId!);

            // Step 4: Log successful scan
            await PatientQRService.logQRScan(
                pool,
                {
                    qrCodeId: qrRecord.id,
                    patientId: patientId!,
                    hospitalId: qrHospitalId!,
                    scannedByUserId: userId,
                    scannedByRole: user?.role || 'clinician',
                    accessPurpose: sanitizedPurpose,
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                    deviceType: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'web',
                    sessionId: (req as any).sessionID || 'no_session',
                    requestId: req.headers['x-request-id'] as string
                },
                true
            );

            // Step 5: Get basic patient data from patients table
            const patientData = await HospitalPatientService.getPatient(qrHospitalId!, patientId!);

            if (!patientData) {
                return res.status(404).json({
                    success: false,
                    error: 'Patient not found',
                    code: 'PATIENT_NOT_FOUND'
                });
            }

            // Step 6: Log data access in audit system
            await HospitalAuditService.createAuditLog(
                qrHospitalId!.toString(),
                userId,
                entraOid,
                {
                    eventType: 'qr_scan_success',
                    resourceType: 'patient',
                    resourceId: patientId!.toString(),
                    action: 'read',
                    details: {
                        fhirPatientId,
                        accessPurpose: sanitizedPurpose
                    }
                }
            );

            // Return simple patient data with redirect info
            res.json({
                success: true,
                data: {
                    patientId: patientData.id,
                    hospitalId: patientData.hospitalId,
                    firstName: patientData.firstName,
                    lastName: patientData.lastName,
                    mrn: patientData.mrn,
                    dateOfBirth: patientData.dateOfBirth,
                    gender: patientData.gender,
                    redirectUrl: `/patients/${patientData.id}`
                },
                message: "Patient identified successfully - redirecting to patient details"
            });
        } catch (error: any) {
            console.error("[API] QR scan error:", error.message);
            // SECURITY: Don't expose internal error details
            res.status(500).json({
                success: false,
                error: "Failed to process QR scan",
                code: 'INTERNAL_ERROR'
            });
        }
    });

    /**
     * GET /api/qr/patient-data/:qrToken
     * Retrieve patient data using QR token for redirect
     * SECURITY: Public endpoint - logs all access, validates tokens
     */
    app.get("/api/qr/patient-data/:qrToken", async (req: Request, res: Response) => {
        try {
            const { qrToken } = req.params;

            // Input validation
            if (!qrToken || typeof qrToken !== 'string') {
                return res.status(400).json({
                    success: false,
                    error: "QR token is required"
                });
            }

            // Prevent excessively long tokens (DoS protection)
            if (qrToken.length > 2000) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid token"
                });
            }

            // Get Azure SQL connection pool
            const pool = await getConnectionPool();

            // Validate QR token
            const validation = await PatientQRService.validateQRToken(pool, qrToken);

            if (!validation.valid) {
                return res.status(403).json({
                    success: false,
                    error: validation.error,
                    code: 'QR_VALIDATION_FAILED'
                });
            }

            const { patientId, hospitalId, fhirPatientId } = validation;

            // Log the scan (without user authentication)
            const qrRecord = await PatientQRService.getPatientQRCode(pool, patientId!, hospitalId!);
            await PatientQRService.logQRScan(
                pool,
                {
                    qrCodeId: qrRecord.id,
                    patientId: patientId!,
                    hospitalId: hospitalId!,
                    scannedByUserId: '0', // Public scan - no user ID
                    scannedByRole: 'public',
                    accessPurpose: 'qr_scan',
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                    deviceType: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'web',
                    sessionId: (req as any).sessionID || 'no_session',
                    requestId: req.headers['x-request-id'] as string
                },
                true
            );

            // Fetch basic patient data
            const patientData = await HospitalPatientService.getPatient(hospitalId!, patientId!);

            if (!patientData) {
                return res.status(404).json({
                    success: false,
                    error: 'Patient not found',
                    code: 'PATIENT_NOT_FOUND'
                });
            }

            res.json({
                success: true,
                data: {
                    patientId: patientData.id,
                    hospitalId: patientData.hospitalId,
                    firstName: patientData.firstName,
                    lastName: patientData.lastName,
                    mrn: patientData.mrn,
                    dateOfBirth: patientData.dateOfBirth,
                    gender: patientData.gender,
                    redirectUrl: `/patients/${patientData.id}`
                },
                message: "Patient identified successfully"
            });
        } catch (error: any) {
            console.error("[API] Get patient data by QR token error:", error.message);
            // SECURITY: Don't expose internal error details
            res.status(500).json({
                success: false,
                error: "Failed to retrieve patient data"
            });
        }
    });

    /**
     * GET /api/qr/patient/:patientId
     * Get existing QR code metadata for a patient
     * SECURITY: Requires authentication, returns only metadata (no token)
     */
    app.get("/api/qr/patient/:patientId", async (req: Request, res: Response) => {
        try {
            const hospitalId = getHospitalId(req);
            const { patientId } = req.params;

            // Input validation
            if (!patientId || !/^[a-zA-Z0-9\-_]+$/.test(patientId) || patientId.length > 100) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid patient ID format"
                });
            }

            // Get Azure SQL connection pool
            const pool = await getConnectionPool();

            const qrData = await PatientQRService.getPatientQRCode(
                pool,
                patientId,
                hospitalId
            );

            if (!qrData) {
                return res.status(404).json({
                    success: false,
                    error: "No active QR code found for this patient"
                });
            }

            // SECURITY: Never return the actual token - only metadata
            res.json({
                success: true,
                data: {
                    qrCodeId: qrData.id,
                    fhirPatientId: qrData.fhir_patient_id,
                    masterPatientIdentifier: qrData.master_patient_identifier,
                    isActive: qrData.is_active,
                    expiresAt: qrData.token_expires_at,
                    createdAt: qrData.created_at
                }
            });
        } catch (error: any) {
            console.error("[API] Get patient QR error:", error.message);
            res.status(500).json({
                success: false,
                error: "Failed to retrieve QR code"
            });
        }
    });

    /**
     * POST /api/qr/revoke
     * Revoke a QR code (security incident, patient merge, etc.)
     * SECURITY: Requires authentication, validates input, logs action
     */
    app.post("/api/qr/revoke", async (req: Request, res: Response) => {
        try {
            const userId = getUserId(req);
            const entraOid = getEntraOid(req);
            const { qrCodeId, reason } = req.body;

            // Input validation
            if (!qrCodeId || typeof qrCodeId !== 'number' || qrCodeId <= 0) {
                return res.status(400).json({
                    success: false,
                    error: "Valid QR code ID is required"
                });
            }

            if (!reason || typeof reason !== 'string' || reason.length < 10 || reason.length > 500) {
                return res.status(400).json({
                    success: false,
                    error: "Valid reason is required (10-500 characters)"
                });
            }

            // Get Azure SQL connection pool
            const pool = await getConnectionPool();

            await PatientQRService.revokeQRCode(pool, qrCodeId, userId, reason);

            // Log revocation
            await HospitalAuditService.createAuditLog(
                getHospitalId(req),
                userId,
                entraOid,
                {
                    eventType: 'qr_revoked',
                    resourceType: 'qr_code',
                    resourceId: qrCodeId.toString(),
                    action: 'update',
                    details: {
                        reason,
                        revokedBy: userId
                    }
                }
            );

            res.json({
                success: true,
                message: "QR code revoked successfully"
            });
        } catch (error: any) {
            console.error("[API] Revoke QR error:", error.message);
            res.status(500).json({
                success: false,
                error: "Failed to revoke QR code"
            });
        }
    });
}



// ============================================================================
// MAIN REGISTRATION FUNCTION
// ============================================================================

export async function registerApiRoutes(httpServer: Server, app: Express): Promise<Server> {
    console.log("🔐 Registering hospital-scoped API routes...");

    registerUserEndpoints(app);
    registerPatientEndpoints(app);
    registerCaseEndpoints(app);
    registerDashboardEndpoints(app);
    registerLabEndpoints(app);
    registerChatEndpoints(app);
    registerAuditEndpoints(app);
    registerQRIdentityEndpoints(app);

    // Early Deterioration Detection Agent routes
    try {
        const deteriorationRoutes = await import("./api/deterioration-routes");
        app.use("/api/deterioration", deteriorationRoutes.default);
        console.log("✅ Early Deterioration Detection Agent routes registered");
    } catch (error) {
        console.warn("⚠️  Deterioration routes not loaded:", (error as Error).message);
    }

    // Medication Safety Engine routes
    try {
        const medicationSafetyRoutes = await import("./api/medication-safety-routes");
        app.use("/api/medication-safety", medicationSafetyRoutes.default);
        console.log("✅ Medication Safety Engine routes registered");
    } catch (error) {
        console.warn("⚠️  Medication Safety routes not loaded:", (error as Error).message);
    }

    console.log("✅ All API routes registered with hospital isolation");

    return httpServer;
}
