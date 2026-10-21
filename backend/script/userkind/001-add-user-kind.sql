-- External users are limited to tickets they created. Missing or existing rows stay internal.
IF COL_LENGTH('dbo.IgxUserExtension', 'UserKind') IS NULL
BEGIN
  ALTER TABLE dbo.IgxUserExtension
    ADD UserKind NVARCHAR(20) NOT NULL
      CONSTRAINT DF_IgxUserExtension_UserKind DEFAULT 'internal';
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints WHERE name = 'CK_IgxUserExtension_UserKind'
)
AND COL_LENGTH('dbo.IgxUserExtension', 'UserKind') IS NOT NULL
BEGIN
  ALTER TABLE dbo.IgxUserExtension
    ADD CONSTRAINT CK_IgxUserExtension_UserKind
    CHECK (UserKind IN (N'internal', N'external'));
END
GO
