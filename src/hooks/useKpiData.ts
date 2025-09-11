import { useMemo } from 'react';
import { useAsoData } from '@/context/AsoDataContext';
import { useDerivedKPIs } from '@/hooks/useDerivedKPIs';
import { StandardKpiData, StandardKpiMetric, KpiDataOptions, UseKpiDataResult } from '@/types/kpiData';

/**
 * Unified KPI data extraction hook
 * 
 * Standardizes data extraction logic between Executive and Analytics dashboards.
 * Provides consistent data structure and handles different data sources.
 */
export const useKpiData = (options: KpiDataOptions = {}): UseKpiDataResult => {
  const { 
    trafficSourceView = 'all',
    includeDerivedMetrics = false 
  } = options;

  const { data, loading, error, isDemo } = useAsoData();
  const derivedKPIs = useDerivedKPIs(data?.trafficSources || []);

  const kpiData = useMemo((): StandardKpiData => {
    if (!data?.summary) {
      // Return empty data structure with safe defaults
      return {
        impressions: { value: 0, delta: 0 },
        downloads: { value: 0, delta: 0 },
        product_page_views: { value: 0, delta: 0 },
        product_page_cvr: { value: 0, delta: 0, isPercentage: true, decimals: 1 },
        impressions_cvr: { value: 0, delta: 0, isPercentage: true, decimals: 1 },
      };
    }

    // Get true organic summary for filtered views
    const trueOrganicSummary = derivedKPIs.find((k) => k.id === 'true-organic-search');
    const isFilteredView = trafficSourceView === 'true-organic-search';

    // Helper function to create standardized metric
    const createMetric = (
      summary: { value: number; delta: number } | undefined,
      derivedValue?: number,
      isPercentage = false,
      decimals = 1
    ): StandardKpiMetric => {
      if (isFilteredView && derivedValue !== undefined) {
        return {
          value: derivedValue,
          delta: 0, // Derived metrics don't have deltas
          isPercentage,
          decimals
        };
      }
      
      return {
        value: summary?.value || 0,
        delta: summary?.delta || 0,
        isPercentage,
        decimals
      };
    };

    const sanitize = (metric: StandardKpiMetric): StandardKpiMetric => {
      const KPI_DIAG = (import.meta as any).env?.VITE_KPI_DIAGNOSTICS_ENABLED === 'true';
      const validValue = typeof metric.value === 'number' && isFinite(metric.value);
      const validDelta = metric.delta === undefined || metric.delta === null || (typeof metric.delta === 'number' && isFinite(metric.delta));
      if (!validValue || !validDelta) {
        if (KPI_DIAG) {
          // eslint-disable-next-line no-console
          console.warn('[KPI SSOT] Invalid metric shape; coercing delta to null', metric);
        }
        return { ...metric, delta: null as unknown as number };
      }
      return metric;
    };

    const standardizedData: StandardKpiData = {
      impressions: createMetric(
        data.summary.impressions,
        trueOrganicSummary?.metrics.impressions
      ),
      downloads: createMetric(
        data.summary.downloads,
        trueOrganicSummary?.metrics.downloads
      ),
      product_page_views: createMetric(
        data.summary.product_page_views,
        trueOrganicSummary?.metrics.product_page_views
      ),
      product_page_cvr: createMetric(
        data.summary.product_page_cvr,
        undefined,
        true,
        1
      ),
      impressions_cvr: createMetric(
        data.summary.impressions_cvr,
        undefined,
        true,
        1
      ),
    };

    // Sanitize all metrics
    (Object.keys(standardizedData) as (keyof StandardKpiData)[]).forEach((k) => {
      // @ts-expect-error dynamic assignment safe for known keys
      standardizedData[k] = sanitize(standardizedData[k] as StandardKpiMetric);
    });

    // Add derived metrics if requested (for Executive dashboard)
    if (includeDerivedMetrics && trueOrganicSummary) {
      // Calculate delta for true search metrics
      const appStoreSearchSource = data.trafficSources?.find(s => s.name === 'App Store Search');
      const appleSearchAdsSource = data.trafficSources?.find(s => s.name === 'Apple Search Ads');
      
      const computeTrueDelta = (
        appMetric?: { value: number; delta: number },
        asaMetric?: { value: number; delta: number }
      ): number => {
        if (!appMetric || !asaMetric) return 0;
        const prevApp = appMetric.value / (1 + appMetric.delta / 100);
        const prevAsa = asaMetric.value / (1 + asaMetric.delta / 100);
        const current = appMetric.value - asaMetric.value;
        const previous = prevApp - prevAsa;
        if (!isFinite(previous) || previous <= 0) return 0;
        const delta = ((current - previous) / previous) * 100;
        return isFinite(delta) ? delta : 0;
      };

      standardizedData.true_search_impressions = {
        value: trueOrganicSummary.metrics.impressions || 0,
        delta: computeTrueDelta(
          appStoreSearchSource?.metrics?.impressions,
          appleSearchAdsSource?.metrics?.impressions
        )
      };

      standardizedData.true_search_downloads = {
        value: trueOrganicSummary.metrics.downloads || 0,
        delta: computeTrueDelta(
          appStoreSearchSource?.metrics?.downloads,
          appleSearchAdsSource?.metrics?.downloads
        )
      };
    }

    return standardizedData;
  }, [data, derivedKPIs, trafficSourceView, includeDerivedMetrics]);

  return {
    kpiData,
    loading,
    error,
    isDemo: isDemo || false
  };
};
