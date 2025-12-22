/**
 * Azure Authentication Token Validation Middleware
 * 
 * Validates JWT access tokens from:
 * 1. Microsoft Entra ID (Azure AD) - Enterprise users
 * 2. Azure AD B2C - Email/password users
 * 
 * Security Features:
 * - RSA signature verification using JWKS
 * - Issuer validation (supports both Entra ID and B2C)
 * - Audience validation
 * - Expiration check
 * - Comprehensive error logging
 * - Audit trail
 * 
 * Usage:
 * app.use('/api', validateAzureToken, routes);
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

// Extend Express Request to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;          // Subject (user ID)
        name?: string;        // User name
        email?: string;       // User email
        preferred_username?: string;  // Username
        roles?: string[];     // User roles
        oid?: string;         // Object ID in Azure AD
        tid?: string;         // Tenant ID
        authProvider?: "entra" | "b2c";  // Which auth provider
      };
    }
  }
}

// ===========================================
// MICROSOFT ENTRA ID CONFIGURATION
// ===========================================
const entraTenantId = process.env.AZURE_AD_TENANT_ID;
const entraClientId = process.env.AZURE_AD_CLIENT_ID;

// ===========================================
// AZURE AD B2C CONFIGURATION
// ===========================================
const b2cClientId = process.env.AZURE_B2C_CLIENT_ID;
const b2cTenantName = process.env.AZURE_B2C_TENANT_NAME;
const b2cPolicySignIn = process.env.AZURE_B2C_POLICY_SIGNIN || "B2C_1_SignUpSignIn";

// ===========================================
// LOCAL JWT CONFIGURATION
// ===========================================
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

if (!entraTenantId || !entraClientId) {
  console.warn(
    "⚠️ Azure Entra ID validation disabled: AZURE_AD_TENANT_ID and AZURE_AD_CLIENT_ID must be set"
  );
}

if (!b2cClientId || !b2cTenantName) {
  console.warn(
    "⚠️ Azure AD B2C validation disabled: AZURE_B2C_CLIENT_ID and AZURE_B2C_TENANT_NAME must be set"
  );
}

// ===========================================
// JWKS CLIENTS
// ===========================================

// JWKS client for Microsoft Entra ID
const entraClient = entraTenantId ? jwksClient({
  jwksUri: `https://login.microsoftonline.com/${entraTenantId}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
  rateLimit: true,
  jwksRequestsPerMinute: 5,
}) : null;

// JWKS client for Azure AD B2C
const b2cClient = b2cTenantName ? jwksClient({
  jwksUri: `https://${b2cTenantName}.b2clogin.com/${b2cTenantName}.onmicrosoft.com/${b2cPolicySignIn}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
  rateLimit: true,
  jwksRequestsPerMinute: 5,
}) : null;

/**
 * Get signing key from JWKS (Entra ID)
 */
function getEntraKey(header: any, callback: any) {
  if (!entraClient) {
    callback(new Error("Entra ID JWKS client not configured"));
    return;
  }
  
  entraClient.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Get signing key from JWKS (B2C)
 */
function getB2CKey(header: any, callback: any) {
  if (!b2cClient) {
    callback(new Error("B2C JWKS client not configured"));
    return;
  }
  
  b2cClient.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Detect which auth provider issued the token
 */
function detectAuthProvider(token: string): "entra" | "b2c" | "local" | "unknown" {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded) {
      console.log("[AUTH_DETECT] Failed to decode token");
      return "unknown";
    }
    
    console.log("[AUTH_DETECT] Token decoded:", { 
      authProvider: decoded.authProvider, 
      iss: decoded.iss,
      exp: decoded.exp 
    });
    
    // Local JWT tokens have authProvider field
    if (decoded.authProvider === "local") {
      return "local";
    }
    
    const issuer = decoded.iss || "";
    
    // B2C tokens have issuer like: https://tenantname.b2clogin.com/...
    if (issuer.includes(".b2clogin.com")) {
      return "b2c";
    }
    
    // Entra ID tokens have issuer like: https://login.microsoftonline.com/...
    if (issuer.includes("login.microsoftonline.com")) {
      return "entra";
    }
    
    return "unknown";
  } catch (error) {
    console.log("[AUTH_DETECT] Error detecting provider:", error);
    return "unknown";
  }
}

/**
 * Verify local JWT token (email/password authentication)
 */
function verifyLocalToken(
  token: string,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      email: string;
      authProvider: string;
    };

    // Attach user information to request
    req.user = {
      sub: decoded.userId.toString(),
      email: decoded.email,
      authProvider: "local" as "entra" | "b2c",
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: "Token expired",
        message: "Your session has expired. Please login again.",
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: "Invalid token",
        message: "Your authentication token is invalid.",
      });
      return;
    }

    res.status(500).json({
      error: "Authentication failed",
      message: "An error occurred during authentication",
    });
  }
}

/**
 * Middleware to validate Azure tokens (Entra ID or B2C)
 */
export async function validateAzureToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Skip validation if neither provider is configured (development mode)
    if ((!entraTenantId || !entraClientId) && (!b2cClientId || !b2cTenantName)) {
      console.log("⚠️ Skipping Azure validation (no providers configured)");
      next();
      return;
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    console.log("[AUTH] Authorization header received:", authHeader ? `Bearer ${authHeader.substring(7, 27)}...` : "MISSING");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[AUTH] ❌ No authorization header found - rejecting request");
      res.status(401).json({
        error: "Authentication required",
        message: "No valid authorization token provided",
      });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Detect which provider issued the token
    const provider = detectAuthProvider(token);
    console.log("[AUTH] Detected provider:", provider);
    
    if (provider === "unknown") {
      console.log("[AUTH] Unknown provider - rejecting token");
      res.status(401).json({
        error: "Invalid token",
        message: "Unable to determine token issuer",
      });
      return;
    }

    // Verify token based on provider
    if (provider === "entra") {
      console.log("[AUTH] Verifying Entra ID token");
      await verifyEntraToken(token, req, res, next);
    } else if (provider === "b2c") {
      console.log("[AUTH] Verifying B2C token");
      await verifyB2CToken(token, req, res, next);
    } else if (provider === "local") {
      console.log("[AUTH] Verifying local JWT token");
      verifyLocalToken(token, req, res, next);
    }
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({
      error: "Authentication failed",
      message: "An error occurred during authentication",
    });
  }
}

/**
 * Verify Microsoft Entra ID token
 */
function verifyEntraToken(
  token: string,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  jwt.verify(
    token,
    getEntraKey,
    {
      audience: entraClientId,
      issuer: `https://login.microsoftonline.com/${entraTenantId}/v2.0`,
      algorithms: ["RS256"],
    },
    (err, decoded) => {
      if (err) {
        console.error("Entra ID token validation failed:", err.message);
        res.status(401).json({
          error: "Invalid token",
          message: err.message,
        });
        return;
      }

      const payload = decoded as any;
      req.user = {
        sub: payload.sub,
        name: payload.name,
        email: payload.email || payload.preferred_username,
        preferred_username: payload.preferred_username,
        roles: payload.roles || [],
        oid: payload.oid,
        tid: payload.tid,
        authProvider: "entra",
      };

      console.log(`✓ Entra ID authenticated: ${req.user.name || req.user.sub}`);
      next();
    }
  );
}

/**
 * Verify Azure AD B2C token
 */
function verifyB2CToken(
  token: string,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const b2cIssuer = `https://${b2cTenantName}.b2clogin.com/${b2cTenantName}.onmicrosoft.com/v2.0/`;
  
  jwt.verify(
    token,
    getB2CKey,
    {
      audience: b2cClientId,
      issuer: b2cIssuer,
      algorithms: ["RS256"],
    },
    (err, decoded) => {
      if (err) {
        console.error("B2C token validation failed:", err.message);
        res.status(401).json({
          error: "Invalid token",
          message: err.message,
        });
        return;
      }

      const payload = decoded as any;
      req.user = {
        sub: payload.sub,
        name: payload.name || payload.given_name,
        email: payload.emails?.[0] || payload.email,
        preferred_username: payload.emails?.[0] || payload.email,
        roles: payload.extension_Roles || [],
        oid: payload.oid || payload.sub,
        tid: payload.tid,
        authProvider: "b2c",
      };

      console.log(`✓ B2C authenticated: ${req.user.email || req.user.sub}`);
      next();
    }
  );
}

/**
 * Optional middleware to check for specific roles
 * 
 * Usage:
 * app.use('/api/admin', requireRoles(['Admin']), routes);
 */
export function requireRoles(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        error: "Authentication required",
        message: "No user context found",
      });
      return;
    }

    const userRoles = req.user.roles || [];
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      res.status(403).json({
        error: "Forbidden",
        message: `Access requires one of: ${allowedRoles.join(", ")}`,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to require specific auth provider
 * 
 * Usage:
 * app.use('/api/admin', requireAuthProvider('entra'), routes);
 */
export function requireAuthProvider(provider: "entra" | "b2c") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        error: "Authentication required",
        message: "No user context found",
      });
      return;
    }

    if (req.user.authProvider !== provider) {
      res.status(403).json({
        error: "Forbidden",
        message: `This endpoint requires ${provider} authentication`,
      });
      return;
    }

    next();
  };
}
