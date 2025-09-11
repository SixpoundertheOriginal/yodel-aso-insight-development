/**
 * Standardized KPI Data Types
 * 
 * Unified data structure for KPI display across Executive and Analytics dashboards
 */

export interface StandardKpiMetric {
  /** The raw numeric value */
  value: number;
  /** Percentage change from previous period */
  delta: number;
  /** Whether this metric should be displayed as a percentage */
  isPercentage?: boolean;
  /** Number of decimal places for percentage display */
  decimals?: number;
}

export interface StandardKpiData {
  /** Standard metrics available on both dashboards */
  impressions: StandardKpiMetric;
  downloads: StandardKpiMetric;
  product_page_views: StandardKpiMetric;
  product_page_cvr: StandardKpiMetric;
  impressions_cvr: StandardKpiMetric;
  
  /** Executive dashboard specific metrics */
  true_search_impressions?: StandardKpiMetric;
  true_search_downloads?: StandardKpiMetric;
}

export interface KpiDataOptions {
  /** Traffic source view filter (affects Executive dashboard) */
  trafficSourceView?: string;
  /** Whether to include derived metrics like true search */
  includeDerivedMetrics?: boolean;
}

export interface UseKpiDataResult {
  /** Standardized KPI data ready for display */
  kpiData: StandardKpiData;
  /** Whether data is currently loading */
  loading: boolean;
  /** Any error in data processing */
  error: Error | null;
  /** Whether the data source is demo/placeholder */
  isDemo: boolean;
}