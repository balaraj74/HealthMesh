/**
 * Add ai_analysis and summary columns to clinical_cases table
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

async function addColumns() {
    const config = parseConnectionString(connectionString);
    if (!config) {
        console.error("❌ Invalid connection string");
        process.exit(1);
    }

    console.log("🔵 Connecting to Azure SQL...");
    const pool = await sql.connect(config);
    console.log("✅ Connected!");

    // Check if ai_analysis column exists in clinical_cases
    const checkColumn = await pool.request().query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'clinical_cases' AND COLUMN_NAME = 'ai_analysis'
    `);

    if (checkColumn.recordset.length === 0) {
        console.log("Adding ai_analysis column to clinical_cases...");
        await pool.request().query(`
            ALTER TABLE clinical_cases ADD ai_analysis NVARCHAR(MAX) NULL
        `);
        console.log("✅ Added ai_analysis column");
    } else {
        console.log("⚠️ ai_analysis column already exists");
    }

    // Check if summary column exists
    const checkSummary = await pool.request().query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'clinical_cases' AND COLUMN_NAME = 'summary'
    `);

    if (checkSummary.recordset.length === 0) {
        console.log("Adding summary column to clinical_cases...");
        await pool.request().query(`
            ALTER TABLE clinical_cases ADD summary NVARCHAR(MAX) NULL
        `);
        console.log("✅ Added summary column");
    } else {
        console.log("⚠️ summary column already exists");
    }

    // Show current columns
    const cols = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'clinical_cases'
        ORDER BY ORDINAL_POSITION
    `);
    console.log("\n📋 clinical_cases columns:");
    cols.recordset.forEach((c: any) => console.log(`   - ${c.COLUMN_NAME} (${c.DATA_TYPE})`));

    await pool.close();
    console.log("\n🎉 Done!");
}

addColumns().catch(console.error);
