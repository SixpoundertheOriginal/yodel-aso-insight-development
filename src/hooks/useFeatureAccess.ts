import { useState, useEffect, useCallback } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { featureAccessService } from '@/services/featureAccess';
import { PlatformFeature } from '@/constants/features';
import { withEnterpriseDefaults, hasFeatureSafe, ENTERPRISE_CORE_FEATURES } from '@/utils/enterpriseSafeGuards';

export const useFeatureAccess = () => {
  const { profile } = useUserProfile();
  const [rawFeatures, setRawFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Enterprise-safe feature access with built-in defaults
  const features = rawFeatures.length > 0 ? rawFeatures : Object.keys(ENTERPRISE_CORE_FEATURES);

  useEffect(() => {
    const fetchFeatures = async () => {
      // Fix: organization_id is in user_roles array, not directly on profile
      const organizationId = profile?.user_roles?.[0]?.organization_id || profile?.organization_id;

      if (!organizationId) {
        // Enterprise fallback: If user has no org, provide basic enterprise features
        // This prevents complete navigation breakdown in enterprise environments
        console.warn('[ENTERPRISE-FALLBACK] User has no organization_id, providing enterprise fallback features');
        setRawFeatures(Object.keys(ENTERPRISE_CORE_FEATURES));
        setLoading(false);
        return;
      }

      try {
        const orgFeatures = await featureAccessService.getOrgFeatures(organizationId);
        // Ensure we always have core features even if org setup is minimal
        const safeFeatures = orgFeatures?.length > 0 ? orgFeatures : Object.keys(ENTERPRISE_CORE_FEATURES);
        setRawFeatures(safeFeatures);
      } catch (error) {
        console.error('[ENTERPRISE-FALLBACK] Failed to fetch organization features:', error);
        // Enterprise-safe fallback: Comprehensive feature set for graceful degradation
        const enterpriseFallbackFeatures = [
          ...Object.keys(ENTERPRISE_CORE_FEATURES),
          'conversion_intelligence',
          'keyword_intelligence',
          'metadata_generator',
          'creative_review',
          'aso_chat',
          'competitive_intelligence',
          'app_discovery',
          'admin_panel',
          'platform_admin_access'
        ];
        setRawFeatures(enterpriseFallbackFeatures);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatures();
  }, [profile?.user_roles, profile?.organization_id]);

  const hasFeature = useCallback((featureKey: PlatformFeature | string) => {
    return hasFeatureSafe({ [featureKey]: features.includes(featureKey) }, featureKey, false);
  }, [features]);

  const refreshFeatures = useCallback(async () => {
    // Fix: organization_id is in user_roles array, not directly on profile
    const organizationId = profile?.user_roles?.[0]?.organization_id || profile?.organization_id;

    if (!organizationId) {
      setRawFeatures(Object.keys(ENTERPRISE_CORE_FEATURES));
      return;
    }

    setLoading(true);
    try {
      const orgFeatures = await featureAccessService.getOrgFeatures(organizationId);
      // Ensure we always have core features even on refresh
      const safeFeatures = orgFeatures?.length > 0 ? orgFeatures : Object.keys(ENTERPRISE_CORE_FEATURES);
      setRawFeatures(safeFeatures);
    } catch (error) {
      console.error('[ENTERPRISE-FALLBACK] Failed to refresh features:', error);
      // Enterprise-safe fallback on refresh failure
      const enterpriseFallbackFeatures = [
        ...Object.keys(ENTERPRISE_CORE_FEATURES),
        'conversion_intelligence',
        'keyword_intelligence',
        'metadata_generator',
        'creative_review',
        'aso_chat',
        'competitive_intelligence',
        'app_discovery',
        'admin_panel',
        'platform_admin_access'
      ];
      setRawFeatures(enterpriseFallbackFeatures);
    } finally {
      setLoading(false);
    }
  }, [profile?.user_roles, profile?.organization_id]);

  return { 
    hasFeature, 
    features, 
    loading,
    refreshFeatures
  };
};