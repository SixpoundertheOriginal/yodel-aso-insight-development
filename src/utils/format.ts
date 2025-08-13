export function formatPercentage(value: number, decimals = 1): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formats a number as a percentage with suffix
 * @param value - The percentage value (e.g., 58.752)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string with % suffix (e.g., "58.8%")
 */
export const formatPercentageWithSuffix = (
  value: number,
  decimals: number = 1
): string => {
  if (isNaN(value) || !isFinite(value)) {
    return "0.0%";
  }
  return `${value.toFixed(decimals)}%`;
};

/**
 * Formats CVR values specifically for dashboard display
 * @param cvr - CVR value from transform function
 * @param decimals - Decimal places (default: 1 for display)
 * @returns Formatted CVR string
 */
export const formatCVR = (cvr: number, decimals: number = 1): string => {
  return formatPercentageWithSuffix(cvr, decimals);
};

/**
 * Formats numbers with standard US locale formatting
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("en-US").format(value);
};

/**
 * PHASE 1 FIX: Enterprise metric value formatting with K/M notation
 * Formats large numbers for dashboard display with appropriate suffixes
 */
export const formatMetricValue = (value: number): string => {
  if (isNaN(value) || !isFinite(value)) return "0";
  
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

/**
 * Standardizes timeseries data for chart components, ensuring
 * consistent structure and handling missing values.
 */
export const standardizeChartData = (data: any[] | undefined): any[] => {
  if (!data || !Array.isArray(data)) return [];

  return data.map((point) => ({
    date: point.date || "",
    impressions: typeof point.impressions === "number" ? point.impressions : 0,
    downloads: typeof point.downloads === "number" ? point.downloads : 0,
    // Support both naming conventions to handle the transition to BigQuery later
    product_page_views: typeof point.product_page_views === "number"
      ? point.product_page_views
      : typeof point.pageViews === "number"
        ? point.pageViews
        : 0,
  }));
};
