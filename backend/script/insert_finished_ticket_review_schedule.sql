-- Insert finished ticket review notification schedule
-- Notifies requesters (created_by) to review their tickets with status = 'finished'.
-- Run daily (e.g. 10:00 AM). Execute once to enable the job.

IF NOT EXISTS (SELECT 1 FROM IgxNotificationSchedule WHERE notification_type = 'finished_ticket_review')
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
    'finished_ticket_review',
    '0 10 * * *',          -- Every day at 10:00 (minute hour day month dow)
    NULL,                   -- Use server timezone
    1,                      -- is_enabled
    N'Daily reminder for requesters to review their finished tickets',
    GETDATE(),
    GETDATE()
  );
  PRINT 'Inserted finished_ticket_review schedule.';
END
ELSE
BEGIN
  PRINT 'finished_ticket_review schedule already exists.';
END
