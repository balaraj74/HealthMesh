/**
 * Main Application Routes
 * Production-Grade Multi-Tenant Architecture
 * 
 * AUTHENTICATION: Microsoft Entra ID ONLY
 * DATA ISOLATION: Hospital-scoped via hospital_id
 * 
 * Flow:
 * 1. User signs in via Microsoft
 * 2. Token validated by entraAuth middleware
 * 3. Hospital auto-created if new tenant
 * 4. User auto-provisioned from Entra claims
 * 5. All API calls include hospital context
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import { authMiddleware } from "./auth/entraAuth";
import { registerApiRoutes } from "./api-routes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ============================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ============================================================================

  /**
   * Health Check
   * Required for Azure App Service / Container health probes
   */
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "healthmesh",
      version: "2.0.0",
      authProvider: "microsoft-entra-id",
    });
  });

  /**
   * Configuration Status
   * Frontend uses this to determine auth configuration
   */
  app.get("/api/config/status", (req, res) => {
    res.json({
      authType: "entra-id",
      authProvider: "microsoft-entra-id",
      multiTenant: true,
      personalAccounts: true,
      localAuthEnabled: false,
      emailPasswordEnabled: false,
      devBypass: false,
      clientId: process.env.VITE_AZURE_AD_CLIENT_ID,
    });
  });

  // ============================================================================
  // AUTH STATUS ENDPOINT
  // Returns 410 Gone for removed local auth endpoints
  // ============================================================================

  const removedEndpoints = [
    "/api/auth/login",
    "/api/auth/signup",
    "/api/auth/register",
    "/api/auth/password-reset",
  ];

  removedEndpoints.forEach((endpoint) => {
    app.all(endpoint, (req, res) => {
      res.status(410).json({
        error: "Endpoint removed",
        message: "Local authentication has been permanently removed. Please use Microsoft sign-in.",
        authProvider: "microsoft-entra-id",
        loginUrl: "/login",
      });
    });
  });

  // ============================================================================
  // PROTECTED API ROUTES
  // All /api routes (except public paths) require Entra ID authentication
  // ============================================================================

  app.use("/api", authMiddleware);

  // Register all API endpoints
  await registerApiRoutes(httpServer, app);

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║ 🔐 HealthMesh API Ready                                    ║");
  console.log("║                                                            ║");
  console.log("║ Authentication: Microsoft Entra ID ONLY                    ║");
  console.log("║ Multi-Tenant: ✅ Enabled                                   ║");
  console.log("║ Personal Accounts: ✅ Enabled                              ║");
  console.log("║ Hospital Isolation: ✅ Enforced                            ║");
  console.log("║                                                            ║");
  console.log("║ ❌ Local auth: REMOVED                                     ║");
  console.log("║ ❌ Dev bypass: REMOVED                                     ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  return httpServer;
}
