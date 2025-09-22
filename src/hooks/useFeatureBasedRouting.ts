import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEnhancedFeatureAccess } from '@/hooks/useEnhancedFeatureAccess';
import { usePermissions } from '@/hooks/usePermissions';
import { PLATFORM_FEATURES_ENHANCED } from '@/constants/updatedFeatures';

// Route to feature mapping
const ROUTE_FEATURE_MAP: Record<string, string> = {
  '/dashboard/executive': PLATFORM_FEATURES_ENHANCED.EXECUTIVE_DASHBOARD,
  '/dashboard/analytics': PLATFORM_FEATURES_ENHANCED.ANALYTICS,
  '/dashboard/conversion-rate': PLATFORM_FEATURES_ENHANCED.CONVERSION_INTELLIGENCE,
  '/aso-ai-hub': PLATFORM_FEATURES_ENHANCED.ASO_AI_HUB,
  '/chatgpt-visibility-audit': PLATFORM_FEATURES_ENHANCED.CHATGPT_VISIBILITY_AUDIT,
  '/metadata-copilot': PLATFORM_FEATURES_ENHANCED.METADATA_GENERATOR,
  '/creative-analysis': PLATFORM_FEATURES_ENHANCED.CREATIVE_REVIEW,
  '/growth-accelerators/keywords': PLATFORM_FEATURES_ENHANCED.KEYWORD_INTELLIGENCE,
  '/growth-accelerators/competitor-overview': PLATFORM_FEATURES_ENHANCED.COMPETITIVE_INTELLIGENCE,
  '/growth-accelerators/reviews': PLATFORM_FEATURES_ENHANCED.REVIEW_MANAGEMENT,
  '/growth-accelerators/review-management-v2': PLATFORM_FEATURES_ENHANCED.REVIEW_MANAGEMENT_V2,
  '/apps': PLATFORM_FEATURES_ENHANCED.APP_INTELLIGENCE,
  '/admin': PLATFORM_FEATURES_ENHANCED.ADMIN_PANEL,
  '/profile': PLATFORM_FEATURES_ENHANCED.PROFILE_MANAGEMENT,
  '/settings': PLATFORM_FEATURES_ENHANCED.PREFERENCES
};

export const useFeatureBasedRouting = () => {
  const { hasFeature, logFeatureUsage } = useEnhancedFeatureAccess();
  const { isSuperAdmin } = usePermissions();
  const navigate = useNavigate();

  const checkRouteAccess = useCallback((path: string): boolean => {
    // Super admin bypass
    if (isSuperAdmin) {
      return true;
    }

    const requiredFeature = ROUTE_FEATURE_MAP[path];
    
    // If no feature requirement, allow access
    if (!requiredFeature) {
      return true;
    }

    return hasFeature(requiredFeature);
  }, [hasFeature, isSuperAdmin]);

  const navigateWithFeatureCheck = useCallback((path: string) => {
    const requiredFeature = ROUTE_FEATURE_MAP[path];
    
    if (requiredFeature && !isSuperAdmin) {
      logFeatureUsage(requiredFeature, 'route_access', { 
        attempted_path: path,
        access_granted: hasFeature(requiredFeature)
      });

      if (!hasFeature(requiredFeature)) {
        // Redirect to no-access page
        navigate('/no-access', { 
          state: { 
            message: `You don't have access to this feature. Please contact your administrator.`,
            requiredFeature: requiredFeature
          }
        });
        return false;
      }
    }

    navigate(path);
    return true;
  }, [hasFeature, isSuperAdmin, logFeatureUsage, navigate]);

  const getAccessibleRoutes = useCallback((): string[] => {
    if (isSuperAdmin) {
      return Object.keys(ROUTE_FEATURE_MAP);
    }

    return Object.keys(ROUTE_FEATURE_MAP).filter(path => {
      const requiredFeature = ROUTE_FEATURE_MAP[path];
      return !requiredFeature || hasFeature(requiredFeature);
    });
  }, [hasFeature, isSuperAdmin]);

  return {
    checkRouteAccess,
    navigateWithFeatureCheck,
    getAccessibleRoutes,
    routeFeatureMap: ROUTE_FEATURE_MAP
  };
};