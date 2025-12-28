-- ============================================================================
-- FIX PRODUCTION DATABASE SCHEMA
-- Adds missing columns that exist in code but not in production database
-- ============================================================================

-- Fix cases table - add missing AI and summary columns
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cases' AND COLUMN_NAME = 'ai_analysis')
BEGIN
    ALTER TABLE cases ADD ai_analysis NVARCHAR(MAX);
    PRINT 'Added ai_analysis column to cases table';
END
ELSE
BEGIN
    PRINT 'ai_analysis column already exists';
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cases' AND COLUMN_NAME = 'summary')
BEGIN
    ALTER TABLE cases ADD summary NVARCHAR(MAX);
    PRINT 'Added summary column to cases table';
END
ELSE
BEGIN
    PRINT 'summary column already exists';
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cases' AND COLUMN_NAME = 'clinical_question')
BEGIN
    ALTER TABLE cases ADD clinical_question NVARCHAR(MAX);
    PRINT 'Added clinical_question column to cases table';
END
ELSE
BEGIN
    PRINT 'clinical_question column already exists';
END
GO

-- Add missing case columns if they don't exist
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cases' AND COLUMN_NAME = 'case_type')
BEGIN
    ALTER TABLE cases ADD case_type NVARCHAR(100) DEFAULT 'general';
    PRINT 'Added case_type column to cases table';
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cases' AND COLUMN_NAME = 'hospital_id')
BEGIN
    ALTER TABLE cases ADD hospital_id UNIQUEIDENTIFIER;
    PRINT 'Added hospital_id column to cases table';
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cases' AND COLUMN_NAME = 'patient_id')
BEGIN
    ALTER TABLE cases ADD patient_id UNIQUEIDENTIFIER;
    PRINT 'Added patient_id column to cases table';
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cases' AND COLUMN_NAME = 'status')
BEGIN
    ALTER TABLE cases ADD status NVARCHAR(50) DEFAULT 'active';
    PRINT 'Added status column to cases table';
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cases' AND COLUMN_NAME = 'priority')
BEGIN
    ALTER TABLE cases ADD priority NVARCHAR(50) DEFAULT 'medium';
    PRINT 'Added priority column to cases table';
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cases' AND COLUMN_NAME = 'description')
BEGIN
    ALTER TABLE cases ADD description NVARCHAR(MAX);
    PRINT 'Added description column to cases table';
END
GO

PRINT 'Production schema migration completed successfully!';
