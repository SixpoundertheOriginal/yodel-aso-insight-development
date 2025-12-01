/**
 * Competitive Intelligence Types
 *
 * Types for competitor analysis and gap analysis features.
 * Matches backend response from analyze-competitors edge function.
 */

import type { UnifiedMetadataAuditResult } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';

// =====================================================================
// COMPETITOR ANALYSIS TYPES
// =====================================================================

export interface CompetitorAnalysisResult {
  appStoreId: string;
  name: string;
  subtitle: string | null;
  audit: UnifiedMetadataAuditResult;
  fetchedAt: string;
}

export interface TargetAppAnalysis {
  appStoreId: string;
  name: string;
  subtitle: string | null;
  audit: UnifiedMetadataAuditResult;
}

// =====================================================================
// GAP ANALYSIS TYPES
// =====================================================================

/**
 * Missing Keyword
 * Keyword that competitors use but target app doesn't
 */
export interface MissingKeyword {
  keyword: string;
  usedByCompetitors: number; // How many competitors use it
  avgFrequency: number; // Average combo count across competitors
  topCompetitor: string; // Competitor using it most
  opportunityScore: number; // 0-100 (higher = better ROI)
}

/**
 * Missing Combo
 * Combo that competitors have but target app doesn't
 */
export interface MissingCombo {
  combo: string;
  usedByCompetitors: number;
  topCompetitor: string;
  opportunityScore: number;
}

/**
 * Frequency Gap
 * Keyword that target uses less frequently than competitors
 */
export interface FrequencyGap {
  keyword: string;
  targetFrequency: number;
  competitorAvgFrequency: number;
  gap: number; // competitor avg - target
  recommendation: string;
}

/**
 * Gap Analysis Summary Statistics
 */
export interface GapAnalysisSummary {
  totalMissingKeywords: number;
  totalMissingCombos: number;
  totalFrequencyGaps: number;
  avgCompetitorKeywordCount: number;
  targetKeywordCount: number;
  avgCompetitorComboCount: number;
  targetComboCount: number;
}

/**
 * Complete Gap Analysis Result
 */
export interface GapAnalysisResult {
  missingKeywords: MissingKeyword[];
  missingCombos: MissingCombo[];
  frequencyGaps: FrequencyGap[];
  summary: GapAnalysisSummary;
}

// =====================================================================
// API REQUEST/RESPONSE TYPES
// =====================================================================

export interface AnalyzeCompetitorsRequest {
  targetAppId: string; // App Store ID of target app
  competitorAppStoreIds: string[]; // Max 10 competitor App Store IDs
  organizationId: string; // For RLS and storage
  forceRefresh?: boolean; // Bypass cache
  monitoredAppId?: string; // v2.1: Optional monitored app ID to fetch brand keywords
  targetAudit?: UnifiedMetadataAuditResult; // v2.1: Reuse existing audit result (avoid re-audit)
}

export interface AnalyzeCompetitorsData {
  targetApp: TargetAppAnalysis;
  competitors: CompetitorAnalysisResult[];
  gapAnalysis: GapAnalysisResult;
  cachedAt?: string;
  expiresAt?: string;
}

export interface AnalyzeCompetitorsResponse {
  success: boolean;
  data?: AnalyzeCompetitorsData;
  cached?: boolean; // True if returned from cache
  cachedAt?: string; // When cache was created
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// =====================================================================
// UI STATE TYPES
// =====================================================================

/**
 * Competitor Search Result (from iTunes API)
 */
export interface CompetitorSearchResult {
  appStoreId: string;
  name: string;
  iconUrl: string | null;
  developer: string | null;
  category: string | null;
  rating: number | null;
}

/**
 * Selected Competitor (for analysis queue)
 */
export interface SelectedCompetitor {
  appStoreId: string;
  name: string;
  iconUrl: string | null;
}

/**
 * Analysis Progress State
 */
export interface AnalysisProgress {
  status: 'idle' | 'fetching' | 'analyzing' | 'complete' | 'error';
  currentStep: string; // e.g., "Fetching competitor 2/4..."
  progress: number; // 0-100
  error?: string;
}

/**
 * Competitive Intelligence Tab State
 */
export type CompetitiveIntelligenceTab = 'comparison' | 'gaps' | 'keyword-rankings';

/**
 * Comparison Metric Type
 */
export type ComparisonMetric =
  | 'keywordCount'
  | 'comboCount'
  | 'keywordFrequency'
  | 'intentDistribution'
  | 'overallScore';
