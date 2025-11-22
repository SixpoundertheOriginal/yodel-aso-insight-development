/**
 * Subtitle Scoring Service
 *
 * Scores app subtitle based on incremental value vs title,
 * character usage, combinations, and semantic quality.
 */

import type { SubtitleScoreResult } from '../types';
import { getMetadataScoringConfig, getStopwords, getSemanticRules } from './configLoader';
import { tokenize, analyzeTokens, calculateCharacterUsage, findNewTokens } from '../utils/tokenizer';
import { analyzeCombinations, calculateComboCoverageScore, findIncrementalCombinations } from '../utils/ngram';
import { calculateSemanticScore, checkSubtitleRoles } from '../utils/semantic';

/**
 * Scores an app subtitle in relation to the title
 *
 * @param title - App title text (for comparison)
 * @param subtitle - App subtitle text
 * @returns SubtitleScoreResult with detailed breakdown
 */
export function scoreSubtitle(title: string, subtitle: string): SubtitleScoreResult {
  // Load configuration
  const config = getMetadataScoringConfig();
  const stopwords = getStopwords();
  const semanticRules = getSemanticRules();

  const subtitleConfig = config.subtitle;
  const comboConfig = config.combos;
  const penaltyConfig = config.penalties;

  // Tokenize both title and subtitle
  const titleTokens = tokenize(title);
  const subtitleTokens = tokenize(subtitle);

  // Analyze subtitle tokens
  const tokenAnalysis = analyzeTokens(subtitleTokens, stopwords);

  // Find new tokens (not in title)
  const newTokens = findNewTokens(titleTokens, tokenAnalysis.coreTokens);

  // Analyze combinations (now supports 4-word combos)
  const titleCombos = analyzeCombinations(
    titleTokens,
    stopwords,
    comboConfig.min_ngram,
    comboConfig.max_ngram
  );

  const subtitleCombos = analyzeCombinations(
    subtitleTokens,
    stopwords,
    comboConfig.min_ngram,
    comboConfig.max_ngram
  );

  // Find incremental combos that include subtitle tokens
  const combinedTokens = [...titleTokens, ...subtitleTokens];
  const newCombos = findIncrementalCombinations(
    titleTokens,
    subtitleTokens,
    titleCombos.meaningfulCombos,
    combinedTokens,
    stopwords,
    comboConfig.min_ngram,
    comboConfig.max_ngram
  );

  // Calculate component scores
  const characterUsageScore = calculateCharacterUsage(subtitle, subtitleConfig.max_chars);

  // New token score: how many unique keywords vs title
  const newTokenScore = newTokens.length > 0
    ? Math.min(100, newTokens.length * 25) // 1 new token = 25, 4+ new tokens = 100
    : 0;

  // New combo score: how many unique combinations vs title
  const newComboScore = newCombos.length > 0
    ? Math.min(100, newCombos.length * 30) // 1 new combo = 30, 4+ new combos = 100
    : 0;

  // Incremental value: weighted combination of new tokens and combos
  const incrementalValueScore = (newTokenScore * 0.4) + (newComboScore * 0.6);

  const comboCoverageScore = calculateComboCoverageScore(subtitleCombos.meaningfulCombos.length);

  // Add role-based scoring for subtitle
  const roleCheck = checkSubtitleRoles(subtitleTokens, semanticRules);
  const patternScore = calculateSemanticScore(subtitle, subtitleTokens, semanticRules);
  const semanticScore = patternScore + roleCheck.score;

  // Calculate penalty using new simplified structure
  const duplicationPenalty = tokenAnalysis.duplicates.length > 0 ? penaltyConfig.duplication_penalty : 0;

  // Calculate weighted score
  const weightedScore = (
    (characterUsageScore * subtitleConfig.character_usage_weight) +
    (incrementalValueScore * subtitleConfig.incremental_value_weight) +
    (comboCoverageScore * subtitleConfig.combination_coverage_weight) +
    (semanticScore * subtitleConfig.semantic_quality_weight)
  );

  // Apply penalties
  const finalScore = Math.max(0, Math.min(100, weightedScore - (duplicationPenalty * subtitleConfig.duplication_penalty_weight)));

  return {
    score: Math.round(finalScore),
    characterUsageScore: Math.round(characterUsageScore),
    incrementalValueScore: Math.round(incrementalValueScore),
    newTokenScore: Math.round(newTokenScore),
    newComboScore: Math.round(newComboScore),
    comboCoverageScore: Math.round(comboCoverageScore),
    semanticScore: Math.round(semanticScore),
    duplicationPenalty: Math.round(duplicationPenalty),
    breakdown: {
      newTokens,
      newCombos,
      fillerTokens: tokenAnalysis.fillerTokens,
      duplicates: tokenAnalysis.duplicates,
      characterCount: subtitle.length,
      maxCharacters: subtitleConfig.max_chars
    }
  };
}
