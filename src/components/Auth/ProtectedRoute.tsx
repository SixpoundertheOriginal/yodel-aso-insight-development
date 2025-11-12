import React, { lazy, Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AuthLoadingSpinner } from '@/components/Auth/AuthLoadingSpinner';
import { useDemoOrgDetection } from '@/hooks/useDemoOrgDetection';
import { usePermissions } from '@/hooks/usePermissions';
import { getAllowedRoutes, type Role } from '@/config/allowedRoutes';
import { useUnifiedFeatureAccess } from '@/hooks/useUnifiedFeatureAccess';
import { resolvePermForPath } from '@/utils/navigation/navPermissionMap';
import { useToast } from '@/hooks/use-toast';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useServerAuth } from '@/context/ServerAuthContext';
import { authorizePath } from '@/services/authz';

// Lazy load NoAccess to avoid circular dependencies
const NoAccess = lazy(() => import('@/pages/no-access'));

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // ✅ ALL HOOKS MUST BE CALLED FIRST - NO EXCEPTIONS
  const { user, loading } = useAuth();
  const { roles = [], organizationId, isSuperAdmin, isLoading: permissionsLoading } = usePermissions();
  const { isDemoOrg, loading: orgLoading } = useDemoOrgDetection();
  const location = useLocation();
  const { toast } = useToast();
  
  // Enhanced access control check
  const currentPath = location.pathname + location.search;
  const { isAuthenticated, isLoading, shouldShowNoAccess } = useAccessControl(currentPath);
  const { loading: serverAuthLoading } = useServerAuth();
  const [routeAllowed, setRouteAllowed] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    // Don't call authorize until user and permissions are fully loaded
    // This prevents race condition where Edge Function queries before permissions are ready
    if (!user || permissionsLoading || loading) {
      return; // Wait for auth and permissions to load
    }

    let cancelled = false;
    const run = async () => {
      const result = await authorizePath(location.pathname, 'GET');
      if (!cancelled) setRouteAllowed(result.allow);
      if (!result.allow) sessionStorage.setItem('lastAuthzReason', result.reason || 'denied');
    };
    void run();
    return () => { cancelled = true; };
  }, [location.pathname, user, permissionsLoading, loading]);

  // ✅ MOVED: All other hooks must be called before any returns
  // Simplified: No UI permissions check needed
  
  // Compute derived values after all hooks
  const role = (roles[0]?.toUpperCase().replace('ORG_', 'ORGANIZATION_') as Role) || 'VIEWER';
  const allowed = getAllowedRoutes({ isDemoOrg, role, organizationId, orgAccessLevel: null, isSuperAdmin });
  const pathname = location.pathname;

  // ✅ NOW we can do conditional returns - all hooks have been called
  
  // Show spinner while auth or org/permissions are loading
  if (loading || (user && (orgLoading || permissionsLoading)) || isLoading || serverAuthLoading || routeAllowed === null) {
    return <AuthLoadingSpinner />;
  }

  // If no authenticated user, store intended path and redirect to sign in
  if (!isAuthenticated) {
    const intended = location.pathname + location.search;
    sessionStorage.setItem('postLoginRedirect', intended);
    return <Navigate to="/auth/sign-in" replace />;
  }

  // Show NoAccess screen for users without org/roles (unless super admin)
  // Super admins bypass this check even without organization
  if (!isSuperAdmin && (shouldShowNoAccess || routeAllowed === false)) {
    return (
      <Suspense fallback={<AuthLoadingSpinner />}>
        <NoAccess />
      </Suspense>
    );
  }

  // Clear any stored intent once authenticated and access validated
  sessionStorage.removeItem('postLoginRedirect');

  // Role-based route checking (fallback only):
  // If server authorization has responded, trust it and skip static allowlist.
  // Use allowlist only during initial loading before server auth result.
  if (routeAllowed === null) {
    if (!allowed.some(p => pathname.startsWith(p)) && pathname !== '/dashboard/executive') {
      return <Navigate to="/dashboard/executive" replace />;
    }
  }

  // Simplified: No nav permission enforcement

  return <>{children}</>;
};

export default ProtectedRoute;
