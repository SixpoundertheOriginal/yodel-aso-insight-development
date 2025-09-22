import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { EnhancedAdminDashboard } from '@/components/admin/dashboard/EnhancedAdminDashboard';

// Placeholder components for tabs that don't have full implementations yet
const DiagnosticsTab = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">API Diagnostics</h2>
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <p className="text-gray-600 dark:text-gray-400">
        API diagnostics and monitoring tools will be available here.
      </p>
    </div>
  </div>
);

const UsersTab = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">User Management</h2>
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <p className="text-gray-600 dark:text-gray-400">
        User management interface will be available here.
      </p>
    </div>
  </div>
);

const UIPermissionsTab = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">UI Permissions</h2>
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <p className="text-gray-600 dark:text-gray-400">
        UI permission controls will be available here.
      </p>
    </div>
  </div>
);

export default function AdminDashboard() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'dashboard';

  const renderTabContent = () => {
    switch (tab) {
      case 'dashboard':
        return <EnhancedAdminDashboard />;
      case 'diagnostics':
        return <DiagnosticsTab />;
      case 'users':
        return <UsersTab />;
      case 'ui-permissions':
        return <UIPermissionsTab />;
      default:
        return <EnhancedAdminDashboard />;
    }
  };

  return (
    <AdminLayout currentPage={tab}>
      {renderTabContent()}
    </AdminLayout>
  );
}