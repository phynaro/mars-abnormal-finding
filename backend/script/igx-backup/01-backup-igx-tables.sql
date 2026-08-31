/*
  Backup only dbo.Igx* tables from CEDAR (cedar_new) into staging DB CEDAR_IgxOnly,
  then take a native .bak of that staging database.

  Workflow:
    1. Run this script (or run-backup-igx.js) while CEDAR still has Igx* tables.
    2. Restore your full CEDAR backup that does NOT include Igx* tables.
    3. Run 02-restore-igx-tables-into-cedar.sql to copy Igx* back into CEDAR.

  Safe to re-run: drops/recreates staging tables, overwrites the .bak.
*/

SET NOCOUNT ON;
GO

USE master;
GO

IF DB_ID(N'CEDAR') IS NULL
BEGIN
  RAISERROR('Source database CEDAR not found.', 16, 1);
END
GO

IF DB_ID(N'CEDAR_IgxOnly') IS NULL
BEGIN
  CREATE DATABASE CEDAR_IgxOnly;
  PRINT 'Created database CEDAR_IgxOnly';
END
ELSE
  PRINT 'Staging database already exists: CEDAR_IgxOnly';
GO

/* Copy every user table whose name starts with Igx */
DECLARE @sql nvarchar(max) = N'';

SELECT @sql = @sql + N'
IF OBJECT_ID(N''CEDAR_IgxOnly.dbo.' + t.name + N''', N''U'') IS NOT NULL
  DROP TABLE CEDAR_IgxOnly.dbo.' + QUOTENAME(t.name) + N';
SELECT * INTO CEDAR_IgxOnly.dbo.' + QUOTENAME(t.name) + N'
FROM CEDAR.dbo.' + QUOTENAME(t.name) + N';
PRINT N''Copied ' + t.name + N''';
'
FROM CEDAR.sys.tables t
INNER JOIN CEDAR.sys.schemas s ON t.schema_id = s.schema_id
WHERE s.name = N'dbo'
  AND t.name LIKE N'Igx%'
  AND t.is_ms_shipped = 0
ORDER BY t.name;

IF (@sql IS NULL OR LTRIM(RTRIM(@sql)) = N'')
BEGIN
  RAISERROR('No dbo.Igx* tables found in CEDAR.', 16, 1);
END
ELSE
  EXEC sp_executesql @sql;
GO

USE CEDAR_IgxOnly;
GO

/* IgxCalibrationUserEvents */
IF OBJECT_ID(N'dbo.IgxCalibrationUserEvents', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.IgxCalibrationUserEvents') AND type = 'PK')
  ALTER TABLE dbo.IgxCalibrationUserEvents ADD CONSTRAINT PK_IgxCalibrationUserEvents PRIMARY KEY CLUSTERED (id);
GO

/* IgxDateDim */
IF OBJECT_ID(N'dbo.IgxDateDim', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.IgxDateDim') AND type = 'PK')
  ALTER TABLE dbo.IgxDateDim ADD CONSTRAINT PK_IgxDateDim PRIMARY KEY CLUSTERED (DateKey, CompanyYear);
GO

/* IgxEmsEquipmentChangeLog */
IF OBJECT_ID(N'dbo.IgxEmsEquipmentChangeLog', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.IgxEmsEquipmentChangeLog') AND type = 'PK')
  ALTER TABLE dbo.IgxEmsEquipmentChangeLog ADD CONSTRAINT PK_IgxEmsEquipmentChangeLog PRIMARY KEY CLUSTERED (id);
GO

IF OBJECT_ID(N'dbo.IgxEmsEquipmentChangeLog', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.IgxEmsEquipmentChangeLog') AND name = N'IX_IgxEmsEquipmentChangeLog_tag_changed')
  CREATE NONCLUSTERED INDEX IX_IgxEmsEquipmentChangeLog_tag_changed
    ON dbo.IgxEmsEquipmentChangeLog (tag_no, changed_at DESC);
GO

/* IgxEmsManagerArea */
IF OBJECT_ID(N'dbo.IgxEmsManagerArea', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.IgxEmsManagerArea') AND type = 'PK')
  ALTER TABLE dbo.IgxEmsManagerArea ADD CONSTRAINT PK_IgxEmsManagerArea PRIMARY KEY CLUSTERED (id);
GO

IF OBJECT_ID(N'dbo.IgxEmsManagerArea', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.IgxEmsManagerArea') AND name = N'IX_IgxEmsManagerArea_person')
  CREATE NONCLUSTERED INDEX IX_IgxEmsManagerArea_person ON dbo.IgxEmsManagerArea (person_no);
GO

IF OBJECT_ID(N'dbo.IgxEmsManagerArea', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.IgxEmsManagerArea') AND name = N'IX_IgxEmsManagerArea_plant_area')
  CREATE NONCLUSTERED INDEX IX_IgxEmsManagerArea_plant_area ON dbo.IgxEmsManagerArea (plant, area);
GO

/* IgxEmsNotificationLog */
IF OBJECT_ID(N'dbo.IgxEmsNotificationLog', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.IgxEmsNotificationLog') AND type = 'PK')
  ALTER TABLE dbo.IgxEmsNotificationLog ADD CONSTRAINT PK_IgxEmsNotificationLog PRIMARY KEY CLUSTERED (id);
GO

IF OBJECT_ID(N'dbo.IgxEmsNotificationLog', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.IgxEmsNotificationLog') AND name = N'IX_IgxEmsNotificationLog_lookup')
  CREATE NONCLUSTERED INDEX IX_IgxEmsNotificationLog_lookup
    ON dbo.IgxEmsNotificationLog (pm_sch_no, notification_rule, recipient_person_no, sent_at);
GO

/* IgxEmsUserRole */
IF OBJECT_ID(N'dbo.IgxEmsUserRole', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.IgxEmsUserRole') AND type = 'PK')
  ALTER TABLE dbo.IgxEmsUserRole ADD CONSTRAINT PK_IgxEmsUserRole PRIMARY KEY CLUSTERED (id);
GO

IF OBJECT_ID(N'dbo.IgxEmsUserRole', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.IgxEmsUserRole') AND name = N'UQ_IgxEmsUserRole_person_role')
  CREATE UNIQUE NONCLUSTERED INDEX UQ_IgxEmsUserRole_person_role ON dbo.IgxEmsUserRole (person_no, ems_role);
GO

/* IgxEQExtension */
IF OBJECT_ID(N'dbo.IgxEQExtension', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.IgxEQExtension') AND type = 'PK')
  ALTER TABLE dbo.IgxEQExtension ADD CONSTRAINT PK_IgxEQExtension PRIMARY KEY CLUSTERED (id);
GO

IF OBJECT_ID(N'dbo.IgxEQExtension', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.IgxEQExtension') AND name = N'UQ_IgxEQExtension_tag_no')
  CREATE UNIQUE NONCLUSTERED INDEX UQ_IgxEQExtension_tag_no ON dbo.IgxEQExtension (tag_no);
GO

/* IgxNotificationSchedule */
IF OBJECT_ID(N'dbo.IgxNotificationSchedule', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.IgxNotificationSchedule') AND type = 'PK')
  ALTER TABLE dbo.IgxNotificationSchedule ADD CONSTRAINT PK_IgxNotificationSchedule PRIMARY KEY CLUSTERED (id);
GO

IF OBJECT_ID(N'dbo.IgxNotificationSchedule', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.IgxNotificationSchedule') AND name = N'IX_IgxNotificationSchedule_Type')
  CREATE NONCLUSTERED INDEX IX_IgxNotificationSchedule_Type ON dbo.IgxNotificationSchedule (notification_type);
GO

USE master;
GO

BACKUP DATABASE CEDAR_IgxOnly
TO DISK = N'C:\Program Files\Microsoft SQL Server\MSSQL16.SQLSERVER2022DEV\MSSQL\Backup\CEDAR_IgxOnly.bak'
WITH INIT, COPY_ONLY, COMPRESSION, STATS = 10;
GO

SELECT
  t.name AS table_name,
  SUM(p.rows) AS row_count
FROM CEDAR_IgxOnly.sys.tables t
INNER JOIN CEDAR_IgxOnly.sys.partitions p
  ON t.object_id = p.object_id AND p.index_id IN (0, 1)
WHERE t.name LIKE N'Igx%'
GROUP BY t.name
ORDER BY t.name;
GO

PRINT 'Igx-only backup complete: C:\Program Files\Microsoft SQL Server\MSSQL16.SQLSERVER2022DEV\MSSQL\Backup\CEDAR_IgxOnly.bak';
GO
