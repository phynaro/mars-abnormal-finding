import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Edit, 
  Trash2, 
  Eye, 
  Mail, 
  Building, 
  Clock, 
  Calendar, 
  CheckCircle, 
  XCircle 
} from 'lucide-react';
import type { User } from '../../services/userManagementService';

interface UserListProps {
  users: User[];
  onViewUser: (user: User) => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (userId: number) => void;
}

const getPermissionLevelColor = (level: number) => {
  switch (level) {
    case 3: return 'bg-red-100 text-red-800';
    case 2: return 'bg-yellow-100 text-yellow-800';
    case 1: return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const UserList: React.FC<UserListProps> = ({
  users,
  onViewUser,
  onEditUser,
  onDeleteUser
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Users ({users.length})</CardTitle>
        <CardDescription>Manage user accounts and permissions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">User</th>
                <th className="text-left p-3 font-medium">Contact</th>
                <th className="text-left p-3 font-medium">Department</th>
                <th className="text-left p-3 font-medium">Role</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Last Login</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground font-semibold text-sm">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{user.firstName} {user.lastName}</div>
                        <div className="text-sm text-gray-500">@{user.username}</div>
                        {user.employeeID && (
                          <div className="text-xs text-gray-400">ID: {user.employeeID}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="p-3">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm">
                        <Mail className="h-3 w-3 mr-2 text-gray-400" />
                        {user.email}
                      </div>
                    </div>
                  </td>
                  
                  <td className="p-3">
                    <div className="space-y-1">
                      {user.department && (
                        <div className="flex items-center text-sm">
                          <Building className="h-3 w-3 mr-2 text-gray-400" />
                          {user.department}
                        </div>
                      )}
                      {user.shift && (
                        <div className="flex items-center text-sm">
                          <Clock className="h-3 w-3 mr-2 text-gray-400" />
                          {user.shift}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="p-3">
                    <div className="space-y-2">
                      <Badge className={getPermissionLevelColor(user.permissionLevel)}>
                        {user.role}
                      </Badge>
                      <div className="text-xs text-gray-500">
                        Level {user.permissionLevel}
                      </div>
                    </div>
                  </td>
                  
                  <td className="p-3">
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
                  </td>
                  
                  <td className="p-3">
                    <div className="text-sm text-gray-500">
                      {user.lastLogin ? (
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(user.lastLogin).toLocaleDateString()}
                        </div>
                      ) : (
                        'Never'
                      )}
                    </div>
                  </td>
                  
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewUser(user)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditUser(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
