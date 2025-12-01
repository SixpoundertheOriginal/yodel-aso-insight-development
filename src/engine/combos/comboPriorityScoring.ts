/**
 * Combo Priority Scoring Engine
 *
 * Calculates priority scores (0-100) for keyword combinations using real analytics data.
 *
 * Priority Formula:
 * - Strength Score (30%): Metadata position-based ranking power
 * - Popularity Score (25%): Search volume from KeywordPopularity API
 * - Opportunity Score (20%): Competition vs ranking balance
 * - Trend Score (15%): Ranking momentum (up/down/stable)
 * - Intent Score (10%): User intent relevance
 *
 * Total: 100%
 *
 * Data Sources:
 * - useBatchComboRankings: position, totalResults, trend, visibilityScore
 * - useKeywordPopularity: popularity_score, autocomplete_score, intent_score
 *
 * @see PRIORITIZATION_DECISIONS_DEFAULTS.md for methodology
 */

import type { GeneratedCombo, ComboStrength } from './comboGenerationEngine';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Ranking data from useBatchComboRankings hook
 */
export interface ComboRankingData {
  position: number | null;        // Where app ranks (1-100+)
  isRanking: boolean;
  totalResults: number | null;    // Total competing apps
  trend: 'up' | 'down' | 'stable' | 'new' | null;
  positionChange: number | null;
  visibilityScore: number | null;
  snapshotDate: string;
}

/**
 * Popularity data from useKeywordPopularity hook
 */
export interface KeywordPopularityData {
  popularity_score: number;       // 0-100 (search volume proxy)
  autocomplete_score: number;     // 0-1
  intent_score: number;           // 0-1
  length_prior: number;           // 0-1
  data_quality: 'complete' | 'partial' | 'stale';
}

/**
 * Complete priority scoring breakdown
 */
export interface ComboPriorityScore {
  // Component scores (0-100 each)
  strengthScore: number;
  popularityScore: number;
  opportunityScore: number;
  trendScore: number;
  intentScore: number;

  // Weighted total (0-100)
  totalScore: number;

  // Metadata
  dataQuality: 'complete' | 'partial' | 'missing';
  calculatedAt: string;
}

// ============================================================================
// STRENGTH SCORE MAPPING (30% weight)
// ============================================================================

/**
 * Maps ComboStrength enum to numerical score (0-100)
 * Based on App Store ranking algorithm hierarchy
 */
const STRENGTH_SCORE_MAP: Record<ComboStrength, number> = {
  // Tier 1: Title-only (100 points)
  title_consecutive: 100,           // 🔥🔥🔥

  // Tier 2: Title-based (85-70 points)
  title_non_consecutive: 85,        // 🔥🔥
  title_keywords_cross: 70,         // 🔥⚡

  // Tier 3: Cross-element title-subtitle (70 points)
  cross_element: 70,                // ⚡

  // Tier 4: Keywords/Subtitle same-field (50 points)
  keywords_consecutive: 50,         // 💤
  subtitle_consecutive: 50,         // 💤

  // Tier 5: Keywords/Subtitle cross (35 points)
  keywords_subtitle_cross: 35,      // 💤⚡

  // Tier 6: Non-consecutive in weak fields (30 points)
  keywords_non_consecutive: 30,     // 💤💤
  subtitle_non_consecutive: 30,     // 💤💤

  // Tier 7: Three-way cross (20 points)
  three_way_cross: 20,              // 💤💤💤

  // Missing (0 points)
  missing: 0,                       // ❌
};

/**
 * Calculate strength score from combo strength enum
 */
export function calculateStrengthScore(combo: GeneratedCombo): number {
  return STRENGTH_SCORE_MAP[combo.strength] || 0;
}

// ============================================================================
// POPULARITY SCORE (25% weight)
// ============================================================================

/**
 * Calculate average popularity score from combo keywords
 * Uses AVERAGE of individual keyword popularity scores
 *
 * Decision Q1: Average vs Minimum?
 * Answer: AVERAGE - More balanced, doesn't unfairly penalize combos with one strong keyword
 *
 * @param keywords - Array of keywords in the combo
 * @param popularityData - Map of keyword → popularity data
 * @returns 0-100 score (average of keyword popularity scores)
 */
export function calculatePopularityScore(
  keywords: string[],
  popularityData: Map<string, KeywordPopularityData>
): number {
  if (keywords.length === 0) return 0;

  const scores: number[] = [];

  for (const keyword of keywords) {
    const data = popularityData.get(keyword.toLowerCase());
    if (data) {
      scores.push(data.popularity_score); // Already 0-100
    }
  }

  if (scores.length === 0) return 0; // No data available

  // Average popularity
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return Math.round(avgScore);
}

// ============================================================================
// OPPORTUNITY SCORE (20% weight)
// ============================================================================

/**
 * Calculate opportunity score based on ranking position and competition
 *
 * Decision Q2: Blue Ocean vs Improvement?
 * Answer: BLUE OCEAN - Prioritize high volume + low competition + not ranking
 *
 * Decision Q4: Already ranking well?
 * Answer: DEPRIORITIZE - Focus on opportunities, not maintaining strength
 *
 * Formula:
 * - Not ranking at all → High opportunity (80 points)
 * - Ranking 15-50 → Moderate opportunity (60-40 points)
 * - Ranking 1-10 → Low opportunity (0-10 points)
 * - High competition → Reduces score
 *
 * @param rankingData - Ranking data from useBatchComboRankings
 * @returns 0-100 score
 */
export function calculateOpportunityScore(
  rankingData: ComboRankingData | undefined
): number {
  if (!rankingData) return 60; // Default moderate opportunity if no data

  const { position, isRanking, totalResults } = rankingData;

  // Not ranking = high opportunity (blue ocean)
  if (!isRanking || position === null || position === 0) {
    // Adjust for competition level
    if (totalResults && totalResults > 10000) return 70; // High competition
    if (totalResults && totalResults > 5000) return 75;  // Moderate competition
    return 80; // Low competition or unknown
  }

  // Already ranking - opportunity = f(position)
  // Sweet spot: ranking 15-50 (can improve significantly)
  // Low opportunity: ranking top 10 (already strong)
  if (position <= 5) return 5;    // Top 5: already excellent, low priority
  if (position <= 10) return 10;  // Top 10: already strong
  if (position <= 20) return 60;  // Ranks but can improve (sweet spot)
  if (position <= 50) return 50;  // Moderate ranking
  if (position <= 100) return 40; // Weak ranking

  return 30; // Ranks beyond top 100
}

// ============================================================================
// TREND SCORE (15% weight)
// ============================================================================

/**
 * Calculate trend score based on ranking momentum
 *
 * Decision Q3: Downward trends?
 * Answer: DEPRIORITIZE - Focus on upward/stable trends
 *
 * Formula:
 * - Up trend → 80-100 points (based on magnitude)
 * - Stable → 50 points (maintaining position)
 * - New → 60 points (just started ranking)
 * - Down trend → 20-40 points (losing ground)
 * - No data → 50 points (neutral)
 *
 * @param rankingData - Ranking data with trend info
 * @returns 0-100 score
 */
export function calculateTrendScore(
  rankingData: ComboRankingData | undefined
): number {
  if (!rankingData) return 50; // Neutral if no data

  const { trend, positionChange } = rankingData;

  switch (trend) {
    case 'up':
      // Upward momentum = high priority
      if (positionChange && Math.abs(positionChange) >= 10) return 100; // Big jump
      if (positionChange && Math.abs(positionChange) >= 5) return 90;  // Moderate jump
      return 80; // Small improvement

    case 'stable':
      // Maintaining position = moderate priority
      return 50;

    case 'new':
      // New ranking = moderate-high priority (momentum building)
      return 60;

    case 'down':
      // Downward trend = low priority (focus elsewhere)
      if (positionChange && Math.abs(positionChange) >= 10) return 20; // Big drop
      if (positionChange && Math.abs(positionChange) >= 5) return 30;  // Moderate drop
      return 40; // Small decline

    default:
      return 50; // Unknown trend
  }
}

// ============================================================================
// INTENT SCORE (10% weight)
// ============================================================================

/**
 * Calculate intent score from keyword intent signals
 * Uses average intent_score from keyword popularity data
 *
 * Formula:
 * - Average intent_score * 100
 * - Higher intent = users more likely to find relevant results
 *
 * @param keywords - Array of keywords in combo
 * @param popularityData - Map of keyword → popularity data
 * @returns 0-100 score
 */
export function calculateIntentScore(
  keywords: string[],
  popularityData: Map<string, KeywordPopularityData>
): number {
  if (keywords.length === 0) return 50; // Neutral default

  const intentScores: number[] = [];

  for (const keyword of keywords) {
    const data = popularityData.get(keyword.toLowerCase());
    if (data && data.intent_score !== undefined) {
      intentScores.push(data.intent_score * 100); // Convert 0-1 to 0-100
    }
  }

  if (intentScores.length === 0) return 50; // No data, neutral

  // Average intent
  const avgIntent = intentScores.reduce((sum, score) => sum + score, 0) / intentScores.length;
  return Math.round(avgIntent);
}

// ============================================================================
// MASTER PRIORITY CALCULATION
// ============================================================================

/**
 * Calculate complete priority score for a combo
 *
 * Weights (total 100%):
 * - Strength: 30%
 * - Popularity: 25%
 * - Opportunity: 20%
 * - Trend: 15%
 * - Intent: 10%
 *
 * @param combo - Generated combo with strength classification
 * @param rankingData - Ranking data from useBatchComboRankings (optional)
 * @param popularityData - Map of keyword popularity data (optional)
 * @returns Complete priority score breakdown
 */
export function calculateComboPriority(
  combo: GeneratedCombo,
  rankingData: ComboRankingData | undefined,
  popularityData: Map<string, KeywordPopularityData>
): ComboPriorityScore {
  // Calculate component scores (0-100 each)
  const strengthScore = calculateStrengthScore(combo);
  const popularityScore = calculatePopularityScore(combo.keywords, popularityData);
  const opportunityScore = calculateOpportunityScore(rankingData);
  const trendScore = calculateTrendScore(rankingData);
  const intentScore = calculateIntentScore(combo.keywords, popularityData);

  // Weighted sum (0-100)
  const totalScore = Math.round(
    (strengthScore * 0.30) +
    (popularityScore * 0.25) +
    (opportunityScore * 0.20) +
    (trendScore * 0.15) +
    (intentScore * 0.10)
  );

  // Determine data quality
  let dataQuality: 'complete' | 'partial' | 'missing' = 'complete';
  if (!rankingData && popularityData.size === 0) {
    dataQuality = 'missing';
  } else if (!rankingData || popularityData.size === 0) {
    dataQuality = 'partial';
  }

  return {
    strengthScore,
    popularityScore,
    opportunityScore,
    trendScore,
    intentScore,
    totalScore,
    dataQuality,
    calculatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// BATCH PRIORITY CALCULATION
// ============================================================================

/**
 * Calculate priority scores for multiple combos
 *
 * @param combos - Array of generated combos
 * @param rankingDataMap - Map of combo text → ranking data
 * @param popularityDataMap - Map of keyword → popularity data
 * @returns Map of combo text → priority score
 */
export function calculateBatchComboPriorities(
  combos: GeneratedCombo[],
  rankingDataMap: Map<string, ComboRankingData>,
  popularityDataMap: Map<string, KeywordPopularityData>
): Map<string, ComboPriorityScore> {
  const priorityScores = new Map<string, ComboPriorityScore>();

  for (const combo of combos) {
    const rankingData = rankingDataMap.get(combo.text);
    const priorityScore = calculateComboPriority(combo, rankingData, popularityDataMap);
    priorityScores.set(combo.text, priorityScore);
  }

  return priorityScores;
}

// ============================================================================
// TOP N SELECTION
// ============================================================================

/**
 * Select top N combos by priority score
 *
 * Decision Q5: Diversity rules vs pure score-based?
 * Answer: PURE SCORE-BASED - Objective and transparent
 *
 * @param combos - Array of generated combos
 * @param priorityScores - Map of combo text → priority score
 * @param limit - Max number of combos to return (default: 500)
 * @returns Sorted combos with priority scores, limit info
 */
export function selectTopCombos(
  combos: GeneratedCombo[],
  priorityScores: Map<string, ComboPriorityScore>,
  limit: number = 500
): {
  topCombos: Array<GeneratedCombo & { priorityScore: ComboPriorityScore }>;
  totalGenerated: number;
  limitReached: boolean;
} {
  // Attach priority scores to combos
  const combosWithPriority = combos.map(combo => ({
    ...combo,
    priorityScore: priorityScores.get(combo.text) || {
      strengthScore: 0,
      popularityScore: 0,
      opportunityScore: 0,
      trendScore: 0,
      intentScore: 0,
      totalScore: 0,
      dataQuality: 'missing' as const,
      calculatedAt: new Date().toISOString(),
    },
  }));

  // Sort by total priority score descending
  const sorted = combosWithPriority.sort((a, b) =>
    b.priorityScore.totalScore - a.priorityScore.totalScore
  );

  // Apply limit
  const topCombos = sorted.slice(0, limit);

  return {
    topCombos,
    totalGenerated: combos.length,
    limitReached: combos.length > limit,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format priority score for display
 *
 * @param score - ComboPriorityScore object
 * @returns Formatted string for tooltip
 */
export function formatPriorityScoreBreakdown(score: ComboPriorityScore): string {
  return `Priority Score: ${score.totalScore}/100

├─ Strength: ${score.strengthScore}/30 (${Math.round(score.strengthScore * 0.30)} pts)
├─ Popularity: ${score.popularityScore}/25 (${Math.round(score.popularityScore * 0.25)} pts)
├─ Opportunity: ${score.opportunityScore}/20 (${Math.round(score.opportunityScore * 0.20)} pts)
├─ Trend: ${score.trendScore}/15 (${Math.round(score.trendScore * 0.15)} pts)
└─ Intent: ${score.intentScore}/10 (${Math.round(score.intentScore * 0.10)} pts)

Data Quality: ${score.dataQuality}`;
}

/**
 * Get priority tier label
 *
 * @param totalScore - 0-100 priority score
 * @returns Tier label for filtering
 */
export function getPriorityTier(totalScore: number): 'high' | 'medium' | 'low' {
  if (totalScore >= 70) return 'high';
  if (totalScore >= 40) return 'medium';
  return 'low';
}
