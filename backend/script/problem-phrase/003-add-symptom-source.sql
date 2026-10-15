-- Add symptom_source to IgxTicketProblem (title | failure_mode)
-- Database: Cedar6_Mars (dbConfig / EDEN app DB)
-- Run via: node backend/script/problem-phrase/run-problem-phrase-migrations.js

IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'IgxTicketProblem')
  AND NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.IgxTicketProblem')
      AND name = 'symptom_source'
  )
BEGIN
  ALTER TABLE dbo.IgxTicketProblem
    ADD symptom_source NVARCHAR(20) NULL;
  PRINT 'Added IgxTicketProblem.symptom_source.';
END
ELSE
BEGIN
  PRINT 'IgxTicketProblem.symptom_source already present or table missing.';
END
GO
