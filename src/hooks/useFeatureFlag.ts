import { useState, useEffect } from 'react';

/**
 * Feature Flag Hook
 *
 * Simple client-side feature flags for gradual rollout.
 * Can be extended to use Supabase feature_flags table in production.
 *
 * Usage:
 * const isDashboardV3Enabled = useFeatureFlag('DASHBOARD_V3');
 */

type FeatureFlag =
  | 'DASHBOARD_V3' // Phase B: New dashboard architecture
  | 'WEB_WORKER_INTELLIGENCE' // Phase C: Web Worker intelligence
  | 'COMPONENT_MEMOIZATION'; // Phase D: React.memo optimization

interface FeatureFlagConfig {
  enabled: boolean;
  rolloutPercentage?: number; // 0-100, for A/B testing
  allowedOrgIds?: string[]; // Specific organizations
}

// ✅ PHASE B: Feature flag configuration
const FEATURE_FLAGS: Record<FeatureFlag, FeatureFlagConfig> = {
  // Dashboard V3 (Phase B)
  DASHBOARD_V3: {
    enabled: false, // Default: OFF (manual enable via localStorage)
    rolloutPercentage: 0, // 0% by default
  },

  // Web Worker Intelligence (Phase C)
  WEB_WORKER_INTELLIGENCE: {
    enabled: true, // Always enabled in V3
  },

  // Component Memoization (Phase D)
  COMPONENT_MEMOIZATION: {
    enabled: true, // Always enabled
  },
};

/**
 * Check if a feature flag is enabled
 */
export function useFeatureFlag(flagName: FeatureFlag): boolean {
  const [isEnabled, setIsEnabled] = useState<boolean>(false);

  useEffect(() => {
    const config = FEATURE_FLAGS[flagName];

    if (!config) {
      console.warn(`[FEATURE-FLAG] Unknown flag: ${flagName}`);
      setIsEnabled(false);
      return;
    }

    // Check localStorage override (for manual testing)
    const localStorageKey = `feature_${flagName.toLowerCase()}`;
    const localOverride = localStorage.getItem(localStorageKey);

    if (localOverride === 'true') {
      console.log(`[FEATURE-FLAG] ${flagName} enabled via localStorage`);
      setIsEnabled(true);
      return;
    }

    if (localOverride === 'false') {
      console.log(`[FEATURE-FLAG] ${flagName} disabled via localStorage`);
      setIsEnabled(false);
      return;
    }

    // Default to config
    setIsEnabled(config.enabled);
  }, [flagName]);

  return isEnabled;
}

/**
 * Enable a feature flag via localStorage (for testing)
 *
 * Usage in browser console:
 * localStorage.setItem('feature_dashboard_v3', 'true');
 * location.reload();
 */
export function enableFeatureFlag(flagName: FeatureFlag): void {
  const key = `feature_${flagName.toLowerCase()}`;
  localStorage.setItem(key, 'true');
  console.log(`[FEATURE-FLAG] Enabled ${flagName}. Reload page to apply.`);
}

/**
 * Disable a feature flag via localStorage
 */
export function disableFeatureFlag(flagName: FeatureFlag): void {
  const key = `feature_${flagName.toLowerCase()}`;
  localStorage.setItem(key, 'false');
  console.log(`[FEATURE-FLAG] Disabled ${flagName}. Reload page to apply.`);
}

/**
 * Clear feature flag override (revert to default)
 */
export function clearFeatureFlagOverride(flagName: FeatureFlag): void {
  const key = `feature_${flagName.toLowerCase()}`;
  localStorage.removeItem(key);
  console.log(`[FEATURE-FLAG] Cleared override for ${flagName}. Reload page to apply.`);
}

// Export for console debugging
if (typeof window !== 'undefined') {
  (window as any).enableFeatureFlag = enableFeatureFlag;
  (window as any).disableFeatureFlag = disableFeatureFlag;
  (window as any).clearFeatureFlagOverride = clearFeatureFlagOverride;
}
