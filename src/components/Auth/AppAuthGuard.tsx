import React, { lazy, Suspense } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useServerAuth } from '@/context/ServerAuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { authorizePath } from '@/services/authz';
import { AuthLoadingSpinner } from '@/components/Auth/AuthLoadingSpinner';

// Lazy load NoAccess to avoid bundle bloat
const NoAccess = lazy(() => import('@/pages/no-access'));

interface AppAuthGuardProps {
  children: React.ReactNode;
}

/**
 * High-level auth guard that handles global app access control
 * This runs before any route-level protection and handles:
 * - Unauthenticated users -> redirect to sign-in
 * - Authenticated users without org/roles -> show NoAccess
 * - Normal users -> continue to app
 */
export const AppAuthGuard: React.FC<AppAuthGuardProps> = ({ children }) => {
  const location = useLocation();
  const { user, loading } = useAuth();
  const currentPath = location.pathname + location.search;
  const { isAuthenticated, isLoading, shouldShowNoAccess } = useAccessControl(currentPath);
  const { loading: serverAuthLoading } = useServerAuth();
  const { isSuperAdmin, isLoading: permissionsLoading } = usePermissions();
  const [routeAllowed, setRouteAllowed] = React.useState<boolean | null>(null);

  // Public routes that don't need auth
  const publicRoutes = [
    '/auth/sign-in',
    '/auth/sign-up', 
    '/auth/confirm-email',
    '/auth/complete-signup',
    '/auth/update-password',
    '/404',
    '/no-access',
    '/' // Landing page
  ];

  const isPublicRoute = publicRoutes.some(route => 
    location.pathname === route || location.pathname.startsWith(route)
  );

  // Kick off server-side authorization for protected routes
  React.useEffect(() => {
    // Don't call authorize until user and permissions are fully loaded
    // This prevents race condition where Edge Function queries before permissions are ready
    if (!user || permissionsLoading || loading) {
      return; // Wait for auth and permissions to load
    }

    let cancelled = false;
    const run = async () => {
      // Only check for non-public routes
      if (isPublicRoute) {
        setRouteAllowed(true);
        return;
      }
      const result = await authorizePath(location.pathname, 'GET');
      if (!cancelled) setRouteAllowed(result.allow);
      if (!result.allow) {
        sessionStorage.setItem('lastAuthzReason', result.reason || 'denied');
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [location.pathname, isPublicRoute, user, permissionsLoading, loading]);

  // Show loading during initial auth + server auth
  if (loading || isLoading || serverAuthLoading || routeAllowed === null) {
    return <AuthLoadingSpinner />;
  }

  // Allow public routes without auth
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Redirect unauthenticated users to sign-in
  if (!isAuthenticated) {
    const intended = location.pathname + location.search;
    sessionStorage.setItem('postLoginRedirect', intended);
    return <Navigate to="/auth/sign-in" replace />;
  }

  // Show NoAccess for authenticated users without proper access
  // Super admins bypass this check even without organization
  if (!isSuperAdmin && (shouldShowNoAccess || routeAllowed === false)) {
    return (
      <Suspense fallback={<AuthLoadingSpinner />}>
        <NoAccess />
      </Suspense>
    );
  }

  // Continue to app for valid users
  return <>{children}</>;
};

export default AppAuthGuard;
