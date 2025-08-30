import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import userManagementService from '../services/userManagementService';
import type { Role } from '../services/userManagementService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

const RoleManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    description: '',
    permissionLevel: 1,
    permissions: [] as string[]
  });

  // Available permissions
  const availablePermissions = [
    { id: 'dashboard', label: 'Dashboard Access', description: 'Access to main dashboard' },
    { id: 'tickets', label: 'Ticket Management', description: 'Create and manage tickets' },
    { id: 'tickets-admin', label: 'Ticket Administration', description: 'Full ticket control' },
    { id: 'machines', label: 'Machine Management', description: 'View and manage machines' },
    { id: 'machines-admin', label: 'Machine Administration', description: 'Full machine control' },
    { id: 'reports', label: 'Reports Access', description: 'View system reports' },
    { id: 'reports-admin', label: 'Reports Administration', description: 'Generate and manage reports' },
    { id: 'users', label: 'User Management', description: 'Manage user accounts' },
    { id: 'roles', label: 'Role Management', description: 'Manage system roles' },
    { id: 'settings', label: 'System Settings', description: 'Configure system settings' },
    { id: 'audit', label: 'Audit Logs', description: 'View system audit logs' }
  ];

  // Check if current user has L3 permissions
  const hasPermission = (currentUser?.permissionLevel ?? 0) >= 3;

  useEffect(() => {
    if (hasPermission) {
      loadRoles();
    }
  }, [hasPermission]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const fetchedRoles = await userManagementService.getRoles();
      setRoles(fetchedRoles);
    } catch (error) {
      console.error('Failed to load roles:', error);
      // Fallback roles if API fails
      setRoles([
        { id: 'admin', name: 'Administrator', description: 'Full system access', permissionLevel: 3, permissions: ['all'] },
        { id: 'manager', name: 'Manager', description: 'Department management', permissionLevel: 2, permissions: ['dashboard', 'tickets', 'tickets-admin', 'machines', 'reports'] },
        { id: 'operator', name: 'Operator', description: 'Basic operations', permissionLevel: 1, permissions: ['dashboard', 'tickets'] }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    try {
      // In a real implementation, you would call the API
      const newRole: Role = {
        id: createFormData.name.toLowerCase().replace(/\s+/g, '-'),
        name: createFormData.name,
        description: createFormData.description,
        permissionLevel: createFormData.permissionLevel,
        permissions: createFormData.permissions
      };
      
      setRoles([...roles, newRole]);
      setShowCreateModal(false);
      setCreateFormData({
        name: '',
        description: '',
        permissionLevel: 1,
        permissions: []
      });
    } catch (error) {
      console.error('Failed to create role:', error);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;
    
    try {
      // In a real implementation, you would call the API
      const updatedRoles = roles.map(role => 
        role.id === editingRole.id ? editingRole : role
      );
      setRoles(updatedRoles);
      setShowEditModal(false);
      setEditingRole(null);
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (window.confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      try {
        // In a real implementation, you would call the API
        const updatedRoles = roles.filter(role => role.id !== roleId);
        setRoles(updatedRoles);
      } catch (error) {
        console.error('Failed to delete role:', error);
      }
    }
  };

  const togglePermission = (permissionId: string) => {
    if (createFormData.permissions.includes(permissionId)) {
      setCreateFormData({
        ...createFormData,
        permissions: createFormData.permissions.filter(p => p !== permissionId)
      });
    } else {
      setCreateFormData({
        ...createFormData,
        permissions: [...createFormData.permissions, permissionId]
      });
    }
  };

  const toggleEditPermission = (permissionId: string) => {
    if (!editingRole) return;
    
    if (editingRole.permissions.includes(permissionId)) {
      setEditingRole({
        ...editingRole,
        permissions: editingRole.permissions.filter(p => p !== permissionId)
      });
    } else {
      setEditingRole({
        ...editingRole,
        permissions: [...editingRole.permissions, permissionId]
      });
    }
  };

  const getPermissionLevelColor = (level: number) => {
    switch (level) {
      case 3: return 'bg-red-100 text-red-800';
      case 2: return 'bg-yellow-100 text-yellow-800';
      case 1: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPermissionIcon = (permissionId: string) => {
    switch (permissionId) {
      case 'dashboard': return '📊';
      case 'tickets': return '🎫';
      case 'tickets-admin': return '🎫🔧';
      case 'machines': return '⚙️';
      case 'machines-admin': return '⚙️🔧';
      case 'reports': return '📈';
      case 'reports-admin': return '📈🔧';
      case 'users': return '👥';
      case 'roles': return '🛡️';
      case 'settings': return '⚙️';
      case 'audit': return '📋';
      default: return '🔑';
    }
  };

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access role management.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Role Management</h1>
          <p className="text-gray-600 mt-2">Manage system roles and permissions</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Role
        </Button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map(role => (
          <Card key={role.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    {role.name}
                  </CardTitle>
                  <CardDescription>{role.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getPermissionLevelColor(role.permissionLevel)}>
                    Level {role.permissionLevel}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingRole(role);
                        setShowEditModal(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRole(role.id)}
                      className="text-red-600 hover:text-red-700"
                      disabled={role.id === 'admin'} // Prevent deleting admin role
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Permissions</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {role.permissions.includes('all') ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        All Permissions
                      </Badge>
                    ) : (
                      role.permissions.map(permission => {
                        const permInfo = availablePermissions.find(p => p.id === permission);
                        return (
                          <Badge key={permission} variant="outline" className="text-xs">
                            {getPermissionIcon(permission)} {permInfo?.label || permission}
                          </Badge>
                        );
                      })
                    )}
                  </div>
                </div>
                
                {role.id === 'admin' && (
                  <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>System Administrator Role - Cannot be modified</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create New Role</CardTitle>
              <CardDescription>Define a new role with specific permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role-name">Role Name *</Label>
                  <Input
                    id="role-name"
                    value={createFormData.name}
                    onChange={(e) => setCreateFormData({...createFormData, name: e.target.value})}
                    placeholder="e.g., Supervisor"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="role-level">Permission Level *</Label>
                  <Select 
                    value={createFormData.permissionLevel.toString()} 
                    onValueChange={(value) => setCreateFormData({...createFormData, permissionLevel: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Level 1 - Basic Access</SelectItem>
                      <SelectItem value="2">Level 2 - Manager Access</SelectItem>
                      <SelectItem value="3">Level 3 - Admin Access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="role-description">Description</Label>
                <Input
                  id="role-description"
                  value={createFormData.description}
                  onChange={(e) => setCreateFormData({...createFormData, description: e.target.value})}
                  placeholder="Describe the role's purpose and responsibilities"
                />
              </div>
              
              <div>
                <Label>Permissions</Label>
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                  {availablePermissions.map(permission => (
                    <div key={permission.id} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id={`perm-${permission.id}`}
                        checked={createFormData.permissions.includes(permission.id)}
                        onChange={() => togglePermission(permission.id)}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor={`perm-${permission.id}`} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getPermissionIcon(permission.id)}</span>
                          <span className="font-medium">{permission.label}</span>
                        </div>
                        <p className="text-sm text-gray-500">{permission.description}</p>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRole} disabled={!createFormData.name}>
                  Create Role
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && editingRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Edit Role: {editingRole.name}</CardTitle>
              <CardDescription>Modify role permissions and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-role-name">Role Name *</Label>
                  <Input
                    id="edit-role-name"
                    value={editingRole.name}
                    onChange={(e) => setEditingRole({...editingRole, name: e.target.value})}
                    required
                    disabled={editingRole.id === 'admin'}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-role-level">Permission Level *</Label>
                  <Select 
                    value={editingRole.permissionLevel.toString()} 
                    onValueChange={(value) => setEditingRole({...editingRole, permissionLevel: parseInt(value)})}
                    disabled={editingRole.id === 'admin'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Level 1 - Basic Access</SelectItem>
                      <SelectItem value="2">Level 2 - Manager Access</SelectItem>
                      <SelectItem value="3">Level 3 - Admin Access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-role-description">Description</Label>
                <Input
                  id="edit-role-description"
                  value={editingRole.description}
                  onChange={(e) => setEditingRole({...editingRole, description: e.target.value})}
                  disabled={editingRole.id === 'admin'}
                />
              </div>
              
              <div>
                <Label>Permissions</Label>
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                  {availablePermissions.map(permission => (
                    <div key={permission.id} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id={`edit-perm-${permission.id}`}
                        checked={editingRole.permissions.includes(permission.id)}
                        onChange={() => toggleEditPermission(permission.id)}
                        className="rounded border-gray-300"
                        disabled={editingRole.id === 'admin'}
                      />
                      <label htmlFor={`edit-perm-${permission.id}`} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getPermissionIcon(permission.id)}</span>
                          <span className="font-medium">{permission.label}</span>
                        </div>
                        <p className="text-sm text-gray-500">{permission.description}</p>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {editingRole.id === 'admin' && (
                <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-3 rounded-md">
                  <AlertTriangle className="h-4 w-4" />
                  <span>This is the system administrator role and cannot be modified for security reasons.</span>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateRole} disabled={editingRole.id === 'admin'}>
                  Update Role
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RoleManagementPage;
