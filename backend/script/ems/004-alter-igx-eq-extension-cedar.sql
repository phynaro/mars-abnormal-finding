-- EMS: extend dbo.IgxEQExtension on CEDAR for edit audit + equipment image path
-- Database: CEDAR (dbConfigNew)
-- Run via: node backend/script/ems/run-cedar-ems-migrations.js

IF COL_LENGTH('dbo.IgxEQExtension', 'updated_by') IS NULL
BEGIN
  ALTER TABLE dbo.IgxEQExtension ADD updated_by NVARCHAR(50) NULL;
  PRINT 'Added IgxEQExtension.updated_by.';
END
ELSE
BEGIN
  PRINT 'IgxEQExtension.updated_by already exists.';
END
GO

IF COL_LENGTH('dbo.IgxEQExtension', 'image_url') IS NULL
BEGIN
  ALTER TABLE dbo.IgxEQExtension ADD image_url NVARCHAR(500) NULL;
  PRINT 'Added IgxEQExtension.image_url.';
END
ELSE
BEGIN
  PRINT 'IgxEQExtension.image_url already exists.';
END
GO
