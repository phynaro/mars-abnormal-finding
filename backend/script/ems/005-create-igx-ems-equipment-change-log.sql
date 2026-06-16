-- EMS: equipment edit audit log (field-level changes grouped by save)
-- Database: CEDAR (dbConfigNew)
-- Run via: node backend/script/ems/run-cedar-ems-migrations.js

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'IgxEmsEquipmentChangeLog')
BEGIN
  CREATE TABLE dbo.IgxEmsEquipmentChangeLog (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    tag_no        NVARCHAR(50) NOT NULL,
    eqno          INT NOT NULL,
    change_group  UNIQUEIDENTIFIER NOT NULL,
    field_key     NVARCHAR(50) NOT NULL,
    old_value     NVARCHAR(MAX) NULL,
    new_value     NVARCHAR(MAX) NULL,
    changed_by    NVARCHAR(50) NOT NULL,
    changed_at    DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );

  CREATE INDEX IX_IgxEmsEquipmentChangeLog_tag_changed
    ON dbo.IgxEmsEquipmentChangeLog (tag_no, changed_at DESC);

  PRINT 'Created IgxEmsEquipmentChangeLog.';
END
ELSE
BEGIN
  PRINT 'IgxEmsEquipmentChangeLog already exists.';
END
GO
