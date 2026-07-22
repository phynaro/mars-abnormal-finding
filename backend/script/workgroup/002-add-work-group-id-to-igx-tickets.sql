-- Add nullable work_group_id to IgxTickets (logical FK to IgxWorkGroup)

IF NOT EXISTS (
  SELECT 1
  FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.IgxTickets')
    AND name = 'work_group_id'
)
BEGIN
  ALTER TABLE dbo.IgxTickets ADD work_group_id INT NULL;
  CREATE INDEX IX_IgxTickets_work_group_id ON dbo.IgxTickets (work_group_id);
  PRINT 'Added work_group_id to IgxTickets.';
END
ELSE
BEGIN
  PRINT 'work_group_id column already exists on IgxTickets.';
END
GO
