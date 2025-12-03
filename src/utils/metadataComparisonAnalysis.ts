/**
 * Metadata Comparison Analysis Utilities
 *
 * Pure data transformation functions for comparing baseline vs draft audits.
 * No API calls - all calculations done client-side from existing audit data.
 */

import type { GeneratedCombo, ComboStrength, UnifiedMetadataAuditResult } from '@/components/AppAudit/UnifiedMetadataAuditModule/types';

// ==================== TYPES ====================

export interface ComboDiff {
  added: GeneratedCombo[];        // New combos in draft
  removed: GeneratedCombo[];      // Lost combos from baseline
  tierUpgrades: ComboTierChange[]; // Combos that improved tier
  tierDowngrades: ComboTierChange[]; // Combos that declined tier
  unchanged: GeneratedCombo[];    // Same combos in both
}

export interface ComboTierChange {
  text: string;
  baselineTier: number;
  draftTier: number;
  baselineStrength: ComboStrength;
  draftStrength: ComboStrength;
  baselineScore: number;
  draftScore: number;
  improvement: number; // +2 means moved up 2 tiers (positive = improvement)
}

export interface TierDistribution {
  tier1: { baseline: number; draft: number; delta: number }; // Excellent (Tier 1)
  tier2: { baseline: number; draft: number; delta: number }; // Good (Tier 2)
  tier3Plus: { baseline: number; draft: number; delta: number }; // Poor (Tier 3+)
}

export interface KeywordImpact {
  keyword: string;
  addedOrRemoved: 'added' | 'removed';
  comboCount: number;
  avgTier: number;
  sampleCombos: string[]; // Max 3
}

export interface StrengthenOpportunity {
  combo: GeneratedCombo;
  currentTier: number;
  suggestion: string;
}

// ==================== TIER MAPPING ====================

/**
 * Map ComboStrength enum to tier number (1-7)
 */
function getTierNumber(strength: ComboStrength): number {
  switch (strength) {
    case 'title_consecutive':
      return 1;
    case 'title_non_consecutive':
    case 'title_keywords_cross':
      return 2;
    case 'cross_element':
      return 3;
    case 'keywords_consecutive':
    case 'subtitle_consecutive':
      return 4;
    case 'keywords_subtitle_cross':
      return 5;
    case 'keywords_non_consecutive':
    case 'subtitle_non_consecutive':
      return 6;
    case 'three_way_cross':
      return 7;
    case 'missing':
      return 8; // Treated as worst tier
    default:
      return 8;
  }
}

/**
 * Get human-readable tier label
 */
function getTierLabel(tier: number): string {
  if (tier === 1) return 'Excellent';
  if (tier === 2) return 'Good';
  if (tier <= 4) return 'Medium';
  return 'Poor';
}

// ==================== COMBO DIFFING ====================

/**
 * Diff two combo arrays to find added, removed, and tier changes
 */
export function diffCombos(
  baselineCombos: GeneratedCombo[],
  draftCombos: GeneratedCombo[]
): ComboDiff {
  const baselineMap = new Map<string, GeneratedCombo>();
  const draftMap = new Map<string, GeneratedCombo>();

  // Build maps for O(1) lookup
  baselineCombos.forEach(combo => baselineMap.set(combo.text.toLowerCase(), combo));
  draftCombos.forEach(combo => draftMap.set(combo.text.toLowerCase(), combo));

  const added: GeneratedCombo[] = [];
  const removed: GeneratedCombo[] = [];
  const tierUpgrades: ComboTierChange[] = [];
  const tierDowngrades: ComboTierChange[] = [];
  const unchanged: GeneratedCombo[] = [];

  // Find added combos (in draft, not in baseline)
  draftCombos.forEach(draftCombo => {
    if (!baselineMap.has(draftCombo.text.toLowerCase())) {
      added.push(draftCombo);
    }
  });

  // Find removed combos (in baseline, not in draft)
  baselineCombos.forEach(baselineCombo => {
    if (!draftMap.has(baselineCombo.text.toLowerCase())) {
      removed.push(baselineCombo);
    }
  });

  // Find tier changes (in both, but different tiers)
  baselineCombos.forEach(baselineCombo => {
    const draftCombo = draftMap.get(baselineCombo.text.toLowerCase());
    if (draftCombo) {
      const baselineTier = getTierNumber(baselineCombo.strength);
      const draftTier = getTierNumber(draftCombo.strength);

      if (baselineTier !== draftTier) {
        const tierChange: ComboTierChange = {
          text: draftCombo.text,
          baselineTier,
          draftTier,
          baselineStrength: baselineCombo.strength,
          draftStrength: draftCombo.strength,
          baselineScore: baselineCombo.strengthScore,
          draftScore: draftCombo.strengthScore,
          improvement: baselineTier - draftTier, // Lower tier number = better (so positive = improvement)
        };

        if (tierChange.improvement > 0) {
          tierUpgrades.push(tierChange);
        } else {
          tierDowngrades.push(tierChange);
        }
      } else {
        unchanged.push(draftCombo);
      }
    }
  });

  // Sort by impact
  added.sort((a, b) => b.strengthScore - a.strengthScore); // Best additions first
  removed.sort((a, b) => b.strengthScore - a.strengthScore); // Worst removals first
  tierUpgrades.sort((a, b) => b.improvement - a.improvement); // Biggest improvements first
  tierDowngrades.sort((a, b) => a.improvement - b.improvement); // Biggest declines first

  return {
    added,
    removed,
    tierUpgrades,
    tierDowngrades,
    unchanged,
  };
}

// ==================== TIER DISTRIBUTION ====================

/**
 * Calculate tier distribution (aggregate to 3 groups)
 */
export function calculateTierDistribution(
  baselineAudit: UnifiedMetadataAuditResult,
  draftAudit: UnifiedMetadataAuditResult
): TierDistribution {
  const baselineStats = baselineAudit.comboCoverage.statsByBrandType?.generic || baselineAudit.comboCoverage.stats;
  const draftStats = draftAudit.comboCoverage.statsByBrandType?.generic || draftAudit.comboCoverage.stats;

  // Tier 1: Title consecutive (Excellent)
  const baselineTier1 = baselineStats?.titleConsecutive || 0;
  const draftTier1 = draftStats?.titleConsecutive || 0;

  // Tier 2: Title non-consecutive + Title/Keywords cross (Good)
  const baselineTier2 = (baselineStats?.titleNonConsecutive || 0) + (baselineStats?.titleKeywordsCross || 0);
  const draftTier2 = (draftStats?.titleNonConsecutive || 0) + (draftStats?.titleKeywordsCross || 0);

  // Tier 3+: Everything else (Poor)
  const baselineTier3Plus =
    (baselineStats?.crossElement || 0) +
    (baselineStats?.keywordsConsecutive || 0) +
    (baselineStats?.subtitleConsecutive || 0) +
    (baselineStats?.keywordsSubtitleCross || 0) +
    (baselineStats?.keywordsNonConsecutive || 0) +
    (baselineStats?.subtitleNonConsecutive || 0) +
    (baselineStats?.threeWayCross || 0);

  const draftTier3Plus =
    (draftStats?.crossElement || 0) +
    (draftStats?.keywordsConsecutive || 0) +
    (draftStats?.subtitleConsecutive || 0) +
    (draftStats?.keywordsSubtitleCross || 0) +
    (draftStats?.keywordsNonConsecutive || 0) +
    (draftStats?.subtitleNonConsecutive || 0) +
    (draftStats?.threeWayCross || 0);

  return {
    tier1: {
      baseline: baselineTier1,
      draft: draftTier1,
      delta: draftTier1 - baselineTier1,
    },
    tier2: {
      baseline: baselineTier2,
      draft: draftTier2,
      delta: draftTier2 - baselineTier2,
    },
    tier3Plus: {
      baseline: baselineTier3Plus,
      draft: draftTier3Plus,
      delta: draftTier3Plus - baselineTier3Plus,
    },
  };
}

// ==================== KEYWORD IMPACT ====================

/**
 * Analyze which keywords were added/removed and their impact
 */
export function analyzeKeywordImpact(
  baselineAudit: UnifiedMetadataAuditResult,
  draftAudit: UnifiedMetadataAuditResult
): KeywordImpact[] {
  const baselineKeywords = new Set([
    ...(baselineAudit.keywordCoverage.titleKeywords || []),
    ...(baselineAudit.keywordCoverage.subtitleNewKeywords || []),
  ].map(k => k.toLowerCase()));

  const draftKeywords = new Set([
    ...(draftAudit.keywordCoverage.titleKeywords || []),
    ...(draftAudit.keywordCoverage.subtitleNewKeywords || []),
  ].map(k => k.toLowerCase()));

  const impacts: KeywordImpact[] = [];

  // Find added keywords
  draftKeywords.forEach(keyword => {
    if (!baselineKeywords.has(keyword)) {
      const combosWithKeyword = (draftAudit.comboCoverage.combos || []).filter(
        combo => combo.keywords.some(k => k.toLowerCase() === keyword)
      );

      if (combosWithKeyword.length > 0) {
        const avgTier = combosWithKeyword.reduce(
          (sum, combo) => sum + getTierNumber(combo.strength),
          0
        ) / combosWithKeyword.length;

        impacts.push({
          keyword,
          addedOrRemoved: 'added',
          comboCount: combosWithKeyword.length,
          avgTier: Math.round(avgTier * 10) / 10,
          sampleCombos: combosWithKeyword.slice(0, 3).map(c => c.text),
        });
      }
    }
  });

  // Find removed keywords
  baselineKeywords.forEach(keyword => {
    if (!draftKeywords.has(keyword)) {
      const combosWithKeyword = (baselineAudit.comboCoverage.combos || []).filter(
        combo => combo.keywords.some(k => k.toLowerCase() === keyword)
      );

      if (combosWithKeyword.length > 0) {
        const avgTier = combosWithKeyword.reduce(
          (sum, combo) => sum + getTierNumber(combo.strength),
          0
        ) / combosWithKeyword.length;

        impacts.push({
          keyword,
          addedOrRemoved: 'removed',
          comboCount: combosWithKeyword.length,
          avgTier: Math.round(avgTier * 10) / 10,
          sampleCombos: combosWithKeyword.slice(0, 3).map(c => c.text),
        });
      }
    }
  });

  // Sort by impact (combo count descending)
  impacts.sort((a, b) => b.comboCount - a.comboCount);

  return impacts;
}

// ==================== STRENGTHENING OPPORTUNITIES ====================

/**
 * Extract combos that can be strengthened from draft audit
 */
export function extractStrengthenOpportunities(
  draftAudit: UnifiedMetadataAuditResult
): StrengthenOpportunity[] {
  const opportunities: StrengthenOpportunity[] = [];

  (draftAudit.comboCoverage.combos || []).forEach(combo => {
    if (combo.canStrengthen && combo.strengtheningSuggestion) {
      opportunities.push({
        combo,
        currentTier: getTierNumber(combo.strength),
        suggestion: combo.strengtheningSuggestion,
      });
    }
  });

  // Sort by potential impact (current tier descending = worst combos first)
  opportunities.sort((a, b) => {
    // Prioritize combos that are currently weak but can be made strong
    const aPotential = 8 - a.currentTier; // Higher = more potential
    const bPotential = 8 - b.currentTier;
    return bPotential - aPotential;
  });

  return opportunities;
}

// ==================== EXPORT HELPERS ====================

export { getTierNumber, getTierLabel };
