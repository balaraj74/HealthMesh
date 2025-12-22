/**
 * Authentication Routes
 * 
 * ENTERPRISE-GRADE: Microsoft Entra ID is the ONLY authentication authority
 * 
 * This file previously contained email/password authentication.
 * All local auth has been REMOVED as per the enterprise security model:
 * 
 * ❌ NO /api/auth/login - REMOVED
 * ❌ NO /api/auth/signup - REMOVED
 * ❌ NO email/password - REMOVED
 * ❌ NO jwt.sign() - REMOVED
 * ❌ NO local token creation - REMOVED
 * 
 * ✅ Microsoft Entra ID is the ONLY identity provider
 * ✅ Users are auto-provisioned from Entra ID claims
 * ✅ Organizations are auto-created from Entra ID tenant
 * 
 * Authentication flow:
 * 1. Frontend authenticates via MSAL (@azure/msal-browser)
 * 2. Frontend sends Entra ID token to backend
 * 3. Backend validates token against Microsoft
 * 4. Backend extracts claims and auto-provisions user/org
 * 5. Request proceeds with tenant context attached
 */

import type { Express, Request, Response } from "express";

/**
 * Register auth-related routes
 * Note: All authentication is handled via Entra ID middleware
 */
export function registerAuthRoutes(app: Express) {
    /**
     * GET /api/auth/status
     * Returns authentication configuration status
     * This is a public endpoint for frontend configuration
     */
    app.get("/api/auth/status", async (req: Request, res: Response) => {
        res.json({
            authProvider: "microsoft-entra-id",
            authMethod: "oauth2",
            localAuthEnabled: false,
            emailPasswordEnabled: false,
            signupEnabled: false,
            message: "Authentication is handled exclusively via Microsoft Entra ID",
            documentation: "https://docs.microsoft.com/azure/active-directory/",
        });
    });

    /**
     * POST /api/auth/logout
     * Clear any server-side session data (if applicable)
     * Note: Primary logout is handled by MSAL on the frontend
     */
    app.post("/api/auth/logout", async (req: Request, res: Response) => {
        // In a stateless JWT architecture, logout is primarily handled client-side
        // by clearing tokens and calling MSAL logout
        res.json({
            success: true,
            message: "Please complete logout via Microsoft",
            logoutUrl: `https://login.microsoftonline.com/common/oauth2/v2.0/logout`,
        });
    });

    /**
     * Legacy routes - return 410 Gone status
     * These endpoints have been permanently removed
     */
    const removedRoutes = [
        { method: "post", path: "/api/auth/login" },
        { method: "post", path: "/api/auth/signup" },
        { method: "post", path: "/api/auth/forgot-password" },
        { method: "post", path: "/api/auth/reset-password" },
        { method: "post", path: "/api/auth/register" },
    ];

    removedRoutes.forEach(({ method, path }) => {
        (app as any)[method](path, (req: Request, res: Response) => {
            res.status(410).json({
                error: "Endpoint removed",
                message: "Local authentication has been permanently removed. Please use Microsoft Entra ID.",
                authProvider: "microsoft-entra-id",
                loginUrl: "/login",
                code: "LOCAL_AUTH_DISABLED",
            });
        });
    });

    console.log("✅ Auth routes registered (Microsoft Entra ID only - local auth disabled)");
}
