/**
 * Monitoring Composite Key Utilities
 *
 * CRITICAL: This file defines the SINGLE SOURCE OF TRUTH for composite keys
 * used across the monitored-app caching pipeline.
 *
 * All writes and reads to monitored_apps, app_metadata_cache, and audit_snapshots
 * MUST use these normalized keys to ensure cache hits.
 *
 * Root Cause Fixed:
 * - Inconsistent locale fallbacks caused cache misses
 * - NULL locale in database vs 'us' in cache
 * - Platform normalization was inconsistent
 */

export interface MonitoringCompositeKey {
  organization_id: string;
  app_id: string;
  platform: 'ios' | 'android';
  locale: string;
}

/**
 * Normalizes composite key for monitored app caching pipeline
 *
 * This function enforces:
 * 1. locale defaults to 'us' (NEVER null/undefined)
 * 2. platform normalized to lowercase ('ios' | 'android')
 * 3. app_id always string
 * 4. organization_id always string
 *
 * Use this for ALL writes and reads to ensure cache hits.
 */
export function normalizeMonitoringKey(input: {
  organizationId: string;
  appId: string;
  platform?: string | null;
  locale?: string | null;
}): MonitoringCompositeKey {
  // Normalize platform
  const normalizedPlatform =
    input.platform?.toLowerCase() === 'android' ? 'android' : 'ios';

  // Normalize locale (CRITICAL: always fallback to 'us')
  const normalizedLocale = input.locale?.trim() || 'us';

  return {
    organization_id: input.organizationId,
    app_id: input.appId,
    platform: normalizedPlatform,
    locale: normalizedLocale
  };
}

/**
 * Extracts and normalizes key from ScrapedMetadata
 */
export function getKeyFromMetadata(
  organizationId: string,
  metadata: {
    appId: string;
    platform?: string | null;
    locale?: string | null;
  }
): MonitoringCompositeKey {
  return normalizeMonitoringKey({
    organizationId,
    appId: metadata.appId,
    platform: metadata.platform,
    locale: metadata.locale
  });
}

/**
 * Extracts and normalizes key from monitored_apps row
 */
export function getKeyFromMonitoredApp(
  monitoredApp: {
    organization_id: string;
    app_id: string;
    platform: string;
    locale?: string | null;
  }
): MonitoringCompositeKey {
  return normalizeMonitoringKey({
    organizationId: monitoredApp.organization_id,
    appId: monitoredApp.app_id,
    platform: monitoredApp.platform,
    locale: monitoredApp.locale
  });
}
