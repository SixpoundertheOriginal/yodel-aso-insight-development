/**
 * Leak Detection System
 *
 * Detects vertical contamination in merged rule sets:
 * - Language-learning patterns in reward apps
 * - Finance patterns in dating apps
 * - Etc.
 *
 * Phase 8: Basic detection (warnings only, no blocking)
 */

import type { MergedRuleSet, LeakWarning, AsoBibleRuleSet } from './ruleset.types';
import { languageLearningRuleSet } from './verticalProfiles/language_learning/ruleset';
import { rewardsRuleSet } from './verticalProfiles/rewards/ruleset';
import { financeRuleSet } from './verticalProfiles/finance/ruleset';
import { datingRuleSet } from './verticalProfiles/dating/ruleset';
import { productivityRuleSet } from './verticalProfiles/productivity/ruleset';
import { healthRuleSet } from './verticalProfiles/health/ruleset';
import { entertainmentRuleSet } from './verticalProfiles/entertainment/ruleset';

// ============================================================================
// Metadata Interface (Simplified)
// ============================================================================

interface AppMetadata {
  category?: string;
  title?: string;
  subtitle?: string;
}

interface VerticalSignature {
  id: string;
  tokens: Set<string>;
  intents: Set<string>;
}

const VERTICAL_RULESET_REGISTRY: Record<string, AsoBibleRuleSet> = {
  language_learning: languageLearningRuleSet,
  rewards: rewardsRuleSet,
  finance: financeRuleSet,
  dating: datingRuleSet,
  productivity: productivityRuleSet,
  health: healthRuleSet,
  entertainment: entertainmentRuleSet,
};

const VERTICAL_SIGNATURES: VerticalSignature[] = Object.entries(VERTICAL_RULESET_REGISTRY).map(
  ([id, ruleSet]) => ({
    id,
    tokens: new Set(Object.keys(ruleSet.tokenRelevanceOverrides || {})),
    intents: new Set(Object.keys(ruleSet.intentOverrides || {})),
  })
);

function countOverlap<T>(source: Set<T>, target: Set<T>): number {
  let overlap = 0;
  target.forEach((value) => {
    if (source.has(value)) {
      overlap += 1;
    }
  });
  return overlap;
}

// ============================================================================
// Main Leak Detection
// ============================================================================

/**
 * Detect vertical leakage in merged rule set
 *
 * @param ruleSet - Merged rule set
 * @param appMetadata - App metadata
 * @returns Array of leak warnings
 */
export function detectVerticalLeak(
  ruleSet: MergedRuleSet,
  appMetadata: AppMetadata
): LeakWarning[] {
  const warnings: LeakWarning[] = [];

  // Check 1: Language-learning pattern leak
  const languageLearningLeaks = detectLanguageLearningLeak(ruleSet, appMetadata);
  warnings.push(...languageLearningLeaks);

  // Check 2: Reward pattern leak
  const rewardLeaks = detectRewardLeak(ruleSet, appMetadata);
  warnings.push(...rewardLeaks);

  // Check 3: Finance pattern leak
  const financeLeaks = detectFinanceLeak(ruleSet, appMetadata);
  warnings.push(...financeLeaks);

  // Check 4: Recommendation template leak
  const recommendationLeaks = detectRecommendationLeak(ruleSet, appMetadata);
  warnings.push(...recommendationLeaks);

  // Check 5: Cross-vertical signature overlap
  const crossVerticalLeaks = detectCrossVerticalLeak(ruleSet);
  warnings.push(...crossVerticalLeaks);

  return warnings;
}

// ============================================================================
// Language Learning Leak Detection
// ============================================================================

function detectLanguageLearningLeak(
  ruleSet: MergedRuleSet,
  appMetadata: AppMetadata
): LeakWarning[] {
  const warnings: LeakWarning[] = [];

  // Skip if app is in Education category (expected)
  if (appMetadata.category === 'Education') {
    return warnings;
  }

  // Check for language-learning intent patterns
  if (ruleSet.intentOverrides) {
    const hasLearningIntent = Object.keys(ruleSet.intentOverrides).some((key) =>
      key.includes('learning')
    );

    if (hasLearningIntent) {
      warnings.push({
        type: 'pattern_leak',
        severity: 'medium',
        message: 'Language-learning intent patterns detected in non-Education app',
        details: {
          category: appMetadata.category,
          vertical: ruleSet.verticalId,
        },
      });
    }
  }

  // Check for language-learning keywords in token relevance
  if (ruleSet.tokenRelevanceOverrides) {
    const learningKeywords = ['learn', 'study', 'lesson', 'course', 'fluency'];
    const hasLearningTokens = learningKeywords.some(
      (keyword) => ruleSet.tokenRelevanceOverrides?.[keyword] === 3
    );

    if (hasLearningTokens && appMetadata.category !== 'Education') {
      warnings.push({
        type: 'pattern_leak',
        severity: 'low',
        message: 'Language-learning token patterns detected in non-Education app',
        details: {
          category: appMetadata.category,
        },
      });
    }
  }

  return warnings;
}

// ============================================================================
// Reward Leak Detection
// ============================================================================

function detectRewardLeak(
  ruleSet: MergedRuleSet,
  appMetadata: AppMetadata
): LeakWarning[] {
  const warnings: LeakWarning[] = [];

  // Skip if app is in Entertainment/Lifestyle category (expected)
  if (appMetadata.category === 'Entertainment' || appMetadata.category === 'Lifestyle') {
    return warnings;
  }

  // Check for reward intent patterns
  if (ruleSet.intentOverrides) {
    const hasRewardIntent = Object.keys(ruleSet.intentOverrides).some((key) =>
      key.includes('earning') || key.includes('redemption')
    );

    if (hasRewardIntent) {
      warnings.push({
        type: 'pattern_leak',
        severity: 'medium',
        message: 'Reward intent patterns detected in non-reward app',
        details: {
          category: appMetadata.category,
          vertical: ruleSet.verticalId,
        },
      });
    }
  }

  return warnings;
}

// ============================================================================
// Finance Leak Detection
// ============================================================================

function detectFinanceLeak(
  ruleSet: MergedRuleSet,
  appMetadata: AppMetadata
): LeakWarning[] {
  const warnings: LeakWarning[] = [];

  // Skip if app is in Finance category (expected)
  if (appMetadata.category === 'Finance' || appMetadata.category === 'Business') {
    return warnings;
  }

  // Check for finance intent patterns
  if (ruleSet.intentOverrides) {
    const hasFinanceIntent = Object.keys(ruleSet.intentOverrides).some((key) =>
      key.includes('investing') || key.includes('trading')
    );

    if (hasFinanceIntent) {
      warnings.push({
        type: 'pattern_leak',
        severity: 'medium',
        message: 'Finance intent patterns detected in non-finance app',
        details: {
          category: appMetadata.category,
          vertical: ruleSet.verticalId,
        },
      });
    }
  }

  return warnings;
}

// ============================================================================
// Recommendation Leak Detection
// ============================================================================

function detectRecommendationLeak(
  ruleSet: MergedRuleSet,
  appMetadata: AppMetadata
): LeakWarning[] {
  const warnings: LeakWarning[] = [];

  if (!ruleSet.recommendationOverrides) {
    return warnings;
  }

  // Check for hard-coded language-learning examples
  const learningExamples = ['learn spanish', 'language lessons', 'fluency'];

  for (const [id, rec] of Object.entries(ruleSet.recommendationOverrides)) {
    if (!rec.messageTemplate) continue;

    const template = rec.messageTemplate.toLowerCase();

    const hasLearningExample = learningExamples.some((example) =>
      template.includes(example)
    );

    if (hasLearningExample && appMetadata.category !== 'Education') {
      warnings.push({
        type: 'recommendation_leak',
        severity: 'high',
        message: 'Hard-coded language-learning examples in non-Education app recommendations',
        details: {
          recommendationId: id,
          category: appMetadata.category,
          template,
        },
      });
    }
  }

  return warnings;
}

function detectCrossVerticalLeak(ruleSet: MergedRuleSet): LeakWarning[] {
  const warnings: LeakWarning[] = [];

  const tokens = new Set(Object.keys(ruleSet.tokenRelevanceOverrides || {}));
  const intents = new Set(Object.keys(ruleSet.intentOverrides || {}));

  if (tokens.size === 0 && intents.size === 0) {
    return warnings;
  }

  for (const signature of VERTICAL_SIGNATURES) {
    if (signature.id === ruleSet.verticalId) continue;

    const tokenOverlap = countOverlap(tokens, signature.tokens);
    const intentOverlap = countOverlap(intents, signature.intents);

    if (tokenOverlap >= 5 || intentOverlap >= 3) {
      warnings.push({
        type: 'pattern_leak',
        severity: tokenOverlap >= 8 || intentOverlap >= 5 ? 'high' : 'medium',
        message: `Detected ${signature.id} patterns in ${ruleSet.verticalId || 'base'} rule set`,
        details: {
          targetVertical: ruleSet.verticalId,
          conflictingVertical: signature.id,
          tokenOverlap,
          intentOverlap,
        },
      });
    }
  }

  return warnings;
}

// ============================================================================
// Vertical Mismatch Detection
// ============================================================================

/**
 * Detect if rule set vertical mismatches app category
 *
 * @param ruleSet - Merged rule set
 * @param appMetadata - App metadata
 * @returns Leak warning if mismatch detected
 */
export function detectVerticalMismatch(
  ruleSet: MergedRuleSet,
  appMetadata: AppMetadata
): LeakWarning | null {
  if (!ruleSet.verticalId || !appMetadata.category) {
    return null;
  }

  // Simple mismatch check (future: use vertical profile categories)
  const expectedVerticals: Record<string, string[]> = {
    Education: ['language_learning', 'base'],
    Finance: ['finance', 'base'],
    Business: ['finance', 'productivity', 'base'],
    Entertainment: ['entertainment', 'rewards', 'base'],
    Lifestyle: ['rewards', 'health', 'dating', 'base'],
    'Health & Fitness': ['health', 'base'],
    Productivity: ['productivity', 'base'],
    'Social Networking': ['dating', 'base'],
  };

  const expected = expectedVerticals[appMetadata.category] || ['base'];

  if (!expected.includes(ruleSet.verticalId)) {
    return {
      type: 'vertical_mismatch',
      severity: 'medium',
      message: `Rule set vertical '${ruleSet.verticalId}' may not match app category '${appMetadata.category}'`,
      details: {
        verticalId: ruleSet.verticalId,
        category: appMetadata.category,
        expectedVerticals: expected,
      },
    };
  }

  return null;
}

// ============================================================================
// Apply Leak Detection (Mutates RuleSet)
// ============================================================================

/**
 * Apply leak detection to merged rule set
 * Adds warnings to ruleSet.leakWarnings array
 *
 * @param ruleSet - Merged rule set (mutated)
 * @param appMetadata - App metadata
 */
export function applyLeakDetection(
  ruleSet: MergedRuleSet,
  appMetadata: AppMetadata
): void {
  const warnings: LeakWarning[] = [];

  // Detect vertical leaks
  const leaks = detectVerticalLeak(ruleSet, appMetadata);
  warnings.push(...leaks);

  // Detect vertical mismatch
  const mismatch = detectVerticalMismatch(ruleSet, appMetadata);
  if (mismatch) {
    warnings.push(mismatch);
  }

  // Attach warnings to rule set
  ruleSet.leakWarnings = warnings;

  // Log warnings (development only)
  if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn('[Leak Detection] Warnings detected:', warnings);
  }
}

// ============================================================================
// Export Summary
// ============================================================================

/**
 * Get leak detection summary for monitoring
 *
 * @param ruleSet - Merged rule set
 * @returns Summary object
 */
export function getLeakDetectionSummary(ruleSet: MergedRuleSet): Record<string, any> {
  const warnings = ruleSet.leakWarnings || [];

  return {
    totalWarnings: warnings.length,
    bySeverity: {
      high: warnings.filter((w) => w.severity === 'high').length,
      medium: warnings.filter((w) => w.severity === 'medium').length,
      low: warnings.filter((w) => w.severity === 'low').length,
    },
    byType: {
      vertical_mismatch: warnings.filter((w) => w.type === 'vertical_mismatch').length,
      pattern_leak: warnings.filter((w) => w.type === 'pattern_leak').length,
      recommendation_leak: warnings.filter((w) => w.type === 'recommendation_leak').length,
      kpi_anomaly: warnings.filter((w) => w.type === 'kpi_anomaly').length,
    },
  };
}
