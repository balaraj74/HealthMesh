/**
 * Add missing columns to lab_reports table
 */
import 'dotenv/config';
import sql from 'mssql';

const connectionString = process.env.AZURE_SQL_CONNECTION_STRING || '';

function parseConnectionString(connStr: string): sql.config | null {
    if (!connStr) return null;
    const params: Record<string, string> = {};
    connStr.split(';').forEach(part => {
        const [key, ...valueParts] = part.split('=');
        if (key && valueParts.length) {
            params[key.trim().toLowerCase()] = valueParts.join('=').trim();
        }
    });
    const serverMatch = params['server']?.match(/tcp:(.+),(\d+)/);
    if (!serverMatch) return null;
    return {
        server: serverMatch[1],
        port: parseInt(serverMatch[2]),
        database: params['initial catalog'],
        user: params['user id'],
        password: params['password'],
        options: { encrypt: true, trustServerCertificate: false }
    };
}

async function alterTable() {
    const config = parseConnectionString(connectionString);
    if (!config) {
        console.error('Invalid connection');
        process.exit(1);
    }

    console.log('Connecting to Azure SQL...');
    const pool = await sql.connect(config);
    console.log('Connected!');

    // Add missing columns to lab_reports table
    const alterStatements = [
        "IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'lab_reports' AND COLUMN_NAME = 'file_name') ALTER TABLE lab_reports ADD file_name NVARCHAR(500)",
        "IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'lab_reports' AND COLUMN_NAME = 'file_type') ALTER TABLE lab_reports ADD file_type NVARCHAR(100)",
        "IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'lab_reports' AND COLUMN_NAME = 'extracted_data') ALTER TABLE lab_reports ADD extracted_data NVARCHAR(MAX)",
        "IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'lab_reports' AND COLUMN_NAME = 'raw_text') ALTER TABLE lab_reports ADD raw_text NVARCHAR(MAX)"
    ];

    for (const stmt of alterStatements) {
        try {
            await pool.request().query(stmt);
            const colName = stmt.match(/ADD (\w+)/)?.[1];
            console.log(`✅ Added column: ${colName}`);
        } catch (e: any) {
            console.log('⚠️ ' + e.message);
        }
    }

    // Verify columns exist
    const cols = await pool.request().query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'lab_reports'"
    );
    console.log('\n📋 Lab reports columns:');
    cols.recordset.forEach((r: any) => console.log(`   - ${r.COLUMN_NAME}`));

    await pool.close();
    console.log('\n🎉 Done!');
}

alterTable().catch(console.error);
