const sql = require('mssql');
const dbConfig = require('../config/dbConfig');
const { hashPasswordMD5 } = require('./authController');

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

const userManagementController = {
  // Get all users (Admin only)
  getAllUsers: async (req, res) => {
    try {
      // Check if user has admin permissions (GroupCode = 'ADMIN' or similar)
      if (req.user.groupCode !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Requires admin permissions.'
        });
      }

      try {
        const pool = await getConnection();
        
        // Get all users with group and person information
        const result = await pool.request()
          .query(`
            SELECT 
              u.PersonNo,
              u.UserID,
              u.GroupNo,
              u.LevelReport,
              u.StoreRoom,
              u.DBNo,
              u.StartDate,
              u.LastDate,
              u.ExpireDate,
              u.NeverExpireFlag,
              u.EmailVerified,
              u.LastLogin,
              u.CreatedAt,
              u.UpdatedAt,
              u.LineID,
              u.AvatarUrl,
              u.IsActive,
              g.UserGCode,
              g.UserGName,
              p.PERSONCODE,
              p.FIRSTNAME,
              p.LASTNAME,
              p.EMAIL,
              p.PHONE,
              p.TITLE,
              p.DEPTNO,
              p.CRAFTNO,
              p.CREWNO,
              p.PERSON_NAME,
              p.SiteNo,
              p.PINCODE,
              d.DEPTCODE,
              d.DEPTNAME,
              s.SiteCode,
              s.SiteName
            FROM _secUsers u
            LEFT JOIN _secUserGroups g ON u.GroupNo = g.GroupNo
            LEFT JOIN Person p ON u.PersonNo = p.PERSONNO
            LEFT JOIN Dept d ON p.DEPTNO = d.DEPTNO
            LEFT JOIN dbo.Site s ON p.SiteNo = s.SiteNo
            WHERE (u.IsActive = 1 OR u.IsActive IS NULL)
            ORDER BY u.CreatedAt DESC
          `);

        const users = result.recordset.map(user => ({
          id: user.PersonNo,
          userId: user.UserID,
          username: user.UserID,
          personCode: user.PERSONCODE,
          firstName: user.FIRSTNAME,
          lastName: user.LASTNAME,
          fullName: user.PERSON_NAME,
          email: user.EMAIL,
          phone: user.PHONE,
          title: user.TITLE,
          department: user.DEPTNO,
          departmentCode: user.DEPTCODE,
          departmentName: user.DEPTNAME,
          craft: user.CRAFTNO,
          crew: user.CREWNO,
          siteNo: user.SiteNo,
          siteCode: user.SiteCode,
          siteName: user.SiteName,
          groupNo: user.GroupNo,
          groupCode: user.UserGCode,
          groupName: user.UserGName,
          levelReport: user.LevelReport,
          storeRoom: user.StoreRoom,
          dbNo: user.DBNo,
          lineId: user.LineID,
          avatarUrl: user.AvatarUrl,
          lastLogin: user.LastLogin,
          createdAt: user.CreatedAt,
          isActive: user.IsActive === 1 || user.IsActive === null
        }));

        res.json({
          success: true,
          users: users
        });
      } catch (dbError) {
        console.error('Database error:', dbError);
        res.status(500).json({
          success: false,
          message: 'Failed to fetch users',
          error: dbError.message
        });
      }
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // Get user by ID
  getUserById: async (req, res) => {
    try {
      const { userId } = req.params;

      // Check if user has admin permissions
      if (req.user.groupCode !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Requires admin permissions.'
        });
      }

      const pool = await getConnection();
      
      const result = await pool.request()
        .input('userID', sql.VarChar(50), userId)
        .query(`
          SELECT 
            u.PersonNo,
            u.UserID,
            u.GroupNo,
            u.LevelReport,
            u.StoreRoom,
            u.DBNo,
            u.StartDate,
            u.LastDate,
            u.ExpireDate,
            u.NeverExpireFlag,
            u.EmailVerified,
            u.LastLogin,
            u.CreatedAt,
            u.UpdatedAt,
            u.LineID,
            u.AvatarUrl,
            u.IsActive,
            g.UserGCode,
            g.UserGName,
            p.PERSONCODE,
            p.FIRSTNAME,
            p.LASTNAME,
            p.EMAIL,
            p.PHONE,
            p.TITLE,
            p.DEPTNO,
            p.CRAFTNO,
            p.CREWNO,
            p.PERSON_NAME,
            p.SiteNo,
            p.PINCODE,
            d.DEPTCODE,
            d.DEPTNAME,
            s.SiteCode,
            s.SiteName
          FROM _secUsers u
          LEFT JOIN _secUserGroups g ON u.GroupNo = g.GroupNo
          LEFT JOIN Person p ON u.PersonNo = p.PERSONNO
          LEFT JOIN Dept d ON p.DEPTNO = d.DEPTNO
          LEFT JOIN dbo.Site s ON p.SiteNo = s.SiteNo
          WHERE u.UserID = @userID AND (u.IsActive = 1 OR u.IsActive IS NULL)
        `);

      if (result.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = result.recordset[0];
      const userData = {
        id: user.PersonNo,
        userId: user.UserID,
        username: user.UserID,
        personCode: user.PERSONCODE,
        firstName: user.FIRSTNAME,
        lastName: user.LASTNAME,
        fullName: user.PERSON_NAME,
        email: user.EMAIL,
        phone: user.PHONE,
        title: user.TITLE,
        department: user.DEPTNO,
        departmentCode: user.DEPTCODE,
        departmentName: user.DEPTNAME,
        craft: user.CRAFTNO,
        crew: user.CREWNO,
        siteNo: user.SiteNo,
        siteCode: user.SiteCode,
        siteName: user.SiteName,
        groupNo: user.GroupNo,
        groupCode: user.UserGCode,
        groupName: user.UserGName,
        levelReport: user.LevelReport,
        storeRoom: user.StoreRoom,
        dbNo: user.DBNo,
        lineId: user.LineID,
        avatarUrl: user.AvatarUrl,
        lastLogin: user.LastLogin,
        createdAt: user.CreatedAt,
        isActive: user.IsActive === 1 || user.IsActive === null
      };

      res.json({
        success: true,
        user: userData
      });

    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  // Create new user
  createUser: async (req, res) => {
    try {
      // Check if user has admin permissions
      if (req.user.groupCode !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Requires admin permissions.'
        });
      }

      const {
        userId,
        password,
        firstName,
        lastName,
        email,
        phone,
        title,
        department,
        craft,
        crew,
        siteNo,
        groupNo,
        levelReport,
        storeRoom,
        dbNo,
        lineId,
        personCode
      } = req.body;

      // Validation
      if (!userId || !password || !firstName || !lastName || !groupNo) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: userId, password, firstName, lastName, groupNo'
        });
      }

      const pool = await getConnection();
      
      // Check if userId already exists
      const existingUser = await pool.request()
        .input('userID', sql.VarChar(50), userId)
        .query('SELECT UserID FROM _secUsers WHERE UserID = @userID');

      if (existingUser.recordset.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'User ID already exists'
        });
      }

      // Check if group exists
      const groupResult = await pool.request()
        .input('groupNo', sql.Int, groupNo)
        .query('SELECT GroupNo, UserGCode, UserGName FROM _secUserGroups WHERE GroupNo = @groupNo');

      if (groupResult.recordset.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid group number specified'
        });
      }

      // Hash password using MD5
      const hashedPassword = hashPasswordMD5(password);

      // Start transaction
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        // 1. Create Person record
        const personResult = await transaction.request()
          .input('personCode', sql.NVarChar(20), personCode || null)
          .input('firstName', sql.NVarChar(30), firstName)
          .input('lastName', sql.NVarChar(30), lastName)
          .input('email', sql.NVarChar(200), email || null)
          .input('phone', sql.NVarChar(30), phone || null)
          .input('title', sql.NVarChar(200), title || null)
          .input('department', sql.Int, department || null)
          .input('craft', sql.Int, craft || null)
          .input('crew', sql.Int, crew || null)
          .input('siteNo', sql.Int, siteNo || null)
          .input('createUser', sql.Int, req.user.id)
          .input('createDate', sql.NVarChar(8), new Date().toISOString().slice(0, 10).replace(/-/g, ''))
          .query(`
            INSERT INTO Person (PERSONCODE, FIRSTNAME, LASTNAME, EMAIL, PHONE, TITLE, DEPTNO, CRAFTNO, CREWNO, SiteNo, PERSON_NAME, FLAGDEL, CREATEUSER, CREATEDATE)
            OUTPUT INSERTED.PERSONNO
            VALUES (@personCode, @firstName, @lastName, @email, @phone, @title, @department, @craft, @crew, @siteNo, @firstName + ' ' + @lastName, 'F', @createUser, @createDate)
          `);

        const personNo = personResult.recordset[0].PERSONNO;

        // 2. Create _secUsers record
        const secUserResult = await transaction.request()
          .input('personNo', sql.Int, personNo)
          .input('userID', sql.VarChar(50), userId)
          .input('passwd', sql.NVarChar(250), hashedPassword)
          .input('groupNo', sql.Int, groupNo)
          .input('levelReport', sql.Int, levelReport || 1)
          .input('storeRoom', sql.Int, storeRoom || 1)
          .input('dbNo', sql.Int, dbNo || 1)
          .input('lineId', sql.NVarChar(500), lineId || null)
          .input('neverExpireFlag', sql.VarChar(1), 'Y')
          .input('emailVerified', sql.NChar(10), 'Y')
          .input('isActive', sql.Bit, 1)
          .input('createUser', sql.Int, req.user.id)
          .input('createDate', sql.NVarChar(8), new Date().toISOString().slice(0, 10).replace(/-/g, ''))
          .query(`
            INSERT INTO _secUsers (PersonNo, UserID, Passwd, GroupNo, LevelReport, StoreRoom, DBNo, LineID, NeverExpireFlag, EmailVerified, IsActive, CreateUser, CreatedAt)
            OUTPUT INSERTED.PersonNo, INSERTED.UserID, INSERTED.CreatedAt
            VALUES (@personNo, @userID, @passwd, @groupNo, @levelReport, @storeRoom, @dbNo, @lineId, @neverExpireFlag, @emailVerified, @isActive, @createUser, GETDATE())
          `);

        await transaction.commit();

        const newUser = secUserResult.recordset[0];
        const userData = {
          id: newUser.PersonNo,
          userId: newUser.UserID,
          username: newUser.UserID,
          personCode: personCode,
          firstName: firstName,
          lastName: lastName,
          fullName: firstName + ' ' + lastName,
          email: email,
          phone: phone,
          title: title,
          department: department,
          craft: craft,
          crew: crew,
          siteNo: siteNo,
          groupNo: groupNo,
          levelReport: levelReport || 1,
          storeRoom: storeRoom || 1,
          dbNo: dbNo || 1,
          lineId: lineId,
          createdAt: newUser.CreatedAt,
          isActive: true
        };

        res.status(201).json({
          success: true,
          message: 'User created successfully',
          user: userData
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create user',
        error: error.message
      });
    }
  },

  // Update user
  updateUser: async (req, res) => {
    try {
      const { userId } = req.params;

      // Check if user has admin permissions
      if (req.user.groupCode !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Requires admin permissions.'
        });
      }

      const updateData = req.body;

      const pool = await getConnection();
      
      // Check if user exists
      const userResult = await pool.request()
        .input('userID', sql.VarChar(50), userId)
        .query('SELECT PersonNo, UserID FROM _secUsers WHERE UserID = @userID AND (IsActive = 1 OR IsActive IS NULL)');

      if (userResult.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = userResult.recordset[0];
      const personNo = user.PersonNo;

      // Start transaction
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        // Update Person table if personal info is provided
        if (updateData.firstName || updateData.lastName || updateData.email || updateData.phone || updateData.title || 
            updateData.department !== undefined || updateData.craft !== undefined || updateData.crew !== undefined || 
            updateData.siteNo !== undefined) {
          
          await transaction.request()
            .input('personNo', sql.Int, personNo)
            .input('firstName', sql.NVarChar(30), updateData.firstName || null)
            .input('lastName', sql.NVarChar(30), updateData.lastName || null)
            .input('email', sql.NVarChar(200), updateData.email || null)
            .input('phone', sql.NVarChar(30), updateData.phone || null)
            .input('title', sql.NVarChar(200), updateData.title || null)
            .input('department', sql.Int, updateData.department || null)
            .input('craft', sql.Int, updateData.craft || null)
            .input('crew', sql.Int, updateData.crew || null)
            .input('siteNo', sql.Int, updateData.siteNo || null)
            .input('updateUser', sql.Int, req.user.id)
            .input('updateDate', sql.NVarChar(8), new Date().toISOString().slice(0, 10).replace(/-/g, ''))
            .query(`
              UPDATE Person
              SET FIRSTNAME = COALESCE(@firstName, FIRSTNAME),
                  LASTNAME = COALESCE(@lastName, LASTNAME),
                  EMAIL = COALESCE(@email, EMAIL),
                  PHONE = COALESCE(@phone, PHONE),
                  TITLE = COALESCE(@title, TITLE),
                  DEPTNO = COALESCE(@department, DEPTNO),
                  CRAFTNO = COALESCE(@craft, CRAFTNO),
                  CREWNO = COALESCE(@crew, CREWNO),
                  SiteNo = COALESCE(@siteNo, SiteNo),
                  PERSON_NAME = COALESCE(@firstName, FIRSTNAME) + ' ' + COALESCE(@lastName, LASTNAME),
                  UPDATEUSER = @updateUser,
                  UPDATEDATE = @updateDate
              WHERE PERSONNO = @personNo
            `);
        }

        // Update _secUsers table if security info is provided
        if (updateData.groupNo !== undefined || updateData.levelReport !== undefined || 
            updateData.storeRoom !== undefined || updateData.dbNo !== undefined || 
            updateData.lineId !== undefined || updateData.isActive !== undefined) {
          
          await transaction.request()
            .input('userID', sql.VarChar(50), userId)
            .input('groupNo', sql.Int, updateData.groupNo || null)
            .input('levelReport', sql.Int, updateData.levelReport || null)
            .input('storeRoom', sql.Int, updateData.storeRoom || null)
            .input('dbNo', sql.Int, updateData.dbNo || null)
            .input('lineId', sql.NVarChar(500), updateData.lineId || null)
            .input('isActive', sql.Bit, updateData.isActive !== undefined ? updateData.isActive : null)
            .input('updateUser', sql.Int, req.user.id)
            .input('updateDate', sql.NVarChar(8), new Date().toISOString().slice(0, 10).replace(/-/g, ''))
            .query(`
              UPDATE _secUsers
              SET GroupNo = COALESCE(@groupNo, GroupNo),
                  LevelReport = COALESCE(@levelReport, LevelReport),
                  StoreRoom = COALESCE(@storeRoom, StoreRoom),
                  DBNo = COALESCE(@dbNo, DBNo),
                  LineID = COALESCE(@lineId, LineID),
                  IsActive = COALESCE(@isActive, IsActive),
                  UpdateUser = @updateUser,
                  UpdatedAt = GETDATE()
              WHERE UserID = @userID
            `);
        }

        await transaction.commit();

        res.json({
          success: true,
          message: 'User updated successfully'
        });

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user',
        error: error.message
      });
    }
  },

  // Delete user (soft delete)
  deleteUser: async (req, res) => {
    try {
      const { userId } = req.params;

      // Check if user has admin permissions
      if (req.user.groupCode !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Requires admin permissions.'
        });
      }

      const pool = await getConnection();
      
      // Check if user exists
      const userResult = await pool.request()
        .input('userID', sql.VarChar(50), userId)
        .query('SELECT UserID FROM _secUsers WHERE UserID = @userID AND (IsActive = 1 OR IsActive IS NULL)');

      if (userResult.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Soft delete by setting IsActive = 0
      await pool.request()
        .input('userID', sql.VarChar(50), userId)
        .input('updateUser', sql.Int, req.user.id)
        .query(`
          UPDATE _secUsers 
          SET IsActive = 0, UpdateUser = @updateUser, UpdatedAt = GETDATE() 
          WHERE UserID = @userID
        `);

      res.json({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
        error: error.message
      });
    }
  },

  // Get available groups for user creation
  getAvailableGroups: async (req, res) => {
    try {
      // Check if user has admin permissions
      if (req.user.groupCode !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Requires admin permissions.'
        });
      }

      const pool = await getConnection();
      
      const result = await pool.request()
        .query('SELECT GroupNo, UserGCode, UserGName FROM _secUserGroups ORDER BY UserGCode');

      const groups = result.recordset.map(group => ({
        groupNo: group.GroupNo,
        groupCode: group.UserGCode,
        groupName: group.UserGName
      }));

      res.json({
        success: true,
        groups: groups
      });

    } catch (error) {
      console.error('Get available groups error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch groups',
        error: error.message
      });
    }
  },

  // Reset user password
  resetUserPassword: async (req, res) => {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body;

      // Check if user has admin permissions
      if (req.user.groupCode !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Requires admin permissions.'
        });
      }

      if (!newPassword) {
        return res.status(400).json({
          success: false,
          message: 'New password is required'
        });
      }

      const pool = await getConnection();
      
      // Check if user exists
      const userResult = await pool.request()
        .input('userID', sql.VarChar(50), userId)
        .query('SELECT UserID FROM _secUsers WHERE UserID = @userID AND (IsActive = 1 OR IsActive IS NULL)');

      if (userResult.recordset.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Hash password using MD5
      const hashedPassword = hashPasswordMD5(newPassword);

      // Update password
      await pool.request()
        .input('userID', sql.VarChar(50), userId)
        .input('newPassword', sql.NVarChar(250), hashedPassword)
        .input('updateUser', sql.Int, req.user.id)
        .query(`
          UPDATE _secUsers 
          SET Passwd = @newPassword, UpdateUser = @updateUser, UpdatedAt = GETDATE() 
          WHERE UserID = @userID
        `);

      res.json({
        success: true,
        message: 'Password reset successfully'
      });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password',
        error: error.message
      });
    }
  }
};

module.exports = userManagementController;
