import { useState, useEffect, useCallback } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePermissions } from '@/hooks/usePermissions';
import { featureAccessService } from '@/services/featureAccess';

interface UserFeatureAccess {
  feature_key: string;
  org_enabled: boolean;
  user_override?: boolean;
  has_access: boolean;
}

export const useEnhancedFeatureAccess = () => {
  const { profile } = useUserProfile();
  const { isSuperAdmin } = usePermissions();
  const [features, setFeatures] = useState<UserFeatureAccess[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeatures = useCallback(async () => {
    if (!profile?.id || !profile?.organization_id) {
      setFeatures([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userFeatures = await featureAccessService.getUserFeatureAccess(
        profile.id,
        profile.organization_id
      );
      setFeatures(userFeatures);
    } catch (error) {
      console.error('Failed to load enhanced feature access:', error);
      setFeatures([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, profile?.organization_id]);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  const hasFeature = useCallback((featureKey: string): boolean => {
    // Super admin bypass
    if (isSuperAdmin) {
      return true;
    }

    const feature = features.find(f => f.feature_key === featureKey);
    return feature?.has_access || false;
  }, [features, isSuperAdmin]);

  const getFeatureStatus = useCallback((featureKey: string) => {
    const feature = features.find(f => f.feature_key === featureKey);
    return {
      hasAccess: hasFeature(featureKey),
      orgEnabled: feature?.org_enabled || false,
      userOverride: feature?.user_override,
      source: isSuperAdmin ? 'super_admin' : 
              feature?.user_override !== undefined ? 'user_override' : 
              feature?.org_enabled ? 'organization' : 'default'
    };
  }, [features, hasFeature, isSuperAdmin]);

  const logFeatureUsage = useCallback(async (featureKey: string, usageType: string = 'access', metadata: any = {}) => {
    try {
      await featureAccessService.logFeatureUsage(featureKey, usageType, metadata);
    } catch (error) {
      console.error('Failed to log feature usage:', error);
    }
  }, []);

  return {
    hasFeature,
    getFeatureStatus,
    features,
    loading,
    refreshFeatures: loadFeatures,
    logFeatureUsage
  };
};