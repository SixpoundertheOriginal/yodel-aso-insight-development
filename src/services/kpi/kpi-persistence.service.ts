/**
 * KPI Persistence Service - Phase 2
 *
 * Service layer for persisting KPI Engine snapshots to Supabase.
 * Enables historical tracking, trend analysis, and competitor comparison.
 *
 * INVARIANTS:
 * - Never modifies KPI Engine (Phase 1)
 * - Never modifies audit pipelines or MetadataOrchestrator
 * - Multi-tenant safe (organization_id required for all operations)
 * - No UI logic (pure data layer)
 * - All operations are null-safe and never throw
 *
 * @see docs/KPI_ENGINE_PHASE2_SUPABASE.md
 * @see supabase/migrations/20260123000005_create_kpi_snapshots_table.sql
 */

import { supabase } from '@/integrations/supabase/client';
import type { KpiEngineResult } from '@/engine/metadata/kpi/kpi.types';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Parameters for saving a KPI snapshot
 */
export interface SaveKpiSnapshotParams {
  /** Organization ID (required for RLS) */
  organizationId: string;

  /** App ID (e.g., '310633997' for iOS) */
  appId: string;

  /** Bundle ID (optional, e.g., 'com.example.app') */
  bundleId?: string;

  /** Market/locale (e.g., 'us', 'gb') */
  market: string;

  /** Platform */
  platform: 'ios' | 'android';

  /** Metadata version identifier */
  metadataVersion: string;

  /** KPI Engine result (direct output from KpiEngine.evaluate) */
  kpiResult: KpiEngineResult;

  /** Title at time of snapshot */
  title?: string;

  /** Subtitle at time of snapshot */
  subtitle?: string;
}

/**
 * KPI Snapshot stored in database
 */
export interface KpiSnapshot {
  id: string;
  organization_id: string;
  app_id: string;
  bundle_id: string | null;
  market: string;
  platform: 'ios' | 'android';
  metadata_version: string;
  kpi_vector: number[];
  kpi_json: Record<string, unknown>;
  score_overall: number;
  score_families: Record<string, unknown>;
  title: string | null;
  subtitle: string | null;
  created_at: string;
}

/**
 * Result of save operation
 */
export interface SaveKpiSnapshotResult {
  success: boolean;
  snapshotId?: string;
  error?: string;
}

/**
 * Delta between two KPI snapshots
 */
export interface KpiDelta {
  /** KPI ID */
  kpiId: string;

  /** Previous normalized value */
  prevValue: number;

  /** Current normalized value */
  currentValue: number;

  /** Absolute delta */
  delta: number;

  /** Percent change */
  percentChange: number | null;
}

/**
 * Comparison result between two snapshots
 */
export interface KpiComparisonResult {
  /** Previous snapshot */
  previous: KpiSnapshot;

  /** Current snapshot */
  current: KpiSnapshot;

  /** Overall score delta */
  overallScoreDelta: number;

  /** Family score deltas */
  familyDeltas: Record<string, number>;

  /** Individual KPI deltas */
  kpiDeltas: KpiDelta[];

  /** Time elapsed between snapshots (milliseconds) */
  timeElapsedMs: number;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class KpiPersistenceService {
  /**
   * Save a KPI snapshot to Supabase
   *
   * @param params - Snapshot parameters
   * @returns Result with success flag and optional error message
   *
   * @example
   * ```ts
   * const kpiResult = KpiEngine.evaluate({ title: 'My App', ... });
   * const result = await KpiPersistenceService.saveKpiSnapshot({
   *   organizationId: 'org-123',
   *   appId: '310633997',
   *   market: 'us',
   *   platform: 'ios',
   *   metadataVersion: 'v1',
   *   kpiResult,
   *   title: 'My App',
   *   subtitle: 'Best App Ever',
   * });
   * ```
   */
  static async saveKpiSnapshot(
    params: SaveKpiSnapshotParams
  ): Promise<SaveKpiSnapshotResult> {
    try {
      const {
        organizationId,
        appId,
        bundleId,
        market,
        platform,
        metadataVersion,
        kpiResult,
        title,
        subtitle,
      } = params;

      // Validate required fields
      if (!organizationId || !appId || !market || !platform || !metadataVersion) {
        return {
          success: false,
          error: 'Missing required fields: organizationId, appId, market, platform, metadataVersion',
        };
      }

      if (!kpiResult || !kpiResult.vector || !kpiResult.kpis || !kpiResult.families) {
        return {
          success: false,
          error: 'Invalid kpiResult: missing vector, kpis, or families',
        };
      }

      // Validate vector length (should be 34 for Phase 1)
      if (kpiResult.vector.length !== 34) {
        return {
          success: false,
          error: `Invalid KPI vector length: expected 34, got ${kpiResult.vector.length}`,
        };
      }

      // Insert snapshot
      const { data, error } = await supabase
        .from('app_metadata_kpi_snapshots')
        .insert({
          organization_id: organizationId,
          app_id: appId,
          bundle_id: bundleId || null,
          market,
          platform,
          metadata_version: metadataVersion,
          kpi_vector: kpiResult.vector,
          kpi_json: kpiResult.kpis as unknown as Record<string, unknown>,
          score_overall: kpiResult.overallScore,
          score_families: kpiResult.families as unknown as Record<string, unknown>,
          title: title || null,
          subtitle: subtitle || null,
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ [KPI-PERSISTENCE] Failed to save snapshot:', error);
        return {
          success: false,
          error: error.message || 'Failed to save snapshot',
        };
      }

      if (!data) {
        return {
          success: false,
          error: 'No data returned from insert operation',
        };
      }

      console.log(`✅ [KPI-PERSISTENCE] Saved snapshot for app ${appId}:`, data.id);

      return {
        success: true,
        snapshotId: data.id,
      };
    } catch (err) {
      console.error('❌ [KPI-PERSISTENCE] Unexpected error saving snapshot:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get KPI snapshot history for an app
   *
   * @param organizationId - Organization ID
   * @param appId - App ID
   * @param limit - Maximum number of snapshots to return
   * @returns Array of snapshots ordered by created_at DESC
   *
   * @example
   * ```ts
   * const history = await KpiPersistenceService.getKpiSnapshots('org-123', '310633997', 50);
   * ```
   */
  static async getKpiSnapshots(
    organizationId: string,
    appId: string,
    limit: number = 50
  ): Promise<KpiSnapshot[]> {
    try {
      if (!organizationId || !appId) {
        console.error('❌ [KPI-PERSISTENCE] Missing organizationId or appId');
        return [];
      }

      const { data, error } = await supabase
        .from('app_metadata_kpi_snapshots')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('app_id', appId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ [KPI-PERSISTENCE] Failed to fetch snapshots:', error);
        return [];
      }

      return (data || []) as KpiSnapshot[];
    } catch (err) {
      console.error('❌ [KPI-PERSISTENCE] Unexpected error fetching snapshots:', err);
      return [];
    }
  }

  /**
   * Get the latest KPI snapshot for an app
   *
   * @param organizationId - Organization ID
   * @param appId - App ID
   * @returns Latest snapshot or null if none exists
   *
   * @example
   * ```ts
   * const latest = await KpiPersistenceService.getLatestSnapshot('org-123', '310633997');
   * if (latest) {
   *   console.log('Overall score:', latest.score_overall);
   * }
   * ```
   */
  static async getLatestSnapshot(
    organizationId: string,
    appId: string
  ): Promise<KpiSnapshot | null> {
    try {
      if (!organizationId || !appId) {
        console.error('❌ [KPI-PERSISTENCE] Missing organizationId or appId');
        return null;
      }

      const { data, error } = await supabase
        .from('app_metadata_kpi_snapshots')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('app_id', appId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // Not found is expected for first-time apps
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('❌ [KPI-PERSISTENCE] Failed to fetch latest snapshot:', error);
        return null;
      }

      return data as KpiSnapshot;
    } catch (err) {
      console.error('❌ [KPI-PERSISTENCE] Unexpected error fetching latest snapshot:', err);
      return null;
    }
  }

  /**
   * Compare two KPI snapshots and calculate deltas
   *
   * @param previous - Previous snapshot
   * @param current - Current snapshot
   * @returns Comparison result with deltas
   *
   * @example
   * ```ts
   * const history = await KpiPersistenceService.getKpiSnapshots('org-123', 'app-id', 2);
   * if (history.length >= 2) {
   *   const comparison = KpiPersistenceService.compareSnapshots(history[1], history[0]);
   *   console.log('Overall score change:', comparison.overallScoreDelta);
   * }
   * ```
   */
  static compareSnapshots(
    previous: KpiSnapshot,
    current: KpiSnapshot
  ): KpiComparisonResult {
    // Calculate overall score delta
    const overallScoreDelta = current.score_overall - previous.score_overall;

    // Calculate family deltas
    const familyDeltas: Record<string, number> = {};
    const prevFamilies = previous.score_families as Record<string, { score: number }>;
    const currFamilies = current.score_families as Record<string, { score: number }>;

    for (const familyId in currFamilies) {
      const prevScore = prevFamilies[familyId]?.score || 0;
      const currScore = currFamilies[familyId]?.score || 0;
      familyDeltas[familyId] = currScore - prevScore;
    }

    // Calculate KPI deltas
    const kpiDeltas: KpiDelta[] = [];
    const prevKpis = previous.kpi_json as Record<string, { normalized: number }>;
    const currKpis = current.kpi_json as Record<string, { normalized: number }>;

    for (const kpiId in currKpis) {
      const prevValue = prevKpis[kpiId]?.normalized || 0;
      const currentValue = currKpis[kpiId]?.normalized || 0;
      const delta = currentValue - prevValue;
      const percentChange = prevValue !== 0 ? (delta / prevValue) * 100 : null;

      kpiDeltas.push({
        kpiId,
        prevValue,
        currentValue,
        delta,
        percentChange,
      });
    }

    // Calculate time elapsed
    const prevTime = new Date(previous.created_at).getTime();
    const currTime = new Date(current.created_at).getTime();
    const timeElapsedMs = currTime - prevTime;

    return {
      previous,
      current,
      overallScoreDelta,
      familyDeltas,
      kpiDeltas,
      timeElapsedMs,
    };
  }

  /**
   * Get KPI snapshots for multiple apps (for competitor comparison)
   *
   * @param organizationId - Organization ID
   * @param appIds - Array of app IDs
   * @param limit - Maximum number of snapshots per app
   * @returns Map of appId -> snapshots
   *
   * @example
   * ```ts
   * const competitors = await KpiPersistenceService.getKpiSnapshotsForApps(
   *   'org-123',
   *   ['app-1', 'app-2', 'app-3'],
   *   10
   * );
   * ```
   */
  static async getKpiSnapshotsForApps(
    organizationId: string,
    appIds: string[],
    limit: number = 10
  ): Promise<Map<string, KpiSnapshot[]>> {
    try {
      if (!organizationId || !appIds || appIds.length === 0) {
        console.error('❌ [KPI-PERSISTENCE] Missing organizationId or appIds');
        return new Map();
      }

      const { data, error } = await supabase
        .from('app_metadata_kpi_snapshots')
        .select('*')
        .eq('organization_id', organizationId)
        .in('app_id', appIds)
        .order('created_at', { ascending: false })
        .limit(limit * appIds.length); // Rough limit, will need post-filtering

      if (error) {
        console.error('❌ [KPI-PERSISTENCE] Failed to fetch snapshots for apps:', error);
        return new Map();
      }

      // Group by app_id
      const snapshotsByApp = new Map<string, KpiSnapshot[]>();
      for (const snapshot of (data || []) as KpiSnapshot[]) {
        const existing = snapshotsByApp.get(snapshot.app_id) || [];
        if (existing.length < limit) {
          existing.push(snapshot);
          snapshotsByApp.set(snapshot.app_id, existing);
        }
      }

      return snapshotsByApp;
    } catch (err) {
      console.error('❌ [KPI-PERSISTENCE] Unexpected error fetching snapshots for apps:', err);
      return new Map();
    }
  }
}
