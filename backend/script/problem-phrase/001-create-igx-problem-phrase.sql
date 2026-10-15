-- Problem phrase dictionary (part / symptom)
-- Database: Cedar6_Mars (dbConfig / EDEN app DB)
-- Run once via: node backend/script/problem-phrase/run-problem-phrase-migrations.js

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'IgxProblemPhrase')
BEGIN
  CREATE TABLE dbo.IgxProblemPhrase (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    phrase     NVARCHAR(200) NOT NULL,
    kind       VARCHAR(20) NOT NULL,
    code       NVARCHAR(50) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT CK_IgxProblemPhrase_kind CHECK (kind IN ('part', 'symptom')),
    CONSTRAINT UQ_IgxProblemPhrase_phrase UNIQUE (phrase)
  );
  CREATE INDEX IX_IgxProblemPhrase_kind_code ON dbo.IgxProblemPhrase (kind, code);
  PRINT 'Created IgxProblemPhrase.';
END
ELSE
BEGIN
  PRINT 'IgxProblemPhrase already exists.';
END
GO
