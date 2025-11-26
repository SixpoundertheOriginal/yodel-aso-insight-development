/**
 * UPDATED: Three-Layer Feature Access Control System
 * Layer 1: Organization Entitlements (what org paid for)
 * Layer 2: Role-Based Permissions (what role can access) ← NEW
 * Layer 3: User Overrides (Phase 2 - individual exceptions)
 */
import { useState, useEffect, useCallback } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePermissions } from '@/hooks/usePermissions';
import { featureAccessService } from '@/services/featureAccess';
import { PlatformFeature } from '@/constants/features';
import { withEnterpriseDefaults, hasFeatureSafe, ENTERPRISE_CORE_FEATURES } from '@/utils/enterpriseSafeGuards';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

export const useFeatureAccess = () => {
  const { profile } = useUserProfile();
  const { userId, isSuperAdmin } = usePermissions();
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
        logger.once(
          'feature-access-no-org',
          '[FeatureAccess] No organization ID, using enterprise fallback features'
        );
        setRawFeatures(Object.keys(ENTERPRISE_CORE_FEATURES));
        setLoading(false);
        return;
      }

      // Super admins bypass all checks - get all org features
      if (isSuperAdmin) {
        try {
          const orgFeatures = await featureAccessService.getOrgFeatures(organizationId);
          const safeFeatures = orgFeatures?.length > 0 ? orgFeatures : Object.keys(ENTERPRISE_CORE_FEATURES);
          setRawFeatures(safeFeatures);
        } catch (error) {
          logger.error('FeatureAccess', 'Super admin: Failed to fetch org features, using fallback', error);
          setRawFeatures(Object.keys(ENTERPRISE_CORE_FEATURES));
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        // Layer 1: Get organization entitlements
        const orgFeatures = await featureAccessService.getOrgFeatures(organizationId);

        if (!orgFeatures || orgFeatures.length === 0) {
          logger.once('feature-access-no-org-features', '[FeatureAccess] Organization has no features enabled');
          setRawFeatures(Object.keys(ENTERPRISE_CORE_FEATURES));
          setLoading(false);
          return;
        }

        // Layer 2: Filter by role-based permissions
        if (userId) {
          try {
            // Use the user_role_permissions view to get features user's role allows
            const { data: rolePermissions, error: roleError } = await supabase
              .from('user_role_permissions')
              .select('feature_key')
              .eq('user_id', userId);

            if (roleError) {
              logger.error('FeatureAccess', 'Failed to fetch role permissions, using org features only', roleError);
              // Fallback to org features only if role permission check fails
              setRawFeatures(orgFeatures);
            } else {
              // Get intersection: features that BOTH org has AND role allows
              const allowedFeatureKeys = new Set(rolePermissions?.map(p => p.feature_key) || []);
              const filteredFeatures = orgFeatures.filter(f => allowedFeatureKeys.has(f));

              logger.once(
                'feature-access-filtered',
                `[FeatureAccess] Filtered ${orgFeatures.length} org features to ${filteredFeatures.length} role-allowed features`
              );

              // Ensure we always have core features
              const safeFeatures = filteredFeatures.length > 0 ? filteredFeatures : Object.keys(ENTERPRISE_CORE_FEATURES);
              setRawFeatures(safeFeatures);
            }
          } catch (error) {
            logger.error('FeatureAccess', 'Error in role permission check, using org features', error);
            setRawFeatures(orgFeatures);
          }
        } else {
          // No userId, use org features only
          setRawFeatures(orgFeatures);
        }

      } catch (error) {
        logger.error('FeatureAccess', 'Failed to fetch organization features, using fallback', error);
        // Enterprise-safe fallback: Comprehensive feature set for graceful degradation
        // NOTE: platform_admin_access removed to prevent non-super-admins appearing as super admins
        const enterpriseFallbackFeatures = [
          ...Object.keys(ENTERPRISE_CORE_FEATURES),
          'conversion_intelligence',
          'keyword_intelligence',
          'metadata_generator',
          'creative_review',
          'aso_chat',
          'competitive_intelligence',
          'app_discovery',
          'admin_panel'
        ];
        setRawFeatures(enterpriseFallbackFeatures);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatures();
  }, [profile?.user_roles, profile?.organization_id, userId, isSuperAdmin]);

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

    // Super admins bypass all checks
    if (isSuperAdmin) {
      try {
        const orgFeatures = await featureAccessService.getOrgFeatures(organizationId);
        const safeFeatures = orgFeatures?.length > 0 ? orgFeatures : Object.keys(ENTERPRISE_CORE_FEATURES);
        setRawFeatures(safeFeatures);
      } catch (error) {
        logger.error('FeatureAccess', 'Super admin: Failed to refresh org features, using fallback', error);
        setRawFeatures(Object.keys(ENTERPRISE_CORE_FEATURES));
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      // Layer 1: Get organization entitlements
      const orgFeatures = await featureAccessService.getOrgFeatures(organizationId);

      if (!orgFeatures || orgFeatures.length === 0) {
        setRawFeatures(Object.keys(ENTERPRISE_CORE_FEATURES));
        setLoading(false);
        return;
      }

      // Layer 2: Filter by role-based permissions
      if (userId) {
        try {
          const { data: rolePermissions, error: roleError } = await supabase
            .from('user_role_permissions')
            .select('feature_key')
            .eq('user_id', userId);

          if (roleError) {
            logger.error('FeatureAccess', 'Failed to fetch role permissions on refresh, using org features only', roleError);
            setRawFeatures(orgFeatures);
          } else {
            const allowedFeatureKeys = new Set(rolePermissions?.map(p => p.feature_key) || []);
            const filteredFeatures = orgFeatures.filter(f => allowedFeatureKeys.has(f));
            const safeFeatures = filteredFeatures.length > 0 ? filteredFeatures : Object.keys(ENTERPRISE_CORE_FEATURES);
            setRawFeatures(safeFeatures);
          }
        } catch (error) {
          logger.error('FeatureAccess', 'Error in role permission check on refresh, using org features', error);
          setRawFeatures(orgFeatures);
        }
      } else {
        setRawFeatures(orgFeatures);
      }

    } catch (error) {
      logger.error('FeatureAccess', 'Failed to refresh features, using fallback', error);
      // Enterprise-safe fallback on refresh failure
      // NOTE: platform_admin_access removed to prevent non-super-admins appearing as super admins
      const enterpriseFallbackFeatures = [
        ...Object.keys(ENTERPRISE_CORE_FEATURES),
        'conversion_intelligence',
        'keyword_intelligence',
        'metadata_generator',
        'creative_review',
        'aso_chat',
        'competitive_intelligence',
        'app_discovery',
        'admin_panel'
      ];
      setRawFeatures(enterpriseFallbackFeatures);
    } finally {
      setLoading(false);
    }
  }, [profile?.user_roles, profile?.organization_id, userId, isSuperAdmin]);

  return { 
    hasFeature, 
    features, 
    loading,
    refreshFeatures
  };
};