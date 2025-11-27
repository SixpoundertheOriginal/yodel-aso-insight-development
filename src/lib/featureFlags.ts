/**
 * ASO Audit v2.0 Feature Flags
 *
 * Controls progressive rollout of v2.0 features.
 * All flags default to FALSE for safe deployment.
 *
 * Usage:
 * ```typescript
 * import { featureFlags } from '@/lib/featureFlags';
 *
 * if (featureFlags.intentV2()) {
 *   // Use Intent V2 logic (7 types)
 * } else {
 *   // Use Intent V1 logic (4 types)
 * }
 * ```
 */

export const featureFlags = {
  /**
   * Intent V2: Expand from 4 to 7 intent types
   * - Adds: category, feature intents
   * - Adds: transactional safety detection (safe vs risky)
   * - Phase 1 of v2.0 Foundation
   */
  intentV2: (): boolean => {
    return import.meta.env.VITE_ENABLE_INTENT_V2 === 'true';
  },

  /**
   * Description Intelligence: Extract app capabilities from description
   * - Features: pattern-based feature detection
   * - Benefits: pattern-based benefit detection
   * - Trust: pattern-based trust signal detection
   * - Phase 2 of v2.0 Foundation
   */
  descriptionIntelligence: (): boolean => {
    return import.meta.env.VITE_ENABLE_DESCRIPTION_INTELLIGENCE === 'true';
  },

  /**
   * Gap Analysis: Compare description capabilities vs metadata
   * - Feature gaps: capabilities mentioned but not in metadata
   * - Benefit gaps: benefits mentioned but not in metadata
   * - Trust gaps: trust signals mentioned but not in metadata
   * - Phase 3 of v2.0 Foundation
   */
  gapAnalysis: (): boolean => {
    return import.meta.env.VITE_ENABLE_GAP_ANALYSIS === 'true';
  },

  /**
   * KPI V2: Add 8 new KPIs for v2.0
   * - safe_transactional_score
   * - risky_transactional_warning
   * - category_intent_coverage_score
   * - feature_intent_coverage_score
   * - feature_gap_score
   * - benefit_gap_score
   * - trust_gap_score
   * - capability_alignment_score
   * - Integrated across Phases 1-3
   */
  kpiV2: (): boolean => {
    return import.meta.env.VITE_ENABLE_KPI_V2 === 'true';
  },

  /**
   * Executive Recommendations: Structured 4-section format
   * - What's Wrong: Critical issues with severity + impact
   * - Opportunities: Gap-based opportunities with examples
   * - Direction: Strategic guidance with action items
   * - Next Tests: Test variant suggestions (placeholder in v2.0)
   * - Phase 4 of v2.0 Foundation
   */
  executiveRecommendations: (): boolean => {
    return import.meta.env.VITE_ENABLE_EXECUTIVE_RECOMMENDATIONS === 'true';
  },

  /**
   * Audit V2 UI: New UI panels for v2.0 features
   * - Capability Gap Panel
   * - Executive Recommendation Panel
   * - Enhanced Intent Coverage Panel (7 types)
   * - Phase 4 of v2.0 Foundation
   */
  auditV2UI: (): boolean => {
    return import.meta.env.VITE_ENABLE_AUDIT_V2_UI === 'true';
  },

  /**
   * Master flag: Enable all v2.0 features at once
   * Useful for testing full v2.0 experience
   */
  allV2Features: (): boolean => {
    return (
      featureFlags.intentV2() &&
      featureFlags.descriptionIntelligence() &&
      featureFlags.gapAnalysis() &&
      featureFlags.kpiV2() &&
      featureFlags.executiveRecommendations() &&
      featureFlags.auditV2UI()
    );
  }
} as const;

/**
 * Feature flag status for debugging
 */
export function getFeatureFlagStatus(): Record<string, boolean> {
  return {
    intentV2: featureFlags.intentV2(),
    descriptionIntelligence: featureFlags.descriptionIntelligence(),
    gapAnalysis: featureFlags.gapAnalysis(),
    kpiV2: featureFlags.kpiV2(),
    executiveRecommendations: featureFlags.executiveRecommendations(),
    auditV2UI: featureFlags.auditV2UI(),
    allV2Features: featureFlags.allV2Features()
  };
}
