-- Per-ticket classification result (part / symptom codes)
-- Database: Cedar6_Mars (dbConfig / EDEN app DB)
-- Run once via: node backend/script/problem-phrase/run-problem-phrase-migrations.js

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'IgxTicketProblem')
BEGIN
  CREATE TABLE dbo.IgxTicketProblem (
    ticket_id      INT NOT NULL,
    part_code      NVARCHAR(50) NULL,
    symptom_code   NVARCHAR(50) NULL,
    side           NVARCHAR(10) NULL,
    station        NVARCHAR(20) NULL,
    classified_at  DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_IgxTicketProblem PRIMARY KEY (ticket_id)
  );
  CREATE INDEX IX_IgxTicketProblem_part_symptom ON dbo.IgxTicketProblem (part_code, symptom_code);
  CREATE INDEX IX_IgxTicketProblem_classified_at ON dbo.IgxTicketProblem (classified_at);
  PRINT 'Created IgxTicketProblem.';
END
ELSE
BEGIN
  PRINT 'IgxTicketProblem already exists.';
END
GO
