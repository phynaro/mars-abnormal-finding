-- Insert review escalation notification schedule
-- Escalates tickets from finished -> review_escalated after 7 days without requester review,
-- then sends notifications to L4 approvers based on PU approval rules.

IF NOT EXISTS (SELECT 1 FROM IgxNotificationSchedule WHERE notification_type = 'review_escalation')
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
    'review_escalation',
    '0 11 * * *',          -- Every day at 11:00
    'Asia/Bangkok',
    1,                     -- is_enabled
    N'Daily check for finished tickets older than 7 days to escalate review to L4',
    GETDATE(),
    GETDATE()
  );
  PRINT 'Inserted review_escalation schedule.';
END
ELSE
BEGIN
  PRINT 'review_escalation schedule already exists.';
END
