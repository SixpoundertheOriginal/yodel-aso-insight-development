/**
 * useMonitoredAudit Hook
 *
 * Fetches cached audit data for a monitored app with auto-healing:
 * - monitored_apps row
 * - latest app_metadata_cache
 * - latest audit_snapshot
 *
 * NEW: Integrates with consistency system to auto-rebuild invalid/stale entries.
 * Users will NEVER see "No metadata cache available" errors.
 *
 * This hook is used when viewing a monitored app's audit from the Workspace,
 * ensuring we load cached data instead of triggering a new import.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MonitoredAppWithAudit, AppMetadataCache, AuditSnapshot, BibleAuditSnapshot } from '@/modules/app-monitoring';
import { getKeyFromMonitoredApp } from '@/utils/monitoringKeys';
import { useMonitoredAppConsistency } from './useMonitoredAppConsistency';

export interface MonitoredAuditData {
  monitoredApp: MonitoredAppWithAudit;
  metadataCache: AppMetadataCache | null;
  latestSnapshot: AuditSnapshot | null;
  // Phase 19: Bible-driven snapshot (preferred)
  bibleSnapshot?: BibleAuditSnapshot | null;
  auditResult?: any; // Parsed UnifiedMetadataAuditResult from Bible snapshot
}

/**
 * Hook to fetch monitored audit data (RLS-safe, organization-scoped)
 *
 * @param marketCode - Optional market code to filter audits by specific market
 */
export function useMonitoredAudit(
  monitoredAppId: string | undefined,
  organizationId: string | undefined,
  marketCode?: string
) {
  return useQuery({
    queryKey: ['monitored-audit', organizationId, monitoredAppId, marketCode],
    queryFn: async (): Promise<MonitoredAuditData> => {
      if (!monitoredAppId || !organizationId) {
        throw new Error('Missing monitoredAppId or organizationId');
      }

      console.log('[useMonitoredAudit] Fetching cached audit for:', monitoredAppId);

      // ========================================================================
      // STEP 1: Fetch monitored_apps row
      // ========================================================================
      const { data: monitoredApp, error: monitoredAppError } = await supabase
        .from('monitored_apps')
        .select('*')
        .eq('id', monitoredAppId)
        .eq('organization_id', organizationId) // RLS-safe filter
        .single();

      if (monitoredAppError) {
        console.error('[useMonitoredAudit] Failed to fetch monitored app:', monitoredAppError);
        throw new Error(`Failed to fetch monitored app: ${monitoredAppError.message}`);
      }

      if (!monitoredApp) {
        throw new Error('Monitored app not found or access denied');
      }

      console.log('[useMonitoredAudit] ✓ Monitored app:', monitoredApp.app_name);

      // ========================================================================
      // STEP 1.5: Normalize composite key (CRITICAL for cache hits)
      // ========================================================================
      const normalizedKey = getKeyFromMonitoredApp(monitoredApp);

      console.log('[useMonitoredAudit] Normalized key for cache lookup:', {
        app_id: normalizedKey.app_id,
        platform: normalizedKey.platform,
        locale: normalizedKey.locale
      });

      // ========================================================================
      // STEP 2: Fetch latest metadata cache (using normalized key)
      // ========================================================================
      const { data: metadataCache, error: cacheError } = await supabase
        .from('app_metadata_cache')
        .select('*')
        .eq('organization_id', normalizedKey.organization_id)
        .eq('app_id', normalizedKey.app_id)
        .eq('platform', normalizedKey.platform)
        .eq('locale', normalizedKey.locale)
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cacheError) {
        console.warn('[useMonitoredAudit] Failed to fetch metadata cache:', cacheError);
        // Non-fatal - continue without cache
      } else if (metadataCache) {
        console.log('[useMonitoredAudit] ✓ Metadata cache found');
      } else {
        console.warn('[useMonitoredAudit] No metadata cache available');
      }

      // ========================================================================
      // STEP 3: Fetch latest Bible-driven audit snapshot (Phase 19)
      // ========================================================================
      // If marketCode is provided, get the monitored_app_market_id first
      let marketId: string | null = null;
      if (marketCode) {
        const { data: marketData } = await supabase
          .from('monitored_app_markets')
          .select('id')
          .eq('monitored_app_id', monitoredAppId)
          .eq('market_code', marketCode)
          .maybeSingle();

        marketId = marketData?.id || null;

        if (!marketId) {
          console.warn(`[useMonitoredAudit] Market ${marketCode} not found for app ${monitoredAppId}`);
        }
      }

      // Build query for Bible snapshot with optional market filter
      let bibleSnapshotQuery = supabase
        .from('aso_audit_snapshots')
        .select('*')
        .eq('monitored_app_id', monitoredAppId);

      // Apply market filter if we have a marketId
      if (marketId) {
        bibleSnapshotQuery = bibleSnapshotQuery.eq('monitored_app_market_id', marketId);
      }

      const { data: bibleSnapshot, error: bibleSnapshotError } = await bibleSnapshotQuery
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (bibleSnapshotError) {
        console.warn('[useMonitoredAudit] Failed to fetch Bible snapshot:', bibleSnapshotError);
      } else if (bibleSnapshot) {
        console.log('[useMonitoredAudit] ✓ Bible snapshot found (score:', bibleSnapshot.overall_score, ')');
      } else {
        console.log('[useMonitoredAudit] No Bible snapshot available yet');
      }

      // ========================================================================
      // STEP 4: Fallback to OLD audit snapshot (backwards compatibility)
      // ========================================================================
      let latestSnapshot = null;

      if (!bibleSnapshot) {
        const { data: oldSnapshot, error: snapshotError } = await supabase
          .from('audit_snapshots')
          .select('*')
          .eq('organization_id', normalizedKey.organization_id)
          .eq('app_id', normalizedKey.app_id)
          .eq('platform', normalizedKey.platform)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (snapshotError) {
          console.warn('[useMonitoredAudit] Failed to fetch OLD snapshot:', snapshotError);
        } else if (oldSnapshot) {
          console.log('[useMonitoredAudit] ✓ OLD snapshot found (score:', oldSnapshot.audit_score, ')');
          latestSnapshot = oldSnapshot;
        } else {
          console.warn('[useMonitoredAudit] No audit snapshot available');
        }
      }

      // Extract audit result from Bible snapshot (JSONB)
      const auditResult = bibleSnapshot?.audit_result || null;

      return {
        monitoredApp: monitoredApp as MonitoredAppWithAudit,
        metadataCache: metadataCache as AppMetadataCache | null,
        latestSnapshot: latestSnapshot as AuditSnapshot | null,
        bibleSnapshot: bibleSnapshot as BibleAuditSnapshot | null,
        auditResult // Parsed UnifiedMetadataAuditResult
      };
    },
    enabled: Boolean(monitoredAppId && organizationId),
    staleTime: 5 * 60 * 1000, // 5 minutes - cache is relatively fresh
    retry: 1
  });
}

/**
 * Enhanced hook with auto-healing consistency system
 *
 * This is the RECOMMENDED hook for workspace pages.
 * It automatically validates and rebuilds invalid/stale entries before loading.
 *
 * Usage:
 * ```tsx
 * const { data, isLoading, isAutoHealing } = useMonitoredAuditWithConsistency(
 *   monitoredAppId,
 *   organizationId
 * );
 *
 * if (isLoading || isAutoHealing) {
 *   return <LoadingShimmer message="Refreshing data..." />;
 * }
 *
 * // data.metadataCache and data.latestSnapshot are GUARANTEED to exist
 * ```
 */
export function useMonitoredAuditWithConsistency(
  monitoredAppId: string | undefined,
  organizationId: string | undefined,
  marketCode?: string,
  options: {
    /**
     * If false, skips auto-rebuild and just returns validation state
     * Default: true
     */
    autoRebuild?: boolean;
    /**
     * If true, shows toast notifications during rebuild
     * Default: false (silent auto-healing)
     */
    showNotifications?: boolean;
  } = {}
) {
  const { autoRebuild = true, showNotifications = false } = options;

  // STEP 1: Validate and auto-rebuild if needed
  const {
    validated_state,
    isValidating,
    isRebuilding,
    isAutoHealing,
    needs_rebuild
  } = useMonitoredAppConsistency(monitoredAppId, organizationId, {
    autoRebuild,
    showNotifications
  });

  // STEP 2: Fetch cached audit (only after validation/rebuild completes)
  const auditQuery = useMonitoredAudit(monitoredAppId, organizationId, marketCode);

  // Disable audit query until consistency is validated and rebuilt if needed
  const shouldFetchAudit =
    validated_state === 'valid' ||
    (!isValidating && !isRebuilding && !needs_rebuild);

  return {
    ...auditQuery,
    // Override isLoading to include consistency check
    isLoading: auditQuery.isLoading || isValidating || isRebuilding,
    // Expose consistency state
    validated_state,
    isValidating,
    isRebuilding,
    isAutoHealing,
    needs_rebuild,
    // Data is only available after validation passes
    data: shouldFetchAudit ? auditQuery.data : undefined
  };
}
