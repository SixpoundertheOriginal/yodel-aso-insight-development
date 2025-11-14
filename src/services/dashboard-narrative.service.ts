/**
 * Dashboard Narrative Service
 *
 * Template-based narrative generation for analytics dashboard
 * No AI/OpenAI dependency - fast, deterministic, cost-free
 */

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
 * Format large numbers with K/M suffixes
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

/**
 * Format percentage change with + or - sign
 */
function formatPercentChange(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

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

  // Format primary metrics
  const impressionsFormatted = formatNumber(impressions);
  const downloadsFormatted = formatNumber(downloads);
  const cvrFormatted = cvr.toFixed(2);

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
  let narrative = `Your app generated ${impressionsFormatted} impressions this period, resulting in ${downloadsFormatted} downloads at a ${cvrFormatted}% conversion rate.`;

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
        ? `with both impressions (${formatPercentChange(delta.impressions)}) and downloads (${formatPercentChange(delta.downloads)}) showing positive momentum`
        : delta.impressions < -5 && delta.downloads < -5
          ? `with both impressions (${formatPercentChange(delta.impressions)}) and downloads (${formatPercentChange(delta.downloads)}) declining`
          : delta.impressions > delta.downloads
            ? `driven by impressions growth (${formatPercentChange(delta.impressions)})`
            : `with downloads growth (${formatPercentChange(delta.downloads)}) outpacing impressions`;

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

export default {
  generateDashboardSummary,
  generateCvrInsight,
  generateTrafficSourceComparison,
  generateFunnelAnalysis,
  generateAnomalyExplanation,
};
