-- Create IgxRequestAccess table for access request management
-- This table stores user access requests submitted through LINE

CREATE TABLE dbo.IgxRequestAccess (
  RequestID INT IDENTITY(1,1) PRIMARY KEY,
  FirstName NVARCHAR(100) NOT NULL,
  LastName NVARCHAR(100) NOT NULL,
  Email NVARCHAR(255) NOT NULL,
  Telephone NVARCHAR(50),
  LineID NVARCHAR(500),
  Status NVARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  ApprovedBy INT NULL,
  ApprovedAt DATETIME NULL,
  LinkPersonNo INT NULL,
  CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
  UpdatedAt DATETIME NOT NULL DEFAULT GETDATE(),
  CONSTRAINT FK_IgxRequestAccess_ApprovedBy FOREIGN KEY (ApprovedBy) REFERENCES Person(PERSONNO),
  CONSTRAINT FK_IgxRequestAccess_LinkPersonNo FOREIGN KEY (LinkPersonNo) REFERENCES Person(PERSONNO)
);

-- Create indexes for better performance
CREATE INDEX IX_IgxRequestAccess_Status ON dbo.IgxRequestAccess(Status);
CREATE INDEX IX_IgxRequestAccess_Email ON dbo.IgxRequestAccess(Email);

-- Add comments for documentation
EXEC sp_addextendedproperty 
  @name = N'MS_Description', 
  @value = N'Table for storing user access requests submitted through LINE app', 
  @level0type = N'SCHEMA', @level0name = N'dbo', 
  @level1type = N'TABLE', @level1name = N'IgxRequestAccess';

EXEC sp_addextendedproperty 
  @name = N'MS_Description', 
  @value = N'Unique identifier for the access request', 
  @level0type = N'SCHEMA', @level0name = N'dbo', 
  @level1type = N'TABLE', @level1name = N'IgxRequestAccess',
  @level2type = N'COLUMN', @level2name = N'RequestID';

EXEC sp_addextendedproperty 
  @name = N'MS_Description', 
  @value = N'User first name', 
  @level0type = N'SCHEMA', @level0name = N'dbo', 
  @level1type = N'TABLE', @level1name = N'IgxRequestAccess',
  @level2type = N'COLUMN', @level2name = N'FirstName';

EXEC sp_addextendedproperty 
  @name = N'MS_Description', 
  @value = N'User last name', 
  @level0type = N'SCHEMA', @level0name = N'dbo', 
  @level1type = N'TABLE', @level1name = N'IgxRequestAccess',
  @level2type = N'COLUMN', @level2name = N'LastName';

EXEC sp_addextendedproperty 
  @name = N'MS_Description', 
  @value = N'User email address', 
  @level0type = N'SCHEMA', @level0name = N'dbo', 
  @level1type = N'TABLE', @level1name = N'IgxRequestAccess',
  @level2type = N'COLUMN', @level2name = N'Email';

EXEC sp_addextendedproperty 
  @name = N'MS_Description', 
  @value = N'User telephone number', 
  @level0type = N'SCHEMA', @level0name = N'dbo', 
  @level1type = N'TABLE', @level1name = N'IgxRequestAccess',
  @level2type = N'COLUMN', @level2name = N'Telephone';

EXEC sp_addextendedproperty 
  @name = N'MS_Description', 
  @value = N'LINE user ID from LIFF', 
  @level0type = N'SCHEMA', @level0name = N'dbo', 
  @level1type = N'TABLE', @level1name = N'IgxRequestAccess',
  @level2type = N'COLUMN', @level2name = N'LineID';

EXEC sp_addextendedproperty 
  @name = N'MS_Description', 
  @value = N'Request status: pending, approved, rejected', 
  @level0type = N'SCHEMA', @level0name = N'dbo', 
  @level1type = N'TABLE', @level1name = N'IgxRequestAccess',
  @level2type = N'COLUMN', @level2name = N'Status';

EXEC sp_addextendedproperty 
  @name = N'MS_Description', 
  @value = N'Person who approved the request', 
  @level0type = N'SCHEMA', @level0name = N'dbo', 
  @level1type = N'TABLE', @level1name = N'IgxRequestAccess',
  @level2type = N'COLUMN', @level2name = N'ApprovedBy';

EXEC sp_addextendedproperty 
  @name = N'MS_Description', 
  @value = N'Date and time when request was approved', 
  @level0type = N'SCHEMA', @level0name = N'dbo', 
  @level1type = N'TABLE', @level1name = N'IgxRequestAccess',
  @level2type = N'COLUMN', @level2name = N'ApprovedAt';

EXEC sp_addextendedproperty 
  @name = N'MS_Description', 
  @value = N'Person record linked to this request after approval', 
  @level0type = N'SCHEMA', @level0name = N'dbo', 
  @level1type = N'TABLE', @level1name = N'IgxRequestAccess',
  @level2type = N'COLUMN', @level2name = N'LinkPersonNo';

EXEC sp_addextendedproperty 
  @name = N'MS_Description', 
  @value = N'Date and time when request was created', 
  @level0type = N'SCHEMA', @level0name = N'dbo', 
  @level1type = N'TABLE', @level1name = N'IgxRequestAccess',
  @level2type = N'COLUMN', @level2name = N'CreatedAt';

EXEC sp_addextendedproperty 
  @name = N'MS_Description', 
  @value = N'Date and time when request was last updated', 
  @level0type = N'SCHEMA', @level0name = N'dbo', 
  @level1type = N'TABLE', @level1name = N'IgxRequestAccess',
  @level2type = N'COLUMN', @level2name = N'UpdatedAt';
