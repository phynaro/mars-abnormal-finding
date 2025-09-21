# TicketApproval Table Revision: Plant_ID to Area_ID Migration

## Overview
This document describes the migration of the `TicketApproval` table from using `plant_id` to `area_id` to align with the Plant → Area → Line → Machine hierarchy structure.

## Changes Made

### 1. **Table Structure Changes**
- **Removed**: `plant_id` column
- **Added**: `area_id` column with foreign key to `Area` table
- **Updated**: Foreign key constraints and unique constraints

### 2. **New Hierarchy Structure**
```
Plant (1) → Area (N) → Line (N) → Machine (N)
```

### 3. **Approval Level Meanings**
- **Level 1**: Area Level Approval
- **Level 2**: Line Level Approval  
- **Level 3**: Machine Level Approval

## Migration Script: `revise_ticket_approval_area_id.sql`

### What the Script Does

1. **Creates Area Table** (if it doesn't exist)
   - Ensures the Area table exists with proper structure
   - Creates necessary indexes for performance

2. **Adds area_id Column**
   - Adds the new `area_id` column to `TicketApproval`

3. **Creates Default Areas**
   - Creates default areas for existing plants
   - Ensures migration data has valid references

4. **Migrates Data**
   - Maps existing `plant_id` values to corresponding `area_id` values
   - Uses default areas created in step 3

5. **Updates Constraints**
   - Drops old foreign key constraint (`FK_TicketApproval_Plant`)
   - Adds new foreign key constraint (`FK_TicketApproval_Area`)
   - Updates unique constraint to use `area_id` instead of `plant_id`

6. **Performance Optimization**
   - Creates indexes on `area_id`, `personno`, and `approval_level`
   - Adds column description for `approval_level`

7. **Data Verification**
   - Includes verification queries to ensure migration success
   - Shows sample data after migration

## How to Run the Migration

### Prerequisites
- Ensure the `Plant` table exists
- Ensure the `Person` table exists
- Backup your database before running the migration

### Execution Steps

1. **Backup Database**
   ```sql
   BACKUP DATABASE [YourDatabaseName] TO DISK = 'backup_before_ticket_approval_migration.bak'
   ```

2. **Run Migration Script**
   ```sql
   -- Execute the migration script
   EXEC sp_executesql @sql = '-- Content of revise_ticket_approval_area_id.sql'
   ```

3. **Verify Results**
   - Check the verification queries at the end of the script
   - Ensure all data migrated correctly
   - Test application functionality

## New Table Structure

### TicketApproval Table (After Migration)
```sql
CREATE TABLE TicketApproval (
    id INT IDENTITY(1,1) PRIMARY KEY,
    personno INT NOT NULL,                    -- Reference to Person.PERSONNO
    area_id INT NOT NULL,                    -- Reference to Area.id (NEW)
    approval_level INT NOT NULL DEFAULT 1,   -- 1=Area, 2=Line, 3=Machine
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    -- Foreign Key Constraints
    FOREIGN KEY (personno) REFERENCES Person(PERSONNO),
    FOREIGN KEY (area_id) REFERENCES Area(id) ON DELETE CASCADE,
    
    -- Unique Constraint
    UNIQUE(personno, area_id, approval_level)
);
```

## Impact on Application Code

### Backend Changes Required

1. **Controller Updates**
   - Update `TicketApproval` queries to use `area_id` instead of `plant_id`
   - Modify approval workflow logic to work with area-based approvals

2. **Service Layer**
   - Update approval service methods
   - Modify area-based approval lookups

3. **API Endpoints**
   - Update API responses to include area information
   - Modify approval-related endpoints

### Frontend Changes Required

1. **Interface Updates**
   - Update TypeScript interfaces for `TicketApproval`
   - Modify approval workflow components

2. **Service Updates**
   - Update API calls to use area-based approvals
   - Modify approval selection logic

## Sample Queries After Migration

### Get Approvals by Area
```sql
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
WHERE ta.is_active = 1
ORDER BY pl.name, a.name, ta.approval_level;
```

### Get Area-Level Approvers
```sql
SELECT DISTINCT
    a.name as AreaName,
    a.code as AreaCode,
    p.FIRSTNAME + ' ' + p.LASTNAME as ApproverName,
    ta.approval_level
FROM TicketApproval ta
INNER JOIN Person p ON p.PERSONNO = ta.personno
INNER JOIN Area a ON a.id = ta.area_id
WHERE ta.approval_level = 1  -- Area level
AND ta.is_active = 1
ORDER BY a.name;
```

## Rollback Plan

If you need to rollback the migration:

1. **Restore Database Backup**
   ```sql
   RESTORE DATABASE [YourDatabaseName] FROM DISK = 'backup_before_ticket_approval_migration.bak'
   ```

2. **Or Manual Rollback** (if backup not available)
   - Re-add `plant_id` column
   - Migrate data back from `area_id` to `plant_id`
   - Restore original constraints
   - Drop `area_id` column

## Testing Checklist

- [ ] Migration script runs without errors
- [ ] All existing approval data preserved
- [ ] Foreign key constraints working correctly
- [ ] Unique constraints preventing duplicates
- [ ] Indexes created for performance
- [ ] Application code updated to use `area_id`
- [ ] Approval workflow functioning correctly
- [ ] Area-based approval selection working

## Notes

- The migration creates default areas for existing plants to ensure data integrity
- All existing approval configurations are preserved during migration
- The new structure provides more granular approval control at the area level
- Performance indexes are automatically created for optimal query performance
