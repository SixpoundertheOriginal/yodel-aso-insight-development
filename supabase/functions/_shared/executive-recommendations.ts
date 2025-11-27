/**
 * Executive Recommendations Engine (Deno-compatible)
 *
 * Phase 4: Simplified recommendation generation for edge functions
 * Generates 4-section executive recommendations
 */

import type { AppCapabilityMap } from './description-intelligence.ts';
import type { GapAnalysisResult } from './gap-analysis.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface ExecutiveRecommendations {
  whatsWrong: {
    criticalIssues: string[];
    totalIssues: number;
    summary: string;
  };
  opportunities: {
    opportunities: string[];
    quickWins: string[];
    totalOpportunities: number;
    summary: string;
  };
  direction: {
    strategicGuidance: string;
    actionItems: string[];
    summary: string;
  };
  nextTests: {
    summary: string;
    placeholder: boolean;
  };
  overallPriority: 'critical' | 'high' | 'medium' | 'low';
  totalActionItems: number;
  estimatedTimeToImplement: string;
  confidenceScore: number;
  generatedAt: string;
  version: string;
}

// ============================================================================
// RECOMMENDATION GENERATION
// ============================================================================

/**
 * Generate executive recommendations
 */
export function generateExecutiveRecommendations(
  gapAnalysis: GapAnalysisResult,
  capabilityMap: AppCapabilityMap,
  verticalId: string
): ExecutiveRecommendations {
  // Section 1: What's Wrong
  const criticalIssues: string[] = [];

  // Check critical gaps
  for (const gap of gapAnalysis.prioritizedGaps.slice(0, 5)) {
    if (gap.severity === 'critical' || gap.severity === 'high') {
      criticalIssues.push(
        `🔴 Missing ${gap.category}: ${gap.capability.replace(/_/g, ' ')} - ${gap.description}`
      );
    }
  }

  // Check low capability coverage
  if (capabilityMap.features.count < 3) {
    criticalIssues.push(
      `🔴 Low feature coverage: Only ${capabilityMap.features.count} features detected (need 5+)`
    );
  }

  if (capabilityMap.benefits.count < 2) {
    criticalIssues.push(
      `🟠 Missing benefit messaging: Only ${capabilityMap.benefits.count} benefits detected`
    );
  }

  if (capabilityMap.trust.count === 0) {
    criticalIssues.push(`🟡 No trust signals: Add social proof or credibility markers`);
  }

  // Check gap score
  if (gapAnalysis.overallGapScore < 50) {
    criticalIssues.push(
      `🔴 Poor vertical alignment: Gap score ${gapAnalysis.overallGapScore}/100 for ${verticalId}`
    );
  }

  const whatsWrongSummary =
    criticalIssues.length === 0
      ? 'No critical issues detected'
      : `${criticalIssues.length} critical issues need attention`;

  // Section 2: Opportunities
  const opportunities: string[] = [];
  const quickWins: string[] = [];

  for (const gap of gapAnalysis.prioritizedGaps.slice(0, 10)) {
    const opp = `Add "${gap.capability.replace(/_/g, ' ')}" - ${gap.description}`;
    opportunities.push(opp);

    // Quick wins: benefit/trust gaps with high impact
    if ((gap.category === 'benefit' || gap.category === 'trust') && gap.impactScore >= 60) {
      quickWins.push(opp);
      if (quickWins.length >= 3) break;
    }
  }

  const opportunitiesSummary =
    quickWins.length > 0
      ? `${quickWins.length} quick wins available`
      : `${opportunities.length} opportunities identified`;

  // Section 3: Direction
  const verticalStrategies: Record<string, string> = {
    language_learning:
      'Focus on fluency outcomes and learning speed. Emphasize offline + voice features.',
    finance: 'Lead with security and trust. Highlight money-saving benefits and data protection.',
    fitness: 'Emphasize transformation and results. Include professional backing.',
    base: 'Focus on core value proposition and unique features.',
  };

  const strategicGuidance = verticalStrategies[verticalId] || verticalStrategies['base'];

  const actionItems: string[] = [];

  // Add immediate actions from critical issues
  for (const issue of criticalIssues.slice(0, 3)) {
    actionItems.push(`IMMEDIATE: ${issue.replace(/🔴|🟠|🟡/g, '').trim()}`);
  }

  // Add quick wins
  for (const quickWin of quickWins) {
    actionItems.push(`QUICK WIN: ${quickWin}`);
  }

  const directionSummary =
    actionItems.length > 0
      ? `${actionItems.length} action items prioritized`
      : 'Focus on optimization';

  // Section 4: Next Tests (placeholder)
  const nextTests = {
    summary: 'Test variant generation coming in v3.0',
    placeholder: true,
  };

  // Overall metadata
  let overallPriority: 'critical' | 'high' | 'medium' | 'low' = 'low';
  if (gapAnalysis.criticalGaps > 0 || gapAnalysis.overallGapScore < 50) {
    overallPriority = 'critical';
  } else if (gapAnalysis.highGaps > 2 || gapAnalysis.overallGapScore < 70) {
    overallPriority = 'high';
  } else if (gapAnalysis.totalGaps > 5) {
    overallPriority = 'medium';
  }

  const totalActionItems = actionItems.length;

  let estimatedTimeToImplement = '';
  if (quickWins.length >= 3) {
    estimatedTimeToImplement = '1-2 days (quick wins)';
  } else if (gapAnalysis.totalGaps > 8) {
    estimatedTimeToImplement = '2-3 weeks';
  } else {
    estimatedTimeToImplement = '3-5 days';
  }

  const confidenceScore = Math.min(
    100,
    Math.round((gapAnalysis.overallGapScore + capabilityMap.features.count * 10) / 2)
  );

  return {
    whatsWrong: {
      criticalIssues,
      totalIssues: criticalIssues.length,
      summary: whatsWrongSummary,
    },
    opportunities: {
      opportunities,
      quickWins,
      totalOpportunities: opportunities.length,
      summary: opportunitiesSummary,
    },
    direction: {
      strategicGuidance,
      actionItems,
      summary: directionSummary,
    },
    nextTests,
    overallPriority,
    totalActionItems,
    estimatedTimeToImplement,
    confidenceScore,
    generatedAt: new Date().toISOString(),
    version: '2.0',
  };
}
