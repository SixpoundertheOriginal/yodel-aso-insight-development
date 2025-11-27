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
    // For public routes, immediately set as allowed
    if (isPublicRoute) {
      setRouteAllowed(true);
      return;
    }

    // If no user and not loading, they're logged out - reset routeAllowed
    if (!user && !loading) {
      setRouteAllowed(false);
      return;
    }

    // Don't call authorize until user and permissions are fully loaded
    // This prevents race condition where Edge Function queries before permissions are ready
    if (!user || permissionsLoading || loading) {
      return; // Wait for auth and permissions to load
    }

    let cancelled = false;
    const run = async () => {
      const result = await authorizePath(location.pathname, 'GET');
      if (!cancelled) setRouteAllowed(result.allow);
      if (!result.allow) {
        sessionStorage.setItem('lastAuthzReason', result.reason || 'denied');
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [location.pathname, isPublicRoute, user, permissionsLoading, loading]);

  // Add timeout to prevent infinite loading
  // If still loading after 10 seconds, treat as session expired
  React.useEffect(() => {
    if (!loading && !isLoading && !serverAuthLoading) return;

    const timeout = setTimeout(() => {
      // Still loading after 10 seconds - likely session issue
      if (!user) {
        console.warn('[AppAuthGuard] Auth check timeout - redirecting to sign-in');
        setRouteAllowed(false);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [loading, isLoading, serverAuthLoading, user]);

  // Allow public routes without auth
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Redirect unauthenticated users to sign-in IMMEDIATELY
  // Check this BEFORE loading screen to avoid confusing users
  if (!loading && !isAuthenticated) {
    const intended = location.pathname + location.search;
    sessionStorage.setItem('postLoginRedirect', intended);
    return <Navigate to="/auth/sign-in" replace />;
  }

  // Show loading ONLY during initial auth check (when loading=true)
  // Once we know auth status, don't show loading - either redirect or show content
  if (loading || (isLoading && routeAllowed === null) || (serverAuthLoading && routeAllowed === null)) {
    return <AuthLoadingSpinner />;
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
