import { useUserProfile } from '@/hooks/useUserProfile';
import type { OrgAccessLevel } from '@/config/allowedRoutes';

/**
 * Hook to extract organization access level from user profile
 * Used for route access control in navigation
 */
export const useOrgAccessLevel = (): OrgAccessLevel | null => {
  const { profile } = useUserProfile();

  // Extract access_level from organizations relation
  const orgAccessLevel = profile?.organizations?.access_level as OrgAccessLevel | undefined;

  // Default to null if not loaded or not available
  return orgAccessLevel || null;
};
