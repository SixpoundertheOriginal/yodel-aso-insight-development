import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useEffect, useRef } from 'react';
import { logger, truncateOrgId } from '@/utils/logger';

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

  // Track previous values for change detection
  const prevOrgId = useRef(organizationId);
  const prevRoles = useRef(roles);

  // Log only when organizationId or roles change
  useEffect(() => {
    if (prevOrgId.current !== organizationId || prevRoles.current !== roles) {
      logger.permissions(
        `Access control updated: org=${truncateOrgId(organizationId)}, roles=${roles.length}, superAdmin=${isSuperAdmin}`
      );
      prevOrgId.current = organizationId;
      prevRoles.current = roles;
    }
  }, [organizationId, roles, isSuperAdmin]);

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
  // CRITICAL FIX: If organizationId is null, treat as still loading (don't deny access yet)
  // This prevents false access denial during React state propagation delays
  const treatAsLoading = isLoading || permissionsLoading || (isAuthenticated && organizationId === null && !isSuperAdmin);

  if (treatAsLoading || !isAuthenticated || isInAuthFlow) {
    return {
      isAuthenticated,
      isLoading: treatAsLoading,
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