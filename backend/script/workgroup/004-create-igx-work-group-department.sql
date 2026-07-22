-- Create many-to-many mapping between work groups and departments
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'IgxWorkGroupDepartment')
BEGIN
  CREATE TABLE dbo.IgxWorkGroupDepartment (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    work_group_id INT NOT NULL,
    deptno INT NOT NULL,
    created_at DATETIME NOT NULL CONSTRAINT DF_IgxWorkGroupDepartment_created_at DEFAULT GETDATE(),
    CONSTRAINT UQ_IgxWorkGroupDepartment_work_group_dept UNIQUE (work_group_id, deptno)
  );

  CREATE INDEX IX_IgxWorkGroupDepartment_work_group_id
    ON dbo.IgxWorkGroupDepartment (work_group_id);

  PRINT 'Created IgxWorkGroupDepartment.';
END
ELSE
BEGIN
  PRINT 'IgxWorkGroupDepartment already exists.';
END
