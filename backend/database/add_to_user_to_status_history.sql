-- Add to_user column to TicketStatusHistory table
-- This will allow us to track reassignments in the same table as status changes

ALTER TABLE dbo.TicketStatusHistory 
ADD to_user INT NULL;

-- Add foreign key constraint to Person table
ALTER TABLE dbo.TicketStatusHistory 
ADD CONSTRAINT FK_TicketStatusHistory_to_user 
FOREIGN KEY (to_user) REFERENCES dbo.Person(PERSONNO);

-- Add index for better performance
CREATE INDEX IX_TicketStatusHistory_to_user 
ON dbo.TicketStatusHistory (to_user);

-- Update existing records to migrate assignment data from TicketAssignments
-- This will populate the to_user field for assignment-related status changes
UPDATE tsh 
SET to_user = ta.assigned_to
FROM dbo.TicketStatusHistory tsh
INNER JOIN dbo.TicketAssignments ta ON tsh.ticket_id = ta.ticket_id 
WHERE tsh.new_status = 'assigned' 
  AND tsh.changed_at = ta.assigned_at;

-- Add comments to document the new column
EXEC sp_addextendedproperty 
    @name = N'MS_Description',
    @value = N'User ID that the ticket was assigned to (for assignment events)',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE', @level1name = N'TicketStatusHistory',
    @level2type = N'COLUMN', @level2name = N'to_user';
