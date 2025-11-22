/**
 * Title Scoring Service
 *
 * Scores app title based on character usage, keyword density, combinations, and semantic quality.
 */

import type { TitleScoreResult } from '../types';
import { getMetadataScoringConfig, getStopwords, getSemanticRules } from './configLoader';
import { tokenize, analyzeTokens, calculateCharacterUsage } from '../utils/tokenizer';
import { analyzeCombinations, calculateComboCoverageScore } from '../utils/ngram';
import { calculateSemanticScore, checkTitleRoles } from '../utils/semantic';

/**
 * Scores an app title
 *
 * @param title - App title text
 * @returns TitleScoreResult with detailed breakdown
 */
export function scoreTitle(title: string): TitleScoreResult {
  // Load configuration
  const config = getMetadataScoringConfig();
  const stopwords = getStopwords();
  const semanticRules = getSemanticRules();

  const titleConfig = config.title;
  const comboConfig = config.combos;
  const penaltyConfig = config.penalties;

  // Tokenize
  const tokens = tokenize(title);
  const tokenAnalysis = analyzeTokens(tokens, stopwords);

  // Analyze combinations (now supports 4-word combos)
  const comboAnalysis = analyzeCombinations(
    tokens,
    stopwords,
    comboConfig.min_ngram,
    comboConfig.max_ngram
  );

  // Calculate component scores
  const characterUsageScore = calculateCharacterUsage(title, titleConfig.max_chars);

  const uniqueKeywordScore = tokenAnalysis.coreTokens.length > 0
    ? Math.min(100, tokenAnalysis.coreTokens.length * 20) // 1 token = 20, 5+ tokens = 100
    : 0;

  const comboCoverageScore = calculateComboCoverageScore(comboAnalysis.meaningfulCombos.length);

  // Add role-based scoring
  const roleCheck = checkTitleRoles(tokens, semanticRules);
  const patternScore = calculateSemanticScore(title, tokens, semanticRules);
  const semanticScore = patternScore + roleCheck.score;

  // Calculate penalty using new simplified structure
  const duplicationPenalty = tokenAnalysis.duplicates.length > 0 ? penaltyConfig.duplication_penalty : 0;

  // Calculate weighted score
  const weightedScore = (
    (characterUsageScore * titleConfig.character_usage_weight) +
    (uniqueKeywordScore * titleConfig.unique_keyword_weight) +
    (comboCoverageScore * titleConfig.combination_coverage_weight) +
    (semanticScore * titleConfig.semantic_quality_weight)
  );

  // Apply penalties
  const finalScore = Math.max(0, Math.min(100, weightedScore - (duplicationPenalty * titleConfig.duplication_penalty_weight)));

  return {
    score: Math.round(finalScore),
    characterUsageScore: Math.round(characterUsageScore),
    uniqueKeywordScore: Math.round(uniqueKeywordScore),
    comboCoverageScore: Math.round(comboCoverageScore),
    semanticScore: Math.round(semanticScore),
    duplicationPenalty: Math.round(duplicationPenalty),
    breakdown: {
      fillerTokens: tokenAnalysis.fillerTokens,
      duplicates: tokenAnalysis.duplicates,
      combos: comboAnalysis.meaningfulCombos,
      characterCount: title.length,
      maxCharacters: titleConfig.max_chars
    }
  };
}
