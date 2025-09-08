import { useCallback } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUIPermissions } from '@/hooks/useUIPermissions';

export interface DataAccessContext {
  scope: 'PLATFORM' | 'ORGANIZATION';
  organizationId: string | null;
  canAccessAllOrgs: boolean;
  availableOrgs: 'ALL' | string[];
}

export const useDataAccess = () => {
  const { profile } = useUserProfile();
  const { canAccessAllOrganizations } = useUIPermissions();

  const getDataContext = useCallback((): DataAccessContext => {
    if (canAccessAllOrganizations) {
      // Super admin - platform-wide access
      return {
        scope: 'PLATFORM',
        organizationId: null, // No org restriction
        canAccessAllOrgs: true,
        availableOrgs: 'ALL'
      };
    }

    // Regular user - organization-scoped
    return {
      scope: 'ORGANIZATION',
      organizationId: profile?.organization_id || null,
      canAccessAllOrgs: false,
      availableOrgs: profile?.organization_id ? [profile.organization_id] : []
    };
  }, [canAccessAllOrganizations, profile?.organization_id]);

  return getDataContext();
};