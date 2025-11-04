import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { UpdateUserData, User } from '../../services/userManagementService';

interface Department {
  deptNo: number;
  deptCode: string;
  deptName: string;
}

interface EditUserModalProps {
  user: User;
  departments: Department[];
  onSubmit: (userData: UpdateUserData) => Promise<void>;
  onClose: () => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  departments,
  onSubmit,
  onClose
}) => {
  const [formData, setFormData] = useState<UpdateUserData>({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email || '',
    phone: user.phone || '',
    personCode: user.personCode || '',
    department: user.department,
    siteNo: user.siteNo,
    groupNo: user.groupNo,
    levelReport: user.levelReport,
    storeRoom: user.storeRoom,
    dbNo: user.dbNo
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email || '',
      phone: user.phone || '',
      personCode: user.personCode || '',
      department: user.department,
      siteNo: user.siteNo,
      groupNo: user.groupNo,
      levelReport: user.levelReport,
      storeRoom: user.storeRoom,
      dbNo: user.dbNo
    });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.firstName || !formData.lastName) {
      setError('Please fill in all required fields (First Name, Last Name)');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update user');
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof UpdateUserData, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9850]">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Edit User</CardTitle>
          <CardDescription>Update user information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Authentication Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Authentication</h3>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">User ID: <span className="font-semibold text-gray-900">{user.userId}</span></p>
                <p className="text-xs text-gray-500 mt-1">User ID cannot be changed</p>
              </div>
            </div>

            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="personCode">Person Code</Label>
                  <Input
                    id="personCode"
                    value={formData.personCode}
                    onChange={(e) => handleInputChange('personCode', e.target.value)}
                    placeholder="Employee code"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select 
                    value={formData.department?.toString()} 
                    onValueChange={(value) => handleInputChange('department', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Department (Optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept.deptNo} value={dept.deptNo.toString()}>
                          {dept.deptCode} - {dept.deptName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">Leave empty if not applicable</p>
                </div>
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
        </CardContent>
      </Card>
    </div>
  );
};
