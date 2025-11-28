/**
 * Types for Unified Metadata Audit V2.1
 *
 * Extends V2.0 types with advanced ranking analysis, subtitle value metrics,
 * and enhanced combo workbench features.
 *
 * **Backward Compatibility:**
 * - All V2.1 fields are OPTIONAL (marked with ?)
 * - V2.0 consumers can safely ignore V2.1 fields
 * - No breaking changes to existing data structures
 */

import type { ClassifiedCombo, UnifiedMetadataAuditResult } from './types';

// ==================== RANKING ELEMENTS PANEL ====================

/**
 * Ranking token: a single keyword eligible for App Store ranking
 *
 * Extracted from title and subtitle only (description does NOT rank).
 */
export interface RankingToken {
  text: string;
  source: 'title' | 'subtitle';
  position: number; // 0-based position in source element
  isStopword: boolean; // Is this a stopword/ignored token?
  isDuplicate: boolean; // Appears in both title and subtitle?
}

/**
 * Complete set of ranking tokens from title + subtitle
 */
export interface RankingTokenSet {
  titleTokens: RankingToken[];
  subtitleTokens: RankingToken[];
  allTokens: RankingToken[];
  uniqueTokens: RankingToken[]; // De-duplicated across title + subtitle
  ignoredTokens: RankingToken[]; // Stopwords and short tokens
}

/**
 * Ranking efficiency metrics
 */
export interface RankingEfficiencyMetrics {
  totalSlots: number; // Total characters available (title: 30, subtitle: 30)
  usedSlots: number; // Characters actually used
  wastedSlots: number; // Characters wasted on stopwords/duplicates
  efficiency: number; // 0-100 score (used - wasted) / total
  duplicateCount: number; // Number of duplicate keywords
  stopwordCount: number; // Number of stopwords
}

/**
 * Duplicate keyword analysis
 */
export interface DuplicateAnalysis {
  duplicateKeywords: string[]; // Keywords appearing in both title and subtitle
  duplicateCount: number;
  wastedCharacters: number; // Characters wasted on duplicates
  recommendation?: string; // Suggestion to remove duplicates
}

/**
 * Ranking distribution map (title vs subtitle keyword split)
 */
export interface RankingDistributionMap {
  titleOnly: string[]; // Keywords only in title
  subtitleOnly: string[]; // Keywords only in subtitle
  both: string[]; // Keywords in both (duplicates)
  titleSlotUtilization: number; // 0-100 percentage
  subtitleSlotUtilization: number; // 0-100 percentage
}

// ==================== SUBTITLE VALUE PANEL ====================

/**
 * Incremental value analysis: What does the subtitle add beyond the title?
 */
export interface SubtitleValueMetrics {
  newKeywords: string[]; // Keywords NOT in title
  newKeywordCount: number;
  newCombos: ClassifiedCombo[]; // Combos NOT possible from title alone
  newComboCount: number;
  titleAlignmentScore: number; // 0-100: How well subtitle complements title
  synergyScore: number; // 0-100: Overall incremental value score
  recommendations: string[];
}

/**
 * Title alignment scoring breakdown
 */
export interface TitleAlignmentMetrics {
  overlapCount: number; // Keywords shared between title and subtitle
  overlapRatio: number; // 0-1: overlap / total subtitle keywords
  complementarity: number; // 0-100: How well subtitle adds new info
  redundancyPenalty: number; // 0-100: Penalty for too much overlap
}

// ==================== COMBO WORKBENCH ENHANCEMENTS ====================

/**
 * Priority score factors (for transparency)
 */
export interface PriorityScoreFactors {
  semanticRelevance: number; // 0-100 (30% weight)
  lengthScore: number; // 0-100 (25% weight)
  brandHybridBonus: number; // 0-100 (20% weight)
  noveltyScore: number; // 0-100 (15% weight)
  noiseInverse: number; // 0-100 (10% weight)
  totalScore: number; // Weighted average 0-100
}

/**
 * Extended ClassifiedCombo with V2.1 fields
 *
 * All V2.1 fields are OPTIONAL for backward compatibility.
 */
export interface ClassifiedComboV2_1 extends ClassifiedCombo {
  // Priority scoring (new in V2.1)
  priorityScore?: number; // 0-100 composite score
  priorityFactors?: PriorityScoreFactors; // Breakdown for debugging

  // Noise filtering (new in V2.1)
  noiseConfidence?: number; // 0-100: How likely this is noise
  isHighValue?: boolean; // priority_score > 70
  isLongTail?: boolean; // 3+ words

  // Semantic context (new in V2.1)
  semanticRelevance?: number; // 0-100: Relevance to app vertical
  noveltyScore?: number; // 0-100: How unique is this combo
}

/**
 * Long-tail distribution metrics
 */
export interface LongTailMetrics {
  totalLongTailCombos: number; // Combos with 3+ words
  longTailRatio: number; // 0-1: long-tail / total combos
  distributionByLength: Record<number, number>; // { 3: 12, 4: 8, 5: 3 }
  averageComboLength: number; // Mean words per combo
}

/**
 * Slot utilization breakdown (for heatmap)
 */
export interface SlotUtilizationBreakdown {
  title: {
    used: number; // Characters used
    max: number; // Max characters (30 for iOS)
    utilization: number; // 0-100 percentage
    efficiency: number; // 0-100: useful characters (not wasted on stopwords)
  };
  subtitle: {
    used: number;
    max: number;
    utilization: number;
    efficiency: number;
  };
  description: {
    used: number;
    max: number;
    utilization: number;
    efficiency: number;
  };
  overall: {
    totalUsed: number;
    totalMax: number;
    utilization: number; // 0-100 percentage
    efficiency: number; // 0-100: weighted efficiency across all elements
  };
}

// ==================== V2.1 EXTENDED AUDIT RESULT ====================

/**
 * Extended UnifiedMetadataAuditResult with V2.1 fields
 *
 * All V2.1 fields are OPTIONAL for backward compatibility.
 */
export interface UnifiedMetadataAuditResultV2_1 extends UnifiedMetadataAuditResult {
  // Chapter 1: Ranking Elements Panel
  rankingAnalysis?: {
    tokenSet: RankingTokenSet;
    efficiency: RankingEfficiencyMetrics;
    duplicates: DuplicateAnalysis;
    distribution: RankingDistributionMap;
  };

  // Chapter 2: Subtitle Value Panel
  subtitleValue?: SubtitleValueMetrics;

  // Chapter 3: Enhanced Combo Workbench
  comboCoverageV2_1?: {
    classifiedCombos: ClassifiedComboV2_1[]; // All combos with V2.1 fields
    highValueCombos: ClassifiedComboV2_1[]; // priority_score > 70
    longTailCombos: ClassifiedComboV2_1[]; // 3+ words
    noisyCombos: ClassifiedComboV2_1[]; // noise_confidence > threshold
  };

  // Chapter 4: Long-Tail Distribution
  longTailMetrics?: LongTailMetrics;

  // Chapter 5: Slot Utilization Heatmap
  slotUtilization?: SlotUtilizationBreakdown;
}

// ==================== HELPER TYPES ====================

/**
 * V2.1 Feature status (for UI conditional rendering)
 */
export interface V2_1FeatureStatus {
  enabled: boolean;
  rankingBlock: boolean;
  subtitlePanel: boolean;
  comboEnhance: boolean;
  longTailChart: boolean;
  heatmap: boolean;
  bibleIntegration: boolean;
}

/**
 * Combo filter options (for Enhanced Combo Workbench)
 */
export interface ComboFilterOptions {
  showHighValue?: boolean; // priority_score > 70
  showBrandHybrid?: boolean; // Contains both brand + generic
  showLongTail?: boolean; // 3+ words
  maxNoiseConfidence?: number; // 0-100 threshold (default: 30)
  minPriorityScore?: number; // 0-100 threshold
}

/**
 * Export format options
 */
export type ExportFormat = 'xlsx' | 'json' | 'csv';

/**
 * Export options for combo workbench
 */
export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeHeaders?: boolean;
  includePriorityScores?: boolean;
  includeNoiseScores?: boolean;
  includeFactors?: boolean; // Include full PriorityScoreFactors breakdown
}
