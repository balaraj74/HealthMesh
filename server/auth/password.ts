/**
 * Password Utilities - DEPRECATED
 * 
 * ⚠️ WARNING: This file is DEPRECATED and will be removed.
 * 
 * HealthMesh now uses Microsoft Entra ID exclusively for authentication.
 * Password-based authentication has been permanently removed.
 * 
 * ❌ DO NOT USE these functions
 * ❌ DO NOT add new password-related code
 * 
 * This file is retained only for backwards compatibility during migration.
 * It will throw errors if called to prevent accidental use.
 */

/**
 * @deprecated Password hashing is no longer supported
 * @throws Error - Always throws, use Entra ID instead
 */
export async function hashPassword(password: string): Promise<string> {
    throw new Error(
        "LOCAL_AUTH_DISABLED: Password hashing is not supported. " +
        "HealthMesh uses Microsoft Entra ID exclusively for authentication."
    );
}

/**
 * @deprecated Password verification is no longer supported
 * @throws Error - Always throws, use Entra ID instead
 */
export async function verifyPassword(
    password: string,
    hash: string
): Promise<boolean> {
    throw new Error(
        "LOCAL_AUTH_DISABLED: Password verification is not supported. " +
        "HealthMesh uses Microsoft Entra ID exclusively for authentication."
    );
}

/**
 * @deprecated Password validation is no longer supported
 * @throws Error - Always throws, use Entra ID instead
 */
export function validatePassword(password: string): {
    valid: boolean;
    errors: string[];
} {
    throw new Error(
        "LOCAL_AUTH_DISABLED: Password validation is not supported. " +
        "HealthMesh uses Microsoft Entra ID exclusively for authentication."
    );
}
