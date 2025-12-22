/**
 * Tenant-Scoped API Routes
 * All endpoints enforce tenant isolation via Azure Entra ID
 * 
 * Every request has:
 * - req.tenantId: Azure AD tenant ID (tid)
 * - req.userId: Database user UUID
 * - req.userOid: Azure AD user object ID (oid)
 */

import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { getTenantId, getUserId } from "./auth/entraIdAuth";
import {
  TenantPatientService,
  TenantCaseService,
  TenantLabReportService,
  TenantChatService,
  TenantAuditService,
} from "./data/tenantDataAccess";

// ============================================================================
// PATIENT ENDPOINTS (Tenant-Scoped)
// ============================================================================

function registerPatientEndpoints(app: Express) {
  /**
   * GET /api/patients
   * Get all patients for the authenticated user's tenant
   */
  app.get("/api/patients", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const patients = await TenantPatientService.getPatients(tenantId);

      res.json({ success: true, data: patients });
    } catch (error) {
      console.error("[API] Get patients error:", error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  /**
   * GET /api/patients/:id
   * Get a specific patient (tenant-scoped)
   */
  app.get("/api/patients/:id", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const patient = await TenantPatientService.getPatient(tenantId, req.params.id);

      if (!patient) {
        return res.status(404).json({ success: false, error: "Patient not found" });
      }

      // Audit log
      await TenantAuditService.createAuditLog(
        tenantId,
        userId,
        req.userOid,
        {
          eventType: "data-accessed",
          resourceType: "patient",
          resourceId: req.params.id,
          action: "view",
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        }
      );

      res.json({ success: true, data: patient });
    } catch (error) {
      console.error("[API] Get patient error:", error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  /**
   * POST /api/patients
   * Create a new patient (tenant-scoped)
   */
  app.post("/api/patients", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);

      console.log(`[API] Creating patient for tenant: ${tenantId.substring(0, 8)}`);

      const patient = await TenantPatientService.createPatient(
        tenantId,
        userId,
        req.body
      );

      // Audit log
      await TenantAuditService.createAuditLog(
        tenantId,
        userId,
        req.userOid,
        {
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
        }
      );

      console.log(`[API] ✅ Patient created: ${patient.id}`);
      res.status(201).json({ success: true, data: patient });
    } catch (error) {
      console.error("[API] Create patient error:", error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  /**
   * PUT /api/patients/:id
   * Update a patient (tenant-scoped)
   */
  app.put("/api/patients/:id", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);

      const patient = await TenantPatientService.updatePatient(
        tenantId,
        req.params.id,
        req.body
      );

      if (!patient) {
        return res.status(404).json({ success: false, error: "Patient not found" });
      }

      // Audit log
      await TenantAuditService.createAuditLog(
        tenantId,
        userId,
        req.userOid,
        {
          eventType: "patient-updated",
          resourceType: "patient",
          resourceId: req.params.id,
          action: "update",
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        }
      );

      res.json({ success: true, data: patient });
    } catch (error) {
      console.error("[API] Update patient error:", error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  /**
   * DELETE /api/patients/:id
   * Delete a patient (tenant-scoped)
   */
  app.delete("/api/patients/:id", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);

      const deleted = await TenantPatientService.deletePatient(tenantId, req.params.id);

      if (!deleted) {
        return res.status(404).json({ success: false, error: "Patient not found" });
      }

      // Audit log
      await TenantAuditService.createAuditLog(
        tenantId,
        userId,
        req.userOid,
        {
          eventType: "patient-deleted",
          resourceType: "patient",
          resourceId: req.params.id,
          action: "delete",
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        }
      );

      res.json({ success: true });
    } catch (error) {
      console.error("[API] Delete patient error:", error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  /**
   * GET /api/patients/search
   * Search patients by name or MRN (tenant-scoped)
   */
  app.get("/api/patients/search", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const query = req.query.q as string;

      if (!query) {
        return res.status(400).json({ success: false, error: "Search query required" });
      }

      const patients = await TenantPatientService.searchPatients(tenantId, query);
      res.json({ success: true, data: patients });
    } catch (error) {
      console.error("[API] Search patients error:", error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });
}

// ============================================================================
// CASE ENDPOINTS (Tenant-Scoped)
// ============================================================================

function registerCaseEndpoints(app: Express) {
  /**
   * GET /api/cases
   * Get all cases for the authenticated user's tenant
   */
  app.get("/api/cases", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const cases = await TenantCaseService.getCases(tenantId);

      res.json({ success: true, data: cases });
    } catch (error) {
      console.error("[API] Get cases error:", error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  /**
   * GET /api/cases/:id
   * Get a specific case (tenant-scoped)
   */
  app.get("/api/cases/:id", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const clinicalCase = await TenantCaseService.getCase(tenantId, req.params.id);

      if (!clinicalCase) {
        return res.status(404).json({ success: false, error: "Case not found" });
      }

      // Audit log
      await TenantAuditService.createAuditLog(
        tenantId,
        userId,
        req.userOid,
        {
          eventType: "data-accessed",
          resourceType: "case",
          resourceId: req.params.id,
          action: "view",
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        }
      );

      res.json({ success: true, data: clinicalCase });
    } catch (error) {
      console.error("[API] Get case error:", error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  /**
   * GET /api/cases/patient/:patientId
   * Get cases for a specific patient (tenant-scoped)
   */
  app.get("/api/cases/patient/:patientId", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const cases = await TenantCaseService.getCasesByPatient(
        tenantId,
        req.params.patientId
      );

      res.json({ success: true, data: cases });
    } catch (error) {
      console.error("[API] Get patient cases error:", error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  /**
   * POST /api/cases
   * Create a new case (tenant-scoped)
   */
  app.post("/api/cases", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);

      const clinicalCase = await TenantCaseService.createCase(
        tenantId,
        userId,
        req.body
      );

      // Audit log
      await TenantAuditService.createAuditLog(
        tenantId,
        userId,
        req.userOid,
        {
          eventType: "case-created",
          resourceType: "case",
          resourceId: clinicalCase.id,
          action: "create",
          details: {
            patientId: clinicalCase.patientId,
            caseType: clinicalCase.caseType,
          },
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        }
      );

      res.status(201).json({ success: true, data: clinicalCase });
    } catch (error) {
      console.error("[API] Create case error:", error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  /**
   * PUT /api/cases/:id
   * Update a case (tenant-scoped)
   */
  app.put("/api/cases/:id", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);

      const clinicalCase = await TenantCaseService.updateCase(
        tenantId,
        req.params.id,
        req.body
      );

      if (!clinicalCase) {
        return res.status(404).json({ success: false, error: "Case not found" });
      }

      // Audit log
      await TenantAuditService.createAuditLog(
        tenantId,
        userId,
        req.userOid,
        {
          eventType: "case-updated",
          resourceType: "case",
          resourceId: req.params.id,
          action: "update",
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        }
      );

      res.json({ success: true, data: clinicalCase });
    } catch (error) {
      console.error("[API] Update case error:", error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  /**
   * DELETE /api/cases/:id
   * Delete a case (tenant-scoped)
   */
  app.delete("/api/cases/:id", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);

      const deleted = await TenantCaseService.deleteCase(tenantId, req.params.id);

      if (!deleted) {
        return res.status(404).json({ success: false, error: "Case not found" });
      }

      // Audit log
      await TenantAuditService.createAuditLog(
        tenantId,
        userId,
        req.userOid,
        {
          eventType: "case-deleted",
          resourceType: "case",
          resourceId: req.params.id,
          action: "delete",
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        }
      );

      res.json({ success: true });
    } catch (error) {
      console.error("[API] Delete case error:", error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });
}

// ============================================================================
// DASHBOARD ENDPOINTS (Tenant-Scoped)
// ============================================================================

function registerDashboardEndpoints(app: Express) {
  /**
   * GET /api/dashboard/stats
   * Get dashboard statistics for tenant
   */
  app.get("/api/dashboard/stats", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const stats = await TenantCaseService.getDashboardStats(tenantId);

      res.json({ success: true, data: stats });
    } catch (error) {
      console.error("[API] Get dashboard stats error:", error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  /**
   * GET /api/alerts
   * Get alerts for tenant (placeholder - implement based on your logic)
   */
  app.get("/api/alerts", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);

      // Placeholder: Implement your alert logic here
      // For now, return empty array
      res.json({ success: true, data: [] });
    } catch (error) {
      console.error("[API] Get alerts error:", error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });
}

// ============================================================================
// LAB REPORT ENDPOINTS (Tenant-Scoped)
// ============================================================================

function registerLabReportEndpoints(app: Express) {
  /**
   * GET /api/lab-reports/patient/:patientId
   * Get lab reports for a patient (tenant-scoped)
   */
  app.get("/api/lab-reports/patient/:patientId", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const reports = await TenantLabReportService.getLabReportsByPatient(
        tenantId,
        req.params.patientId
      );

      res.json({ success: true, data: reports });
    } catch (error) {
      console.error("[API] Get lab reports error:", error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  /**
   * POST /api/lab-reports
   * Create a lab report (tenant-scoped)
   */
  app.post("/api/lab-reports", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);

      const report = await TenantLabReportService.createLabReport(
        tenantId,
        userId,
        req.body
      );

      res.status(201).json({ success: true, data: report });
    } catch (error) {
      console.error("[API] Create lab report error:", error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });
}

// ============================================================================
// CHAT ENDPOINTS (Tenant-Scoped)
// ============================================================================

function registerChatEndpoints(app: Express) {
  /**
   * GET /api/chat/:caseId
   * Get chat messages for a case (tenant-scoped)
   */
  app.get("/api/chat/:caseId", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const messages = await TenantChatService.getChatMessagesByCase(
        tenantId,
        req.params.caseId
      );

      res.json({ success: true, data: messages });
    } catch (error) {
      console.error("[API] Get chat messages error:", error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  /**
   * POST /api/chat
   * Create a chat message (tenant-scoped)
   */
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);

      const message = await TenantChatService.createChatMessage(
        tenantId,
        userId,
        req.body
      );

      res.status(201).json({ success: true, data: message });
    } catch (error) {
      console.error("[API] Create chat message error:", error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });
}

// ============================================================================
// AUDIT LOG ENDPOINTS (Tenant-Scoped)
// ============================================================================

function registerAuditEndpoints(app: Express) {
  /**
   * GET /api/audit-logs
   * Get audit logs for tenant
   */
  app.get("/api/audit-logs", async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const limit = parseInt(req.query.limit as string) || 100;

      const logs = await TenantAuditService.getAuditLogs(tenantId, limit);

      res.json({ success: true, data: logs });
    } catch (error) {
      console.error("[API] Get audit logs error:", error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });
}

// ============================================================================
// MAIN REGISTRATION FUNCTION
// ============================================================================

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  console.log("🔐 Registering tenant-scoped API routes with Entra ID authentication");

  // Tenant-scoped endpoints (all require authentication)
  registerPatientEndpoints(app);
  registerCaseEndpoints(app);
  registerDashboardEndpoints(app);
  registerLabReportEndpoints(app);
  registerChatEndpoints(app);
  registerAuditEndpoints(app);

  console.log("✅ All routes registered with multi-tenant isolation");

  return httpServer;
}
