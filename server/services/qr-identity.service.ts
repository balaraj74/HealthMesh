import crypto from 'crypto';
import sql from 'mssql';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

/**
 * Patient QR Identity Service
 * FHIR R4 compliant, HIPAA-aligned secure QR code generation
 */

interface QRGenerationOptions {
  patientId: string;
  hospitalId: string;
  createdByUserId: string;
  expiryDays?: number; // Optional expiry, null = never expires
}

interface QRValidationResult {
  valid: boolean;
  patientId?: string;
  hospitalId?: string;
  fhirPatientId?: string;
  error?: string;
}

interface ScanAuditData {
  qrCodeId: number;
  patientId: string;
  hospitalId: string;
  scannedByUserId: string;
  scannedByRole: string;
  accessPurpose: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  sessionId?: string;
  requestId?: string;
}

export class PatientQRService {
  private static readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private static readonly TOKEN_VERSION = 'v1';

  /**
   * Get encryption key from environment (must be 32 bytes for AES-256)
   * SECURITY: No default key - must be set in production
   */
  private static getEncryptionKey(): Buffer {
    const key = process.env.QR_ENCRYPTION_KEY;

    if (!key) {
      // In development, generate a warning but allow operation
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  QR_ENCRYPTION_KEY not set - using development key. DO NOT USE IN PRODUCTION!');
        return Buffer.from('dev-only-key-not-for-production!', 'utf8');
      }
      throw new Error('SECURITY: QR_ENCRYPTION_KEY environment variable is required in production');
    }

    if (key.length < 32) {
      throw new Error('SECURITY: QR_ENCRYPTION_KEY must be at least 32 characters');
    }

    // Ensure key is exactly 32 bytes
    return Buffer.from(key.slice(0, 32), 'utf8');
  }

  /**
   * Generate FHIR R4 compliant Patient ID
   */
  private static generateFHIRPatientId(hospitalId: string, patientId: string): string {
    // Format: FHIR-{HOSPITAL_ID_SHORT}-{UUID}
    // This ensures global uniqueness across the system
    const uniqueId = uuidv4();
    const hospitalIdShort = hospitalId.slice(0, 8);
    return `FHIR-${hospitalIdShort}-${uniqueId}`;
  }

  /**
   * Generate Master Patient Identifier (MPI)
   */
  private static generateMPI(hospitalId: string, patientId: string): string {
    // Format: MPI-{HOSPITAL_SHORT}-{PATIENT_SHORT}-{CHECKSUM}
    const hospitalShort = hospitalId.slice(0, 8);
    const patientShort = patientId.slice(0, 8);
    const base = `${hospitalShort}-${patientShort}`;
    const checksum = crypto
      .createHash('sha256')
      .update(`${hospitalId}-${patientId}`)
      .digest('hex')
      .slice(0, 8);
    return `MPI-${base}-${checksum}`;
  }

  /**
   * Encrypt patient data into secure token
   * Token contains: version|patientId|hospitalId|fhirId|timestamp|nonce
   * NO PHI is included - only identifiers for lookup
   */
  private static encryptToken(data: {
    patientId: string;
    hospitalId: string;
    fhirPatientId: string;
    timestamp: number;
  }): { encrypted: string; iv: string; authTag: string } {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(this.ENCRYPTION_ALGORITHM, key, iv);

    // Create payload (no PHI - only identifiers)
    const payload = JSON.stringify({
      v: this.TOKEN_VERSION,
      pid: data.patientId,
      hid: data.hospitalId,
      fid: data.fhirPatientId,
      ts: data.timestamp,
      nonce: crypto.randomBytes(8).toString('hex')
    });

    let encrypted = cipher.update(payload, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt and validate token
   */
  private static decryptToken(encrypted: string, iv: string, authTag: string): any {
    try {
      const key = this.getEncryptionKey();
      const decipher = crypto.createDecipheriv(
        this.ENCRYPTION_ALGORITHM,
        key,
        Buffer.from(iv, 'hex')
      );

      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error('Token decryption failed - invalid or tampered token');
    }
  }

  /**
   * Generate hash for database lookup (prevents timing attacks)
   */
  private static hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }

  /**
   * Validate input parameters
   */
  private static validateInput(params: Record<string, any>): void {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') {
        throw new Error(`Invalid parameter: ${key} is required`);
      }
      if (typeof value === 'string' && value.length > 1000) {
        throw new Error(`Invalid parameter: ${key} exceeds maximum length`);
      }
    }
  }

  /**
   * Generate QR code for patient
   * SECURITY: QR token is not stored - only the hash for validation
   */
  static async generatePatientQR(
    pool: sql.ConnectionPool,
    options: QRGenerationOptions
  ): Promise<{
    qrCodeId: number;
    fhirPatientId: string;
    mpi: string;
    qrToken: string;
    qrImageDataUrl: string;
  }> {
    const { patientId, hospitalId, createdByUserId, expiryDays } = options;

    // Input validation
    this.validateInput({ patientId, hospitalId, createdByUserId });

    // Generate FHIR ID and MPI
    const fhirPatientId = this.generateFHIRPatientId(hospitalId, patientId);
    const mpi = this.generateMPI(hospitalId, patientId);

    // Create encrypted token
    const timestamp = Date.now();
    const { encrypted, iv, authTag } = this.encryptToken({
      patientId,
      hospitalId,
      fhirPatientId,
      timestamp
    });

    // Combine into single token string
    const qrToken = `${this.TOKEN_VERSION}:${encrypted}:${iv}:${authTag}`;
    const qrTokenHash = this.hashToken(qrToken);

    // Calculate expiry
    const expiresAt = expiryDays
      ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
      : null;

    // Generate QR code image (data URL)
    const qrImageDataUrl = await QRCode.toDataURL(qrToken, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 400,
      margin: 2,
      color: {
        dark: '#1e293b',  // Professional dark color matching HealthMesh theme
        light: '#ffffff'
      }
    });

    // Store in database - SECURITY: Do NOT store raw token, only hash
    const result = await pool.request()
      .input('patient_id', sql.NVarChar, patientId)
      .input('hospital_id', sql.NVarChar, hospitalId)
      .input('fhir_patient_id', sql.NVarChar, fhirPatientId)
      .input('master_patient_identifier', sql.NVarChar, mpi)
      .input('qr_token', sql.NVarChar, '[REDACTED]') // Never store raw token
      .input('qr_token_hash', sql.NVarChar, qrTokenHash)
      .input('token_expires_at', sql.DateTime2, expiresAt)
      .input('created_by_user_id', sql.NVarChar, createdByUserId)
      .query(`
        INSERT INTO patient_qr_codes (
          patient_id, hospital_id, fhir_patient_id, master_patient_identifier,
          qr_token, qr_token_hash, token_expires_at, created_by_user_id
        )
        OUTPUT INSERTED.id
        VALUES (
          @patient_id, @hospital_id, @fhir_patient_id, @master_patient_identifier,
          @qr_token, @qr_token_hash, @token_expires_at, @created_by_user_id
        )
      `);

    const qrCodeId = result.recordset[0].id;

    return {
      qrCodeId,
      fhirPatientId,
      mpi,
      qrToken,
      qrImageDataUrl
    };
  }

  /**
   * Validate and lookup patient by QR token
   */
  static async validateQRToken(
    pool: sql.ConnectionPool,
    qrToken: string
  ): Promise<QRValidationResult> {
    try {
      // Input validation - prevent injection and DoS
      if (!qrToken || typeof qrToken !== 'string') {
        return { valid: false, error: 'Token is required' };
      }

      if (qrToken.length > 2000) {
        return { valid: false, error: 'Invalid token length' };
      }

      // Parse token
      const parts = qrToken.split(':');
      if (parts.length !== 4 || parts[0] !== this.TOKEN_VERSION) {
        return { valid: false, error: 'Invalid token format' };
      }

      const [version, encrypted, iv, authTag] = parts;

      // Validate hex format to prevent injection
      const hexRegex = /^[a-fA-F0-9]+$/;
      if (!hexRegex.test(encrypted) || !hexRegex.test(iv) || !hexRegex.test(authTag)) {
        return { valid: false, error: 'Invalid token encoding' };
      }

      // Decrypt token
      const payload = this.decryptToken(encrypted, iv, authTag);

      // Lookup in database
      const qrTokenHash = this.hashToken(qrToken);
      const result = await pool.request()
        .input('qr_token_hash', sql.NVarChar, qrTokenHash)
        .query(`
          SELECT 
            id, patient_id, hospital_id, fhir_patient_id,
            is_active, token_expires_at, revoked_at
          FROM patient_qr_codes
          WHERE qr_token_hash = @qr_token_hash
        `);

      if (result.recordset.length === 0) {
        return { valid: false, error: 'QR code not found' };
      }

      const qrRecord = result.recordset[0];

      // Check if revoked
      if (qrRecord.revoked_at) {
        return { valid: false, error: 'QR code has been revoked' };
      }

      // Check if active
      if (!qrRecord.is_active) {
        return { valid: false, error: 'QR code is inactive' };
      }

      // Check expiry
      if (qrRecord.token_expires_at && new Date(qrRecord.token_expires_at) < new Date()) {
        return { valid: false, error: 'QR code has expired' };
      }

      // Verify payload matches database
      if (
        payload.pid !== qrRecord.patient_id ||
        payload.hid !== qrRecord.hospital_id ||
        payload.fid !== qrRecord.fhir_patient_id
      ) {
        return { valid: false, error: 'Token data mismatch - possible tampering' };
      }

      return {
        valid: true,
        patientId: qrRecord.patient_id,
        hospitalId: qrRecord.hospital_id,
        fhirPatientId: qrRecord.fhir_patient_id
      };
    } catch (error: any) {
      // SECURITY: Don't expose internal error details
      console.error('[QR] Token validation error:', error.message);
      return { valid: false, error: 'Token validation failed' };
    }
  }

  /**
   * Log QR scan for audit trail (HIPAA compliance)
   */
  static async logQRScan(
    pool: sql.ConnectionPool,
    data: ScanAuditData,
    accessGranted: boolean,
    denialReason?: string
  ): Promise<void> {
    await pool.request()
      .input('qr_code_id', sql.Int, data.qrCodeId)
      .input('patient_id', sql.NVarChar, data.patientId)
      .input('hospital_id', sql.NVarChar, data.hospitalId)
      .input('scanned_by_user_id', sql.NVarChar, data.scannedByUserId)
      .input('scanned_by_role', sql.NVarChar, data.scannedByRole)
      .input('access_purpose', sql.NVarChar, data.accessPurpose)
      .input('access_granted', sql.Bit, accessGranted)
      .input('denial_reason', sql.NVarChar, denialReason || null)
      .input('ip_address', sql.NVarChar, data.ipAddress || null)
      .input('user_agent', sql.NVarChar, data.userAgent || null)
      .input('device_type', sql.NVarChar, data.deviceType || null)
      .input('session_id', sql.NVarChar, data.sessionId || null)
      .input('request_id', sql.NVarChar, data.requestId || null)
      .query(`
        INSERT INTO qr_scan_audit (
          qr_code_id, patient_id, hospital_id, scanned_by_user_id, scanned_by_role,
          access_purpose, access_granted, denial_reason, ip_address, user_agent,
          device_type, session_id, request_id
        )
        VALUES (
          @qr_code_id, @patient_id, @hospital_id, @scanned_by_user_id, @scanned_by_role,
          @access_purpose, @access_granted, @denial_reason, @ip_address, @user_agent,
          @device_type, @session_id, @request_id
        )
      `);
  }

  /**
   * Revoke QR code (e.g., patient record merged, security incident)
   */
  static async revokeQRCode(
    pool: sql.ConnectionPool,
    qrCodeId: number,
    revokedByUserId: string,
    reason: string
  ): Promise<void> {
    await pool.request()
      .input('qr_code_id', sql.Int, qrCodeId)
      .input('revoked_by_user_id', sql.NVarChar, revokedByUserId)
      .input('revocation_reason', sql.NVarChar, reason)
      .query(`
        UPDATE patient_qr_codes
        SET 
          is_active = 0,
          revoked_at = GETUTCDATE(),
          revoked_by_user_id = @revoked_by_user_id,
          revocation_reason = @revocation_reason,
          updated_at = GETUTCDATE()
        WHERE id = @qr_code_id
      `);
  }

  /**
   * Get QR code by patient ID
   */
  static async getPatientQRCode(
    pool: sql.ConnectionPool,
    patientId: string,
    hospitalId: string
  ): Promise<any | null> {
    const result = await pool.request()
      .input('patient_id', sql.NVarChar, patientId)
      .input('hospital_id', sql.NVarChar, hospitalId)
      .query(`
        SELECT 
          id, fhir_patient_id, master_patient_identifier,
          qr_token, is_active, token_expires_at, created_at
        FROM patient_qr_codes
        WHERE patient_id = @patient_id 
          AND hospital_id = @hospital_id
          AND is_active = 1
          AND revoked_at IS NULL
        ORDER BY created_at DESC
      `);

    return result.recordset[0] || null;
  }
}
