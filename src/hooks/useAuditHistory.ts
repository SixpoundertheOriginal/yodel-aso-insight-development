/**
 * useAuditHistory Hook (Phase 19)
 *
 * Fetches complete audit history for a monitored app, including:
 * - All Bible-driven audit snapshots
 * - Diffs between consecutive snapshots
 * - Trend analysis (score changes over time)
 *
 * This hook is used in the Audit History View to display timeline and trends.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  BibleAuditSnapshot,
  AuditDiff,
  BibleAuditHistory,
  BibleAuditHistoryQueryParams
} from '@/modules/app-monitoring';

/**
 * Hook to fetch audit history for a monitored app
 */
export function useAuditHistory(params: BibleAuditHistoryQueryParams) {
  return useQuery({
    queryKey: [
      'audit-history',
      params.monitored_app_id,
      params.organization_id,
      params.limit,
      params.offset,
      params.include_diffs
    ],
    queryFn: async (): Promise<BibleAuditHistory> => {
      const {
        monitored_app_id,
        organization_id,
        limit = 50,
        offset = 0,
        include_diffs = true
      } = params;

      console.log('[useAuditHistory] Fetching history for:', monitored_app_id);

      // ========================================================================
      // STEP 1: Fetch audit snapshots
      // ========================================================================
      const { data: snapshots, error: snapshotsError } = await supabase
        .from('aso_audit_snapshots')
        .select('*')
        .eq('monitored_app_id', monitored_app_id)
        .eq('organization_id', organization_id) // RLS safety
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (snapshotsError) {
        console.error('[useAuditHistory] Failed to fetch snapshots:', snapshotsError);
        throw new Error(`Failed to fetch audit history: ${snapshotsError.message}`);
      }

      const totalCount = snapshots?.length || 0;
      const latestSnapshot = snapshots?.[0] || null;
      const latestScore = latestSnapshot?.overall_score || null;

      console.log('[useAuditHistory] ✓ Fetched', totalCount, 'snapshots');

      // Calculate score change (latest vs previous)
      let scoreChange = null;
      if (snapshots && snapshots.length >= 2) {
        scoreChange = snapshots[0].overall_score - snapshots[1].overall_score;
      }

      // ========================================================================
      // STEP 2: Fetch diffs (optional)
      // ========================================================================
      let diffs: AuditDiff[] = [];

      if (include_diffs && snapshots && snapshots.length > 0) {
        const snapshotIds = snapshots.map(s => s.id);

        const { data: diffsData, error: diffsError } = await supabase
          .from('aso_audit_diffs')
          .select('*')
          .eq('monitored_app_id', monitored_app_id)
          .in('from_snapshot_id', snapshotIds)
          .order('created_at', { ascending: false });

        if (diffsError) {
          console.warn('[useAuditHistory] Failed to fetch diffs:', diffsError);
          // Non-fatal - continue without diffs
        } else {
          diffs = diffsData as AuditDiff[];
          console.log('[useAuditHistory] ✓ Fetched', diffs.length, 'diffs');
        }
      }

      return {
        snapshots: snapshots as BibleAuditSnapshot[],
        diffs,
        totalCount,
        latestSnapshot: latestSnapshot as BibleAuditSnapshot | null,
        latestScore,
        scoreChange,
        hasTrend: totalCount >= 2
      };
    },
    enabled: Boolean(params.monitored_app_id && params.organization_id),
    staleTime: 1 * 60 * 1000, // 1 minute - audit history is relatively static
    retry: 1
  });
}

/**
 * Hook to fetch a single audit snapshot by ID
 */
export function useAuditSnapshot(
  snapshotId: string | undefined,
  organizationId: string | undefined
) {
  return useQuery({
    queryKey: ['audit-snapshot', snapshotId, organizationId],
    queryFn: async (): Promise<BibleAuditSnapshot> => {
      if (!snapshotId || !organizationId) {
        throw new Error('Missing snapshotId or organizationId');
      }

      console.log('[useAuditSnapshot] Fetching snapshot:', snapshotId);

      const { data, error } = await supabase
        .from('aso_audit_snapshots')
        .select('*')
        .eq('id', snapshotId)
        .eq('organization_id', organizationId) // RLS safety
        .single();

      if (error) {
        console.error('[useAuditSnapshot] Failed to fetch snapshot:', error);
        throw new Error(`Failed to fetch audit snapshot: ${error.message}`);
      }

      console.log('[useAuditSnapshot] ✓ Snapshot found (score:', data.overall_score, ')');

      return data as BibleAuditSnapshot;
    },
    enabled: Boolean(snapshotId && organizationId),
    staleTime: 5 * 60 * 1000, // 5 minutes - snapshots are immutable
    retry: 1
  });
}

/**
 * Hook to fetch diff between two snapshots
 */
export function useAuditDiff(
  fromSnapshotId: string | undefined,
  toSnapshotId: string | undefined,
  organizationId: string | undefined
) {
  return useQuery({
    queryKey: ['audit-diff', fromSnapshotId, toSnapshotId, organizationId],
    queryFn: async (): Promise<AuditDiff | null> => {
      if (!fromSnapshotId || !toSnapshotId || !organizationId) {
        throw new Error('Missing snapshot IDs or organizationId');
      }

      console.log('[useAuditDiff] Fetching diff:', fromSnapshotId, '->', toSnapshotId);

      // Check if diff already exists
      const { data: existingDiff, error: fetchError } = await supabase
        .from('aso_audit_diffs')
        .select('*')
        .eq('from_snapshot_id', fromSnapshotId)
        .eq('to_snapshot_id', toSnapshotId)
        .eq('organization_id', organizationId) // RLS safety
        .maybeSingle();

      if (fetchError) {
        console.error('[useAuditDiff] Failed to fetch diff:', fetchError);
        throw new Error(`Failed to fetch diff: ${fetchError.message}`);
      }

      if (existingDiff) {
        console.log('[useAuditDiff] ✓ Diff found (score delta:', existingDiff.overall_score_delta, ')');
        return existingDiff as AuditDiff;
      }

      // Diff doesn't exist - compute it on-the-fly
      console.log('[useAuditDiff] Diff not found, computing...');

      // Fetch both snapshots
      const { data: fromSnapshot } = await supabase
        .from('aso_audit_snapshots')
        .select('*')
        .eq('id', fromSnapshotId)
        .single();

      const { data: toSnapshot } = await supabase
        .from('aso_audit_snapshots')
        .select('*')
        .eq('id', toSnapshotId)
        .single();

      if (!fromSnapshot || !toSnapshot) {
        console.warn('[useAuditDiff] One or both snapshots not found');
        return null;
      }

      // Compute diff
      const overall_score_delta = toSnapshot.overall_score - fromSnapshot.overall_score;
      const kpi_overall_score_delta = toSnapshot.kpi_overall_score && fromSnapshot.kpi_overall_score
        ? toSnapshot.kpi_overall_score - fromSnapshot.kpi_overall_score
        : null;

      // Simple diff computation (can be enhanced)
      const computedDiff: Partial<AuditDiff> = {
        from_snapshot_id: fromSnapshotId,
        to_snapshot_id: toSnapshotId,
        organization_id: organizationId,
        monitored_app_id: toSnapshot.monitored_app_id,
        overall_score_delta,
        kpi_overall_score_delta,
        title_changed: fromSnapshot.title !== toSnapshot.title,
        subtitle_changed: fromSnapshot.subtitle !== toSnapshot.subtitle,
        description_changed: fromSnapshot.description !== toSnapshot.description,
        change_summary: {
          scoreImprovement: overall_score_delta > 0,
          significantChanges: [],
          impactLevel: Math.abs(overall_score_delta) > 10 ? 'high' : Math.abs(overall_score_delta) > 5 ? 'medium' : 'low'
        }
      };

      console.log('[useAuditDiff] ✓ Diff computed (score delta:', overall_score_delta, ')');

      return computedDiff as AuditDiff;
    },
    enabled: Boolean(fromSnapshotId && toSnapshotId && organizationId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });
}
