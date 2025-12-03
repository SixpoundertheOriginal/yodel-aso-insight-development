/**
 * Metadata Optimization System - Type Definitions
 *
 * Types for draft metadata editing, comparison, and delta calculation
 */

import type { UnifiedMetadataAuditResult } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';

/**
 * Draft metadata being tested by user
 */
export interface DraftMetadata {
  title: string;
  subtitle: string;
  keywords: string;
}

/**
 * Baseline metadata (production + keywords field)
 */
export interface BaselineMetadata {
  title: string;
  subtitle: string;
  keywords: string;
}

/**
 * Delta between baseline and draft audits
 */
export interface MetadataDeltas {
  // Combo counts
  excellentCombos: number;  // Tier 1 (100 pts)
  goodCombos: number;       // Tier 2 (70-85 pts)
  needsImprovement: number; // Lower tiers

  // Coverage
  coveragePct: number;
  totalCombos: number;

  // Quality metrics
  duplicates: number;
  efficiencyScore: number;
  uniqueKeywords: number;

  // Ranking power
  titlePerformance: number;
  multiElementCombos: number;
}

/**
 * Text diff for highlighting changes
 */
export type DiffType = 'keep' | 'add' | 'remove' | 'change';

export interface TextDiffSegment {
  type: DiffType;
  text: string;
}

export interface TextDiff {
  title: TextDiffSegment[];
  subtitle: TextDiffSegment[];
  keywords: TextDiffSegment[];
}

/**
 * Request payload for draft audit endpoint
 */
export interface DraftAuditRequest {
  app_id: string;
  platform: 'ios' | 'android';
  locale: string;
  draft: DraftMetadata;
  baseline: BaselineMetadata;
}

/**
 * Response from draft audit endpoint
 */
export interface DraftAuditResponse {
  success: boolean;
  data: {
    draftAudit: UnifiedMetadataAuditResult;
    baselineAudit: UnifiedMetadataAuditResult;
    deltas: MetadataDeltas;
    textDiff: TextDiff;
  };
  error?: string;
}

/**
 * Validation result for real-time feedback
 */
export interface MetadataValidationResult {
  isValid: boolean;
  warnings: ValidationWarning[];
  duplicates: {
    title: string[];
    subtitle: string[];
    keywords: string[];
  };
  characterUsage: {
    title: { used: number; max: number };
    subtitle: { used: number; max: number };
    keywords: { used: number; max: number };
  };
}

export interface ValidationWarning {
  field: 'title' | 'subtitle' | 'keywords';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

/**
 * Comparison mode state
 */
export type ComparisonMode = 'off' | 'baseline-vs-draft';

/**
 * Draft audit state
 */
export interface DraftAuditState {
  // Baseline (production metadata + keywords)
  baselineMetadata: BaselineMetadata | null;
  baselineAudit: UnifiedMetadataAuditResult | null;

  // Draft (user's proposed changes)
  draftMetadata: DraftMetadata;
  draftAudit: UnifiedMetadataAuditResult | null;

  // Comparison
  deltas: MetadataDeltas | null;
  textDiff: TextDiff | null;
  comparisonMode: ComparisonMode;

  // UI state
  hasUnconfirmedChanges: boolean;
  isRecomputingDraft: boolean;
}
