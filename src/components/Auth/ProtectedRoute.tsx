import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AuthLoadingSpinner } from '@/components/Auth/AuthLoadingSpinner';
import { useDemoOrgDetection } from '@/hooks/useDemoOrgDetection';
import { usePermissions } from '@/hooks/usePermissions';
import { getAllowedRoutes, type Role } from '@/config/allowedRoutes';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const { roles = [], organizationId, isSuperAdmin, isLoading: permissionsLoading } = usePermissions();
  const { isDemoOrg, loading: orgLoading } = useDemoOrgDetection();
  const location = useLocation();
  const role =
    (roles[0]?.toUpperCase().replace('ORG_', 'ORGANIZATION_') as Role) || 'VIEWER';
  const allowed = getAllowedRoutes({ isDemoOrg, role });

  // Show spinner while auth or org/permissions are loading
  if (loading || (user && (orgLoading || permissionsLoading))) {
    return <AuthLoadingSpinner />;
  }

  // If no authenticated user, store intended path and redirect to sign in
  if (!user) {
    const intended = location.pathname + location.search;
    sessionStorage.setItem('postLoginRedirect', intended);
    return <Navigate to="/auth/sign-in" replace />;
  }

  // 🔧 FIX: Check if user is in auth flow - don't redirect during auth processes
  const isInAuthFlow = location.search.includes('access_token') || 
                      location.search.includes('token_hash') || 
                      location.search.includes('type=') ||
                      location.pathname.startsWith('/auth/');

  // ✅ ENHANCED: Only redirect non-super-admin users without organization
  // BUT NOT if they're in the middle of an auth flow (email confirmation, password reset, etc.)
  if (!permissionsLoading && organizationId === null && !isInAuthFlow) {
    if (!isSuperAdmin) {
      return <Navigate to="/apps" replace />;
    }
  }

  // Clear any stored intent once authenticated and organization validated
  sessionStorage.removeItem('postLoginRedirect');

  const pathname = location.pathname;
  if (!allowed.some(p => pathname.startsWith(p)) && pathname !== '/dashboard/executive') {
    return <Navigate to="/dashboard/executive" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
