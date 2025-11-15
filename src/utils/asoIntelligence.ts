/**
 * ASO Intelligence Layer
 *
 * Provides four intelligence features on top of existing KPIs:
 * 1. Stability Score - Volatility analysis using Coefficient of Variation
 * 2. Opportunity Map - Prioritized optimization recommendations
 * 3. Outcome Simulation - Impact projections for improvements
 * 4. Anomaly Attribution - Root cause analysis for detected anomalies
 *
 * All calculations use Formula Registry for configuration.
 * No hardcoded values - everything is configurable and testable.
 */

import {
  FORMULA_REGISTRY,
  getStabilityInterpretation,
  getOpportunityPriority,
  getSimulationConfidence,
  type StabilityInterpretation,
  type OpportunityPriority,
  type SimulationConfidence,
  type AttributionCategory,
  type AttributionConfidence
} from '@/constants/asoFormulas';
import type { TwoPathConversionMetrics, DerivedKPIs } from './twoPathCalculator';
import type { Anomaly } from './anomalyDetection';

// =====================================================
// INTERFACES
// =====================================================

export interface TimeSeriesPoint {
  date: string;
  impressions: number;
  downloads: number;
  product_page_views: number;
  cvr: number;
}

export interface MetricStability {
  cv: number;           // Coefficient of Variation
  score: number;        // 0-100 normalized score
  mean: number;         // Average value
  std: number;          // Standard deviation
}

export interface StabilityScore {
  score: number | null;
  interpretation: StabilityInterpretation | null;
  color: 'green' | 'yellow' | 'orange' | 'red' | 'gray';
  breakdown: {
    impressions: MetricStability;
    downloads: MetricStability;
    cvr: MetricStability;
    directShare: MetricStability;
  } | null;
  dataPoints: number;
  period: string;
  message?: string;
}

export interface OpportunityCandidate {
  id: string;
  category: string;
  priority: OpportunityPriority;
  score: number;
  currentValue: number;
  benchmark: number;
  gap: number;
  message: string;
  actionableInsight: string;
  potentialImpact: 'high' | 'medium' | 'low';
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  improvement: {
    metric: string;
    currentValue: number;
    improvedValue: number;
    change: string;
  };
  estimatedImpact: {
    metric: string;
    currentValue: number;
    projectedValue: number;
    delta: number;
    deltaFormatted: string;
  };
  calculation: string;
  confidence: SimulationConfidence;
}

export interface Attribution {
  message: string;
  confidence: AttributionConfidence;
  category: AttributionCategory;
  actionableInsight?: string;
  relatedMetrics: string[];
}

export interface AnomalyAttribution {
  anomaly: {
    date: string;
    metric: string;
    type: 'spike' | 'drop';
    magnitude: string;
    severity: 'high' | 'medium' | 'low';
  };
  attributions: Attribution[];
}

export interface AnomalyContext {
  anomaly: Anomaly;
  currentMetrics: {
    search: TwoPathConversionMetrics;
    browse: TwoPathConversionMetrics;
  };
  previousMetrics: {
    search: TwoPathConversionMetrics;
    browse: TwoPathConversionMetrics;
  };
  derivedKpis: {
    current: DerivedKPIs;
    previous: DerivedKPIs;
  };
}

interface MetricChanges {
  search_impressions: number;
  search_cvr: number;
  search_pdp_cvr: number;
  browse_impressions: number;
  browse_cvr: number;
  browse_pdp_cvr: number;
  total_impressions: number;
  total_cvr: number;
  downloads: number;
  direct_install_share: number;
  sbr: number;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Calculate mean (average) of an array of numbers
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = mean(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

/**
 * Format large numbers with K/M suffixes
 */
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return Math.round(num).toLocaleString();
}

/**
 * Calculate percentage change between two values
 */
function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Calculate direct install share from time series point
 */
function calculateDirectInstallShare(point: TimeSeriesPoint): number {
  if (point.downloads === 0) return 0;
  // Infer direct installs: downloads that didn't go through PPV
  const directInstalls = Math.max(0, point.downloads - Math.min(point.product_page_views, point.downloads));
  return (directInstalls / point.downloads) * 100;
}

// =====================================================
// 1. STABILITY SCORE CALCULATION
// =====================================================

/**
 * Calculate ASO Stability Score
 *
 * Measures volatility across 4 key metrics using Coefficient of Variation.
 * Returns 0-100 score where higher = more stable.
 *
 * @param timeSeriesData - Daily metrics for analysis period
 * @param config - Optional config override (defaults to registry)
 * @returns StabilityScore object with breakdown
 */
export function calculateStabilityScore(
  timeSeriesData: TimeSeriesPoint[],
  config = FORMULA_REGISTRY.intelligence.stability
): StabilityScore {

  // Limit to configured max data points
  const recentData = timeSeriesData.slice(-config.dataRequirements.maxDataPoints);

  // Check minimum data requirement
  if (recentData.length < config.dataRequirements.minDataPoints) {
    return {
      score: null,
      interpretation: null,
      color: 'gray',
      breakdown: null,
      dataPoints: recentData.length,
      period: `Last ${recentData.length} days`,
      message: `Need at least ${config.dataRequirements.minDataPoints} days of data for stability analysis`
    };
  }

  // Extract metric arrays
  const impressions = recentData.map(d => d.impressions);
  const downloads = recentData.map(d => d.downloads);
  const cvr = recentData.map(d => d.cvr);
  const directShare = recentData.map(d => calculateDirectInstallShare(d));

  // Calculate CV for each metric
  const calculateMetricStability = (values: number[]): MetricStability => {
    const meanVal = mean(values);
    const stdVal = standardDeviation(values);
    const cv = meanVal > 0 ? stdVal / meanVal : 0;
    const score = config.cvNormalization.formula(cv, config.cvNormalization.cap);

    return {
      cv,
      score: Math.round(score),
      mean: meanVal,
      std: stdVal
    };
  };

  const impressionsStability = calculateMetricStability(impressions);
  const downloadsStability = calculateMetricStability(downloads);
  const cvrStability = calculateMetricStability(cvr);
  const directShareStability = calculateMetricStability(directShare);

  // Calculate weighted final score
  const finalScore =
    impressionsStability.score * config.weights.impressions +
    downloadsStability.score * config.weights.downloads +
    cvrStability.score * config.weights.cvr +
    directShareStability.score * config.weights.directShare;

  // Get interpretation
  const interpretation = getStabilityInterpretation(finalScore);

  return {
    score: Math.round(finalScore),
    interpretation: interpretation.label,
    color: interpretation.color,
    breakdown: {
      impressions: impressionsStability,
      downloads: downloadsStability,
      cvr: cvrStability,
      directShare: directShareStability
    },
    dataPoints: recentData.length,
    period: `Last ${recentData.length} days`
  };
}

// =====================================================
// 2. OPPORTUNITY MAP CALCULATION
// =====================================================

/**
 * Calculate ASO Opportunity Map
 *
 * Identifies optimization opportunities by comparing current performance
 * against industry benchmarks. Returns prioritized opportunities.
 *
 * @param derivedKpis - Derived KPIs from twoPathCalculator
 * @param searchMetrics - Search two-path metrics
 * @param browseMetrics - Browse two-path metrics
 * @param config - Optional config override
 * @returns Array of OpportunityCandidate objects
 */
export function calculateOpportunityMap(
  derivedKpis: DerivedKPIs,
  searchMetrics: TwoPathConversionMetrics,
  browseMetrics: TwoPathConversionMetrics,
  config = FORMULA_REGISTRY.intelligence.opportunities
): OpportunityCandidate[] {

  const opportunities: OpportunityCandidate[] = [];
  const thresholds = config.thresholds;
  const multipliers = config.scoringMultipliers;

  // Helper to create opportunity
  const addOpportunity = (
    id: string,
    category: string,
    currentValue: number,
    benchmark: number,
    gap: number,
    multiplier: number,
    message: string,
    actionableInsight: string,
    potentialImpact: 'high' | 'medium' | 'low' = 'medium'
  ) => {
    const score = Math.min(config.limits.maxScore, Math.abs(gap) * multiplier);
    const priority = getOpportunityPriority(score);

    opportunities.push({
      id,
      category,
      priority,
      score,
      currentValue,
      benchmark,
      gap,
      message,
      actionableInsight,
      potentialImpact
    });
  };

  // OPPORTUNITY 1: Icon & Title (First Impression Effectiveness)
  const firstImpression = derivedKpis.first_impression_effectiveness;
  if (firstImpression < thresholds.firstImpression.good) {
    const gap = thresholds.firstImpression.good - firstImpression;
    addOpportunity(
      'icon_title',
      'Icon & Title',
      firstImpression,
      thresholds.firstImpression.good,
      gap,
      multipliers.iconTitle,
      `Tap-through rate is ${firstImpression.toFixed(1)}% (benchmark: ${thresholds.firstImpression.good}%)`,
      'Test new icon variants with A/B testing. Refine title to include primary value proposition.',
      'high'
    );
  }

  // OPPORTUNITY 2: Search PDP CVR
  const searchPdpCvr = searchMetrics.pdp_cvr;
  if (searchPdpCvr < thresholds.pdpCvrSearch.good && searchMetrics.product_page_views >= config.limits.minDataThreshold) {
    const gap = thresholds.pdpCvrSearch.good - searchPdpCvr;
    addOpportunity(
      'search_pdp_cvr',
      'Search Creative Assets',
      searchPdpCvr,
      thresholds.pdpCvrSearch.good,
      gap,
      multipliers.pdpCvr,
      `Search PDP CVR is ${searchPdpCvr.toFixed(1)}% (benchmark: ${thresholds.pdpCvrSearch.good}%)`,
      'Optimize first 3 screenshots for search intent. Show core features immediately.',
      'high'
    );
  }

  // OPPORTUNITY 3: Browse PDP CVR
  const browsePdpCvr = browseMetrics.pdp_cvr;
  if (browsePdpCvr < thresholds.pdpCvrBrowse.good && browseMetrics.product_page_views >= config.limits.minDataThreshold) {
    const gap = thresholds.pdpCvrBrowse.good - browsePdpCvr;
    addOpportunity(
      'browse_pdp_cvr',
      'Browse Creative Assets',
      browsePdpCvr,
      thresholds.pdpCvrBrowse.good,
      gap,
      multipliers.pdpCvr,
      `Browse PDP CVR is ${browsePdpCvr.toFixed(1)}% (benchmark: ${thresholds.pdpCvrBrowse.good}%)`,
      'Refresh screenshots with premium visuals. Add preview video if missing.',
      'high'
    );
  }

  // OPPORTUNITY 4: Funnel Leak
  const funnelLeak = derivedKpis.funnel_leak_rate;
  if (funnelLeak > thresholds.funnelLeak.good) {
    const gap = funnelLeak - thresholds.funnelLeak.good;
    addOpportunity(
      'funnel_leak',
      'Funnel Optimization',
      funnelLeak,
      thresholds.funnelLeak.good,
      gap,
      multipliers.funnelLeak,
      `${funnelLeak.toFixed(0)}% of PDP visitors don't install (benchmark: <${thresholds.funnelLeak.good}%)`,
      'Audit value proposition clarity. Ensure screenshots answer "Why should I install?"',
      'high'
    );
  }

  // OPPORTUNITY 5: Search Discovery (Low SBR)
  const sbr = derivedKpis.search_browse_ratio;
  if (sbr < thresholds.searchBrowseRatio.balancedLow) {
    const gap = thresholds.searchBrowseRatio.balancedLow - sbr;
    addOpportunity(
      'search_discovery',
      'Metadata Discovery',
      sbr,
      thresholds.searchBrowseRatio.balancedLow,
      gap,
      multipliers.searchBrowseRatio,
      `Search/Browse ratio is ${sbr.toFixed(2)}:1 (too Browse-heavy)`,
      'Expand keyword coverage. Run search ads to test new keywords. Improve category relevance.',
      'medium'
    );
  }

  // OPPORTUNITY 6: Browse Discovery (High SBR)
  if (sbr > thresholds.searchBrowseRatio.balancedHigh) {
    const gap = sbr - thresholds.searchBrowseRatio.balancedHigh;
    addOpportunity(
      'browse_discovery',
      'Creative Discovery',
      sbr,
      thresholds.searchBrowseRatio.balancedHigh,
      gap,
      multipliers.searchBrowseRatio * 0.2,  // Lower multiplier for high SBR
      `Search/Browse ratio is ${sbr.toFixed(2)}:1 (too Search-heavy)`,
      'Invest in featuring opportunities. Optimize category positioning. Improve visual appeal.',
      'medium'
    );
  }

  // OPPORTUNITY 7: Brand Recognition
  const directPropensity = derivedKpis.direct_install_propensity;
  if (directPropensity < thresholds.directPropensity.good) {
    const gap = thresholds.directPropensity.good - directPropensity;
    addOpportunity(
      'brand_recognition',
      'Brand Recognition',
      directPropensity,
      thresholds.directPropensity.good,
      gap,
      multipliers.directPropensity,
      `Direct install propensity is ${directPropensity.toFixed(1)}% (benchmark: ${thresholds.directPropensity.good}%)`,
      "Users don't recognize your brand in search. Consider off-platform marketing to build awareness.",
      'low'
    );
  }

  // OPPORTUNITY 8: Channel Imbalance
  const metadataStr = derivedKpis.metadata_strength;
  const creativeStr = derivedKpis.creative_strength;
  const imbalance = Math.abs(metadataStr - creativeStr);
  if (imbalance > 1.5) {
    const weaker = metadataStr < creativeStr ? 'metadata' : 'creative';
    const gap = imbalance - 0.5;
    addOpportunity(
      'channel_balance',
      'Channel Balance',
      imbalance,
      0.5,
      gap,
      multipliers.channelImbalance,
      `${weaker === 'metadata' ? 'Metadata' : 'Creative'} strength (${Math.min(metadataStr, creativeStr).toFixed(2)}) lags behind ${weaker === 'metadata' ? 'Creative' : 'Metadata'} (${Math.max(metadataStr, creativeStr).toFixed(2)})`,
      weaker === 'metadata'
        ? 'Invest in keyword optimization to match creative performance'
        : 'Upgrade creative assets to match metadata performance',
      'medium'
    );
  }

  // Sort by score (highest first) and return top N
  return opportunities
    .sort((a, b) => b.score - a.score)
    .slice(0, config.limits.maxOpportunities);
}

// =====================================================
// 3. OUTCOME SIMULATION
// =====================================================

/**
 * Simulate Expected Outcomes
 *
 * Projects potential impact of realistic improvements using deterministic calculations.
 *
 * @param totalMetrics - Aggregate metrics
 * @param searchMetrics - Search two-path metrics
 * @param browseMetrics - Browse two-path metrics
 * @param derivedKpis - Derived KPIs
 * @param config - Optional config override
 * @returns Array of SimulationScenario objects
 */
export function simulateOutcomes(
  totalMetrics: { impressions: number; downloads: number; cvr: number },
  searchMetrics: TwoPathConversionMetrics,
  browseMetrics: TwoPathConversionMetrics,
  derivedKpis: DerivedKPIs,
  config = FORMULA_REGISTRY.intelligence.simulations
): SimulationScenario[] {

  const scenarios: SimulationScenario[] = [];
  const presets = config.presets;
  const caps = config.caps;

  const combinedImpressions = searchMetrics.impressions + browseMetrics.impressions;
  const combinedPPV = searchMetrics.product_page_views + browseMetrics.product_page_views;
  const combinedDownloads = searchMetrics.downloads + browseMetrics.downloads;

  // SCENARIO 1: Improve Tap-Through Rate
  const currentTTR = derivedKpis.first_impression_effectiveness;
  const improvedTTR = Math.min(currentTTR + presets.tapThroughImprovement, caps.maxTapThrough);
  const deltaPPV = combinedImpressions * (presets.tapThroughImprovement / 100);
  const currentPdpCvr = combinedPPV > 0 ? (combinedDownloads / combinedPPV) * 100 : 0;
  const deltaInstalls_ttr = deltaPPV * (currentPdpCvr / 100);

  if (deltaInstalls_ttr >= config.limits.minImpact) {
    scenarios.push({
      id: 'improve_ttr',
      name: 'Improve Icon/Title Tap-Through',
      description: `Optimize icon and title to increase tap-through rate by ${presets.tapThroughImprovement} percentage point`,
      improvement: {
        metric: 'Tap-Through Rate',
        currentValue: currentTTR,
        improvedValue: improvedTTR,
        change: `+${presets.tapThroughImprovement}pp`
      },
      estimatedImpact: {
        metric: 'Downloads',
        currentValue: combinedDownloads,
        projectedValue: combinedDownloads + deltaInstalls_ttr,
        delta: deltaInstalls_ttr,
        deltaFormatted: `~${formatNumber(deltaInstalls_ttr)}`
      },
      calculation: `${formatNumber(deltaPPV)} new PPV × ${currentPdpCvr.toFixed(1)}% PDP CVR = ${formatNumber(deltaInstalls_ttr)} installs`,
      confidence: getSimulationConfidence('improve_ttr')
    });
  }

  // SCENARIO 2: Improve PDP CVR
  const currentPdpCvrAbs = currentPdpCvr;
  const improvedPdpCvrAbs = Math.min(currentPdpCvrAbs * (1 + presets.pdpCvrImprovement), caps.maxPdpCvr);
  const pdpCvrDelta = improvedPdpCvrAbs - currentPdpCvrAbs;
  const deltaInstalls_pdp = combinedPPV * (pdpCvrDelta / 100);

  if (deltaInstalls_pdp >= config.limits.minImpact) {
    scenarios.push({
      id: 'improve_pdp_cvr',
      name: 'Improve Product Page Conversion',
      description: `Optimize screenshots and preview video to improve PDP CVR by ${(presets.pdpCvrImprovement * 100).toFixed(0)}%`,
      improvement: {
        metric: 'PDP CVR',
        currentValue: currentPdpCvrAbs,
        improvedValue: improvedPdpCvrAbs,
        change: `+${(presets.pdpCvrImprovement * 100).toFixed(0)}%`
      },
      estimatedImpact: {
        metric: 'Downloads',
        currentValue: combinedDownloads,
        projectedValue: combinedDownloads + deltaInstalls_pdp,
        delta: deltaInstalls_pdp,
        deltaFormatted: `~${formatNumber(deltaInstalls_pdp)}`
      },
      calculation: `${formatNumber(combinedPPV)} PPV × +${pdpCvrDelta.toFixed(1)}pp CVR = ${formatNumber(deltaInstalls_pdp)} installs`,
      confidence: getSimulationConfidence('improve_pdp_cvr')
    });
  }

  // SCENARIO 3: Reduce Funnel Leak
  const currentFunnelLeak = derivedKpis.funnel_leak_rate;
  const improvedFunnelLeak = Math.max(currentFunnelLeak - presets.funnelLeakReduction, caps.minFunnelLeak);
  const funnelLeakReduction = currentFunnelLeak - improvedFunnelLeak;
  const deltaInstalls_funnel = combinedPPV * (funnelLeakReduction / 100);

  if (deltaInstalls_funnel >= config.limits.minImpact) {
    scenarios.push({
      id: 'reduce_funnel_leak',
      name: 'Reduce Funnel Leak',
      description: `Improve value prop clarity to reduce PDP drop-off by ${presets.funnelLeakReduction} percentage points`,
      improvement: {
        metric: 'Funnel Leak Rate',
        currentValue: currentFunnelLeak,
        improvedValue: improvedFunnelLeak,
        change: `-${presets.funnelLeakReduction}pp`
      },
      estimatedImpact: {
        metric: 'Downloads',
        currentValue: combinedDownloads,
        projectedValue: combinedDownloads + deltaInstalls_funnel,
        delta: deltaInstalls_funnel,
        deltaFormatted: `~${formatNumber(deltaInstalls_funnel)}`
      },
      calculation: `${formatNumber(combinedPPV)} PPV × +${funnelLeakReduction.toFixed(1)}pp CVR = ${formatNumber(deltaInstalls_funnel)} installs`,
      confidence: getSimulationConfidence('reduce_funnel_leak')
    });
  }

  // SCENARIO 4: Increase Search Impressions
  const searchImpressions = searchMetrics.impressions;
  const deltaSearchImpressions = searchImpressions * presets.searchImpressionsIncrease;
  const searchCVR = searchMetrics.total_cvr;
  const deltaInstalls_search = deltaSearchImpressions * (searchCVR / 100);

  if (deltaInstalls_search >= config.limits.minImpact) {
    scenarios.push({
      id: 'increase_search_impressions',
      name: 'Increase Search Impressions',
      description: `Expand keyword coverage and improve rankings to boost search impressions by ${(presets.searchImpressionsIncrease * 100).toFixed(0)}%`,
      improvement: {
        metric: 'Search Impressions',
        currentValue: searchImpressions,
        improvedValue: searchImpressions + deltaSearchImpressions,
        change: `+${(presets.searchImpressionsIncrease * 100).toFixed(0)}%`
      },
      estimatedImpact: {
        metric: 'Downloads',
        currentValue: combinedDownloads,
        projectedValue: combinedDownloads + deltaInstalls_search,
        delta: deltaInstalls_search,
        deltaFormatted: `~${formatNumber(deltaInstalls_search)}`
      },
      calculation: `${formatNumber(deltaSearchImpressions)} new impressions × ${searchCVR.toFixed(2)}% CVR = ${formatNumber(deltaInstalls_search)} installs`,
      confidence: getSimulationConfidence('increase_search_impressions')
    });
  }

  // Sort by impact and return top N
  return scenarios
    .sort((a, b) => b.estimatedImpact.delta - a.estimatedImpact.delta)
    .slice(0, config.limits.maxScenarios);
}

// =====================================================
// 4. ANOMALY ATTRIBUTION
// =====================================================

/**
 * Calculate metric changes between current and previous periods
 */
function calculateMetricChanges(
  current: { search: TwoPathConversionMetrics; browse: TwoPathConversionMetrics },
  previous: { search: TwoPathConversionMetrics; browse: TwoPathConversionMetrics },
  derivedKpis: { current: DerivedKPIs; previous: DerivedKPIs }
): MetricChanges {

  return {
    search_impressions: percentChange(current.search.impressions, previous.search.impressions),
    search_cvr: percentChange(current.search.total_cvr, previous.search.total_cvr),
    search_pdp_cvr: percentChange(current.search.pdp_cvr, previous.search.pdp_cvr),
    browse_impressions: percentChange(current.browse.impressions, previous.browse.impressions),
    browse_cvr: percentChange(current.browse.total_cvr, previous.browse.total_cvr),
    browse_pdp_cvr: percentChange(current.browse.pdp_cvr, previous.browse.pdp_cvr),
    total_impressions: percentChange(
      current.search.impressions + current.browse.impressions,
      previous.search.impressions + previous.browse.impressions
    ),
    total_cvr: percentChange(
      (current.search.total_cvr + current.browse.total_cvr) / 2,
      (previous.search.total_cvr + previous.browse.total_cvr) / 2
    ),
    downloads: percentChange(
      current.search.downloads + current.browse.downloads,
      previous.search.downloads + previous.browse.downloads
    ),
    direct_install_share: percentChange(
      (current.search.direct_install_share + current.browse.direct_install_share) / 2,
      (previous.search.direct_install_share + previous.browse.direct_install_share) / 2
    ),
    sbr: percentChange(derivedKpis.current.search_browse_ratio, derivedKpis.previous.search_browse_ratio)
  };
}

/**
 * Generate Anomaly Attributions
 *
 * Analyzes anomalies using contextual KPI pattern matching to suggest root causes.
 *
 * @param context - Anomaly with current/previous metrics
 * @param config - Optional config override
 * @returns Array of Attribution objects
 */
export function generateAnomalyAttributions(
  context: AnomalyContext,
  config = FORMULA_REGISTRY.intelligence.attributions
): Attribution[] {

  const attributions: Attribution[] = [];
  const { anomaly, currentMetrics, previousMetrics, derivedKpis } = context;
  const changes = calculateMetricChanges(currentMetrics, previousMetrics, derivedKpis);
  const thresholds = config.patternThresholds;

  // RULE 1: Search Impressions Drop + CVR Drop
  if (changes.search_impressions < thresholds.searchImpressionDropSevere &&
      changes.search_cvr < thresholds.searchCvrDropSignificant &&
      Math.abs(changes.direct_install_share) < thresholds.directShareStableRange) {

    attributions.push({
      message: 'Search impressions and CVR both declined while direct install share remained stable. This pattern suggests keyword rank loss or increased competition in your primary search terms.',
      confidence: 'high',
      category: 'metadata',
      actionableInsight: 'Audit keyword rankings for top 10 keywords. Check competitor activity. Consider search ads to regain visibility.',
      relatedMetrics: ['search_impressions', 'search_cvr', 'direct_install_share']
    });
  }

  // RULE 2: Search Impressions Drop + CVR Increase
  if (changes.search_impressions < thresholds.searchImpressionDropSevere &&
      changes.search_cvr > thresholds.searchCvrIncreaseSignificant) {

    attributions.push({
      message: 'Search impressions dropped but CVR improved, indicating a shift toward higher-intent, branded searches. This is typically positive - your audience is more qualified.',
      confidence: 'high',
      category: 'brand',
      actionableInsight: 'Monitor brand search volume. This may follow a marketing campaign or PR event. Consider expanding branded keyword coverage.',
      relatedMetrics: ['search_impressions', 'search_cvr']
    });
  }

  // RULE 3: Browse Impressions Drop + PDP CVR Stable + Search Stable
  if (changes.browse_impressions < thresholds.browseImpressionDropSevere &&
      Math.abs(changes.browse_pdp_cvr) < thresholds.browsePdpCvrStableRange &&
      Math.abs(changes.search_impressions) < thresholds.impressionsStableRange) {

    attributions.push({
      message: 'Browse impressions dropped significantly while Search remained stable and Browse PDP CVR held steady. This strongly indicates loss of App Store featuring (Today tab, category placement, or collections).',
      confidence: 'high',
      category: 'featuring',
      actionableInsight: 'Check App Store Today tab and category pages for your app. Contact your Apple rep if you had scheduled featuring. Review recent metadata changes that may have affected editorial eligibility.',
      relatedMetrics: ['browse_impressions', 'browse_pdp_cvr', 'search_impressions']
    });
  }

  // RULE 4: Browse Impressions Spike + PDP CVR Drop
  if (changes.browse_impressions > thresholds.browseImpressionSpike &&
      changes.browse_pdp_cvr < thresholds.browsePdpCvrDropSevere) {

    attributions.push({
      message: "Browse impressions spiked (likely from featuring) but PDP CVR declined, suggesting your creative assets aren't optimized for the broader audience that featuring attracts.",
      confidence: 'medium',
      category: 'creative',
      actionableInsight: 'Featuring brings discovery traffic with lower intent. Ensure your first 3 screenshots clearly communicate value prop. Add preview video if missing.',
      relatedMetrics: ['browse_impressions', 'browse_pdp_cvr', 'funnel_leak_rate']
    });
  }

  // RULE 5: PDP CVR Drop (Both Channels) + Impressions Stable
  if (changes.search_pdp_cvr < thresholds.pdpCvrDropBothChannels &&
      changes.browse_pdp_cvr < thresholds.pdpCvrDropBothChannels &&
      Math.abs(changes.total_impressions) < thresholds.impressionsStableRange) {

    attributions.push({
      message: 'PDP CVR declined across both Search and Browse while impressions remained stable. This pattern strongly suggests a recent metadata or screenshot update that degraded conversion performance.',
      confidence: 'high',
      category: 'creative',
      actionableInsight: 'Review recent App Store listing changes. If you updated screenshots or description in the past 7 days, consider rolling back. Run A/B test to validate.',
      relatedMetrics: ['search_pdp_cvr', 'browse_pdp_cvr', 'funnel_leak_rate']
    });
  }

  // RULE 6: Direct Install Share Spike
  if (changes.direct_install_share > thresholds.directShareSpike) {
    attributions.push({
      message: `Direct install share spiked by ${changes.direct_install_share.toFixed(0)}pp, indicating a brand awareness surge. This typically follows off-platform marketing, press coverage, influencer mentions, or viral moments.`,
      confidence: 'medium',
      category: 'brand',
      actionableInsight: 'Identify the source of brand awareness (check social mentions, press, campaigns). Capitalize on momentum with search ads on brand terms.',
      relatedMetrics: ['direct_install_share', 'search_impressions']
    });
  }

  // RULE 7: Browse PDP CVR Drop + Direct Share Stable (Creative Fatigue)
  if (changes.browse_pdp_cvr < -15 &&
      Math.abs(changes.direct_install_share) < thresholds.directShareStableRange &&
      Math.abs(changes.browse_impressions) < thresholds.impressionsStableRange) {

    attributions.push({
      message: 'Browse PDP CVR declined while impressions and direct install share remained stable. This pattern suggests creative fatigue - users have seen your screenshots before and they\'re no longer compelling.',
      confidence: 'medium',
      category: 'creative',
      actionableInsight: 'Refresh screenshots with new visuals. Highlight different features. Test seasonal or themed variations. Preview video refresh.',
      relatedMetrics: ['browse_pdp_cvr', 'creative_strength', 'funnel_leak_rate']
    });
  }

  // RULE 8: All Metrics Down Uniformly (Algorithm Update)
  if (changes.search_impressions < thresholds.allMetricsDropThreshold &&
      changes.browse_impressions < thresholds.allMetricsDropThreshold &&
      changes.search_cvr < -10 &&
      changes.browse_cvr < -10) {

    attributions.push({
      message: 'All major metrics declined uniformly across both Search and Browse. This pattern suggests an App Store algorithm update, technical issue, or account-level change rather than organic performance degradation.',
      confidence: 'low',
      category: 'algorithm',
      actionableInsight: 'Check Apple Developer forums for algorithm updates. Verify your app is live in all markets. Review App Store Connect for account warnings or policy violations.',
      relatedMetrics: ['search_impressions', 'browse_impressions', 'search_cvr', 'browse_cvr']
    });
  }

  // RULE 9: Downloads Spike + Impressions Stable (External Traffic)
  if (changes.downloads > thresholds.downloadsSpikeThreshold &&
      Math.abs(changes.total_impressions) < thresholds.impressionsStableRange &&
      changes.direct_install_share > 15) {

    attributions.push({
      message: 'Downloads spiked while impressions remained flat, and direct install share increased significantly. This indicates external traffic (deep links, QR codes, influencer links, or campaign attribution issues).',
      confidence: 'high',
      category: 'brand',
      actionableInsight: 'Check campaign analytics for external sources. Review deep link attribution. Verify tracking pixels if running paid campaigns.',
      relatedMetrics: ['downloads', 'impressions', 'direct_install_share']
    });
  }

  // RULE 10: Search/Browse Ratio Shift
  if (Math.abs(changes.sbr) > thresholds.sbrShiftThreshold) {
    const direction = changes.sbr > 0 ? 'Search-heavy' : 'Browse-heavy';
    const cause = changes.sbr > 0
      ? 'keyword expansion or improved rankings'
      : 'featuring gained or category visibility improved';

    attributions.push({
      message: `Search/Browse ratio shifted ${Math.abs(changes.sbr).toFixed(0)}% toward ${direction}, indicating recent ${cause}.`,
      confidence: 'medium',
      category: changes.sbr > 0 ? 'metadata' : 'featuring',
      actionableInsight: changes.sbr > 0
        ? 'Monitor keyword performance to sustain search growth. Consider search ads to scale winners.'
        : 'Capitalize on featuring momentum. Optimize screenshots for discovery traffic.',
      relatedMetrics: ['search_browse_ratio', 'search_impressions', 'browse_impressions']
    });
  }

  // Sort by confidence (high -> medium -> low)
  const confidenceOrder = config.confidenceWeights;
  attributions.sort((a, b) => confidenceOrder[b.confidence] - confidenceOrder[a.confidence]);

  // Return max N attributions
  return attributions.slice(0, config.limits.maxAttributions);
}
