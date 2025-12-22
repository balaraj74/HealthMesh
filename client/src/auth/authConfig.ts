/**
 * Microsoft Entra ID Authentication Configuration
 * 
 * PRODUCTION-GRADE CONFIGURATION
 * 
 * ❌ NO Azure AD B2C
 * ❌ NO email/password
 * ❌ NO local authentication
 * ❌ NO localStorage for tokens
 * ✅ Microsoft Entra ID ONLY
 * ✅ Tokens stored in memory (sessionStorage for MSAL cache only)
 * 
 * AUTHORITY OPTIONS:
 * - Use specific tenant ID for single-tenant apps
 * - Use /common for multi-tenant + personal accounts
 * - Use /organizations for multi-tenant org accounts only
 */

import { Configuration, LogLevel } from "@azure/msal-browser";

// ==========================================
// CONFIGURATION FROM ENVIRONMENT
// ==========================================
const CLIENT_ID = import.meta.env.VITE_AZURE_AD_CLIENT_ID || "";
const TENANT_ID = import.meta.env.VITE_AZURE_AD_TENANT_ID || "";
const REDIRECT_URI = import.meta.env.VITE_AZURE_AD_REDIRECT_URI || "http://localhost:5000/login";

// ==========================================
// ENVIRONMENT VERIFICATION - Log at startup
// ==========================================
console.log("╔════════════════════════════════════════════════════════════╗");
console.log("║ 🔐 Frontend Entra ID Configuration                         ║");
console.log("╠════════════════════════════════════════════════════════════╣");
console.log(`║ FRONTEND TENANT: ${TENANT_ID || "❌ NOT SET"}`);
console.log(`║ FRONTEND CLIENT: ${CLIENT_ID || "❌ NOT SET"}`);
console.log(`║ REDIRECT URI: ${REDIRECT_URI}`);
console.log("╚════════════════════════════════════════════════════════════╝");

// Validate configuration
if (!CLIENT_ID) {
  console.error(
    "╔════════════════════════════════════════════════════════════╗\n" +
    "║ ❌ CRITICAL: VITE_AZURE_AD_CLIENT_ID not configured       ║\n" +
    "║                                                            ║\n" +
    "║ HealthMesh requires Microsoft Entra ID for authentication ║\n" +
    "║ NO local authentication is available                       ║\n" +
    "╚════════════════════════════════════════════════════════════╝"
  );
}

/**
 * Determine the authority URL based on configuration
 * 
 * If TENANT_ID is provided → Use single-tenant authority
 * If TENANT_ID is empty → Use /common for multi-tenant + personal
 */
function getAuthority(): string {
  if (TENANT_ID && TENANT_ID !== "common") {
    // Single-tenant: Only users from this specific tenant can sign in
    return `https://login.microsoftonline.com/${TENANT_ID}`;
  }
  // Multi-tenant + personal accounts
  return "https://login.microsoftonline.com/common";
}

/**
 * MSAL Configuration for Microsoft Entra ID
 * 
 * OAuth 2.0 Authorization Code Flow with PKCE
 */
export const msalConfig: Configuration = {
  auth: {
    clientId: CLIENT_ID,
    authority: getAuthority(),
    redirectUri: REDIRECT_URI,
    postLogoutRedirectUri: REDIRECT_URI,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    // sessionStorage - cleared when browser closes (more secure)
    // MSAL uses this for its internal token cache
    // Actual access tokens are kept in memory by MSAL
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error("[MSAL]", message);
            return;
          case LogLevel.Warning:
            console.warn("[MSAL]", message);
            return;
          case LogLevel.Info:
            if (import.meta.env.DEV) {
              console.info("[MSAL]", message);
            }
            return;
        }
      },
      logLevel: import.meta.env.DEV ? LogLevel.Info : LogLevel.Warning,
    },
    tokenRenewalOffsetSeconds: 300, // Refresh 5 minutes before expiry
  },
};

/**
 * Scopes for login request
 * 
 * openid, profile, email - Standard OIDC scopes
 * User.Read - Microsoft Graph permission to read user profile
 */
export const loginRequest = {
  scopes: [
    "openid",
    "profile",
    "email",
    "User.Read",
  ],
};

/**
 * Scopes for API calls to backend
 * The backend validates the access token
 */
export const apiRequest = {
  scopes: [
    // For backend API access, we typically just need the default scope
    // The ID token contains the claims (tid, oid, email, name)
    "openid",
    "profile",
    "email",
  ],
};

/**
 * Get the configured redirect URI
 */
export function getRedirectUri(): string {
  return REDIRECT_URI;
}

/**
 * Check if Entra ID is properly configured
 */
export function isEntraConfigured(): boolean {
  return Boolean(CLIENT_ID);
}

/**
 * Get current authority URL
 */
export function getAuthority2(): string {
  return getAuthority();
}
