/**
 * Role-Based Access Control (RBAC) Middleware
 * Granular permission management for healthcare platform
 * 
 * Features:
 * - Resource-level permissions
 * - Action-based authorization
 * - Hospital-scoped access control
 * - Audit logging for all authorization decisions
 */

import type { Request, Response, NextFunction } from "express";
import { AzureAuditService } from "../data/azureDataAccess";

// ============================================================================
// PERMISSION DEFINITIONS
// ============================================================================

export enum Resource {
    PATIENT = "patient",
    CASE = "case",
    LAB_REPORT = "lab_report",
    APPOINTMENT = "appointment",
    USER = "user",
    HOSPITAL = "hospital",
    AUDIT_LOG = "audit_log",
    AI_ANALYSIS = "ai_analysis",
}

export enum Action {
    CREATE = "create",
    READ = "read",
    UPDATE = "update",
    DELETE = "delete",
    ANALYZE = "analyze",
    EXPORT = "export",
}

// ============================================================================
// ROLE PERMISSION MATRIX
// ============================================================================

type PermissionSet = Set<string>;

const ROLE_PERMISSIONS: Record<string, PermissionSet> = {
    admin: new Set([
        // Full access to everything
        "patient:create", "patient:read", "patient:update", "patient:delete",
        "case:create", "case:read", "case:update", "case:delete",
        "lab_report:create", "lab_report:read", "lab_report:update", "lab_report:delete",
        "appointment:create", "appointment:read", "appointment:update", "appointment:delete",
        "user:create", "user:read", "user:update", "user:delete",
        "hospital:read", "hospital:update",
        "audit_log:read", "audit_log:export",
        "ai_analysis:create", "ai_analysis:read",
    ]),

    doctor: new Set([
        // Full clinical access
        "patient:create", "patient:read", "patient:update",
        "case:create", "case:read", "case:update",
        "lab_report:create", "lab_report:read", "lab_report:update",
        "appointment:create", "appointment:read", "appointment:update", "appointment:delete",
        "ai_analysis:create", "ai_analysis:read",
        "audit_log:read",
    ]),

    nurse: new Set([
        // Clinical support access
        "patient:read", "patient:update",
        "case:read", "case:update",
        "lab_report:read", "lab_report:create",
        "appointment:read", "appointment:update",
        "ai_analysis:read",
    ]),

    receptionist: new Set([
        // Administrative access
        "patient:create", "patient:read", "patient:update",
        "appointment:create", "appointment:read", "appointment:update", "appointment:delete",
    ]),

    viewer: new Set([
        // Read-only access
        "patient:read",
        "case:read",
        "lab_report:read",
        "appointment:read",
    ]),
};

// ============================================================================
// PERMISSION CHECKING
// ============================================================================

/**
 * Check if user has permission for resource:action
 */
export function hasPermission(role: string, resource: Resource, action: Action): boolean {
    const permissions = ROLE_PERMISSIONS[role.toLowerCase()];
    if (!permissions) return false;

    const permissionKey = `${resource}:${action}`;
    return permissions.has(permissionKey);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: string): string[] {
    const permissions = ROLE_PERMISSIONS[role.toLowerCase()];
    return permissions ? Array.from(permissions) : [];
}

// ============================================================================
// AUTHORIZATION MIDDLEWARE
// ============================================================================

/**
 * Require specific permission to access endpoint
 * Usage: app.get('/api/patients', requirePermission(Resource.PATIENT, Action.READ), handler)
 */
export function requirePermission(resource: Resource, action: Action) {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                error: "Unauthorized",
                message: "Authentication required",
                code: "AUTH_REQUIRED",
            });
        }

        const userRole = req.user.role;
        const hasAccess = hasPermission(userRole, resource, action);

        if (!hasAccess) {
            // Log unauthorized access attempt
            await logAuthorizationFailure(req, resource, action);

            return res.status(403).json({
                error: "Forbidden",
                message: `Insufficient permissions. Required: ${resource}:${action}`,
                code: "INSUFFICIENT_PERMISSIONS",
                required: `${resource}:${action}`,
                userRole,
            });
        }

        // Log successful authorization
        await logAuthorizationSuccess(req, resource, action);

        next();
    };
}

/**
 * Require any of the specified permissions
 */
export function requireAnyPermission(permissions: Array<[Resource, Action]>) {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                error: "Unauthorized",
                message: "Authentication required",
                code: "AUTH_REQUIRED",
            });
        }

        const userRole = req.user.role;
        const hasAccess = permissions.some(([resource, action]) =>
            hasPermission(userRole, resource, action)
        );

        if (!hasAccess) {
            await logAuthorizationFailure(req, permissions[0][0], permissions[0][1]);

            return res.status(403).json({
                error: "Forbidden",
                message: "Insufficient permissions",
                code: "INSUFFICIENT_PERMISSIONS",
                required: permissions.map(([r, a]) => `${r}:${a}`),
                userRole,
            });
        }

        next();
    };
}

/**
 * Require specific role(s)
 */
export function requireRole(...roles: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                error: "Unauthorized",
                message: "Authentication required",
                code: "AUTH_REQUIRED",
            });
        }

        const userRole = req.user.role.toLowerCase();
        const hasRole = roles.some(role => role.toLowerCase() === userRole);

        if (!hasRole) {
            await logAuthorizationFailure(req, Resource.USER, Action.READ);

            return res.status(403).json({
                error: "Forbidden",
                message: `Required role: ${roles.join(" or ")}`,
                code: "INSUFFICIENT_ROLE",
                required: roles,
                userRole: req.user.role,
            });
        }

        next();
    };
}

/**
 * Require admin role
 */
export const requireAdmin = requireRole("admin");

/**
 * Require doctor or admin role
 */
export const requireDoctor = requireRole("doctor", "admin");

/**
 * Require healthcare professional (doctor, nurse, or admin)
 */
export const requireHealthcareProfessional = requireRole("doctor", "nurse", "admin");

// ============================================================================
// RESOURCE OWNERSHIP VALIDATION
// ============================================================================

/**
 * Verify user has access to resource within their hospital
 * Prevents cross-hospital data access
 */
export function requireHospitalAccess() {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user?.hospitalId) {
            return res.status(403).json({
                error: "Forbidden",
                message: "Hospital context required",
                code: "NO_HOSPITAL_CONTEXT",
            });
        }

        // Hospital ID is automatically enforced in database queries
        // This middleware ensures the user context is properly set
        next();
    };
}

/**
 * Verify resource belongs to user's hospital
 * Use this for resource-specific endpoints
 */
export function validateResourceOwnership(getResourceHospitalId: (req: Request) => Promise<string | null>) {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user?.hospitalId) {
            return res.status(403).json({
                error: "Forbidden",
                message: "Hospital context required",
                code: "NO_HOSPITAL_CONTEXT",
            });
        }

        try {
            const resourceHospitalId = await getResourceHospitalId(req);

            if (!resourceHospitalId) {
                return res.status(404).json({
                    error: "Not found",
                    message: "Resource not found",
                    code: "RESOURCE_NOT_FOUND",
                });
            }

            if (resourceHospitalId !== req.user.hospitalId) {
                // Log cross-hospital access attempt
                await logAuthorizationFailure(req, Resource.PATIENT, Action.READ, {
                    reason: "cross_hospital_access",
                    userHospital: req.user.hospitalId,
                    resourceHospital: resourceHospitalId,
                });

                return res.status(403).json({
                    error: "Forbidden",
                    message: "Access denied to resource from different hospital",
                    code: "CROSS_HOSPITAL_ACCESS_DENIED",
                });
            }

            next();
        } catch (error) {
            console.error("Resource ownership validation error:", error);
            return res.status(500).json({
                error: "Internal server error",
                message: "Failed to validate resource access",
                code: "VALIDATION_ERROR",
            });
        }
    };
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

async function logAuthorizationSuccess(
    req: Request,
    resource: Resource,
    action: Action
): Promise<void> {
    try {
        if (!req.user) return;

        await AzureAuditService.createAuditLog(
            req.user.hospitalId,
            req.user.id,
            req.user.entraOid,
            {
                eventType: "authorization-success",
                resourceType: resource,
                action,
                details: {
                    endpoint: req.path,
                    method: req.method,
                    role: req.user.role,
                    permission: `${resource}:${action}`,
                },
                ipAddress: req.ip || req.socket?.remoteAddress,
                userAgent: req.headers["user-agent"],
            }
        );
    } catch (error) {
        console.error("[RBAC] Failed to log authorization success:", error);
    }
}

async function logAuthorizationFailure(
    req: Request,
    resource: Resource,
    action: Action,
    additionalDetails?: Record<string, any>
): Promise<void> {
    try {
        if (!req.user) return;

        await AzureAuditService.createAuditLog(
            req.user.hospitalId,
            req.user.id,
            req.user.entraOid,
            {
                eventType: "authorization-failure",
                resourceType: resource,
                action,
                details: {
                    endpoint: req.path,
                    method: req.method,
                    role: req.user.role,
                    requiredPermission: `${resource}:${action}`,
                    ...additionalDetails,
                },
                ipAddress: req.ip || req.socket?.remoteAddress,
                userAgent: req.headers["user-agent"],
            }
        );

        console.warn(
            `[RBAC] Authorization failed: User ${req.user.email} (${req.user.role}) ` +
            `attempted ${resource}:${action} at ${req.path}`
        );
    } catch (error) {
        console.error("[RBAC] Failed to log authorization failure:", error);
    }
}

// ============================================================================
// PERMISSION HELPER FUNCTIONS
// ============================================================================

/**
 * Check if current user can perform action on resource
 */
export function canUser(req: Request, resource: Resource, action: Action): boolean {
    if (!req.user?.role) return false;
    return hasPermission(req.user.role, resource, action);
}

/**
 * Get user's effective permissions
 */
export function getUserPermissions(req: Request): string[] {
    if (!req.user?.role) return [];
    return getRolePermissions(req.user.role);
}

/**
 * Export permission matrix for frontend
 */
export function getPermissionMatrix(): Record<string, string[]> {
    const matrix: Record<string, string[]> = {};

    for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
        matrix[role] = Array.from(permissions);
    }

    return matrix;
}
