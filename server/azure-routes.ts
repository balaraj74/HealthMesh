/**
 * HealthMesh - Azure-Powered API Routes
 * Complete REST API for clinical decision support system
 */

import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import multer from "multer";
import { analyzeCase, handleClinicianChat, processLabReport } from "./azure-agents";
import { getAzureConfig, validateAzureConfig, initializeAzureServices } from "./azure";
import { getCosmosDB } from "./azure/cosmos-db";
import { getCognitiveSearch, MEDICAL_GUIDELINES_INDEX_SCHEMA } from "./azure/cognitive-search";
import { getMonitor } from "./azure/monitoring";
import { storage } from "./storage";
import type {
  Patient, InsertPatient,
  ClinicalCase, InsertCase,
  LabReport, AuditLog,
  ChatMessage
} from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (
    _req: any,
    file: { mimetype: string },
    cb: (error: Error | null, acceptFile?: boolean) => void
  ) => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and images are allowed.'));
    }
  },
});

// Helper function to determine storage backend
function useAzureStorage(): boolean {
  const config = getAzureConfig();
  return !!(config.cosmos.endpoint && config.cosmos.key);
}

// Helper to create audit log
async function createAuditLog(
  action: AuditLog['action'],
  entityType: AuditLog['entityType'],
  entityId: string,
  details: any,
  userId?: string
): Promise<void> {
  const log: Omit<AuditLog, 'id'> = {
    timestamp: new Date().toISOString(),
    action,
    entityType,
    entityId,
    userId,
    details,
  };

  if (useAzureStorage()) {
    await getCosmosDB().createAuditLog(log);
  } else {
    await storage.createAuditLog(log);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ==========================================
  // Health & Status Endpoints
  // ==========================================

  app.get("/api/health", async (req: Request, res: Response) => {
    const serviceStatus = await initializeAzureServices();
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      azure: serviceStatus,
    });
  });

  app.get("/api/config/status", async (req: Request, res: Response) => {
    const config = getAzureConfig();
    const validation = validateAzureConfig(config);

    res.json({
      configured: validation.valid,
      missing: validation.missing,
      services: {
        azureOpenAI: !!config.openai.endpoint,
        fhir: !!config.fhir.endpoint,
        documentIntelligence: !!config.documentIntelligence.endpoint,
        cognitiveSearch: !!config.search.endpoint,
        cosmosDB: !!config.cosmos.endpoint,
        appInsights: !!config.appInsights.connectionString,
      },
    });
  });

  // ==========================================
  // Patient Endpoints
  // ==========================================

  app.get("/api/patients", async (req: Request, res: Response) => {
    try {
      const patients = useAzureStorage()
        ? await getCosmosDB().getPatients()
        : await storage.getPatients();

      res.json({ success: true, data: patients });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  app.get("/api/patients/:id", async (req: Request, res: Response) => {
    try {
      const patient = useAzureStorage()
        ? await getCosmosDB().getPatient(req.params.id)
        : await storage.getPatient(req.params.id);

      if (!patient) {
        return res.status(404).json({ success: false, error: "Patient not found" });
      }

      await createAuditLog('data-accessed', 'patient', req.params.id, { action: 'view' });
      res.json({ success: true, data: patient });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  app.post("/api/patients", async (req: Request, res: Response) => {
    try {
      const patientData: InsertPatient = req.body;

      const patient = useAzureStorage()
        ? await getCosmosDB().createPatient(patientData)
        : await storage.createPatient(patientData);

      await createAuditLog('patient-created', 'patient', patient.id, {
        mrn: patient.demographics.mrn,
        name: `${patient.demographics.firstName} ${patient.demographics.lastName}`,
      });

      res.status(201).json({ success: true, data: patient });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  app.delete("/api/patients/:id", async (req: Request, res: Response) => {
    try {
      const deleted = useAzureStorage()
        ? await getCosmosDB().deletePatient(req.params.id)
        : await storage.deletePatient(req.params.id);

      if (!deleted) {
        return res.status(404).json({ success: false, error: "Patient not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // ==========================================
  // Case Endpoints
  // ==========================================

  app.get("/api/cases", async (req: Request, res: Response) => {
    try {
      const cases = useAzureStorage()
        ? await getCosmosDB().getCases()
        : await storage.getCases();

      res.json({ success: true, data: cases });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  app.get("/api/cases/:id", async (req: Request, res: Response) => {
    try {
      const clinicalCase = useAzureStorage()
        ? await getCosmosDB().getCase(req.params.id)
        : await storage.getCase(req.params.id);

      if (!clinicalCase) {
        return res.status(404).json({ success: false, error: "Case not found" });
      }

      await createAuditLog('data-accessed', 'case', req.params.id, { action: 'view' });
      res.json({ success: true, data: clinicalCase });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  app.post("/api/cases", async (req: Request, res: Response) => {
    try {
      const caseData: InsertCase = req.body;

      const clinicalCase = useAzureStorage()
        ? await getCosmosDB().createCase(caseData)
        : await storage.createCase(caseData);

      await createAuditLog('case-created', 'case', clinicalCase.id, {
        patientId: clinicalCase.patientId,
        caseType: clinicalCase.caseType,
        clinicalQuestion: clinicalCase.clinicalQuestion.substring(0, 100),
      });

      res.status(201).json({ success: true, data: clinicalCase });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  app.put("/api/cases/:id", async (req: Request, res: Response) => {
    try {
      const updates = req.body;

      let updatedCase: ClinicalCase | undefined;
      
      if (useAzureStorage()) {
        const existingCase = await getCosmosDB().getCase(req.params.id);
        if (existingCase) {
          updatedCase = await getCosmosDB().updateCase(req.params.id, existingCase.patientId, updates);
        }
      } else {
        updatedCase = await storage.updateCase(req.params.id, updates);
      }

      if (!updatedCase) {
        return res.status(404).json({ success: false, error: "Case not found" });
      }

      await createAuditLog('case-updated', 'case', req.params.id, { updates: Object.keys(updates) });
      res.json({ success: true, data: updatedCase });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  app.delete("/api/cases/:id", async (req: Request, res: Response) => {
    try {
      let deleted = false;
      
      if (useAzureStorage()) {
        const existingCase = await getCosmosDB().getCase(req.params.id);
        if (existingCase) {
          deleted = await getCosmosDB().deleteCase(req.params.id, existingCase.patientId);
        }
      } else {
        deleted = await storage.deleteCase(req.params.id);
      }

      if (!deleted) {
        return res.status(404).json({ success: false, error: "Case not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // ==========================================
  // Case Analysis Endpoint (Main AI Workflow)
  // ==========================================

  app.post("/api/cases/:id/analyze", async (req: Request, res: Response) => {
    try {
      const caseId = req.params.id;

      // Get case and patient
      const clinicalCase = useAzureStorage()
        ? await getCosmosDB().getCase(caseId)
        : await storage.getCase(caseId);

      if (!clinicalCase) {
        return res.status(404).json({ success: false, error: "Case not found" });
      }

      const patient = useAzureStorage()
        ? await getCosmosDB().getPatient(clinicalCase.patientId)
        : await storage.getPatient(clinicalCase.patientId);

      if (!patient) {
        return res.status(404).json({ success: false, error: "Patient not found" });
      }

      // Update case status to analyzing
      if (useAzureStorage()) {
        await getCosmosDB().updateCase(caseId, patient.id, { status: 'analyzing' });
      } else {
        await storage.updateCase(caseId, { status: 'analyzing' });
      }

      await createAuditLog('case-analyzed', 'case', caseId, { status: 'started' });

      // Run AI analysis
      const { agentOutputs, recommendations, riskAlerts } = await analyzeCase(patient, clinicalCase);

      // Update case with results
      const updates: Partial<ClinicalCase> = {
        status: 'review-ready',
        agentOutputs,
        recommendations,
        riskAlerts,
        updatedAt: new Date().toISOString(),
      };

      let updatedCase: ClinicalCase | undefined;
      if (useAzureStorage()) {
        updatedCase = await getCosmosDB().updateCase(caseId, patient.id, updates);
      } else {
        updatedCase = await storage.updateCase(caseId, updates);
      }

      await createAuditLog('case-analyzed', 'case', caseId, {
        status: 'completed',
        agentCount: agentOutputs.length,
        recommendationCount: recommendations.length,
        alertCount: riskAlerts.length,
      });

      res.json({
        success: true,
        data: {
          case: updatedCase,
          agentOutputs,
          recommendations,
          riskAlerts,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // ==========================================
  // Lab Report Endpoints
  // ==========================================

  app.get("/api/cases/:id/lab-reports", async (req: Request, res: Response) => {
    try {
      const reports = useAzureStorage()
        ? await getCosmosDB().getLabReports(req.params.id)
        : await storage.getLabReports(req.params.id);

      res.json({ success: true, data: reports });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  app.post("/api/cases/:id/lab-reports", upload.single('file'), async (req: Request, res: Response) => {
    try {
      const caseId = req.params.id;
      const file = (req as any).file as { buffer: Buffer; mimetype: string; originalname: string } | undefined;

      if (!file) {
        return res.status(400).json({ success: false, error: "No file uploaded" });
      }

      // Process lab report using Document Intelligence
      const processingResult = await processLabReport(
        file.buffer,
        file.mimetype,
        caseId
      );

      // Create lab report record
      const labReport: Omit<LabReport, 'id'> = {
        caseId,
        fileName: file.originalname,
        fileType: file.mimetype,
        uploadedAt: new Date().toISOString(),
        status: processingResult.success ? 'completed' : 'failed',
        extractedData: processingResult.labResults,
        rawText: processingResult.rawText,
      };

      const createdReport = useAzureStorage()
        ? await getCosmosDB().createLabReport(labReport)
        : await storage.createLabReport(labReport);

      await createAuditLog('lab-uploaded', 'lab-report', createdReport.id, {
        caseId,
        fileName: file.originalname,
        extractedValueCount: processingResult.labResults.length,
      });

      res.status(201).json({
        success: true,
        data: {
          report: createdReport,
          extraction: {
            success: processingResult.success,
            documentType: processingResult.documentType,
            confidence: processingResult.confidence,
            labResults: processingResult.labResults,
          },
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // ==========================================
  // Chat Endpoints
  // ==========================================

  app.get("/api/cases/:id/chat", async (req: Request, res: Response) => {
    try {
      const messages = useAzureStorage()
        ? await getCosmosDB().getChatMessages(req.params.id)
        : await storage.getChatMessages(req.params.id);

      res.json({ success: true, data: messages });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  app.post("/api/cases/:id/chat", async (req: Request, res: Response) => {
    try {
      const caseId = req.params.id;
      const { message } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ success: false, error: "Message is required" });
      }

      // Get case and patient
      const clinicalCase = useAzureStorage()
        ? await getCosmosDB().getCase(caseId)
        : await storage.getCase(caseId);

      if (!clinicalCase) {
        return res.status(404).json({ success: false, error: "Case not found" });
      }

      const patient = useAzureStorage()
        ? await getCosmosDB().getPatient(clinicalCase.patientId)
        : await storage.getPatient(clinicalCase.patientId);

      if (!patient) {
        return res.status(404).json({ success: false, error: "Patient not found" });
      }

      // Save clinician message
      const clinicianMessage: Omit<ChatMessage, 'id'> = {
        caseId,
        role: 'clinician',
        content: message,
        timestamp: new Date().toISOString(),
      };

      if (useAzureStorage()) {
        await getCosmosDB().createChatMessage(clinicianMessage);
      } else {
        await storage.createChatMessage(clinicianMessage);
      }

      // Get AI response
      const response = await handleClinicianChat(caseId, message, patient, clinicalCase);

      // Save assistant message
      const assistantMessage: Omit<ChatMessage, 'id'> = {
        caseId,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
        agentType: 'clinician-interaction',
      };

      const savedResponse = useAzureStorage()
        ? await getCosmosDB().createChatMessage(assistantMessage)
        : await storage.createChatMessage(assistantMessage);

      res.json({ success: true, data: savedResponse });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // ==========================================
  // Recommendation Feedback Endpoints
  // ==========================================

  app.post("/api/cases/:caseId/recommendations/:recId/feedback", async (req: Request, res: Response) => {
    try {
      const { caseId, recId } = req.params;
      const { status, feedback } = req.body;

      const recommendation = useAzureStorage()
        ? await getCosmosDB().updateRecommendation(caseId, recId, { status, clinicianFeedback: feedback })
        : await storage.updateRecommendation(caseId, recId, { status, clinicianFeedback: feedback });

      if (!recommendation) {
        return res.status(404).json({ success: false, error: "Recommendation not found" });
      }

      await createAuditLog('recommendation-reviewed', 'recommendation', recId, {
        caseId,
        status,
        hasFeedback: !!feedback,
      });

      // Track in monitoring
      await getMonitor().trackClinicianFeedback(recId, caseId, status, feedback);

      res.json({ success: true, data: recommendation });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // ==========================================
  // Risk Alerts Endpoints
  // ==========================================

  app.get("/api/alerts", async (req: Request, res: Response) => {
    try {
      const alerts = useAzureStorage()
        ? await getCosmosDB().getRiskAlerts()
        : await storage.getRiskAlerts();

      res.json({ success: true, data: alerts });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  app.get("/api/cases/:id/alerts", async (req: Request, res: Response) => {
    try {
      const alerts = useAzureStorage()
        ? await getCosmosDB().getRiskAlerts(req.params.id)
        : await storage.getRiskAlerts(req.params.id);

      res.json({ success: true, data: alerts });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // ==========================================
  // Dashboard Endpoints
  // ==========================================

  app.get("/api/dashboard/stats", async (req: Request, res: Response) => {
    try {
      const stats = useAzureStorage()
        ? await getCosmosDB().getDashboardStats()
        : await storage.getDashboardStats();

      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // ==========================================
  // Audit Log Endpoints
  // ==========================================

  app.get("/api/audit-logs", async (req: Request, res: Response) => {
    try {
      const entityId = req.query.entityId as string | undefined;

      const logs = useAzureStorage()
        ? await getCosmosDB().getAuditLogs(entityId)
        : await storage.getAuditLogs(entityId);

      res.json({ success: true, data: logs });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // ==========================================
  // Cognitive Search Admin Endpoints
  // ==========================================

  app.post("/api/admin/search/initialize", async (req: Request, res: Response) => {
    try {
      const searchClient = getCognitiveSearch();

      // Create index
      await searchClient.createIndex(MEDICAL_GUIDELINES_INDEX_SCHEMA);

      // Index sample guidelines
      const sampleGuidelines = searchClient.getSampleGuidelines();
      await searchClient.indexDocuments(sampleGuidelines);

      res.json({
        success: true,
        message: "Search index initialized with sample guidelines",
        documentCount: sampleGuidelines.length,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  app.post("/api/admin/search/documents", async (req: Request, res: Response) => {
    try {
      const { documents } = req.body;

      if (!Array.isArray(documents)) {
        return res.status(400).json({ success: false, error: "Documents array required" });
      }

      const searchClient = getCognitiveSearch();
      await searchClient.indexDocuments(documents);

      res.json({
        success: true,
        message: "Documents indexed successfully",
        documentCount: documents.length,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  app.post("/api/admin/search/query", async (req: Request, res: Response) => {
    try {
      const { query, searchType = 'hybrid' } = req.body;

      if (!query) {
        return res.status(400).json({ success: false, error: "Query is required" });
      }

      const searchClient = getCognitiveSearch();
      let results;

      switch (searchType) {
        case 'keyword':
          results = await searchClient.search(query);
          break;
        case 'vector':
          results = await searchClient.vectorSearch(query);
          break;
        case 'hybrid':
        default:
          results = await searchClient.hybridSearch(query);
      }

      res.json({ success: true, data: results });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  return httpServer;
}
