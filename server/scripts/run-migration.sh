#!/bin/bash
# Run Production Database Migration via Azure CLI

SERVER="healthmeshdevsql23qydhgf"
DATABASE="healthmesh"
ADMIN_USER="healthmeshadmin"
ADMIN_PASS="HealthMesh@2025!"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║       RUNNING PRODUCTION DATABASE MIGRATION                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Individual ALTER TABLE statements (can't use GO with Azure CLI)
echo "[1/9] Adding ai_analysis column..."
az sql db execute \
  --server "$SERVER" \
  --database "$DATABASE" \
  --admin-user "$ADMIN_USER" \
  --admin-password "$ADMIN_PASS" \
  --query-text "IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cases' AND COLUMN_NAME = 'ai_analysis') BEGIN ALTER TABLE cases ADD ai_analysis NVARCHAR(MAX); END" \
  2>&1 | grep -v "WARNING\|Command group"

echo "[2/9] Adding summary column..."
az sql db execute \
  --server "$SERVER" \
  --database "$DATABASE" \
  --admin-user "$ADMIN_USER" \
  --admin-password "$ADMIN_PASS" \
  --query-text "IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cases' AND COLUMN_NAME = 'summary') BEGIN ALTER TABLE cases ADD summary NVARCHAR(MAX); END" \
  2>&1 | grep -v "WARNING\|Command group"

echo "[3/9] Adding clinical_question column..."
az sql db execute \
  --server "$SERVER" \
  --database "$DATABASE" \
  --admin-user "$ADMIN_USER" \
  --admin-password "$ADMIN_PASS" \
  --query-text "IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cases' AND COLUMN_NAME = 'clinical_question') BEGIN ALTER TABLE cases ADD clinical_question NVARCHAR(MAX); END" \
  2>&1 | grep -v "WARNING\|Command group"

echo "[4/9] Adding case_type column..."
az sql db execute \
  --server "$SERVER" \
  --database "$DATABASE" \
  --admin-user "$ADMIN_USER" \
  --admin-password "$ADMIN_PASS" \
  --query-text "IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cases' AND COLUMN_NAME = 'case_type') BEGIN ALTER TABLE cases ADD case_type NVARCHAR(100) DEFAULT 'general'; END" \
  2>&1 | grep -v "WARNING\|Command group"

echo "[5/9] Adding hospital_id column..."
az sql db execute \
  --server "$SERVER" \
  --database "$DATABASE" \
  --admin-user "$ADMIN_USER" \
  --admin-password "$ADMIN_PASS" \
  --query-text "IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cases' AND COLUMN_NAME = 'hospital_id') BEGIN ALTER TABLE cases ADD hospital_id UNIQUEIDENTIFIER; END" \
  2>&1 | grep -v "WARNING\|Command group"

echo "[6/9] Adding patient_id column..."
az sql db execute \
  --server "$SERVER" \
  --database "$DATABASE" \
  --admin-user "$ADMIN_USER" \
  --admin-password "$ADMIN_PASS" \
  --query-text "IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cases' AND COLUMN_NAME = 'patient_id') BEGIN ALTER TABLE cases ADD patient_id UNIQUEIDENTIFIER; END" \
  2>&1 | grep -v "WARNING\|Command group"

echo "[7/9] Adding status column..."
az sql db execute \
  --server "$SERVER" \
  --database "$DATABASE" \
  --admin-user "$ADMIN_USER" \
  --admin-password "$ADMIN_PASS" \
  --query-text "IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cases' AND COLUMN_NAME = 'status') BEGIN ALTER TABLE cases ADD status NVARCHAR(50) DEFAULT 'active'; END" \
  2>&1 | grep -v "WARNING\|Command group"

echo "[8/9] Adding priority column..."
az sql db execute \
  --server "$SERVER" \
  --database "$DATABASE" \
  --admin-user "$ADMIN_USER" \
  --admin-password "$ADMIN_PASS" \
  --query-text "IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cases' AND COLUMN_NAME = 'priority') BEGIN ALTER TABLE cases ADD priority NVARCHAR(50) DEFAULT 'medium'; END" \
  2>&1 | grep -v "WARNING\|Command group"

echo "[9/9] Adding description column..."
az sql db execute \
  --server "$SERVER" \
  --database "$DATABASE" \
  --admin-user "$ADMIN_USER" \
  --admin-password "$ADMIN_PASS" \
  --query-text "IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cases' AND COLUMN_NAME = 'description') BEGIN ALTER TABLE cases ADD description NVARCHAR(MAX); END" \
  2>&1 | grep -v "WARNING\|Command group"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║       MIGRATION COMPLETED                                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
