import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { EnhancedAdminDashboard } from '@/components/admin/dashboard/EnhancedAdminDashboard';
import { UserManagementInterface } from '@/components/admin/users/UserManagementInterface';
import { FeatureManagementPanel } from '@/components/admin/features/FeatureManagementPanel';

// Placeholder component for diagnostics tab
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
        return <UserManagementInterface />;
      case 'ui-permissions':
        return <FeatureManagementPanel />;
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