-- Work Group lookup table
-- Database: Cedar6_Mars (dbConfig / EDEN app DB)
-- Run once via: node backend/script/workgroup/run-workgroup-migrations.js

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'IgxWorkGroup')
BEGIN
  CREATE TABLE dbo.IgxWorkGroup (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    name_en        NVARCHAR(100) NOT NULL,
    name_th        NVARCHAR(100) NOT NULL,
    description_en NVARCHAR(500) NULL,
    description_th NVARCHAR(500) NULL,
    sort_order     INT NOT NULL DEFAULT 0,
    is_active      BIT NOT NULL DEFAULT 1,
    created_at     DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at     DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_IgxWorkGroup_name_en UNIQUE (name_en)
  );
  CREATE INDEX IX_IgxWorkGroup_is_active_sort ON dbo.IgxWorkGroup (is_active, sort_order);
  PRINT 'Created IgxWorkGroup.';
END
ELSE
BEGIN
  PRINT 'IgxWorkGroup already exists.';
END
GO
