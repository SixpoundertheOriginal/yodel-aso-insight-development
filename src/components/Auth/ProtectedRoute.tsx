import React, { lazy, Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AuthLoadingSpinner } from '@/components/Auth/AuthLoadingSpinner';
import { useDemoOrgDetection } from '@/hooks/useDemoOrgDetection';
import { usePermissions } from '@/hooks/usePermissions';
import { getAllowedRoutes, type Role } from '@/config/allowedRoutes';
import { useUIPermissions } from '@/hooks/useUIPermissions';
import { resolvePermForPath } from '@/utils/navigation/navPermissionMap';
import { useToast } from '@/hooks/use-toast';
import { useAccessControl } from '@/hooks/useAccessControl';

// Lazy load NoAccess to avoid circular dependencies
const NoAccess = lazy(() => import('@/pages/no-access'));

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const { roles = [], organizationId, isSuperAdmin, isLoading: permissionsLoading } = usePermissions();
  const { isDemoOrg, loading: orgLoading } = useDemoOrgDetection();
  const location = useLocation();
  const { toast } = useToast();
  
  // Enhanced access control check
  const currentPath = location.pathname + location.search;
  const { isAuthenticated, isLoading, shouldShowNoAccess } = useAccessControl(currentPath);

  // Show spinner while auth or org/permissions are loading
  if (loading || (user && (orgLoading || permissionsLoading)) || isLoading) {
    return <AuthLoadingSpinner />;
  }

  // If no authenticated user, store intended path and redirect to sign in
  if (!isAuthenticated) {
    const intended = location.pathname + location.search;
    sessionStorage.setItem('postLoginRedirect', intended);
    return <Navigate to="/auth/sign-in" replace />;
  }

  // 🔥 NEW: Show NoAccess screen for users without org/roles (unless super admin)
  if (shouldShowNoAccess) {
    return (
      <Suspense fallback={<AuthLoadingSpinner />}>
        <NoAccess />
      </Suspense>
    );
  }

  // Clear any stored intent once authenticated and access validated
  sessionStorage.removeItem('postLoginRedirect');

  // Role-based route checking (existing logic preserved)
  const role = (roles[0]?.toUpperCase().replace('ORG_', 'ORGANIZATION_') as Role) || 'VIEWER';
  const allowed = getAllowedRoutes({ isDemoOrg, role });
  const { hasPermission, loading: uiPermsLoading } = useUIPermissions(organizationId || undefined);

  const pathname = location.pathname;
  if (!allowed.some(p => pathname.startsWith(p)) && pathname !== '/dashboard/executive') {
    return <Navigate to="/dashboard/executive" replace />;
  }

  // Optional nav permission enforcement (feature-flagged)
  const NAV_FLAG = (import.meta as any).env?.VITE_NAV_PERMISSIONS_ENABLED === 'true';
  if (NAV_FLAG && !isSuperAdmin) {
    const perm = resolvePermForPath(pathname);
    if (perm && !uiPermsLoading) {
      const ok = hasPermission(perm);
      if (!ok) {
        toast({ title: 'Not permitted', description: 'You do not have access to this section.' });
        return <Navigate to="/dashboard/executive" replace />;
      }
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
