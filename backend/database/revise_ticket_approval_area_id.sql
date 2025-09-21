-- =====================================================
-- REVISE TICKET APPROVAL TABLE: PLANT_ID TO AREA_ID
-- Migration script to change TicketApproval table structure
-- =====================================================

-- Step 1: Check if Area table exists, create if not
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

-- Step 2: Add area_id column to TicketApproval table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TicketApproval') AND name = 'area_id')
BEGIN
    ALTER TABLE TicketApproval ADD area_id INT;
    PRINT 'Added area_id column to TicketApproval table';
END;

-- Step 3: Create default areas for existing plants (if not already created)
-- This ensures we have areas to migrate the approval data to
INSERT INTO Area (name, code, plant_id, is_active)
SELECT DISTINCT 
    'Default Area for ' + p.name as name,
    'DEFAULT-' + p.code as code,
    p.id as plant_id,
    1 as is_active
FROM Plant p
WHERE NOT EXISTS (SELECT 1 FROM Area a WHERE a.plant_id = p.id);

-- Step 4: Migrate existing TicketApproval data from plant_id to area_id
-- For each plant_id in TicketApproval, find the corresponding default area
UPDATE TicketApproval 
SET area_id = a.id
FROM TicketApproval ta
INNER JOIN Area a ON a.plant_id = ta.plant_id AND a.code = 'DEFAULT-' + (SELECT code FROM Plant WHERE id = ta.plant_id);

-- Step 5: Make area_id NOT NULL after populating
ALTER TABLE TicketApproval ALTER COLUMN area_id INT NOT NULL;

-- Step 6: Drop the old foreign key constraint
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_TicketApproval_Plant')
BEGIN
    ALTER TABLE TicketApproval DROP CONSTRAINT FK_TicketApproval_Plant;
    PRINT 'Dropped old FK_TicketApproval_Plant constraint';
END;

-- Step 7: Add new foreign key constraint for area_id
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_TicketApproval_Area')
BEGIN
    ALTER TABLE TicketApproval ADD CONSTRAINT FK_TicketApproval_Area 
        FOREIGN KEY (area_id) REFERENCES Area(id) ON DELETE CASCADE;
    PRINT 'Added foreign key constraint FK_TicketApproval_Area';
END;

-- Step 8: Drop the old unique constraint
IF EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'UQ_TicketApproval_Personno_PlantId_ApprovalLevel')
BEGIN
    ALTER TABLE TicketApproval DROP CONSTRAINT UQ_TicketApproval_Personno_PlantId_ApprovalLevel;
    PRINT 'Dropped old unique constraint UQ_TicketApproval_Personno_PlantId_ApprovalLevel';
END;

-- Step 9: Add new unique constraint for area_id
IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'UQ_TicketApproval_Personno_AreaId_ApprovalLevel')
BEGIN
    ALTER TABLE TicketApproval ADD CONSTRAINT UQ_TicketApproval_Personno_AreaId_ApprovalLevel
        UNIQUE(personno, area_id, approval_level);
    PRINT 'Added new unique constraint UQ_TicketApproval_Personno_AreaId_ApprovalLevel';
END;

-- Step 10: Drop the plant_id column
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TicketApproval') AND name = 'plant_id')
BEGIN
    ALTER TABLE TicketApproval DROP COLUMN plant_id;
    PRINT 'Dropped plant_id column from TicketApproval table';
END;

-- Step 11: Update approval_level comments to reflect new hierarchy
-- Update the approval_level meaning: 1=Area Level, 2=Line Level, 3=Machine Level
-- Add a comment to clarify the new approval levels
EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Approval Level: 1=Area Level, 2=Line Level, 3=Machine Level', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'TicketApproval', 
    @level2type = N'COLUMN', @level2name = N'approval_level';

-- Step 12: Create indexes for better performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TicketApproval_AreaId')
BEGIN
    CREATE INDEX IX_TicketApproval_AreaId ON TicketApproval(area_id);
    PRINT 'Created index IX_TicketApproval_AreaId';
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TicketApproval_Personno')
BEGIN
    CREATE INDEX IX_TicketApproval_Personno ON TicketApproval(personno);
    PRINT 'Created index IX_TicketApproval_Personno';
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TicketApproval_ApprovalLevel')
BEGIN
    CREATE INDEX IX_TicketApproval_ApprovalLevel ON TicketApproval(approval_level);
    PRINT 'Created index IX_TicketApproval_ApprovalLevel';
END;

-- Step 13: Insert sample data for testing (optional)
-- This creates some sample approval configurations for testing
INSERT INTO TicketApproval (personno, area_id, approval_level, is_active)
SELECT 
    p.PERSONNO,
    a.id as area_id,
    1 as approval_level, -- Area level approval
    1 as is_active
FROM Person p
CROSS JOIN Area a
WHERE p.PERSONNO IN (SELECT TOP 3 PERSONNO FROM Person WHERE PERSONNO IS NOT NULL)
AND a.code LIKE 'DEFAULT-%'
AND NOT EXISTS (
    SELECT 1 FROM TicketApproval ta 
    WHERE ta.personno = p.PERSONNO 
    AND ta.area_id = a.id 
    AND ta.approval_level = 1
);

PRINT 'Migration completed successfully!';
PRINT 'TicketApproval table now uses area_id instead of plant_id';
PRINT 'New hierarchy: Plant → Area → Line → Machine';
PRINT 'Approval levels: 1=Area Level, 2=Line Level, 3=Machine Level';

-- Step 14: Verify the migration
SELECT 
    'Migration Verification' as Status,
    COUNT(*) as TotalApprovals,
    COUNT(DISTINCT area_id) as UniqueAreas,
    COUNT(DISTINCT personno) as UniquePersons
FROM TicketApproval;

SELECT 
    ta.id,
    ta.personno,
    p.FIRSTNAME + ' ' + p.LASTNAME as PersonName,
    ta.area_id,
    a.name as AreaName,
    a.code as AreaCode,
    pl.name as PlantName,
    ta.approval_level,
    ta.is_active
FROM TicketApproval ta
INNER JOIN Person p ON p.PERSONNO = ta.personno
INNER JOIN Area a ON a.id = ta.area_id
INNER JOIN Plant pl ON pl.id = a.plant_id
ORDER BY ta.id;
