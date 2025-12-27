/**
 * Add tenant_id column to Azure SQL tables
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

async function addTenantIdColumn() {
    const config = parseConnectionString(connectionString);
    if (!config) {
        console.error("❌ Invalid connection string");
        process.exit(1);
    }

    console.log("🔵 Connecting to Azure SQL...");
    const pool = await sql.connect(config);
    console.log("✅ Connected!");

    // Check if tenant_id column exists in users table
    const usersResult = await pool.request().query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'tenant_id'
    `);

    if (usersResult.recordset.length === 0) {
        console.log("Adding tenant_id column to users table...");
        await pool.request().query(`
            ALTER TABLE users ADD tenant_id NVARCHAR(100)
        `);
        console.log("✅ Added tenant_id column to users table");
    } else {
        console.log("✅ tenant_id column already exists in users table");
    }

    // Check if tenant_id column exists in hospitals table
    const hospResult = await pool.request().query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'hospitals' AND COLUMN_NAME = 'tenant_id'
    `);

    if (hospResult.recordset.length === 0) {
        console.log("Adding tenant_id column to hospitals table...");
        await pool.request().query(`
            ALTER TABLE hospitals ADD tenant_id NVARCHAR(100)
        `);
        console.log("✅ Added tenant_id column to hospitals table");
    } else {
        console.log("✅ tenant_id column already exists in hospitals table");
    }

    await pool.close();
    console.log("\n🎉 Done!");
}

addTenantIdColumn().catch(console.error);
