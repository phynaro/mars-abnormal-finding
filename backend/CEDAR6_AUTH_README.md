# Cedar6_Mars Authentication System

This document describes the updated authentication system that integrates with the existing Cedar6_Mars database security tables.

## Overview

The authentication system now uses the existing Cedar6_Mars database tables:
- `_secUsers` - User accounts and authentication
- `_secUserGroups` - User groups/roles
- `_secUserGroupPrivileges` - Group-based permissions
- `_secUserPermissions` - Individual user permissions
- `Person` - Person information linked to users

## Key Changes

### 1. Password Hashing
- **Old**: bcrypt with salt rounds
- **New**: MD5 hashing (as used in Cedar6_Mars)
- Uses `crypto-js` library for MD5 hashing

### 2. User Groups vs Roles
- **Old**: Custom roles (L1_Operator, L2_Engineer, L3_Manager)
- **New**: Cedar6_Mars user groups:
  - `ADMIN` - Administrator
  - `MP` - Assistance Engineer / Maintenance Planner
  - `MM` - Maintenance Manager
  - `MT` - Maintenance Technician
  - `ME` - Maintenance Engineer
  - `MA` - Plant Maintenance Administrator
  - `OP` - Operation
  - `OS` - Operation Supervisor
  - `ST` - STORE
  - `SP` - Supplier

### 3. Permission System
- **Old**: Simple permission levels (1, 2, 3)
- **New**: Form-based permissions with granular control:
  - View permissions (`HaveView`)
  - Save permissions (`HaveSave`)
  - Delete permissions (`HaveDelete`)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/profile` - Get user profile

### Permissions
- `GET /api/auth/permissions` - Get all user permissions
- `POST /api/auth/check-permission` - Check specific permission

## User Object Structure

```javascript
{
  id: 1,                    // PersonNo from Person table
  userId: "ADMIN",         // UserID from _secUsers
  username: "ADMIN",       // Same as userId
  personCode: "ADMIN",     // PERSONCODE from Person table
  firstName: "ADMIN",      // FIRSTNAME from Person table
  lastName: "SYSTEM",      // LASTNAME from Person table
  fullName: "ADMIN SYSTEM", // PERSON_NAME from Person table
  email: "test@mail.com",  // EMAIL from Person table
  phone: "1234567890",     // PHONE from Person table
  title: "System Admin",   // TITLE from Person table
  department: 1,           // DEPTNO from Person table
  craft: 1,                // CRAFTNO from Person table
  crew: 1,                 // CREWNO from Person table
  siteNo: 1,               // SiteNo from Person table
  groupNo: 1,              // GroupNo from _secUsers
  groupCode: "ADMIN",      // UserGCode from _secUserGroups
  groupName: "Administrator", // UserGName from _secUserGroups
  levelReport: 1,          // LevelReport from _secUsers
  storeRoom: 1,            // StoreRoom from _secUsers
  dbNo: 1,                 // DBNo from _secUsers
  lineId: "LINE1",         // LineID from _secUsers
  avatarUrl: "/avatar.jpg", // AvatarUrl from _secUsers
  lastLogin: "2024-01-01", // LastLogin from _secUsers
  createdAt: "2024-01-01", // CreatedAt from _secUsers
  permissions: {           // Computed permissions
    groupPrivileges: [...], // From _secUserGroupPrivileges
    userPermissions: [...] // From _secUserPermissions
  }
}
```

## Middleware Functions

### Group-based Access Control
```javascript
const { requireAdmin, requireMaintenancePlanner } = require('../middleware/auth');

// Require specific group
router.get('/admin-only', requireAdmin, adminController);
router.get('/maintenance', requireMaintenancePlanner, maintenanceController);
```

### Form-based Permissions
```javascript
const { requireFormPermission } = require('../middleware/auth');

// Require specific form permission
router.get('/work-orders', requireFormPermission('WO', 'view'), woController);
router.post('/work-orders', requireFormPermission('WO', 'save'), woController);
router.delete('/work-orders/:id', requireFormPermission('WO', 'delete'), woController);
```

### Permission Level Control
```javascript
const { requirePermissionLevel } = require('../middleware/auth');

// Require minimum permission level
router.get('/reports', requirePermissionLevel(2), reportsController);
```

## Permission Checking

### In Controllers
```javascript
const { hasPermission } = require('../controllers/authController');

// Check permission in controller
const canViewWO = await hasPermission(req.user.userId, req.user.groupNo, 'WO', 'view');
const canSaveWO = await hasPermission(req.user.userId, req.user.groupNo, 'WO', 'save');

if (!canViewWO) {
  return res.status(403).json({ message: 'No permission to view work orders' });
}
```

### In Frontend
```javascript
// Check permission via API
const response = await axios.post('/api/auth/check-permission', {
  formId: 'WO',
  action: 'view'
});

if (response.data.hasPermission) {
  // Show work order interface
}
```

## Common Form IDs

Based on the Cedar6_Mars system, common form IDs include:
- `WO` - Work Orders
- `WR` - Work Requests
- `PM` - Preventive Maintenance
- `EQ` - Equipment
- `IV` - Inventory
- `PE` - Personnel
- `PU` - Production Units
- `RT` - Reports

## Migration Notes

1. **No User Registration**: Users must be created in the Cedar6_Mars system
2. **Password Management**: Passwords are managed through the existing system
3. **Email Verification**: Uses existing EmailVerified field
4. **Account Expiration**: Respects ExpireDate and NeverExpireFlag fields

## Testing

Use the test script to verify the system:
```bash
node test_cedar6_auth.js
```

## Security Considerations

1. **MD5 Hashing**: While MD5 is used for compatibility, consider upgrading to stronger hashing in the future
2. **Token Expiration**: JWT tokens expire after 24 hours
3. **Permission Caching**: Permissions are included in JWT token for performance
4. **Database Connection**: Uses connection pooling for better performance
