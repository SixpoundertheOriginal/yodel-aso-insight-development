/**
 * Metadata Formula Registry
 *
 * Central registry for all metadata scoring formulas and weights.
 * This is the "ASO Bible" formula layer - single source of truth for how scores are calculated.
 *
 * DO NOT hard-code formulas elsewhere. All scoring logic must be defined here.
 */

// ============================================================================
// Formula Types
// ============================================================================

export type FormulaType = 'weighted_sum' | 'ratio' | 'composite' | 'threshold_based' | 'custom';

export type FormulaInputType = 'slider' | 'number' | 'readonly';

/**
 * Admin metadata for formula management UI
 */
export interface FormulaAdminMeta {
  /** Whether formula parameters can be edited */
  editable: boolean;

  /** Input control type */
  inputType?: FormulaInputType;

  /** Min value for editable parameters */
  min?: number;

  /** Max value for editable parameters */
  max?: number;

  /** Step increment */
  step?: number;

  /** Display group */
  group?: string;

  /** Display order within group */
  displayOrder?: number;

  /** Help text for UI tooltips */
  helpText?: string;

  /** Internal notes for Yodel team */
  notes?: string;
}

/**
 * Component in a composite formula
 */
export interface FormulaComponent {
  /** Component identifier (e.g., 'title_score', 'keyword_coverage') */
  id: string;

  /** Weight of this component (0-1) */
  weight: number;

  /** Optional: Source formula/KPI this pulls from */
  source?: string;
}

/**
 * Threshold definition for threshold-based formulas
 */
export interface FormulaThreshold {
  /** Condition (e.g., '>= 75', '< 50') */
  condition: string;

  /** Score awarded when condition met */
  score: number;

  /** Human-readable label */
  label: string;
}

/**
 * Formula Definition
 */
export interface FormulaDefinition {
  /** Unique formula identifier */
  id: string;

  /** Human-readable label */
  label: string;

  /** Detailed description */
  description: string;

  /** Formula type */
  type: FormulaType;

  /** Components (for weighted_sum, composite) */
  components?: FormulaComponent[];

  /** Thresholds (for threshold_based) */
  thresholds?: FormulaThreshold[];

  /** Custom computation notes (for custom type) */
  computationNotes?: string;

  /** Admin metadata */
  admin?: FormulaAdminMeta;
}

// ============================================================================
// Metadata Scoring Formulas
// ============================================================================

/**
 * METADATA FORMULA REGISTRY
 *
 * Defines all scoring formulas used in metadata audit.
 * Weights here match those in metadataScoringRegistry.ts
 */
export const METADATA_FORMULA_REGISTRY: FormulaDefinition[] = [
  // ==========================================================================
  // OVERALL METADATA SCORE
  // ==========================================================================
  {
    id: 'metadata_overall_score',
    label: 'Overall Metadata Score',
    description: 'Weighted combination of Title (65%) and Subtitle (35%) scores. Description excluded as it does not affect App Store ranking.',
    type: 'weighted_sum',
    components: [
      { id: 'title_score', weight: 0.65, source: 'title_element_score' },
      { id: 'subtitle_score', weight: 0.35, source: 'subtitle_element_score' },
    ],
    admin: {
      editable: false,
      inputType: 'readonly',
      group: 'Overall',
      displayOrder: 1,
      helpText: 'Primary ASO ranking score - title is weighted 65%, subtitle 35%',
      notes: 'These weights reflect Apple App Store ranking algorithm priorities',
    },
  },

  // ==========================================================================
  // ELEMENT SCORES
  // ==========================================================================
  {
    id: 'title_element_score',
    label: 'Title Element Score',
    description: 'Weighted sum of title rules: Character Usage (25%), Unique Keywords (30%), Combo Coverage (30%), Filler Penalty (15%)',
    type: 'weighted_sum',
    components: [
      { id: 'title_character_usage', weight: 0.25 },
      { id: 'title_unique_keywords', weight: 0.30 },
      { id: 'title_combo_coverage', weight: 0.30 },
      { id: 'title_filler_penalty', weight: 0.15 },
    ],
    admin: {
      editable: true,
      inputType: 'slider',
      min: 0,
      max: 1,
      step: 0.05,
      group: 'Title',
      displayOrder: 1,
      helpText: 'Adjust weights for individual title scoring rules',
      notes: 'Current weights optimized for discovery + brand balance',
    },
  },

  {
    id: 'subtitle_element_score',
    label: 'Subtitle Element Score',
    description: 'Weighted sum of subtitle rules: Character Usage (20%), Incremental Value (40%), Combo Coverage (25%), Complementarity (15%)',
    type: 'weighted_sum',
    components: [
      { id: 'subtitle_character_usage', weight: 0.20 },
      { id: 'subtitle_incremental_value', weight: 0.40 },
      { id: 'subtitle_combo_coverage', weight: 0.25 },
      { id: 'subtitle_complementarity', weight: 0.15 },
    ],
    admin: {
      editable: true,
      inputType: 'slider',
      min: 0,
      max: 1,
      step: 0.05,
      group: 'Subtitle',
      displayOrder: 1,
      helpText: 'Subtitle is critical for adding NEW high-value keywords not in title',
      notes: 'Incremental Value weighted highest (40%) as it drives organic reach',
    },
  },

  {
    id: 'description_conversion_score',
    label: 'Description Conversion Score',
    description: 'Conversion quality score (NOT ranking): Hook Strength (30%), Feature Mentions (25%), CTA Strength (20%), Readability (25%)',
    type: 'weighted_sum',
    components: [
      { id: 'description_hook_strength', weight: 0.30 },
      { id: 'description_feature_mentions', weight: 0.25 },
      { id: 'description_cta_strength', weight: 0.20 },
      { id: 'description_readability', weight: 0.25 },
    ],
    admin: {
      editable: true,
      inputType: 'slider',
      min: 0,
      max: 1,
      step: 0.05,
      group: 'Conversion',
      displayOrder: 1,
      helpText: 'Description affects conversion rate, not App Store ranking',
      notes: 'Weight = 0 for ASO ranking, but critical for store page CVR',
    },
  },

  // ==========================================================================
  // DIMENSION SCORES (for visualization)
  // ==========================================================================
  {
    id: 'metadata_dimension_relevance',
    label: 'Metadata Relevance Dimension',
    description: 'Average of title and subtitle element scores',
    type: 'composite',
    components: [
      { id: 'title_score', weight: 0.5 },
      { id: 'subtitle_score', weight: 0.5 },
    ],
    admin: {
      editable: false,
      inputType: 'readonly',
      group: 'Visualization',
      displayOrder: 1,
      helpText: 'Used in Metadata Dimension Radar chart',
    },
  },

  {
    id: 'metadata_dimension_learning',
    label: 'Learning/Discovery Dimension',
    description: 'Score based on generic combo count (target: 5+ generic combos)',
    type: 'threshold_based',
    thresholds: [
      { condition: '>= 5', score: 100, label: 'Excellent' },
      { condition: '>= 3', score: 75, label: 'Good' },
      { condition: '>= 1', score: 50, label: 'Moderate' },
      { condition: '< 1', score: 20, label: 'Poor' },
    ],
    admin: {
      editable: true,
      inputType: 'number',
      group: 'Visualization',
      displayOrder: 2,
      helpText: 'Generic combos drive discovery from non-brand-aware users',
    },
  },

  {
    id: 'metadata_dimension_structure',
    label: 'Structure Dimension',
    description: 'Uses title score as proxy for metadata structural quality',
    type: 'composite',
    components: [
      { id: 'title_score', weight: 1.0 },
    ],
    admin: {
      editable: false,
      inputType: 'readonly',
      group: 'Visualization',
      displayOrder: 3,
      helpText: 'Title structure quality reflects overall metadata organization',
    },
  },

  {
    id: 'metadata_dimension_brand_balance',
    label: 'Brand Balance Dimension',
    description: 'Score based on generic/(branded+generic) ratio. Target: 60%+ generic for discovery.',
    type: 'custom',
    computationNotes: 'Computed as: min(100, (genericCount / (brandedCount + genericCount)) * 100 + 30)',
    admin: {
      editable: true,
      inputType: 'number',
      group: 'Visualization',
      displayOrder: 4,
      helpText: 'Balanced metadata needs both brand retention and generic discovery',
      notes: 'Formula weights toward generic discovery (adds +30 base)',
    },
  },
];

/**
 * Helper: Get formula by ID
 */
export function getFormulaDefinition(id: string): FormulaDefinition | undefined {
  return METADATA_FORMULA_REGISTRY.find(f => f.id === id);
}

/**
 * Helper: Get all editable formulas
 */
export function getEditableFormulas(): FormulaDefinition[] {
  return METADATA_FORMULA_REGISTRY.filter(f => f.admin?.editable === true);
}

/**
 * Helper: Get formulas by group
 */
export function getFormulasByGroup(group: string): FormulaDefinition[] {
  return METADATA_FORMULA_REGISTRY.filter(f => f.admin?.group === group)
    .sort((a, b) => (a.admin?.displayOrder || 999) - (b.admin?.displayOrder || 999));
}

/**
 * Phase 10: Get formula with vertical/market overrides applied
 *
 * Infrastructure for formula overrides (Phase 10)
 * Full integration deferred to Phase 11
 *
 * @param formulaId - Formula identifier
 * @param activeRuleSet - Optional active rule set with overrides
 * @returns Formula definition with overrides applied (if any)
 */
export function getFormulaWithOverrides(
  formulaId: string,
  activeRuleSet?: any // MergedRuleSet - avoiding circular dependency
): FormulaDefinition | undefined {
  const baseFormula = getFormulaDefinition(formulaId);
  if (!baseFormula) {
    return undefined;
  }

  // Phase 10: Infrastructure only - no actual override application
  // Phase 11: Will apply formulaOverrides from activeRuleSet
  // - Multiplier overrides (e.g., boost conversion_score by 1.3x)
  // - Component weight overrides (e.g., adjust title_score weight in metadata_overall_score)

  // For now, return base formula unchanged
  // Future: Apply activeRuleSet.formulaOverrides[formulaId] if exists

  if (process.env.NODE_ENV === 'development' && activeRuleSet?.formulaOverrides?.[formulaId]) {
    console.warn(`[Formula Override] Formula "${formulaId}" has overrides defined, but override application is not yet implemented (Phase 11)`);
  }

  return baseFormula;
}
