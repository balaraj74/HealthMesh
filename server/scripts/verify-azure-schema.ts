/**
 * Verify Azure SQL Database Schema
 * Run: npx tsx server/scripts/verify-azure-schema.ts
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

async function verifySchema() {
    const config = parseConnectionString(connectionString);
    if (!config) {
        console.error("❌ Invalid connection string");
        process.exit(1);
    }

    console.log("🔵 Connecting to Azure SQL...");
    const pool = await sql.connect(config);
    console.log("✅ Connected!\n");

    console.log("📋 AZURE DATABASE SCHEMA VERIFICATION");
    console.log("=====================================\n");

    // Required tables and their essential columns
    const requiredTables: Record<string, string[]> = {
        'hospitals': ['id', 'entra_tenant_id', 'tenant_id', 'name'],
        'users': ['id', 'hospital_id', 'entra_oid', 'tenant_id', 'email', 'name', 'role'],
        'patients': ['id', 'hospital_id', 'first_name', 'last_name', 'date_of_birth', 'gender', 'mrn'],
        'clinical_cases': ['id', 'hospital_id', 'patient_id', 'case_type', 'chief_complaint', 'diagnosis', 'treatment_plan', 'status', 'priority'],
        'patient_qr_codes': ['id', 'patient_id', 'hospital_id', 'fhir_patient_id', 'master_patient_identifier', 'qr_token', 'is_active'],
        'qr_scan_audit': ['id', 'qr_code_id', 'patient_id', 'hospital_id', 'scanned_by_user_id', 'access_granted'],
        'patient_medications_qr': ['id', 'patient_id', 'hospital_id', 'medication_name'],
        'lab_results_qr': ['id', 'patient_id', 'hospital_id', 'test_name', 'value'],
        'patient_allergies_qr': ['id', 'patient_id', 'hospital_id', 'substance'],
        'patient_conditions_qr': ['id', 'patient_id', 'hospital_id', 'condition_name'],
        'ai_clinical_insights': ['id', 'patient_id', 'hospital_id', 'insight_type', 'title', 'is_active'],
        'audit_logs': ['id', 'hospital_id', 'user_id', 'event_type'],
        'chat_messages': ['id', 'hospital_id', 'user_id', 'role', 'content'],
        'lab_reports': ['id', 'hospital_id', 'patient_id', 'status']
    };

    let allGood = true;

    for (const [table, requiredCols] of Object.entries(requiredTables)) {
        // Check if table exists
        const tableResult = await pool.request()
            .input('tableName', sql.NVarChar, table)
            .query(`SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = @tableName`);

        if (tableResult.recordset.length === 0) {
            console.log(`❌ MISSING TABLE: ${table}`);
            allGood = false;
            continue;
        }

        // Check columns
        const colResult = await pool.request()
            .input('tableName', sql.NVarChar, table)
            .query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tableName`);

        const existingCols = colResult.recordset.map(c => c.COLUMN_NAME);
        const missingCols = requiredCols.filter(c => !existingCols.includes(c));

        if (missingCols.length > 0) {
            console.log(`⚠️  ${table} - Missing columns: ${missingCols.join(', ')}`);
            allGood = false;
        } else {
            console.log(`✅ ${table}`);
        }
    }

    console.log("\n" + (allGood ? "✅ ALL SCHEMA CHECKS PASSED!" : "⚠️  SOME ISSUES FOUND - SEE ABOVE"));

    await pool.close();
}

verifySchema().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
