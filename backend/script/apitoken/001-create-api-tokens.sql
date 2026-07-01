-- Service API tokens for 3rd-party integrations (read-only).
-- Database: Cedar6_Mars (dbConfig / EDEN app DB)
-- Run once via: node backend/script/apitoken/run-api-token-migrations.js

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'IgxApiTokens')
BEGIN
  CREATE TABLE dbo.IgxApiTokens (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    name          NVARCHAR(100) NOT NULL,           -- human label for the integration
    token_prefix  NVARCHAR(24) NOT NULL,            -- visible, non-secret prefix for identification
    token_hash    NVARCHAR(128) NOT NULL,           -- SHA-256 hex of the full token (secret never stored)
    scope         NVARCHAR(30) NOT NULL DEFAULT 'readonly',
    created_by    NVARCHAR(50) NULL,                -- UserID of admin who created it
    created_at    DATETIME NOT NULL DEFAULT GETDATE(),
    last_used_at  DATETIME NULL,
    expires_at    DATETIME NULL,                    -- NULL = never expires
    is_active     BIT NOT NULL DEFAULT 1,
    revoked_at    DATETIME NULL,
    CONSTRAINT UQ_IgxApiTokens_token_hash UNIQUE (token_hash),
    CONSTRAINT CK_IgxApiTokens_scope CHECK (scope IN ('readonly'))
  );
  CREATE INDEX IX_IgxApiTokens_active ON dbo.IgxApiTokens (is_active);
  PRINT 'Created IgxApiTokens.';
END
ELSE
BEGIN
  PRINT 'IgxApiTokens already exists.';
END
GO
