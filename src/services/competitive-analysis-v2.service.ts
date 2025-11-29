/**
 * Competitive Analysis V2 Service
 *
 * Handles competitor analysis and gap identification.
 * Calls analyze-competitors edge function.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  AnalyzeCompetitorsRequest,
  AnalyzeCompetitorsResponse,
  AnalyzeCompetitorsData,
  SelectedCompetitor,
} from '@/types/competitiveIntelligence';

export interface AnalyzeCompetitorsOptions {
  targetAppId: string; // App Store ID
  competitors: SelectedCompetitor[]; // Selected competitors
  organizationId: string;
  forceRefresh?: boolean; // Bypass cache
  onProgress?: (step: string, progress: number) => void; // Progress callback
  monitoredAppId?: string; // v2.1: Optional monitored app ID to fetch brand keywords
  targetAudit?: any; // v2.1: Existing audit result to reuse (UnifiedMetadataAuditResult)
}

export interface AnalyzeCompetitorsResult {
  success: boolean;
  data?: AnalyzeCompetitorsData;
  error?: string;
}

/**
 * Analyze competitors via edge function
 *
 * @param options - Analysis configuration
 * @returns Analysis result or error
 */
export async function analyzeCompetitors(
  options: AnalyzeCompetitorsOptions
): Promise<AnalyzeCompetitorsResult> {
  const { targetAppId, competitors, organizationId, forceRefresh = false, onProgress, monitoredAppId, targetAudit } = options;

  try {
    console.log(`[CompetitiveAnalysisV2] Starting analysis: target=${targetAppId}, competitors=${competitors.length}`);

    // Report progress: starting
    onProgress?.('Preparing analysis...', 5);

    // Build request
    const request: AnalyzeCompetitorsRequest = {
      targetAppId,
      competitorAppStoreIds: competitors.map((c) => c.appStoreId),
      organizationId,
      forceRefresh,
      monitoredAppId, // v2.1: Pass monitored app ID to fetch brand keywords
      targetAudit, // v2.1: Pass existing audit to reuse (avoid re-audit)
    };

    // Report progress: fetching
    onProgress?.('Fetching competitor metadata...', 20);

    // Call edge function
    const { data, error } = await supabase.functions.invoke<AnalyzeCompetitorsResponse>(
      'analyze-competitors',
      {
        body: request,
      }
    );

    if (error) {
      console.error('[CompetitiveAnalysisV2] Edge function error:', error);
      return {
        success: false,
        error: error.message || 'Failed to analyze competitors',
      };
    }

    if (!data) {
      console.error('[CompetitiveAnalysisV2] No data returned from edge function');
      return {
        success: false,
        error: 'No data returned from analysis',
      };
    }

    // Check response format
    if (!data.success || !data.data) {
      console.error('[CompetitiveAnalysisV2] Analysis failed:', data.error);
      return {
        success: false,
        error: data.error?.message || 'Analysis failed',
      };
    }

    // Report progress: analyzing
    onProgress?.('Analyzing gaps and opportunities...', 80);

    console.log('[CompetitiveAnalysisV2] ✅ Analysis complete:', {
      competitors: data.data.competitors.length,
      missingKeywords: data.data.gapAnalysis.summary.totalMissingKeywords,
      missingCombos: data.data.gapAnalysis.summary.totalMissingCombos,
    });

    // Report progress: complete
    onProgress?.('Analysis complete!', 100);

    return {
      success: true,
      data: data.data,
    };
  } catch (error: any) {
    console.error('[CompetitiveAnalysisV2] Unexpected error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Store competitors in app_competitors table (after successful analysis)
 *
 * @param monitoredAppId - UUID of monitored app
 * @param targetAppStoreId - App Store ID of target app
 * @param competitors - List of competitors to store
 * @param organizationId - Organization ID
 * @returns Success status
 */
export async function storeCompetitors(
  monitoredAppId: string,
  targetAppStoreId: string,
  competitors: SelectedCompetitor[],
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[CompetitiveAnalysisV2] Storing ${competitors.length} competitors for monitored app ${monitoredAppId}`);

    // TODO: Implement storage logic
    // For each competitor:
    // 1. Check if already exists in app_competitors table
    // 2. If exists, update metadata
    // 3. If not exists, insert new row
    // 4. Set is_active = true

    // Placeholder for now
    console.log('[CompetitiveAnalysisV2] ⚠️  Storage not yet implemented');

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('[CompetitiveAnalysisV2] Failed to store competitors:', error);
    return {
      success: false,
      error: error.message || 'Failed to store competitors',
    };
  }
}

/**
 * Load cached competitor analysis
 *
 * @param targetAppStoreId - App Store ID of target app
 * @param competitorAppStoreIds - List of competitor App Store IDs
 * @param organizationId - Organization ID
 * @returns Cached analysis data or null
 */
export async function loadCachedAnalysis(
  targetAppStoreId: string,
  competitorAppStoreIds: string[],
  organizationId: string
): Promise<AnalyzeCompetitorsData | null> {
  try {
    console.log(`[CompetitiveAnalysisV2] Checking cache for target=${targetAppStoreId}, competitors=${competitorAppStoreIds.length}`);

    // TODO: Implement cache lookup
    // 1. Generate cache key: target:sorted_competitor_ids:config_hash
    // 2. Query competitor_comparison_cache table
    // 3. Check if expired (24h TTL)
    // 4. Return cached data if valid

    // Placeholder for now
    console.log('[CompetitiveAnalysisV2] ⚠️  Cache lookup not yet implemented');

    return null;
  } catch (error: any) {
    console.error('[CompetitiveAnalysisV2] Failed to load cached analysis:', error);
    return null;
  }
}
