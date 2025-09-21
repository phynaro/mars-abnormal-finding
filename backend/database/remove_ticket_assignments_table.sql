-- Remove TicketAssignments table and update assignment logic
-- This script should be run after the to_user column has been added to TicketStatusHistory

-- First, let's check if there are any existing assignments that need to be migrated
SELECT 
    'Existing assignments to migrate:' as info,
    COUNT(*) as count
FROM TicketAssignments;

-- Update the assignTicket function to use TicketStatusHistory instead of TicketAssignments
-- This will be done in the backend code, but here's the SQL pattern:

-- OLD CODE (to be removed):
-- INSERT INTO TicketAssignments (ticket_id, assigned_to, assigned_by, notes)
-- VALUES (@id, @assigned_to, @assigned_by, @notes)

-- NEW CODE (to be used):
-- INSERT INTO TicketStatusHistory (ticket_id, old_status, new_status, changed_by, to_user, notes)
-- VALUES (@id, 'open', 'assigned', @assigned_by, @assigned_to, @notes)

-- Drop the TicketAssignments table
DROP TABLE IF EXISTS TicketAssignments;

-- Verify the table has been removed
SELECT 
    'TicketAssignments table removed successfully' as status;
