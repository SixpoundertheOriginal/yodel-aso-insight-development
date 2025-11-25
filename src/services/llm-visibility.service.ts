/**
 * LLM Visibility Service
 *
 * Main service for LLM discoverability analysis.
 *
 * Features:
 * - Analyzes app descriptions for LLM visibility
 * - Smart caching based on description hash
 * - Integration with existing audit pipeline
 * - Manual trigger support (Phase 1)
 * - Automatic inline trigger (Phase 2)
 */

import { supabase } from '@/integrations/supabase/client';
import { analyzeLLMVisibility } from '@/engine/llmVisibility/llmVisibilityEngine';
import { loadLLMVisibilityRulesAsync } from '@/engine/llmVisibility/llmVisibilityRuleLoader';
import type {
  LLMVisibilityAnalysis,
  LLMVisibilityAnalysisRow,
  LLMDescriptionSnapshot,
} from '@/engine/llmVisibility/llmVisibility.types';
import { createSHA256Hash } from '@/utils/hashUtils';

// ============================================================================
// Main Analysis Service
// ============================================================================

export interface AnalyzeLLMVisibilityRequest {
  organizationId: string;

  /** App Store ID (for non-monitored apps) OR monitored app UUID */
  monitoredAppId: string;  // Can be App Store ID like "6443828422" or UUID

  description: string;

  /** Optional metadata for enhanced analysis */
  metadata?: {
    title?: string;
    subtitle?: string;
    vertical?: string;
    market?: string;
    existingIntents?: string[];  // From intent engine
  };

  /** Force re-analysis even if cached */
  forceRefresh?: boolean;
}

export interface AnalyzeLLMVisibilityResponse {
  analysis: LLMVisibilityAnalysis;
  cacheHit: boolean;
  analysisId: string;
}

/**
 * Analyze app description for LLM visibility
 *
 * Smart caching: Returns cached result if description hasn't changed
 */
export async function analyzeLLMVisibilityForApp(
  request: AnalyzeLLMVisibilityRequest
): Promise<AnalyzeLLMVisibilityResponse> {
  const startTime = Date.now();

  // 1. Load rules (with vertical/market customization AND DB overrides)
  const rules = await loadLLMVisibilityRulesAsync({
    vertical: request.metadata?.vertical,
    market: request.metadata?.market,
    organizationId: request.organizationId,
    appId: request.monitoredAppId,
  });

  // Note: loadLLMVisibilityRulesAsync already applies vertical clusters
  // and merges all DB overrides (Base → Vertical → Market → Client)

  // 2. Calculate description hash for caching
  const descriptionHash = await createSHA256Hash(request.description + rules.version);

  // 3. Check cache (unless force refresh)
  if (!request.forceRefresh) {
    const cachedAnalysis = await getCachedAnalysis(
      request.monitoredAppId,
      descriptionHash,
      rules.version
    );

    if (cachedAnalysis) {
      console.log('[LLM Visibility] Cache HIT for app:', request.monitoredAppId);
      return {
        analysis: convertRowToAnalysis(cachedAnalysis),
        cacheHit: true,
        analysisId: cachedAnalysis.id,
      };
    }
  }

  console.log('[LLM Visibility] Cache MISS for app:', request.monitoredAppId);

  // 4. Run analysis
  const analysis = await analyzeLLMVisibility(request.description, {
    rules,
    appId: request.monitoredAppId,
    vertical: request.metadata?.vertical,
    market: request.metadata?.market,
    existingIntents: request.metadata?.existingIntents,
  });

  // 5. Store analysis in DB
  const analysisRow = await storeAnalysis({
    organizationId: request.organizationId,
    appId: request.monitoredAppId,  // Can be UUID or App Store ID
    analysis,
    descriptionHash,
    descriptionLength: request.description.length,
    analysisDurationMs: Date.now() - startTime,
  });

  return {
    analysis,
    cacheHit: false,
    analysisId: analysisRow.id,
  };
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Check if string is a UUID
 */
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Get cached analysis if available
 */
async function getCachedAnalysis(
  appId: string,
  descriptionHash: string,
  rulesVersion: string
): Promise<LLMVisibilityAnalysisRow | null> {
  try {
    // Determine if appId is a UUID (monitored app) or App Store ID
    const isMonitoredApp = isUUID(appId);

    let query = supabase
      .from('llm_visibility_analysis')
      .select('*')
      .eq('description_hash', descriptionHash)
      .eq('rules_version', rulesVersion)
      .order('created_at', { ascending: false })
      .limit(1);

    // Filter by appropriate ID field
    if (isMonitoredApp) {
      query = query.eq('monitored_app_id', appId);
    } else {
      query = query.eq('app_store_id', appId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.warn('[LLM Visibility] Cache lookup error:', error);
      return null;
    }

    return data as unknown as LLMVisibilityAnalysisRow | null;
  } catch (error) {
    console.error('[LLM Visibility] Cache lookup failed:', error);
    return null;
  }
}

/**
 * Store analysis result in DB
 */
async function storeAnalysis(params: {
  organizationId: string;
  appId: string;  // Can be UUID or App Store ID
  analysis: LLMVisibilityAnalysis;
  descriptionHash: string;
  descriptionLength: number;
  analysisDurationMs: number;
}): Promise<LLMVisibilityAnalysisRow> {
  // Determine if appId is a UUID (monitored app) or App Store ID
  const isMonitoredApp = isUUID(params.appId);

  const row: Partial<LLMVisibilityAnalysisRow> = {
    organization_id: params.organizationId,

    // Set appropriate ID field
    ...(isMonitoredApp
      ? { monitored_app_id: params.appId, app_store_id: null }
      : { monitored_app_id: null, app_store_id: params.appId }
    ),

    // Scores
    overall_score: params.analysis.score.overall,
    factual_grounding_score: params.analysis.score.factual_grounding,
    semantic_clusters_score: params.analysis.score.semantic_clusters,
    structure_readability_score: params.analysis.score.structure_readability,
    intent_coverage_score: params.analysis.score.intent_coverage,
    snippet_quality_score: params.analysis.score.snippet_quality,
    safety_credibility_score: params.analysis.score.safety_credibility,

    // Structured data
    findings_json: params.analysis.findings,
    snippets_json: params.analysis.snippets,
    cluster_coverage_json: params.analysis.cluster_coverage,
    intent_coverage_json: params.analysis.intent_coverage,
    structure_metrics_json: params.analysis.structure_metrics,

    // Metadata
    description_hash: params.descriptionHash,
    description_length: params.descriptionLength,
    rules_version: params.analysis.score.rules_version,
    rules_scope: 'base',  // TODO: Determine from rules
    vertical_id: params.analysis.metadata.vertical_id,
    market_id: params.analysis.metadata.market_id,

    // Performance
    analysis_duration_ms: params.analysisDurationMs,
    cache_hit: false,
  };

  const { data, error } = await supabase
    .from('llm_visibility_analysis')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('[LLM Visibility] Failed to store analysis:', error);
    throw error;
  }

  return data as LLMVisibilityAnalysisRow;
}

/**
 * Convert DB row to analysis object
 */
function convertRowToAnalysis(row: LLMVisibilityAnalysisRow): LLMVisibilityAnalysis {
  return {
    score: {
      overall: row.overall_score,
      factual_grounding: row.factual_grounding_score,
      semantic_clusters: row.semantic_clusters_score,
      structure_readability: row.structure_readability_score,
      intent_coverage: row.intent_coverage_score,
      snippet_quality: row.snippet_quality_score,
      safety_credibility: row.safety_credibility_score,
      rules_version: row.rules_version,
      analyzed_at: row.created_at,
      cache_hit: true,
    },
    findings: row.findings_json as any,
    snippets: row.snippets_json as any,
    cluster_coverage: row.cluster_coverage_json as any,
    intent_coverage: row.intent_coverage_json as any,
    structure_metrics: row.structure_metrics_json as any,
    metadata: {
      app_id: row.monitored_app_id || row.app_store_id || '',
      description_length: row.description_length,
      description_hash: row.description_hash,
      rules_version: row.rules_version,
      rules_scope: row.rules_scope as any,
      vertical_id: row.vertical_id || undefined,
      market_id: row.market_id || undefined,
      analyzed_at: row.created_at,
      analysis_duration_ms: row.analysis_duration_ms,
    },
  };
}

// ============================================================================
// Snapshot Management
// ============================================================================

/**
 * Save description as a snapshot
 */
export async function saveDescriptionSnapshot(params: {
  organizationId: string;
  monitoredAppId: string;
  descriptionText: string;
  source: 'original' | 'ai_generated' | 'manual_edit';
  analysisId?: string;
  overallScore?: number;
  createdBy?: string;
  setActive?: boolean;
}): Promise<LLMDescriptionSnapshot> {
  // If setting as active, deactivate others first
  if (params.setActive) {
    await supabase
      .from('llm_description_snapshots')
      .update({ is_active: false })
      .eq('monitored_app_id', params.monitoredAppId);
  }

  const { data, error } = await supabase
    .from('llm_description_snapshots')
    .insert({
      organization_id: params.organizationId,
      monitored_app_id: params.monitoredAppId,
      source: params.source,
      description_text: params.descriptionText,
      analysis_id: params.analysisId || null,
      overall_score: params.overallScore || null,
      is_active: params.setActive || false,
      created_by: params.createdBy || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[LLM Visibility] Failed to save snapshot:', error);
    throw error;
  }

  return data as LLMDescriptionSnapshot;
}

/**
 * Get snapshot history for an app
 */
export async function getDescriptionSnapshots(
  monitoredAppId: string
): Promise<LLMDescriptionSnapshot[]> {
  const { data, error } = await supabase
    .from('llm_description_snapshots')
    .select('*')
    .eq('monitored_app_id', monitoredAppId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[LLM Visibility] Failed to load snapshots:', error);
    return [];
  }

  return (data || []) as LLMDescriptionSnapshot[];
}

// ============================================================================
// Latest Analysis Retrieval
// ============================================================================

/**
 * Get the latest LLM visibility analysis for an app
 */
export async function getLatestLLMVisibilityAnalysis(
  monitoredAppId: string
): Promise<LLMVisibilityAnalysis | null> {
  try {
    const { data, error } = await supabase
      .from('llm_visibility_analysis')
      .select('*')
      .eq('monitored_app_id', monitoredAppId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return convertRowToAnalysis(data as LLMVisibilityAnalysisRow);
  } catch (error) {
    console.error('[LLM Visibility] Failed to load latest analysis:', error);
    return null;
  }
}

/**
 * Check if description needs re-analysis
 *
 * Returns true if:
 * - No analysis exists
 * - Description has changed (hash mismatch)
 * - Rules version has changed
 */
export async function descriptionNeedsAnalysis(
  monitoredAppId: string,
  description: string,
  rulesVersion: string = '1.0.0'
): Promise<boolean> {
  const descriptionHash = await createSHA256Hash(description + rulesVersion);

  const { data } = await supabase
    .from('llm_visibility_analysis')
    .select('id')
    .eq('monitored_app_id', monitoredAppId)
    .eq('description_hash', descriptionHash)
    .eq('rules_version', rulesVersion)
    .limit(1)
    .maybeSingle();

  return !data;  // Needs analysis if no match found
}
