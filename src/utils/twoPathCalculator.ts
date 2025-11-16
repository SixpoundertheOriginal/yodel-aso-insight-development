/**
 * Two-Path Conversion Calculator
 *
 * Models Apple App Store's dual conversion paths:
 * 1. Direct Install: Impression → GET button → Install
 * 2. PDP-Driven Install: Impression → PPV → Install
 *
 * Critical for accurate ASO analysis as Apple allows both paths,
 * unlike traditional linear funnels.
 */

export interface TwoPathConversionMetrics {
  // Base metrics (from BigQuery)
  impressions: number;
  product_page_views: number;
  downloads: number;

  // Two-path breakdown
  pdp_driven_installs: number;      // Installs through Product Page
  direct_installs: number;           // Installs without PDP visit

  // Conversion rates
  total_cvr: number;                 // Downloads ÷ Impressions
  pdp_cvr: number;                   // PDP_Installs ÷ PPV
  direct_cvr: number;                // Direct_Installs ÷ (Impressions - PPV)

  // Install share breakdown
  pdp_install_share: number;         // % of installs through PDP
  direct_install_share: number;      // % of installs directly

  // First impression effectiveness
  tap_through_rate: number;          // PPV ÷ Impressions

  // Funnel metrics
  funnel_leak_rate: number;          // (1 - PDP_Installs / PPV) × 100
}

export interface DerivedKPIs {
  // Search/Browse performance indicators
  search_browse_ratio: number;              // Search / Browse traffic

  // Effectiveness metrics
  first_impression_effectiveness: number;   // PPV / Impressions %

  // Channel strength scores
  metadata_strength: number;                // Search CVR × Search Install Share
  creative_strength: number;                // Browse CVR × Browse Install Share

  // Funnel health
  funnel_leak_rate: number;                 // PDP drop-off rate

  // Intent signals
  direct_install_propensity: number;        // Search direct install tendency
}

/**
 * Safe division utility to prevent NaN and Infinity
 */
function safeDivide(numerator: number, denominator: number, asPercentage = true): number {
  if (denominator === 0 || !isFinite(denominator)) return 0;
  const result = numerator / denominator;
  if (!isFinite(result)) return 0;
  return asPercentage ? result * 100 : result;
}

/**
 * Calculate two-path conversion metrics from aggregated data
 *
 * @param impressions - Total impressions
 * @param ppv - Total product page views
 * @param downloads - Total downloads/installs
 * @returns Complete two-path metrics
 */
export function calculateTwoPathMetrics(
  impressions: number,
  ppv: number,
  downloads: number
): TwoPathConversionMetrics {

  // Validation: ensure non-negative values
  if (impressions < 0 || ppv < 0 || downloads < 0) {
    console.error('Negative metrics detected:', { impressions, ppv, downloads });
    return getZeroMetrics();
  }

  // Edge case: No data
  if (impressions === 0 && ppv === 0 && downloads === 0) {
    return getZeroMetrics();
  }

  /**
   * TWO-PATH INFERENCE LOGIC
   *
   * Apple App Store allows:
   * - Direct installs: User taps GET in search results → Install
   * - PDP installs: User visits product page → Install
   *
   * Key insight: Downloads can exceed PPV in Search traffic
   * This is NORMAL and indicates high intent.
   */

  // Conservative approach: PDP-driven installs cannot exceed PPV
  const pdp_driven_installs = Math.min(ppv, downloads);

  // Remaining downloads are direct (bypassed PDP)
  const direct_installs = Math.max(0, downloads - pdp_driven_installs);

  // Sanity check: accounting should balance
  if (Math.abs((pdp_driven_installs + direct_installs) - downloads) > 0.01) {
    console.warn('Install accounting mismatch:', {
      pdp: pdp_driven_installs,
      direct: direct_installs,
      total: downloads,
      sum: pdp_driven_installs + direct_installs,
      delta: Math.abs((pdp_driven_installs + direct_installs) - downloads)
    });
  }

  // Calculate conversion rates
  const total_cvr = safeDivide(downloads, impressions);
  const pdp_cvr = safeDivide(pdp_driven_installs, ppv);

  // Direct CVR: installs from impressions that didn't result in PPV
  const impressions_without_ppv = Math.max(0, impressions - ppv);
  const direct_cvr = safeDivide(direct_installs, impressions_without_ppv);

  // Install share breakdown
  const pdp_install_share = safeDivide(pdp_driven_installs, downloads);
  const direct_install_share = safeDivide(direct_installs, downloads);

  // First impression effectiveness
  const tap_through_rate = safeDivide(ppv, impressions);

  // Funnel leak rate: % of PPV visitors who don't install
  const funnel_leak_rate = ppv > 0
    ? (1 - (pdp_driven_installs / ppv)) * 100
    : 0;

  return {
    impressions,
    product_page_views: ppv,
    downloads,
    pdp_driven_installs,
    direct_installs,
    total_cvr,
    pdp_cvr,
    direct_cvr,
    pdp_install_share,
    direct_install_share,
    tap_through_rate,
    funnel_leak_rate
  };
}

/**
 * Calculate two-path metrics from raw BigQuery data array
 *
 * @param data - Array of BigQuery data points
 * @returns Two-path metrics
 */
export function calculateTwoPathMetricsFromData(data: any[]): TwoPathConversionMetrics {
  if (!data || data.length === 0) {
    return getZeroMetrics();
  }

  // Aggregate totals
  const totals = data.reduce((acc, row) => ({
    impressions: acc.impressions + (row.impressions || 0),
    product_page_views: acc.product_page_views + (row.product_page_views || 0),
    downloads: acc.downloads + (row.downloads || row.installs || 0)
  }), { impressions: 0, product_page_views: 0, downloads: 0 });

  return calculateTwoPathMetrics(
    totals.impressions,
    totals.product_page_views,
    totals.downloads
  );
}

/**
 * Calculate derived KPIs from Search and Browse metrics
 *
 * @param searchMetrics - Two-path metrics for Search traffic
 * @param browseMetrics - Two-path metrics for Browse traffic
 * @returns Derived business intelligence KPIs
 */
export function calculateDerivedKPIs(
  searchMetrics: TwoPathConversionMetrics,
  browseMetrics: TwoPathConversionMetrics
): DerivedKPIs {

  const totalImpressions = searchMetrics.impressions + browseMetrics.impressions;
  const totalPPV = searchMetrics.product_page_views + browseMetrics.product_page_views;
  const totalDownloads = searchMetrics.downloads + browseMetrics.downloads;

  // 1. Search/Browse Ratio (SBR)
  // Higher = metadata-driven, Lower = creative-driven
  const search_browse_ratio = browseMetrics.impressions > 0
    ? searchMetrics.impressions / browseMetrics.impressions
    : searchMetrics.impressions > 0 ? 999 : 0; // 999 = "infinite" (no Browse data)

  // 2. First Impression Effectiveness
  // % of users who tap through to PDP (icon + title effectiveness)
  const first_impression_effectiveness = safeDivide(totalPPV, totalImpressions);

  // 3. Metadata Strength Score
  // Search CVR weighted by Search install contribution
  const searchInstallShare = totalDownloads > 0
    ? searchMetrics.downloads / totalDownloads
    : 0;
  const metadata_strength = (searchMetrics.total_cvr / 100) * searchInstallShare * 100;

  // 4. Creative Strength Score
  // Browse CVR weighted by Browse install contribution
  const browseInstallShare = totalDownloads > 0
    ? browseMetrics.downloads / totalDownloads
    : 0;
  const creative_strength = (browseMetrics.total_cvr / 100) * browseInstallShare * 100;

  // 5. Funnel Leak Rate (combined)
  const totalPdpInstalls = searchMetrics.pdp_driven_installs + browseMetrics.pdp_driven_installs;
  const funnel_leak_rate = totalPPV > 0
    ? (1 - (totalPdpInstalls / totalPPV)) * 100
    : 0;

  // 6. Direct Install Propensity (Search-specific)
  // How often Search users skip PDP (high intent signal)
  const direct_install_propensity = searchMetrics.downloads > 0
    ? safeDivide(searchMetrics.direct_installs, searchMetrics.downloads)
    : 0;

  return {
    search_browse_ratio,
    first_impression_effectiveness,
    metadata_strength,
    creative_strength,
    funnel_leak_rate,
    direct_install_propensity
  };
}

/**
 * Validate two-path metrics for data quality
 *
 * @param metrics - Two-path metrics to validate
 * @param trafficSource - 'search' or 'browse'
 * @returns Validation result with warnings
 */
export function validateTwoPathMetrics(
  metrics: TwoPathConversionMetrics,
  trafficSource: 'search' | 'browse'
): { isValid: boolean; warnings: string[] } {

  const warnings: string[] = [];

  // Browse should have minimal direct installs
  if (trafficSource === 'browse' && metrics.direct_install_share > 10) {
    warnings.push(
      `Browse direct install share (${metrics.direct_install_share.toFixed(0)}%) is unusually high. Expected < 10%.`
    );
  }

  // CVR should not exceed realistic thresholds
  if (metrics.total_cvr > 30) {
    warnings.push(
      `Total CVR (${metrics.total_cvr.toFixed(1)}%) exceeds typical range (0-30%). Verify data accuracy.`
    );
  }

  // Tap-through rate sanity check
  if (metrics.tap_through_rate > 100) {
    warnings.push(
      `Tap-through rate > 100% indicates data quality issue.`
    );
  }

  // PDP CVR should be reasonable
  if (metrics.pdp_cvr > 100) {
    warnings.push(
      `PDP CVR > 100% indicates data quality issue.`
    );
  }

  // Direct CVR sanity check
  if (metrics.direct_cvr > 100) {
    warnings.push(
      `Direct CVR > 100% indicates data quality issue.`
    );
  }

  // Install shares should sum to 100%
  const totalShare = metrics.pdp_install_share + metrics.direct_install_share;
  if (Math.abs(totalShare - 100) > 1 && metrics.downloads > 0) {
    warnings.push(
      `Install shares don't sum to 100% (${totalShare.toFixed(1)}%).`
    );
  }

  return {
    isValid: warnings.length === 0,
    warnings
  };
}

/**
 * Get zero-initialized metrics (for edge cases)
 */
function getZeroMetrics(): TwoPathConversionMetrics {
  return {
    impressions: 0,
    product_page_views: 0,
    downloads: 0,
    pdp_driven_installs: 0,
    direct_installs: 0,
    total_cvr: 0,
    pdp_cvr: 0,
    direct_cvr: 0,
    pdp_install_share: 0,
    direct_install_share: 0,
    tap_through_rate: 0,
    funnel_leak_rate: 0
  };
}
