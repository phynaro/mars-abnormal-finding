# User Management System for L3 Users

This document describes the comprehensive user management system that allows L3 (Administrator) users to manage user accounts, roles, and permissions within the CMMS application.

## Overview

The user management system provides L3 users with the ability to:
- View all users in the system
- Create new user accounts
- Edit existing user information
- Manage user roles and permission levels
- Deactivate user accounts
- Reset user passwords
- View user activity logs
- Manage system roles and permissions

## Access Control

### Permission Levels
- **Level 1 (Operator)**: Basic access to dashboard and tickets
- **Level 2 (Manager)**: Enhanced access including reports and machine management
- **Level 3 (Administrator)**: Full system access including user management

### Required Permissions
Only users with **permission level 3** can access the user management features.

## Features

### 1. User Management Page (`/users` or `/users/list`)

#### User List View
- Displays all users in a comprehensive table
- Shows user avatar, name, username, contact info, department, role, status, and last login
- Color-coded permission level badges
- Search functionality by name, username, or email
- Filter by role and status (active/inactive)

#### User Actions
- **View**: Detailed user information modal
- **Edit**: Update user details, role, and permissions
- **Delete**: Soft delete (deactivate) user accounts

#### Create New User
- Form to create new user accounts
- Required fields: username, email, password, first name, last name, role
- Optional fields: employee ID, department, shift
- Automatic permission level assignment based on role

### 2. Role Management Page (`/users/roles`)

#### Role Overview
- Grid view of all system roles
- Shows role name, description, permission level, and assigned permissions
- Visual permission indicators with icons

#### Role Actions
- **Create**: Define new roles with specific permissions
- **Edit**: Modify existing role permissions (except admin role)
- **Delete**: Remove custom roles (admin role is protected)

#### Available Permissions
- Dashboard Access
- Ticket Management (basic and admin)
- Machine Management (basic and admin)
- Reports Access (basic and admin)
- User Management
- Role Management
- System Settings
- Audit Logs

### 3. User Details Modal

#### Information Display
- Personal details (name, username, email)
- Work information (employee ID, department, shift)
- Account status and role
- Creation date and last login
- Permission level indicator

### 4. Edit User Modal

#### Editable Fields
- Personal information
- Work details
- Role and permission level
- Account status (active/inactive)

#### Security Features
- Cannot edit own account through this interface
- Role changes require L3 permissions
- Email uniqueness validation

## API Endpoints

### User Management
- `GET /api/users/all` - Get all users (L3 only)
- `GET /api/users/:userId` - Get specific user
- `POST /api/users` - Create new user (L3 only)
- `PUT /api/users/:userId` - Update user (L3 only)
- `DELETE /api/users/:userId` - Deactivate user (L3 only)

### Role Management
- `GET /api/users/roles` - Get all roles
- `PUT /api/users/:userId/role` - Update user role (L3 only)

### Password Management
- `PUT /api/users/:userId/password` - Reset user password (L3 only)

### Activity and Bulk Operations
- `GET /api/users/:userId/activity` - Get user activity logs (L3 only)
- `PUT /api/users/bulk-update` - Bulk update users (L3 only)

## Security Features

### Access Control
- JWT token authentication required for all endpoints
- Permission level verification on sensitive operations
- Role-based access control (RBAC)

### Data Protection
- Passwords are hashed using bcrypt
- Sensitive user data is filtered from responses
- Soft delete prevents data loss

### Validation
- Input validation for all user data
- Email and username uniqueness checks
- Permission level range validation

## Usage Examples

### Creating a New User
1. Navigate to User Management page
2. Click "Add User" button
3. Fill in required information:
   - Username: `newuser`
   - Email: `newuser@company.com`
   - Password: `securepassword123`
   - First Name: `John`
   - Last Name: `Doe`
   - Role: `operator`
4. Click "Create User"

### Managing User Roles
1. Navigate to Role Management page
2. Click edit button on desired role
3. Modify permissions by checking/unchecking boxes
4. Update permission level if needed
5. Click "Update Role"

### Bulk User Updates
1. Use the bulk update API endpoint
2. Provide array of user updates
3. Each update should include `userId` and `updates` object
4. System processes all updates in sequence

## Default Roles

### Administrator (Level 3)
- Full system access
- All permissions enabled
- Cannot be modified or deleted
- Username: `admin`

### Manager (Level 2)
- Dashboard access
- Ticket management (full control)
- Machine management
- Reports access
- Username: `manager`

### Operator (Level 1)
- Dashboard access
- Basic ticket management
- Username: `operator`

## Testing

### Test Accounts
All test accounts use the password: `password`

- **Admin**: `admin@company.com` / `password`
- **Manager**: `manager@company.com` / `password`
- **Operator**: `operator@company.com` / `password`

### Testing Scenarios
1. **L3 User Access**: Verify admin can access all features
2. **L2 User Access**: Verify manager cannot access user management
3. **L1 User Access**: Verify operator has limited access
4. **User Creation**: Test creating users with different roles
5. **Role Management**: Test creating and editing custom roles
6. **Permission Changes**: Test updating user permissions

## Error Handling

### Common Error Responses
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User or role not found
- `400 Bad Request`: Invalid input data
- `409 Conflict`: Username/email already exists
- `500 Internal Server Error`: Server-side issues

### Error Messages
- Clear, user-friendly error messages
- Detailed logging for debugging
- Validation feedback for form inputs

## Future Enhancements

### Planned Features
- User activity timeline
- Advanced search and filtering
- User import/export functionality
- Audit trail for user changes
- Email notifications for account changes
- Two-factor authentication support
- User session management

### Integration Possibilities
- LDAP/Active Directory integration
- Single Sign-On (SSO) support
- API rate limiting
- Real-time user status updates

## Troubleshooting

### Common Issues
1. **Permission Denied**: Ensure user has L3 permissions
2. **User Not Found**: Check if user ID is correct
3. **Validation Errors**: Verify all required fields are filled
4. **Role Update Failed**: Ensure role exists and is not protected

### Debug Information
- Check browser console for JavaScript errors
- Verify API endpoint responses
- Check server logs for backend errors
- Confirm JWT token is valid and not expired

## Support

For technical support or questions about the user management system:
- Check the application logs
- Review this documentation
- Contact the development team
- Submit an issue through the project repository

---

**Note**: This system is designed for internal use and should not be exposed to public networks without proper security measures.
