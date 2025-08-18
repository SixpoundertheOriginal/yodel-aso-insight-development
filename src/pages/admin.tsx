import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { EnhancedAdminDashboard } from '@/components/admin/dashboard/EnhancedAdminDashboard';
import { OrganizationManagementTable } from '@/components/admin/organizations/OrganizationManagementTable';
import { UserManagementInterface } from '@/components/admin/users/UserManagementInterface';
import { PartnershipManagementCenter } from '@/components/admin/partnerships/PartnershipManagementCenter';
import { BigQueryClientManagement } from '@/components/admin/data/BigQueryClientManagement';
import { SecurityCompliancePanel } from '@/components/admin/security/SecurityCompliancePanel';
import { usePermissions } from '@/hooks/usePermissions';

const AdminPanel: React.FC = () => {
  const { isSuperAdmin, isLoading } = usePermissions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      navigate('/dashboard');
    }
  }, [isSuperAdmin, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading admin panel...</div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <EnhancedAdminDashboard />;
      case 'organizations':
        return <OrganizationManagementTable />;
      case 'users':
        return <UserManagementInterface />;
      case 'partnerships':
        return <PartnershipManagementCenter />;
      case 'bigquery':
        return <BigQueryClientManagement />;
      case 'security':
        return <SecurityCompliancePanel />;
      default:
        return <EnhancedAdminDashboard />;
    }
  };

  return (
    <AdminLayout currentPage={currentTab}>
      <div className="admin-panel-wrapper">{renderTabContent()}</div>
    </AdminLayout>
  );
};

export default AdminPanel;
