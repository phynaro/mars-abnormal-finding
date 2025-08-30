-- Update existing Tickets table to support new workflow
-- Run this script to add new columns to existing tables

-- Add new columns for escalation and rejection tracking
ALTER TABLE Tickets ADD escalated_to INT;
ALTER TABLE Tickets ADD escalation_reason NVARCHAR(500);
ALTER TABLE Tickets ADD rejection_reason NVARCHAR(500);

-- Add foreign key constraint for escalated_to
ALTER TABLE Tickets ADD CONSTRAINT FK_Tickets_escalated_to 
FOREIGN KEY (escalated_to) REFERENCES Users(id);

-- Update status field length to accommodate new status values
ALTER TABLE Tickets ALTER COLUMN status VARCHAR(50);

-- Update existing status values to match new workflow
UPDATE Tickets SET status = 'in_progress' WHERE status = 'assigned';
UPDATE Tickets SET status = 'completed' WHERE status = 'resolved';

-- Add new indexes for better performance
CREATE INDEX IX_Tickets_EscalatedTo ON Tickets(escalated_to);
CREATE INDEX IX_Tickets_Status_New ON Tickets(status);
