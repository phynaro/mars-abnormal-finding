-- EMS Phase 1: role and manager-area tables
-- Database: Cedar6_Mars (dbConfig / EDEN app DB)
-- Run once via: node backend/script/ems/run-ems-migrations.js

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'IgxEmsUserRole')
BEGIN
  CREATE TABLE dbo.IgxEmsUserRole (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    person_no   NVARCHAR(50) NOT NULL,
    ems_role    NVARCHAR(30) NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_IgxEmsUserRole_person_role UNIQUE (person_no, ems_role),
    CONSTRAINT CK_IgxEmsUserRole_role CHECK (ems_role IN ('calibrator', 'am', 'plant_manager'))
  );
  PRINT 'Created IgxEmsUserRole.';
END
ELSE
BEGIN
  PRINT 'IgxEmsUserRole already exists.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'IgxEmsManagerArea')
BEGIN
  CREATE TABLE dbo.IgxEmsManagerArea (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    person_no   NVARCHAR(50) NOT NULL,
    plant       NVARCHAR(20) NULL,
    area        NVARCHAR(100) NULL,
    created_at  DATETIME NOT NULL DEFAULT GETDATE()
  );
  CREATE INDEX IX_IgxEmsManagerArea_plant_area ON dbo.IgxEmsManagerArea (plant, area);
  CREATE INDEX IX_IgxEmsManagerArea_person ON dbo.IgxEmsManagerArea (person_no);
  PRINT 'Created IgxEmsManagerArea.';
END
ELSE
BEGIN
  PRINT 'IgxEmsManagerArea already exists.';
END
GO
