/**
 * Executive Recommendations Types
 *
 * Phase 4: Structured recommendation format for v2.0
 * Integrates Intent V2 + Description Intelligence + Gap Analysis
 */

import type { GapSeverity } from '@/types/gapAnalysis';

// ============================================================================
// RECOMMENDATION SECTIONS
// ============================================================================

/**
 * Section 1: What's Wrong
 * Critical issues that need immediate attention
 */
export interface CriticalIssue {
  id: string;
  category: 'intent' | 'capability' | 'metadata' | 'quality';
  severity: GapSeverity;
  title: string;
  description: string;
  impact: string; // What happens if not fixed
  evidence?: string[]; // Supporting data
  priority: number; // 1-10 (10 = highest)
}

export interface WhatsWrongSection {
  criticalIssues: CriticalIssue[];
  totalIssues: number;
  highestSeverity: GapSeverity;
  estimatedImpact: 'high' | 'medium' | 'low';
  summary: string; // 1-2 sentence summary
}

/**
 * Section 2: Opportunities
 * Gap-based opportunities with actionable examples
 */
export interface Opportunity {
  id: string;
  category: 'feature' | 'benefit' | 'trust' | 'intent' | 'keyword';
  title: string;
  description: string;
  expectedBenefit: string; // What improvement to expect
  examples: string[]; // Example phrases/keywords to add
  difficulty: 'easy' | 'medium' | 'hard';
  impactScore: number; // 0-100
}

export interface OpportunitiesSection {
  opportunities: Opportunity[];
  totalOpportunities: number;
  quickWins: Opportunity[]; // Easy + high impact
  longTermWins: Opportunity[]; // Hard but very high impact
  summary: string;
}

/**
 * Section 3: Direction
 * Strategic guidance and action items
 */
export interface ActionItem {
  id: string;
  action: string;
  rationale: string;
  priority: 'immediate' | 'short-term' | 'long-term';
  estimatedEffort: 'low' | 'medium' | 'high';
  expectedOutcome: string;
}

export interface StrategicGuidance {
  verticalStrategy: string; // Vertical-specific advice
  intentStrategy: string; // Intent coverage strategy
  capabilityStrategy: string; // Capability gap strategy
  competitivePositioning: string; // How to stand out
}

export interface DirectionSection {
  strategicGuidance: StrategicGuidance;
  actionItems: ActionItem[];
  priorityOrder: string[]; // Recommended order of actions
  summary: string;
}

/**
 * Section 4: Next Tests
 * Test variant suggestions (placeholder for v2.0, full implementation in v3.0)
 */
export interface TestVariant {
  id: string;
  element: 'title' | 'subtitle' | 'description';
  currentVersion: string;
  suggestedVersion: string;
  hypothesis: string; // What we expect to happen
  testType: 'a_b_test' | 'multivariate' | 'sequential';
  confidence: 'high' | 'medium' | 'low';
}

export interface NextTestsSection {
  variants: TestVariant[];
  totalVariants: number;
  highConfidenceVariants: TestVariant[];
  summary: string;
  placeholder: boolean; // True for v2.0 (not fully implemented)
}

// ============================================================================
// COMPLETE RECOMMENDATION STRUCTURE
// ============================================================================

/**
 * Complete executive recommendations
 * Integrates all 4 sections into structured format
 */
export interface ExecutiveRecommendations {
  // 4 core sections
  whatsWrong: WhatsWrongSection;
  opportunities: OpportunitiesSection;
  direction: DirectionSection;
  nextTests: NextTestsSection;

  // Overall metadata
  overallPriority: 'critical' | 'high' | 'medium' | 'low';
  totalActionItems: number;
  estimatedTimeToImplement: string; // e.g., "2-3 weeks"
  confidenceScore: number; // 0-100 (how confident are we in these recommendations)

  // Data sources (what contributed to these recommendations)
  dataSources: {
    intentAnalysis: boolean;
    capabilityAnalysis: boolean;
    gapAnalysis: boolean;
    verticalBenchmark: boolean;
    kpiAnalysis: boolean;
  };

  // Generation metadata
  generatedAt: string;
  version: string; // e.g., "2.0"
}

// ============================================================================
// RECOMMENDATION GENERATION CONFIG
// ============================================================================

/**
 * Configuration for recommendation generation
 */
export interface RecommendationGenerationConfig {
  // What's Wrong section
  maxCriticalIssues: number; // Default: 5
  minSeverityForCritical: GapSeverity; // Default: 'high'

  // Opportunities section
  maxOpportunities: number; // Default: 10
  minImpactForQuickWin: number; // Default: 60 (out of 100)
  maxQuickWins: number; // Default: 3

  // Direction section
  maxActionItems: number; // Default: 8
  prioritizeVerticalStrategy: boolean; // Default: true

  // Next Tests section
  maxVariants: number; // Default: 3 (placeholder in v2.0)
  generateVariants: boolean; // Default: false (v2.0)

  // Overall settings
  focusOnQuickWins: boolean; // Default: true
  includeExamples: boolean; // Default: true
  verboseExplanations: boolean; // Default: false
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Recommendation priority matrix
 * Maps severity + impact to priority level
 */
export interface PriorityMatrix {
  critical_high: number; // Priority: 10
  critical_medium: number; // Priority: 9
  critical_low: number; // Priority: 8
  high_high: number; // Priority: 7
  high_medium: number; // Priority: 6
  high_low: number; // Priority: 5
  medium_high: number; // Priority: 4
  medium_medium: number; // Priority: 3
  medium_low: number; // Priority: 2
  low_any: number; // Priority: 1
}

/**
 * Recommendation quality metrics
 * Used for validation and debugging
 */
export interface RecommendationQuality {
  dataCompleteness: number; // 0-100 (% of data sources available)
  specificityScore: number; // 0-100 (how specific are recommendations)
  actionabilityScore: number; // 0-100 (how actionable)
  overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
  warnings: string[]; // Quality warnings
}
