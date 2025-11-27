/**
 * ASO Audit v2.0 Type Definitions
 *
 * New types for v2.0 Foundation features:
 * - Intent V2 (7 types + transactional safety)
 * - Description Intelligence (capability extraction)
 * - Gap Analysis (metadata vs description alignment)
 * - Executive Recommendations (structured 4-section format)
 */

import type { UnifiedMetadataAuditResult } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';

// ============================================================================
// INTENT V2 TYPES (Phase 1)
// ============================================================================

/**
 * Expanded intent types for v2.0
 * - Existing: informational, commercial, transactional, navigational
 * - New: category, feature
 * - Renamed: navigational → brand (Phase 1.5 migration)
 */
export type IntentTypeV2 =
  | 'informational'   // "learn", "how to", "what is"
  | 'commercial'      // "best", "top", "compare"
  | 'transactional'   // "try", "start", "get", "free", "download"
  | 'navigational'    // LEGACY: "brand name" (will be renamed to 'brand' in Phase 1.5)
  | 'brand'           // NEW: "brand name" (preferred term)
  | 'category'        // NEW: "language learning app", "finance app"
  | 'feature';        // NEW: "offline mode", "voice recognition"

/**
 * Transactional safety classification
 * - safe: "try", "start", "get", "use", "begin"
 * - risky: "free", "download", "install", "now", "today"
 */
export type TransactionalSafety = 'safe' | 'risky' | null;

/**
 * Extended combo intent classification with v2.0 fields
 */
export interface ComboIntentClassificationV2 {
  combo: string;
  dominantIntent: IntentTypeV2 | 'mixed' | 'unknown';
  intentScores: {
    informational: number;
    commercial: number;
    transactional: number;
    navigational: number;
    brand?: number;           // NEW (Phase 1)
    category?: number;         // NEW (Phase 1)
    feature?: number;          // NEW (Phase 1)
  };
  transactionalSafety?: TransactionalSafety;  // NEW (Phase 1)
  riskFlags?: string[];                       // NEW (Phase 1) - list of detected risky keywords
  matchedPatterns: string[];
}

// ============================================================================
// DESCRIPTION INTELLIGENCE TYPES (Phase 2)
// ============================================================================

/**
 * Detected capability from description
 */
export interface DetectedCapability {
  text: string;          // Matched text (e.g., "offline mode", "save time")
  category: string;      // Category (e.g., "functionality", "efficiency")
  pattern?: string;      // Pattern that matched (for debugging)
  confidence?: number;   // Optional confidence score (0-1)
}

/**
 * App capability map extracted from description
 * Contains features, benefits, and trust signals mentioned in description
 */
export interface AppCapabilityMap {
  features: {
    detected: DetectedCapability[];
    count: number;
    categories: string[];  // Unique categories (e.g., ["functionality", "performance"])
  };
  benefits: {
    detected: DetectedCapability[];
    count: number;
    categories: string[];  // Unique categories (e.g., ["efficiency", "usability"])
  };
  trust: {
    detected: DetectedCapability[];
    count: number;
    categories: string[];  // Unique categories (e.g., ["security", "certification"])
  };
}

// ============================================================================
// GAP ANALYSIS TYPES (Phase 3)
// ============================================================================

/**
 * Single capability gap (feature/benefit/trust missing from metadata)
 */
export interface CapabilityGap {
  capability: string;           // Detected capability text
  category: string;             // Category of capability
  present_in_title: boolean;
  present_in_subtitle: boolean;
  present_in_keywords: boolean; // Will be false until keyword field available
  gap_severity: 'critical' | 'high' | 'moderate';
}

/**
 * Gap analysis summary statistics
 */
export interface GapSummary {
  total_feature_gaps: number;
  total_benefit_gaps: number;
  total_trust_gaps: number;
  critical_gaps: number;
  top_3_missed_opportunities: string[];  // Top 3 gaps by severity
}

/**
 * Complete gap analysis result
 */
export interface GapAnalysisResult {
  feature_gaps: CapabilityGap[];
  benefit_gaps: CapabilityGap[];
  trust_gaps: CapabilityGap[];
  summary: GapSummary;
}

// ============================================================================
// EXECUTIVE RECOMMENDATIONS TYPES (Phase 4)
// ============================================================================

/**
 * Critical issue identified in metadata
 */
export interface ExecutiveIssue {
  issue: string;              // "High brand dependency detected"
  severity: 'critical' | 'high' | 'moderate';
  impact: string;             // "Limits discoverability by 60-70%"
  metric_context: string;     // "Brand tokens: 67% (expected: 15-25%)"
}

/**
 * Opportunity for improvement
 */
export interface ExecutiveOpportunity {
  opportunity: string;        // "Add feature keyword: 'offline mode'"
  potential: string;          // "Could increase impressions 10-20%"
  priority: number;           // 1-10 (higher = more important)
  examples: string[];         // ["Title: '... offline mode ...'"]
}

/**
 * Strategic direction recommendation
 */
export interface ExecutiveDirection {
  strategy: string;           // "Shift from branded to category + benefit keywords"
  rationale: string;          // "Current metadata over-relies on brand recognition..."
  action_items: string[];     // ["Replace brand-heavy phrases...", "Add category keywords..."]
}

/**
 * Test variant suggestion (placeholder in v2.0, full implementation in v2.3)
 */
export interface ExecutiveTest {
  test_name: string;          // "Generic Intent Test"
  hypothesis: string;         // "Adding generic category keywords..."
  test_variant: string;       // "Subtitle: 'Language Learning App | Speak Fluently'"
  expected_improvement: string; // "+40-60% impressions"
  priority: number;           // 1-5 (1 = highest)
}

/**
 * Executive recommendation structure (4 sections)
 */
export interface ExecutiveRecommendation {
  whats_wrong: {
    issues: ExecutiveIssue[];
  };
  opportunities: {
    opportunities: ExecutiveOpportunity[];
  };
  direction: ExecutiveDirection;
  next_tests?: {
    tests: ExecutiveTest[];   // Optional in v2.0 (placeholder only)
  };
}

// ============================================================================
// EXTENDED AUDIT RESULT TYPE (Backward Compatible)
// ============================================================================

/**
 * Extended audit result with v2.0 fields
 * All new fields are OPTIONAL for backward compatibility
 */
export interface UnifiedMetadataAuditResultV2 extends UnifiedMetadataAuditResult {
  // Phase 2: Description Intelligence
  capabilityMap?: AppCapabilityMap;

  // Phase 3: Gap Analysis
  gapAnalysis?: GapAnalysisResult;

  // Phase 4: Executive Recommendations
  executiveRecommendation?: ExecutiveRecommendation;

  // Extended intent coverage (Phase 1)
  intentCoverageV2?: {
    title: {
      informational: number;
      commercial: number;
      transactional: number;
      navigational: number;
      brand?: number;          // NEW
      category?: number;        // NEW
      feature?: number;         // NEW
      transactionalSafe?: number;   // NEW
      transactionalRisky?: number;  // NEW
    };
    subtitle: {
      informational: number;
      commercial: number;
      transactional: number;
      navigational: number;
      brand?: number;          // NEW
      category?: number;        // NEW
      feature?: number;         // NEW
      transactionalSafe?: number;   // NEW
      transactionalRisky?: number;  // NEW
    };
  };
}

// ============================================================================
// KPI V2 TYPES (New KPIs for v2.0)
// ============================================================================

/**
 * New KPI IDs added in v2.0
 */
export type KpiIdV2 =
  // Phase 1: Intent V2
  | 'safe_transactional_score'
  | 'risky_transactional_warning'
  | 'category_intent_coverage_score'
  | 'feature_intent_coverage_score'
  // Phase 3: Gap Analysis
  | 'feature_gap_score'
  | 'benefit_gap_score'
  | 'trust_gap_score'
  | 'capability_alignment_score';

/**
 * Extended KPI vector with v2.0 KPIs
 */
export interface KpiVectorV2 extends Record<string, number> {
  // Existing KPIs (46 total)
  overall_score: number;
  // ... all existing KPI IDs

  // New v2.0 KPIs (8 total)
  safe_transactional_score?: number;
  risky_transactional_warning?: number;
  category_intent_coverage_score?: number;
  feature_intent_coverage_score?: number;
  feature_gap_score?: number;
  benefit_gap_score?: number;
  trust_gap_score?: number;
  capability_alignment_score?: number;
}

// ============================================================================
// DATA ASSET TYPES (Phase 0 - Minimal Data Collection)
// ============================================================================

/**
 * Capability pattern for description intelligence
 */
export interface CapabilityPattern {
  pattern: RegExp | string;
  category: string;
  criticality?: 'critical' | 'high' | 'moderate';
  isRegex?: boolean;
}

/**
 * Vertical-specific trust signals
 */
export interface VerticalTrustSignals {
  verticalId: string;
  critical: string[];    // Must-have trust signals
  high?: string[];       // Highly recommended
  moderate?: string[];   // Nice to have
}

/**
 * Transactional keyword safety classification
 */
export interface TransactionalKeywordSet {
  safe: string[];    // "try", "start", "get", "use"
  risky: string[];   // "free", "download", "install", "now"
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Feature flag configuration
 */
export interface FeatureFlagConfig {
  intentV2: boolean;
  descriptionIntelligence: boolean;
  gapAnalysis: boolean;
  kpiV2: boolean;
  executiveRecommendations: boolean;
  auditV2UI: boolean;
}

/**
 * Phase 0 validation result
 */
export interface Phase0ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  dataAssets: {
    capabilityPatterns: {
      features: number;
      benefits: number;
      trust: number;
    };
    transactionalKeywords: {
      safe: number;
      risky: number;
    };
    verticalTrustSignals: {
      verticals: number;
      totalSignals: number;
    };
  };
}
