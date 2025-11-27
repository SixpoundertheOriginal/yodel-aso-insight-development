/**
 * Gap Analysis Engine
 *
 * Phase 3: Detect capability gaps by comparing detected capabilities
 * against vertical benchmarks
 *
 * Algorithm:
 * 1. Load vertical benchmark (or base benchmark)
 * 2. Compare detected capabilities vs expected capabilities
 * 3. Identify gaps (missing capabilities)
 * 4. Score gaps by severity and prevalence
 * 5. Generate prioritized recommendations
 */

import type { AppCapabilityMap } from '@/types/auditV2';
import type {
  GapAnalysisResult,
  DetectedGap,
  CapabilityGapAnalysis,
  GapSeverity,
  GapCategory,
  ExpectedCapability,
  VerticalCapabilityBenchmark,
  BaseCapabilityBenchmark,
  GapDetectionConfig,
} from '@/types/gapAnalysis';
import {
  getCapabilityBenchmark,
  hasVerticalBenchmark,
} from '@/engine/metadata/data/vertical-capability-benchmarks';
import { featureFlags } from '@/lib/featureFlags';

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_GAP_DETECTION_CONFIG: GapDetectionConfig = {
  severityWeights: {
    critical: 1.0,
    high: 0.8,
    medium: 0.5,
    low: 0.3,
  },
  prevalenceThresholds: {
    critical: 80,
    high: 60,
    medium: 40,
    low: 0,
  },
  scoringWeights: {
    prevalence: 0.4,
    severity: 0.4,
    categoryImportance: 0.2,
  },
  maxRecommendations: 10,
  prioritizeCriticalGaps: true,
};

// ============================================================================
// GAP DETECTION LOGIC
// ============================================================================

/**
 * Check if a capability is detected in the app
 */
function isCapabilityDetected(
  expectedCapability: ExpectedCapability,
  detectedCapabilities: string[]
): boolean {
  // Normalize detected capabilities
  const normalizedDetected = detectedCapabilities.map(c => c.toLowerCase());

  // Check if any of the expected keywords are in detected capabilities
  for (const keyword of expectedCapability.keywords) {
    const normalizedKeyword = keyword.toLowerCase();

    // Check for exact match or substring match
    for (const detected of normalizedDetected) {
      if (detected.includes(normalizedKeyword) || normalizedKeyword.includes(detected)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Calculate impact score for a gap
 * Based on severity, prevalence, and category importance
 */
function calculateImpactScore(
  expectedCapability: ExpectedCapability,
  config: GapDetectionConfig
): number {
  // Severity weight
  const severityWeight = config.severityWeights[expectedCapability.severity];

  // Prevalence score (0-1)
  const prevalenceScore = expectedCapability.prevalence / 100;

  // Category importance (features > benefits > trust)
  let categoryWeight = 0.5;
  if (expectedCapability.category === 'feature') {
    categoryWeight = 1.0;
  } else if (expectedCapability.category === 'benefit') {
    categoryWeight = 0.8;
  } else if (expectedCapability.category === 'trust') {
    categoryWeight = 0.6;
  }

  // Weighted combination
  const impactScore =
    prevalenceScore * config.scoringWeights.prevalence +
    severityWeight * config.scoringWeights.severity +
    categoryWeight * config.scoringWeights.categoryImportance;

  // Convert to 0-100 scale
  return Math.round(impactScore * 100);
}

/**
 * Create a detected gap from an expected capability
 */
function createDetectedGap(
  expectedCapability: ExpectedCapability,
  config: GapDetectionConfig
): DetectedGap {
  const impactScore = calculateImpactScore(expectedCapability, config);

  // Generate recommendation action
  let recommendedAction = '';
  if (expectedCapability.category === 'feature') {
    recommendedAction = `Add "${expectedCapability.name.replace(/_/g, ' ')}" feature to description`;
  } else if (expectedCapability.category === 'benefit') {
    recommendedAction = `Highlight "${expectedCapability.name.replace(/_/g, ' ')}" benefit`;
  } else if (expectedCapability.category === 'trust') {
    recommendedAction = `Include "${expectedCapability.name.replace(/_/g, ' ')}" trust signal`;
  }

  return {
    id: `gap_${expectedCapability.category}_${expectedCapability.name}`,
    category: expectedCapability.category,
    severity: expectedCapability.severity,
    capability: expectedCapability.name,
    description: expectedCapability.description,
    expectedInVertical: true,
    impactScore,
    recommendedAction,
    examples: expectedCapability.examples,
  };
}

/**
 * Analyze gaps for a single capability category
 */
function analyzeCapabilityGaps(
  category: GapCategory,
  expectedCapabilities: ExpectedCapability[],
  detectedCategories: string[],
  config: GapDetectionConfig
): CapabilityGapAnalysis {
  const gaps: DetectedGap[] = [];
  const strengths: string[] = [];

  // Check each expected capability
  for (const expected of expectedCapabilities) {
    const isDetected = isCapabilityDetected(expected, detectedCategories);

    if (!isDetected) {
      // Gap detected
      const gap = createDetectedGap(expected, config);
      gaps.push(gap);
    } else {
      // Strength (capability is present)
      strengths.push(expected.name);
    }
  }

  const detectedCount = strengths.length;
  const expectedCount = expectedCapabilities.length;
  const missingCount = gaps.length;
  const coveragePercentage = expectedCount > 0 ? (detectedCount / expectedCount) * 100 : 0;

  return {
    category,
    detectedCount,
    expectedCount,
    missingCount,
    coveragePercentage,
    gaps,
    strengths,
  };
}

/**
 * Calculate overall gap score
 * 100 = perfect (no gaps), 0 = many critical gaps
 */
function calculateOverallGapScore(
  featureGaps: CapabilityGapAnalysis,
  benefitGaps: CapabilityGapAnalysis,
  trustGaps: CapabilityGapAnalysis
): number {
  // Weighted average of coverage percentages
  const featureWeight = 0.4;
  const benefitWeight = 0.35;
  const trustWeight = 0.25;

  const weightedScore =
    featureGaps.coveragePercentage * featureWeight +
    benefitGaps.coveragePercentage * benefitWeight +
    trustGaps.coveragePercentage * trustWeight;

  return Math.round(weightedScore);
}

/**
 * Generate top recommendations from gaps
 */
function generateTopRecommendations(
  prioritizedGaps: DetectedGap[],
  maxRecommendations: number
): string[] {
  const recommendations: string[] = [];

  // Take top N gaps by impact score
  const topGaps = prioritizedGaps.slice(0, maxRecommendations);

  for (const gap of topGaps) {
    // Add recommendation with severity indicator
    const severityEmoji =
      gap.severity === 'critical' ? '🔴' : gap.severity === 'high' ? '🟠' : gap.severity === 'medium' ? '🟡' : '🟢';

    const recommendation = `${severityEmoji} ${gap.recommendedAction}`;
    recommendations.push(recommendation);
  }

  return recommendations;
}

// ============================================================================
// MAIN GAP ANALYSIS FUNCTION
// ============================================================================

/**
 * Perform complete gap analysis
 *
 * @param capabilityMap - Detected capabilities from description
 * @param verticalId - Vertical ID for benchmark selection
 * @param config - Optional configuration override
 * @returns Complete gap analysis result
 */
export function analyzeCapabilityGaps(
  capabilityMap: AppCapabilityMap,
  verticalId: string,
  config: GapDetectionConfig = DEFAULT_GAP_DETECTION_CONFIG
): GapAnalysisResult {
  // Check feature flag
  if (!featureFlags.gapAnalysis()) {
    // Return empty result if disabled
    return createEmptyGapAnalysisResult(verticalId);
  }

  // Load benchmark
  const benchmark = getCapabilityBenchmark(verticalId);
  const benchmarkSource = hasVerticalBenchmark(verticalId) ? 'vertical' : 'base';

  // Extract detected capability categories (for matching)
  const detectedFeatureCategories = capabilityMap.features.categories;
  const detectedBenefitCategories = capabilityMap.benefits.categories;
  const detectedTrustCategories = capabilityMap.trust.categories;

  // Analyze gaps for each category
  let featureGaps: CapabilityGapAnalysis;
  let benefitGaps: CapabilityGapAnalysis;
  let trustGaps: CapabilityGapAnalysis;

  if ('expectedFeatures' in benchmark) {
    // Vertical-specific benchmark
    featureGaps = analyzeCapabilityGaps(
      'feature',
      benchmark.expectedFeatures,
      detectedFeatureCategories,
      config
    );
    benefitGaps = analyzeCapabilityGaps(
      'benefit',
      benchmark.expectedBenefits,
      detectedBenefitCategories,
      config
    );
    trustGaps = analyzeCapabilityGaps(
      'trust',
      benchmark.expectedTrustSignals,
      detectedTrustCategories,
      config
    );
  } else {
    // Base benchmark
    featureGaps = analyzeCapabilityGaps(
      'feature',
      benchmark.coreFeatures,
      detectedFeatureCategories,
      config
    );
    benefitGaps = analyzeCapabilityGaps(
      'benefit',
      benchmark.coreBenefits,
      detectedBenefitCategories,
      config
    );
    trustGaps = analyzeCapabilityGaps(
      'trust',
      benchmark.coreTrustSignals,
      detectedTrustCategories,
      config
    );
  }

  // Combine and prioritize all gaps
  const allGaps = [...featureGaps.gaps, ...benefitGaps.gaps, ...trustGaps.gaps];

  // Sort by impact score (descending)
  const prioritizedGaps = allGaps.sort((a, b) => b.impactScore - a.impactScore);

  // If prioritizeCriticalGaps is enabled, move critical gaps to front
  if (config.prioritizeCriticalGaps) {
    const criticalGaps = prioritizedGaps.filter(g => g.severity === 'critical');
    const nonCriticalGaps = prioritizedGaps.filter(g => g.severity !== 'critical');
    prioritizedGaps.length = 0;
    prioritizedGaps.push(...criticalGaps, ...nonCriticalGaps);
  }

  // Count gaps by severity
  const criticalGaps = prioritizedGaps.filter(g => g.severity === 'critical').length;
  const highGaps = prioritizedGaps.filter(g => g.severity === 'high').length;
  const mediumGaps = prioritizedGaps.filter(g => g.severity === 'medium').length;
  const lowGaps = prioritizedGaps.filter(g => g.severity === 'low').length;

  // Calculate overall gap score
  const overallGapScore = calculateOverallGapScore(featureGaps, benefitGaps, trustGaps);

  // Generate top recommendations
  const topRecommendations = generateTopRecommendations(prioritizedGaps, config.maxRecommendations);

  return {
    overallGapScore,
    totalGaps: prioritizedGaps.length,
    criticalGaps,
    highGaps,
    mediumGaps,
    lowGaps,
    featureGaps,
    benefitGaps,
    trustGaps,
    prioritizedGaps,
    topRecommendations,
    verticalId,
    benchmarkSource,
    analysisTimestamp: new Date().toISOString(),
  };
}

/**
 * Create empty gap analysis result (when feature is disabled)
 */
function createEmptyGapAnalysisResult(verticalId: string): GapAnalysisResult {
  const emptyGapAnalysis: CapabilityGapAnalysis = {
    category: 'feature',
    detectedCount: 0,
    expectedCount: 0,
    missingCount: 0,
    coveragePercentage: 0,
    gaps: [],
    strengths: [],
  };

  return {
    overallGapScore: 0,
    totalGaps: 0,
    criticalGaps: 0,
    highGaps: 0,
    mediumGaps: 0,
    lowGaps: 0,
    featureGaps: emptyGapAnalysis,
    benefitGaps: { ...emptyGapAnalysis, category: 'benefit' },
    trustGaps: { ...emptyGapAnalysis, category: 'trust' },
    prioritizedGaps: [],
    topRecommendations: [],
    verticalId,
    benchmarkSource: 'base',
    analysisTimestamp: new Date().toISOString(),
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get gap analysis summary for logging/debugging
 */
export function getGapAnalysisSummary(result: GapAnalysisResult): {
  overallScore: number;
  totalGaps: number;
  criticalIssues: number;
  featureCoverage: number;
  benefitCoverage: number;
  trustCoverage: number;
  topGaps: string[];
} {
  return {
    overallScore: result.overallGapScore,
    totalGaps: result.totalGaps,
    criticalIssues: result.criticalGaps,
    featureCoverage: Math.round(result.featureGaps.coveragePercentage),
    benefitCoverage: Math.round(result.benefitGaps.coveragePercentage),
    trustCoverage: Math.round(result.trustGaps.coveragePercentage),
    topGaps: result.prioritizedGaps.slice(0, 5).map(g => g.capability),
  };
}

/**
 * Check if gap analysis passed minimum thresholds
 */
export function passesMinimumThresholds(
  result: GapAnalysisResult,
  minScore: number = 60
): boolean {
  return result.overallGapScore >= minScore && result.criticalGaps === 0;
}

/**
 * Get gap analysis quality rating
 */
export function getGapAnalysisQuality(result: GapAnalysisResult): 'excellent' | 'good' | 'fair' | 'poor' {
  if (result.overallGapScore >= 90 && result.criticalGaps === 0) {
    return 'excellent';
  } else if (result.overallGapScore >= 70 && result.criticalGaps === 0) {
    return 'good';
  } else if (result.overallGapScore >= 50) {
    return 'fair';
  } else {
    return 'poor';
  }
}
