/**
 * Metadata Audit Draft Edge Function
 *
 * Compares user's proposed metadata changes (draft) against baseline metadata.
 * Returns both audits + calculated deltas + text diffs for visualization.
 *
 * Input: baseline metadata + draft metadata
 * Output: { draftAudit, baselineAudit, deltas, textDiff }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { MetadataAuditEngine, type UnifiedMetadataAuditResult } from '../_shared/metadata-audit-engine.ts';

// ==================== TYPES ====================

interface DraftMetadata {
  title: string;
  subtitle: string;
  keywords: string;
}

interface BaselineMetadata {
  title: string;
  subtitle: string;
  keywords: string;
}

interface DraftAuditRequest {
  app_id: string;
  platform: 'ios' | 'android';
  locale: string;
  draft: DraftMetadata;
  baseline: BaselineMetadata;
}

interface MetadataDeltas {
  // Combo counts
  excellentCombos: number;
  goodCombos: number;
  needsImprovement: number;

  // Coverage
  coveragePct: number;
  totalCombos: number;

  // Quality metrics
  duplicates: number;
  efficiencyScore: number;
  uniqueKeywords: number;

  // Ranking power
  titlePerformance: number;
  multiElementCombos: number;
}

type DiffType = 'keep' | 'add' | 'remove';

interface TextDiffSegment {
  type: DiffType;
  text: string;
}

interface TextDiff {
  title: TextDiffSegment[];
  subtitle: TextDiffSegment[];
  keywords: TextDiffSegment[];
}

interface DraftAuditResponse {
  success: boolean;
  data?: {
    draftAudit: UnifiedMetadataAuditResult;
    baselineAudit: UnifiedMetadataAuditResult;
    deltas: MetadataDeltas;
    textDiff: TextDiff;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  _meta?: {
    executionTimeMs: number;
  };
}

// ==================== UTILITIES ====================

/**
 * Calculate deltas between baseline and draft audits
 */
function calculateDeltas(
  baselineAudit: UnifiedMetadataAuditResult,
  draftAudit: UnifiedMetadataAuditResult
): MetadataDeltas {
  const baselineStats = baselineAudit.comboCoverage.statsByBrandType?.generic || baselineAudit.comboCoverage.stats;
  const draftStats = draftAudit.comboCoverage.statsByBrandType?.generic || draftAudit.comboCoverage.stats;

  // Combo counts (Tier 1 = Excellent, Tier 2 = Good, Rest = Needs Improvement)
  const baselineExcellent = baselineStats?.titleConsecutive || 0;
  const draftExcellent = draftStats?.titleConsecutive || 0;

  const baselineGood = (baselineStats?.titleNonConsecutive || 0) + (baselineStats?.titleKeywordsCross || 0);
  const draftGood = (draftStats?.titleNonConsecutive || 0) + (draftStats?.titleKeywordsCross || 0);

  const baselineNeedsImprovement = (baselineStats?.missing || 0) +
    (baselineStats?.keywordsConsecutive || 0) +
    (baselineStats?.subtitleConsecutive || 0) +
    (baselineStats?.keywordsSubtitleCross || 0) +
    (baselineStats?.keywordsNonConsecutive || 0) +
    (baselineStats?.subtitleNonConsecutive || 0) +
    (baselineStats?.threeWayCross || 0);

  const draftNeedsImprovement = (draftStats?.missing || 0) +
    (draftStats?.keywordsConsecutive || 0) +
    (draftStats?.subtitleConsecutive || 0) +
    (draftStats?.keywordsSubtitleCross || 0) +
    (draftStats?.keywordsNonConsecutive || 0) +
    (draftStats?.subtitleNonConsecutive || 0) +
    (draftStats?.threeWayCross || 0);

  // Title Performance (all title-based combos)
  const baselineTitlePerf = baselineExcellent + baselineGood;
  const draftTitlePerf = draftExcellent + draftGood;

  // Multi-Element Combos (Cross-Element)
  const baselineMultiElement = baselineStats?.crossElement || 0;
  const draftMultiElement = draftStats?.crossElement || 0;

  // Efficiency & Unique Keywords (from keywordCoverage)
  const baselineEfficiency = baselineAudit.keywordCoverage.efficiency || 0;
  const draftEfficiency = draftAudit.keywordCoverage.efficiency || 0;

  const baselineUniqueKeywords = baselineAudit.keywordCoverage.uniqueKeywordsCount || 0;
  const draftUniqueKeywords = draftAudit.keywordCoverage.uniqueKeywordsCount || 0;

  // Duplicates (from ranking analysis if available, otherwise 0)
  // Note: This would come from analyzeDuplicates() in the audit engine
  const baselineDuplicates = 0; // TODO: Extract from audit if available
  const draftDuplicates = 0;

  return {
    excellentCombos: draftExcellent - baselineExcellent,
    goodCombos: draftGood - baselineGood,
    needsImprovement: draftNeedsImprovement - baselineNeedsImprovement,
    coveragePct: (draftStats?.coveragePct || 0) - (baselineStats?.coveragePct || 0),
    totalCombos: (draftAudit.comboCoverage.totalCombos || 0) - (baselineAudit.comboCoverage.totalCombos || 0),
    duplicates: draftDuplicates - baselineDuplicates,
    efficiencyScore: draftEfficiency - baselineEfficiency,
    uniqueKeywords: draftUniqueKeywords - baselineUniqueKeywords,
    titlePerformance: draftTitlePerf - baselineTitlePerf,
    multiElementCombos: draftMultiElement - baselineMultiElement,
  };
}

/**
 * Simple word-level diff for text highlighting
 */
function calculateTextDiff(baseline: string, draft: string): TextDiffSegment[] {
  const baselineWords = baseline.trim().split(/\s+/);
  const draftWords = draft.trim().split(/\s+/);

  const segments: TextDiffSegment[] = [];
  const baselineSet = new Set(baselineWords.map(w => w.toLowerCase()));
  const draftSet = new Set(draftWords.map(w => w.toLowerCase()));

  // Simple approach: mark words as keep/add/remove
  // For production, consider using a proper diff library like diff-match-patch

  // Add all draft words
  draftWords.forEach(word => {
    if (baselineSet.has(word.toLowerCase())) {
      segments.push({ type: 'keep', text: word });
    } else {
      segments.push({ type: 'add', text: word });
    }
  });

  return segments;
}

/**
 * Calculate text diffs for all fields
 */
function calculateAllTextDiffs(baseline: BaselineMetadata, draft: DraftMetadata): TextDiff {
  return {
    title: calculateTextDiff(baseline.title, draft.title),
    subtitle: calculateTextDiff(baseline.subtitle, draft.subtitle),
    keywords: calculateTextDiff(baseline.keywords, draft.keywords),
  };
}

// ==================== MAIN HANDLER ====================

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Parse request
    const { app_id, platform, locale, draft, baseline }: DraftAuditRequest = await req.json();

    // Validate input
    if (!app_id || !platform || !locale) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Missing required parameters: app_id, platform, locale',
          },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!draft || !baseline) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Missing draft or baseline metadata',
          },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[metadata-audit-draft] Processing request:', {
      app_id,
      platform,
      locale,
      draftTitle: draft.title,
      baselineTitle: baseline.title,
    });

    // Run audit for BASELINE metadata
    const baselineAudit = await MetadataAuditEngine.audit({
      title: baseline.title,
      subtitle: baseline.subtitle,
      description: '', // Not needed for combo analysis
      applicationCategory: undefined,
      keywords: baseline.keywords || '',
      platform: platform as 'ios' | 'android',
      locale,
      appId: app_id,
    });

    // Run audit for DRAFT metadata
    const draftAudit = await MetadataAuditEngine.audit({
      title: draft.title,
      subtitle: draft.subtitle,
      description: '', // Not needed for combo analysis
      applicationCategory: undefined,
      keywords: draft.keywords || '',
      platform: platform as 'ios' | 'android',
      locale,
      appId: app_id,
    });

    // Calculate deltas
    const deltas = calculateDeltas(baselineAudit, draftAudit);

    // Calculate text diffs
    const textDiff = calculateAllTextDiffs(baseline, draft);

    const executionTimeMs = Date.now() - startTime;

    console.log('[metadata-audit-draft] Success:', {
      executionTimeMs,
      deltas: {
        excellentCombos: deltas.excellentCombos,
        coverage: deltas.coveragePct,
      },
    });

    const response: DraftAuditResponse = {
      success: true,
      data: {
        draftAudit,
        baselineAudit,
        deltas,
        textDiff,
      },
      _meta: {
        executionTimeMs,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('[metadata-audit-draft] Error:', error);

    const response: DraftAuditResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Unknown error occurred',
        details: error.stack,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
