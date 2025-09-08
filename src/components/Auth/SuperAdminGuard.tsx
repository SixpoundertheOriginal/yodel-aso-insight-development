import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { AuthLoadingSpinner } from '@/components/Auth/AuthLoadingSpinner';

interface SuperAdminGuardProps {
  children: React.ReactNode;
}

export const SuperAdminGuard: React.FC<SuperAdminGuardProps> = ({ children }) => {
  const { user } = useAuth();
  const { isSuperAdmin, isLoading } = usePermissions();
  const isIgor = isSuperAdmin && user?.email === 'igor@yodelmobile.com';

  if (isLoading) {
    return <AuthLoadingSpinner />;
  }

  if (!isIgor) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default SuperAdminGuard;
