/**
 * Create QR Identity tables in Azure SQL
 */
import "dotenv/config";
import sql from "mssql";

const connectionString = process.env.AZURE_SQL_CONNECTION_STRING || "";

function parseConnectionString(connStr: string): sql.config | null {
    if (!connStr) return null;

    const params: Record<string, string> = {};
    connStr.split(";").forEach(part => {
        const [key, ...valueParts] = part.split("=");
        if (key && valueParts.length) {
            params[key.trim().toLowerCase()] = valueParts.join("=").trim();
        }
    });

    const serverMatch = params["server"]?.match(/tcp:(.+),(\d+)/);
    if (!serverMatch) return null;

    return {
        server: serverMatch[1],
        port: parseInt(serverMatch[2]),
        database: params["initial catalog"],
        user: params["user id"],
        password: params["password"],
        options: { encrypt: true, trustServerCertificate: false }
    };
}

async function createQRTables() {
    const config = parseConnectionString(connectionString);
    if (!config) {
        console.error("❌ Invalid connection string");
        process.exit(1);
    }

    console.log("🔵 Connecting to Azure SQL...");
    const pool = await sql.connect(config);
    console.log("✅ Connected!");

    const tables = [
        {
            name: "patient_qr_codes",
            sql: `
                CREATE TABLE patient_qr_codes (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    patient_id NVARCHAR(100) NOT NULL,
                    hospital_id NVARCHAR(100) NOT NULL,
                    fhir_patient_id NVARCHAR(255) NOT NULL,
                    master_patient_identifier NVARCHAR(255) NOT NULL,
                    qr_token NVARCHAR(1000) NOT NULL,
                    qr_token_hash NVARCHAR(255) NOT NULL,
                    qr_image_url NVARCHAR(1000),
                    token_issued_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                    token_expires_at DATETIME2,
                    is_active BIT NOT NULL DEFAULT 1,
                    revocation_reason NVARCHAR(500),
                    revoked_at DATETIME2,
                    revoked_by_user_id NVARCHAR(100),
                    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                    created_by_user_id NVARCHAR(100) NOT NULL,
                    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
                )
            `
        },
        {
            name: "qr_scan_audit",
            sql: `
                CREATE TABLE qr_scan_audit (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    qr_code_id INT NOT NULL,
                    patient_id NVARCHAR(100) NOT NULL,
                    hospital_id NVARCHAR(100) NOT NULL,
                    scanned_by_user_id NVARCHAR(100) NOT NULL,
                    scanned_by_role NVARCHAR(100),
                    scan_timestamp DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                    access_purpose NVARCHAR(500),
                    access_granted BIT NOT NULL,
                    denial_reason NVARCHAR(500),
                    ip_address NVARCHAR(100),
                    user_agent NVARCHAR(500),
                    device_type NVARCHAR(100),
                    location_data NVARCHAR(500),
                    session_id NVARCHAR(255),
                    request_id NVARCHAR(255),
                    data_views NVARCHAR(MAX),
                    export_performed BIT DEFAULT 0,
                    print_performed BIT DEFAULT 0
                )
            `
        },
        {
            name: "patient_medications_qr",
            sql: `
                CREATE TABLE patient_medications_qr (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    patient_id NVARCHAR(100) NOT NULL,
                    hospital_id NVARCHAR(100) NOT NULL,
                    medication_name NVARCHAR(255) NOT NULL,
                    dosage NVARCHAR(100),
                    frequency NVARCHAR(100),
                    route NVARCHAR(50),
                    prescriber NVARCHAR(255),
                    start_date DATETIME2,
                    end_date DATETIME2,
                    status NVARCHAR(50) DEFAULT 'active',
                    notes NVARCHAR(MAX),
                    created_at DATETIME2 DEFAULT GETUTCDATE()
                )
            `
        },
        {
            name: "lab_results_qr",
            sql: `
                CREATE TABLE lab_results_qr (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    patient_id NVARCHAR(100) NOT NULL,
                    hospital_id NVARCHAR(100) NOT NULL,
                    test_name NVARCHAR(255) NOT NULL,
                    test_code NVARCHAR(100),
                    value NVARCHAR(255),
                    unit NVARCHAR(50),
                    reference_range NVARCHAR(100),
                    status NVARCHAR(50),
                    collected_at DATETIME2,
                    result_at DATETIME2,
                    created_at DATETIME2 DEFAULT GETUTCDATE()
                )
            `
        },
        {
            name: "patient_allergies_qr",
            sql: `
                CREATE TABLE patient_allergies_qr (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    patient_id NVARCHAR(100) NOT NULL,
                    hospital_id NVARCHAR(100) NOT NULL,
                    substance NVARCHAR(255) NOT NULL,
                    reaction NVARCHAR(500),
                    severity NVARCHAR(50),
                    status NVARCHAR(50) DEFAULT 'active',
                    onset_date DATETIME2,
                    created_at DATETIME2 DEFAULT GETUTCDATE()
                )
            `
        },
        {
            name: "patient_conditions_qr",
            sql: `
                CREATE TABLE patient_conditions_qr (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    patient_id NVARCHAR(100) NOT NULL,
                    hospital_id NVARCHAR(100) NOT NULL,
                    condition_name NVARCHAR(255) NOT NULL,
                    icd_code NVARCHAR(50),
                    status NVARCHAR(50) DEFAULT 'active',
                    onset_date DATETIME2,
                    abatement_date DATETIME2,
                    severity NVARCHAR(50),
                    created_at DATETIME2 DEFAULT GETUTCDATE()
                )
            `
        },
        {
            name: "ai_clinical_insights",
            sql: `
                CREATE TABLE ai_clinical_insights (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    patient_id NVARCHAR(100) NOT NULL,
                    hospital_id NVARCHAR(100) NOT NULL,
                    insight_type NVARCHAR(100) NOT NULL,
                    title NVARCHAR(255) NOT NULL,
                    description NVARCHAR(MAX),
                    severity NVARCHAR(50),
                    confidence FLOAT,
                    ai_model NVARCHAR(100),
                    related_data NVARCHAR(MAX),
                    generated_at DATETIME2 DEFAULT GETUTCDATE(),
                    is_active BIT DEFAULT 1
                )
            `
        }
    ];

    for (const table of tables) {
        try {
            const exists = await pool.request().query(`
                SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_NAME = '${table.name}'
            `);

            if (exists.recordset.length > 0) {
                console.log(`⚠️  Table ${table.name} already exists, skipping...`);
            } else {
                await pool.request().query(table.sql);
                console.log(`✅ Created table: ${table.name}`);
            }
        } catch (error: any) {
            console.error(`❌ Failed to create ${table.name}:`, error.message);
        }
    }

    // Create indexes
    console.log("\nCreating indexes...");
    const indexes = [
        { table: "patient_qr_codes", sql: "CREATE INDEX IX_QR_PatientId ON patient_qr_codes(patient_id)" },
        { table: "patient_qr_codes", sql: "CREATE INDEX IX_QR_TokenHash ON patient_qr_codes(qr_token_hash)" },
        { table: "qr_scan_audit", sql: "CREATE INDEX IX_ScanAudit_PatientId ON qr_scan_audit(patient_id)" }
    ];

    for (const index of indexes) {
        try {
            await pool.request().query(index.sql);
            console.log(`✅ Created index on ${index.table}`);
        } catch (error: any) {
            if (error.message.includes("already exists")) {
                console.log(`⚠️  Index already exists on ${index.table}`);
            } else {
                console.log(`⚠️  ${error.message}`);
            }
        }
    }

    await pool.close();
    console.log("\n🎉 QR tables setup complete!");
}

createQRTables().catch(console.error);
