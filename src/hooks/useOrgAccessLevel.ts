import { useUserProfile } from '@/hooks/useUserProfile';
import type { OrgAccessLevel } from '@/config/allowedRoutes';

/**
 * Hook to extract organization access level from user profile
 * Used for route access control in navigation
 */
export const useOrgAccessLevel = (): OrgAccessLevel | null => {
  const { profile } = useUserProfile();

  // Organizations don't have access_level in schema - return null
  // Access control is handled via user_roles table
  return null;
};
