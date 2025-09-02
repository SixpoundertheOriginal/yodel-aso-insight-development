import React, { useEffect, useState } from 'react';
import { AdminDataTable } from '../shared/AdminDataTable';
import { CreateOrganizationModal } from './CreateOrganizationModal';
import { EditOrganizationModal } from './EditOrganizationModal';
import { Edit3, Users, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Organization {
  id: string;
  name: string;
  slug: string;
  domain: string;
  subscription_tier: 'starter' | 'professional' | 'enterprise';
  user_count: number;
  active_users_30d: number;
  last_activity: Date;
  created_at: Date;
  [key: string]: unknown;
}

type NewOrganization = Pick<
  Organization,
  'name' | 'slug' | 'domain' | 'subscription_tier'
>;

export const OrganizationManagementTable: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const { data: response, error } = await supabase.functions.invoke('admin-organizations');
      
      if (error) throw error;
      if (!response?.success) throw new Error(response?.error || 'Request failed');
      
      setOrganizations(response.data || []);
      console.log(`Loaded ${response.data?.length || 0} organizations`);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Failed to load organizations:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async (orgData: NewOrganization) => {
    try {
      setCreating(true);
      const { data: response, error } = await supabase.functions.invoke('admin-organizations', {
        body: orgData
      });

      if (error) throw error;
      if (!response?.success) throw new Error(response?.error || 'Failed to create organization');

      setShowCreateModal(false);
      loadOrganizations();
      alert(`Organization "${response.data.name}" created successfully!`);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Failed to create organization:', error);
      alert(`Failed to create organization: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleEditOrganization = async (
    orgId: string,
    updates: Partial<Organization>
  ) => {
    try {
      const { data: response, error } = await supabase.functions.invoke('admin-organizations', {
        body: { action: 'update', id: orgId, payload: updates }
      });

      if (error) throw error;
      if (!response?.success) throw new Error(response?.error || 'Failed to update organization');

      loadOrganizations();
      setShowEditModal(false);
      alert('Organization updated successfully!');
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Failed to update organization:', error);
      alert(`Update failed: ${error.message}`);
    }
  };

  const openEditOrganization = (org: Organization) => {
    setSelectedOrganization(org);
    setShowEditModal(true);
  };

  const handleDeleteOrganization = async (orgId: string) => {
    if (!confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
      return;
    }

    try {
      const { data: response, error } = await supabase.functions.invoke('admin-organizations', {
        body: { action: 'delete', id: orgId }
      });

      if (error) throw error;
      if (!response?.success) throw new Error(response?.error || 'Failed to delete organization');

      loadOrganizations();
      alert('Organization deleted successfully');
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Delete failed:', error);
      alert(`Failed to delete organization: ${error.message}`);
    }
  };

  const columns = [
    {
      header: 'Organization',
      accessor: 'name',
      cell: (org: Organization) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
              {org.name.charAt(0)}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">{org.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{org.slug}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Subscription',
      accessor: 'subscription_tier',
      cell: (org: Organization) => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            org.subscription_tier === 'enterprise'
              ? 'bg-purple-100 text-purple-800'
              : org.subscription_tier === 'professional'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {org.subscription_tier}
        </span>
      ),
    },
    {
      header: 'Users',
      accessor: 'user_count',
      cell: (org: Organization) => (
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">{org.user_count} total</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{org.active_users_30d} active</div>
        </div>
      ),
    },
    {
      header: 'Last Activity',
      accessor: 'last_activity',
      cell: (org: Organization) => (
        <div className="text-sm text-gray-900 dark:text-white">
          {new Date(org.last_activity).toLocaleDateString()}
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      cell: (org: Organization) => (
        <div className="flex space-x-2">
          <button
            onClick={() => openEditOrganization(org)}
            className="text-blue-400 hover:text-blue-300 p-1"
            title="Edit Organization"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/admin/organizations/${org.id}/users`)}
            className="text-green-400 hover:text-green-300 p-1"
            title="Manage Users"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteOrganization(org.id)}
            className="text-red-400 hover:text-red-300 p-1"
            title="Delete Organization"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="organization-management">
      {error && (
        <div className="mb-4 text-red-500">{error}</div>
      )}
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Organizations</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Manage platform organizations and their configurations
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            Create Organization
          </button>
        </div>
      </div>

      <AdminDataTable
        data={organizations}
        columns={columns}
        loading={loading}
        selectedItems={selectedOrgs}
        onSelectionChange={setSelectedOrgs}
        bulkActions={[
          { label: 'Export Data', action: () => {} },
          { label: 'Bulk Edit', action: () => {} },
          { label: 'Send Notifications', action: () => {} },
        ]}
      />

      {showCreateModal && (
        <CreateOrganizationModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateOrganization}
          creating={creating}
        />
      )}

      {showEditModal && selectedOrganization && (
        <EditOrganizationModal
          organization={selectedOrganization}
          onClose={() => setShowEditModal(false)}
          onSave={(updates) =>
            handleEditOrganization(selectedOrganization.id, updates)
          }
        />
      )}
    </div>
  );
};

export default OrganizationManagementTable;
