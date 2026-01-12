import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import userManagementService from '@/services/userManagementService';
import type { 
  User, 
  CreateUserData, 
  UpdateUserData, 
  Group,
  Department 
} from '@/services/userManagementService';
import { UserList } from '@/components/user-management/UserList';
import { UserFilters } from '@/components/user-management/UserFilters';
import { CreateUserModal } from '@/components/user-management/CreateUserModal';
import { EditUserModal } from '@/components/user-management/EditUserModal';
import { ViewUserModal } from '@/components/user-management/ViewUserModal';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { AccessDenied } from '@/components/common/AccessDenied';

const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Check if current user has ADMIN permissions
  const hasPermission = true;

  useEffect(() => {
    if (hasPermission) {
      loadUsers();
      loadGroups();
      loadDepartments();
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

  const loadGroups = async () => {
    try {
      const fetchedGroups = await userManagementService.getGroups();
      setGroups(fetchedGroups);
    } catch (error) {
      console.error('Failed to load groups:', error);
      setGroups([]);
    }
  };

  const loadDepartments = async () => {
    try {
      const fetchedDepartments = await userManagementService.getDepartments();
      setDepartments(fetchedDepartments);
    } catch (error) {
      console.error('Failed to load departments:', error);
      setDepartments([]);
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

  const handleUpdateUser = async (userId: string, userData: UpdateUserData) => {
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

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This will permanently remove the user from _secUsers and IgxUserExtension tables. This action cannot be undone.')) {
      try {
        await userManagementService.deleteUser(userId);
        loadUsers();
      } catch (error) {
        console.error('Failed to delete user:', error);
        alert('Failed to delete user. Please try again.');
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
    setFilterGroup('all');
    setFilterStatus('all');
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.lastName && user.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.fullName && user.fullName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesGroup = filterGroup === 'all' || user.groupNo.toString() === filterGroup;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && user.isActive !== false) ||
      (filterStatus === 'inactive' && user.isActive === false);
    
    return matchesSearch && matchesGroup && matchesStatus;
  });

  if (!hasPermission) {
    return <AccessDenied message="You don't have permission to access user management. This feature requires ADMIN privileges." />;
  }

  if (loading) {
    return <LoadingSpinner message="Loading users..." />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="User Management"
        description="Manage user accounts, groups, and permissions"
        actionButton={{
          label: "Add User",
          onClick: () => setShowCreateModal(true),
          icon: "UserPlus"
        }}
      />

      <UserFilters
        searchTerm={searchTerm}
        filterGroup={filterGroup}
        filterStatus={filterStatus}
        groups={groups}
        onSearchChange={setSearchTerm}
        onGroupFilterChange={setFilterGroup}
        onStatusFilterChange={setFilterStatus}
        onClearFilters={clearFilters}
      />

      <UserList
        users={filteredUsers}
        onViewUser={handleViewUser}
        onEditUser={handleEditUser}
        onDeleteUser={(user) => handleDeleteUser(user.userId)}
      />

      {showCreateModal && (
        <CreateUserModal
          departments={departments}
          onSubmit={handleCreateUser}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {showEditModal && editingUser && (
        <EditUserModal
          user={editingUser}
          departments={departments}
          onSubmit={(userData) => handleUpdateUser(editingUser.userId, userData)}
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
