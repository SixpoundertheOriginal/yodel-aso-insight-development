/**
 * App Monitoring Module - Type Definitions
 *
 * Defines TypeScript interfaces for the App Saving & Metadata Caching Layer.
 * Includes types for monitored apps with audit support, metadata cache, and audit snapshots.
 */

import type { ComboAnalysisEnhanced } from '@/modules/metadata-scoring';

// ============================================================================
// MONITORED APPS (Extended for Audit Support)
// ============================================================================

/**
 * Extended MonitoredApp with audit tracking fields.
 * These fields are added by migration 20260122000002.
 */
export interface MonitoredAppWithAudit {
  id: string;
  organization_id: string;
  app_id: string;
  platform: 'ios' | 'android';
  app_name: string;
  bundle_id: string | null;
  app_icon_url: string | null;
  developer_name: string | null;
  category: string | null;
  primary_country: string;
  monitor_type: 'reviews' | 'ratings' | 'both' | 'audit';
  locale: string; // NEW: Added by migration
  tags: string[] | null;
  notes: string | null;
  snapshot_rating: number | null;
  snapshot_review_count: number | null;
  snapshot_taken_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  last_checked_at: string | null;

  // Audit-specific fields (NEW)
  audit_enabled: boolean;
  latest_audit_score: number | null; // 0-100
  latest_audit_at: string | null;
  metadata_last_refreshed_at: string | null;
  
  // Validation state for consistency checking
  validated_state?: 'pending' | 'validated' | 'failed' | 'valid' | 'invalid' | 'stale' | null;

  // Google Play specific
  play_store_package_id: string | null;
  play_store_url: string | null;
}

// ============================================================================
// APP METADATA CACHE
// ============================================================================

/**
 * Metadata cache entry stored in app_metadata_cache table.
 * Maps to database schema from migration 20260122000000.
 */
export interface AppMetadataCache {
  id: string;
  organization_id: string;
  app_id: string;
  platform: 'ios' | 'android';
  locale: string;
  fetched_at: string; // ISO 8601 timestamp

  // Core metadata fields
  title: string | null;
  subtitle: string | null;
  description: string | null;
  developer_name: string | null;
  app_icon_url: string | null;
  screenshots: string[]; // Array of URLs

  // Raw JSON response (for future analysis)
  app_json: Record<string, any> | null;

  // Future extensibility
  screenshot_captions: string[];
  feature_cards: Record<string, any>[];
  preview_analysis: Record<string, any>;

  // Version tracking
  version_hash: string; // SHA256 hash

  created_at: string;
  updated_at: string;
}

/**
 * Input for creating/updating metadata cache entry
 */
export interface CreateMetadataCacheInput {
  organization_id: string;
  app_id: string;
  platform: 'ios' | 'android';
  locale: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  developer_name: string | null;
  app_icon_url: string | null;
  screenshots: string[];
  app_json?: Record<string, any> | null;
  version_hash: string;
}

/**
 * Cache lookup query parameters
 */
export interface CacheLookupParams {
  organization_id: string;
  app_id: string;
  platform: 'ios' | 'android';
  locale: string;
}

// ============================================================================
// AUDIT SNAPSHOTS
// ============================================================================

/**
 * Audit snapshot stored in audit_snapshots table.
 * Maps to database schema from migration 20260122000001.
 */
export interface AuditSnapshot {
  id: string;
  organization_id: string;
  app_id: string;
  platform: 'ios' | 'android';
  locale: string;
  created_at: string;

  // Metadata at time of audit
  title: string | null;
  subtitle: string | null;

  // Phase 2 Analysis (JSONB fields)
  combinations: any[]; // ClassifiedCombo[] serialized
  metrics: {
    longTailStrength: number;
    intentDiversity: number;
    categoryCoverage: number;
    redundancyIndex: number;
    avgFillerRatio: number;
  };
  insights: {
    missingClusters: string[];
    potentialCombos: string[];
    estimatedGain: number;
    actionableInsights: string[];
  };

  // Overall score
  audit_score: number | null; // 0-100

  // Versioning and source tracking
  metadata_version_hash: string; // Links to app_metadata_cache.version_hash
  metadata_source: 'live' | 'cache';

  // Future extensibility
  competitor_overlap: Record<string, any>;
  metadata_health: Record<string, any>;
  metadata_version: string; // Schema version (default: 'v1')
}

/**
 * Input for creating audit snapshot
 */
export interface CreateAuditSnapshotInput {
  organization_id: string;
  app_id: string;
  platform: 'ios' | 'android';
  locale: string;
  title: string | null;
  subtitle: string | null;
  combinations: any[]; // ClassifiedCombo[] from analyzeEnhancedCombinations
  metrics: {
    longTailStrength: number;
    intentDiversity: number;
    categoryCoverage: number;
    redundancyIndex: number;
    avgFillerRatio: number;
  };
  insights: {
    missingClusters: string[];
    potentialCombos: string[];
    estimatedGain: number;
    actionableInsights: string[];
  };
  audit_score: number | null;
  metadata_version_hash: string;
  metadata_source: 'live' | 'cache';
}

/**
 * Query parameters for fetching audit snapshots
 */
export interface AuditSnapshotQueryParams {
  organization_id: string;
  app_id: string;
  platform?: 'ios' | 'android';
  locale?: string;
  limit?: number;
}

// ============================================================================
// SERVICE RESPONSES
// ============================================================================

/**
 * Response from save-monitored-app edge function
 */
export interface SaveMonitoredAppResponse {
  success: boolean;
  data?: {
    monitoredApp: MonitoredAppWithAudit;
    metadataCache: AppMetadataCache | null;
    auditSnapshot: AuditSnapshot | null;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  partial?: {
    monitoredAppSaved: boolean;
    metadataCached: boolean;
    auditCreated: boolean;
    failureReason?: string;
    acceptableFailure?: boolean; // True if failure is acceptable (e.g., audit failed but app saved)
  };
}

/**
 * Cache status check result
 */
export interface CacheStatus {
  exists: boolean;
  cache?: AppMetadataCache;
  isStale: boolean; // True if cache is older than TTL (24 hours)
  needsRefresh: boolean;
}

/**
 * Audit history query result
 */
export interface AuditHistory {
  snapshots: AuditSnapshot[];
  totalCount: number;
  latestScore: number | null;
  latestSnapshot: AuditSnapshot | null;
  scoreChange: number | null; // Difference between latest and previous
}

// ============================================================================
// BIBLE-DRIVEN AUDIT SNAPSHOTS (Phase 19)
// ============================================================================

/**
 * Bible-driven audit snapshot (Phase 19)
 * Stores full Metadata Audit V2 + KPI Engine + Intent Coverage results
 * Maps to: aso_audit_snapshots table
 */
export interface BibleAuditSnapshot {
  id: string;
  monitored_app_id: string;
  organization_id: string;
  app_id: string;
  platform: 'ios' | 'android';
  locale: string;
  created_at: string;
  source: 'live' | 'cache' | 'manual';

  // Metadata at time of audit
  title: string | null;
  subtitle: string | null;
  description: string | null;

  // Full Bible-driven audit result (UnifiedMetadataAuditResult)
  audit_result: Record<string, any>; // JSONB

  // Extracted overall score (denormalized)
  overall_score: number; // 0-100

  // Full KPI Engine result (43 KPIs across 6 families)
  kpi_result: Record<string, any> | null; // JSONB

  // Extracted KPI overall score (denormalized)
  kpi_overall_score: number | null; // 0-100

  // Family scores (denormalized)
  kpi_family_scores: Record<string, number> | null; // { "clarity_structure": 75, ... }

  // Bible ruleset metadata
  bible_metadata: Record<string, any> | null; // { version, rulesetId, mergedRules, overridesApplied }

  // Version tracking
  audit_version: string; // 'v2'
  kpi_version: string | null; // 'v1'

  // Versioning & cache linkage
  metadata_version_hash: string | null;
  audit_hash: string | null;

  updated_at: string;
}

/**
 * Input for creating Bible-driven audit snapshot
 */
export interface CreateBibleAuditSnapshotInput {
  monitored_app_id: string;
  organization_id: string;
  app_id: string;
  platform: 'ios' | 'android';
  locale: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  audit_result: Record<string, any>; // Full UnifiedMetadataAuditResult
  overall_score: number;
  kpi_result?: Record<string, any> | null;
  kpi_overall_score?: number | null;
  kpi_family_scores?: Record<string, number> | null;
  bible_metadata?: Record<string, any> | null;
  source?: 'live' | 'cache' | 'manual';
  metadata_version_hash?: string | null;
}

/**
 * Audit diff between two snapshots (Phase 19)
 * Maps to: aso_audit_diffs table
 */
export interface AuditDiff {
  id: string;
  from_snapshot_id: string;
  to_snapshot_id: string;
  organization_id: string;
  monitored_app_id: string;
  created_at: string;

  // Score changes
  overall_score_delta: number; // Positive = improvement
  kpi_overall_score_delta: number | null;
  kpi_family_deltas: Record<string, number> | null; // { "family_id": delta }

  // Metadata changes
  title_changed: boolean;
  subtitle_changed: boolean;
  description_changed: boolean;
  title_diff: string | null;
  subtitle_diff: string | null;

  // Semantic changes
  keywords_added: string[] | null;
  keywords_removed: string[] | null;
  keyword_count_delta: number | null;
  combo_count_delta: number | null;

  // Severity & recommendations
  new_critical_issues: number;
  resolved_critical_issues: number;
  new_recommendations: number;

  // Change summary (JSONB)
  change_summary: Record<string, any>; // { scoreImprovement, significantChanges, topKpiChanges, impactLevel }
}

/**
 * Input for creating audit diff
 */
export interface CreateAuditDiffInput {
  from_snapshot_id: string;
  to_snapshot_id: string;
  organization_id: string;
  monitored_app_id: string;
  overall_score_delta: number;
  kpi_overall_score_delta?: number | null;
  kpi_family_deltas?: Record<string, number> | null;
  title_changed: boolean;
  subtitle_changed: boolean;
  description_changed: boolean;
  title_diff?: string | null;
  subtitle_diff?: string | null;
  keywords_added?: string[] | null;
  keywords_removed?: string[] | null;
  keyword_count_delta?: number | null;
  combo_count_delta?: number | null;
  new_critical_issues?: number;
  resolved_critical_issues?: number;
  new_recommendations?: number;
  change_summary: Record<string, any>;
}

/**
 * Bible audit history (Phase 19)
 */
export interface BibleAuditHistory {
  snapshots: BibleAuditSnapshot[];
  diffs: AuditDiff[];
  totalCount: number;
  latestSnapshot: BibleAuditSnapshot | null;
  latestScore: number | null;
  scoreChange: number | null;
  hasTrend: boolean; // True if 2+ snapshots exist
}

/**
 * Query parameters for Bible audit history
 */
export interface BibleAuditHistoryQueryParams {
  monitored_app_id: string;
  organization_id: string;
  limit?: number;
  offset?: number;
  include_diffs?: boolean;
}
