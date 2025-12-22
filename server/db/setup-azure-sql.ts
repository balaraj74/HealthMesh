/**
 * Azure SQL Database Schema Setup - Simple Version
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

async function setupAzureSQL() {
    const config = parseConnectionString(connectionString);
    if (!config) {
        console.error("❌ Invalid connection string");
        process.exit(1);
    }

    console.log("🔵 Connecting to Azure SQL...");
    const pool = await sql.connect(config);
    console.log("✅ Connected!");

    // Create tables one by one
    const tables = [
        {
            name: "hospitals",
            sql: `
                CREATE TABLE hospitals (
                    id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
                    entra_tenant_id NVARCHAR(100) NOT NULL UNIQUE,
                    name NVARCHAR(255) NOT NULL,
                    domain NVARCHAR(255),
                    settings NVARCHAR(MAX),
                    created_at DATETIME2 DEFAULT GETUTCDATE(),
                    updated_at DATETIME2 DEFAULT GETUTCDATE()
                )
            `
        },
        {
            name: "users",
            sql: `
                CREATE TABLE users (
                    id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
                    hospital_id NVARCHAR(36) NOT NULL,
                    entra_oid NVARCHAR(100) NOT NULL,
                    tenant_id NVARCHAR(100) NOT NULL,
                    email NVARCHAR(255) NOT NULL,
                    name NVARCHAR(255),
                    role NVARCHAR(50) DEFAULT 'doctor',
                    last_login DATETIME2,
                    created_at DATETIME2 DEFAULT GETUTCDATE(),
                    updated_at DATETIME2 DEFAULT GETUTCDATE()
                )
            `
        },
        {
            name: "patients",
            sql: `
                CREATE TABLE patients (
                    id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
                    hospital_id NVARCHAR(36) NOT NULL,
                    fhir_patient_id NVARCHAR(100),
                    first_name NVARCHAR(100) NOT NULL,
                    last_name NVARCHAR(100) NOT NULL,
                    date_of_birth NVARCHAR(20),
                    gender NVARCHAR(20),
                    mrn NVARCHAR(50) NOT NULL,
                    contact_phone NVARCHAR(50),
                    contact_email NVARCHAR(255),
                    demographics NVARCHAR(MAX),
                    diagnoses NVARCHAR(MAX),
                    medications NVARCHAR(MAX),
                    allergies NVARCHAR(MAX),
                    created_by_user_id NVARCHAR(36),
                    created_at DATETIME2 DEFAULT GETUTCDATE(),
                    updated_at DATETIME2 DEFAULT GETUTCDATE()
                )
            `
        },
        {
            name: "cases",
            sql: `
                CREATE TABLE cases (
                    id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
                    hospital_id NVARCHAR(36) NOT NULL,
                    patient_id NVARCHAR(36) NOT NULL,
                    case_type NVARCHAR(100),
                    title NVARCHAR(255),
                    description NVARCHAR(MAX),
                    status NVARCHAR(50) DEFAULT 'active',
                    priority NVARCHAR(50) DEFAULT 'medium',
                    ai_analysis NVARCHAR(MAX),
                    created_by_user_id NVARCHAR(36),
                    created_at DATETIME2 DEFAULT GETUTCDATE(),
                    updated_at DATETIME2 DEFAULT GETUTCDATE()
                )
            `
        },
        {
            name: "lab_reports",
            sql: `
                CREATE TABLE lab_reports (
                    id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
                    hospital_id NVARCHAR(36) NOT NULL,
                    patient_id NVARCHAR(36) NOT NULL,
                    case_id NVARCHAR(36),
                    report_type NVARCHAR(100),
                    report_date DATETIME2,
                    results NVARCHAR(MAX),
                    status NVARCHAR(50) DEFAULT 'pending',
                    ordered_by_user_id NVARCHAR(36),
                    created_at DATETIME2 DEFAULT GETUTCDATE(),
                    updated_at DATETIME2 DEFAULT GETUTCDATE()
                )
            `
        },
        {
            name: "chat_messages",
            sql: `
                CREATE TABLE chat_messages (
                    id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
                    hospital_id NVARCHAR(36) NOT NULL,
                    case_id NVARCHAR(36),
                    user_id NVARCHAR(36),
                    role NVARCHAR(50),
                    content NVARCHAR(MAX),
                    metadata NVARCHAR(MAX),
                    created_at DATETIME2 DEFAULT GETUTCDATE()
                )
            `
        },
        {
            name: "audit_logs",
            sql: `
                CREATE TABLE audit_logs (
                    id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
                    hospital_id NVARCHAR(36) NOT NULL,
                    user_id NVARCHAR(36),
                    entra_oid NVARCHAR(100),
                    event_type NVARCHAR(100) NOT NULL,
                    resource_type NVARCHAR(100),
                    resource_id NVARCHAR(36),
                    action NVARCHAR(100),
                    details NVARCHAR(MAX),
                    ip_address NVARCHAR(50),
                    user_agent NVARCHAR(500),
                    created_at DATETIME2 DEFAULT GETUTCDATE()
                )
            `
        }
    ];

    for (const table of tables) {
        try {
            // Check if table exists
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

    // Verify
    const result = await pool.request().query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME
    `);

    console.log("\n📋 Tables in Azure SQL:");
    result.recordset.forEach((r: any) => console.log(`   ✅ ${r.TABLE_NAME}`));

    await pool.close();
    console.log("\n🎉 Done!");
}

setupAzureSQL().catch(console.error);
