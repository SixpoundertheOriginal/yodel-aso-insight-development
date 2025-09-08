import { useState, useEffect, useCallback } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { featureAccessService } from '@/services/featureAccess';
import { PlatformFeature } from '@/constants/features';

export const useFeatureAccess = () => {
  const { profile } = useUserProfile();
  const [features, setFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatures = async () => {
      if (!profile?.organization_id) {
        setFeatures([]);
        setLoading(false);
        return;
      }

      try {
        const orgFeatures = await featureAccessService.getOrgFeatures(profile.organization_id);
        setFeatures(orgFeatures);
      } catch (error) {
        console.error('Failed to fetch organization features:', error);
        // Fallback: If feature access table doesn't exist, allow access to all features
        // This prevents the app from breaking during migration transitions
        setFeatures([
          'performance_intelligence',
          'executive_dashboard', 
          'analytics',
          'conversion_intelligence',
          'keyword_intelligence',
          'metadata_generator',
          'creative_review',
          'aso_chat',
          'competitive_intelligence',
          'app_discovery',
          'admin_panel'
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatures();
  }, [profile?.organization_id]);

  const hasFeature = useCallback((featureKey: PlatformFeature | string) => {
    return features.includes(featureKey);
  }, [features]);

  const refreshFeatures = useCallback(async () => {
    if (!profile?.organization_id) return;
    
    setLoading(true);
    try {
      const orgFeatures = await featureAccessService.getOrgFeatures(profile.organization_id);
      setFeatures(orgFeatures);
    } catch (error) {
      console.error('Failed to refresh features:', error);
      // Fallback: If feature access table doesn't exist, allow access to all features
      setFeatures([
        'performance_intelligence',
        'executive_dashboard', 
        'analytics',
        'conversion_intelligence',
        'keyword_intelligence',
        'metadata_generator',
        'creative_review',
        'aso_chat',
        'competitive_intelligence',
        'app_discovery',
        'admin_panel'
      ]);
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id]);

  return { 
    hasFeature, 
    features, 
    loading,
    refreshFeatures
  };
};