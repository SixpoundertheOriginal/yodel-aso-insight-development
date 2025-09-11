import { PLATFORM_FEATURES_CONFIG, featureEnabledForRole, type UserRole } from '@/constants/features';

/**
 * Test helper to validate feature access functionality
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
      !!PLATFORM_FEATURES_CONFIG.ASO_AI_HUB?.enabled && 
      !!PLATFORM_FEATURES_CONFIG.CHATGPT_VISIBILITY_AUDIT?.enabled;

    // Test 2: Super admin has access
    results.superAdminAccess = 
      featureEnabledForRole('ASO_AI_HUB', 'super_admin') &&
      featureEnabledForRole('CHATGPT_VISIBILITY_AUDIT', 'super_admin');

    // Test 3: Viewer is denied
    results.viewerDenied = 
      !featureEnabledForRole('ASO_AI_HUB', 'viewer') &&
      !featureEnabledForRole('CHATGPT_VISIBILITY_AUDIT', 'viewer');

    // Test 4: Safety valve for super_admin on missing features
    const safetyValve = featureEnabledForRole('NON_EXISTENT_FEATURE' as any, 'super_admin');

    results.allTestsPassed = 
      results.hasAuditFeatures && 
      results.superAdminAccess && 
      results.viewerDenied &&
      safetyValve;

    console.log('✅ Feature access validation results:', results);
    return results;
    
  } catch (error) {
    console.error('❌ Feature access validation failed:', error);
    return { ...results, error: error.message };
  }
}

// Run validation in development mode
if (process.env.NODE_ENV === 'development') {
  validateFeatureAccess();
}