/**
 * Gap Analysis Types
 *
 * Phase 3: Types for capability gap analysis and recommendations
 * Used by both frontend and edge function (via Deno-compatible version)
 */

// ============================================================================
// CORE GAP TYPES
// ============================================================================

/**
 * Gap severity based on impact
 */
export type GapSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Gap category (what type of capability is missing)
 */
export type GapCategory = 'feature' | 'benefit' | 'trust' | 'hook' | 'intent';

/**
 * A detected gap (missing capability)
 */
export interface DetectedGap {
  id: string; // Unique gap identifier
  category: GapCategory;
  severity: GapSeverity;
  capability: string; // Missing capability name
  description: string; // Human-readable description
  expectedInVertical: boolean; // Is this expected for this vertical?
  impactScore: number; // 0-100 (higher = more important)
  recommendedAction: string; // What to do about it
  examples?: string[]; // Example phrases to add
}

/**
 * Gap analysis result for a single capability type
 */
export interface CapabilityGapAnalysis {
  category: GapCategory;
  detectedCount: number; // How many capabilities detected
  expectedCount: number; // How many expected for vertical
  missingCount: number; // Gap count
  coveragePercentage: number; // 0-100
  gaps: DetectedGap[]; // List of missing capabilities
  strengths: string[]; // Capabilities that are present (good!)
}

/**
 * Complete gap analysis result
 */
export interface GapAnalysisResult {
  overallGapScore: number; // 0-100 (100 = no gaps, 0 = many gaps)
  totalGaps: number;
  criticalGaps: number;
  highGaps: number;
  mediumGaps: number;
  lowGaps: number;

  // Gap analysis by category
  featureGaps: CapabilityGapAnalysis;
  benefitGaps: CapabilityGapAnalysis;
  trustGaps: CapabilityGapAnalysis;

  // Prioritized list of all gaps
  prioritizedGaps: DetectedGap[];

  // Top recommendations (human-readable)
  topRecommendations: string[];

  // Metadata
  verticalId: string;
  benchmarkSource: 'vertical' | 'base';
  analysisTimestamp: string;
}

// ============================================================================
// BENCHMARK TYPES
// ============================================================================

/**
 * Expected capability for a vertical
 */
export interface ExpectedCapability {
  name: string; // Capability name (e.g., "offline_mode", "save_money")
  category: GapCategory;
  severity: GapSeverity; // How important is this for this vertical?
  description: string;
  keywords: string[]; // Keywords/patterns to detect this capability
  examples: string[]; // Example phrases showing this capability
  prevalence: number; // 0-100 (how common is this in top apps for this vertical?)
}

/**
 * Capability benchmark for a vertical
 */
export interface VerticalCapabilityBenchmark {
  verticalId: string;
  verticalName: string;

  // Expected capabilities by category
  expectedFeatures: ExpectedCapability[];
  expectedBenefits: ExpectedCapability[];
  expectedTrustSignals: ExpectedCapability[];

  // Minimum thresholds
  minFeatureCount: number; // Minimum features to mention
  minBenefitCount: number; // Minimum benefits to mention
  minTrustSignalCount: number; // Minimum trust signals to mention

  // Metadata
  source: 'manual' | 'derived' | 'benchmark';
  lastUpdated: string;
}

/**
 * Base (generic) capability benchmark
 * Used when no vertical-specific benchmark is available
 */
export interface BaseCapabilityBenchmark {
  benchmarkId: 'base';

  // Core capabilities that ALL apps should have
  coreFeatures: ExpectedCapability[];
  coreBenefits: ExpectedCapability[];
  coreTrustSignals: ExpectedCapability[];

  // Minimum thresholds (conservative)
  minFeatureCount: number;
  minBenefitCount: number;
  minTrustSignalCount: number;
}

// ============================================================================
// GAP DETECTION CONFIG
// ============================================================================

/**
 * Configuration for gap detection algorithm
 */
export interface GapDetectionConfig {
  // Weights for impact scoring
  severityWeights: {
    critical: number; // Default: 1.0
    high: number; // Default: 0.8
    medium: number; // Default: 0.5
    low: number; // Default: 0.3
  };

  // Prevalence thresholds
  prevalenceThresholds: {
    critical: number; // Default: 80+ (>80% of top apps have this)
    high: number; // Default: 60-80
    medium: number; // Default: 40-60
    low: number; // Default: <40
  };

  // Gap scoring formula weights
  scoringWeights: {
    prevalence: number; // Default: 0.4 (how common in vertical)
    severity: number; // Default: 0.4 (how important)
    categoryImportance: number; // Default: 0.2 (feature > benefit > trust)
  };

  // Recommendation generation
  maxRecommendations: number; // Default: 10
  prioritizeCriticalGaps: boolean; // Default: true
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Gap comparison result (for debugging/diagnostics)
 */
export interface GapComparisonDiagnostics {
  detectedCapabilities: string[];
  expectedCapabilities: string[];
  matchedCapabilities: string[];
  missingCapabilities: string[];
  extraCapabilities: string[]; // Detected but not expected (not necessarily bad)
  coverageMatrix: Record<string, boolean>; // capability -> detected?
}

/**
 * Gap analysis metadata (for debugging)
 */
export interface GapAnalysisMetadata {
  totalExpectedCapabilities: number;
  totalDetectedCapabilities: number;
  matchRate: number; // 0-1
  detectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  benchmarkQuality: 'high' | 'medium' | 'low';
  analysisVersion: string; // e.g., "3.0"
}
