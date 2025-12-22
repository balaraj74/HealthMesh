/**
 * Azure SQL Database Connection
 * 
 * This module provides the connection pool for Azure SQL operations.
 * All data access should use this pool for queries.
 */

import sql from "mssql";

const AZURE_SQL_CONNECTION_STRING = process.env.AZURE_SQL_CONNECTION_STRING || "";

function parseConnectionString(connStr: string): sql.config | null {
    if (!connStr || connStr.includes("{your_password}")) return null;

    try {
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
            options: {
                encrypt: true,
                trustServerCertificate: false,
            },
            pool: {
                max: 10,
                min: 0,
                idleTimeoutMillis: 30000
            }
        };
    } catch (error) {
        console.error("Failed to parse Azure SQL connection string:", error);
        return null;
    }
}

const azureConfig = parseConnectionString(AZURE_SQL_CONNECTION_STRING);
export const USE_AZURE_SQL = azureConfig !== null;

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
    if (!pool) {
        if (!azureConfig) {
            throw new Error("Azure SQL not configured");
        }
        pool = await sql.connect(azureConfig);
        console.log("✅ Azure SQL connection pool established");
    }
    return pool;
}

// Initialize connection on import
if (USE_AZURE_SQL) {
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║ 🔵 Database: Azure SQL Database                            ║");
    console.log(`║ Server: ${azureConfig?.server}`.padEnd(61) + "║");
    console.log(`║ Database: ${azureConfig?.database}`.padEnd(61) + "║");
    console.log("╚════════════════════════════════════════════════════════════╝");

    getPool().catch(err => {
        console.error("❌ Failed to connect to Azure SQL:", err.message);
    });
} else {
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║ ⚠️  Azure SQL NOT configured - check AZURE_SQL_CONNECTION  ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
}

// Helper function to generate UUID
export function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export { sql };
