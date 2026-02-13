-- Insert due-date reminder notification schedule
-- Notifies assigned users for tickets in "planed" and "in_progress" status
-- when due within 3 days or overdue. Run daily (e.g. 9:00 AM).
-- Execute once to enable the due-date notification job.

IF NOT EXISTS (SELECT 1 FROM IgxNotificationSchedule WHERE notification_type = 'due_date_reminder')
BEGIN
  INSERT INTO IgxNotificationSchedule (
    notification_type,
    schedule_cron,
    timezone,
    is_enabled,
    description,
    created_at,
    updated_at
  ) VALUES (
    'due_date_reminder',
    '0 9 * * *',           -- Every day at 09:00 (minute hour day month dow)
    NULL,                   -- Use server timezone
    1,                      -- is_enabled
    N'Daily reminder for tickets due within 3 days or overdue (planed/in_progress, max 10 per user)',
    GETDATE(),
    GETDATE()
  );
  PRINT 'Inserted due_date_reminder schedule.';
END
ELSE
BEGIN
  PRINT 'due_date_reminder schedule already exists.';
END
