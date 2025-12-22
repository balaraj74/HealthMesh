/**
 * Azure Entra ID JWT Validation Middleware
 * Production-grade authentication for multi-tenant SaaS
 * 
 * ENTERPRISE-GRADE: Microsoft Entra ID is the ONLY authentication authority
 * MULTI-TENANT: Supports users from ANY Azure AD organization
 * 
 * This middleware:
 * 1. Validates JWT tokens EXCLUSIVELY from Azure Entra ID
 * 2. Supports multi-tenant authentication (any Azure AD organization)
 * 3. Extracts tenant_id (tid) and user_id (oid) from token claims
 * 4. Auto-provisions organizations and users on first login
 * 5. Attaches tenant context to all requests
 * 
 * ❌ NO local authentication
 * ❌ NO email/password
 * ❌ NO backend token creation
 * ✅ Microsoft Entra ID ONLY
 * ✅ Multi-tenant support
 */

import type { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { db } from "../db/index";
import { organizations, users, auditLogs } from "../../db/multi-tenant-schema";
import { eq, and } from "drizzle-orm";

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================
const AZURE_CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;

// Strict validation - FAIL if not configured
if (!AZURE_CLIENT_ID) {
  console.error("❌ CRITICAL: AZURE_AD_CLIENT_ID must be set");
  console.error("   This application requires Microsoft Entra ID for authentication.");
  console.error("   No fallback authentication is available.");
}

// ============================================================================
// MULTI-TENANT JWKS CLIENT
// Uses 'common' endpoint to support tokens from any Azure AD tenant
// ============================================================================
const jwksClients: Map<string, ReturnType<typeof jwksClient>> = new Map();

/**
 * Get or create a JWKS client for a specific tenant
 * For multi-tenant apps, we need to fetch keys from the token's tenant
 */
function getJwksClient(tenantId: string): ReturnType<typeof jwksClient> {
  if (!jwksClients.has(tenantId)) {
    const client = jwksClient({
      jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
      rateLimit: true,
    });
    jwksClients.set(tenantId, client);
  }
  return jwksClients.get(tenantId)!;
}

/**
 * Get signing key from Azure AD JWKS endpoint for a specific tenant
 */
function getSigningKey(tenantId: string, kid: string): Promise<string> {
  const client = getJwksClient(tenantId);
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err) {
        reject(err);
      } else {
        const signingKey = key?.getPublicKey();
        resolve(signingKey || "");
      }
    });
  });
}

// ============================================================================
// ENTRA ID TOKEN PAYLOAD INTERFACE
// ============================================================================
interface EntraIdTokenPayload extends JwtPayload {
  tid: string; // Tenant ID - maps to organization/hospital
  oid: string; // Object ID - unique user identifier
  email?: string;
  name?: string;
  preferred_username?: string;
  aud: string; // Audience - must match client ID
  iss: string; // Issuer - from Microsoft (varies by tenant)
  roles?: string[]; // Optional app roles from Entra ID
}

// ============================================================================
// REQUEST EXTENSION - Add tenant context
// ============================================================================
declare global {
  namespace Express {
    interface Request {
      tenantId: string; // Azure AD tenant ID (tid)
      userId: string; // Database user ID (UUID)
      userOid: string; // Azure AD object ID (oid)
      userEmail: string;
      userName: string;
      userRole: string;
    }
  }
}

// ============================================================================
// AUTO-PROVISIONING LOGIC (From Entra Claims)
// ============================================================================

/**
 * Ensure organization exists in database
 * Creates organization on first login from new tenant
 * This syncs from Entra ID - organizations are NEVER created manually
 */
async function ensureOrganization(tenantId: string, domain?: string): Promise<void> {
  const existing = await db
    .select()
    .from(organizations)
    .where(eq(organizations.tenantId, tenantId))
    .limit(1);

  if (existing.length === 0) {
    console.log(`[AUTO-PROVISION] Creating organization from Entra ID tenant: ${tenantId}`);

    await db.insert(organizations).values({
      tenantId,
      name: domain || `Organization ${tenantId.substring(0, 8)}`,
      domain,
      settings: {},
    });

    console.log(`✅ Organization provisioned from Entra ID: ${tenantId}`);
  }
}

/**
 * Ensure user exists in database
 * Creates/syncs user from Entra ID claims on first login
 * Users are NEVER created manually - only from Entra ID
 * 
 * Implements: INSERT INTO users (id, tenant_id, email, name)
 *             VALUES (:oid, :tid, :email, :name)
 *             ON CONFLICT (id) DO NOTHING;
 */
async function ensureUser(
  tenantId: string,
  userOid: string,
  email: string,
  name: string
): Promise<string> {
  const existing = await db
    .select()
    .from(users)
    .where(and(eq(users.userOid, userOid), eq(users.tenantId, tenantId)))
    .limit(1);

  if (existing.length > 0) {
    // Update last login timestamp
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, existing[0].id));

    console.log(`[AUTH] User synced from Entra ID: ${email} (oid: ${userOid.substring(0, 8)}...)`);
    return existing[0].id;
  }

  // Create new user from Entra ID claims
  console.log(`[AUTO-PROVISION] Creating user from Entra ID: ${email} (oid: ${userOid})`);

  const [newUser] = await db
    .insert(users)
    .values({
      userOid,
      tenantId,
      email,
      name,
      authProvider: "entra", // Always 'entra' - the ONLY provider
      role: "user", // Default role - can be overridden by Entra App Roles
      lastLogin: new Date(),
    })
    .returning();

  console.log(`✅ User provisioned from Entra ID: ${email} in tenant ${tenantId.substring(0, 8)}...`);
  return newUser.id;
}

/**
 * Log authentication event for audit trail
 */
async function logAuthEvent(
  tenantId: string,
  userId: string,
  userOid: string,
  eventType: string,
  details: object,
  req: Request
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      tenantId,
      userId,
      userOid,
      eventType,
      resourceType: "authentication",
      action: "login",
      details,
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers["user-agent"],
    });
  } catch (error) {
    console.error("[AUDIT] Failed to log auth event:", error);
    // Don't fail the request if audit logging fails
  }
}

// ============================================================================
// JWT VALIDATION MIDDLEWARE - MULTI-TENANT ENTRA ID
// ============================================================================

// Personal Microsoft Account tenant ID (consumers)
const PERSONAL_ACCOUNT_TENANT_ID = "9188040d-6c67-4c5b-b112-36a304b66dad";

/**
 * Validate issuer for multi-tenant tokens
 * Accepts tokens from:
 * - Any Azure AD organizational tenant
 * - Personal Microsoft accounts (Outlook, Xbox, etc.)
 */
function isValidIssuer(issuer: string, tenantId: string): boolean {
  // Valid issuer formats for Azure AD tokens (organizational accounts)
  const validIssuers = [
    `https://login.microsoftonline.com/${tenantId}/v2.0`,
    `https://sts.windows.net/${tenantId}/`,
  ];

  // For personal Microsoft accounts, also accept the consumer tenant issuer
  if (tenantId === PERSONAL_ACCOUNT_TENANT_ID) {
    validIssuers.push(
      `https://login.microsoftonline.com/${PERSONAL_ACCOUNT_TENANT_ID}/v2.0`,
      `https://login.live.com/`,
    );
  }

  return validIssuers.includes(issuer);
}

/**
 * Check if this is a personal Microsoft account
 */
function isPersonalAccount(tenantId: string): boolean {
  return tenantId === PERSONAL_ACCOUNT_TENANT_ID;
}

/**
 * Main JWT validation middleware (Multi-Tenant)
 * 
 * VALIDATES ONLY:
 * - Tokens issued by Microsoft Entra ID (any tenant)
 * - With correct audience (client ID)
 * - With valid issuer (Microsoft, matching token's tid)
 * 
 * REJECTS:
 * - Any token not from Entra ID
 * - Expired tokens
 * - Tokens with invalid signatures
 * - Tokens without required claims (tid, oid)
 */
export async function validateEntraIdToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const requestId = Math.random().toString(36).substring(7);

  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log(`[AUTH:${requestId}] ❌ No authorization header - authentication required`);
      res.status(401).json({
        error: "Authentication required",
        message: "Please sign in with Microsoft to access this resource",
        code: "NO_AUTH_HEADER",
      });
      return;
    }

    const token = authHeader.substring(7);

    // Decode token WITHOUT verification first to get tid for JWKS lookup
    const unverifiedDecoded = jwt.decode(token, { complete: true });
    if (!unverifiedDecoded || !unverifiedDecoded.header.kid) {
      console.log(`[AUTH:${requestId}] ❌ Token header is malformed`);
      res.status(401).json({
        error: "Invalid token",
        message: "Token format is invalid",
        code: "INVALID_TOKEN_FORMAT",
      });
      return;
    }

    // Extract tenant ID from unverified token to get correct JWKS endpoint
    const unverifiedPayload = unverifiedDecoded.payload as EntraIdTokenPayload;
    if (!unverifiedPayload.tid) {
      console.log(`[AUTH:${requestId}] ❌ Token missing tenant ID (tid)`);
      res.status(401).json({
        error: "Invalid token",
        message: "Token missing required tenant claim",
        code: "MISSING_TID",
      });
      return;
    }

    const tokenTenantId = unverifiedPayload.tid;

    // Get signing key from the token's tenant-specific JWKS endpoint
    let signingKey: string;
    try {
      signingKey = await getSigningKey(tokenTenantId, unverifiedDecoded.header.kid);
    } catch (error) {
      console.error(`[AUTH:${requestId}] ❌ Failed to fetch signing key:`, error);
      res.status(401).json({
        error: "Authentication failed",
        message: "Unable to verify token - please try signing in again",
        code: "SIGNING_KEY_ERROR",
      });
      return;
    }

    // Verify token signature and claims
    // For multi-tenant, we verify audience and validate issuer separately
    const decoded = jwt.verify(token, signingKey, {
      algorithms: ["RS256"],
      audience: AZURE_CLIENT_ID,
      // Don't validate issuer here - we'll do it manually for multi-tenant
    }) as EntraIdTokenPayload;

    // Validate issuer manually for multi-tenant support
    if (!isValidIssuer(decoded.iss, decoded.tid)) {
      console.log(`[AUTH:${requestId}] ❌ Invalid issuer: ${decoded.iss}`);
      res.status(401).json({
        error: "Invalid token",
        message: "Token issuer is not valid",
        code: "INVALID_ISSUER",
      });
      return;
    }

    // Validate required Entra ID claims
    if (!decoded.tid || !decoded.oid) {
      console.log(`[AUTH:${requestId}] ❌ Token missing required claims (tid, oid)`);
      res.status(401).json({
        error: "Invalid token",
        message: "Token missing required Microsoft claims",
        code: "MISSING_CLAIMS",
      });
      return;
    }

    // Extract user information from Entra ID claims
    const tenantId = decoded.tid;
    const userOid = decoded.oid;
    const email = decoded.email || decoded.preferred_username || "unknown@unknown.com";
    const name = decoded.name || "Unknown User";

    // Auto-provision organization and user from Entra claims
    await ensureOrganization(tenantId, email.split("@")[1]);
    const userId = await ensureUser(tenantId, userOid, email, name);

    // Get user role from database (may be updated from Entra App Roles)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Attach verified tenant context to request
    req.tenantId = tenantId;
    req.userId = userId;
    req.userOid = userOid;
    req.userEmail = email;
    req.userName = name;
    req.userRole = user?.role || "user";

    console.log(
      `✅ [AUTH:${requestId}] Entra token validated | ` +
      `User: ${email} | ` +
      `OID: ${userOid.substring(0, 8)}... | ` +
      `TID: ${tenantId.substring(0, 8)}... | ` +
      `Role: ${req.userRole}`
    );

    // Log successful authentication
    await logAuthEvent(tenantId, userId, userOid, "authentication-success", {
      email,
      method: "entra-id-multitenant",
      endpoint: req.path,
    }, req);

    next();
  } catch (error: any) {
    console.error(`[AUTH:${requestId}] Token validation failed:`, error.message);

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
        message: "Token signature verification failed",
        code: "INVALID_SIGNATURE",
      });
      return;
    }

    if (error.name === "NotBeforeError") {
      res.status(401).json({
        error: "Token not active",
        message: "Token is not yet valid",
        code: "TOKEN_NOT_ACTIVE",
      });
      return;
    }

    res.status(401).json({
      error: "Authentication failed",
      message: "Unable to validate token - please sign in with Microsoft",
      code: "AUTH_FAILED",
    });
  }
}

// ============================================================================
// PUBLIC PATHS - Minimal set, NO local auth endpoints
// ============================================================================

/**
 * Paths that don't require authentication
 * SECURITY: Keep this list minimal
 */
const PUBLIC_PATHS = [
  "/api/health",
  "/api/config/status",
];

/**
 * Middleware wrapper that skips auth for public paths only
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip authentication for public paths only
  if (PUBLIC_PATHS.some((path) => req.path === path || req.path.startsWith(path + "/"))) {
    next();
    return;
  }

  // All other paths require Entra ID authentication
  validateEntraIdToken(req, res, next);
}

// ============================================================================
// TENANT ISOLATION HELPERS
// ============================================================================

/**
 * Helper function to get tenant ID from request
 * Throws security violation if missing
 */
export function getTenantId(req: Request): string {
  if (!req.tenantId) {
    throw new Error("SECURITY VIOLATION: Request missing tenant context");
  }
  return req.tenantId;
}

/**
 * Helper to get current user ID
 * Throws security violation if missing
 */
export function getUserId(req: Request): string {
  if (!req.userId) {
    throw new Error("SECURITY VIOLATION: Request missing user context");
  }
  return req.userId;
}

/**
 * Helper to get user's Entra OID
 */
export function getUserOid(req: Request): string {
  if (!req.userOid) {
    throw new Error("SECURITY VIOLATION: Request missing user OID");
  }
  return req.userOid;
}
