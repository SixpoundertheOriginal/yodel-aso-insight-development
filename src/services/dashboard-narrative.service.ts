/**
 * Dashboard Narrative Service
 *
 * MIGRATION NOTE: Now uses Design Registry formatters for consistent number/percentage formatting.
 *
 * Template-based narrative generation for analytics dashboard
 * No AI/OpenAI dependency - fast, deterministic, cost-free
 */

import { formatters } from '@/design-registry';
import type { TwoPathConversionMetrics, DerivedKPIs } from '@/utils/twoPathCalculator';

interface DashboardMetrics {
  impressions: number;
  downloads: number;
  cvr: number;
}

interface TrafficSourceData {
  traffic_source: string;
  traffic_source_display?: string;
  impressions: number;
  downloads: number;
  cvr: number;
}

interface MetricsDelta {
  impressions: number;
  downloads: number;
  cvr: number;
}

/**
 * MIGRATION NOTE: formatNumber() and formatPercentChange() removed.
 * Now using Design Registry formatters.number.compact() and formatters.percentage.delta().
 */

/**
 * Determine trend descriptor based on percentage change
 */
function getTrendDescriptor(percentChange: number): string {
  if (Math.abs(percentChange) < 2) return 'remained stable';
  if (percentChange >= 20) return 'surged';
  if (percentChange >= 10) return 'increased significantly';
  if (percentChange >= 5) return 'grew';
  if (percentChange > 0) return 'increased slightly';
  if (percentChange <= -20) return 'dropped sharply';
  if (percentChange <= -10) return 'declined significantly';
  if (percentChange <= -5) return 'decreased';
  return 'declined slightly';
}

/**
 * Generate executive summary narrative for dashboard
 */
export function generateDashboardSummary(
  currentMetrics: DashboardMetrics,
  trafficSources: TrafficSourceData[],
  dateRange: { start: string; end: string },
  organizationName: string,
  delta?: MetricsDelta
): string {
  const { impressions, downloads, cvr } = currentMetrics;

  // Format primary metrics using Design Registry formatters
  const impressionsFormatted = formatters.number.compact(impressions);
  const downloadsFormatted = formatters.number.compact(downloads);
  const cvrFormatted = formatters.percentage.standard(cvr, 2);

  // Find dominant traffic source
  const sortedSources = [...trafficSources]
    .sort((a, b) => b.impressions - a.impressions);
  const primarySource = sortedSources[0];
  const primaryPercent = primarySource && impressions > 0
    ? ((primarySource.impressions / impressions) * 100).toFixed(0)
    : '0';
  const primarySourceName = primarySource?.traffic_source_display ||
                           primarySource?.traffic_source ||
                           'organic traffic';

  // Build base narrative
  let narrative = `Your app generated ${impressionsFormatted} impressions this period, resulting in ${downloadsFormatted} downloads at a ${cvrFormatted} conversion rate.`;

  // Add traffic source insight
  if (primarySource && parseFloat(primaryPercent) > 0) {
    narrative += ` ${primarySourceName} accounts for ${primaryPercent}% of impressions, making it your primary discovery channel.`;
  }

  // Add trend context if delta provided
  if (delta) {
    const impressionsTrend = getTrendDescriptor(delta.impressions);
    const downloadsTrend = getTrendDescriptor(delta.downloads);

    if (Math.abs(delta.impressions) >= 5 || Math.abs(delta.downloads) >= 5) {
      const trendClause = delta.impressions > 5 && delta.downloads > 5
        ? `with both impressions (${formatters.percentage.delta(delta.impressions)}) and downloads (${formatters.percentage.delta(delta.downloads)}) showing positive momentum`
        : delta.impressions < -5 && delta.downloads < -5
          ? `with both impressions (${formatters.percentage.delta(delta.impressions)}) and downloads (${formatters.percentage.delta(delta.downloads)}) declining`
          : delta.impressions > delta.downloads
            ? `driven by impressions growth (${formatters.percentage.delta(delta.impressions)})`
            : `with downloads growth (${formatters.percentage.delta(delta.downloads)}) outpacing impressions`;

      narrative += ` Performance ${impressionsTrend} compared to the previous period, ${trendClause}.`;
    }
  }

  return narrative;
}

/**
 * Generate CVR insight narrative
 */
export function generateCvrInsight(
  cvr: number,
  metric: 'search' | 'browse' | 'total',
  delta?: number
): string {
  const cvrFormatted = cvr.toFixed(2);
  const metricName = metric === 'search' ? 'Search' : metric === 'browse' ? 'Browse' : 'Overall';

  // CVR quality assessment
  let quality = '';
  if (metric === 'search') {
    quality = cvr >= 4 ? 'excellent' : cvr >= 2.5 ? 'good' : cvr >= 1.5 ? 'moderate' : 'needs improvement';
  } else if (metric === 'browse') {
    quality = cvr >= 5 ? 'excellent' : cvr >= 3 ? 'good' : cvr >= 2 ? 'moderate' : 'needs improvement';
  } else {
    quality = cvr >= 4 ? 'excellent' : cvr >= 2.5 ? 'good' : cvr >= 1.5 ? 'moderate' : 'needs improvement';
  }

  let narrative = `${metricName} CVR is ${cvrFormatted}% (${quality} range).`;

  // Add trend if available
  if (delta !== undefined && Math.abs(delta) >= 0.3) {
    const direction = delta > 0 ? 'improved' : 'declined';
    const deltaFormatted = Math.abs(delta).toFixed(1);
    narrative += ` This ${direction} by ${deltaFormatted} percentage points from the previous period.`;

    // Add recommendation
    if (delta < -0.5) {
      narrative += ` Consider auditing recent metadata changes or testing new creative assets.`;
    }
  }

  return narrative;
}

/**
 * Generate traffic source comparison insight
 */
export function generateTrafficSourceComparison(
  searchMetrics: { impressions: number; downloads: number; cvr: number },
  browseMetrics: { impressions: number; downloads: number; cvr: number }
): string {
  const searchCvr = searchMetrics.cvr;
  const browseCvr = browseMetrics.cvr;
  const cvrRatio = browseCvr / searchCvr;

  const totalImpressions = searchMetrics.impressions + browseMetrics.impressions;
  const searchPercent = totalImpressions > 0
    ? ((searchMetrics.impressions / totalImpressions) * 100).toFixed(0)
    : '0';
  const browsePercent = totalImpressions > 0
    ? ((browseMetrics.impressions / totalImpressions) * 100).toFixed(0)
    : '0';

  let narrative = '';

  // Volume comparison
  narrative += `Your traffic is ${searchPercent}% Search and ${browsePercent}% Browse. `;

  // CVR comparison
  if (browseCvr > searchCvr * 1.3) {
    narrative += `Browse traffic converts ${cvrRatio.toFixed(1)}x better than Search (${browseCvr.toFixed(1)}% vs ${searchCvr.toFixed(1)}%), suggesting strong visual merchandising and category positioning. Consider investing in Today tab featuring and category optimization to scale this high-performing channel.`;
  } else if (searchCvr > browseCvr * 1.3) {
    narrative += `Search traffic converts ${(1/cvrRatio).toFixed(1)}x better than Browse (${searchCvr.toFixed(1)}% vs ${browseCvr.toFixed(1)}%), indicating effective keyword targeting and strong search relevance. Double down on keyword optimization and ensure top keywords maintain high relevance scores.`;
  } else {
    narrative += `Search and Browse have similar conversion rates (${searchCvr.toFixed(1)}% vs ${browseCvr.toFixed(1)}%), indicating balanced organic performance across both discovery channels. Maintain optimization efforts across both channels.`;
  }

  return narrative;
}

/**
 * Generate funnel analysis narrative
 */
export function generateFunnelAnalysis(
  impressions: number,
  productPageViews: number,
  downloads: number
): { narrative: string; recommendation: string } {
  const impressionToPpvRate = impressions > 0
    ? (productPageViews / impressions) * 100
    : 0;

  const ppvToDownloadRate = productPageViews > 0
    ? (downloads / productPageViews) * 100
    : 0;

  const overallCvr = impressions > 0
    ? (downloads / impressions) * 100
    : 0;

  // Identify weak point
  const weakStage = impressionToPpvRate < ppvToDownloadRate
    ? 'impression_to_ppv'
    : 'ppv_to_download';

  const narrative = `Your funnel shows ${impressionToPpvRate.toFixed(1)}% tap-through rate to product page and ${ppvToDownloadRate.toFixed(1)}% conversion from page view to download, resulting in ${overallCvr.toFixed(2)}% overall CVR.`;

  let recommendation = '';
  if (weakStage === 'impression_to_ppv') {
    const dropoff = 100 - impressionToPpvRate;
    recommendation = `${dropoff.toFixed(0)}% of users don't tap through to your product page. This suggests your icon or title may need optimization. Test new icon variants with A/B testing to improve initial engagement.`;
  } else {
    const dropoff = 100 - ppvToDownloadRate;
    recommendation = `${dropoff.toFixed(0)}% of users drop off after viewing your product page. This suggests your screenshots or description need improvement. Ensure your first 3 screenshots clearly communicate core value propositions.`;
  }

  return { narrative, recommendation };
}

/**
 * Generate anomaly explanation
 */
export function generateAnomalyExplanation(
  metric: string,
  type: 'spike' | 'drop',
  deviation: number,
  date: string
): string {
  const direction = type === 'spike' ? 'spiked' : 'dropped';
  const percentage = Math.abs(deviation * 100 / 2.5).toFixed(0); // Convert Z-score to rough %

  let explanation = `${metric} ${direction} approximately ${percentage}% above normal on ${date}. `;

  if (type === 'spike') {
    explanation += 'Check for featuring, press coverage, external campaigns, or other traffic drivers that may have caused this increase.';
  } else {
    explanation += 'Investigate metadata changes, competitor activity, algorithm updates, or technical issues that may have caused this decline.';
  }

  return explanation;
}

/**
 * Generate two-path conversion analysis narrative
 */
export function generateTwoPathAnalysis(
  metrics: TwoPathConversionMetrics,
  trafficSource: 'search' | 'browse'
): { narrative: string; insights: string[] } {

  const insights: string[] = [];

  // Main narrative
  const totalCvrFormatted = metrics.total_cvr.toFixed(2);
  const pdpShareFormatted = metrics.pdp_install_share.toFixed(0);
  const directShareFormatted = metrics.direct_install_share.toFixed(0);

  let narrative = `${trafficSource === 'search' ? 'Search' : 'Browse'} traffic shows ${totalCvrFormatted}% total conversion. `;

  // Install path breakdown
  if (metrics.direct_install_share > 5) {
    narrative += `${directShareFormatted}% of installs bypass the product page (direct GET button), while ${pdpShareFormatted}% come through the product page.`;
  } else {
    narrative += `Nearly all installs (${pdpShareFormatted}%) come through the product page.`;
  }

  // Add insights based on metrics

  // High direct install share (Search behavior)
  if (trafficSource === 'search' && metrics.direct_install_share > 30) {
    insights.push(
      `High direct install rate (${directShareFormatted}%) indicates strong keyword intent. Users know what they want and install immediately without viewing screenshots.`
    );
  }

  // Low tap-through rate
  if (metrics.tap_through_rate < 20) {
    insights.push(
      `Low tap-through rate (${metrics.tap_through_rate.toFixed(1)}%) suggests icon or title need optimization. Most users scroll past without engaging.`
    );
  }

  // High funnel leak
  if (metrics.funnel_leak_rate > 70) {
    insights.push(
      `${metrics.funnel_leak_rate.toFixed(0)}% of product page visitors don't install. Review screenshots, video preview, and description to reduce drop-off.`
    );
  }

  // Strong PDP conversion
  if (metrics.pdp_cvr > 40 && metrics.product_page_views > 0) {
    insights.push(
      `Strong product page conversion (${metrics.pdp_cvr.toFixed(1)}%) indicates effective creative assets. Your screenshots and video are compelling.`
    );
  }

  return { narrative, insights };
}

/**
 * Generate Search vs Browse diagnostic narrative
 */
export function generateSearchBrowseDiagnostic(
  searchMetrics: TwoPathConversionMetrics,
  browseMetrics: TwoPathConversionMetrics
): string[] {

  const insights: string[] = [];

  // 1. Direct install analysis
  if (searchMetrics.direct_install_share > 30) {
    insights.push(
      `High Search direct install rate (${searchMetrics.direct_install_share.toFixed(0)}%) indicates strong keyword intent. Users install from search results without viewing the product page.`
    );
  }

  // 2. CVR comparison with context
  const cvrRatio = searchMetrics.total_cvr / browseMetrics.total_cvr;
  if (searchMetrics.total_cvr > browseMetrics.total_cvr * 1.5) {
    insights.push(
      `Search CVR (${searchMetrics.total_cvr.toFixed(1)}%) appears ${cvrRatio.toFixed(1)}x higher than Browse (${browseMetrics.total_cvr.toFixed(1)}%) due to direct installs bypassing the traditional funnel. This is normal App Store behavior for high-intent searches.`
    );
  }

  // 3. Browse creative dependency
  if (browseMetrics.pdp_install_share > 90) {
    insights.push(
      `Browse traffic is ${browseMetrics.pdp_install_share.toFixed(0)}% PDP-dependent, meaning creative assets (screenshots, preview video) are critical for conversion. Icon and title alone don't drive Browse installs.`
    );
  }

  // 4. Funnel leakage comparison
  const searchLeakRate = searchMetrics.funnel_leak_rate;
  const browseLeakRate = browseMetrics.funnel_leak_rate;

  if (browseLeakRate > searchLeakRate * 1.5 && browseMetrics.product_page_views > 100) {
    insights.push(
      `Browse has ${browseLeakRate.toFixed(0)}% funnel leak vs ${searchLeakRate.toFixed(0)}% for Search. Product page creative needs optimization to match Search performance.`
    );
  }

  // 5. Growth driver identification
  const totalDownloads = searchMetrics.downloads + browseMetrics.downloads;
  const searchInstallShare = totalDownloads > 0
    ? (searchMetrics.downloads / totalDownloads) * 100
    : 0;

  if (searchInstallShare > 70) {
    insights.push(
      `Growth is metadata-driven (${searchInstallShare.toFixed(0)}% Search installs). Focus on keyword optimization, search ads, and improving search relevance to scale acquisition.`
    );
  } else if (searchInstallShare < 40) {
    insights.push(
      `Growth is creative-driven (${(100 - searchInstallShare).toFixed(0)}% Browse installs). Invest in featuring opportunities, category optimization, and visual asset testing.`
    );
  } else {
    insights.push(
      `Balanced growth model (${searchInstallShare.toFixed(0)}% Search, ${(100 - searchInstallShare).toFixed(0)}% Browse). Maintain optimization across both channels to sustain momentum.`
    );
  }

  return insights;
}

/**
 * Generate derived KPI insights
 */
export function generateDerivedKpiInsights(
  derivedKpis: DerivedKPIs,
  searchMetrics: TwoPathConversionMetrics,
  browseMetrics: TwoPathConversionMetrics
): string[] {

  const insights: string[] = [];

  // Search/Browse Ratio interpretation
  const sbr = derivedKpis.search_browse_ratio;
  if (sbr > 3) {
    insights.push(
      `Search/Browse Ratio of ${sbr.toFixed(1)}:1 indicates strong metadata-driven discovery. Your app ranks well for relevant search terms.`
    );
  } else if (sbr < 0.5) {
    insights.push(
      `Search/Browse Ratio of ${sbr.toFixed(1)}:1 shows creative-driven growth. You're being featured or have strong category visibility.`
    );
  }

  // First Impression Effectiveness
  const fie = derivedKpis.first_impression_effectiveness;
  if (fie < 15) {
    insights.push(
      `First Impression Effectiveness (${fie.toFixed(1)}%) is low. Test new icon variants and title copy to improve tap-through from impressions.`
    );
  } else if (fie > 30) {
    insights.push(
      `First Impression Effectiveness (${fie.toFixed(1)}%) is strong. Your icon and title effectively drive product page visits.`
    );
  }

  // Metadata vs Creative Strength comparison
  const metadataStr = derivedKpis.metadata_strength;
  const creativeStr = derivedKpis.creative_strength;

  if (metadataStr > creativeStr * 1.5) {
    insights.push(
      `Metadata Strength (${metadataStr.toFixed(1)}) significantly exceeds Creative Strength (${creativeStr.toFixed(1)}). Your keywords perform well, but creative assets need improvement.`
    );
  } else if (creativeStr > metadataStr * 1.5) {
    insights.push(
      `Creative Strength (${creativeStr.toFixed(1)}) exceeds Metadata Strength (${metadataStr.toFixed(1)}). Focus on keyword optimization to match your strong visual assets.`
    );
  }

  // Direct Install Propensity
  const dip = derivedKpis.direct_install_propensity;
  if (dip > 40) {
    insights.push(
      `${dip.toFixed(0)}% of Search users install directly without viewing the product page. This signals high brand recognition or strong keyword-app fit.`
    );
  }

  // Funnel Leak Rate
  const flr = derivedKpis.funnel_leak_rate;
  if (flr > 75) {
    insights.push(
      `${flr.toFixed(0)}% of product page visitors leave without installing. Audit your first 3 screenshots and preview video for clarity and value communication.`
    );
  }

  return insights;
}

export default {
  generateDashboardSummary,
  generateCvrInsight,
  generateTrafficSourceComparison,
  generateFunnelAnalysis,
  generateAnomalyExplanation,
  generateTwoPathAnalysis,
  generateSearchBrowseDiagnostic,
  generateDerivedKpiInsights,
};
