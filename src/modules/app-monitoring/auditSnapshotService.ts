/**
 * Audit Snapshot Service
 *
 * Manages audit snapshot operations for the ASO audit system.
 * Handles snapshot creation, retrieval, and historical analysis.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AuditSnapshot,
  CreateAuditSnapshotInput,
  AuditSnapshotQueryParams,
  AuditHistory
} from './types';

/**
 * Creates a new audit snapshot.
 * Stores complete Phase 2 analysis results for historical tracking.
 *
 * @param supabase - Supabase client
 * @param input - Audit snapshot data
 * @returns Created audit snapshot
 */
export async function createAuditSnapshot(
  supabase: SupabaseClient,
  input: CreateAuditSnapshotInput
): Promise<AuditSnapshot> {
  const {
    organization_id,
    app_id,
    platform,
    locale,
    title,
    subtitle,
    combinations,
    metrics,
    insights,
    audit_score,
    metadata_version_hash,
    metadata_source
  } = input;

  const payload = {
    organization_id,
    app_id,
    platform,
    locale,
    title,
    subtitle,
    combinations,
    metrics,
    insights,
    audit_score,
    metadata_version_hash,
    metadata_source,
    // Future fields
    competitor_overlap: {},
    metadata_health: {},
    metadata_version: 'v1'
  };

  const { data, error } = await supabase
    .from('audit_snapshots')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('[auditSnapshotService] Error creating snapshot:', error);
    throw new Error(`Failed to create audit snapshot: ${error.message}`);
  }

  return data as AuditSnapshot;
}

/**
 * Gets the latest audit snapshot for an app.
 *
 * @param supabase - Supabase client
 * @param params - Query parameters
 * @returns Latest snapshot or null
 */
export async function getLatestAuditSnapshot(
  supabase: SupabaseClient,
  params: AuditSnapshotQueryParams
): Promise<AuditSnapshot | null> {
  const { organization_id, app_id, platform, locale } = params;

  let query = supabase
    .from('audit_snapshots')
    .select('*')
    .eq('organization_id', organization_id)
    .eq('app_id', app_id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (platform) {
    query = query.eq('platform', platform);
  }

  if (locale) {
    query = query.eq('locale', locale);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('[auditSnapshotService] Error fetching latest snapshot:', error);
    throw new Error(`Failed to fetch latest snapshot: ${error.message}`);
  }

  return data as AuditSnapshot | null;
}

/**
 * Gets audit snapshot history for an app.
 * Returns all snapshots ordered by creation time (newest first).
 *
 * @param supabase - Supabase client
 * @param params - Query parameters with optional limit
 * @returns Array of audit snapshots
 */
export async function getAuditSnapshots(
  supabase: SupabaseClient,
  params: AuditSnapshotQueryParams
): Promise<AuditSnapshot[]> {
  const { organization_id, app_id, platform, locale, limit = 50 } = params;

  let query = supabase
    .from('audit_snapshots')
    .select('*')
    .eq('organization_id', organization_id)
    .eq('app_id', app_id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (platform) {
    query = query.eq('platform', platform);
  }

  if (locale) {
    query = query.eq('locale', locale);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[auditSnapshotService] Error fetching snapshots:', error);
    throw new Error(`Failed to fetch audit snapshots: ${error.message}`);
  }

  return (data || []) as AuditSnapshot[];
}

/**
 * Gets comprehensive audit history with score change calculation.
 * Includes latest snapshot, total count, and score delta.
 *
 * @param supabase - Supabase client
 * @param params - Query parameters
 * @returns Audit history object
 */
export async function getAuditHistory(
  supabase: SupabaseClient,
  params: AuditSnapshotQueryParams
): Promise<AuditHistory> {
  const snapshots = await getAuditSnapshots(supabase, params);

  const latestSnapshot = snapshots[0] || null;
  const previousSnapshot = snapshots[1] || null;

  const latestScore = latestSnapshot?.audit_score || null;
  const previousScore = previousSnapshot?.audit_score || null;

  let scoreChange: number | null = null;
  if (latestScore !== null && previousScore !== null) {
    scoreChange = latestScore - previousScore;
  }

  return {
    snapshots,
    totalCount: snapshots.length,
    latestScore,
    latestSnapshot,
    scoreChange
  };
}

/**
 * Gets audit snapshot by ID.
 *
 * @param supabase - Supabase client
 * @param snapshotId - Snapshot UUID
 * @param organization_id - Organization ID (for RLS)
 * @returns Audit snapshot or null
 */
export async function getAuditSnapshotById(
  supabase: SupabaseClient,
  snapshotId: string,
  organization_id: string
): Promise<AuditSnapshot | null> {
  const { data, error } = await supabase
    .from('audit_snapshots')
    .select('*')
    .eq('id', snapshotId)
    .eq('organization_id', organization_id)
    .maybeSingle();

  if (error) {
    console.error('[auditSnapshotService] Error fetching snapshot by ID:', error);
    throw new Error(`Failed to fetch audit snapshot: ${error.message}`);
  }

  return data as AuditSnapshot | null;
}

/**
 * Gets all audit snapshots for an organization.
 * Useful for workspace/dashboard views.
 *
 * @param supabase - Supabase client
 * @param organization_id - Organization ID
 * @param limit - Max results (default: 100)
 * @returns Array of audit snapshots
 */
export async function listAuditSnapshots(
  supabase: SupabaseClient,
  organization_id: string,
  limit: number = 100
): Promise<AuditSnapshot[]> {
  const { data, error } = await supabase
    .from('audit_snapshots')
    .select('*')
    .eq('organization_id', organization_id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[auditSnapshotService] Error listing snapshots:', error);
    throw new Error(`Failed to list audit snapshots: ${error.message}`);
  }

  return (data || []) as AuditSnapshot[];
}

/**
 * Deletes an audit snapshot.
 * Used for cleanup or manual removal.
 *
 * @param supabase - Supabase client
 * @param snapshotId - Snapshot UUID
 * @param organization_id - Organization ID (for RLS)
 * @returns True if deleted, false if not found
 */
export async function deleteAuditSnapshot(
  supabase: SupabaseClient,
  snapshotId: string,
  organization_id: string
): Promise<boolean> {
  const { error, count } = await supabase
    .from('audit_snapshots')
    .delete({ count: 'exact' })
    .eq('id', snapshotId)
    .eq('organization_id', organization_id);

  if (error) {
    console.error('[auditSnapshotService] Error deleting snapshot:', error);
    throw new Error(`Failed to delete audit snapshot: ${error.message}`);
  }

  return (count || 0) > 0;
}
