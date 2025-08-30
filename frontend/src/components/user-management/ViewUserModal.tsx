import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';
import type { User } from '../../services/userManagementService';

interface ViewUserModalProps {
  user: User;
  onClose: () => void;
}

const getPermissionLevelColor = (level: number) => {
  switch (level) {
    case 3: return 'bg-red-100 text-red-800';
    case 2: return 'bg-yellow-100 text-yellow-800';
    case 1: return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const ViewUserModal: React.FC<ViewUserModalProps> = ({
  user,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>User Details: {user.firstName} {user.lastName}</CardTitle>
          <CardDescription>View user information and activity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Full Name</Label>
              <p className="text-sm text-gray-600">{user.firstName} {user.lastName}</p>
            </div>
            <div>
              <Label>Username</Label>
              <p className="text-sm text-gray-600">@{user.username}</p>
            </div>
          </div>
          
          <div>
            <Label>Email</Label>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Employee ID</Label>
              <p className="text-sm text-gray-600">{user.employeeID || 'Not specified'}</p>
            </div>
            <div>
              <Label>Department</Label>
              <p className="text-sm text-gray-600">{user.department || 'Not specified'}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Shift</Label>
              <p className="text-sm text-gray-600">{user.shift || 'Not specified'}</p>
            </div>
            <div>
              <Label>Status</Label>
              <div className="flex items-center">
                {user.isActive !== false ? (
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 mr-2" />
                )}
                <span className={user.isActive !== false ? 'text-green-700' : 'text-red-700'}>
                  {user.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Role</Label>
              <Badge className={getPermissionLevelColor(user.permissionLevel)}>
                {user.role}
              </Badge>
            </div>
            <div>
              <Label>Permission Level</Label>
              <p className="text-sm text-gray-600">Level {user.permissionLevel}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Created</Label>
              <p className="text-sm text-gray-600">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
            <div>
              <Label>Last Login</Label>
              <p className="text-sm text-gray-600">
                {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
              </p>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
