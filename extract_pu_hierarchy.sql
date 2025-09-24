-- SQL Script to Extract PU Hierarchy and Populate Plant/Area/Line/Machine Tables
-- This script scans the PU table for 5-section codes (xxx-xxx-xxx-xxx-xxx) and creates hierarchical records

-- Step 1: Clear existing data (optional - comment out if you want to keep existing data)
-- DELETE FROM Machine;
-- DELETE FROM Line;
-- DELETE FROM Area;
-- DELETE FROM Plant;

-- Step 2: Extract and insert Plants (1st section)
INSERT INTO Plant (name, description, code, is_active, created_at, updated_at)
SELECT DISTINCT 
    CASE 
        WHEN CHARINDEX('-', PUCODE) > 0 THEN LEFT(PUCODE, CHARINDEX('-', PUCODE) - 1)
        ELSE PUCODE
    END as plant_code,
    CASE 
        WHEN CHARINDEX('-', PUCODE) > 0 THEN LEFT(PUCODE, CHARINDEX('-', PUCODE) - 1) + ' Plant'
        ELSE PUCODE + ' Plant'
    END as plant_name,
    CASE 
        WHEN CHARINDEX('-', PUCODE) > 0 THEN LEFT(PUCODE, CHARINDEX('-', PUCODE) - 1)
        ELSE PUCODE
    END as plant_code,
    1 as is_active,
    GETDATE() as created_at,
    GETDATE() as updated_at
FROM PU 
WHERE PUCODE LIKE '%-%-%-%-%'  -- Only 5-section codes
    AND CHARINDEX('-', PUCODE) > 0
    AND CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) > 0
    AND CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) > 0
    AND CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) + 1) > 0
    AND CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) + 1) + 1) > 0
    AND CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) + 1) + 1) + 1) = 0  -- No 6th section
    AND FLAGDEL != 'Y'  -- Exclude deleted records
    AND NOT EXISTS (
        SELECT 1 FROM Plant p 
        WHERE p.code = CASE 
            WHEN CHARINDEX('-', PUCODE) > 0 THEN LEFT(PUCODE, CHARINDEX('-', PUCODE) - 1)
            ELSE PUCODE
        END
    );

-- Step 3: Extract and insert Areas (2nd section)
INSERT INTO Area (plant_id, name, description, code, is_active, created_at, updated_at)
SELECT DISTINCT 
    p.id as plant_id,
    SUBSTRING(PUCODE, 
        CHARINDEX('-', PUCODE) + 1, 
        CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) - CHARINDEX('-', PUCODE) - 1
    ) as area_code,
    SUBSTRING(PUCODE, 
        CHARINDEX('-', PUCODE) + 1, 
        CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) - CHARINDEX('-', PUCODE) - 1
    ) + ' Area' as area_name,
    SUBSTRING(PUCODE, 
        CHARINDEX('-', PUCODE) + 1, 
        CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) - CHARINDEX('-', PUCODE) - 1
    ) as area_code,
    1 as is_active,
    GETDATE() as created_at,
    GETDATE() as updated_at
FROM PU pu
INNER JOIN Plant p ON p.code = LEFT(PUCODE, CHARINDEX('-', PUCODE) - 1)
WHERE PUCODE LIKE '%-%-%-%-%'  -- Only 5-section codes
    AND CHARINDEX('-', PUCODE) > 0
    AND CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) > 0
    AND CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) > 0
    AND CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) + 1) > 0
    AND CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) + 1) + 1) > 0
    AND CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) + 1) + 1) + 1) = 0  -- No 6th section
    AND FLAGDEL != 'Y'  -- Exclude deleted records
    AND NOT EXISTS (
        SELECT 1 FROM Area a 
        WHERE a.plant_id = p.id 
        AND a.code = SUBSTRING(PUCODE, 
            CHARINDEX('-', PUCODE) + 1, 
            CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) - CHARINDEX('-', PUCODE) - 1
        )
    );

-- Step 4: Extract and insert Lines (3rd section)
INSERT INTO Line (plant_id, area_id, name, description, code, is_active, created_at, updated_at)
SELECT DISTINCT 
    p.id as plant_id,
    a.id as area_id,
    SUBSTRING(PUCODE, 
        CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1, 
        CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) - CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) - 1
    ) as line_code,
    SUBSTRING(PUCODE, 
        CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1, 
        CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) - CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) - 1
    ) + ' Line' as line_name,
    SUBSTRING(PUCODE, 
        CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1, 
        CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) - CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) - 1
    ) as line_code,
    1 as is_active,
    GETDATE() as created_at,
    GETDATE() as updated_at
FROM PU pu
INNER JOIN Plant p ON p.code = LEFT(PUCODE, CHARINDEX('-', PUCODE) - 1)
INNER JOIN Area a ON a.plant_id = p.id 
    AND a.code = SUBSTRING(PUCODE, 
        CHARINDEX('-', PUCODE) + 1, 
        CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) - CHARINDEX('-', PUCODE) - 1
    )
WHERE PUCODE LIKE '%-%-%-%-%'  -- Only 5-section codes
    AND CHARINDEX('-', PUCODE) > 0
    AND CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) > 0
    AND CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) > 0
    AND CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) + 1) > 0
    AND CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) + 1) + 1) > 0
    AND CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) + 1) + 1) + 1) = 0  -- No 6th section
    AND FLAGDEL != 'Y'  -- Exclude deleted records
    AND NOT EXISTS (
        SELECT 1 FROM Line l 
        WHERE l.plant_id = p.id 
        AND l.area_id = a.id
        AND l.code = SUBSTRING(PUCODE, 
            CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1, 
            CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) - CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) - 1
        )
    );

-- Step 5: Extract and insert Machines (4th and 5th sections)
INSERT INTO Machine (line_id, name, description, code, machine_number, is_active, created_at, updated_at)
SELECT DISTINCT 
    l.id as line_id,
    SUBSTRING(PUCODE, 
        CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) + 1, 
        CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) + 1) - CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) - 1
    ) + '-' + SUBSTRING(PUCODE, 
        CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) + 1) + 1, 
        LEN(PUCODE)
    ) as machine_name,
    PUNAME as machine_description,
    -- Machine code should only contain the 4th section (text part without number)
    SUBSTRING(PUCODE, 
        CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) + 1, 
        CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) + 1) - CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) - 1
    ) as machine_code,
    -- Machine number should contain only the numeric part from 5th section
    CASE 
        WHEN ISNUMERIC(SUBSTRING(PUCODE, 
            CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) + 1) + 1, 
            LEN(PUCODE)
        )) = 1 
        THEN CAST(SUBSTRING(PUCODE, 
            CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) + 1) + 1, 
            LEN(PUCODE)
        ) AS INT)
        ELSE 0
    END as machine_number,
    1 as is_active,
    GETDATE() as created_at,
    GETDATE() as updated_at
FROM PU pu
INNER JOIN Plant p ON p.code = LEFT(PUCODE, CHARINDEX('-', PUCODE) - 1)
INNER JOIN Area a ON a.plant_id = p.id 
    AND a.code = SUBSTRING(PUCODE, 
        CHARINDEX('-', PUCODE) + 1, 
        CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) - CHARINDEX('-', PUCODE) - 1
    )
INNER JOIN Line l ON l.plant_id = p.id 
    AND l.area_id = a.id
    AND l.code = SUBSTRING(PUCODE, 
        CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1, 
        CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) - CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) - 1
    )
WHERE PUCODE LIKE '%-%-%-%-%'  -- Only 5-section codes
    AND CHARINDEX('-', PUCODE) > 0
    AND CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) > 0
    AND CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) > 0
    AND CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) + 1) > 0
    AND CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) + 1) + 1) > 0
    AND CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) + 1) + 1) + 1) = 0  -- No 6th section
    AND FLAGDEL != 'Y'  -- Exclude deleted records
    AND NOT EXISTS (
        SELECT 1 FROM Machine m 
        WHERE m.line_id = l.id 
        AND m.code = SUBSTRING(PUCODE, 
            CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) + 1, 
            CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) + 1) - CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) - 1
        ) + '-' + SUBSTRING(PUCODE, 
            CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE, CHARINDEX('-', PUCODE) + 1) + 1) + 1) + 1, 
            LEN(PUCODE)
        )
    );

-- Step 6: Display summary of inserted records
SELECT 'Plant' as TableName, COUNT(*) as RecordCount FROM Plant
UNION ALL
SELECT 'Area' as TableName, COUNT(*) as RecordCount FROM Area
UNION ALL
SELECT 'Line' as TableName, COUNT(*) as RecordCount FROM Line
UNION ALL
SELECT 'Machine' as TableName, COUNT(*) as RecordCount FROM Machine;

-- Step 7: Display sample of extracted data
SELECT TOP 10 
    p.code as Plant,
    a.code as Area,
    l.code as Line,
    m.code as Machine,
    m.machine_number,
    m.name as Machine_Name
FROM Machine m
INNER JOIN Line l ON m.line_id = l.id
INNER JOIN Area a ON l.area_id = a.id
INNER JOIN Plant p ON l.plant_id = p.id
ORDER BY p.code, a.code, l.code, m.code;
