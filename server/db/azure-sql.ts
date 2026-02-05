/**
 * Azure SQL Database Connection
 * 
 * This module provides the connection pool for Azure SQL operations.
 * All data access should use this pool for queries.
 * 
 * IMPORTANT: Includes retry logic for Azure SQL Serverless cold starts.
 * Azure SQL Serverless can take 30-60+ seconds to wake from paused state.
 */

import sql from "mssql";

const AZURE_SQL_CONNECTION_STRING = process.env.AZURE_SQL_CONNECTION_STRING || "";

// Retry configuration for Azure SQL Serverless cold starts
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds
const MAX_RETRY_DELAY = 15000;    // 15 seconds max

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
                // Extended timeouts for Azure SQL Serverless cold starts
                connectTimeout: 60000,  // 60s connection timeout
                requestTimeout: 60000,  // 60s request timeout
            },
            pool: {
                max: 10,
                min: 0,
                idleTimeoutMillis: 30000,
                acquireTimeoutMillis: 60000, // 60s pool acquire timeout
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
let connectionPromise: Promise<sql.ConnectionPool> | null = null;
let isConnecting = false;

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is a transient/retryable error
 */
function isRetryableError(error: any): boolean {
    const message = error?.message?.toLowerCase() || "";
    const code = error?.code?.toLowerCase() || "";
    
    // Azure SQL Serverless cold start errors
    if (message.includes("connection is closed") || 
        message.includes("not open") ||
        message.includes("econnreset") ||
        message.includes("econnrefused") ||
        message.includes("timeout") ||
        message.includes("etimedout") ||
        message.includes("esocket") ||
        message.includes("socket hang up") ||
        message.includes("login failed") ||
        code === "econnreset" ||
        code === "enotopen" ||
        code === "esocket") {
        return true;
    }
    return false;
}

/**
 * Get database connection pool with robust retry logic for Azure SQL Serverless.
 * Handles cold starts which can take 30-60+ seconds.
 */
export async function getPool(): Promise<sql.ConnectionPool> {
    // If pool exists and is connected, return it
    if (pool?.connected) {
        return pool;
    }

    // If another request is already connecting, wait for it
    if (connectionPromise && isConnecting) {
        console.log("⏳ [SQL] Waiting for existing connection attempt...");
        return connectionPromise;
    }

    if (!azureConfig) {
        throw new Error("Azure SQL not configured - check AZURE_SQL_CONNECTION_STRING");
    }

    // Mark that we're connecting and create the promise
    isConnecting = true;
    connectionPromise = connectWithRetry();

    try {
        pool = await connectionPromise;
        return pool;
    } finally {
        isConnecting = false;
        connectionPromise = null;
    }
}

/**
 * Connect to Azure SQL with exponential backoff retry
 */
async function connectWithRetry(): Promise<sql.ConnectionPool> {
    let lastError: Error | null = null;
    let delay = INITIAL_RETRY_DELAY;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            // Close existing broken pool if any
            if (pool) {
                try { 
                    await pool.close(); 
                } catch (e) { 
                    // Ignore close errors 
                }
                pool = null;
            }

            console.log(`🔌 [SQL] Connecting to Azure SQL (Attempt ${attempt}/${MAX_RETRIES})...`);
            
            const newPool = await sql.connect(azureConfig!);
            
            // Verify connection with a simple query
            await newPool.request().query("SELECT 1 as connected");
            
            console.log("✅ [SQL] Azure SQL connection pool established successfully");
            return newPool;
            
        } catch (error: any) {
            lastError = error;
            console.warn(`⚠️ [SQL] Connection attempt ${attempt} failed: ${error.message}`);

            if (attempt < MAX_RETRIES && isRetryableError(error)) {
                console.log(`⏳ [SQL] Retrying in ${delay}ms... (Azure SQL Serverless may be waking up)`);
                await sleep(delay);
                
                // Exponential backoff with cap
                delay = Math.min(delay * 1.5, MAX_RETRY_DELAY);
            }
        }
    }

    // All retries exhausted
    console.error("❌ [SQL] Failed to connect after all retries");
    throw new Error(`Azure SQL connection failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
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
