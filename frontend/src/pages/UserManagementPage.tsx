import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import userManagementService from '../services/userManagementService';
import type { 
  User, 
  CreateUserData, 
  UpdateUserData, 
  Role 
} from '../services/userManagementService';
import { UserList } from '../components/user-management/UserList';
import { UserFilters } from '../components/user-management/UserFilters';
import { CreateUserModal } from '../components/user-management/CreateUserModal';
import { EditUserModal } from '../components/user-management/EditUserModal';
import { ViewUserModal } from '../components/user-management/ViewUserModal';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AccessDenied } from '../components/common/AccessDenied';

const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Check if current user has L3 permissions
  const hasPermission = (currentUser?.permissionLevel ?? 0) >= 3;

  useEffect(() => {
    if (hasPermission) {
      loadUsers();
      loadRoles();
    }
  }, [hasPermission]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const fetchedUsers = await userManagementService.getAllUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const fetchedRoles = await userManagementService.getRoles();
      setRoles(fetchedRoles);
    } catch (error) {
      console.error('Failed to load roles:', error);
      // Fallback roles if API fails
      setRoles([
        { id: 'admin', name: 'Administrator', description: 'Full system access', permissionLevel: 3, permissions: ['all'] },
        { id: 'manager', name: 'Manager', description: 'Department management', permissionLevel: 2, permissions: ['tickets', 'reports'] },
        { id: 'operator', name: 'Operator', description: 'Basic operations', permissionLevel: 1, permissions: ['tickets'] }
      ]);
    }
  };

  const handleCreateUser = async (userData: CreateUserData): Promise<void> => {
    try {
      await userManagementService.createUser(userData);
      setShowCreateModal(false);
      loadUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error; // Re-throw to let the modal handle the error
    }
  };

  const handleUpdateUser = async (userId: number, userData: UpdateUserData) => {
    try {
      await userManagementService.updateUser(userId, userData);
      setShowEditModal(false);
      setEditingUser(null);
      loadUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error; // Re-throw to let the modal handle the error
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm('Are you sure you want to deactivate this user?')) {
      try {
        await userManagementService.deleteUser(userId);
        loadUsers();
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterRole('all');
    setFilterStatus('all');
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && user.isActive !== false) ||
      (filterStatus === 'inactive' && user.isActive === false);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (!hasPermission) {
    return <AccessDenied message="You don't have permission to access user management." />;
  }

  if (loading) {
    return <LoadingSpinner message="Loading users..." />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="User Management"
        description="Manage user accounts, roles, and permissions"
        actionButton={{
          label: "Add User",
          onClick: () => setShowCreateModal(true),
          icon: "UserPlus"
        }}
      />

      <UserFilters
        searchTerm={searchTerm}
        filterRole={filterRole}
        filterStatus={filterStatus}
        roles={roles}
        onSearchChange={setSearchTerm}
        onRoleFilterChange={setFilterRole}
        onStatusFilterChange={setFilterStatus}
        onClearFilters={clearFilters}
      />

      <UserList
        users={filteredUsers}
        onViewUser={handleViewUser}
        onEditUser={handleEditUser}
        onDeleteUser={handleDeleteUser}
      />

      {showCreateModal && (
        <CreateUserModal
          roles={roles}
          onSubmit={handleCreateUser}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {showEditModal && editingUser && (
        <EditUserModal
          user={editingUser}
          roles={roles}
          onSubmit={(userData) => handleUpdateUser(editingUser.id, userData)}
          onClose={() => {
            setShowEditModal(false);
            setEditingUser(null);
          }}
        />
      )}

      {showViewModal && selectedUser && (
        <ViewUserModal
          user={selectedUser}
          onClose={() => {
            setShowViewModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

export default UserManagementPage;
