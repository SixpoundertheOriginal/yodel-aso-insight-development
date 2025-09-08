import { useUserProfile } from './useUserProfile';

export const useDemoOrgDetection = () => {
  const { profile, isLoading } = useUserProfile();
  const organization = profile?.organizations;
  const isDemoOrg = Boolean(organization?.settings?.demo_mode) || organization?.slug?.toLowerCase() === 'next';

  return {
    isDemoOrg,
    organization,
    loading: isLoading,
  };
};

export default useDemoOrgDetection;
