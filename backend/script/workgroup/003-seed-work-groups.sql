-- Seed initial work groups (idempotent by name_en)

IF NOT EXISTS (SELECT 1 FROM dbo.IgxWorkGroup WHERE name_en = N'Machine')
BEGIN
  INSERT INTO dbo.IgxWorkGroup (name_en, name_th, description_en, description_th, sort_order, is_active)
  VALUES (
    N'Machine',
    N'Machine',
    N'Production machines and mechanical issues',
    N'Production machines and mechanical issues',
    1,
    1
  );
  PRINT 'Seeded work group: Machine';
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.IgxWorkGroup WHERE name_en = N'EE / Control / Automation')
BEGIN
  INSERT INTO dbo.IgxWorkGroup (name_en, name_th, description_en, description_th, sort_order, is_active)
  VALUES (
    N'EE / Control / Automation',
    N'EE / Control / Automation',
    N'Electrical, control systems, and automation',
    N'Electrical, control systems, and automation',
    2,
    1
  );
  PRINT 'Seeded work group: EE / Control / Automation';
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.IgxWorkGroup WHERE name_en = N'Facility & Building')
BEGIN
  INSERT INTO dbo.IgxWorkGroup (name_en, name_th, description_en, description_th, sort_order, is_active)
  VALUES (
    N'Facility & Building',
    N'Facility & Building',
    N'Buildings, utilities, and site facilities',
    N'Buildings, utilities, and site facilities',
    3,
    1
  );
  PRINT 'Seeded work group: Facility & Building';
END
GO
