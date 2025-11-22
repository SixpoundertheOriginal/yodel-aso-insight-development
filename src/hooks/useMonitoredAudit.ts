/**
 * useMonitoredAudit Hook
 *
 * Fetches cached audit data for a monitored app:
 * - monitored_apps row
 * - latest app_metadata_cache
 * - latest audit_snapshot
 *
 * This hook is used when viewing a monitored app's audit from the Workspace,
 * ensuring we load cached data instead of triggering a new import.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MonitoredAppWithAudit, AppMetadataCache, AuditSnapshot } from '@/modules/app-monitoring';

export interface MonitoredAuditData {
  monitoredApp: MonitoredAppWithAudit;
  metadataCache: AppMetadataCache | null;
  latestSnapshot: AuditSnapshot | null;
}

/**
 * Hook to fetch monitored audit data (RLS-safe, organization-scoped)
 */
export function useMonitoredAudit(
  monitoredAppId: string | undefined,
  organizationId: string | undefined
) {
  return useQuery({
    queryKey: ['monitored-audit', organizationId, monitoredAppId],
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
      // STEP 2: Fetch latest metadata cache
      // ========================================================================
      const { data: metadataCache, error: cacheError } = await supabase
        .from('app_metadata_cache')
        .select('*')
        .eq('organization_id', organizationId) // RLS-safe filter
        .eq('app_id', monitoredApp.app_id)
        .eq('platform', monitoredApp.platform)
        .eq('locale', monitoredApp.locale)
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
      // STEP 3: Fetch latest audit snapshot
      // ========================================================================
      const { data: latestSnapshot, error: snapshotError } = await supabase
        .from('audit_snapshots')
        .select('*')
        .eq('organization_id', organizationId) // RLS-safe filter
        .eq('app_id', monitoredApp.app_id)
        .eq('platform', monitoredApp.platform)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (snapshotError) {
        console.warn('[useMonitoredAudit] Failed to fetch audit snapshot:', snapshotError);
        // Non-fatal - continue without snapshot
      } else if (latestSnapshot) {
        console.log('[useMonitoredAudit] ✓ Latest snapshot found (score:', latestSnapshot.audit_score, ')');
      } else {
        console.warn('[useMonitoredAudit] No audit snapshot available');
      }

      return {
        monitoredApp: monitoredApp as MonitoredAppWithAudit,
        metadataCache: metadataCache as AppMetadataCache | null,
        latestSnapshot: latestSnapshot as AuditSnapshot | null
      };
    },
    enabled: Boolean(monitoredAppId && organizationId),
    staleTime: 5 * 60 * 1000, // 5 minutes - cache is relatively fresh
    retry: 1
  });
}
