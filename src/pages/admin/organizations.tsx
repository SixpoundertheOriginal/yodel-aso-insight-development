import React, { useEffect } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { OrganizationManagementTable } from '@/components/admin/organizations/OrganizationManagementTable';
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';

const OrganizationsPage: React.FC = () => {
  const { isSuperAdmin, isLoading } = usePermissions();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      navigate('/dashboard');
    }
  }, [isSuperAdmin, isLoading, navigate]);

  if (isLoading) {
    return <div className="admin-loading">Loading organizations...</div>;
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <AdminLayout currentPage="organizations">
      <OrganizationManagementTable />
    </AdminLayout>
  );
};

export default OrganizationsPage;
