/**
 * Competitor Comparison Service
 *
 * Compares target app vs competitors across 7 dimensions:
 * 1. KPI Comparison (scores)
 * 2. Intent Gap Analysis (search intent distribution)
 * 3. Combo Gap Analysis (missing keyword combinations)
 * 4. Keyword Opportunities (competitor keywords you're missing)
 * 5. Discovery Footprint Comparison (learning/outcome/brand/noise)
 * 6. Character Usage Efficiency
 * 7. Brand Strength Analysis
 *
 * Generates insights + auto-recommendations.
 * Uses comparison cache for performance.
 *
 * @module services/competitor-comparison
 */

import { supabase } from '@/integrations/supabase/client';
import type { UnifiedMetadataAuditResult } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';
import type { AuditCompetitorResult } from './competitor-audit.service';
import type { GeneratedCombo } from '@/engine/combos/comboGenerationEngine';
import { computeBrandRatioStats } from '@/engine/metadata/utils/brandNoiseHelpers';
import { validateCompetitorAudit } from './competitor-audit.validator';
import { buildAuditTelemetry, type AuditTelemetryEntry } from './competitor-audit.telemetry';

// =====================================================================
// TYPE DEFINITIONS
// =====================================================================

export interface CompetitorComparisonInput {
  targetAppId: string;
  targetAudit: UnifiedMetadataAuditResult;
  competitorAudits: AuditCompetitorResult[];
  organizationId: string;
  comparisonType?: '1-to-1' | '1-to-many';
  ruleConfig?: {
    vertical?: string;
    market?: string;
  };
}

export interface CompetitorComparisonResult {
  targetAppId: string;
  competitorIds: string[];
  comparisonType: '1-to-1' | '1-to-many';
  generatedAt: string;

  // 1. KPI Comparison
  kpiComparison: KPIComparison;

  // 2. Intent Gap Analysis
  intentGap: IntentGapAnalysis;

  // 3. Combo Gap Analysis
  comboGap: ComboGapAnalysis;

  // 4. Keyword Opportunities
  keywordOpportunities: KeywordOpportunities;

  // 5. Discovery Footprint Comparison
  discoveryFootprint: DiscoveryFootprintComparison;

  // 6. Character Usage Comparison
  characterUsage: CharacterUsageComparison;

  // 7. Brand Strength Comparison
  brandStrength: BrandStrengthComparison;

  // Summary & Recommendations
  summary: ComparisonSummary;
  recommendations: Recommendation[];
  telemetry: ComparisonTelemetry;
}

// =====================================================================
// INSIGHT TYPE DEFINITIONS
// =====================================================================

export interface KPIComparison {
  target: {
    overallScore: number;
    titleScore: number;
    subtitleScore: number;
    descriptionScore: number;
  };
  competitors: {
    competitorId: string;
    competitorName: string;
    overallScore: number;
    titleScore: number;
    subtitleScore: number;
    descriptionScore: number;
  }[];
  averageCompetitor: {
    overallScore: number;
    titleScore: number;
    subtitleScore: number;
    descriptionScore: number;
  };
  gaps: {
    overallScoreGap: number; // Positive = you're ahead
    titleScoreGap: number;
    subtitleScoreGap: number;
    descriptionScoreGap: number;
  };
  wins: number; // How many metrics you're winning
  losses: number; // How many metrics you're losing
}

export interface IntentGapAnalysis {
  target: {
    informational: number;
    commercial: number;
    transactional: number;
    navigational: number;
  };
  averageCompetitor: {
    informational: number;
    commercial: number;
    transactional: number;
    navigational: number;
  };
  gaps: {
    informational: number; // Percentage point difference
    commercial: number;
    transactional: number;
    navigational: number;
  };
  insights: string[]; // e.g., "Competitors use 3x more transactional keywords"
  topIntentByCompetitor: {
    competitorId: string;
    competitorName: string;
    dominantIntent: 'informational' | 'commercial' | 'transactional' | 'navigational';
    percentage: number;
  }[];
}

export interface ComboGapAnalysis {
  targetCombos: {
    total: number;
    existing: number;
    missing: number;
    coverage: number;
  };
  averageCompetitor: {
    total: number;
    existing: number;
    missing: number;
    coverage: number;
  };
  missingOpportunities: {
    combo: string;
    strategicValue: number;
    usedByCompetitors: number; // How many competitors use it
    competitorNames: string[]; // Which competitors
    recommendation: string;
  }[];
  sharedCombos: {
    combo: string;
    strategicValue: number;
    usedByCount: number; // Including target
  }[];
  uniqueToTarget: {
    combo: string;
    strategicValue: number;
  }[];
}

export interface KeywordOpportunities {
  competitorKeywords: {
    keyword: string;
    appearsInCompetitors: number; // How many competitors use it
    avgStrategicValue: number;
    competitorNames: string[];
    inYourMetadata: boolean;
    recommendation: string;
  }[];
  topOpportunities: {
    keyword: string;
    impact: 'high' | 'medium' | 'low';
    reason: string;
  }[];
}

export interface DiscoveryFootprintComparison {
  target: {
    learning: number;
    outcome: number;
    brand: number;
    noise: number;
  };
  averageCompetitor: {
    learning: number;
    outcome: number;
    brand: number;
    noise: number;
  };
  gaps: {
    learning: number;
    outcome: number;
    brand: number;
    noise: number;
  };
  insights: string[];
  telemetry?: {
    target: FootprintMetrics;
    competitors: Array<FootprintMetrics & { competitorId: string; competitorName: string }>;
    averages: FootprintMetrics;
  };
}

export interface CharacterUsageComparison {
  target: {
    titleLength: number;
    titleUtilization: number; // % of 30 char limit
    subtitleLength: number;
    subtitleUtilization: number; // % of 80 char limit (iOS 11+)
    descriptionLength: number;
    descriptionUtilization: number; // % of 4000 char limit
  };
  averageCompetitor: {
    titleLength: number;
    titleUtilization: number;
    subtitleLength: number;
    subtitleUtilization: number;
    descriptionLength: number;
    descriptionUtilization: number;
  };
  insights: string[];
}

export interface BrandStrengthComparison {
  target: {
    brandComboCount: number;
    brandPresence: number; // % of combos that are brand-related
  };
  averageCompetitor: {
    brandComboCount: number;
    brandPresence: number;
  };
  insights: string[];
}

export interface ComparisonSummary {
  overallPosition: 'leading' | 'competitive' | 'behind';
  strengths: string[]; // What you're doing better
  weaknesses: string[]; // Where competitors are ahead
  biggestGaps: {
    metric: string;
    gap: number;
    direction: 'ahead' | 'behind';
  }[];
  quickWins: string[]; // Easy improvements
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: 'intent' | 'combos' | 'keywords' | 'character_usage' | 'discovery' | 'brand';
  action: string;
  reasoning: string;
  expectedImpact: string;
  implementationDifficulty: 'easy' | 'medium' | 'hard';
}

export interface ComparisonTelemetry {
  target: AuditTelemetryEntry;
  competitors: AuditTelemetryEntry[];
  fallbackAppIds: string[];
}

interface FootprintMetrics {
  learning: number;
  outcome: number;
  brand: number;
  noise: number;
  lowValue: number;
  total: number;
}

// =====================================================================
// COMPARISON ALGORITHMS
// =====================================================================

/**
 * Algorithm 1: KPI Comparison
 */
function compareKPIs(
  targetAudit: UnifiedMetadataAuditResult,
  competitorAudits: AuditCompetitorResult[]
): KPIComparison {
  const target = {
    overallScore: targetAudit.kpis?.overall_score || 0,
    titleScore: targetAudit.elementScoring?.title?.score || 0,
    subtitleScore: targetAudit.elementScoring?.subtitle?.score || 0,
    descriptionScore: targetAudit.elementScoring?.description?.score || 0,
  };

  const competitors = competitorAudits.map((c) => ({
    competitorId: c.competitorId,
    competitorName: c.metadata.name,
    overallScore: c.auditData.kpis?.overall_score || 0,
    titleScore: c.auditData.elementScoring?.title?.score || 0,
    subtitleScore: c.auditData.elementScoring?.subtitle?.score || 0,
    descriptionScore: c.auditData.elementScoring?.description?.score || 0,
  }));

  const averageCompetitor = {
    overallScore: competitors.reduce((sum, c) => sum + c.overallScore, 0) / competitors.length || 0,
    titleScore: competitors.reduce((sum, c) => sum + c.titleScore, 0) / competitors.length || 0,
    subtitleScore: competitors.reduce((sum, c) => sum + c.subtitleScore, 0) / competitors.length || 0,
    descriptionScore: competitors.reduce((sum, c) => sum + c.descriptionScore, 0) / competitors.length || 0,
  };

  const gaps = {
    overallScoreGap: target.overallScore - averageCompetitor.overallScore,
    titleScoreGap: target.titleScore - averageCompetitor.titleScore,
    subtitleScoreGap: target.subtitleScore - averageCompetitor.subtitleScore,
    descriptionScoreGap: target.descriptionScore - averageCompetitor.descriptionScore,
  };

  const wins = Object.values(gaps).filter((gap) => gap > 0).length;
  const losses = Object.values(gaps).filter((gap) => gap < 0).length;

  return {
    target,
    competitors,
    averageCompetitor,
    gaps,
    wins,
    losses,
  };
}

/**
 * Algorithm 2: Intent Gap Analysis
 */
function analyzeIntentGap(
  targetAudit: UnifiedMetadataAuditResult,
  competitorAudits: AuditCompetitorResult[]
): IntentGapAnalysis {
  const target = {
    informational: targetAudit.intentCoverage?.searchIntent?.informational?.percentage || 0,
    commercial: targetAudit.intentCoverage?.searchIntent?.commercial?.percentage || 0,
    transactional: targetAudit.intentCoverage?.searchIntent?.transactional?.percentage || 0,
    navigational: targetAudit.intentCoverage?.searchIntent?.navigational?.percentage || 0,
  };

  const competitorIntents = competitorAudits.map((c) => ({
    competitorId: c.competitorId,
    competitorName: c.metadata.name,
    informational: c.auditData.intentCoverage?.searchIntent?.informational?.percentage || 0,
    commercial: c.auditData.intentCoverage?.searchIntent?.commercial?.percentage || 0,
    transactional: c.auditData.intentCoverage?.searchIntent?.transactional?.percentage || 0,
    navigational: c.auditData.intentCoverage?.searchIntent?.navigational?.percentage || 0,
  }));

  const averageCompetitor = {
    informational: competitorIntents.reduce((sum, c) => sum + c.informational, 0) / competitorIntents.length || 0,
    commercial: competitorIntents.reduce((sum, c) => sum + c.commercial, 0) / competitorIntents.length || 0,
    transactional: competitorIntents.reduce((sum, c) => sum + c.transactional, 0) / competitorIntents.length || 0,
    navigational: competitorIntents.reduce((sum, c) => sum + c.navigational, 0) / competitorIntents.length || 0,
  };

  const gaps = {
    informational: target.informational - averageCompetitor.informational,
    commercial: target.commercial - averageCompetitor.commercial,
    transactional: target.transactional - averageCompetitor.transactional,
    navigational: target.navigational - averageCompetitor.navigational,
  };

  // Generate insights
  const insights: string[] = [];
  if (Math.abs(gaps.transactional) > 15) {
    const diff = Math.abs(gaps.transactional);
    const direction = gaps.transactional > 0 ? 'more' : 'less';
    insights.push(
      `You have ${diff.toFixed(0)}% ${direction} transactional intent than competitors. ${
        gaps.transactional < 0
          ? 'Consider adding action-oriented keywords like "download", "buy", "get".'
          : 'You have strong transactional coverage.'
      }`
    );
  }

  if (Math.abs(gaps.informational) > 15) {
    const diff = Math.abs(gaps.informational);
    const direction = gaps.informational > 0 ? 'more' : 'less';
    insights.push(
      `You have ${diff.toFixed(0)}% ${direction} informational intent than competitors. ${
        gaps.informational < 0
          ? 'Consider adding educational keywords to capture learning-focused users.'
          : 'Strong educational positioning.'
      }`
    );
  }

  // Find dominant intent per competitor
  const topIntentByCompetitor = competitorIntents.map((c) => {
    const intents = [
      { type: 'informational' as const, value: c.informational },
      { type: 'commercial' as const, value: c.commercial },
      { type: 'transactional' as const, value: c.transactional },
      { type: 'navigational' as const, value: c.navigational },
    ];
    const dominant = intents.reduce((max, intent) => (intent.value > max.value ? intent : max));
    return {
      competitorId: c.competitorId,
      competitorName: c.competitorName,
      dominantIntent: dominant.type,
      percentage: dominant.value,
    };
  });

  return {
    target,
    averageCompetitor,
    gaps,
    insights,
    topIntentByCompetitor,
  };
}

/**
 * Algorithm 3: Combo Gap Analysis
 */
function analyzeComboGap(
  targetAudit: UnifiedMetadataAuditResult,
  competitorAudits: AuditCompetitorResult[]
): ComboGapAnalysis {
  const targetStats = targetAudit.comboCoverage?.stats;
  const targetCombos = {
    total: targetStats?.total ?? targetStats?.totalPossible ?? 0,
    existing: targetStats?.existing || 0,
    missing: targetStats?.missing || 0,
    coverage: targetStats?.coveragePct ?? targetStats?.coverage ?? 0,
  };

  const competitorComboStats = competitorAudits.map((c) => {
    const stats = c.auditData.comboCoverage?.stats;
    return {
      competitorId: c.competitorId,
      competitorName: c.metadata.name,
      total: stats?.total ?? stats?.totalPossible ?? 0,
      existing: stats?.existing || 0,
      missing: stats?.missing || 0,
      coverage: stats?.coveragePct ?? stats?.coverage ?? 0,
    };
  });

  const averageCompetitor = {
    total: competitorComboStats.reduce((sum, c) => sum + c.total, 0) / competitorComboStats.length || 0,
    existing: competitorComboStats.reduce((sum, c) => sum + c.existing, 0) / competitorComboStats.length || 0,
    missing: competitorComboStats.reduce((sum, c) => sum + c.missing, 0) / competitorComboStats.length || 0,
    coverage: competitorComboStats.reduce((sum, c) => sum + c.coverage, 0) / competitorComboStats.length || 0,
  };

  // Find combos used by competitors but not target
  const targetExistingCombos = new Set(
    (targetAudit.comboCoverage?.titleCombosClassified || []).map((c) => c.text.toLowerCase())
  );

  const competitorComboMap = new Map<
    string,
    { count: number; competitorNames: string[]; avgValue: number; values: number[] }
  >();

  competitorAudits.forEach((c) => {
    const combos = c.auditData.comboCoverage?.titleCombosClassified || [];
    combos.forEach((combo) => {
      const text = combo.text.toLowerCase();
      if (!targetExistingCombos.has(text)) {
        const existing = competitorComboMap.get(text) || {
          count: 0,
          competitorNames: [],
          avgValue: 0,
          values: [],
        };
        existing.count++;
        existing.competitorNames.push(c.metadata.name);
        existing.values.push(combo.relevanceScore || 50);
        competitorComboMap.set(text, existing);
      }
    });
  });

  // Calculate avg strategic value and sort by usage
  const missingOpportunities = Array.from(competitorComboMap.entries())
    .map(([combo, data]) => ({
      combo,
      strategicValue: data.values.reduce((sum, v) => sum + v, 0) / data.values.length,
      usedByCompetitors: data.count,
      competitorNames: data.competitorNames,
      recommendation: `Used by ${data.count}/${competitorAudits.length} competitors. ${
        data.count >= 2 ? 'High priority - multiple competitors use this.' : 'Consider adding.'
      }`,
    }))
    .sort((a, b) => b.usedByCompetitors - a.usedByCompetitors || b.strategicValue - a.strategicValue)
    .slice(0, 20); // Top 20 opportunities

  // Find shared combos (used by target AND competitors)
  const sharedCombos: { combo: string; strategicValue: number; usedByCount: number }[] = [];
  const allCombos = new Map<string, { count: number; value: number }>();

  // Add target combos
  (targetAudit.comboCoverage?.titleCombosClassified || []).forEach((combo) => {
    const text = combo.text.toLowerCase();
    allCombos.set(text, { count: 1, value: combo.relevanceScore || 50 });
  });

  // Add competitor combos
  competitorAudits.forEach((c) => {
    (c.auditData.comboCoverage?.titleCombosClassified || []).forEach((combo) => {
      const text = combo.text.toLowerCase();
      const existing = allCombos.get(text);
      if (existing) {
        existing.count++;
      }
    });
  });

  // Find shared (count > 1)
  allCombos.forEach((data, combo) => {
    if (data.count > 1) {
      sharedCombos.push({
        combo,
        strategicValue: data.value,
        usedByCount: data.count,
      });
    }
  });

  sharedCombos.sort((a, b) => b.usedByCount - a.usedByCount).slice(0, 10);

  // Unique to target
  const uniqueToTarget = Array.from(allCombos.entries())
    .filter(([_, data]) => data.count === 1)
    .map(([combo, data]) => ({
      combo,
      strategicValue: data.value,
    }))
    .sort((a, b) => b.strategicValue - a.strategicValue)
    .slice(0, 10);

  return {
    targetCombos,
    averageCompetitor,
    missingOpportunities,
    sharedCombos,
    uniqueToTarget,
  };
}

/**
 * Algorithm 4: Keyword Opportunities
 */
function analyzeKeywordOpportunities(
  targetAudit: UnifiedMetadataAuditResult,
  competitorAudits: AuditCompetitorResult[]
): KeywordOpportunities {
  const targetKeywords = new Set([
    ...(targetAudit.keywordCoverage?.titleKeywords || []).map((k) => k.toLowerCase()),
    ...(targetAudit.keywordCoverage?.subtitleNewKeywords || []).map((k) => k.toLowerCase()),
  ]);

  const competitorKeywordMap = new Map<
    string,
    { count: number; competitorNames: string[]; values: number[] }
  >();

  competitorAudits.forEach((c) => {
    const keywords = [
      ...(c.auditData.keywordCoverage?.titleKeywords || []),
      ...(c.auditData.keywordCoverage?.subtitleNewKeywords || []),
    ];

    keywords.forEach((keyword) => {
      const kw = keyword.toLowerCase();
      if (!targetKeywords.has(kw)) {
        const existing = competitorKeywordMap.get(kw) || {
          count: 0,
          competitorNames: [],
          values: [],
        };
        existing.count++;
        if (!existing.competitorNames.includes(c.metadata.name)) {
          existing.competitorNames.push(c.metadata.name);
        }
        existing.values.push(50); // Default value, could be enhanced
        competitorKeywordMap.set(kw, existing);
      }
    });
  });

  const competitorKeywords = Array.from(competitorKeywordMap.entries())
    .map(([keyword, data]) => ({
      keyword,
      appearsInCompetitors: data.count,
      avgStrategicValue: data.values.reduce((sum, v) => sum + v, 0) / data.values.length,
      competitorNames: data.competitorNames,
      inYourMetadata: targetKeywords.has(keyword),
      recommendation:
        data.count >= 2
          ? `High priority: ${data.count}/${competitorAudits.length} competitors use "${keyword}".`
          : `Consider adding "${keyword}" - used by ${data.competitorNames[0]}.`,
    }))
    .sort((a, b) => b.appearsInCompetitors - a.appearsInCompetitors)
    .slice(0, 30);

  const topOpportunities = competitorKeywords.slice(0, 10).map((kw) => ({
    keyword: kw.keyword,
    impact: (kw.appearsInCompetitors >= 3 ? 'high' : kw.appearsInCompetitors >= 2 ? 'medium' : 'low') as
      | 'high'
      | 'medium'
      | 'low',
    reason: `Used by ${kw.appearsInCompetitors} competitor${kw.appearsInCompetitors > 1 ? 's' : ''}`,
  }));

  return {
    competitorKeywords,
    topOpportunities,
  };
}

/**
 * Algorithm 5: Discovery Footprint Comparison
 */
function extractFootprintMetrics(audit: UnifiedMetadataAuditResult): FootprintMetrics {
  const titleCombos = audit.comboCoverage?.titleCombosClassified || [];
  const subtitleCombos = audit.comboCoverage?.subtitleNewCombosClassified || [];
  const lowValueCombos = audit.comboCoverage?.lowValueCombos || [];
  const allCombos = [...titleCombos, ...subtitleCombos];

  const metrics: FootprintMetrics = {
    learning: 0,
    outcome: 0,
    brand: 0,
    noise: 0,
    lowValue: lowValueCombos.length,
    total: 0,
  };

  allCombos.forEach((combo) => {
    switch (combo.intentClass) {
      case 'learning':
        metrics.learning++;
        break;
      case 'outcome':
        metrics.outcome++;
        break;
      case 'brand':
        metrics.brand++;
        break;
      case 'noise':
        metrics.noise++;
        break;
      default:
        if (combo.type === 'branded') {
          metrics.brand++;
        } else if (combo.type === 'generic') {
          metrics.outcome++;
        } else if (combo.type === 'low_value') {
          metrics.lowValue++;
        }
        break;
    }
  });

  metrics.total = metrics.learning + metrics.outcome + metrics.brand + metrics.noise + metrics.lowValue;
  return metrics;
}

function averageFootprintMetrics(metrics: FootprintMetrics[]): FootprintMetrics {
  if (metrics.length === 0) {
    return { learning: 0, outcome: 0, brand: 0, noise: 0, lowValue: 0, total: 0 };
  }

  return {
    learning: metrics.reduce((sum, m) => sum + m.learning, 0) / metrics.length,
    outcome: metrics.reduce((sum, m) => sum + m.outcome, 0) / metrics.length,
    brand: metrics.reduce((sum, m) => sum + m.brand, 0) / metrics.length,
    noise: metrics.reduce((sum, m) => sum + m.noise, 0) / metrics.length,
    lowValue: metrics.reduce((sum, m) => sum + m.lowValue, 0) / metrics.length,
    total: metrics.reduce((sum, m) => sum + m.total, 0) / metrics.length,
  };
}

function compareDiscoveryFootprint(
  targetAudit: UnifiedMetadataAuditResult,
  competitorAudits: AuditCompetitorResult[]
): DiscoveryFootprintComparison {
  const targetMetrics = extractFootprintMetrics(targetAudit);
  const competitorMetrics = competitorAudits.map((c) => ({
    competitorId: c.competitorId,
    competitorName: c.metadata.name,
    metrics: extractFootprintMetrics(c.auditData),
  }));

  const averageMetrics = averageFootprintMetrics(competitorMetrics.map((entry) => entry.metrics));

  const target = {
    learning: targetMetrics.learning,
    outcome: targetMetrics.outcome,
    brand: targetMetrics.brand,
    noise: targetMetrics.noise,
  };

  const averageCompetitor = {
    learning: averageMetrics.learning,
    outcome: averageMetrics.outcome,
    brand: averageMetrics.brand,
    noise: averageMetrics.noise,
  };

  const gaps = {
    learning: target.learning - averageCompetitor.learning,
    outcome: target.outcome - averageCompetitor.outcome,
    brand: target.brand - averageCompetitor.brand,
    noise: target.noise - averageCompetitor.noise,
  };

  const insights: string[] = [];
  if (gaps.learning < -5) {
    insights.push(
      `Competitors have ${Math.abs(gaps.learning).toFixed(0)} more learning-focused combos. Consider adding educational keywords.`
    );
  }
  if (gaps.outcome < -5) {
    insights.push(
      `Competitors have ${Math.abs(gaps.outcome).toFixed(0)} more outcome-focused combos. Highlight results and benefits.`
    );
  }
  if (gaps.noise > 5) {
    insights.push(`You have ${gaps.noise.toFixed(0)} more noise combos than competitors. Consider removing low-value terms.`);
  }

  return {
    target,
    averageCompetitor,
    gaps,
    insights,
    telemetry: {
      target: targetMetrics,
      competitors: competitorMetrics.map((entry) => ({
        competitorId: entry.competitorId,
        competitorName: entry.competitorName,
        ...entry.metrics,
      })),
      averages: averageMetrics,
    },
  };
}

function neutralizeIntentGap(intentGap: IntentGapAnalysis): void {
  intentGap.gaps = {
    informational: 0,
    commercial: 0,
    transactional: 0,
    navigational: 0,
  };
  intentGap.insights = [
    'Intent comparisons neutralized while intent patterns run in fallback mode.',
    ...intentGap.insights,
  ];
}

function annotateFallbackDiscoveryFootprint(discoveryFootprint: DiscoveryFootprintComparison): void {
  discoveryFootprint.gaps = {
    learning: 0,
    outcome: 0,
    brand: 0,
    noise: 0,
  };
  discoveryFootprint.insights = [
    'Discovery footprint coverage limited until Bible intent patterns sync (fallback mode detected).',
    ...discoveryFootprint.insights,
  ];
}

/**
 * Algorithm 6: Character Usage Comparison
 */
function compareCharacterUsage(
  targetAudit: UnifiedMetadataAuditResult,
  targetMetadata: { title: string; subtitle: string; description: string },
  competitorAudits: AuditCompetitorResult[]
): CharacterUsageComparison {
  const target = {
    titleLength: targetMetadata.title.length,
    titleUtilization: (targetMetadata.title.length / 30) * 100,
    subtitleLength: targetMetadata.subtitle.length,
    subtitleUtilization: (targetMetadata.subtitle.length / 80) * 100,
    descriptionLength: targetMetadata.description.length,
    descriptionUtilization: (targetMetadata.description.length / 4000) * 100,
  };

  const competitorUsage = competitorAudits.map((c) => ({
    titleLength: c.metadata.name.length,
    titleUtilization: (c.metadata.name.length / 30) * 100,
    subtitleLength: (c.metadata.subtitle || '').length,
    subtitleUtilization: ((c.metadata.subtitle || '').length / 80) * 100,
    descriptionLength: c.metadata.description.length,
    descriptionUtilization: (c.metadata.description.length / 4000) * 100,
  }));

  const averageCompetitor = {
    titleLength: competitorUsage.reduce((sum, c) => sum + c.titleLength, 0) / competitorUsage.length || 0,
    titleUtilization: competitorUsage.reduce((sum, c) => sum + c.titleUtilization, 0) / competitorUsage.length || 0,
    subtitleLength: competitorUsage.reduce((sum, c) => sum + c.subtitleLength, 0) / competitorUsage.length || 0,
    subtitleUtilization:
      competitorUsage.reduce((sum, c) => sum + c.subtitleUtilization, 0) / competitorUsage.length || 0,
    descriptionLength: competitorUsage.reduce((sum, c) => sum + c.descriptionLength, 0) / competitorUsage.length || 0,
    descriptionUtilization:
      competitorUsage.reduce((sum, c) => sum + c.descriptionUtilization, 0) / competitorUsage.length || 0,
  };

  const insights: string[] = [];
  if (target.titleUtilization < 70 && averageCompetitor.titleUtilization > 85) {
    insights.push(
      `Your title uses ${target.titleUtilization.toFixed(0)}% of available space vs competitors' ${averageCompetitor.titleUtilization.toFixed(0)}%. Consider adding keywords.`
    );
  }
  if (target.subtitleUtilization < 60 && averageCompetitor.subtitleUtilization > 75) {
    insights.push(
      `Your subtitle is underutilized (${target.subtitleUtilization.toFixed(0)}% vs ${averageCompetitor.subtitleUtilization.toFixed(0)}%). Add value propositions.`
    );
  }
  if (target.titleUtilization > 95) {
    insights.push('Your title is at/near max length. Ensure it reads naturally.');
  }

  return {
    target,
    averageCompetitor,
    insights,
  };
}

/**
 * Algorithm 7: Brand Strength Comparison
 */
function compareBrandStrength(
  targetAudit: UnifiedMetadataAuditResult,
  competitorAudits: AuditCompetitorResult[]
): BrandStrengthComparison {
  const targetBrandStats = computeBrandRatioStats(
    targetAudit.comboCoverage?.titleCombosClassified,
    targetAudit.comboCoverage?.lowValueCombos
  );
  const target = {
    brandComboCount: targetBrandStats.branded,
    brandPresence: targetBrandStats.brandRatio * 100,
  };

  const competitorBrand = competitorAudits.map((c) => {
    const stats = computeBrandRatioStats(
      c.auditData.comboCoverage?.titleCombosClassified,
      c.auditData.comboCoverage?.lowValueCombos
    );
    return {
      brandComboCount: stats.branded,
      brandPresence: stats.brandRatio * 100,
    };
  });

  const averageCompetitor = {
    brandComboCount: competitorBrand.reduce((sum, c) => sum + c.brandComboCount, 0) / competitorBrand.length || 0,
    brandPresence: competitorBrand.reduce((sum, c) => sum + c.brandPresence, 0) / competitorBrand.length || 0,
  };

  const insights: string[] = [];
  if (target.brandPresence < averageCompetitor.brandPresence - 5) {
    insights.push(
      `Competitors have stronger brand presence (${averageCompetitor.brandPresence.toFixed(0)}% vs your ${target.brandPresence.toFixed(0)}%).`
    );
  } else if (target.brandPresence > averageCompetitor.brandPresence + 5) {
    insights.push('You have strong brand presence compared to competitors.');
  }

  return {
    target,
    averageCompetitor,
    insights,
  };
}

/**
 * Generate Summary & Recommendations
 */
function generateSummaryAndRecommendations(
  kpiComparison: KPIComparison,
  intentGap: IntentGapAnalysis,
  comboGap: ComboGapAnalysis,
  keywordOpportunities: KeywordOpportunities,
  discoveryFootprint: DiscoveryFootprintComparison,
  characterUsage: CharacterUsageComparison,
  brandStrength: BrandStrengthComparison
): { summary: ComparisonSummary; recommendations: Recommendation[] } {
  // Determine overall position
  let overallPosition: 'leading' | 'competitive' | 'behind';
  if (kpiComparison.gaps.overallScoreGap > 5) {
    overallPosition = 'leading';
  } else if (kpiComparison.gaps.overallScoreGap < -5) {
    overallPosition = 'behind';
  } else {
    overallPosition = 'competitive';
  }

  // Identify strengths
  const strengths: string[] = [];
  if (kpiComparison.gaps.overallScoreGap > 0) {
    strengths.push(`Overall metadata score ${kpiComparison.gaps.overallScoreGap.toFixed(1)} points ahead`);
  }
  if (kpiComparison.gaps.titleScoreGap > 5) {
    strengths.push('Strong title optimization');
  }
  if (intentGap.gaps.transactional > 10) {
    strengths.push('Strong transactional intent coverage');
  }
  if (comboGap.targetCombos.coverage > comboGap.averageCompetitor.coverage) {
    strengths.push('Better keyword combo coverage');
  }

  // Identify weaknesses
  const weaknesses: string[] = [];
  if (kpiComparison.gaps.overallScoreGap < 0) {
    weaknesses.push(`Overall score ${Math.abs(kpiComparison.gaps.overallScoreGap).toFixed(1)} points behind average`);
  }
  if (intentGap.gaps.transactional < -15) {
    weaknesses.push('Low transactional intent coverage');
  }
  if (comboGap.missingOpportunities.length > 10) {
    weaknesses.push(`${comboGap.missingOpportunities.length} high-value combo opportunities missed`);
  }

  // Biggest gaps
  const biggestGaps = [
    { metric: 'Overall Score', gap: Math.abs(kpiComparison.gaps.overallScoreGap), direction: kpiComparison.gaps.overallScoreGap > 0 ? 'ahead' as const : 'behind' as const },
    { metric: 'Title Score', gap: Math.abs(kpiComparison.gaps.titleScoreGap), direction: kpiComparison.gaps.titleScoreGap > 0 ? 'ahead' as const : 'behind' as const },
    { metric: 'Transactional Intent', gap: Math.abs(intentGap.gaps.transactional), direction: intentGap.gaps.transactional > 0 ? 'ahead' as const : 'behind' as const },
    { metric: 'Combo Coverage', gap: Math.abs(comboGap.targetCombos.coverage - comboGap.averageCompetitor.coverage), direction: comboGap.targetCombos.coverage > comboGap.averageCompetitor.coverage ? 'ahead' as const : 'behind' as const },
  ].sort((a, b) => b.gap - a.gap).slice(0, 3);

  // Quick wins
  const quickWins: string[] = [];
  if (characterUsage.target.titleUtilization < 70) {
    quickWins.push('Add keywords to title (currently underutilized)');
  }
  if (comboGap.missingOpportunities.length > 0 && comboGap.missingOpportunities[0].usedByCompetitors >= 2) {
    quickWins.push(`Add "${comboGap.missingOpportunities[0].combo}" combo (used by ${comboGap.missingOpportunities[0].usedByCompetitors} competitors)`);
  }
  if (keywordOpportunities.topOpportunities.length > 0) {
    quickWins.push(`Incorporate "${keywordOpportunities.topOpportunities[0].keyword}" keyword`);
  }

  const summary: ComparisonSummary = {
    overallPosition,
    strengths,
    weaknesses,
    biggestGaps,
    quickWins,
  };

  // Generate recommendations
  const recommendations: Recommendation[] = [];

  // Intent recommendations
  if (intentGap.gaps.transactional < -15) {
    recommendations.push({
      priority: 'high',
      category: 'intent',
      action: 'Add transactional keywords to title and subtitle',
      reasoning: `Competitors have ${Math.abs(intentGap.gaps.transactional).toFixed(0)}% more transactional intent. Users searching with action-oriented keywords (download, buy, get) may not find your app.`,
      expectedImpact: 'Increase conversion rate by 15-25% from transactional searches',
      implementationDifficulty: 'easy',
    });
  }

  // Combo recommendations
  if (comboGap.missingOpportunities.length > 0) {
    const topMissing = comboGap.missingOpportunities.slice(0, 3);
    recommendations.push({
      priority: topMissing[0].usedByCompetitors >= 3 ? 'high' : 'medium',
      category: 'combos',
      action: `Add high-value combos: "${topMissing.map(c => c.combo).join('", "')}"`,
      reasoning: `These combos are used by ${topMissing[0].usedByCompetitors}+ competitors but missing from your metadata.`,
      expectedImpact: 'Improve keyword coverage by 10-20%',
      implementationDifficulty: 'medium',
    });
  }

  // Keyword recommendations
  if (keywordOpportunities.topOpportunities.length > 0) {
    const topKw = keywordOpportunities.topOpportunities.filter(k => k.impact === 'high').slice(0, 5);
    if (topKw.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'keywords',
        action: `Incorporate keywords: "${topKw.map(k => k.keyword).join('", "')}"`,
        reasoning: `These keywords appear in multiple competitor apps but not yours.`,
        expectedImpact: 'Capture additional search queries, increase visibility',
        implementationDifficulty: 'easy',
      });
    }
  }

  // Character usage recommendations
  if (characterUsage.target.titleUtilization < 70 && characterUsage.averageCompetitor.titleUtilization > 85) {
    recommendations.push({
      priority: 'medium',
      category: 'character_usage',
      action: 'Optimize title length - add 1-2 more keywords',
      reasoning: `Your title uses only ${characterUsage.target.titleUtilization.toFixed(0)}% of available space vs competitors' ${characterUsage.averageCompetitor.titleUtilization.toFixed(0)}%.`,
      expectedImpact: 'Improve keyword indexing without sacrificing readability',
      implementationDifficulty: 'easy',
    });
  }

  // Discovery footprint recommendations
  if (discoveryFootprint.gaps.learning < -5) {
    recommendations.push({
      priority: 'medium',
      category: 'discovery',
      action: 'Add learning-focused keywords (learn, tutorial, guide, how to)',
      reasoning: `Competitors have ${Math.abs(discoveryFootprint.gaps.learning).toFixed(0)} more learning-focused combos.`,
      expectedImpact: 'Capture educational search traffic',
      implementationDifficulty: 'easy',
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return { summary, recommendations };
}

// =====================================================================
// MAIN COMPARISON FUNCTION
// =====================================================================

/**
 * Compare target app against competitors across all 7 dimensions
 *
 * @param input - Target audit, competitor audits, and configuration
 * @returns Complete comparison result with insights and recommendations
 *
 * @example
 * const comparison = await compareWithCompetitors({
 *   targetAppId: 'uuid-target',
 *   targetAudit: targetAuditResult,
 *   competitorAudits: [competitor1Audit, competitor2Audit],
 *   organizationId: 'uuid-org',
 *   comparisonType: '1-to-many'
 * });
 */
export async function compareWithCompetitors(
  input: CompetitorComparisonInput & { targetMetadata: { title: string; subtitle: string; description: string } }
): Promise<CompetitorComparisonResult> {
  const {
    targetAppId,
    targetAudit,
    competitorAudits,
    organizationId,
    comparisonType = '1-to-many',
    targetMetadata,
  } = input;

  const validatedCompetitors = competitorAudits
    .map((audit) => validateCompetitorAudit(audit, { context: 'compareWithCompetitors' }))
    .filter((audit): audit is AuditCompetitorResult => Boolean(audit));

  console.log(
    `[CompetitorComparison] Comparing target app against ${validatedCompetitors.length} competitors (requested ${competitorAudits.length})`
  );

  if (validatedCompetitors.length === 0) {
    throw new Error('No valid competitor audits available for comparison');
  }

  const targetTelemetry = buildAuditTelemetry(targetAudit, {
    id: targetAppId,
    name: targetMetadata.title || 'Target App',
    snapshotCreatedAt: targetAudit.ruleSetDiagnostics?.snapshotCreatedAt,
  });
  const competitorTelemetries = validatedCompetitors.map((c) =>
    buildAuditTelemetry(c.audit, {
      id: c.competitorId,
      name: c.metadata.name,
      snapshotCreatedAt: c.snapshotCreatedAt,
    })
  );
  const fallbackAppIds = [
    ...(targetTelemetry.fallbackMode ? [targetTelemetry.id] : []),
    ...competitorTelemetries.filter((t) => t.fallbackMode).map((t) => t.id),
  ];
  const hasFallbackIntentData = fallbackAppIds.length > 0;

  const startTime = Date.now();

  // Run all 7 comparison algorithms
  const kpiComparison = compareKPIs(targetAudit, validatedCompetitors);
  const intentGap = analyzeIntentGap(targetAudit, validatedCompetitors);
  const comboGap = analyzeComboGap(targetAudit, validatedCompetitors);
  const keywordOpportunities = analyzeKeywordOpportunities(targetAudit, validatedCompetitors);
  const discoveryFootprint = compareDiscoveryFootprint(targetAudit, validatedCompetitors);
  const characterUsage = compareCharacterUsage(targetAudit, targetMetadata, validatedCompetitors);
  const brandStrength = compareBrandStrength(targetAudit, validatedCompetitors);

  if (hasFallbackIntentData) {
    neutralizeIntentGap(intentGap);
    annotateFallbackDiscoveryFootprint(discoveryFootprint);
  }

  // Generate summary and recommendations
  const { summary, recommendations } = generateSummaryAndRecommendations(
    kpiComparison,
    intentGap,
    comboGap,
    keywordOpportunities,
    discoveryFootprint,
    characterUsage,
    brandStrength
  );

  const computationTime = Date.now() - startTime;
  console.log(`[CompetitorComparison] ✅ Comparison completed in ${computationTime}ms`);

  const result: CompetitorComparisonResult = {
    targetAppId,
    competitorIds: validatedCompetitors.map((c) => c.competitorId),
    comparisonType,
    generatedAt: new Date().toISOString(),
    kpiComparison,
    intentGap,
    comboGap,
    keywordOpportunities,
    discoveryFootprint,
    characterUsage,
    brandStrength,
    summary,
    recommendations,
    telemetry: {
      target: targetTelemetry,
      competitors: competitorTelemetries,
      fallbackAppIds,
    },
  };

  // Store in cache
  await storeComparisonCache(targetAppId, organizationId, result, computationTime);

  return result;
}

/**
 * Store comparison result in cache
 */
async function storeComparisonCache(
  targetAppId: string,
  organizationId: string,
  comparisonResult: CompetitorComparisonResult,
  computationTimeMs: number
): Promise<void> {
  try {
    const cacheKey = `${targetAppId}:${comparisonResult.competitorIds.sort().join(',')}:default`;

    // Invalidate old cache entries for this target app
    await supabase
      .from('competitor_comparison_cache')
      .update({ is_stale: true })
      .eq('target_app_id', targetAppId)
      .eq('is_stale', false);

    // Insert new cache entry
    const { error } = await supabase.from('competitor_comparison_cache').insert({
      organization_id: organizationId,
      target_app_id: targetAppId,
      comparison_config: {
        competitor_ids: comparisonResult.competitorIds,
        comparison_type: comparisonResult.comparisonType,
      },
      comparison_data: comparisonResult as any,
      source_audit_ids: [], // TODO: Track audit snapshot IDs
      cache_key: cacheKey,
      is_stale: false,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
      computation_time_ms: computationTimeMs,
    });

    if (error) {
      console.error('[CompetitorComparison] ❌ Failed to store cache:', error);
    } else {
      console.log('[CompetitorComparison] ✅ Stored comparison cache');
    }
  } catch (error) {
    console.error('[CompetitorComparison] ❌ Unexpected error storing cache:', error);
  }
}

/**
 * Get cached comparison result
 */
export async function getCachedComparison(
  targetAppId: string,
  competitorIds: string[]
): Promise<CompetitorComparisonResult | null> {
  try {
    const cacheKey = `${targetAppId}:${competitorIds.sort().join(',')}:default`;

    const { data, error } = await supabase
      .from('competitor_comparison_cache')
      .select('*')
      .eq('target_app_id', targetAppId)
      .eq('cache_key', cacheKey)
      .eq('is_stale', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    console.log(`[CompetitorComparison] ✅ Found cached comparison from ${data.created_at}`);
    return data.comparison_data as CompetitorComparisonResult;
  } catch (error) {
    console.error('[CompetitorComparison] ❌ Error fetching cache:', error);
    return null;
  }
}
