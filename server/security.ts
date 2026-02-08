/**
 * Security Middleware Configuration
 * Production-grade security for HealthMesh healthcare platform
 * 
 * Implements:
 * - Helmet for security headers
 * - CORS protection
 * - Rate limiting
 * - Request sanitization
 * - CSP (Content Security Policy)
 * - SQL/NoSQL injection protection
 * - Field-level encryption
 * - Advanced abuse detection
 */

import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import type { Express } from "express";
import { configureAdvancedSecurity, addSecurityHeaders } from "./security/advanced-security";
import { validateEncryptionSetup } from "./encryption/field-encryption";

/**
 * Configure comprehensive security middleware
 */
export function configureSecurity(app: Express): void {
    // ============================================================================
    // CORS Configuration
    // ============================================================================
    const corsOptions = {
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            // Allow requests with no origin (mobile apps, Postman, etc.)
            if (!origin) return callback(null, true);

            const allowedOrigins = [
                "http://localhost:5000",
                "http://localhost:5173",
                "http://localhost:3000",
                process.env.FRONTEND_URL,
                process.env.AZURE_APP_URL,
            ].filter(Boolean);

            if (allowedOrigins.some(allowed => origin.startsWith(allowed as string))) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
        optionsSuccessStatus: 200,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
        exposedHeaders: ["X-Request-Id"],
        maxAge: 86400, // 24 hours
    };

    app.use(cors(corsOptions));

    // ============================================================================
    // Helmet Security Headers
    // ============================================================================
    app.use(
        helmet({
            // Content Security Policy
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: [
                        "'self'",
                        "'unsafe-inline'", // Required for Vite in development
                        "'unsafe-eval'",   // Required for Vite in development
                        "https://login.microsoftonline.com",
                        "https://alcdn.msauth.net",
                        // Google Analytics and Tag Manager
                        "https://www.googletagmanager.com",
                        "https://www.google-analytics.com",
                        "https://ssl.google-analytics.com",
                    ],
                    styleSrc: [
                        "'self'",
                        "'unsafe-inline'", // Required for inline styles
                        "https://fonts.googleapis.com",
                    ],
                    fontSrc: [
                        "'self'",
                        "https://fonts.gstatic.com",
                        "data:",
                    ],
                    imgSrc: [
                        "'self'",
                        "data:",
                        "blob:",
                        "https:",
                        // Google Analytics
                        "https://www.google-analytics.com",
                        "https://www.googletagmanager.com",
                    ],
                    connectSrc: [
                        "'self'",
                        "https://login.microsoftonline.com",
                        "https://*.openai.azure.com",
                        "https://*.ai.azure.com",
                        "wss://localhost:*",
                        "ws://localhost:*",
                        // Google Analytics
                        "https://www.google-analytics.com",
                        "https://analytics.google.com",
                        "https://www.googletagmanager.com",
                    ],
                    frameSrc: [
                        "'self'",
                        "https://login.microsoftonline.com",
                    ],
                    objectSrc: ["'none'"],
                    baseUri: ["'self'"],
                    formAction: ["'self'"],
                    upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
                },
            },

            // Cross-Origin Embedder Policy
            crossOriginEmbedderPolicy: false, // Disabled for Azure AD integration

            // Cross-Origin Opener Policy
            crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },

            // Cross-Origin Resource Policy
            crossOriginResourcePolicy: { policy: "cross-origin" },

            // DNS Prefetch Control
            dnsPrefetchControl: { allow: false },

            // Frame Guard
            frameguard: { action: "deny" },

            // Hide Powered By
            hidePoweredBy: true,

            // HTTP Strict Transport Security
            hsts: {
                maxAge: 31536000, // 1 year
                includeSubDomains: true,
                preload: true,
            },

            // IE No Open
            ieNoOpen: true,

            // No Sniff
            noSniff: true,

            // Origin Agent Cluster
            originAgentCluster: true,

            // Permitted Cross-Domain Policies
            permittedCrossDomainPolicies: { permittedPolicies: "none" },

            // Referrer Policy
            referrerPolicy: { policy: "strict-origin-when-cross-origin" },

            // X-XSS-Protection
            xssFilter: true,
        })
    );

    // ============================================================================
    // Rate Limiting
    // ============================================================================

    // General API rate limiter
    const apiLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: {
            error: "Too many requests",
            message: "You have exceeded the rate limit. Please try again later.",
        },
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => {
            // Skip rate limiting for health checks
            return req.path === "/api/health";
        },
    });

    // Strict rate limiter for authentication endpoints
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // Limit each IP to 5 auth attempts per windowMs
        message: {
            error: "Too many authentication attempts",
            message: "Too many login attempts. Please try again after 15 minutes.",
        },
        standardHeaders: true,
        legacyHeaders: false,
    });

    // Strict rate limiter for AI endpoints (prevent abuse)
    const aiLimiter = rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 10, // Limit each IP to 10 AI requests per minute
        message: {
            error: "Too many AI requests",
            message: "You have exceeded the AI request limit. Please wait a moment.",
        },
        standardHeaders: true,
        legacyHeaders: false,
    });

    // Apply rate limiters
    app.use("/api/", apiLimiter);
    app.use("/api/auth/", authLimiter);
    app.use("/api/ai/", aiLimiter);
    app.use("/api/agents/", aiLimiter);
    app.use("/api/clinical-synthesis/", aiLimiter);

    // ============================================================================
    // Additional Security Headers (manual)
    // ============================================================================
    app.use((req, res, next) => {
        // Remove sensitive headers
        res.removeHeader("X-Powered-By");

        // Add custom security headers
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("X-XSS-Protection", "1; mode=block");
        res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

        // Add request ID for tracking (security audit)
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        res.setHeader("X-Request-Id", requestId);
        req.headers["x-request-id"] = requestId;

        next();
    });

    // ============================================================================
    // ADVANCED SECURITY FEATURES
    // ============================================================================

    // Configure SQL/NoSQL injection protection, abuse detection, etc.
    configureAdvancedSecurity(app);

    // Validate field encryption is properly configured
    validateEncryptionSetup();

    console.log("✅ Security middleware configured:");
    console.log("   - CORS protection enabled");
    console.log("   - Helmet security headers applied");
    console.log("   - Rate limiting active (multi-tier)");
    console.log("   - CSP configured for Azure integration");
    console.log("   - SQL/NoSQL injection protection active");
    console.log("   - Field-level encryption validated");
    console.log("   - API abuse detection enabled");
    console.log("   - Request validation active");
}

/**
 * Input sanitization middleware
 * Prevent XSS and injection attacks
 */
export function sanitizeInput(app: Express): void {
    app.use((req, res, next) => {
        // Sanitize query parameters
        if (req.query) {
            Object.keys(req.query).forEach(key => {
                if (typeof req.query[key] === "string") {
                    // Remove script tags and other dangerous patterns
                    req.query[key] = (req.query[key] as string)
                        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
                        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
                        .replace(/javascript:/gi, "");
                }
            });
        }

        // Sanitize body (for non-file uploads)
        if (req.body && typeof req.body === "object" && !req.is("multipart/form-data")) {
            sanitizeObject(req.body);
        }

        next();
    });
}

function sanitizeObject(obj: any): void {
    for (const key in obj) {
        if (typeof obj[key] === "string") {
            // Remove dangerous patterns
            obj[key] = obj[key]
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
                .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
                .replace(/javascript:/gi, "");
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
            sanitizeObject(obj[key]);
        }
    }
}
