#!/usr/bin/env python3
"""
Run Production Database Migration using pyodbc
"""
import pyodbc
import os

SERVER = 'healthmeshdevsql23qydhgf.database.windows.net'
DATABASE = 'healthmesh'
USERNAME = 'healthmeshadmin'
PASSWORD = 'HealthMesh@2025!'

SQL_FILE = '/home/balaraj/HealthMesh/server/db/migrations/fix-production-schema.sql'

print("╔════════════════════════════════════════════════════════════╗")
print("║       RUNNING PRODUCTION DATABASE MIGRATION                ║")
print("╚════════════════════════════════════════════════════════════╝\n")

try:
    # Connection string
    conn_str = (
        f'DRIVER={{ODBC Driver 18 for SQL Server}};'
        f'SERVER={SERVER};'
        f'DATABASE={DATABASE};'
        f'UID={USERNAME};'
        f'PWD={PASSWORD};'
        f'Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;'
    )
    
    print(f"Connecting to: {SERVER}/{DATABASE}...")
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    # Read SQL file
    with open(SQL_FILE, 'r') as f:
        sql_content = f.read()
    
    # Split by GO and execute each batch
    batches = [b.strip() for b in sql_content.split('GO') if b.strip()]
    
    print(f"\nExecuting {len(batches)} SQL batches...\n")
    
    for i, batch in enumerate(batches, 1):
        if not batch or batch.startswith('--'):
            continue
        
        print(f"[{i}/{len(batches)}] Executing batch...")
        try:
            cursor.execute(batch)
            # Try to fetch print messages
            while cursor.nextset():
                pass
            conn.commit()
            print(f"✅ Batch {i} completed")
        except Exception as e:
            print(f"⚠️  Batch {i} error: {str(e)}")
            conn.rollback()
    
    cursor.close()
    conn.close()
    
    print("\n╔════════════════════════════════════════════════════════════╗")
    print("║       MIGRATION COMPLETED                                  ║")
    print("╚════════════════════════════════════════════════════════════╝\n")
    print("Next step: Restart the app service:")
    print("  az webapp restart --name healthmesh-dev-app --resource-group healthmesh-test\n")
    
except ImportError:
    print("❌ pyodbc not installed.")
    print("\nInstall with: pip install pyodbc")
    print("\nOr use Azure Portal Query Editor:")
    print("1. Go to: https://portal.azure.com")
    print("2. Find SQL Database: healthmesh (server: healthmeshdevsql23qydhgf)")
    print("3. Click 'Query editor' in left menu")
    print("4. Login with: healthmeshadmin / HealthMesh@2025!")
    print(f"5. Copy and paste SQL from: {SQL_FILE}")
    print("6. Click 'Run'\n")
except Exception as e:
    print(f"❌ Error: {str(e)}")
    print("\nFalling back to Azure Portal instructions:")
    print("1. Go to: https://portal.azure.com")
    print("2. Find SQL Database: healthmesh")
    print("3. Use Query editor to run the migration")
    print(f"4. SQL file: {SQL_FILE}\n")
