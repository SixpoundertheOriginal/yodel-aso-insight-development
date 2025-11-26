import { useUserProfile } from './useUserProfile';

export const useDemoOrgDetection = () => {
  const { profile, isLoading } = useUserProfile();
  const organization = profile?.organizations;
  // Demo mode has been removed - always return false
  const isDemoOrg = false;

  return {
    isDemoOrg,
    organization,
    loading: isLoading,
  };
};

export default useDemoOrgDetection;
