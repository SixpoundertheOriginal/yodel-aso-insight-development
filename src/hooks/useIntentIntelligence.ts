/**
 * React Query Hook for Intent Intelligence - Phase 3
 *
 * Provides intent intelligence data for keywords extracted from app metadata.
 * Uses the IntentIntelligenceService (Phase 2) with React Query caching and
 * stale-while-revalidate patterns.
 *
 * IMPORTANT: This is a DATA HOOK ONLY - no UI rendering
 *
 * Features:
 * - Automatic intent enrichment for keywords
 * - Intent clustering by type
 * - Audit signals generation for Metadata Audit V2
 * - Coverage analysis for title/subtitle
 * - Competitive overlap detection (future)
 * - Feature flag aware
 * - React Query caching (5min stale, 30min gc)
 *
 * @see src/services/intent-intelligence.service.ts
 * @see docs/AUTOCOMPLETE_INTELLIGENCE_PHASE2_COMPLETE.md
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { IntentIntelligenceService } from '@/services/intent-intelligence.service';
import type {
  Platform,
  IntentClassification,
  IntentCluster,
  IntentAuditSignals,
  IntentCoverageAnalysis,
} from '@/services/intent-intelligence.service';
import { AUTOCOMPLETE_INTELLIGENCE_ENABLED } from '@/config/metadataFeatureFlags';
import type { ScrapedMetadata } from '@/types/aso';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Input parameters for useIntentIntelligence hook
 */
export interface UseIntentIntelligenceParams {
  /** Keywords found in app title */
  titleKeywords?: string[];

  /** Keywords found in app subtitle */
  subtitleKeywords?: string[];

  /** All keywords (title + subtitle + keyword field) */
  allKeywords?: string[];

  /** Platform (ios/android) */
  platform?: Platform;

  /** Region code (e.g., 'us') */
  region?: string;

  /** Enable/disable hook execution */
  enabled?: boolean;

  /** App metadata for brand intelligence (Phase 5) */
  metadata?: ScrapedMetadata;
}

/**
 * Return value from useIntentIntelligence hook
 */
export interface UseIntentIntelligenceResult {
  /** Map of keyword -> intent classification */
  intentions: Map<string, IntentClassification>;

  /** Grouped keywords by intent type */
  clusters: IntentCluster[];

  /** Coverage analysis for title, subtitle, overall */
  coverage: IntentCoverageAnalysis | null;

  /** Audit signals for Metadata Audit V2 integration */
  auditSignals: IntentAuditSignals | null;

  /** Normalized intent statistics */
  statistics: IntentStatistics;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: Error | null;

  /** Data fetched successfully */
  isSuccess: boolean;

  /** Query is fetching (initial or refetch) */
  isFetching: boolean;

  /** Feature flag enabled */
  isEnabled: boolean;

  /** Raw React Query result for advanced use cases */
  queryResult: UseQueryResult<IntentIntelligenceData, Error>;
}

/**
 * Normalized statistics for intent distribution
 */
export interface IntentStatistics {
  totalKeywords: number;
  navigationalCount: number;
  informationalCount: number;
  commercialCount: number;
  transactionalCount: number;
  intentDiversity: number; // 0-100
  hasNavigationalIntent: boolean;
  hasInformationalIntent: boolean;
  hasCommercialIntent: boolean;
  hasTransactionalIntent: boolean;
  dominantIntent: 'navigational' | 'informational' | 'commercial' | 'transactional' | null;
  hasIntentData: boolean; // True if any keywords have intent classifications
  engineFailure: boolean; // True if engine failed to classify any keywords
}

/**
 * Internal data structure returned by fetcher function
 */
interface IntentIntelligenceData {
  intentions: Map<string, IntentClassification>;
  clusters: IntentCluster[];
  coverage: IntentCoverageAnalysis | null;
  auditSignals: IntentAuditSignals | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate normalized statistics from intent data
 */
function calculateStatistics(
  intentions: Map<string, IntentClassification>,
  clusters: IntentCluster[],
  inputKeywordCount: number = 0
): IntentStatistics {
  const totalKeywords = intentions.size;

  // Count by intent type
  const navigationalCount = clusters.find(c => c.intent_type === 'navigational')?.count || 0;
  const informationalCount = clusters.find(c => c.intent_type === 'informational')?.count || 0;
  const commercialCount = clusters.find(c => c.intent_type === 'commercial')?.count || 0;
  const transactionalCount = clusters.find(c => c.intent_type === 'transactional')?.count || 0;

  // Calculate intent diversity (0-100)
  const intentTypesPresent = [
    navigationalCount > 0,
    informationalCount > 0,
    commercialCount > 0,
    transactionalCount > 0,
  ].filter(Boolean).length;
  const intentDiversity = totalKeywords > 0 ? (intentTypesPresent / 4) * 100 : 0;

  // Determine dominant intent
  let dominantIntent: IntentStatistics['dominantIntent'] = null;
  let maxCount = 0;

  if (navigationalCount > maxCount) {
    dominantIntent = 'navigational';
    maxCount = navigationalCount;
  }
  if (informationalCount > maxCount) {
    dominantIntent = 'informational';
    maxCount = informationalCount;
  }
  if (commercialCount > maxCount) {
    dominantIntent = 'commercial';
    maxCount = commercialCount;
  }
  if (transactionalCount > maxCount) {
    dominantIntent = 'transactional';
    maxCount = transactionalCount;
  }

  // Detect if we have any intent data
  const hasIntentData =
    navigationalCount > 0 ||
    informationalCount > 0 ||
    commercialCount > 0 ||
    transactionalCount > 0;

  // Detect engine failure: input keywords provided but NO intent data returned
  const engineFailure = inputKeywordCount > 0 && !hasIntentData && intentions.size === 0;

  return {
    totalKeywords,
    navigationalCount,
    informationalCount,
    commercialCount,
    transactionalCount,
    intentDiversity: Math.round(intentDiversity),
    hasNavigationalIntent: navigationalCount > 0,
    hasInformationalIntent: informationalCount > 0,
    hasCommercialIntent: commercialCount > 0,
    hasTransactionalIntent: transactionalCount > 0,
    dominantIntent,
    hasIntentData,
    engineFailure,
  };
}

/**
 * Get default statistics (empty state)
 */
function getDefaultStatistics(): IntentStatistics {
  return {
    totalKeywords: 0,
    navigationalCount: 0,
    informationalCount: 0,
    commercialCount: 0,
    transactionalCount: 0,
    intentDiversity: 0,
    hasNavigationalIntent: false,
    hasInformationalIntent: false,
    hasCommercialIntent: false,
    hasTransactionalIntent: false,
    dominantIntent: null,
    hasIntentData: false,
    engineFailure: false,
  };
}

// ============================================================================
// FETCHER FUNCTION
// ============================================================================

/**
 * Fetch intent intelligence data for keywords
 * Uses IntentIntelligenceService from Phase 2
 */
async function fetchIntentIntelligence(
  params: UseIntentIntelligenceParams
): Promise<IntentIntelligenceData> {
  const {
    titleKeywords = [],
    subtitleKeywords = [],
    allKeywords = [],
    platform = 'ios',
    region = 'us',
    metadata,  // Phase 5: metadata for brand intelligence
  } = params;

  // Combine all unique keywords
  const combinedKeywords = [...new Set([...titleKeywords, ...subtitleKeywords, ...allKeywords])];

  if (combinedKeywords.length === 0) {
    // Return empty data for empty input
    return {
      intentions: new Map(),
      clusters: [],
      coverage: null,
      auditSignals: null,
    };
  }

  // Parallel execution for performance
  const [intentions, clusters, coverage, auditSignals] = await Promise.all([
    // 1. Enrich keywords with intent
    IntentIntelligenceService.enrichKeywordsWithIntent(combinedKeywords, platform, region),

    // 2. Get intent clusters (Phase 5: with metadata for brand intelligence)
    IntentIntelligenceService.getIntentClusters(combinedKeywords, platform, region, metadata),

    // 3. Analyze coverage (if title/subtitle provided)
    titleKeywords.length > 0 || subtitleKeywords.length > 0
      ? IntentIntelligenceService.analyzeIntentCoverage(titleKeywords, subtitleKeywords, platform, region)
      : Promise.resolve(null),

    // 4. Generate audit signals (Phase 5: with metadata for brand intelligence)
    titleKeywords.length > 0 || subtitleKeywords.length > 0
      ? IntentIntelligenceService.mapIntentToAuditSignals(titleKeywords, subtitleKeywords, platform, region, metadata)
      : Promise.resolve(null),
  ]);

  return {
    intentions,
    clusters,
    coverage,
    auditSignals,
  };
}

// ============================================================================
// REACT QUERY HOOK
// ============================================================================

/**
 * useIntentIntelligence - React Query hook for intent intelligence
 *
 * @example
 * ```tsx
 * const {
 *   intentions,
 *   clusters,
 *   coverage,
 *   auditSignals,
 *   statistics,
 *   isLoading
 * } = useIntentIntelligence({
 *   titleKeywords: ['spotify', 'music'],
 *   subtitleKeywords: ['streaming', 'podcasts'],
 *   platform: 'ios',
 *   region: 'us',
 *   enabled: true
 * });
 *
 * // Use data in your component (no UI rendering in this hook)
 * console.log('Dominant intent:', statistics.dominantIntent);
 * console.log('Intent diversity:', statistics.intentDiversity);
 * ```
 */
export function useIntentIntelligence(
  params: UseIntentIntelligenceParams
): UseIntentIntelligenceResult {
  const {
    titleKeywords = [],
    subtitleKeywords = [],
    allKeywords = [],
    platform = 'ios',
    region = 'us',
    enabled = true,
  } = params;

  // Combine all unique keywords for query key
  const combinedKeywords = [...new Set([...titleKeywords, ...subtitleKeywords, ...allKeywords])];

  // React Query hook
  const queryResult = useQuery({
    queryKey: [
      'intent-intelligence',
      {
        keywords: combinedKeywords.sort(), // Sort for stable cache key
        platform,
        region,
      },
    ],
    queryFn: () => fetchIntentIntelligence(params),
    enabled: enabled && AUTOCOMPLETE_INTELLIGENCE_ENABLED && combinedKeywords.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes - same as useMetadataAuditV2
    gcTime: 1000 * 60 * 30, // 30 minutes - same as useMetadataAuditV2
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  const { data, isLoading, error, isSuccess, isFetching } = queryResult;

  // Calculate statistics
  const statistics = data
    ? calculateStatistics(data.intentions, data.clusters, combinedKeywords.length)
    : getDefaultStatistics();

  return {
    intentions: data?.intentions || new Map(),
    clusters: data?.clusters || [],
    coverage: data?.coverage || null,
    auditSignals: data?.auditSignals || null,
    statistics,
    isLoading,
    error: error as Error | null,
    isSuccess,
    isFetching,
    isEnabled: AUTOCOMPLETE_INTELLIGENCE_ENABLED,
    queryResult,
  };
}

// ============================================================================
// HELPER HOOKS (Optional - for specific use cases)
// ============================================================================

/**
 * useIntentAuditSignals - Simplified hook for audit integration
 * Returns only audit signals for Metadata Audit V2
 */
export function useIntentAuditSignals(
  titleKeywords: string[],
  subtitleKeywords: string[],
  platform: Platform = 'ios',
  region: string = 'us',
  enabled: boolean = true
): {
  auditSignals: IntentAuditSignals | null;
  isLoading: boolean;
  error: Error | null;
} {
  const { auditSignals, isLoading, error } = useIntentIntelligence({
    titleKeywords,
    subtitleKeywords,
    platform,
    region,
    enabled,
  });

  return { auditSignals, isLoading, error };
}

/**
 * useIntentCoverage - Simplified hook for coverage analysis
 * Returns only coverage data
 */
export function useIntentCoverage(
  titleKeywords: string[],
  subtitleKeywords: string[],
  platform: Platform = 'ios',
  region: string = 'us',
  enabled: boolean = true
): {
  coverage: IntentCoverageAnalysis | null;
  isLoading: boolean;
  error: Error | null;
} {
  const { coverage, isLoading, error } = useIntentIntelligence({
    titleKeywords,
    subtitleKeywords,
    platform,
    region,
    enabled,
  });

  return { coverage, isLoading, error };
}
