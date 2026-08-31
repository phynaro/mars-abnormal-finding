/*
  After you restore a full CEDAR database that does NOT contain Igx* tables:
  1. Ensure staging DB CEDAR_IgxOnly exists (restore CEDAR_IgxOnly.bak if needed).
  2. Run this script to copy Igx* tables (+ indexes) into CEDAR.

  Does NOT drop existing Igx* tables in CEDAR. If a table already exists, it is skipped.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_ID(N'CEDAR') IS NULL
BEGIN
  RAISERROR('Target database CEDAR not found.', 16, 1);
  RETURN;
END;

IF DB_ID(N'CEDAR_IgxOnly') IS NULL
BEGIN
  RAISERROR('Staging database CEDAR_IgxOnly not found. Restore CEDAR_IgxOnly.bak first.', 16, 1);
  RETURN;
END;

DECLARE @sql nvarchar(max) = N'';

SELECT @sql = @sql + N'
IF OBJECT_ID(''CEDAR.dbo.' + t.name + N''', ''U'') IS NULL
BEGIN
  SELECT * INTO CEDAR.dbo.' + QUOTENAME(t.name) + N'
  FROM CEDAR_IgxOnly.dbo.' + QUOTENAME(t.name) + N';
  PRINT ''Restored ' + t.name + N''';
END
ELSE
  PRINT ''SKIP existing CEDAR.dbo.' + t.name + N''';
'
FROM CEDAR_IgxOnly.sys.tables t
INNER JOIN CEDAR_IgxOnly.sys.schemas s ON t.schema_id = s.schema_id
WHERE s.name = N'dbo'
  AND t.name LIKE N'Igx%'
ORDER BY t.name;

EXEC sp_executesql @sql;
GO

USE CEDAR;
GO

/* Recreate indexes/PKs if missing (same as backup script) */
IF OBJECT_ID(N'dbo.IgxCalibrationUserEvents', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.IgxCalibrationUserEvents') AND type = 'PK')
  ALTER TABLE dbo.IgxCalibrationUserEvents ADD CONSTRAINT PK_IgxCalibrationUserEvents PRIMARY KEY CLUSTERED (id);

IF OBJECT_ID(N'dbo.IgxDateDim', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.IgxDateDim') AND type = 'PK')
  ALTER TABLE dbo.IgxDateDim ADD CONSTRAINT PK_IgxDateDim PRIMARY KEY CLUSTERED (DateKey, CompanyYear);

IF OBJECT_ID(N'dbo.IgxEmsEquipmentChangeLog', N'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.IgxEmsEquipmentChangeLog') AND type = 'PK')
    ALTER TABLE dbo.IgxEmsEquipmentChangeLog ADD CONSTRAINT PK_IgxEmsEquipmentChangeLog PRIMARY KEY CLUSTERED (id);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.IgxEmsEquipmentChangeLog') AND name = N'IX_IgxEmsEquipmentChangeLog_tag_changed')
    CREATE NONCLUSTERED INDEX IX_IgxEmsEquipmentChangeLog_tag_changed
      ON dbo.IgxEmsEquipmentChangeLog (tag_no, changed_at DESC);
END;

IF OBJECT_ID(N'dbo.IgxEmsManagerArea', N'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.IgxEmsManagerArea') AND type = 'PK')
    ALTER TABLE dbo.IgxEmsManagerArea ADD CONSTRAINT PK_IgxEmsManagerArea PRIMARY KEY CLUSTERED (id);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.IgxEmsManagerArea') AND name = N'IX_IgxEmsManagerArea_person')
    CREATE NONCLUSTERED INDEX IX_IgxEmsManagerArea_person ON dbo.IgxEmsManagerArea (person_no);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.IgxEmsManagerArea') AND name = N'IX_IgxEmsManagerArea_plant_area')
    CREATE NONCLUSTERED INDEX IX_IgxEmsManagerArea_plant_area ON dbo.IgxEmsManagerArea (plant, area);
END;

IF OBJECT_ID(N'dbo.IgxEmsNotificationLog', N'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.IgxEmsNotificationLog') AND type = 'PK')
    ALTER TABLE dbo.IgxEmsNotificationLog ADD CONSTRAINT PK_IgxEmsNotificationLog PRIMARY KEY CLUSTERED (id);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.IgxEmsNotificationLog') AND name = N'IX_IgxEmsNotificationLog_lookup')
    CREATE NONCLUSTERED INDEX IX_IgxEmsNotificationLog_lookup
      ON dbo.IgxEmsNotificationLog (pm_sch_no, notification_rule, recipient_person_no, sent_at);
END;

IF OBJECT_ID(N'dbo.IgxEmsUserRole', N'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.IgxEmsUserRole') AND type = 'PK')
    ALTER TABLE dbo.IgxEmsUserRole ADD CONSTRAINT PK_IgxEmsUserRole PRIMARY KEY CLUSTERED (id);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.IgxEmsUserRole') AND name = N'UQ_IgxEmsUserRole_person_role')
    CREATE UNIQUE NONCLUSTERED INDEX UQ_IgxEmsUserRole_person_role ON dbo.IgxEmsUserRole (person_no, ems_role);
END;

IF OBJECT_ID(N'dbo.IgxEQExtension', N'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.IgxEQExtension') AND type = 'PK')
    ALTER TABLE dbo.IgxEQExtension ADD CONSTRAINT PK_IgxEQExtension PRIMARY KEY CLUSTERED (id);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.IgxEQExtension') AND name = N'UQ_IgxEQExtension_tag_no')
    CREATE UNIQUE NONCLUSTERED INDEX UQ_IgxEQExtension_tag_no ON dbo.IgxEQExtension (tag_no);
END;

IF OBJECT_ID(N'dbo.IgxNotificationSchedule', N'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.IgxNotificationSchedule') AND type = 'PK')
    ALTER TABLE dbo.IgxNotificationSchedule ADD CONSTRAINT PK_IgxNotificationSchedule PRIMARY KEY CLUSTERED (id);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.IgxNotificationSchedule') AND name = N'IX_IgxNotificationSchedule_Type')
    CREATE NONCLUSTERED INDEX IX_IgxNotificationSchedule_Type ON dbo.IgxNotificationSchedule (notification_type);
END;
GO

SELECT
  t.name AS table_name,
  SUM(p.rows) AS row_count
FROM CEDAR.sys.tables t
INNER JOIN CEDAR.sys.partitions p
  ON t.object_id = p.object_id AND p.index_id IN (0, 1)
WHERE t.name LIKE N'Igx%'
GROUP BY t.name
ORDER BY t.name;
GO

PRINT 'Igx restore into CEDAR complete.';
GO
