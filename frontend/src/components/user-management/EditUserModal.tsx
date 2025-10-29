import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { UpdateUserData, Group, User } from '../../services/userManagementService';
import userManagementService from '@/services/userManagementService';

interface EditUserModalProps {
  user: User;
  groups: Group[];
  onSubmit: (userData: UpdateUserData) => Promise<void>;
  onClose: () => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  groups,
  onSubmit,
  onClose
}) => {
  const [formData, setFormData] = useState<UpdateUserData>({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email || '',
    phone: user.phone || '',
    title: user.title || '',
    department: user.department,
    craft: user.craft,
    crew: user.crew,
    siteNo: user.siteNo,
    groupNo: user.groupNo,
    levelReport: user.levelReport,
    storeRoom: user.storeRoom,
    dbNo: user.dbNo,
    lineId: user.lineId || '',
    isActive: user.isActive !== false
  });
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [error, setError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email || '',
      phone: user.phone || '',
      title: user.title || '',
      department: user.department,
      craft: user.craft,
      crew: user.crew,
      siteNo: user.siteNo,
      groupNo: user.groupNo,
      levelReport: user.levelReport,
      storeRoom: user.storeRoom,
      dbNo: user.dbNo,
      lineId: user.lineId || '',
      isActive: user.isActive !== false
    });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    
    if (!formData.firstName || !formData.lastName || !formData.groupNo) {
      setError('Please fill in all required fields (First Name, Last Name, Group)');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setSuccessMessage('User updated successfully');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update user');
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setSuccessMessage('');
    
    if (!newPassword) {
      setPasswordError('Please enter a new password');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 4) {
      setPasswordError('Password must be at least 4 characters long');
      return;
    }

    setIsResettingPassword(true);
    try {
      await userManagementService.resetUserPassword(user.userId, newPassword);
      setSuccessMessage('Password reset successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to reset password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleInputChange = (field: keyof UpdateUserData, value: string | number | boolean | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9850]">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Edit User: {user.fullName || `${user.firstName} ${user.lastName}`}</CardTitle>
          <CardDescription>Update user information, permissions, or reset password</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profile & Permissions</TabsTrigger>
              <TabsTrigger value="password">Reset Password</TabsTrigger>
            </TabsList>
            
            {/* Profile & Permissions Tab */}
            <TabsContent value="profile">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}
                {successMessage && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                    {successMessage}
                  </div>
                )}

                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-600">User ID: <span className="font-semibold text-gray-900">{user.userId}</span></p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-firstName">First Name *</Label>
                      <Input
                        id="edit-firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-lastName">Last Name *</Label>
                      <Input
                        id="edit-lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-phone">Phone</Label>
                      <Input
                        id="edit-phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="edit-title">Title/Position</Label>
                    <Input
                      id="edit-title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                    />
                  </div>
                </div>

                {/* Organization */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Organization</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="edit-department">Department No</Label>
                      <Input
                        id="edit-department"
                        type="number"
                        value={formData.department || ''}
                        onChange={(e) => handleInputChange('department', e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-craft">Craft No</Label>
                      <Input
                        id="edit-craft"
                        type="number"
                        value={formData.craft || ''}
                        onChange={(e) => handleInputChange('craft', e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-crew">Crew No</Label>
                      <Input
                        id="edit-crew"
                        type="number"
                        value={formData.crew || ''}
                        onChange={(e) => handleInputChange('crew', e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="edit-siteNo">Site No</Label>
                    <Input
                      id="edit-siteNo"
                      type="number"
                      value={formData.siteNo || ''}
                      onChange={(e) => handleInputChange('siteNo', e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </div>
                </div>

                {/* Security & Permissions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Security & Permissions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-groupNo">Security Group *</Label>
                      <Select 
                        value={formData.groupNo?.toString() || ''} 
                        onValueChange={(value) => handleInputChange('groupNo', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Security Group" />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.map(group => (
                            <SelectItem key={group.groupNo} value={group.groupNo.toString()}>
                              {group.groupCode} - {group.groupName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-levelReport">Permission Level</Label>
                      <Select 
                        value={formData.levelReport?.toString() || '1'} 
                        onValueChange={(value) => handleInputChange('levelReport', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Permission Level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Level 1 - Basic Access</SelectItem>
                          <SelectItem value="2">Level 2 - Manager Access</SelectItem>
                          <SelectItem value="3">Level 3 - Admin Access</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="edit-storeRoom">Store Room</Label>
                      <Input
                        id="edit-storeRoom"
                        type="number"
                        value={formData.storeRoom || 1}
                        onChange={(e) => handleInputChange('storeRoom', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-dbNo">Database No</Label>
                      <Input
                        id="edit-dbNo"
                        type="number"
                        value={formData.dbNo || 1}
                        onChange={(e) => handleInputChange('dbNo', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-status">Status</Label>
                      <Select 
                        value={formData.isActive ? 'active' : 'inactive'} 
                        onValueChange={(value) => handleInputChange('isActive', value === 'active')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* LINE Integration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">LINE Integration</h3>
                  <div>
                    <Label htmlFor="edit-lineId">LINE User ID</Label>
                    <Input
                      id="edit-lineId"
                      value={formData.lineId}
                      onChange={(e) => handleInputChange('lineId', e.target.value)}
                      placeholder="U1234567890abcdef..."
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Updating...' : 'Update User'}
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* Password Reset Tab */}
            <TabsContent value="password">
              <form onSubmit={handlePasswordReset} className="space-y-6">
                {passwordError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {passwordError}
                  </div>
                )}
                {successMessage && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                    {successMessage}
                  </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> You are about to reset the password for user <strong>{user.userId}</strong>. 
                    This will immediately change their login credentials.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="new-password">New Password *</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm-password">Confirm Password *</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={onClose} disabled={isResettingPassword}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isResettingPassword} variant="destructive">
                    {isResettingPassword ? 'Resetting...' : 'Reset Password'}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
