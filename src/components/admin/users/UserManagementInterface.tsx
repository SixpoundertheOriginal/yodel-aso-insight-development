import React, { useState, useEffect } from 'react';
import { AdminDataTable } from '../shared/AdminDataTable';
import { UserInvitationModal } from './UserInvitationModal';
import { UserCreationModal } from './UserCreationModal';
import { UserEditModal } from './UserEditModal';
import { Users, UserPlus, Edit3, Trash2, RotateCcw } from 'lucide-react';
import { usersApi, AdminApiError } from '@/lib/admin-api';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  roles: { role: string; organization_id: string }[];
  organization_id: string;
  organizations?: {
    id: string;
    name: string;
    slug: string;
    [key: string]: unknown;
  };
  status?: string;
  last_sign_in_at?: string;
  created_at?: string;
  email_confirmed: boolean;
  last_sign_in?: string;
  email_confirmed_at?: string; // From auth.users
  [key: string]: unknown;
}

export const UserManagementInterface: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const users = await usersApi.list();
      setUsers(users || []);
      console.log(`Loaded ${users?.length || 0} users across all organizations`);
      setError(null);
    } catch (err: unknown) {
      const error = err as AdminApiError;
      console.error('Failed to load users:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (userData: {
    email: string;
    roles: string[] | string;
    organization_id: string;
    first_name?: string;
    last_name?: string;
  }) => {
    try {
      const payload = {
        email: userData.email,
        org_id: userData.organization_id,
        role: Array.isArray(userData.roles) ? userData.roles[0] : userData.roles,
        first_name: userData.first_name,
        last_name: userData.last_name,
      };
      
      await usersApi.invite(payload);

      setShowInviteModal(false);
      loadUsers();
      alert(`Invitation sent successfully to ${userData.email}`);
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Failed to invite user:', err);
      alert(`Failed to invite user: ${err.message}`);
    }
  };

  const handleCreateUser = async (userData: {
    email: string;
    roles: string[] | string;
    organization_id: string;
    first_name?: string;
    last_name?: string;
    password: string;
  }) => {
    try {
      const payload = {
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        organization_id: userData.organization_id,
        roles: Array.isArray(userData.roles) ? userData.roles : [userData.roles],
        password: userData.password
      };
      
      await usersApi.create(payload);

      setShowCreateModal(false);
      loadUsers();
      alert(`User created successfully: ${userData.email}`);
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Failed to create user:', err);
      alert(`Failed to create user: ${err.message}`);
    }
  };

  const handleEditUser = async (userId: string, updates: {
    first_name?: string;
    last_name?: string;
    roles?: string[] | string;
    organization_id?: string;
  }) => {
    try {
      const payload = {
        first_name: updates.first_name,
        last_name: updates.last_name,
        organization_id: updates.organization_id,
        roles: updates.roles
          ? Array.isArray(updates.roles)
            ? updates.roles
            : [updates.roles]
          : undefined
      };
      
      await usersApi.update(userId, payload);

      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await usersApi.delete(userId);

      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm('Send password reset email to this user?')) {
      return;
    }

    try {
      const result = await usersApi.resetPassword(userId);
      alert(`Password reset email sent to ${result?.email || 'user'}`);
    } catch (error) {
      console.error('Failed to send password reset:', error);
      alert('Failed to send password reset email');
    }
  };

  const columns = [
    {
      header: 'User',
      accessor: 'email',
      cell: (user: User) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {(user.first_name || user.email).charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-white">
              {user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`
                : user.email}
            </div>
            <div className="text-sm text-gray-400">{user.email}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Organization',
      accessor: 'organization',
      cell: (user: User) => (
        <div>
          <div className="text-sm text-white">
            {user.organizations?.name || 'Unknown'}
          </div>
          <div className="text-sm text-gray-400">
            {user.organizations?.slug || user.organization_id}
          </div>
        </div>
      )
    },
    {
      header: 'Role',
      accessor: 'roles',
      cell: (user: User) => {
        const roles = Array.isArray(user.roles) ? user.roles : [];
        const rolePriority = ['super_admin', 'org_admin', 'aso_manager', 'analyst', 'viewer', 'client'];
        const highestRole = rolePriority.find(r => roles.some(ur => ur.role === r)) ||
          roles[0]?.role || 'unknown';
        const roleNames = roles.length
          ? roles.map(r => (r.role || '').replace('_', ' ')).join(', ')
          : 'no role';
        const colorClass =
          highestRole === 'super_admin'
            ? 'bg-red-100 text-red-800'
            : highestRole === 'org_admin'
            ? 'bg-purple-100 text-purple-800'
            : highestRole === 'aso_manager'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-800';
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colorClass}`}>
            {roleNames}
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (user: User) => (
        <div>
          <div className={`text-sm ${user.email_confirmed ? 'text-green-400' : 'text-yellow-400'}`}>
            {user.email_confirmed ? 'Confirmed' : 'Pending'}
          </div>
          <div className="text-xs text-gray-400">
            {user.last_sign_in
              ? `Last: ${new Date(user.last_sign_in).toLocaleDateString()}`
              : 'Never logged in'}
          </div>
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      cell: (user: User) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setSelectedUser(user);
              setShowEditModal(true);
            }}
            className="text-blue-400 hover:text-blue-300 p-1"
            title="Edit User"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleResetPassword(user.id)}
            className="text-orange-400 hover:text-orange-300 p-1"
            title="Reset Password"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteUser(user.id)}
            className="text-red-400 hover:text-red-300 p-1"
            title="Delete User"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="user-management">
      {error && <div className="mb-4 text-red-500">{error}</div>}
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-white flex items-center">
            <Users className="w-6 h-6 mr-2 text-orange-400" />
            User Management
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Manage platform users across all organizations
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex space-x-3">
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-gray-600 bg-transparent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
          >
            <Users className="w-4 h-4 mr-2" />
            Create User
          </button>
        </div>
      </div>

      <AdminDataTable
        data={users}
        columns={columns}
        loading={loading}
        selectedItems={selectedUsers}
        onSelectionChange={setSelectedUsers}
        searchable={true}
        pagination={true}
        bulkActions={[
          {
            label: 'Send Password Reset',
            action: (selected) => {
              selected.forEach(id => handleResetPassword(id));
            }
          },
          {
            label: 'Export Users',
            action: (selected) => {
              console.log('Export users:', selected);
            }
          }
        ]}
      />

      {showInviteModal && (
        <UserInvitationModal
          onClose={() => setShowInviteModal(false)}
          onInvite={handleInviteUser}
        />
      )}

      {showCreateModal && (
        <UserCreationModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateUser}
        />
      )}

      {showEditModal && selectedUser && (
        <UserEditModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSave={(updates) => handleEditUser(selectedUser.id, updates)}
        />
      )}
    </div>
  );
};

export default UserManagementInterface;
