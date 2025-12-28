-- =====================================================
-- Migration: Add Entra ID columns to hospitals and users
-- =====================================================
-- This migration adds entra_tenant_id and entra_oid columns
-- needed for Microsoft Entra ID authentication

-- Check if columns already exist before adding them

-- Add entra_tenant_id to hospitals if it doesn't exist
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'hospitals' AND COLUMN_NAME = 'entra_tenant_id')
BEGIN
    PRINT 'Adding entra_tenant_id column to hospitals table...';
    ALTER TABLE hospitals 
    ADD entra_tenant_id NVARCHAR(255);
    
    PRINT '✓ entra_tenant_id column added to hospitals';
    
    -- Copy tenant_id to entra_tenant_id for existing records
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'hospitals' AND COLUMN_NAME = 'tenant_id')
    BEGIN
        UPDATE hospitals 
        SET entra_tenant_id = tenant_id 
        WHERE entra_tenant_id IS NULL;
        PRINT '✓ Copied tenant_id values to entra_tenant_id';
    END
END
ELSE
BEGIN
    PRINT '✓ entra_tenant_id column already exists in hospitals';
END

-- Add entra_oid to users if it doesn't exist
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'entra_oid')
BEGIN
    PRINT 'Adding entra_oid column to users table...';
    ALTER TABLE users 
    ADD entra_oid NVARCHAR(255);
    
    PRINT '✓ entra_oid column added to users';
    
    -- Generate temporary GUIDs for existing users (they'll need to re-login)
    UPDATE users 
    SET entra_oid = CAST(NEWID() AS NVARCHAR(255))
    WHERE entra_oid IS NULL;
    PRINT '✓ Generated temporary entra_oid values for existing users';
END
ELSE
BEGIN
    PRINT '✓ entra_oid column already exists in users';
END

PRINT '';
PRINT '✅ Migration complete!';
PRINT '';
PRINT 'Summary:';
PRINT '  - hospitals.entra_tenant_id: Ready';
PRINT '  - users.entra_oid: Ready';
PRINT '';
