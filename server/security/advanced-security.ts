/**
 * Advanced Security Enhancements
 * Additional protection layers for production healthcare platform
 * 
 * Features:
 * - SQL injection protection
 * - NoSQL injection protection
 * - Request validation
 * - Session security
 * - API abuse prevention
 */

import { body, param, query, validationResult, type ValidationChain } from "express-validator";
import mongoSanitize from "express-mongo-sanitize";
import type { Request, Response, NextFunction, Express } from "express";

// ============================================================================
// SQL INJECTION PROTECTION
// ============================================================================

/**
 * Dangerous SQL patterns to block
 */
const SQL_INJECTION_PATTERNS = [
    /(\s|^)(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|eval)(\s|$)/i,
    /('|"|;|--|\/\*|\*\/|xp_|sp_)/i,
    /(0x[0-9a-f]+)/i,
];

/**
 * Check if string contains SQL injection patterns
 */
export function containsSQLInjection(input: string): boolean {
    return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Sanitize input to remove SQL injection attempts
 */
export function sanitizeSQL(input: string): string {
    if (!input) return input;

    // Remove dangerous characters and keywords
    return input
        .replace(/['"`;]/g, "")
        .replace(/-{2,}/g, "")
        .replace(/\/\*|\*\//g, "")
        .trim();
}

/**
 * Middleware to detect and block SQL injection in request
 */
export function sqlInjectionProtection(req: Request, res: Response, next: NextFunction): void {
    const checkValue = (value: any, location: string, key: string): boolean => {
        if (typeof value === "string" && containsSQLInjection(value)) {
            console.warn(
                `[SECURITY] SQL injection attempt detected in ${location}.${key}: ${value.substring(0, 50)}`
            );
            return true;
        }
        return false;
    };

    // Check query parameters
    for (const [key, value] of Object.entries(req.query)) {
        if (checkValue(value, "query", key)) {
            return void res.status(400).json({
                error: "Bad Request",
                message: "Invalid characters detected in query parameters",
                code: "SQL_INJECTION_DETECTED",
            });
        }
    }

    // Check body parameters
    if (req.body && typeof req.body === "object") {
        for (const [key, value] of Object.entries(req.body)) {
            if (checkValue(value, "body", key)) {
                return void res.status(400).json({
                    error: "Bad Request",
                    message: "Invalid characters detected in request body",
                    code: "SQL_INJECTION_DETECTED",
                });
            }
        }
    }

    // Check params
    for (const [key, value] of Object.entries(req.params)) {
        if (checkValue(value, "params", key)) {
            return void res.status(400).json({
                error: "Bad Request",
                message: "Invalid characters detected in URL parameters",
                code: "SQL_INJECTION_DETECTED",
            });
        }
    }

    next();
}

// ============================================================================
// REQUEST VALIDATION HELPERS
// ============================================================================

/**
 * Common validation rules
 */
export const ValidationRules = {
    /**
     * UUID validation
     */
    uuid: (field: string): ValidationChain =>
        param(field)
            .isUUID()
            .withMessage(`${field} must be a valid UUID`),

    /**
     * Email validation
     */
    email: (field: string = "email"): ValidationChain =>
        body(field)
            .isEmail()
            .normalizeEmail()
            .withMessage("Must be a valid email address"),

    /**
     * Phone number validation
     */
    phone: (field: string = "phone"): ValidationChain =>
        body(field)
            .optional()
            .matches(/^\+?[1-9]\d{1,14}$/)
            .withMessage("Must be a valid phone number"),

    /**
     * Date validation
     */
    date: (field: string): ValidationChain =>
        body(field)
            .isISO8601()
            .toDate()
            .withMessage("Must be a valid ISO 8601 date"),

    /**
     * String length validation
     */
    stringLength: (field: string, min: number, max: number): ValidationChain =>
        body(field)
            .isString()
            .trim()
            .isLength({ min, max })
            .withMessage(`${field} must be between ${min} and ${max} characters`),

    /**
     * Integer validation
     */
    integer: (field: string, min?: number, max?: number): ValidationChain => {
        let chain = body(field).isInt();
        if (min !== undefined && max !== undefined) {
            chain = chain.isInt({ min, max });
        }
        return chain.withMessage(`${field} must be an integer`);
    },

    /**
     * Boolean validation
     */
    boolean: (field: string): ValidationChain =>
        body(field)
            .isBoolean()
            .withMessage(`${field} must be a boolean`),

    /**
     * Enum validation
     */
    enum: (field: string, values: string[]): ValidationChain =>
        body(field)
            .isIn(values)
            .withMessage(`${field} must be one of: ${values.join(", ")}`),

    /**
     * Safe string (alphanumeric + basic punctuation)
     */
    safeString: (field: string): ValidationChain =>
        body(field)
            .matches(/^[a-zA-Z0-9\s\-_.,']+$/)
            .withMessage(`${field} contains invalid characters`),

    /**
     * No HTML tags
     */
    noHTML: (field: string): ValidationChain =>
        body(field)
            .customSanitizer((value: string) => {
                if (typeof value !== "string") return value;
                return value.replace(/<[^>]*>/g, "");
            }),
};

/**
 * Middleware to handle validation errors
 */
export function handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(err => ({
            field: err.type === "field" ? err.path : "unknown",
            message: err.msg,
            value: err.type === "field" ? err.value : undefined,
        }));

        console.warn(`[VALIDATION] Request validation failed:`, formattedErrors);

        return void res.status(400).json({
            error: "Validation Error",
            message: "Request validation failed",
            code: "VALIDATION_FAILED",
            errors: formattedErrors,
        });
    }

    next();
}

/**
 * Create validation middleware chain
 */
export function validate(...validations: ValidationChain[]) {
    return [...validations, handleValidationErrors];
}

// ============================================================================
// SESSION SECURITY CONFIGURATION
// ============================================================================

export const SESSION_CONFIG = {
    // Session cookie name (obscured to prevent fingerprinting)
    name: "hm.sid",

    // Session secret (from environment)
    secret: process.env.SESSION_SECRET || "change-me-in-production",

    // Cookie settings
    cookie: {
        httpOnly: true, // Prevent JavaScript access
        secure: process.env.NODE_ENV === "production", // HTTPS only in production
        sameSite: "strict" as const, // CSRF protection
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        domain: process.env.COOKIE_DOMAIN, // Set for production
        path: "/",
    },

    // Session settings
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    rolling: true, // Reset expiry on activity
    proxy: process.env.NODE_ENV === "production", // Trust proxy in production
};

// ============================================================================
// API ABUSE PREVENTION
// ============================================================================

/**
 * Detect and block suspicious request patterns
 */
export function abuseDetection(req: Request, res: Response, next: NextFunction): void {
    const userAgent = req.headers["user-agent"] || "";
    const ip = req.ip || req.socket?.remoteAddress;

    // Block requests without User-Agent
    if (!userAgent && process.env.NODE_ENV === "production") {
        console.warn(`[SECURITY] Request without User-Agent from ${ip}`);
        return void res.status(400).json({
            error: "Bad Request",
            message: "User-Agent header required",
            code: "MISSING_USER_AGENT",
        });
    }

    // Block known bot patterns (adjust as needed)
    const suspiciousPatterns = [
        /sqlmap/i,
        /nikto/i,
        /nmap/i,
        /masscan/i,
        /acunetix/i,
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
        console.warn(`[SECURITY] Suspicious User-Agent detected: ${userAgent} from ${ip}`);
        return void res.status(403).json({
            error: "Forbidden",
            message: "Access denied",
            code: "SUSPICIOUS_ACTIVITY",
        });
    }

    next();
}

/**
 * Require specific HTTP methods
 */
export function requireMethod(...methods: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!methods.includes(req.method)) {
            return res.status(405).json({
                error: "Method Not Allowed",
                message: `Method ${req.method} not allowed. Allowed: ${methods.join(", ")}`,
                code: "METHOD_NOT_ALLOWED",
                allowed: methods,
            });
        }
        next();
    };
}

/**
 * Require Content-Type header for POST/PUT requests
 */
export function requireContentType(...types: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (["POST", "PUT", "PATCH"].includes(req.method)) {
            const contentType = req.headers["content-type"];

            if (!contentType) {
                return res.status(400).json({
                    error: "Bad Request",
                    message: "Content-Type header required",
                    code: "MISSING_CONTENT_TYPE",
                });
            }

            const isValid = types.some(type => contentType.includes(type));
            if (!isValid) {
                return res.status(415).json({
                    error: "Unsupported Media Type",
                    message: `Content-Type must be one of: ${types.join(", ")}`,
                    code: "UNSUPPORTED_MEDIA_TYPE",
                    expected: types,
                    received: contentType,
                });
            }
        }

        next();
    };
}

// ============================================================================
// REQUEST SIZE LIMITS
// ============================================================================

/**
 * Check request body size and reject if too large
 */
export function requestSizeLimit(maxBytes: number) {
    return (req: Request, res: Response, next: NextFunction) => {
        const contentLength = parseInt(req.headers["content-length"] || "0", 10);

        if (contentLength > maxBytes) {
            console.warn(
                `[SECURITY] Request too large: ${contentLength} bytes (max: ${maxBytes}) from ${req.ip}`
            );

            return res.status(413).json({
                error: "Payload Too Large",
                message: `Request body exceeds maximum size of ${maxBytes} bytes`,
                code: "PAYLOAD_TOO_LARGE",
                maxSize: maxBytes,
                receivedSize: contentLength,
            });
        }

        next();
    };
}

// ============================================================================
// APPLY ALL ADVANCED SECURITY
// ============================================================================

/**
 * Configure all advanced security features
 */
export function configureAdvancedSecurity(app: Express): void {
    console.log("\n🔒 Configuring advanced security features:");

    // NoSQL injection protection
    app.use(mongoSanitize({
        replaceWith: "_",
        onSanitize: ({ key }) => {
            console.warn(`[SECURITY] NoSQL injection attempt detected in key: ${key}`);
        },
    }));
    console.log("   ✅ NoSQL injection protection");

    // SQL injection detection
    app.use("/api", sqlInjectionProtection);
    console.log("   ✅ SQL injection detection");

    // Abuse detection
    app.use("/api", abuseDetection);
    console.log("   ✅ API abuse detection");

    // Content-Type validation for API
    app.use("/api", requireContentType("application/json", "multipart/form-data"));
    console.log("   ✅ Content-Type validation");

    // Request size limit (10MB default)
    app.use("/api", requestSizeLimit(10 * 1024 * 1024));
    console.log("   ✅ Request size limits\n");
}

// ============================================================================
// SECURITY HEADERS HELPERS
// ============================================================================

/**
 * Add security headers to response
 */
export function addSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
    // Prevent MIME sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Prevent clickjacking
    res.setHeader("X-Frame-Options", "DENY");

    // XSS protection (legacy browsers)
    res.setHeader("X-XSS-Protection", "1; mode=block");

    // Prevent sensitive info in referrer
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    // Feature policy
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

    // Expect-CT (Certificate Transparency)
    if (process.env.NODE_ENV === "production") {
        res.setHeader("Expect-CT", "max-age=86400, enforce");
    }

    next();
}

/**
 * Add cache control headers for sensitive data
 */
export function noCacheHeaders(req: Request, res: Response, next: NextFunction): void {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
}
