-- Add chat_messages table to Azure SQL Database
-- Run this manually in Azure SQL Query Editor

CREATE TABLE chat_messages (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    hospital_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    case_id UNIQUEIDENTIFIER,
    
    -- Message Details
    role NVARCHAR(50) NOT NULL, -- 'user' or 'assistant'
    content NVARCHAR(MAX) NOT NULL,
    context NVARCHAR(MAX), -- JSON: relevant context
    
    -- Metadata
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (case_id) REFERENCES clinical_cases(id)
);

CREATE INDEX idx_chat_messages_hospital_id ON chat_messages(hospital_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_case_id ON chat_messages(case_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

PRINT 'chat_messages table created successfully!';
