const bcrypt = require('bcryptjs');
const sql = require('mssql');
const dbConfig = require('../config/dbConfig');

// Helper function to get database connection
async function getConnection() {
  try {
    const pool = await sql.connect(dbConfig);
    return pool;
  } catch (err) {
    console.error('Database connection error:', err);
    throw new Error('Database connection failed');
  }
}

// Helper function to get default permissions based on permission level
function getDefaultPermissions(permissionLevel) {
  switch (permissionLevel) {
    case 3:
      return ['all'];
    case 2:
      return ['dashboard', 'tickets', 'tickets-admin', 'machines', 'reports'];
    case 1:
      return ['dashboard', 'tickets'];
    default:
      return ['dashboard'];
  }
}

const userManagementController = {
  // Get all users (L3 only)
  getAllUsers: async (req, res) => {
    try {
      // Check if user has L3 permissions
      if (req.user.permissionLevel < 3) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Requires L3 permissions.'
        });
      }

      try {
        const pool = await getConnection();
        
        // Get all users with role information
        const result = await pool.request()
          .query(`
            SELECT u.UserID, u.Username, u.Email, u.FirstName, u.LastName, 
                   u.EmployeeID, u.Department, u.Shift, u.LastLogin, u.CreatedAt,
                   r.RoleName as role, r.PermissionLevel as permissionLevel,
                   CASE WHEN u.IsActive = 1 THEN 1 ELSE 0 END as isActive
            FROM Users u
            JOIN Roles r ON u.RoleID = r.RoleID
            WHERE u.IsActive = 1
            ORDER BY u.CreatedAt DESC
          `);

        const users = result.recordset.map(user => ({
          id: user.UserID,
          username: user.Username,
          email: user.Email,
          firstName: user.FirstName,
          lastName: user.LastName,
          employeeID: user.EmployeeID,
          department: user.Department,
          shift: user.Shift,
          role: user.role,
          permissionLevel: user.permissionLevel,
          lastLogin: user.LastLogin,
          createdAt: user.CreatedAt,
          isActive: user.isActive === 1
        }));

        res.json({
          success: true,
          users: users
        });
      } catch (dbError) {
        console.error('Database error, using fallback data:', dbError);
        
        // Fallback to mock data for development
        const fallbackUsers = [
          {
            id: 1,
            username: 'admin',
            email: 'admin@company.com',
            firstName: 'System',
            lastName: 'Administrator',
            employeeID: 'EMP001',
            department: 'IT',
            shift: 'Day',
            role: 'admin',
            permissionLevel: 3,
            lastLogin: new Date().toISOString(),
            createdAt: new Date('2024-01-01').toISOString(),
            isActive: true
          },
          {
            id: 2,
            username: 'manager',
            email: 'manager@company.com',
            firstName: 'John',
            lastName: 'Manager',
            employeeID: 'EMP002',
            department: 'Operations',
            shift: 'Day',
            role: 'manager',
            permissionLevel: 2,
            lastLogin: new Date(Date.now() - 86400000).toISOString(),
            createdAt: new Date('2024-01-15').toISOString(),
            isActive: true
          },
          {
            id: 3,
            username: 'operator',
            email: 'operator@company.com',
            firstName: 'Jane',
            lastName: 'Operator',
            employeeID: 'EMP003',
            department: 'Production',
            shift: 'Night',
            role: 'operator',
            permissionLevel: 1,
            lastLogin: null,
            createdAt: new Date('2024-02-01').toISOString(),
            isActive: true
          }
        ];

        res.json({
          success: true,
          users: fallbackUsers
        });
      }
    } catch (error) {
      console.error('Get All Users Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users'
      });
    }
  },

  // Get user by ID
  getUserById: async (req, res) => {
    try {
      const { userId } = req.params;

      // Check if user has permission to view this user
      if (req.user.permissionLevel < 3 && req.user.id !== parseInt(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      try {
        const pool = await getConnection();
        
        // Get user with role information
        const result = await pool.request()
          .input('userID', sql.Int, parseInt(userId))
          .query(`
            SELECT u.UserID, u.Username, u.Email, u.FirstName, u.LastName, 
                   u.EmployeeID, u.Department, u.Shift, u.LastLogin, u.CreatedAt,
                   r.RoleName as role, r.PermissionLevel as permissionLevel,
                   CASE WHEN u.IsActive = 1 THEN 1 ELSE 0 END as isActive
            FROM Users u
            JOIN Roles r ON u.RoleID = r.RoleID
            WHERE u.UserID = @userID AND u.IsActive = 1
          `);

        if (result.recordset.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        const user = result.recordset[0];
        const userData = {
          id: user.UserID,
          username: user.Username,
          email: user.Email,
          firstName: user.FirstName,
          lastName: user.LastName,
          employeeID: user.EmployeeID,
          department: user.Department,
          shift: user.Shift,
          role: user.role,
          permissionLevel: user.permissionLevel,
          lastLogin: user.LastLogin,
          createdAt: user.CreatedAt,
          isActive: user.isActive === 1
        };

        res.json({
          success: true,
          user: userData
        });
      } catch (dbError) {
        console.error('Database error, using fallback data:', dbError);
        
        // Fallback to mock data for development
        const fallbackUsers = [
          {
            id: 1,
            username: 'admin',
            email: 'admin@company.com',
            firstName: 'System',
            lastName: 'Administrator',
            employeeID: 'EMP001',
            department: 'IT',
            shift: 'Day',
            role: 'admin',
            permissionLevel: 3,
            lastLogin: new Date().toISOString(),
            createdAt: new Date('2024-01-01').toISOString(),
            isActive: true
          },
          {
            id: 2,
            username: 'manager',
            email: 'manager@company.com',
            firstName: 'John',
            lastName: 'Manager',
            employeeID: 'EMP002',
            department: 'Operations',
            shift: 'Day',
            role: 'manager',
            permissionLevel: 2,
            lastLogin: new Date(Date.now() - 86400000).toISOString(),
            createdAt: new Date('2024-01-15').toISOString(),
            isActive: true
          },
          {
            id: 3,
            username: 'operator',
            email: 'operator@company.com',
            firstName: 'Jane',
            lastName: 'Operator',
            employeeID: 'EMP003',
            department: 'Production',
            shift: 'Night',
            role: 'operator',
            permissionLevel: 1,
            lastLogin: null,
            createdAt: new Date('2024-02-01').toISOString(),
            isActive: true
          }
        ];

        const user = fallbackUsers.find(u => u.id === parseInt(userId));
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        res.json({
          success: true,
          user: user
        });
      }
    } catch (error) {
      console.error('Get User By ID Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user'
      });
    }
  },

  // Create new user
  createUser: async (req, res) => {
    try {
      // Check if user has L3 permissions
      if (req.user.permissionLevel < 3) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Requires L3 permissions.'
        });
      }

      const {
        username,
        email,
        password,
        firstName,
        lastName,
        employeeID,
        department,
        shift,
        role,
        permissionLevel
      } = req.body;

      // Validation
      if (!username || !email || !password || !firstName || !lastName || !role) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      try {
        const pool = await getConnection();
        
        // Check if username or email already exists
        const existingUser = await pool.request()
          .input('username', sql.NVarChar, username)
          .input('email', sql.NVarChar, email)
          .query('SELECT UserID FROM Users WHERE Username = @username OR Email = @email');

        if (existingUser.recordset.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Username or email already exists'
          });
        }

        // Get role ID based on role name
        const roleResult = await pool.request()
          .input('roleName', sql.NVarChar, role)
          .query('SELECT RoleID, PermissionLevel FROM Roles WHERE RoleName = @roleName');

        if (roleResult.recordset.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Invalid role specified'
          });
        }

        const roleInfo = roleResult.recordset[0];
        const actualPermissionLevel = permissionLevel || roleInfo.PermissionLevel;

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const result = await pool.request()
          .input('username', sql.NVarChar, username)
          .input('email', sql.NVarChar, email)
          .input('passwordHash', sql.NVarChar, hashedPassword)
          .input('firstName', sql.NVarChar, firstName)
          .input('lastName', sql.NVarChar, lastName)
          .input('employeeID', sql.NVarChar, employeeID || null)
          .input('department', sql.NVarChar, department || null)
          .input('shift', sql.NVarChar, shift || null)
          .input('roleID', sql.Int, roleInfo.RoleID)
          .query(`
            INSERT INTO Users (Username, Email, PasswordHash, FirstName, LastName, EmployeeID, Department, Shift, RoleID, IsActive, CreatedAt)
            OUTPUT INSERTED.UserID, INSERTED.Username, INSERTED.Email, INSERTED.FirstName, INSERTED.LastName, INSERTED.CreatedAt
            VALUES (@username, @email, @passwordHash, @firstName, @lastName, @employeeID, @department, @shift, @roleID, 1, GETDATE())
          `);

        const newUser = result.recordset[0];
        const userData = {
          id: newUser.UserID,
          username: newUser.Username,
          email: newUser.Email,
          firstName: newUser.FirstName,
          lastName: newUser.LastName,
          employeeID: employeeID || null,
          department: department || null,
          shift: shift || null,
          role: role,
          permissionLevel: actualPermissionLevel,
          lastLogin: null,
          createdAt: newUser.CreatedAt,
          isActive: true
        };

        res.status(201).json({
          success: true,
          message: 'User created successfully',
          user: userData
        });
      } catch (dbError) {
        console.error('Database error:', dbError);
        res.status(500).json({
          success: false,
          message: 'Failed to create user due to database error'
        });
      }
    } catch (error) {
      console.error('Create User Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create user'
      });
    }
  },

  // Update user
  updateUser: async (req, res) => {
    try {
      const { userId } = req.params;

      // Check if user has permission to update this user
      if (req.user.permissionLevel < 3 && req.user.id !== parseInt(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const updateData = req.body;

      try {
        const pool = await getConnection();
        
        // Check if user exists
        const userResult = await pool.request()
          .input('userID', sql.Int, parseInt(userId))
          .query('SELECT UserID, Email FROM Users WHERE UserID = @userID AND IsActive = 1');

        if (userResult.recordset.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        const existingUser = userResult.recordset[0];

        // Check if email is being changed and if it already exists
        if (updateData.email && updateData.email !== existingUser.Email) {
          const emailCheck = await pool.request()
            .input('email', sql.NVarChar, updateData.email)
            .input('userID', sql.Int, parseInt(userId))
            .query('SELECT UserID FROM Users WHERE Email = @email AND UserID != @userID');

          if (emailCheck.recordset.length > 0) {
            return res.status(400).json({
              success: false,
              message: 'Email already exists'
            });
          }
        }

        // Build update query dynamically
        let updateFields = [];

        if (updateData.firstName !== undefined) {
          updateFields.push('FirstName = @firstName');
          params.firstName = sql.NVarChar, updateData.firstName;
        }
        if (updateData.lastName !== undefined) {
          updateFields.push('LastName = @lastName');
          params.lastName = sql.NVarChar, updateData.lastName;
        }
        if (updateData.email !== undefined) {
          updateFields.push('Email = @email');
          params.email = sql.NVarChar, updateData.email;
        }
        if (updateData.employeeID !== undefined) {
          updateFields.push('EmployeeID = @employeeID');
          params.employeeID = sql.NVarChar, updateData.employeeID;
        }
        if (updateData.department !== undefined) {
          updateFields.push('Department = @department');
          params.department = sql.NVarChar, updateData.department;
        }
        if (updateData.shift !== undefined) {
          updateFields.push('Shift = @shift');
          params.shift = sql.NVarChar, updateData.shift;
        }
        if (updateData.isActive !== undefined) {
          updateFields.push('IsActive = @isActive');
          params.isActive = sql.Bit, updateData.isActive ? 1 : 0;
        }

        // Update user if there are fields to update
        if (updateFields.length > 0) {
          const updateQuery = `
            UPDATE Users 
            SET ${updateFields.join(', ')}, UpdatedAt = GETDATE()
            WHERE UserID = @userID
          `;

          await pool.request()
            .input('userID', sql.Int, parseInt(userId))
            .input('firstName', sql.NVarChar, updateData.firstName)
            .input('lastName', sql.NVarChar, updateData.lastName)
            .input('email', sql.NVarChar, updateData.email)
            .input('employeeID', sql.NVarChar, updateData.employeeID)
            .input('department', sql.NVarChar, updateData.department)
            .input('shift', sql.NVarChar, updateData.shift)
            .input('isActive', sql.Bit, updateData.isActive ? 1 : 0)
            .query(updateQuery);
        }

        // Get updated user data
        const updatedUserResult = await pool.request()
          .input('userID', sql.Int, parseInt(userId))
          .query(`
            SELECT u.UserID, u.Username, u.Email, u.FirstName, u.LastName, 
                   u.EmployeeID, u.Department, u.Shift, u.LastLogin, u.CreatedAt,
                   r.RoleName as role, r.PermissionLevel as permissionLevel,
                   CASE WHEN u.IsActive = 1 THEN 1 ELSE 0 END as isActive
            FROM Users u
            JOIN Roles r ON u.RoleID = r.RoleID
            WHERE u.UserID = @userID
          `);

        const updatedUser = updatedUserResult.recordset[0];
        const userData = {
          id: updatedUser.UserID,
          username: updatedUser.Username,
          email: updatedUser.Email,
          firstName: updatedUser.FirstName,
          lastName: updatedUser.LastName,
          employeeID: updatedUser.EmployeeID,
          department: updatedUser.Department,
          shift: updatedUser.Shift,
          role: updatedUser.role,
          permissionLevel: updatedUser.permissionLevel,
          lastLogin: updatedUser.LastLogin,
          createdAt: updatedUser.CreatedAt,
          isActive: updatedUser.isActive === 1
        };

        res.json({
          success: true,
          message: 'User updated successfully',
          user: userData
        });
      } catch (dbError) {
        console.error('Database error:', dbError);
        res.status(500).json({
          success: false,
          message: 'Failed to update user due to database error'
        });
      }
    } catch (error) {
      console.error('Update User Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user'
      });
    }
  },

  // Delete user (soft delete)
  deleteUser: async (req, res) => {
    try {
      const { userId } = req.params;

      // Check if user has L3 permissions
      if (req.user.permissionLevel < 3) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Requires L3 permissions.'
        });
      }

      // Prevent deleting own account
      if (req.user.id === parseInt(userId)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account'
        });
      }

      try {
        const pool = await getConnection();
        
        // Check if user exists
        const userResult = await pool.request()
          .input('userID', sql.Int, parseInt(userId))
          .query('SELECT UserID FROM Users WHERE UserID = @userID AND IsActive = 1');

        if (userResult.recordset.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

                // Soft delete by setting isActive to false
        await pool.request()
          .input('userID', sql.Int, parseInt(userId))
          .query('UPDATE Users SET IsActive = 0, UpdatedAt = GETDATE() WHERE UserID = @userID');

        res.json({
          success: true,
          message: 'User deactivated successfully'
        });
      } catch (dbError) {
        console.error('Database error:', dbError);
        res.status(500).json({
          success: false,
          message: 'Failed to delete user due to database error'
        });
      }
    } catch (error) {
      console.error('Delete User Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user'
      });
    }
  },

  // Update user role
  updateUserRole: async (req, res) => {
    try {
      const { userId } = req.params;
      const { role, permissionLevel } = req.body;

      // Check if user has L3 permissions
      if (req.user.permissionLevel < 3) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Requires L3 permissions.'
        });
      }

      const userIndex = users.findIndex(u => u.id === parseInt(userId));

      if (userIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Prevent changing own role
      if (req.user.id === parseInt(userId)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot change your own role'
        });
      }

      // Update role and permission level
      users[userIndex].role = role;
      users[userIndex].permissionLevel = permissionLevel;

      res.json({
        success: true,
        message: 'User role updated successfully'
      });
    } catch (error) {
      console.error('Update User Role Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user role'
      });
    }
  },

  // Get all roles
  getRoles: async (req, res) => {
    try {
      try {
        const pool = await getConnection();
        
        // Get all roles with permissions
        const result = await pool.request()
          .query(`
            SELECT RoleID as id, RoleName as name, RoleDescription as description, 
                   PermissionLevel as permissionLevel
            FROM Roles
            ORDER BY PermissionLevel DESC
          `);

        const roles = result.recordset.map(role => ({
          id: role.name.toLowerCase(),
          name: role.name,
          description: role.description || `${role.name} role`,
          permissionLevel: role.permissionLevel,
          permissions: getDefaultPermissions(role.permissionLevel)
        }));

        res.json({
          success: true,
          roles: roles
        });
      } catch (dbError) {
        console.error('Database error, using fallback roles:', dbError);
        
        // Fallback to mock data for development
        const fallbackRoles = [
          {
            id: 'admin',
            name: 'Administrator',
            description: 'Full system access',
            permissionLevel: 3,
            permissions: ['all']
          },
          {
            id: 'manager',
            name: 'Manager',
            description: 'Department management',
            permissionLevel: 2,
            permissions: ['dashboard', 'tickets', 'tickets-admin', 'machines', 'reports']
          },
          {
            id: 'operator',
            name: 'Operator',
            description: 'Basic operations',
            permissionLevel: 1,
            permissions: ['dashboard', 'tickets']
          }
        ];

        res.json({
          success: true,
          roles: fallbackRoles
        });
      }
    } catch (error) {
      console.error('Get Roles Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch roles'
      });
    }
  },

  // Reset user password
  resetUserPassword: async (req, res) => {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body;

      // Check if user has L3 permissions
      if (req.user.permissionLevel < 3) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Requires L3 permissions.'
        });
      }

      const userIndex = users.findIndex(u => u.id === parseInt(userId));

      if (userIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      users[userIndex].password = hashedPassword;

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      console.error('Reset Password Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password'
      });
    }
  },

  // Get user activity logs (placeholder)
  getUserActivityLogs: async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 50 } = req.query;

      // Check if user has L3 permissions
      if (req.user.permissionLevel < 3) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Requires L3 permissions.'
        });
      }

      // Mock activity logs
      const logs = [
        {
          id: 1,
          action: 'login',
          timestamp: new Date().toISOString(),
          details: 'User logged in successfully'
        },
        {
          id: 2,
          action: 'profile_update',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          details: 'Profile information updated'
        }
      ];

      res.json({
        success: true,
        logs: logs.slice(0, parseInt(limit))
      });
    } catch (error) {
      console.error('Get User Activity Logs Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user activity logs'
      });
    }
  },

  // Bulk update users
  bulkUpdateUsers: async (req, res) => {
    try {
      const { updates } = req.body;

      // Check if user has L3 permissions
      if (req.user.permissionLevel < 3) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Requires L3 permissions.'
        });
      }

      if (!Array.isArray(updates)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid updates format'
        });
      }

      const results = [];
      for (const update of updates) {
        const { userId, updates: userUpdates } = update;
        const userIndex = users.findIndex(u => u.id === userId);

        if (userIndex !== -1) {
          // Apply updates
          Object.assign(users[userIndex], userUpdates);
          results.push({ userId, success: true });
        } else {
          results.push({ userId, success: false, message: 'User not found' });
        }
      }

      res.json({
        success: true,
        message: 'Bulk update completed',
        results
      });
    } catch (error) {
      console.error('Bulk Update Users Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk update users'
      });
    }
  }
};

module.exports = userManagementController;
