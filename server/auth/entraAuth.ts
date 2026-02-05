/**
 * Production-Grade Azure Entra ID Authentication Middleware
 * 
 * ARCHITECTURE:
 * - Microsoft Entra ID is the ONLY authentication source
 * - Multi-tenant + Consumer accounts supported
 * - Authorization Code Flow with PKCE
 * - Data stored in Azure SQL Database
 * 
 * SECURITY:
 * - Validates JWT signature via Microsoft's JWKS endpoint
 * - Verifies issuer, audience, expiration
 * - Extracts oid (user), tid (tenant) from claims
 * - Auto-provisions hospitals and users on first login
 * 
 * WHAT THIS MIDDLEWARE DOES:
 * 1. Validates token is from Microsoft Entra ID
 * 2. Creates hospital record if new tenant
 * 3. Creates/updates user record from claims
 * 4. Attaches user context to req.user
 * 
 * ❌ NO local JWT secrets
 * ❌ NO hardcoded users
 * ❌ NO fallback authentication
 */

import type { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { AzureHospitalService, AzureUserService, AzureAuditService } from "../data/azureDataAccess";

// ============================================================================
// CONFIGURATION
// ============================================================================
const AZURE_CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;

if (!AZURE_CLIENT_ID) {
    console.error("╔════════════════════════════════════════════════════════════╗");
    console.error("║ ❌ CRITICAL: AZURE_AD_CLIENT_ID is not configured          ║");
    console.error("║                                                            ║");
    console.error("║ HealthMesh requires Microsoft Entra ID for authentication ║");
    console.error("║ Set AZURE_AD_CLIENT_ID in your environment variables       ║");
    console.error("║                                                            ║");
    console.error("║ NO local authentication is available                       ║");
    console.error("╚════════════════════════════════════════════════════════════╝");
}

// Personal Microsoft Account tenant ID
const PERSONAL_ACCOUNT_TID = "9188040d-6c67-4c5b-b112-36a304b66dad";

// ============================================================================
// JWKS CLIENT POOL
// Each tenant requires its own JWKS client for key verification
// ============================================================================
const jwksClients = new Map<string, ReturnType<typeof jwksClient>>();

function getJwksClient(tenantId: string): ReturnType<typeof jwksClient> {
    if (!jwksClients.has(tenantId)) {
        jwksClients.set(tenantId, jwksClient({
            jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
            cache: true,
            cacheMaxAge: 86400000, // 24 hours
            rateLimit: true,
        }));
    }
    return jwksClients.get(tenantId)!;
}

function getSigningKey(tenantId: string, kid: string): Promise<string> {
    return new Promise((resolve, reject) => {
        getJwksClient(tenantId).getSigningKey(kid, (err, key) => {
            if (err) reject(err);
            else resolve(key?.getPublicKey() || "");
        });
    });
}

// ============================================================================
// TOKEN PAYLOAD INTERFACE
// ============================================================================
interface EntraTokenPayload extends JwtPayload {
    tid: string;              // Tenant ID
    oid: string;              // Object ID (user)
    email?: string;           // Email address
    preferred_username?: string; // UPN or email
    name?: string;            // Display name
    aud: string;              // Audience (client ID)
    iss: string;              // Issuer (Microsoft)
    roles?: string[];         // App roles (optional)
}

// ============================================================================
// USER CONTEXT - Attached to every authenticated request
// ============================================================================
export interface AuthenticatedUser {
    id: string;               // Database user ID (UUID)
    entraOid: string;         // Azure AD object ID
    tenantId: string;         // Azure AD tenant ID
    hospitalId: string;       // Database hospital ID (for data isolation)
    email: string;
    name: string;
    role: string;             // admin, doctor, nurse
}

declare global {
    namespace Express {
        interface Request {
            user: AuthenticatedUser;
        }
    }
}

// ============================================================================
// ISSUER VALIDATION
// Supports organizational and personal Microsoft accounts
// ============================================================================
function isValidIssuer(issuer: string, tenantId: string): boolean {
    const validIssuers = [
        `https://login.microsoftonline.com/${tenantId}/v2.0`,
        `https://sts.windows.net/${tenantId}/`,
    ];

    // Personal accounts have additional valid issuers
    if (tenantId === PERSONAL_ACCOUNT_TID) {
        validIssuers.push(`https://login.live.com/`);
    }

    return validIssuers.includes(issuer);
}

// ============================================================================
// HOSPITAL AUTO-PROVISIONING
// Creates hospital record on first login from new tenant
// ============================================================================
async function ensureHospital(tenantId: string, domain?: string): Promise<string> {
    // Check if hospital exists for this tenant
    const existing = await AzureHospitalService.findByTenantId(tenantId);

    if (existing) {
        return existing.id;
    }

    // Create new hospital for this tenant
    console.log(`[PROVISION] Creating hospital for Entra tenant: ${tenantId.substring(0, 8)}...`);

    const hospitalName = domain
        ? `${domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)} Hospital`
        : `Hospital ${tenantId.substring(0, 8)}`;

    const hospital = await AzureHospitalService.create({
        entraTenantId: tenantId,
        name: hospitalName,
        domain,
    });

    console.log(`✅ [PROVISION] Hospital created: ${hospital.name} (${hospital.id})`);
    return hospital.id;
}

// ============================================================================
// USER AUTO-PROVISIONING
// Creates/updates user record from Entra ID claims
// ============================================================================
async function ensureUser(
    entraOid: string,
    tenantId: string,
    hospitalId: string,
    email: string,
    name: string,
    roles?: string[]
): Promise<AuthenticatedUser> {
    // Check if user exists
    const existing = await AzureUserService.findByEntraOid(entraOid, tenantId);

    if (existing) {
        // Update last login
        await AzureUserService.updateLastLogin(existing.id);

        return {
            id: existing.id,
            entraOid: existing.entra_oid,
            tenantId: existing.tenant_id,
            hospitalId: existing.hospital_id,
            email: existing.email,
            name: existing.name,
            role: existing.role,
        };
    }

    // Determine role from Entra App Roles or default to 'doctor'
    let role = "doctor";
    if (roles?.includes("Admin")) role = "admin";
    else if (roles?.includes("Nurse")) role = "nurse";

    // Create new user
    console.log(`[PROVISION] Creating user: ${email} (oid: ${entraOid.substring(0, 8)}...)`);

    const user = await AzureUserService.create({
        hospitalId,
        entraOid,
        tenantId,
        email,
        name,
        role,
    });

    console.log(`✅ [PROVISION] User created: ${user.email} as ${user.role}`);

    return {
        id: user.id,
        entraOid: user.entraOid,
        tenantId: user.tenantId,
        hospitalId: user.hospitalId,
        email: user.email,
        name: user.name || "",
        role: user.role || "doctor",
    };
}

// ============================================================================
// AUDIT LOGGING
// HIPAA-compliant authentication audit trail
// ============================================================================
async function logAuthEvent(
    hospitalId: string,
    userId: string,
    entraOid: string,
    eventType: string,
    details: object,
    req: Request
): Promise<void> {
    try {
        await AzureAuditService.createAuditLog(hospitalId, userId, entraOid, {
            eventType,
            resourceType: "authentication",
            action: "login",
            details,
            ipAddress: req.ip || req.socket?.remoteAddress,
            userAgent: req.headers["user-agent"],
        });
    } catch (error) {
        console.error("[AUDIT] Failed to log auth event:", error);
    }
}

// ============================================================================
// MAIN AUTHENTICATION MIDDLEWARE
// ============================================================================
export async function validateEntraToken(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const requestId = crypto.randomUUID().substring(0, 8);

    try {
        // 1. Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            console.log(`[AUTH:${requestId}] ❌ No Bearer token provided`);
            res.status(401).json({
                error: "Authentication required",
                message: "Please sign in with Microsoft",
                code: "NO_TOKEN",
            });
            return;
        }

        const token = authHeader.substring(7);

        // 2. Decode token to get header (for key ID) and tenant ID
        const decoded = jwt.decode(token, { complete: true });
        if (!decoded?.header?.kid || !decoded?.payload) {
            res.status(401).json({
                error: "Invalid token",
                message: "Token format is invalid",
                code: "INVALID_FORMAT",
            });
            return;
        }

        const payload = decoded.payload as EntraTokenPayload;
        if (!payload.tid) {
            res.status(401).json({
                error: "Invalid token",
                message: "Token missing tenant claim",
                code: "MISSING_TID",
            });
            return;
        }

        // 3. Get signing key from tenant's JWKS endpoint
        let signingKey: string;
        try {
            signingKey = await getSigningKey(payload.tid, decoded.header.kid);
        } catch (error) {
            console.error(`[AUTH:${requestId}] Failed to get signing key:`, error);
            res.status(401).json({
                error: "Authentication failed",
                message: "Unable to verify token signature",
                code: "SIGNING_KEY_ERROR",
            });
            return;
        }

        // 4. Verify token signature and claims
        const verified = jwt.verify(token, signingKey, {
            algorithms: ["RS256"],
            audience: AZURE_CLIENT_ID,
        }) as EntraTokenPayload;

        // 5. Validate issuer
        if (!isValidIssuer(verified.iss, verified.tid)) {
            console.log(`[AUTH:${requestId}] ❌ Invalid issuer: ${verified.iss}`);
            res.status(401).json({
                error: "Invalid token",
                message: "Token issuer is not valid",
                code: "INVALID_ISSUER",
            });
            return;
        }

        // 6. Validate required claims
        if (!verified.oid || !verified.tid) {
            res.status(401).json({
                error: "Invalid token",
                message: "Token missing required claims",
                code: "MISSING_CLAIMS",
            });
            return;
        }

        // 7. Extract user info
        const email = verified.email || verified.preferred_username || "unknown@unknown.com";
        const name = verified.name || "Unknown User";
        const domain = email.includes("@") ? email.split("@")[1] : undefined;

        // 8. Auto-provision hospital and user
        const hospitalId = await ensureHospital(verified.tid, domain);
        const user = await ensureUser(
            verified.oid,
            verified.tid,
            hospitalId,
            email,
            name,
            verified.roles
        );

        // 9. Attach user to request
        req.user = user;

        console.log(
            `✅ [AUTH:${requestId}] ${email} | ` +
            `Hospital: ${hospitalId.substring(0, 8)}... | ` +
            `Role: ${user.role}`
        );

        // 10. Log authentication event
        await logAuthEvent(hospitalId, user.id, user.entraOid, "login-success", {
            email,
            endpoint: req.path,
        }, req);

        next();
    } catch (error: any) {
        console.error(`[AUTH:${requestId}] ❌ ${error.message}`);

        // Check for database connection errors - return 503 (Service Unavailable)
        // This prevents the frontend from thinking auth failed and redirecting to login
        if (isDatabaseError(error)) {
            console.error(`[AUTH:${requestId}] ⚠️ Database connection issue - returning 503`);
            res.status(503).json({
                error: "Service temporarily unavailable",
                message: "Database is starting up. Please wait a moment and try again.",
                code: "DATABASE_UNAVAILABLE",
                retryAfter: 10, // Suggest retry after 10 seconds
            });
            return;
        }

        if (error.name === "TokenExpiredError") {
            res.status(401).json({
                error: "Token expired",
                message: "Your session has expired. Please sign in again.",
                code: "TOKEN_EXPIRED",
            });
            return;
        }

        if (error.name === "JsonWebTokenError") {
            res.status(401).json({
                error: "Invalid token",
                message: "Token signature is invalid",
                code: "INVALID_SIGNATURE",
            });
            return;
        }

        res.status(401).json({
            error: "Authentication failed",
            message: "Please sign in with Microsoft",
            code: "AUTH_FAILED",
        });
    }
}

/**
 * Check if error is related to database connection issues
 * These should return 503, not 401, to prevent login redirect loops
 */
function isDatabaseError(error: any): boolean {
    const message = error?.message?.toLowerCase() || "";
    const code = error?.code?.toLowerCase() || "";
    
    // Azure SQL connection errors
    if (message.includes("azure sql") ||
        message.includes("connection") ||
        message.includes("database") ||
        message.includes("econnreset") ||
        message.includes("econnrefused") ||
        message.includes("timeout") ||
        message.includes("etimedout") ||
        message.includes("esocket") ||
        message.includes("not open") ||
        message.includes("socket hang up") ||
        message.includes("pool") ||
        code === "econnreset" ||
        code === "enotopen" ||
        code === "esocket") {
        return true;
    }
    return false;
}

// ============================================================================
// PUBLIC PATHS - No authentication required
// ============================================================================
const PUBLIC_PATHS = [
    "/api/health",
    "/api/config/status",
];

/**
 * Auth middleware that skips public paths
 */
export function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    if (PUBLIC_PATHS.some(path => req.path === path)) {
        next();
        return;
    }
    validateEntraToken(req, res, next);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get hospital ID from authenticated request
 * THROWS if not authenticated (security violation)
 */
export function getHospitalId(req: Request): string {
    if (!req.user?.hospitalId) {
        throw new Error("SECURITY: Request missing hospital context");
    }
    return req.user.hospitalId;
}

/**
 * Get user ID from authenticated request
 */
export function getUserId(req: Request): string {
    if (!req.user?.id) {
        throw new Error("SECURITY: Request missing user context");
    }
    return req.user.id;
}

/**
 * Get user's Entra OID
 */
export function getEntraOid(req: Request): string {
    if (!req.user?.entraOid) {
        throw new Error("SECURITY: Request missing Entra OID");
    }
    return req.user.entraOid;
}

// Legacy exports for backward compatibility
export const getTenantId = getHospitalId;
export { getHospitalId as getOrganizationId };
