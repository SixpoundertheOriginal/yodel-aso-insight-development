import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AuthLoadingSpinner } from '@/components/Auth/AuthLoadingSpinner';
import { useUserProfile } from '@/hooks/useUserProfile';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const location = useLocation();

  // Show spinner while auth or profile are loading
  if (loading || (user && profileLoading)) {
    return <AuthLoadingSpinner />;
  }

  // If no authenticated user, store intended path and redirect to sign in
  if (!user) {
    const intended = location.pathname + location.search;
    sessionStorage.setItem('postLoginRedirect', intended);
    return <Navigate to="/auth/sign-in" replace />;
  }

  // ✅ ENHANCED: Only redirect non-super-admin users without organization
  // Platform Super Admins can have null organization_id and should access dashboard
  if (profile && !profile.organization_id) {
    // Check if user is a super admin
    const userRoles = profile.user_roles || [];
    const isSuperAdmin = userRoles.some((role: any) => 
      role.role === 'SUPER_ADMIN' && role.organization_id === null
    );
    
    if (!isSuperAdmin) {
      return <Navigate to="/apps" replace />;
    }
  }

  // Clear any stored intent once authenticated and organization validated
  sessionStorage.removeItem('postLoginRedirect');
  return <>{children}</>;
};

export default ProtectedRoute;
