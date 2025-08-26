const jwt = require('jsonwebtoken');

class AuthController {
  constructor() {
    // Bind methods to preserve 'this' context
    this.authenticateUser = this.authenticateUser.bind(this);
    this.findUserByLineId = this.findUserByLineId.bind(this);
    this.createNewUser = this.createNewUser.bind(this);
    this.updateUserProfile = this.updateUserProfile.bind(this);
    this.findUserById = this.findUserById.bind(this);
    this.getAllUsers = this.getAllUsers.bind(this);
    this.logout = this.logout.bind(this);
  }

  // Authenticate user from LIFF profile (no token verification needed)
  async authenticateUser(req, res) {
    try {
      const { userProfile } = req.body;
      
      if (!userProfile || !userProfile.userId) {
        return res.status(400).json({ error: 'User profile is required' });
      }

      console.log('Received user profile:', userProfile);

      // Check if user exists in your database
      const existingUser = await this.findUserByLineId(userProfile.userId);
      
      let user;
      if (existingUser) {
        // Update existing user's profile
        user = await this.updateUserProfile(existingUser.id, {
          displayName: userProfile.displayName,
          pictureUrl: userProfile.pictureUrl,
          statusMessage: userProfile.statusMessage,
          lastLoginAt: new Date()
        });
        console.log('Updated existing user:', user);
      } else {
        // Create new user
        user = await this.createNewUser({
          lineUserId: userProfile.userId,
          displayName: userProfile.displayName,
          pictureUrl: userProfile.pictureUrl,
          statusMessage: userProfile.statusMessage,
          role: 'L1', // Default role for new users
          isActive: true,
          createdAt: new Date(),
          lastLoginAt: new Date()
        });
        console.log('Created new user:', user);
      }

      // Generate application JWT token
      const appToken = jwt.sign(
        { 
          userId: user.id,
          lineUserId: user.lineUserId,
          role: user.role,
          displayName: user.displayName
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      res.json({
        success: true,
        token: appToken,
        user: {
          id: user.id,
          lineUserId: user.lineUserId,
          displayName: user.displayName,
          pictureUrl: user.pictureUrl,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        },
        isNewUser: !existingUser
      });

    } catch (error) {
      console.error('User authentication error:', error);
      res.status(500).json({ 
        error: 'Authentication failed',
        message: error.message
      });
    }
  }

  // Find user by LINE user ID
  async findUserByLineId(lineUserId) {
    console.log('Looking for user with LINE ID:', lineUserId);
    
    // TODO: Replace with actual database query
    // For now, using mock data
    const mockUsers = [
      {
        id: 'user-001',
        lineUserId: 'U436b7c116495adcbc4096d51b28abad8',
        displayName: 'Top integraX',
        pictureUrl: 'https://profile.line-scdn.net/0h1234567890abcdef',
        role: 'L2',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        lastLoginAt: new Date()
      }
    ];

    const foundUser = mockUsers.find(user => user.lineUserId === lineUserId);
    console.log('Found user:', foundUser);
    return foundUser || null;
  }

  // Create new user
  async createNewUser(userData) {
    console.log('Creating new user with data:', userData);
    
    // TODO: Replace with actual database insert
    const newUser = {
      id: `user-${Date.now()}`,
      ...userData
    };

    console.log('Created new user:', newUser);
    return newUser;
  }

  // Update user profile
  async updateUserProfile(userId, updateData) {
    console.log('Updating user profile for ID:', userId, 'with data:', updateData);
    
    // TODO: Replace with actual database update
    const user = await this.findUserById(userId);
    if (user) {
      const updatedUser = { ...user, ...updateData };
      console.log('Updated user:', updatedUser);
      return updatedUser;
    }
    return null;
  }

  // Find user by ID
  async findUserById(userId) {
    console.log('Looking for user with ID:', userId);
    
    // TODO: Replace with actual database query
    const mockUsers = [
      {
        id: 'user-001',
        lineUserId: 'U436b7c116495adcbc4096d51b28abad8',
        displayName: 'Top integraX',
        pictureUrl: 'https://profile.line-scdn.net/0h1234567890abcdef',
        role: 'L2',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        lastLoginAt: new Date()
      }
    ];

    const foundUser = mockUsers.find(user => user.id === userId);
    console.log('Found user by ID:', foundUser);
    return foundUser || null;
  }

  // Get all users (admin only)
  async getAllUsers(req, res) {
    try {
      // TODO: Replace with actual database query
      const users = [
        {
          id: 'user-001',
          lineUserId: 'U436b7c116495adcbc4096d51b28abad8',
          displayName: 'Top integraX',
          pictureUrl: 'https://profile.line-scdn.net/0h1234567890abcdef',
          role: 'L2',
          isActive: true,
          createdAt: new Date('2024-01-01'),
          lastLoginAt: new Date()
        }
      ];

      res.json({
        success: true,
        users: users.map(user => ({
          id: user.id,
          lineUserId: user.lineUserId,
          displayName: user.displayName,
          pictureUrl: user.pictureUrl,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        }))
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  }

  // Logout
  logout(req, res) {
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  }
}

module.exports = new AuthController(); 