-- Reschedule history for ticket scheduled start and finish.
-- One row per reschedule. A later reschedule-count KPI is COUNT(*) of this table.
-- Database: Cedar (dbConfig)
-- Run via: node backend/script/ticket/run-ticket-schedule-history-migration.js

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'IgxTicketScheduleHistory')
BEGIN
  CREATE TABLE dbo.IgxTicketScheduleHistory (
    id                   INT IDENTITY(1,1) PRIMARY KEY,
    ticket_id            INT NOT NULL,
    old_schedule_start   DATETIME2 NULL,
    new_schedule_start   DATETIME2 NOT NULL,
    old_schedule_finish  DATETIME2 NULL,
    new_schedule_finish  DATETIME2 NOT NULL,
    reason_code          VARCHAR(50) NOT NULL,
    note                 NVARCHAR(500) NULL,
    changed_by           INT NOT NULL,
    changed_at           DATETIME2 NOT NULL CONSTRAINT DF_IgxTicketScheduleHistory_changed_at DEFAULT SYSDATETIME()
  );

  CREATE INDEX IX_IgxTicketScheduleHistory_ticket_changed
    ON dbo.IgxTicketScheduleHistory (ticket_id, changed_at DESC);

  PRINT 'Created IgxTicketScheduleHistory.';
END
ELSE
BEGIN
  PRINT 'IgxTicketScheduleHistory already exists.';
END
GO
