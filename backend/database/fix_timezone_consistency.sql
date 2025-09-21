-- Fix timezone consistency by updating all timestamp fields to use local time
-- This script will standardize all timestamps to use GETDATE() (local time UTC+7)

-- 1. Update existing inconsistent timestamps in Tickets table
-- Fix rejected_at and other workflow timestamps that are in UTC
UPDATE Tickets 
SET rejected_at = DATEADD(hour, 7, rejected_at)
WHERE rejected_at IS NOT NULL 
  AND rejected_at < DATEADD(hour, -6, GETDATE()); -- Only fix timestamps that are clearly UTC

-- 2. Update any other workflow timestamps that might be in UTC
UPDATE Tickets 
SET accepted_at = DATEADD(hour, 7, accepted_at)
WHERE accepted_at IS NOT NULL 
  AND accepted_at < DATEADD(hour, -6, GETDATE());

UPDATE Tickets 
SET completed_at = DATEADD(hour, 7, completed_at)
WHERE completed_at IS NOT NULL 
  AND completed_at < DATEADD(hour, -6, GETDATE());

UPDATE Tickets 
SET escalated_at = DATEADD(hour, 7, escalated_at)
WHERE escalated_at IS NOT NULL 
  AND escalated_at < DATEADD(hour, -6, GETDATE());

UPDATE Tickets 
SET closed_at = DATEADD(hour, 7, closed_at)
WHERE closed_at IS NOT NULL 
  AND closed_at < DATEADD(hour, -6, GETDATE());

UPDATE Tickets 
SET reopened_at = DATEADD(hour, 7, reopened_at)
WHERE reopened_at IS NOT NULL 
  AND reopened_at < DATEADD(hour, -6, GETDATE());

UPDATE Tickets 
SET l3_override_at = DATEADD(hour, 7, l3_override_at)
WHERE l3_override_at IS NOT NULL 
  AND l3_override_at < DATEADD(hour, -6, GETDATE());

-- 3. Update updated_at timestamps that might be in UTC
UPDATE Tickets 
SET updated_at = DATEADD(hour, 7, updated_at)
WHERE updated_at IS NOT NULL 
  AND updated_at < DATEADD(hour, -6, GETDATE());

-- 4. Verify the fix
SELECT 
    'After Fix - Tickets Table' as table_name,
    id,
    ticket_number,
    created_at,
    updated_at,
    accepted_at,
    rejected_at,
    completed_at,
    closed_at
FROM Tickets 
WHERE id = 15;
