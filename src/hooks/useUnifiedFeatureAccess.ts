import { useState, useEffect, useCallback } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePermissions } from '@/hooks/usePermissions';
import { featureAccessService } from '@/services/featureAccess';
import { PLATFORM_FEATURES_ENHANCED, featureEnabledForRole } from '@/constants/features';

interface UserFeatureAccess {
  feature_key: string;
  org_enabled: boolean;
  user_override?: boolean;
  has_access: boolean;
}

/**
 * Unified hook for accessing all feature permission functionality
 * Replaces useEnhancedFeatureAccess as the canonical feature access hook
 */
export const useUnifiedFeatureAccess = () => {
  const { profile } = useUserProfile();
  const { isSuperAdmin, roles } = usePermissions();
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
      console.error('Failed to load unified feature access:', error);
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

    // Check role-based access first
    const userRole = roles?.[0]?.toLowerCase() || 'viewer';
    const roleAllowed = featureEnabledForRole(featureKey, userRole as any);
    
    // Then check organization entitlement and user overrides
    const feature = features.find(f => f.feature_key === featureKey);
    return feature?.has_access || roleAllowed || false;
  }, [features, isSuperAdmin, roles]);

  const getFeatureStatus = useCallback((featureKey: string) => {
    const feature = features.find(f => f.feature_key === featureKey);
    const userRole = roles?.[0]?.toLowerCase() || 'viewer';
    const roleAllowed = featureEnabledForRole(featureKey, userRole as any);
    
    return {
      hasAccess: hasFeature(featureKey),
      orgEnabled: feature?.org_enabled || false,
      userOverride: feature?.user_override,
      roleAllowed,
      source: isSuperAdmin ? 'super_admin' : 
              feature?.user_override !== undefined ? 'user_override' : 
              feature?.org_enabled ? 'organization' : 
              roleAllowed ? 'role_default' : 'denied'
    };
  }, [features, hasFeature, isSuperAdmin, roles]);

  const getAllFeatures = useCallback(() => {
    const allFeatures = Object.values(PLATFORM_FEATURES_ENHANCED);
    return allFeatures.map(featureKey => ({
      feature_key: featureKey,
      ...getFeatureStatus(featureKey)
    }));
  }, [getFeatureStatus]);

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
    getAllFeatures,
    features,
    loading,
    refreshFeatures: loadFeatures,
    logFeatureUsage
  };
};