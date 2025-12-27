import crypto from 'crypto';
import Database from 'better-sqlite3';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

/**
 * Patient QR Identity Service - SQLite Version
 * FHIR R4 compliant, HIPAA-aligned secure QR code generation
 * Works with local SQLite database for development
 */

// Initialize SQLite database
const dbPath = path.join(process.cwd(), 'healthmesh.db');
let db: Database.Database;

function getDb(): Database.Database {
    if (!db) {
        db = new Database(dbPath);
        db.pragma('journal_mode = WAL');
        initializeQRTables();
    }
    return db;
}

function initializeQRTables() {
    const database = db;

    // Create patient_qr_codes table
    database.exec(`
    CREATE TABLE IF NOT EXISTS patient_qr_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      hospital_id INTEGER NOT NULL DEFAULT 1,
      fhir_patient_id TEXT NOT NULL UNIQUE,
      master_patient_identifier TEXT NOT NULL UNIQUE,
      qr_token TEXT NOT NULL UNIQUE,
      qr_token_hash TEXT NOT NULL UNIQUE,
      token_issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      token_expires_at DATETIME,
      is_active INTEGER DEFAULT 1,
      revocation_reason TEXT,
      revoked_at DATETIME,
      revoked_by_user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by_user_id INTEGER NOT NULL DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Create qr_scan_audit table
    database.exec(`
    CREATE TABLE IF NOT EXISTS qr_scan_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qr_code_id INTEGER NOT NULL,
      patient_id INTEGER NOT NULL,
      hospital_id INTEGER NOT NULL,
      scanned_by_user_id INTEGER NOT NULL,
      scanned_by_role TEXT,
      scan_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      access_purpose TEXT,
      access_granted INTEGER NOT NULL,
      denial_reason TEXT,
      ip_address TEXT,
      user_agent TEXT,
      device_type TEXT,
      location_data TEXT,
      session_id TEXT,
      request_id TEXT,
      data_views TEXT,
      export_performed INTEGER DEFAULT 0,
      print_performed INTEGER DEFAULT 0
    )
  `);

    // Create patient_medications table if not exists
    database.exec(`
    CREATE TABLE IF NOT EXISTS patient_medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      case_id INTEGER,
      hospital_id INTEGER NOT NULL DEFAULT 1,
      fhir_medication_id TEXT UNIQUE,
      medication_name TEXT NOT NULL,
      medication_code TEXT,
      dosage TEXT,
      route TEXT,
      frequency TEXT,
      prescribed_by_user_id INTEGER NOT NULL DEFAULT 1,
      prescription_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      start_date DATETIME,
      end_date DATETIME,
      status TEXT DEFAULT 'active',
      stop_reason TEXT,
      indication TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Create lab_results table if not exists
    database.exec(`
    CREATE TABLE IF NOT EXISTS lab_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      case_id INTEGER,
      hospital_id INTEGER NOT NULL DEFAULT 1,
      fhir_observation_id TEXT UNIQUE,
      test_name TEXT NOT NULL,
      test_code TEXT,
      category TEXT,
      value TEXT,
      unit TEXT,
      reference_range TEXT,
      interpretation TEXT,
      status TEXT DEFAULT 'final',
      observed_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reported_datetime DATETIME,
      ordered_by_user_id INTEGER,
      performer TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Create patient_allergies table if not exists
    database.exec(`
    CREATE TABLE IF NOT EXISTS patient_allergies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      hospital_id INTEGER NOT NULL DEFAULT 1,
      allergen TEXT NOT NULL,
      allergen_code TEXT,
      category TEXT,
      severity TEXT NOT NULL,
      reaction TEXT,
      onset_date DATETIME,
      status TEXT DEFAULT 'active',
      verified INTEGER DEFAULT 0,
      verified_by_user_id INTEGER,
      verified_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by_user_id INTEGER NOT NULL DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Create patient_conditions table if not exists
    database.exec(`
    CREATE TABLE IF NOT EXISTS patient_conditions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      hospital_id INTEGER NOT NULL DEFAULT 1,
      fhir_condition_id TEXT UNIQUE,
      condition_name TEXT NOT NULL,
      condition_code TEXT,
      category TEXT,
      clinical_status TEXT NOT NULL,
      verification_status TEXT,
      severity TEXT,
      onset_date DATETIME,
      abatement_date DATETIME,
      recorded_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      diagnosed_by_user_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Create ai_clinical_insights table if not exists
    database.exec(`
    CREATE TABLE IF NOT EXISTS ai_clinical_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      hospital_id INTEGER NOT NULL DEFAULT 1,
      insight_type TEXT NOT NULL,
      insight_category TEXT,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      detailed_analysis TEXT,
      confidence_score REAL,
      risk_level TEXT,
      risk_score REAL,
      risk_factors TEXT,
      recommendations TEXT,
      actionable_items TEXT,
      generated_by_model TEXT,
      data_sources TEXT,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed INTEGER DEFAULT 0,
      reviewed_by_user_id INTEGER,
      reviewed_at DATETIME,
      clinician_notes TEXT,
      is_active INTEGER DEFAULT 1,
      dismissed INTEGER DEFAULT 0,
      dismissed_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    console.log('✅ QR Identity tables initialized in SQLite');
}

interface QRGenerationOptions {
    patientId: number | string;
    hospitalId?: number;
    createdByUserId?: number;
    expiryDays?: number;
}

interface QRValidationResult {
    valid: boolean;
    patientId?: number;
    hospitalId?: number;
    fhirPatientId?: string;
    error?: string;
}

interface ScanAuditData {
    qrCodeId: number;
    patientId: number;
    hospitalId: number;
    scannedByUserId: number;
    scannedByRole: string;
    accessPurpose: string;
    ipAddress?: string;
    userAgent?: string;
    deviceType?: string;
    sessionId?: string;
    requestId?: string;
}

export class PatientQRServiceSQLite {
    private static readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
    private static readonly TOKEN_VERSION = 'v1';

    /**
     * Get encryption key (32 bytes for AES-256)
     */
    private static getEncryptionKey(): Buffer {
        const key = process.env.QR_ENCRYPTION_KEY || 'healthmesh-secure-qr-key-32char';
        return Buffer.from(key.padEnd(32, '0').slice(0, 32));
    }

    /**
     * Generate FHIR R4 compliant Patient ID
     */
    private static generateFHIRPatientId(hospitalId: number, patientId: number | string): string {
        const uniqueId = uuidv4();
        return `FHIR-${hospitalId}-${uniqueId}`;
    }

    /**
     * Generate Master Patient Identifier (MPI)
     */
    private static generateMPI(hospitalId: number, patientId: number | string): string {
        const base = `${hospitalId}-${patientId}`;
        const checksum = crypto
            .createHash('sha256')
            .update(base)
            .digest('hex')
            .slice(0, 8);
        return `MPI-${base}-${checksum}`;
    }

    /**
     * Encrypt patient data into secure token
     */
    private static encryptToken(data: {
        patientId: number | string;
        hospitalId: number;
        fhirPatientId: string;
        timestamp: number;
    }): { encrypted: string; iv: string; authTag: string } {
        const key = this.getEncryptionKey();
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv(this.ENCRYPTION_ALGORITHM, key, iv);

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
     * Generate hash for database lookup
     */
    private static hashToken(token: string): string {
        return crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');
    }

    /**
     * Generate QR code for patient
     */
    static async generatePatientQR(options: QRGenerationOptions): Promise<{
        qrCodeId: number;
        fhirPatientId: string;
        mpi: string;
        qrToken: string;
        qrImageDataUrl: string;
    }> {
        const database = getDb();
        const { patientId, hospitalId = 1, createdByUserId = 1, expiryDays } = options;

        // Check if QR already exists for this patient
        const existing = database.prepare(`
      SELECT * FROM patient_qr_codes 
      WHERE patient_id = ? AND hospital_id = ? AND is_active = 1
    `).get(patientId, hospitalId) as any;

        if (existing) {
            // Generate image for existing QR
            const qrImageDataUrl = await QRCode.toDataURL(existing.qr_token, {
                errorCorrectionLevel: 'H',
                type: 'image/png',
                width: 400,
                margin: 2,
                color: {
                    dark: '#1e293b',
                    light: '#ffffff'
                }
            });

            return {
                qrCodeId: existing.id,
                fhirPatientId: existing.fhir_patient_id,
                mpi: existing.master_patient_identifier,
                qrToken: existing.qr_token,
                qrImageDataUrl
            };
        }

        // Generate new QR code
        const fhirPatientId = this.generateFHIRPatientId(hospitalId, patientId);
        const mpi = this.generateMPI(hospitalId, patientId);

        const timestamp = Date.now();
        const { encrypted, iv, authTag } = this.encryptToken({
            patientId,
            hospitalId,
            fhirPatientId,
            timestamp
        });

        const qrToken = `${this.TOKEN_VERSION}:${encrypted}:${iv}:${authTag}`;
        const qrTokenHash = this.hashToken(qrToken);

        const expiresAt = expiryDays
            ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
            : null;

        // Generate QR code image
        const qrImageDataUrl = await QRCode.toDataURL(qrToken, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            width: 400,
            margin: 2,
            color: {
                dark: '#1e293b',
                light: '#ffffff'
            }
        });

        // Store in database
        const result = database.prepare(`
      INSERT INTO patient_qr_codes (
        patient_id, hospital_id, fhir_patient_id, master_patient_identifier,
        qr_token, qr_token_hash, token_expires_at, created_by_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            patientId,
            hospitalId,
            fhirPatientId,
            mpi,
            qrToken,
            qrTokenHash,
            expiresAt,
            createdByUserId
        );

        return {
            qrCodeId: result.lastInsertRowid as number,
            fhirPatientId,
            mpi,
            qrToken,
            qrImageDataUrl
        };
    }

    /**
     * Validate and lookup patient by QR token
     */
    static validateQRToken(qrToken: string): QRValidationResult {
        try {
            const database = getDb();

            // Parse token
            const parts = qrToken.split(':');
            if (parts.length !== 4 || parts[0] !== this.TOKEN_VERSION) {
                return { valid: false, error: 'Invalid token format' };
            }

            const [version, encrypted, iv, authTag] = parts;

            // Decrypt token
            const payload = this.decryptToken(encrypted, iv, authTag);

            // Lookup in database
            const qrTokenHash = this.hashToken(qrToken);
            const qrRecord = database.prepare(`
        SELECT 
          id, patient_id, hospital_id, fhir_patient_id,
          is_active, token_expires_at, revoked_at
        FROM patient_qr_codes
        WHERE qr_token_hash = ?
      `).get(qrTokenHash) as any;

            if (!qrRecord) {
                return { valid: false, error: 'QR code not found' };
            }

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

            return {
                valid: true,
                patientId: qrRecord.patient_id,
                hospitalId: qrRecord.hospital_id,
                fhirPatientId: qrRecord.fhir_patient_id
            };
        } catch (error: any) {
            return { valid: false, error: error.message || 'Token validation failed' };
        }
    }

    /**
     * Log QR scan for audit trail
     */
    static logQRScan(
        data: ScanAuditData,
        accessGranted: boolean,
        denialReason?: string
    ): void {
        const database = getDb();

        database.prepare(`
      INSERT INTO qr_scan_audit (
        qr_code_id, patient_id, hospital_id, scanned_by_user_id, scanned_by_role,
        access_purpose, access_granted, denial_reason, ip_address, user_agent,
        device_type, session_id, request_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            data.qrCodeId,
            data.patientId,
            data.hospitalId,
            data.scannedByUserId,
            data.scannedByRole,
            data.accessPurpose,
            accessGranted ? 1 : 0,
            denialReason || null,
            data.ipAddress || null,
            data.userAgent || null,
            data.deviceType || null,
            data.sessionId || null,
            data.requestId || null
        );
    }

    /**
     * Revoke QR code
     */
    static revokeQRCode(
        qrCodeId: number,
        revokedByUserId: number,
        reason: string
    ): void {
        const database = getDb();

        database.prepare(`
      UPDATE patient_qr_codes
      SET 
        is_active = 0,
        revoked_at = CURRENT_TIMESTAMP,
        revoked_by_user_id = ?,
        revocation_reason = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(revokedByUserId, reason, qrCodeId);
    }

    /**
     * Get QR code by patient ID
     */
    static getPatientQRCode(
        patientId: number | string,
        hospitalId: number = 1
    ): any | null {
        const database = getDb();

        return database.prepare(`
      SELECT 
        id, fhir_patient_id, master_patient_identifier,
        qr_token, is_active, token_expires_at, created_at
      FROM patient_qr_codes
      WHERE patient_id = ? 
        AND hospital_id = ?
        AND is_active = 1
        AND revoked_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `).get(patientId, hospitalId);
    }
}

export default PatientQRServiceSQLite;
