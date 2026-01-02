/**
 * Medication Safety API Routes
 * HealthMesh - AI-Enhanced Medication Safety Engine
 * 
 * Endpoints:
 * - POST /api/medication-safety/analyze - Full safety analysis
 * - POST /api/medication-safety/analyze-real - AI-powered analysis with real patient data
 * - POST /api/medication-safety/check-new - Check a new medication
 * - POST /api/medication-safety/alert/:id/acknowledge - Acknowledge alert
 * - GET /api/medication-safety/patient/:patientId/history - Alert history
 * 
 * HIPAA-Compliant | Audit Logged | Hospital-Scoped
 */

import { Router, Request, Response } from "express";
import {
    medicationSafetyEngine,
    MedicationSafetyInput,
    MedicationSafetyOutput,
    MedicationSafetyAlert
} from "../agents/medication-safety-engine";
import { aiMedicationSafetyAgent } from "../agents/ai-medication-safety-agent";
import { getMonitor } from "../azure/monitoring";

const router = Router();

// Extract hospital/user context from authenticated request
const getHospitalId = (req: Request): string => (req as any).hospitalId || "default";
const getUserId = (req: Request): string => (req as any).userId || "system";
const getEntraOid = (req: Request): string => (req as any).entraOid || "";

// In-memory storage (production would use Azure SQL)
const alertHistory = new Map<string, MedicationSafetyAlert[]>();
const analysisHistory = new Map<string, MedicationSafetyOutput[]>();

// ============================================================================
// POST /api/medication-safety/analyze
// Full medication safety analysis for a patient
// ============================================================================

router.post("/analyze", async (req: Request, res: Response) => {
    try {
        const hospitalId = getHospitalId(req);
        const userId = getUserId(req);
        const monitor = getMonitor();

        const {
            patientId,
            patientContext,
            currentMedications,
            recentMedications,
            recentLabs,
            clinicalContext,
        } = req.body;

        if (!patientId || !currentMedications) {
            return res.status(400).json({
                success: false,
                error: "patientId and currentMedications are required"
            });
        }

        console.log(`[MedicationSafety] Analyzing ${currentMedications.length} medications for patient ${patientId.substring(0, 8)}...`);

        // Build input for engine
        const input: MedicationSafetyInput = {
            patient: {
                patientId,
                age: patientContext?.age || 50,
                gender: patientContext?.gender || "other",
                weight: patientContext?.weight,
                height: patientContext?.height,
                renalFunction: patientContext?.renalFunction,
                hepaticFunction: patientContext?.hepaticFunction,
                allergies: patientContext?.allergies || [],
                diagnoses: patientContext?.diagnoses || [],
            },
            currentMedications: currentMedications.map((m: any) => ({
                id: m.id || crypto.randomUUID(),
                name: m.name,
                genericName: m.genericName,
                dosage: m.dosage || "",
                frequency: m.frequency || "",
                route: m.route,
                status: m.status || "active",
                startDate: m.startDate,
                prescriber: m.prescriber,
                rxNormCode: m.rxNormCode,
            })),
            recentMedications: recentMedications?.map((m: any) => ({
                id: m.id || crypto.randomUUID(),
                name: m.name,
                dosage: m.dosage || "",
                frequency: m.frequency || "",
                status: m.status || "completed",
            })),
            recentLabs: recentLabs?.map((l: any) => ({
                code: l.code || l.testName,
                display: l.display || l.testName,
                value: parseFloat(l.value) || 0,
                unit: l.unit || "",
                referenceRange: l.referenceRange,
                status: l.status || "normal",
                effectiveDateTime: l.effectiveDateTime || l.collectedDate || new Date().toISOString(),
                trend: l.trend,
            })),
            clinicalContext,
        };

        // Run analysis
        const result = await medicationSafetyEngine.analyze(input);

        // Store results
        const patientAlerts = alertHistory.get(patientId) || [];
        patientAlerts.push(...result.alerts);
        alertHistory.set(patientId, patientAlerts);

        const patientAnalyses = analysisHistory.get(patientId) || [];
        patientAnalyses.push(result);
        analysisHistory.set(patientId, patientAnalyses.slice(-10)); // Keep last 10

        // Track in monitoring
        await monitor.trackEvent({
            name: "MedicationSafetyAnalysis",
            properties: {
                patientId,
                hospitalId,
                userId,
                alertCount: String(result.alerts.length),
                overallStatus: result.overallSafetyStatus,
            },
            measurements: {
                analysisTime: result.analysisTime,
            },
        });

        console.log(`[MedicationSafety] Analysis complete: ${result.overallSafetyStatus}, ${result.alerts.length} alerts`);

        res.json({
            success: true,
            data: result,
        });

    } catch (error) {
        console.error("[MedicationSafety] Analysis error:", error);
        res.status(500).json({
            success: false,
            error: (error as Error).message
        });
    }
});

// ============================================================================
// POST /api/medication-safety/check-new
// Quick check for a NEW medication being added
// ============================================================================

router.post("/check-new", async (req: Request, res: Response) => {
    try {
        const {
            patientId,
            patientContext,
            currentMedications,
            newMedication,
        } = req.body;

        if (!patientId || !newMedication) {
            return res.status(400).json({
                success: false,
                error: "patientId and newMedication are required"
            });
        }

        console.log(`[MedicationSafety] Checking new medication: ${newMedication.name}`);

        // Add new med to the list for checking
        const allMedications = [
            ...(currentMedications || []),
            { ...newMedication, status: "active" }
        ];

        const input: MedicationSafetyInput = {
            patient: {
                patientId,
                age: patientContext?.age || 50,
                gender: patientContext?.gender || "other",
                renalFunction: patientContext?.renalFunction,
                hepaticFunction: patientContext?.hepaticFunction,
                allergies: patientContext?.allergies || [],
                diagnoses: patientContext?.diagnoses || [],
            },
            currentMedications: allMedications.map((m: any) => ({
                id: m.id || crypto.randomUUID(),
                name: m.name,
                dosage: m.dosage || "",
                frequency: m.frequency || "",
                status: m.status || "active",
            })),
            newMedication: {
                id: newMedication.id || crypto.randomUUID(),
                name: newMedication.name,
                dosage: newMedication.dosage || "",
                frequency: newMedication.frequency || "",
                status: "active",
            },
        };

        const result = await medicationSafetyEngine.analyze(input);

        // Filter to only alerts involving the new medication
        const relevantAlerts = result.alerts.filter(a =>
            a.medications.some(m =>
                m.toLowerCase().includes(newMedication.name.toLowerCase())
            )
        );

        res.json({
            success: true,
            data: {
                medication: newMedication.name,
                safeToAdd: relevantAlerts.filter(a => a.severity === "HIGH").length === 0,
                alerts: relevantAlerts,
                overallStatus: relevantAlerts.length === 0 ? "SAFE" :
                    relevantAlerts.some(a => a.severity === "HIGH") ? "HIGH_RISK" : "CAUTION",
                recommendation: relevantAlerts.length === 0
                    ? "No significant interactions detected. Safe to prescribe."
                    : `${relevantAlerts.length} potential issue(s) found. Review before prescribing.`,
            },
        });

    } catch (error) {
        console.error("[MedicationSafety] Check-new error:", error);
        res.status(500).json({
            success: false,
            error: (error as Error).message
        });
    }
});

// ============================================================================
// POST /api/medication-safety/alert/:id/acknowledge
// Acknowledge an alert (for fatigue prevention)
// ============================================================================

router.post("/alert/:id/acknowledge", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { notes, cooldownMinutes = 60 } = req.body;
        const userId = getUserId(req);
        const monitor = getMonitor();

        medicationSafetyEngine.acknowledgeAlert(id, cooldownMinutes);

        await monitor.trackEvent({
            name: "MedicationSafetyAlertAcknowledged",
            properties: {
                alertId: id,
                userId,
                notes: notes || "",
            },
            measurements: {
                cooldownMinutes,
            },
        });

        res.json({
            success: true,
            message: `Alert acknowledged. Will not resurface for ${cooldownMinutes} minutes.`,
        });

    } catch (error) {
        console.error("[MedicationSafety] Acknowledge error:", error);
        res.status(500).json({
            success: false,
            error: (error as Error).message
        });
    }
});

// ============================================================================
// GET /api/medication-safety/patient/:patientId/history
// Get alert history for a patient
// ============================================================================

router.get("/patient/:patientId/history", async (req: Request, res: Response) => {
    try {
        const { patientId } = req.params;
        const { limit = 20 } = req.query;

        const alerts = alertHistory.get(patientId) || [];
        const analyses = analysisHistory.get(patientId) || [];

        res.json({
            success: true,
            data: {
                patientId,
                recentAlerts: alerts.slice(-Number(limit)),
                recentAnalyses: analyses.slice(-5),
                totalAlerts: alerts.length,
            },
        });

    } catch (error) {
        console.error("[MedicationSafety] History error:", error);
        res.status(500).json({
            success: false,
            error: (error as Error).message
        });
    }
});

// ============================================================================
// POST /api/medication-safety/analyze-real
// PRODUCTION: AI-Powered analysis using real patient data
// Uses Azure OpenAI for intelligent drug interaction detection
// Results are cached in database
// ============================================================================

router.post("/analyze-real", async (req: Request, res: Response) => {
    try {
        const hospitalId = getHospitalId(req);
        const userId = getUserId(req);
        const monitor = getMonitor();

        const {
            patientId,
            demographics,
            medications,
            allergies,
            diagnoses,
            labReports,
        } = req.body;

        if (!patientId) {
            return res.status(400).json({
                success: false,
                error: "patientId is required"
            });
        }

        // Extract renal/hepatic function from labs
        let renalFunction, hepaticFunction;

        if (labReports && labReports.length > 0) {
            const latestLabs = labReports.flatMap((r: any) => r.extractedData || []);

            const creatinine = latestLabs.find((l: any) =>
                l.testName?.toLowerCase().includes("creatinine")
            );
            const egfr = latestLabs.find((l: any) =>
                l.testName?.toLowerCase().includes("egfr") || l.testName?.toLowerCase().includes("gfr")
            );

            if (creatinine || egfr) {
                renalFunction = {
                    creatinine: creatinine ? parseFloat(creatinine.value) : undefined,
                    eGFR: egfr ? parseFloat(egfr.value) : undefined,
                };
            }

            const ast = latestLabs.find((l: any) => l.testName?.toLowerCase().includes("ast"));
            const alt = latestLabs.find((l: any) => l.testName?.toLowerCase().includes("alt"));
            const bilirubin = latestLabs.find((l: any) => l.testName?.toLowerCase().includes("bilirubin"));

            if (ast || alt || bilirubin) {
                hepaticFunction = {
                    ast: ast ? parseFloat(ast.value) : undefined,
                    alt: alt ? parseFloat(alt.value) : undefined,
                    bilirubin: bilirubin ? parseFloat(bilirubin.value) : undefined,
                };
            }
        }

        // Calculate age from DOB
        let age = 50;
        if (demographics?.dateOfBirth) {
            const dob = new Date(demographics.dateOfBirth);
            age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        }

        console.log(`[MedicationSafety] AI Analysis for patient ${patientId.substring(0, 8)}...`);
        console.log(`[MedicationSafety] ${(medications || []).length} total medications, Age: ${age}`);

        // Build patient data for AI agent
        const patientData = {
            patientId,
            age,
            gender: demographics?.gender || "other",
            weight: demographics?.weight,
            allergies: (allergies || []).map((a: any) => ({
                substance: a.substance,
                reaction: a.reaction,
                severity: a.severity || "moderate",
            })),
            diagnoses: (diagnoses || []).map((d: any) => ({
                code: d.code,
                display: d.display,
                status: d.status || "active",
            })),
            renalFunction,
            hepaticFunction,
        };

        // Build medication list
        const medicationList = (medications || []).map((m: any) => ({
            id: m.id || crypto.randomUUID(),
            name: m.name,
            dosage: m.dosage || "",
            frequency: m.frequency || "",
            route: m.route || "",
            status: m.status || "active",
        }));

        // Use AI-powered analysis
        const result = await aiMedicationSafetyAgent.analyze(
            patientData,
            medicationList,
            labReports,
            hospitalId
        );

        await monitor.trackEvent({
            name: "MedicationSafetyAIAnalysis",
            properties: {
                patientId,
                hospitalId,
                userId,
                overallStatus: result.overallSafetyStatus,
                aiModel: result.aiModel,
                cached: String(result.cached),
            },
            measurements: {
                medicationCount: medicationList.length,
                alertCount: result.alerts.length,
                analysisTime: result.analysisTime,
                confidence: result.confidence,
            },
        });

        console.log(`[MedicationSafety] AI Analysis complete: ${result.overallSafetyStatus}, ${result.alerts.length} alerts${result.cached ? " (cached)" : ""}`);

        res.json({
            success: true,
            data: result,
        });

    } catch (error) {
        console.error("[MedicationSafety] AI Analysis error:", error);
        res.status(500).json({
            success: false,
            error: (error as Error).message
        });
    }
});

export default router;
