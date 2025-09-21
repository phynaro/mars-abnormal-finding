-- =====================================================
-- FIX DATABASE SCHEMA FOR 5-PART PUCODE SUPPORT
-- Plant → Area → Line → Machine hierarchy
-- =====================================================

-- Step 1: Create the missing Area table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Area]') AND type in (N'U'))
BEGIN
    CREATE TABLE Area (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(500),
        code VARCHAR(50) NOT NULL, -- e.g., "AREA"
        plant_id INT NOT NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (plant_id) REFERENCES Plant(id) ON DELETE CASCADE
    );
    
    -- Create indexes for Area table
    CREATE INDEX IX_Area_PlantId ON Area(plant_id);
    CREATE INDEX IX_Area_Code ON Area(code);
    CREATE INDEX IX_Area_Active ON Area(is_active);
    
    PRINT 'Area table created successfully';
END
ELSE
BEGIN
    PRINT 'Area table already exists';
END;

-- Step 2: Update Line table to reference Area instead of Plant
-- First, add area_id column if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Line') AND name = 'area_id')
BEGIN
    ALTER TABLE Line ADD area_id INT;
    PRINT 'Added area_id column to Line table';
END;

-- Step 3: Create default areas for existing plants (migration step)
-- This creates a default area for each plant to migrate existing data
INSERT INTO Area (name, code, plant_id, is_active)
SELECT DISTINCT 
    'Default Area for ' + p.name as name,
    'DEFAULT-' + p.code as code,
    p.id as plant_id,
    1 as is_active
FROM Plant p
WHERE NOT EXISTS (SELECT 1 FROM Area a WHERE a.plant_id = p.id);

-- Step 4: Update existing Line records to reference the default areas
UPDATE Line 
SET area_id = a.id
FROM Line l
INNER JOIN Area a ON a.plant_id = l.plant_id AND a.code = 'DEFAULT-' + (SELECT code FROM Plant WHERE id = l.plant_id);

-- Step 5: Make area_id NOT NULL after populating
ALTER TABLE Line ALTER COLUMN area_id INT NOT NULL;

-- Step 6: Add foreign key constraint for area_id
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Line_Area')
BEGIN
    ALTER TABLE Line ADD CONSTRAINT FK_Line_Area 
        FOREIGN KEY (area_id) REFERENCES Area(id) ON DELETE CASCADE;
    PRINT 'Added foreign key constraint FK_Line_Area';
END;

-- Step 7: Drop old foreign key constraint and plant_id column
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Line_Plant')
BEGIN
    ALTER TABLE Line DROP CONSTRAINT FK_Line_Plant;
    PRINT 'Dropped old FK_Line_Plant constraint';
END;

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Line') AND name = 'plant_id')
BEGIN
    ALTER TABLE Line DROP COLUMN plant_id;
    PRINT 'Dropped plant_id column from Line table';
END;

-- Step 8: Insert sample Area data for testing
-- This creates proper areas instead of just default ones
INSERT INTO Area (name, code, plant_id, is_active) 
SELECT 'Production Area A', 'AREA-A', id, 1 FROM Plant WHERE code = 'PLANT'
UNION ALL
SELECT 'Production Area B', 'AREA-B', id, 1 FROM Plant WHERE code = 'PLANT'
UNION ALL
SELECT 'Quality Control', 'QC', id, 1 FROM Plant WHERE code = 'PLANT2';

-- Step 9: Update Line table to reference proper areas
UPDATE Line 
SET area_id = a.id
FROM Line l
INNER JOIN Area a ON a.plant_id = (SELECT plant_id FROM Plant WHERE id = l.area_id)
WHERE l.code = 'AREA-A' AND a.code = 'AREA-A';

UPDATE Line 
SET area_id = a.id
FROM Line l
INNER JOIN Area a ON a.plant_id = (SELECT plant_id FROM Plant WHERE id = l.area_id)
WHERE l.code = 'AREA-B' AND a.code = 'AREA-B';

UPDATE Line 
SET area_id = a.id
FROM Line l
INNER JOIN Area a ON a.plant_id = (SELECT plant_id FROM Plant WHERE id = l.area_id)
WHERE l.code = 'QC' AND a.code = 'QC';

-- Step 10: Create view for the complete hierarchy
IF EXISTS (SELECT * FROM sys.views WHERE name = 'V_MachineHierarchy')
    DROP VIEW V_MachineHierarchy;

CREATE VIEW V_MachineHierarchy AS
SELECT 
    m.id as machine_id,
    m.name as machine_name,
    m.code as machine_code,
    m.machine_number,
    l.id as line_id,
    l.name as line_name,
    l.code as line_code,
    a.id as area_id,
    a.name as area_name,
    a.code as area_code,
    p.id as plant_id,
    p.name as plant_name,
    p.code as plant_code,
    CONCAT(p.code, '-', a.code, '-', l.code, '-', m.code, '-', m.machine_number) as full_pucode
FROM Machine m
INNER JOIN Line l ON m.line_id = l.id
INNER JOIN Area a ON l.area_id = a.id
INNER JOIN Plant p ON a.plant_id = p.id
WHERE m.is_active = 1 AND l.is_active = 1 AND a.is_active = 1 AND p.is_active = 1;

PRINT 'Database schema updated for 5-part PUCODE support!';
PRINT 'Hierarchy: Plant → Area → Line → Machine';
PRINT 'PUCODE Format: PLANT-AREA-LINE-MACHINE-NUMBER';
