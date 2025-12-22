/**
 * Database Connection - Azure SQL
 * 
 * HealthMesh now uses Azure SQL Database for all data operations.
 * SQLite is no longer used in production.
 */

export { getPool, generateUUID, USE_AZURE_SQL, sql } from "./azure-sql";

// For backward compatibility with Drizzle imports
// These are no longer used but prevent import errors
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "../../db/schema";

const sqlite = new Database("healthmesh.db");
sqlite.pragma("journal_mode = WAL");
export const db = drizzleSqlite(sqlite, { schema });
