/**
 * ASO Formula Registry
 *
 * Centralized configuration for all ASO calculations and intelligence algorithms.
 * This registry enables:
 * - Version tracking of formulas
 * - Category-specific overrides
 * - Easy testing with custom configs
 * - Consistent formulas across dashboard and reporting
 * - Future AI-powered adjustments
 *
 * Version: 2.0.0
 * Last Updated: 2025-01-15
 */

// =====================================================
// STABILITY SCORE CONFIGURATION
// =====================================================

export const STABILITY_CONFIG = {
  /**
   * Metric weights for stability score calculation
   * Must sum to 1.0 (100%)
   */
  weights: {
    impressions: 0.25,    // 25% - Traffic volume stability
    downloads: 0.35,      // 35% - Conversion stability (most important)
    cvr: 0.30,           // 30% - Efficiency stability
    directShare: 0.10    // 10% - User behavior stability
  },

  /**
   * Coefficient of Variation (CV) normalization
   * CV = Standard Deviation / Mean
   * Lower CV = more stable
   */
  cvNormalization: {
    cap: 2.0,  // Cap CV at 2.0 for normalization (extremely volatile)
    /**
     * Normalize CV to 0-100 scale (inverted)
     * Formula: 100 * (1 - min(CV, cap) / cap)
     * Returns: 100 (very stable) to 0 (highly volatile)
     */
    formula: (cv: number, cap: number = 2.0): number => {
      if (!isFinite(cv)) return 0;
      const cappedCV = Math.min(cv, cap);
      return 100 * (1 - cappedCV / cap);
    }
  },

  /**
   * Interpretation bands for stability score
   * Sorted from highest to lowest score
   */
  interpretationBands: [
    { min: 80, max: 100, label: 'Very Stable', color: 'green' as const },
    { min: 60, max: 79, label: 'Stable', color: 'green' as const },
    { min: 40, max: 59, label: 'Moderate Volatility', color: 'yellow' as const },
    { min: 20, max: 39, label: 'Unstable', color: 'orange' as const },
    { min: 0, max: 19, label: 'Highly Volatile', color: 'red' as const }
  ],

  /**
   * Data requirements
   */
  dataRequirements: {
    minDataPoints: 7,      // Minimum 7 days for statistical validity
    optimalDataPoints: 30, // 30 days for best accuracy
    maxDataPoints: 90      // Use last 90 days max
  }
} as const;

// =====================================================
// OPPORTUNITY MAP CONFIGURATION
// =====================================================

export const OPPORTUNITY_CONFIG = {
  /**
   * Performance thresholds for each opportunity category
   * Format: { excellent, good, poor }
   * Values are percentages unless noted
   */
  thresholds: {
    firstImpression: {
      excellent: 30,  // >30% tap-through is excellent
      good: 20,       // 20-30% is good
      poor: 15        // <15% needs work
    },
    pdpCvrSearch: {
      excellent: 50,  // >50% PDP CVR for Search is excellent
      good: 35,       // 35-50% is good
      poor: 25        // <25% needs work
    },
    pdpCvrBrowse: {
      excellent: 60,  // >60% PDP CVR for Browse is excellent (higher intent)
      good: 45,       // 45-60% is good
      poor: 35        // <35% needs work
    },
    funnelLeak: {
      excellent: 40,  // <40% leak is excellent
      good: 60,       // 40-60% is good
      poor: 75,       // >75% needs work
      inverted: true  // Lower is better for this metric
    },
    searchBrowseRatio: {
      tooLow: 0.3,        // <0.3 = too Browse-heavy
      balancedLow: 0.8,   // 0.8-3.0 = balanced
      balancedHigh: 3.0,
      tooHigh: 5.0        // >5.0 = too Search-heavy
    },
    directPropensity: {
      excellent: 40,  // >40% direct install shows strong brand
      good: 20,       // 20-40% is normal
      poor: 10        // <10% shows weak brand recognition
    },
    metadataStrength: {
      excellent: 2.5,  // Composite score
      good: 1.5,
      poor: 1.0
    },
    creativeStrength: {
      excellent: 2.5,  // Composite score
      good: 1.5,
      poor: 1.0
    }
  },

  /**
   * Scoring multipliers for gap-to-score conversion
   * Higher multiplier = more sensitive to gaps
   */
  scoringMultipliers: {
    iconTitle: 5,           // Each 1% gap = 5 points (highly impactful)
    pdpCvr: 2,             // Each 1% gap = 2 points
    funnelLeak: 1.5,       // Each 1% gap = 1.5 points
    searchBrowseRatio: 50, // Each 0.1 ratio gap = 5 points
    directPropensity: 3,   // Each 1% gap = 3 points
    channelImbalance: 30   // Each 1.0 strength gap = 30 points
  },

  /**
   * Opportunity scoring limits
   */
  limits: {
    maxScore: 100,          // Cap individual opportunity score
    maxOpportunities: 4,    // Show top 4 opportunities
    minDataThreshold: 100   // Minimum metric value to consider (e.g., 100 PPV)
  },

  /**
   * Priority classification thresholds
   */
  priorityThresholds: {
    high: 70,    // Score >= 70 = high priority
    medium: 40   // Score >= 40 = medium, else low
  }
} as const;

// =====================================================
// OUTCOME SIMULATION CONFIGURATION
// =====================================================

export const SIMULATION_CONFIG = {
  /**
   * Improvement presets for each scenario
   * All values are relative improvements
   */
  presets: {
    tapThroughImprovement: 1.0,        // +1 percentage point
    pdpCvrImprovement: 0.10,           // +10% relative (e.g., 40% → 44%)
    funnelLeakReduction: 5.0,          // -5 percentage points
    searchImpressionsIncrease: 0.10    // +10% relative
  },

  /**
   * Realistic caps to prevent unrealistic projections
   */
  caps: {
    maxPdpCvr: 70,         // Don't project PDP CVR above 70%
    maxTotalCvr: 30,       // Don't project total CVR above 30%
    minFunnelLeak: 10,     // Don't project funnel leak below 10%
    maxTapThrough: 50      // Don't project tap-through above 50%
  },

  /**
   * Confidence level assignment rules
   * Maps scenario IDs to confidence levels
   */
  confidenceRules: {
    high: ['improve_ttr', 'improve_pdp_cvr'],  // Direct impact, proven
    medium: ['reduce_funnel_leak', 'increase_search_impressions'],  // Indirect
    low: []  // External factors, market-dependent
  },

  /**
   * Simulation output limits
   */
  limits: {
    maxScenarios: 3,  // Show top 3 scenarios by impact
    minImpact: 10     // Minimum delta installs to show scenario
  },

  /**
   * Standard disclaimer text
   */
  disclaimer: 'Simulations assume all else constant. Actual results may vary based on execution, market conditions, and competitive dynamics.'
} as const;

// =====================================================
// ANOMALY ATTRIBUTION CONFIGURATION
// =====================================================

export const ATTRIBUTION_CONFIG = {
  /**
   * Pattern detection thresholds
   * All values are percentage changes unless noted
   */
  patternThresholds: {
    // Search patterns
    searchImpressionDropSevere: -10,      // % change
    searchCvrDropSignificant: -5,         // % change
    searchCvrIncreaseSignificant: 5,      // % change

    // Browse patterns
    browseImpressionDropSevere: -15,      // % change
    browseImpressionSpike: 20,            // % change
    browsePdpCvrDropSevere: -10,          // % change
    browsePdpCvrStableRange: 5,           // pp range for "stable"

    // Cross-channel patterns
    pdpCvrDropBothChannels: -10,          // % change
    allMetricsDropThreshold: -20,         // % change (uniform decline)

    // Two-path patterns
    directShareSpike: 20,                 // pp change
    directShareStableRange: 5,            // pp range for "stable"

    // Volume patterns
    downloadsSpikeThreshold: 30,          // % change
    impressionsStableRange: 10,           // % range for "stable"

    // Derived KPI patterns
    sbrShiftThreshold: 30                 // % change in Search/Browse Ratio
  },

  /**
   * Confidence scoring weights
   * Used to sort attributions by reliability
   */
  confidenceWeights: {
    high: 3,    // 3+ correlated signals
    medium: 2,  // 2 signals or inference required
    low: 1      // 1 signal or external factors
  },

  /**
   * Attribution output limits
   */
  limits: {
    maxAttributions: 5,              // Max attributions per anomaly
    minSignalsForHighConfidence: 3   // Require 3+ signals for high confidence
  },

  /**
   * Category labels for attributions
   */
  categories: {
    metadata: 'Metadata & Keywords',
    creative: 'Creative Assets',
    brand: 'Brand & Marketing',
    algorithm: 'Algorithm & Platform',
    technical: 'Technical Issue',
    featuring: 'App Store Featuring'
  }
} as const;

// =====================================================
// FORMULA REGISTRY (Main Export)
// =====================================================

export const FORMULA_REGISTRY = {
  /**
   * Intelligence Layer Configurations
   */
  intelligence: {
    stability: STABILITY_CONFIG,
    opportunities: OPPORTUNITY_CONFIG,
    simulations: SIMULATION_CONFIG,
    attributions: ATTRIBUTION_CONFIG
  },

  /**
   * Registry Metadata
   */
  metadata: {
    version: '2.0.0',
    lastUpdated: '2025-01-15',
    description: 'ASO Formula Registry with Intelligence Layer support',
    changelog: [
      {
        version: '2.0.0',
        date: '2025-01-15',
        changes: [
          'Added Stability Score configuration (weights, CV normalization, interpretation bands)',
          'Added Opportunity Map configuration (thresholds for 8 categories, scoring multipliers)',
          'Added Outcome Simulation configuration (presets, caps, confidence rules)',
          'Added Anomaly Attribution configuration (11 pattern rules, confidence weights)',
          'Established registry architecture for future expansion'
        ]
      },
      {
        version: '1.0.0',
        date: '2025-01-10',
        changes: [
          'Initial two-path conversion model implementation',
          'Derived KPI calculations',
          'Basic formula registry structure'
        ]
      }
    ]
  }
} as const;

// =====================================================
// TYPE EXPORTS
// =====================================================

export type StabilityInterpretation = typeof STABILITY_CONFIG.interpretationBands[number]['label'];
export type OpportunityPriority = 'high' | 'medium' | 'low';
export type SimulationConfidence = 'high' | 'medium' | 'low';
export type AttributionCategory = keyof typeof ATTRIBUTION_CONFIG.categories;
export type AttributionConfidence = keyof typeof ATTRIBUTION_CONFIG.confidenceWeights;

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get interpretation for a stability score
 */
export function getStabilityInterpretation(score: number) {
  const band = STABILITY_CONFIG.interpretationBands.find(
    b => score >= b.min && score <= b.max
  );
  return band || STABILITY_CONFIG.interpretationBands[STABILITY_CONFIG.interpretationBands.length - 1];
}

/**
 * Get opportunity priority based on score
 */
export function getOpportunityPriority(score: number): OpportunityPriority {
  if (score >= OPPORTUNITY_CONFIG.priorityThresholds.high) return 'high';
  if (score >= OPPORTUNITY_CONFIG.priorityThresholds.medium) return 'medium';
  return 'low';
}

/**
 * Get simulation confidence for a scenario ID
 */
export function getSimulationConfidence(scenarioId: string): SimulationConfidence {
  if (SIMULATION_CONFIG.confidenceRules.high.includes(scenarioId)) return 'high';
  if (SIMULATION_CONFIG.confidenceRules.medium.includes(scenarioId)) return 'medium';
  return 'low';
}

/**
 * Validate formula registry integrity
 */
export function validateFormulaRegistry(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate stability weights sum to 1.0
  const weightSum = Object.values(STABILITY_CONFIG.weights).reduce((a, b) => a + b, 0);
  if (Math.abs(weightSum - 1.0) > 0.001) {
    errors.push(`Stability weights sum to ${weightSum}, expected 1.0`);
  }

  // Validate interpretation bands are sorted and non-overlapping
  const bands = STABILITY_CONFIG.interpretationBands;
  for (let i = 0; i < bands.length - 1; i++) {
    if (bands[i].min <= bands[i + 1].max) {
      errors.push(`Interpretation bands overlap: ${bands[i].label} and ${bands[i + 1].label}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
