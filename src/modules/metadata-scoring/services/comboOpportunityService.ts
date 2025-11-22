/**
 * Combo Opportunity Service
 *
 * Identifies strategic opportunities for metadata optimization.
 * Provides actionable insights for improving combination coverage.
 */

import { normalizeComboTokens, getCanonicalComboString } from '../utils/comboNormalizer';
import { calculateComboImpact } from '../utils/comboImpact';
import type { OpportunityInsights } from '../types';

/**
 * Identifies missing semantic clusters and potential new combinations
 *
 * Analysis includes:
 * - Missing category + benefit combos
 * - Missing action + category combos
 * - Missing time-based urgency
 * - Potential new high-impact combos from available tokens
 *
 * @param titleTokens - Tokens from title
 * @param subtitleTokens - Tokens from subtitle
 * @param existingCombos - Current combinations
 * @param categoryKeywords - List of category keywords
 * @param benefitKeywords - List of benefit keywords
 * @param ctaVerbs - List of CTA verbs
 * @param timeKeywords - List of time keywords
 * @returns OpportunityInsights with recommendations
 */
export function identifyOpportunities(
  titleTokens: string[],
  subtitleTokens: string[],
  existingCombos: string[],
  categoryKeywords: string[],
  benefitKeywords: string[],
  ctaVerbs: string[],
  timeKeywords: string[]
): OpportunityInsights {
  const missingClusters: string[] = [];
  const potentialCombos: string[] = [];
  const actionableInsights: string[] = [];

  // Normalize existing combos for comparison
  const existingCanonical = new Set(
    existingCombos.map(c => getCanonicalComboString(c))
  );

  // Available tokens (combined title + subtitle)
  const allTokens = [...titleTokens, ...subtitleTokens];
  const tokenSet = new Set(allTokens.map(t => t.toLowerCase()));

  // Check for category presence
  const hasCategory = categoryKeywords.some(k => tokenSet.has(k.toLowerCase()));

  // Check for benefit presence
  const hasBenefit = benefitKeywords.some(k => tokenSet.has(k.toLowerCase()));

  // Check for verb presence
  const hasVerb = ctaVerbs.some(v => tokenSet.has(v.toLowerCase()));

  // Check for time hint presence
  const hasTimeHint = timeKeywords.some(k => tokenSet.has(k.toLowerCase()));

  // Identify missing clusters

  // Missing: Category + Benefit
  if (hasCategory && hasBenefit) {
    // Check if any existing combo combines both
    const hasCategoryBenefitCombo = existingCombos.some(combo => {
      const tokens = normalizeComboTokens(combo);
      const hasC = categoryKeywords.some(k => tokens.includes(k.toLowerCase()));
      const hasB = benefitKeywords.some(k => tokens.includes(k.toLowerCase()));
      return hasC && hasB;
    });

    if (!hasCategoryBenefitCombo) {
      missingClusters.push('Category + Benefit combination');
      actionableInsights.push(
        'Combine a category keyword with a benefit keyword (e.g., "language learning practice")'
      );
    }
  }

  // Missing: Action + Category
  if (hasVerb && hasCategory) {
    const hasActionCategoryCombo = existingCombos.some(combo => {
      const tokens = normalizeComboTokens(combo);
      const hasV = ctaVerbs.some(v => tokens.includes(v.toLowerCase()));
      const hasC = categoryKeywords.some(k => tokens.includes(k.toLowerCase()));
      return hasV && hasC;
    });

    if (!hasActionCategoryCombo) {
      missingClusters.push('Action + Category combination');
      actionableInsights.push(
        'Combine an action verb with a category keyword (e.g., "learn language")'
      );
    }
  }

  // Missing: Time-based urgency
  if (!hasTimeHint) {
    missingClusters.push('Time-based urgency');
    actionableInsights.push(
      'Add time-based keywords to create urgency (e.g., "learn fast", "30 days", "daily practice")'
    );
  } else {
    // Has time hints, but check if they're combined with benefits
    const hasTimeBenefitCombo = existingCombos.some(combo => {
      const tokens = normalizeComboTokens(combo);
      const hasT = timeKeywords.some(k => tokens.includes(k.toLowerCase()));
      const hasB = benefitKeywords.some(k => tokens.includes(k.toLowerCase()));
      return hasT && hasB;
    });

    if (!hasTimeBenefitCombo) {
      missingClusters.push('Time + Benefit combination');
      actionableInsights.push(
        'Combine time hints with benefits (e.g., "learn fast", "improve daily")'
      );
    }
  }

  // Generate potential new combos (simple 2-word examples)
  // This is a deterministic suggestion generator, not exhaustive

  // Suggest category + benefit combos
  if (hasCategory && hasBenefit && missingClusters.includes('Category + Benefit combination')) {
    const category = categoryKeywords.find(k => tokenSet.has(k.toLowerCase()));
    const benefit = benefitKeywords.find(k => tokenSet.has(k.toLowerCase()));

    if (category && benefit) {
      const potential = `${benefit} ${category}`;
      if (!existingCanonical.has(getCanonicalComboString(potential))) {
        potentialCombos.push(potential);
      }
    }
  }

  // Suggest action + category combos
  if (hasVerb && hasCategory && missingClusters.includes('Action + Category combination')) {
    const verb = ctaVerbs.find(v => tokenSet.has(v.toLowerCase()));
    const category = categoryKeywords.find(k => tokenSet.has(k.toLowerCase()));

    if (verb && category) {
      const potential = `${verb} ${category}`;
      if (!existingCanonical.has(getCanonicalComboString(potential))) {
        potentialCombos.push(potential);
      }
    }
  }

  // Estimate potential gain
  // Simple heuristic: 5 points per missing cluster, capped at 20
  const estimatedGain = Math.min(20, missingClusters.length * 5);

  // If no missing clusters, provide general guidance
  if (missingClusters.length === 0) {
    actionableInsights.push(
      'Your metadata covers major semantic clusters. Consider adding long-tail combinations (4-word) for niche targeting.'
    );
  }

  return {
    missingClusters,
    potentialCombos,
    estimatedGain,
    actionableInsights
  };
}
