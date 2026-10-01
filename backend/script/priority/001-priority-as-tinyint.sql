-- Convert IgxTickets.priority from text labels to numeric 1/2/3 (tinyint)

IF EXISTS (
  SELECT 1
  FROM sys.columns c
  JOIN sys.types t ON c.user_type_id = t.user_type_id
  WHERE c.object_id = OBJECT_ID('dbo.IgxTickets')
    AND c.name = 'priority'
    AND t.name = 'tinyint'
)
BEGIN
  PRINT 'IgxTickets.priority is already tinyint.';
END
ELSE
BEGIN
  DECLARE @defaultName SYSNAME;
  SELECT @defaultName = dc.name
  FROM sys.default_constraints dc
  JOIN sys.columns c
    ON c.object_id = dc.parent_object_id
   AND c.column_id = dc.parent_column_id
  WHERE c.object_id = OBJECT_ID('dbo.IgxTickets')
    AND c.name = 'priority';

  IF @defaultName IS NOT NULL
  BEGIN
    EXEC('ALTER TABLE dbo.IgxTickets DROP CONSTRAINT [' + @defaultName + ']');
  END

  UPDATE dbo.IgxTickets
  SET priority = CASE
    WHEN LTRIM(RTRIM(priority)) IN ('1', 'urgent') THEN '1'
    WHEN LTRIM(RTRIM(priority)) IN ('2', 'high') THEN '2'
    WHEN LTRIM(RTRIM(priority)) IN ('3', 'normal', 'low', 'medium') THEN '3'
    ELSE '3'
  END;

  ALTER TABLE dbo.IgxTickets ALTER COLUMN priority TINYINT NOT NULL;
  ALTER TABLE dbo.IgxTickets ADD CONSTRAINT DF_IgxTickets_priority DEFAULT (3) FOR priority;

  PRINT 'Converted IgxTickets.priority to tinyint (1/2/3).';
END
GO
