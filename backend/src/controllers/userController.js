

class UserController {
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

  // Get user profile
  async getProfile(req, res) {
    try {
      const userId = req.user.userId;
      const user = await this.findUserById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          lineUserId: user.lineUserId,
          displayName: user.displayName,
          pictureUrl: user.pictureUrl,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        }
      });
    } catch (error) {
      console.error('Get Profile Error:', error);
      res.status(500).json({ error: 'Failed to get user profile' });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const { displayName, pictureUrl } = req.body;
      
      const user = await this.updateUserProfile(userId, { 
        displayName, 
        pictureUrl,
        updatedAt: new Date()
      });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: user.id,
          lineUserId: user.lineUserId,
          displayName: user.displayName,
          pictureUrl: user.pictureUrl,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Update Profile Error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  // Get user role
  async getRole(req, res) {
    try {
      res.json({
        success: true,
        role: req.user.role
      });
    } catch (error) {
      console.error('Get Role Error:', error);
      res.status(500).json({ error: 'Failed to get user role' });
    }
  }

  // Update user role (admin only)
  async updateUserRole(req, res) {
    try {
      const { userId, role } = req.body;
      
      if (!['L1', 'L2', 'L3'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be L1, L2, or L3' });
      }

      const user = await this.updateUserProfile(userId, { role });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        success: true,
        message: 'User role updated successfully',
        user: {
          id: user.id,
          lineUserId: user.lineUserId,
          displayName: user.displayName,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Update User Role Error:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
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
      console.error('Get All Users Error:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  }
}

module.exports = new UserController();