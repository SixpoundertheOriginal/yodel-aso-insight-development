import React, { useEffect, useState } from 'react';
import { AdminDataTable } from '../shared/AdminDataTable';
import { CreateOrganizationModal } from './CreateOrganizationModal';

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
}

export const OrganizationManagementTable: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/organizations');
      const data = await response.json();
      setOrganizations(data);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoading(false);
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
          <button className="text-indigo-600 hover:text-indigo-900 text-sm">Edit</button>
          <button className="text-green-600 hover:text-green-900 text-sm">Users</button>
          <button className="text-orange-600 hover:text-orange-900 text-sm">Analytics</button>
        </div>
      ),
    },
  ];

  return (
    <div className="organization-management">
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
          onSuccess={() => {
            setShowCreateModal(false);
            loadOrganizations();
          }}
        />
      )}
    </div>
  );
};

export default OrganizationManagementTable;
