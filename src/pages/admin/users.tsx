import React, { useEffect } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { UserManagementInterface } from '@/components/admin/users/UserManagementInterface';
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';

const UsersPage: React.FC = () => {
  const { isSuperAdmin, isOrganizationAdmin, isLoading } = usePermissions();
  const navigate = useNavigate();
  const hasAccess = isSuperAdmin || isOrganizationAdmin;

  useEffect(() => {
    if (!isLoading && !hasAccess) {
      navigate('/dashboard');
    }
  }, [hasAccess, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-white">Loading users...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <AdminLayout currentPage="users">
      <UserManagementInterface />
    </AdminLayout>
  );
};

export default UsersPage;
