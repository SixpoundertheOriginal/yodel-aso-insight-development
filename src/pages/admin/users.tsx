import React, { useEffect } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { UserManagementInterface } from '@/components/admin/users/UserManagementInterface';
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';

const UsersPage: React.FC = () => {
  const { isSuperAdmin, isLoading } = usePermissions();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      navigate('/dashboard');
    }
  }, [isSuperAdmin, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-white">Loading users...</div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <AdminLayout currentPage="users">
      <UserManagementInterface />
    </AdminLayout>
  );
};

export default UsersPage;
