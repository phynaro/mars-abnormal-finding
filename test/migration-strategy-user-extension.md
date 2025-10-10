# Migration Strategy: _secUsers to UserExtension Table

## Overview
The `_secUsers` table currently contains extended user information that should be moved to a separate `UserExtension` table to maintain clean separation of concerns.

## Current State Analysis

### _secUsers Table Schema
The `_secUsers` table currently contains these extended columns that need to be migrated:
- `EmailVerified` (nchar(10))
- `EmailVerificationToken` (nvarchar(255))
- `EmailVerificationExpires` (datetime2)
- `LastLogin` (datetime2)
- `CreatedAt` (datetime2)
- `UpdatedAt` (datetime2)
- `LineID` (nvarchar(500))
- `AvatarUrl` (nvarchar(500))
- `IsActive` (bit)

### UserExtension Table Created
```sql
CREATE TABLE dbo.UserExtension (
    UserExtensionID int IDENTITY(1,1) PRIMARY KEY,
    UserID varchar(50) NOT NULL,
    EmailVerified nchar(10) NULL,
    EmailVerificationToken nvarchar(255) NULL,
    EmailVerificationExpires datetime2 NULL,
    LastLogin datetime2 NULL,
    CreatedAt datetime2 NOT NULL DEFAULT GETDATE(),
    UpdatedAt datetime2 NOT NULL DEFAULT GETDATE(),
    LineID nvarchar(500) NULL,
    AvatarUrl nvarchar(500) NULL,
    IsActive bit NOT NULL DEFAULT 1,
    CONSTRAINT FK_UserExtension_secUsers FOREIGN KEY (UserID) REFERENCES dbo._secUsers(UserID)
)
```

## Files Requiring Migration

### 1. Authentication & Authorization Files
**File: `backend/src/controllers/authController.js`**
- **Lines 94-140**: Login query - SELECTs extended fields from `_secUsers`
- **Lines 204-205**: Updates `LastLogin` in `_secUsers`
- **Lines 329-330**: SELECTs password from `_secUsers`
- **Lines 356-357**: Updates password in `_secUsers`
- **Lines 380-425**: Get profile query - SELECTs extended fields from `_secUsers`
- **Lines 492-493**: Checks user active status in `_secUsers`

**File: `backend/src/middleware/auth.js`**
- **Lines 42-87**: Authentication middleware query - SELECTs extended fields from `_secUsers`

### 2. User Management Files
**File: `backend/src/controllers/userManagementController.js`**
- **Lines 33-77**: Get all users query - SELECTs extended fields from `_secUsers`
- **Lines 147-192**: Get user by ID query - SELECTs extended fields from `_secUsers`
- **Lines 292-292**: Check user existence in `_secUsers`
- **Lines 358-362**: INSERT new user into `_secUsers` with extended fields
- **Lines 432-432**: SELECT user for deletion check
- **Lines 500-501**: UPDATE `_secUsers` for user updates
- **Lines 554-554**: SELECT user for deactivation
- **Lines 568-568**: UPDATE `_secUsers` for deactivation
- **Lines 651-651**: SELECT user for reactivation
- **Lines 669-669**: UPDATE `_secUsers` for reactivation

**File: `backend/src/controllers/userController.js`**
- **Lines 53-58**: UPDATE `LineID` in `_secUsers`
- **Lines 81-83**: UPDATE `AvatarUrl` in `_secUsers`
- **Lines 145-146**: JOIN with `_secUsers` for user list
- **Lines 186-187**: SELECT `LineID` from `_secUsers`

### 3. Work Request Controller
**File: `backend/src/controllers/workRequestController.js`**
- **Lines 31-31**: SELECT from `_secUsers` for user mapping

### 4. Ticket System Files
**File: `backend/src/controllers/ticketController.js`**
- **Lines 238, 738, 858, 1031, 1440, 2405, 2410**: Multiple LEFT JOINs with `_secUsers`

**File: `backend/src/controllers/ticketController/helpers.js`**
- **Line 462**: LEFT JOIN with `_secUsers`

**File: `backend/src/routes/ticket.js`**
- **Line 102**: LEFT JOIN with `_secUsers`

### 5. Dashboard Controller
**File: `backend/src/controllers/dashboardController.js`**
- **Lines 1675, 2738, 2851, 3286, 3390, 3655, 3670, 3685**: Multiple LEFT JOINs with `_secUsers`

## Migration Strategy

### Phase 1: Data Migration
1. **Copy existing data** from `_secUsers` extended columns to `UserExtension` table
2. **Verify data integrity** after migration
3. **Create backup** of original `_secUsers` table

### Phase 2: Query Updates
1. **Update SELECT queries** to JOIN with `UserExtension` table
2. **Update INSERT queries** to insert into both `_secUsers` and `UserExtension`
3. **Update UPDATE queries** to update appropriate table based on field

### Phase 3: Column Removal
1. **Remove extended columns** from `_secUsers` table
2. **Update foreign key constraints** if needed
3. **Test all functionality** after column removal

## Query Patterns to Update

### SELECT Pattern (Current)
```sql
SELECT 
  u.PersonNo,
  u.UserID,
  u.EmailVerified,
  u.LastLogin,
  u.CreatedAt,
  u.UpdatedAt,
  u.LineID,
  u.AvatarUrl,
  u.IsActive,
  -- other fields
FROM _secUsers u
LEFT JOIN _secUserGroups g ON u.GroupNo = g.GroupNo
LEFT JOIN Person p ON u.PersonNo = p.PERSONNO
```

### SELECT Pattern (After Migration)
```sql
SELECT 
  u.PersonNo,
  u.UserID,
  ue.EmailVerified,
  ue.LastLogin,
  ue.CreatedAt,
  ue.UpdatedAt,
  ue.LineID,
  ue.AvatarUrl,
  ue.IsActive,
  -- other fields
FROM _secUsers u
LEFT JOIN UserExtension ue ON u.UserID = ue.UserID
LEFT JOIN _secUserGroups g ON u.GroupNo = g.GroupNo
LEFT JOIN Person p ON u.PersonNo = p.PERSONNO
```

### UPDATE Pattern (Current)
```sql
UPDATE _secUsers 
SET LastLogin = GETDATE() 
WHERE UserID = @userID
```

### UPDATE Pattern (After Migration)
```sql
UPDATE UserExtension 
SET LastLogin = GETDATE() 
WHERE UserID = @userID
```

## Risk Assessment

### High Risk Areas
1. **Authentication flow** - Critical for system access
2. **User profile management** - Core user functionality
3. **Ticket assignment** - Business critical functionality

### Medium Risk Areas
1. **Dashboard queries** - Reporting functionality
2. **User listing** - Administrative functions

### Low Risk Areas
1. **Work request mapping** - Utility functions

## Testing Strategy
1. **Unit tests** for each modified controller method
2. **Integration tests** for authentication flow
3. **End-to-end tests** for user management workflows
4. **Performance tests** to ensure JOINs don't impact performance

## Rollback Plan
1. **Keep original columns** in `_secUsers` during migration
2. **Maintain data sync** between tables during transition
3. **Quick rollback** by reverting queries if issues arise
4. **Data restoration** from backup if needed

## Implementation Order
1. **Phase 1**: Update authentication and middleware (highest impact)
2. **Phase 2**: Update user management controllers
3. **Phase 3**: Update ticket and dashboard controllers
4. **Phase 4**: Update utility controllers
5. **Phase 5**: Remove original columns from `_secUsers`

## Notes
- The `UserExtension` table has been created successfully
- All extended columns are currently present in `_secUsers` table
- Foreign key constraint ensures data integrity
- Default values set for `CreatedAt`, `UpdatedAt`, and `IsActive`
