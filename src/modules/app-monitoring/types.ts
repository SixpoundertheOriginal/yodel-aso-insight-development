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
