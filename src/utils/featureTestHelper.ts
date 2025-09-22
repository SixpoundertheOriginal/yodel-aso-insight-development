import { PLATFORM_FEATURES_ENHANCED, featureEnabledForRole, type UserRole } from '@/constants/features';

/**
 * Test helper to validate unified feature access functionality
 * This prevents regressions where super_admin gets locked out
 */
export function validateFeatureAccess() {
  const results = {
    hasAuditFeatures: false,
    superAdminAccess: false,
    viewerDenied: false,
    allTestsPassed: false
  };

  try {
    // Test 1: Audit features exist
    results.hasAuditFeatures = 
      !!PLATFORM_FEATURES_ENHANCED.ASO_AI_HUB && 
      !!PLATFORM_FEATURES_ENHANCED.CHATGPT_VISIBILITY_AUDIT;

    // Test 2: Super admin has access
    results.superAdminAccess = 
      featureEnabledForRole(PLATFORM_FEATURES_ENHANCED.ASO_AI_HUB, 'super_admin') &&
      featureEnabledForRole(PLATFORM_FEATURES_ENHANCED.CHATGPT_VISIBILITY_AUDIT, 'super_admin');

    // Test 3: Viewer is denied
    results.viewerDenied = 
      !featureEnabledForRole(PLATFORM_FEATURES_ENHANCED.ASO_AI_HUB, 'viewer') &&
      !featureEnabledForRole(PLATFORM_FEATURES_ENHANCED.CHATGPT_VISIBILITY_AUDIT, 'viewer');

    // Test 4: Safety valve for super_admin on missing features
    const safetyValve = featureEnabledForRole('NON_EXISTENT_FEATURE', 'super_admin');

    results.allTestsPassed = 
      results.hasAuditFeatures && 
      results.superAdminAccess && 
      results.viewerDenied &&
      safetyValve;

    console.log('✅ Unified feature access validation results:', results);
    return results;
    
  } catch (error) {
    console.error('❌ Unified feature access validation failed:', error);
    return { ...results, error: (error as Error).message };
  }
}

// Run validation in development mode
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  // Add a small delay to ensure all modules are loaded
  setTimeout(() => {
    validateFeatureAccess();
  }, 100);
}