-- EMS Phase 1: deduplication log for calibration notifications (Phase 08)
-- Database: CEDAR (dbConfigNew / getCedarPool)

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'IgxEmsNotificationLog')
BEGIN
  CREATE TABLE dbo.IgxEmsNotificationLog (
    id INT IDENTITY(1,1) PRIMARY KEY,
    pm_sch_no NVARCHAR(50) NOT NULL,
    notification_rule NVARCHAR(50) NOT NULL,
    recipient_person_no NVARCHAR(50) NOT NULL,
    sent_at DATETIME NOT NULL DEFAULT GETDATE()
  );
  CREATE INDEX IX_IgxEmsNotificationLog_lookup
    ON dbo.IgxEmsNotificationLog (pm_sch_no, notification_rule, recipient_person_no, sent_at);
  PRINT 'Created IgxEmsNotificationLog.';
END
ELSE
BEGIN
  PRINT 'IgxEmsNotificationLog already exists.';
END
GO
