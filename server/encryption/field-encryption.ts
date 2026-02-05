/**
 * Field-Level Encryption for PHI (Protected Health Information)
 * AES-256-GCM encryption for sensitive patient data
 * 
 * Features:
 * - Field-level encryption for SSN, medical records, notes
 * - Key rotation support
 * - Authenticated encryption (GCM mode)
 * - HIPAA-compliant encryption standards
 */

import * as crypto from "crypto";

// ============================================================================
// ENCRYPTION CONFIGURATION
// ============================================================================

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Get encryption key from environment
 * Falls back to QR_ENCRYPTION_KEY for backward compatibility
 */
function getEncryptionKey(): Buffer {
    const key = process.env.FIELD_ENCRYPTION_KEY || process.env.QR_ENCRYPTION_KEY;

    if (!key) {
        throw new Error("FIELD_ENCRYPTION_KEY or QR_ENCRYPTION_KEY must be set");
    }

    if (key.length !== 32) {
        throw new Error("Encryption key must be exactly 32 characters");
    }

    return Buffer.from(key, "utf-8");
}

// ============================================================================
// ENCRYPTION FUNCTIONS
// ============================================================================

/**
 * Encrypt sensitive field data
 * Returns base64-encoded ciphertext with IV and auth tag
 */
export function encryptField(plaintext: string): string {
    if (!plaintext) return plaintext;

    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(IV_LENGTH);

        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(plaintext, "utf8", "base64");
        encrypted += cipher.final("base64");

        const authTag = cipher.getAuthTag();

        // Combine IV + AuthTag + Ciphertext
        const combined = Buffer.concat([
            iv,
            authTag,
            Buffer.from(encrypted, "base64"),
        ]);

        return combined.toString("base64");
    } catch (error) {
        console.error("[ENCRYPTION] Field encryption failed:", error);
        throw new Error("Encryption failed");
    }
}

/**
 * Decrypt sensitive field data
 */
export function decryptField(ciphertext: string): string {
    if (!ciphertext) return ciphertext;

    try {
        const key = getEncryptionKey();
        const combined = Buffer.from(ciphertext, "base64");

        // Extract IV, AuthTag, and encrypted data
        const iv = combined.subarray(0, IV_LENGTH);
        const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
        const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted.toString("base64"), "base64", "utf8");
        decrypted += decipher.final("utf8");

        return decrypted;
    } catch (error) {
        console.error("[ENCRYPTION] Field decryption failed:", error);
        throw new Error("Decryption failed");
    }
}

// ============================================================================
// BULK ENCRYPTION (for database operations)
// ============================================================================

/**
 * Encrypt multiple fields in an object
 */
export function encryptFields<T extends Record<string, any>>(
    obj: T,
    fields: (keyof T)[]
): T {
    const encrypted = { ...obj };

    for (const field of fields) {
        if (obj[field] && typeof obj[field] === "string") {
            encrypted[field] = encryptField(obj[field] as string) as T[keyof T];
        }
    }

    return encrypted;
}

/**
 * Decrypt multiple fields in an object
 */
export function decryptFields<T extends Record<string, any>>(
    obj: T,
    fields: (keyof T)[]
): T {
    const decrypted = { ...obj };

    for (const field of fields) {
        if (obj[field] && typeof obj[field] === "string") {
            try {
                decrypted[field] = decryptField(obj[field] as string) as T[keyof T];
            } catch (error) {
                console.error(`[ENCRYPTION] Failed to decrypt field: ${String(field)}`);
                // Keep encrypted value if decryption fails
            }
        }
    }

    return decrypted;
}

// ============================================================================
// PATIENT DATA ENCRYPTION
// ============================================================================

interface EncryptedPatientData {
    ssn?: string;
    medicalRecordNumber?: string;
    insuranceNumber?: string;
    emergencyContact?: string;
    notes?: string;
}

/**
 * Encrypt sensitive patient fields before database storage
 */
export function encryptPatientData(data: EncryptedPatientData): EncryptedPatientData {
    return encryptFields(data, [
        "ssn",
        "medicalRecordNumber",
        "insuranceNumber",
        "emergencyContact",
        "notes",
    ]);
}

/**
 * Decrypt patient data after database retrieval
 */
export function decryptPatientData(data: EncryptedPatientData): EncryptedPatientData {
    return decryptFields(data, [
        "ssn",
        "medicalRecordNumber",
        "insuranceNumber",
        "emergencyContact",
        "notes",
    ]);
}

// ============================================================================
// DATA MASKING (for logs and non-privileged users)
// ============================================================================

/**
 * Mask sensitive data for display
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
    if (!data) return "";
    if (data.length <= visibleChars) return "***";

    const masked = "*".repeat(data.length - visibleChars);
    return masked + data.slice(-visibleChars);
}

/**
 * Mask SSN (show last 4 digits)
 */
export function maskSSN(ssn: string): string {
    if (!ssn) return "";
    return `***-**-${ssn.slice(-4)}`;
}

/**
 * Mask email (show first char and domain)
 */
export function maskEmail(email: string): string {
    if (!email || !email.includes("@")) return "***";

    const [local, domain] = email.split("@");
    return `${local[0]}***@${domain}`;
}

/**
 * Mask phone number (show last 4 digits)
 */
export function maskPhone(phone: string): string {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    return `***-***-${digits.slice(-4)}`;
}

// ============================================================================
// HASH FUNCTIONS (for searchable encrypted data)
// ============================================================================

/**
 * Create searchable hash of sensitive data
 * Use this for indexing encrypted fields
 */
export function hashForSearch(data: string): string {
    const salt = process.env.SEARCH_HASH_SALT || "default-salt-change-me";
    return crypto
        .createHmac("sha256", salt)
        .update(data.toLowerCase().trim())
        .digest("hex");
}

/**
 * Create deterministic hash for duplicate detection
 */
export function hashForDeduplication(data: string): string {
    return crypto
        .createHash("sha256")
        .update(data.toLowerCase().trim())
        .digest("hex");
}

// ============================================================================
// KEY ROTATION SUPPORT
// ============================================================================

interface EncryptedWithVersion {
    version: number;
    data: string;
}

/**
 * Encrypt with key version tracking (for key rotation)
 */
export function encryptWithVersion(plaintext: string, version: number = 1): string {
    const encrypted = encryptField(plaintext);
    const payload: EncryptedWithVersion = { version, data: encrypted };
    return JSON.stringify(payload);
}

/**
 * Decrypt with automatic key version handling
 */
export function decryptWithVersion(ciphertext: string): string {
    try {
        const payload: EncryptedWithVersion = JSON.parse(ciphertext);

        // Handle different key versions if needed
        if (payload.version === 1) {
            return decryptField(payload.data);
        }

        throw new Error(`Unsupported encryption version: ${payload.version}`);
    } catch {
        // Fallback for data encrypted without version
        return decryptField(ciphertext);
    }
}

// ============================================================================
// ENCRYPTION VALIDATION
// ============================================================================

/**
 * Validate encryption key is properly configured
 */
export function validateEncryptionSetup(): boolean {
    try {
        const testData = "test-encryption-setup";
        const encrypted = encryptField(testData);
        const decrypted = decryptField(encrypted);

        if (decrypted !== testData) {
            console.error("[ENCRYPTION] Validation failed: decryption mismatch");
            return false;
        }

        console.log("✅ Field encryption validated");
        return true;
    } catch (error) {
        console.error("[ENCRYPTION] Validation failed:", error);
        return false;
    }
}

// ============================================================================
// SECURE DATA DELETION
// ============================================================================

/**
 * Securely wipe string from memory (overwrite with random data)
 */
export function secureWipe(str: string): void {
    if (!str) return;

    // Note: JavaScript strings are immutable, so this is best-effort
    // For true secure deletion, use Buffer objects
    try {
        const buffer = Buffer.from(str);
        crypto.randomFillSync(buffer);
    } catch (error) {
        // Silent failure - this is best-effort
    }
}

/**
 * Create a secure random token
 */
export function generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString("hex");
}

/**
 * Generate cryptographically secure patient ID
 */
export function generatePatientId(): string {
    return `P-${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
}
