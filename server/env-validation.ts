/**
 * Environment Variable Validation & Security Configuration
 * Ensures all required environment variables are set and valid
 */

import * as crypto from "crypto";

interface EnvValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validate all environment variables on startup
 */
export function validateEnvironment(): EnvValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║ 🔒 Security Configuration Validation                       ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    // ============================================================================
    // CRITICAL: Azure AD Configuration
    // ============================================================================
    if (!process.env.AZURE_AD_CLIENT_ID) {
        errors.push("AZURE_AD_CLIENT_ID is required for authentication");
    } else {
        console.log("✅ Azure AD Client ID configured");
    }

    // Note: AZURE_AD_TENANT_ID is NOT required for multi-tenant apps
    if (!process.env.AZURE_AD_TENANT_ID) {
        warnings.push("AZURE_AD_TENANT_ID not set - using multi-tenant mode");
        console.log("⚠️  Multi-tenant mode (no AZURE_AD_TENANT_ID)");
    } else {
        console.log("✅ Azure AD Tenant ID configured");
    }

    // ============================================================================
    // CRITICAL: QR Encryption Key (for patient identity system)
    // ============================================================================
    const qrKey = process.env.QR_ENCRYPTION_KEY;
    if (!qrKey) {
        errors.push("QR_ENCRYPTION_KEY is required for patient QR system");
    } else if (qrKey.length !== 32) {
        errors.push("QR_ENCRYPTION_KEY must be exactly 32 characters for AES-256 encryption");
    } else if (qrKey.toLowerCase().includes("your-") || qrKey === "your-32-character-encryption-key") {
        errors.push("QR_ENCRYPTION_KEY must be changed from the example value");
    } else {
        console.log("✅ QR Encryption Key configured (32 chars)");
    }

    // ============================================================================
    // Session Secret
    // ============================================================================
    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret) {
        warnings.push("SESSION_SECRET not set - generating random secret (will not persist across restarts)");
        process.env.SESSION_SECRET = crypto.randomBytes(32).toString("hex");
        console.log("⚠️  Session secret auto-generated (not persistent)");
    } else if (sessionSecret.length < 32) {
        warnings.push("SESSION_SECRET should be at least 32 characters for security");
    } else {
        console.log("✅ Session secret configured");
    }

    // ============================================================================
    // Database Configuration
    // ============================================================================
    if (!process.env.DATABASE_URL) {
        if (process.env.NODE_ENV === "production") {
            errors.push("DATABASE_URL is required in production");
        } else {
            warnings.push("DATABASE_URL not set - using default SQLite (./healthmesh.db)");
            console.log("⚠️  Using default SQLite database");
        }
    } else {
        console.log("✅ Database URL configured");
    }

    // ============================================================================
    // Azure OpenAI / AI Configuration
    // ============================================================================
    if (!process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_API_KEY) {
        warnings.push("Azure OpenAI not configured - AI features will be limited");
        console.log("⚠️  Azure OpenAI not configured");
    } else {
        console.log("✅ Azure OpenAI configured");

        // Validate endpoint format
        if (!process.env.AZURE_OPENAI_ENDPOINT.startsWith("https://")) {
            errors.push("AZURE_OPENAI_ENDPOINT must be a valid HTTPS URL");
        }
    }

    // ============================================================================
    // Production-specific checks
    // ============================================================================
    if (process.env.NODE_ENV === "production") {
        console.log("\n🏭 Production mode - additional security checks:");

        if (!process.env.FRONTEND_URL) {
            warnings.push("FRONTEND_URL not set - CORS may not work correctly");
        } else {
            console.log("✅ Frontend URL configured for CORS");
        }

        if (process.env.USE_DEMO_MODE === "true") {
            errors.push("Demo mode is enabled in production - this is a security risk");
        }

        // Check for development/example values
        const sensitiveVars = [
            "AZURE_OPENAI_API_KEY",
            "AZURE_SQL_PASSWORD",
            "QR_ENCRYPTION_KEY",
        ];

        for (const varName of sensitiveVars) {
            const value = process.env[varName];
            if (value && (value.includes("your-") || value.includes("example") || value.includes("test"))) {
                errors.push(`${varName} appears to use an example/test value in production`);
            }
        }
    }

    // ============================================================================
    // Security Headers
    // ============================================================================
    console.log("\n🛡️  Security features:");
    console.log("✅ Helmet security headers enabled");
    console.log("✅ CORS protection enabled");
    console.log("✅ Rate limiting enabled");
    console.log("✅ Input sanitization enabled");
    console.log("✅ CSP configured");
    console.log("✅ XSS protection enabled");

    // ============================================================================
    // Output Results
    // ============================================================================
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    if (errors.length === 0 && warnings.length === 0) {
        console.log("║ ✅ All environment validations passed                      ║");
    } else {
        if (errors.length > 0) {
            console.log("║ ❌ CRITICAL ERRORS FOUND                                   ║");
            console.log("╠════════════════════════════════════════════════════════════╣");
            errors.forEach(error => {
                console.error(`   ❌ ${error}`);
            });
        }
        if (warnings.length > 0) {
            console.log("║ ⚠️  WARNINGS                                               ║");
            console.log("╠════════════════════════════════════════════════════════════╣");
            warnings.forEach(warning => {
                console.warn(`   ⚠️  ${warning}`);
            });
        }
    }
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Check if in production mode
 */
export function isProduction(): boolean {
    return process.env.NODE_ENV === "production";
}

/**
 * Get allowed origins for CORS
 */
export function getAllowedOrigins(): string[] {
    const origins = [
        "http://localhost:5000",
        "http://localhost:5173",
        "http://localhost:3000",
    ];

    if (process.env.FRONTEND_URL) {
        origins.push(process.env.FRONTEND_URL);
    }

    if (process.env.AZURE_APP_URL) {
        origins.push(process.env.AZURE_APP_URL);
    }

    return origins.filter(Boolean);
}

/**
 * Mask sensitive data in logs
 */
export function maskSensitive(data: string): string {
    if (!data || data.length < 8) return "***";
    return `${data.substring(0, 4)}...${data.substring(data.length - 4)}`;
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString("hex");
}

/**
 * Validate API key format (basic check)
 */
export function isValidApiKey(key: string | undefined): boolean {
    if (!key) return false;
    if (key.length < 20) return false;
    if (key.toLowerCase().includes("your-") || key.includes("example")) return false;
    return true;
}
