/**
 * Keyword Ranking Analysis Types
 *
 * Types for analyzing top-ranking apps for a specific keyword.
 */

import type { UnifiedMetadataAuditResult } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';

// =====================================================================
// REQUEST/RESPONSE TYPES
// =====================================================================

export interface AnalyzeKeywordRankingRequest {
  keyword: string;
  limit?: number; // default: 10
  country?: string; // default: 'us'
  organizationId: string;
}

export interface KeywordPresence {
  inTitle: boolean;
  inSubtitle: boolean;
  titlePosition?: number; // Word position (1-based)
  subtitlePosition?: number;
  comboCount: number; // Number of combos using this keyword
}

export interface RankingApp {
  rank: number; // 1-10
  appStoreId: string;
  name: string;
  iconUrl: string;
  developer: string;
  metadata: {
    title: string;
    subtitle: string;
  };
  audit: UnifiedMetadataAuditResult;
  keywordPresence: KeywordPresence;
}

export interface PlacementPattern {
  inTitleCount: number; // How many apps have keyword in title
  inSubtitleCount: number; // How many apps have keyword in subtitle
  avgTitlePosition: number; // Average word position in title
  avgSubtitlePosition: number; // Average word position in subtitle
  titleOnlyCount: number; // In title but not subtitle
  subtitleOnlyCount: number; // In subtitle but not title
  bothCount: number; // In both title and subtitle
}

export interface CoOccurringKeyword {
  keyword: string;
  frequency: number; // How many apps (out of 10)
  avgComboCount: number; // Average combos per app
}

export interface TopCombo {
  combo: string;
  frequency: number; // How many apps have this combo
}

export interface StrategyStats {
  avgKeywordCount: number;
  avgComboCount: number;
  avgDensity: number;
  avgCastingScore: number;
  avgTitleChars: number;
  avgSubtitleChars: number;
}

export interface RankingPatterns {
  placement: PlacementPattern;
  coOccurringKeywords: CoOccurringKeyword[];
  topCombos: TopCombo[];
  strategyStats: StrategyStats;
}

export interface AnalyzeKeywordRankingData {
  keyword: string;
  analyzedAt: string;
  topRankingApps: RankingApp[];
  patterns: RankingPatterns;
  recommendations: string[];
}

export interface AnalyzeKeywordRankingResponse {
  success: boolean;
  data?: AnalyzeKeywordRankingData;
  cached?: boolean;
  cachedAt?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
