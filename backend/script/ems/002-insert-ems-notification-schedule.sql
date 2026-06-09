-- EMS Phase 1: notification cron schedule (consumed by emsNotificationJob in Phase 08)
-- Database: Cedar6_Mars (dbConfig)
-- Default: daily at 07:00 server time

IF NOT EXISTS (SELECT 1 FROM dbo.IgxNotificationSchedule WHERE notification_type = 'ems_calibration')
BEGIN
  INSERT INTO dbo.IgxNotificationSchedule (
    notification_type,
    schedule_cron,
    timezone,
    is_enabled,
    description,
    created_at,
    updated_at
  ) VALUES (
    'ems_calibration',
    '0 7 * * *',
    'Asia/Bangkok',
    1,
    N'EMS calibration: 30-day pre-due, daily overdue, 14-day plant manager escalation',
    GETDATE(),
    GETDATE()
  );
  PRINT 'Inserted ems_calibration notification schedule.';
END
ELSE
BEGIN
  PRINT 'ems_calibration notification schedule already exists.';
END
GO
