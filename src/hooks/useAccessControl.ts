import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

export interface AccessControlState {
  isAuthenticated: boolean;
  isLoading: boolean;
  hasAccess: boolean;
  accessDenialReason: 'no-organization' | 'no-roles' | 'in-auth-flow' | null;
  shouldShowNoAccess: boolean;
}

/**
 * Hook to determine user access control state for the application
 * Returns whether user should see NoAccess screen vs normal app flow
 */
export const useAccessControl = (currentPath?: string): AccessControlState => {
  const { user, loading: authLoading } = useAuth();
  const { 
    organizationId, 
    roles = [], 
    isSuperAdmin, 
    isLoading: permissionsLoading 
  } = usePermissions();

  const isLoading = authLoading || (user && permissionsLoading);
  const isAuthenticated = !!user;
  
  // Check if user is in auth flow (OAuth, email confirmation, password reset, etc.)
  const isInAuthFlow = currentPath ? (
    currentPath.startsWith('/auth/') ||
    currentPath.includes('access_token') ||
    currentPath.includes('token_hash') ||
    currentPath.includes('type=recovery') ||
    currentPath.includes('type=signup')
  ) : false;

  // Don't apply access control during loading or auth flows
  if (isLoading || !isAuthenticated || isInAuthFlow) {
    return {
      isAuthenticated,
      isLoading,
      hasAccess: true, // Assume access during loading/auth
      accessDenialReason: isInAuthFlow ? 'in-auth-flow' : null,
      shouldShowNoAccess: false
    };
  }

  // Super admins always have access (even without org)
  if (isSuperAdmin) {
    return {
      isAuthenticated,
      isLoading: false,
      hasAccess: true,
      accessDenialReason: null,
      shouldShowNoAccess: false
    };
  }

  // Check if user has organization
  if (organizationId === null || organizationId === undefined) {
    return {
      isAuthenticated,
      isLoading: false,
      hasAccess: false,
      accessDenialReason: 'no-organization',
      shouldShowNoAccess: true
    };
  }

  // Check if user has any valid roles
  if (!roles.length || roles.length === 0) {
    return {
      isAuthenticated,
      isLoading: false,
      hasAccess: false,
      accessDenialReason: 'no-roles',
      shouldShowNoAccess: true
    };
  }

  // User has access
  return {
    isAuthenticated,
    isLoading: false,
    hasAccess: true,
    accessDenialReason: null,
    shouldShowNoAccess: false
  };
};

/**
 * Simple hook that just returns whether to show NoAccess screen
 */
export const useShouldShowNoAccess = (currentPath?: string): boolean => {
  const { shouldShowNoAccess } = useAccessControl(currentPath);
  return shouldShowNoAccess;
};