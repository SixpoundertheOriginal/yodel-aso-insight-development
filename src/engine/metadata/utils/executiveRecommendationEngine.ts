/**
 * Executive Recommendation Engine
 *
 * Phase 4: Generate structured executive recommendations
 * Integrates Intent V2 + Description Intelligence + Gap Analysis
 *
 * Generates 4-section recommendations:
 * 1. What's Wrong - Critical issues
 * 2. Opportunities - Gap-based opportunities
 * 3. Direction - Strategic guidance
 * 4. Next Tests - Variant suggestions (placeholder)
 */

import type { AppCapabilityMap } from '@/types/auditV2';
import type { GapAnalysisResult, DetectedGap } from '@/types/gapAnalysis';
import type {
  ExecutiveRecommendations,
  CriticalIssue,
  Opportunity,
  ActionItem,
  WhatsWrongSection,
  OpportunitiesSection,
  DirectionSection,
  NextTestsSection,
  StrategicGuidance,
  RecommendationGenerationConfig,
} from '@/types/executiveRecommendations';
import { featureFlags } from '@/lib/featureFlags';

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: RecommendationGenerationConfig = {
  maxCriticalIssues: 5,
  minSeverityForCritical: 'high',
  maxOpportunities: 10,
  minImpactForQuickWin: 60,
  maxQuickWins: 3,
  maxActionItems: 8,
  prioritizeVerticalStrategy: true,
  maxVariants: 3,
  generateVariants: false, // Placeholder in v2.0
  focusOnQuickWins: true,
  includeExamples: true,
  verboseExplanations: false,
};

// ============================================================================
// SECTION 1: WHAT'S WRONG
// ============================================================================

/**
 * Generate "What's Wrong" section from gap analysis
 */
function generateWhatsWrongSection(
  gapAnalysis: GapAnalysisResult,
  capabilityMap: AppCapabilityMap,
  config: RecommendationGenerationConfig
): WhatsWrongSection {
  const criticalIssues: CriticalIssue[] = [];

  // 1. Check for critical gaps
  const criticalGaps = gapAnalysis.prioritizedGaps.filter(
    g => g.severity === 'critical' || g.severity === 'high'
  );

  for (const gap of criticalGaps.slice(0, config.maxCriticalIssues)) {
    criticalIssues.push({
      id: `issue_${gap.id}`,
      category: 'capability',
      severity: gap.severity,
      title: `Missing ${gap.category}: ${gap.capability.replace(/_/g, ' ')}`,
      description: gap.description,
      impact: `Users may not discover your app when searching for ${gap.capability.replace(/_/g, ' ')} features`,
      evidence: gap.examples,
      priority: gap.impactScore >= 80 ? 10 : gap.impactScore >= 60 ? 8 : 6,
    });
  }

  // 2. Check for low capability coverage
  if (capabilityMap.features.count < 3) {
    criticalIssues.push({
      id: 'issue_low_feature_coverage',
      category: 'capability',
      severity: 'high',
      title: 'Low feature coverage in description',
      description: `Only ${capabilityMap.features.count} features detected. Top apps mention 5-8 key features.`,
      impact: 'Users cannot understand what your app does or why it stands out',
      priority: 9,
    });
  }

  if (capabilityMap.benefits.count < 2) {
    criticalIssues.push({
      id: 'issue_low_benefit_coverage',
      category: 'capability',
      severity: 'high',
      title: 'Missing benefit messaging',
      description: `Only ${capabilityMap.benefits.count} benefits detected. Users need to understand value.`,
      impact: 'Users may not understand why they should choose your app',
      priority: 8,
    });
  }

  if (capabilityMap.trust.count === 0) {
    criticalIssues.push({
      id: 'issue_no_trust_signals',
      category: 'capability',
      severity: 'medium',
      title: 'No trust signals detected',
      description: 'Description lacks social proof, certifications, or credibility markers.',
      impact: 'Users may hesitate to download without trust indicators',
      priority: 7,
    });
  }

  // 3. Check overall gap score
  if (gapAnalysis.overallGapScore < 50) {
    criticalIssues.push({
      id: 'issue_low_gap_score',
      category: 'quality',
      severity: 'critical',
      title: 'Poor vertical alignment',
      description: `Gap score: ${gapAnalysis.overallGapScore}/100. Missing key capabilities for ${gapAnalysis.verticalId}.`,
      impact: 'App may not appear in vertical-specific searches or fail to convert',
      priority: 10,
    });
  }

  // Sort by priority (descending)
  criticalIssues.sort((a, b) => b.priority - a.priority);

  // Take top N issues
  const topIssues = criticalIssues.slice(0, config.maxCriticalIssues);

  // Generate summary
  const highestSeverity = topIssues[0]?.severity || 'low';
  const estimatedImpact = topIssues.length >= 3 ? 'high' : topIssues.length >= 1 ? 'medium' : 'low';

  let summary = '';
  if (topIssues.length === 0) {
    summary = 'No critical issues detected. Metadata quality is good.';
  } else if (topIssues.length === 1) {
    summary = `1 critical issue: ${topIssues[0].title}`;
  } else {
    summary = `${topIssues.length} critical issues detected. Top priority: ${topIssues[0].title}`;
  }

  return {
    criticalIssues: topIssues,
    totalIssues: topIssues.length,
    highestSeverity,
    estimatedImpact,
    summary,
  };
}

// ============================================================================
// SECTION 2: OPPORTUNITIES
// ============================================================================

/**
 * Generate "Opportunities" section from gaps
 */
function generateOpportunitiesSection(
  gapAnalysis: GapAnalysisResult,
  config: RecommendationGenerationConfig
): OpportunitiesSection {
  const opportunities: Opportunity[] = [];

  // Convert gaps to opportunities
  for (const gap of gapAnalysis.prioritizedGaps) {
    // Determine difficulty
    let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
    if (gap.category === 'feature' && gap.severity === 'critical') {
      difficulty = 'hard'; // Core features are hard to add
    } else if (gap.category === 'benefit' || gap.category === 'trust') {
      difficulty = 'easy'; // Just messaging changes
    }

    // Expected benefit
    let expectedBenefit = '';
    if (gap.category === 'feature') {
      expectedBenefit = 'Increased discoverability in feature-based searches';
    } else if (gap.category === 'benefit') {
      expectedBenefit = 'Higher conversion rate as users understand value proposition';
    } else if (gap.category === 'trust') {
      expectedBenefit = 'Improved trust and credibility, higher download rate';
    }

    opportunities.push({
      id: `opp_${gap.id}`,
      category: gap.category,
      title: `Add ${gap.capability.replace(/_/g, ' ')} to description`,
      description: gap.description,
      expectedBenefit,
      examples: gap.examples || [],
      difficulty,
      impactScore: gap.impactScore,
    });
  }

  // Take top opportunities
  const topOpportunities = opportunities.slice(0, config.maxOpportunities);

  // Identify quick wins (easy + high impact)
  const quickWins = topOpportunities
    .filter(o => o.difficulty === 'easy' && o.impactScore >= config.minImpactForQuickWin)
    .slice(0, config.maxQuickWins);

  // Identify long-term wins (hard but very high impact)
  const longTermWins = topOpportunities
    .filter(o => o.difficulty === 'hard' && o.impactScore >= 80)
    .slice(0, 3);

  // Generate summary
  let summary = '';
  if (topOpportunities.length === 0) {
    summary = 'No major opportunities detected. Focus on maintaining current quality.';
  } else if (quickWins.length > 0) {
    summary = `${quickWins.length} quick wins available. Start with: ${quickWins[0].title}`;
  } else {
    summary = `${topOpportunities.length} opportunities identified. Top opportunity: ${topOpportunities[0].title}`;
  }

  return {
    opportunities: topOpportunities,
    totalOpportunities: topOpportunities.length,
    quickWins,
    longTermWins,
    summary,
  };
}

// ============================================================================
// SECTION 3: DIRECTION
// ============================================================================

/**
 * Generate vertical-specific strategic guidance
 */
function generateStrategicGuidance(
  verticalId: string,
  gapAnalysis: GapAnalysisResult,
  capabilityMap: AppCapabilityMap
): StrategicGuidance {
  // Vertical-specific strategies
  const verticalStrategies: Record<string, string> = {
    language_learning:
      'Focus on fluency outcomes and learning speed. Emphasize offline capability and voice features for differentiation.',
    finance:
      'Lead with security and trust. Highlight money-saving benefits and data protection. Compliance mentions boost credibility.',
    fitness:
      'Emphasize transformation and results. Include professional backing and progress tracking features.',
    base: 'Focus on core value proposition and unique features. Build trust through social proof.',
  };

  // Intent coverage strategy
  let intentStrategy = 'Balance informational and transactional keywords. ';
  if (gapAnalysis.featureGaps.missingCount > 2) {
    intentStrategy +=
      'Add more feature-focused keywords to improve discovery in "how to" searches.';
  } else if (gapAnalysis.benefitGaps.missingCount > 2) {
    intentStrategy += 'Add more benefit keywords to improve conversion on commercial searches.';
  } else {
    intentStrategy += 'Current intent balance is good.';
  }

  // Capability strategy
  let capabilityStrategy = '';
  if (gapAnalysis.overallGapScore < 60) {
    capabilityStrategy = `Critical: Improve capability coverage to ${gapAnalysis.verticalId} standards. Current: ${gapAnalysis.overallGapScore}/100.`;
  } else if (gapAnalysis.overallGapScore < 80) {
    capabilityStrategy = `Good foundation, but room for improvement. Fill ${gapAnalysis.totalGaps} capability gaps.`;
  } else {
    capabilityStrategy = 'Strong capability coverage. Focus on optimization and testing.';
  }

  // Competitive positioning
  let competitivePositioning = '';
  if (capabilityMap.features.count >= 5 && capabilityMap.trust.count >= 2) {
    competitivePositioning =
      'You have strong feature + trust positioning. Double down on unique differentiators.';
  } else if (capabilityMap.benefits.count >= 4) {
    competitivePositioning =
      'Strong benefit messaging. Add more feature specifics to differentiate from competitors.';
  } else {
    competitivePositioning =
      'Build competitive edge by highlighting 2-3 unique features that competitors lack.';
  }

  return {
    verticalStrategy: verticalStrategies[verticalId] || verticalStrategies['base'],
    intentStrategy,
    capabilityStrategy,
    competitivePositioning,
  };
}

/**
 * Generate action items
 */
function generateActionItems(
  gapAnalysis: GapAnalysisResult,
  whatsWrong: WhatsWrongSection,
  opportunities: OpportunitiesSection,
  config: RecommendationGenerationConfig
): ActionItem[] {
  const actionItems: ActionItem[] = [];

  // 1. Address critical issues first
  for (const issue of whatsWrong.criticalIssues.slice(0, 3)) {
    actionItems.push({
      id: `action_fix_${issue.id}`,
      action: `Fix: ${issue.title}`,
      rationale: issue.impact,
      priority: issue.severity === 'critical' ? 'immediate' : 'short-term',
      estimatedEffort: issue.category === 'capability' ? 'low' : 'medium',
      expectedOutcome: 'Resolve critical quality issue',
    });
  }

  // 2. Execute quick wins
  for (const quickWin of opportunities.quickWins) {
    actionItems.push({
      id: `action_quick_${quickWin.id}`,
      action: quickWin.title,
      rationale: quickWin.expectedBenefit,
      priority: 'immediate',
      estimatedEffort: 'low',
      expectedOutcome: `+${quickWin.impactScore} impact score`,
    });
  }

  // 3. Plan long-term improvements
  for (const longTerm of opportunities.longTermWins.slice(0, 2)) {
    actionItems.push({
      id: `action_longterm_${longTerm.id}`,
      action: longTerm.title,
      rationale: longTerm.expectedBenefit,
      priority: 'long-term',
      estimatedEffort: 'high',
      expectedOutcome: `+${longTerm.impactScore} impact score (high value)`,
    });
  }

  // Take top N action items
  return actionItems.slice(0, config.maxActionItems);
}

/**
 * Generate "Direction" section
 */
function generateDirectionSection(
  verticalId: string,
  gapAnalysis: GapAnalysisResult,
  capabilityMap: AppCapabilityMap,
  whatsWrong: WhatsWrongSection,
  opportunities: OpportunitiesSection,
  config: RecommendationGenerationConfig
): DirectionSection {
  const strategicGuidance = generateStrategicGuidance(verticalId, gapAnalysis, capabilityMap);
  const actionItems = generateActionItems(gapAnalysis, whatsWrong, opportunities, config);

  // Determine priority order
  const priorityOrder = actionItems.map(item => item.id);

  // Generate summary
  const immediateActions = actionItems.filter(a => a.priority === 'immediate').length;
  const summary =
    immediateActions > 0
      ? `${immediateActions} immediate actions required. Start with: ${actionItems[0]?.action || 'N/A'}`
      : 'Focus on long-term improvements and optimization.';

  return {
    strategicGuidance,
    actionItems,
    priorityOrder,
    summary,
  };
}

// ============================================================================
// SECTION 4: NEXT TESTS (PLACEHOLDER)
// ============================================================================

/**
 * Generate "Next Tests" section (placeholder for v2.0)
 */
function generateNextTestsSection(config: RecommendationGenerationConfig): NextTestsSection {
  return {
    variants: [],
    totalVariants: 0,
    highConfidenceVariants: [],
    summary: 'Test variant generation coming in v3.0',
    placeholder: true,
  };
}

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

/**
 * Generate complete executive recommendations
 *
 * @param gapAnalysis - Gap analysis result from Phase 3
 * @param capabilityMap - Capability map from Phase 2
 * @param verticalId - Vertical ID for strategic guidance
 * @param config - Optional configuration override
 * @returns Complete executive recommendations
 */
export function generateExecutiveRecommendations(
  gapAnalysis: GapAnalysisResult,
  capabilityMap: AppCapabilityMap,
  verticalId: string,
  config: RecommendationGenerationConfig = DEFAULT_CONFIG
): ExecutiveRecommendations {
  // Check feature flag
  if (!featureFlags.executiveRecommendations()) {
    return createEmptyRecommendations(verticalId);
  }

  // Generate each section
  const whatsWrong = generateWhatsWrongSection(gapAnalysis, capabilityMap, config);
  const opportunities = generateOpportunitiesSection(gapAnalysis, config);
  const direction = generateDirectionSection(
    verticalId,
    gapAnalysis,
    capabilityMap,
    whatsWrong,
    opportunities,
    config
  );
  const nextTests = generateNextTestsSection(config);

  // Calculate overall metadata
  const totalActionItems =
    whatsWrong.criticalIssues.length + opportunities.quickWins.length + direction.actionItems.length;

  let overallPriority: 'critical' | 'high' | 'medium' | 'low' = 'low';
  if (whatsWrong.highestSeverity === 'critical' || gapAnalysis.criticalGaps > 0) {
    overallPriority = 'critical';
  } else if (whatsWrong.highestSeverity === 'high' || gapAnalysis.highGaps > 2) {
    overallPriority = 'high';
  } else if (gapAnalysis.totalGaps > 5) {
    overallPriority = 'medium';
  }

  // Estimate time to implement
  const quickWinCount = opportunities.quickWins.length;
  const longTermCount = opportunities.longTermWins.length;
  let estimatedTimeToImplement = '';
  if (quickWinCount >= 3) {
    estimatedTimeToImplement = '1-2 days (quick wins)';
  } else if (longTermCount >= 2) {
    estimatedTimeToImplement = '2-3 weeks (includes major features)';
  } else {
    estimatedTimeToImplement = '3-5 days';
  }

  // Confidence score
  const confidenceScore = Math.min(
    100,
    Math.round((gapAnalysis.overallGapScore + capabilityMap.features.count * 10) / 2)
  );

  return {
    whatsWrong,
    opportunities,
    direction,
    nextTests,
    overallPriority,
    totalActionItems,
    estimatedTimeToImplement,
    confidenceScore,
    dataSources: {
      intentAnalysis: false, // Not integrated yet (Phase 4 stretch goal)
      capabilityAnalysis: true,
      gapAnalysis: true,
      verticalBenchmark: gapAnalysis.benchmarkSource === 'vertical',
      kpiAnalysis: false, // Not integrated yet
    },
    generatedAt: new Date().toISOString(),
    version: '2.0',
  };
}

/**
 * Create empty recommendations (when feature is disabled)
 */
function createEmptyRecommendations(verticalId: string): ExecutiveRecommendations {
  return {
    whatsWrong: {
      criticalIssues: [],
      totalIssues: 0,
      highestSeverity: 'low',
      estimatedImpact: 'low',
      summary: 'Feature disabled',
    },
    opportunities: {
      opportunities: [],
      totalOpportunities: 0,
      quickWins: [],
      longTermWins: [],
      summary: 'Feature disabled',
    },
    direction: {
      strategicGuidance: {
        verticalStrategy: '',
        intentStrategy: '',
        capabilityStrategy: '',
        competitivePositioning: '',
      },
      actionItems: [],
      priorityOrder: [],
      summary: 'Feature disabled',
    },
    nextTests: {
      variants: [],
      totalVariants: 0,
      highConfidenceVariants: [],
      summary: 'Feature disabled',
      placeholder: true,
    },
    overallPriority: 'low',
    totalActionItems: 0,
    estimatedTimeToImplement: 'N/A',
    confidenceScore: 0,
    dataSources: {
      intentAnalysis: false,
      capabilityAnalysis: false,
      gapAnalysis: false,
      verticalBenchmark: false,
      kpiAnalysis: false,
    },
    generatedAt: new Date().toISOString(),
    version: '2.0',
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get executive summary (for logging/UI)
 */
export function getExecutiveSummary(recommendations: ExecutiveRecommendations): {
  priority: string;
  criticalIssues: number;
  quickWins: number;
  actionItems: number;
  estimatedTime: string;
} {
  return {
    priority: recommendations.overallPriority,
    criticalIssues: recommendations.whatsWrong.totalIssues,
    quickWins: recommendations.opportunities.quickWins.length,
    actionItems: recommendations.direction.actionItems.length,
    estimatedTime: recommendations.estimatedTimeToImplement,
  };
}
