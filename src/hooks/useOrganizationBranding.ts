import { useState, useEffect } from 'react';
import { BrandingService, OrganizationBranding } from '@/services/brandingService';
import { useUserProfile } from '@/hooks/useUserProfile';

export const useOrganizationBranding = (position: string = 'footer') => {
  const { profile } = useUserProfile();
  const [branding, setBranding] = useState<OrganizationBranding | null>(null);
  const [displayText, setDisplayText] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBranding = async () => {
      if (!profile?.organization_id || !profile?.organizations?.name) {
        setLoading(false);
        return;
      }

      try {
        const brandingConfig = await BrandingService.getOrganizationBranding(
          profile.organization_id,
          position
        );
        
        if (brandingConfig) {
          const text = BrandingService.renderBrandingText(
            brandingConfig.branding_template,
            profile.organizations.name
          );
          setBranding(brandingConfig);
          setDisplayText(text);
        }
      } catch (error) {
        console.error('Error loading branding:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBranding();
  }, [profile?.organization_id, profile?.organizations?.name, position]);

  return { branding, displayText, loading };
};