
import { useState, useEffect } from 'react';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface MetricSummary {
  value: number;
  delta: number; // percentage change
}

export interface AsoMetrics {
  impressions: MetricSummary;
  downloads: MetricSummary;
  product_page_views: MetricSummary; // Renamed from 'pageViews' to match App Store Connect
  product_page_cvr: MetricSummary;
  impressions_cvr: MetricSummary;
}

export interface TrafficSource {
  name: string;
  /**
   * @deprecated Use metrics.downloads.value instead. Kept for backwards compatibility
   */
  value: number;
  /**
   * @deprecated Use metrics.downloads.delta instead. Kept for backwards compatibility
   */
  delta: number;
  metrics: {
    impressions: MetricSummary;
    downloads: MetricSummary;
    product_page_views: MetricSummary;
    product_page_cvr: MetricSummary;
    impressions_cvr: MetricSummary;
  };
}

export interface TimeSeriesPoint {
  date: string;
  impressions: number;
  downloads: number;
  product_page_views: number; // Renamed to be consistent with AsoMetrics
  product_page_cvr?: number;
  impressions_cvr?: number;
}

export interface TrafficSourceTimeSeriesPoint {
  date: string;
  webReferrer_impressions: number;
  webReferrer_downloads: number;
  webReferrer_product_page_views: number;
  appStoreSearch_impressions: number;
  appStoreSearch_downloads: number;
  appStoreSearch_product_page_views: number;
  appReferrer_impressions: number;
  appReferrer_downloads: number;
  appReferrer_product_page_views: number;
  appleSearchAds_impressions: number;
  appleSearchAds_downloads: number;
  appleSearchAds_product_page_views: number;
  appStoreBrowse_impressions: number;
  appStoreBrowse_downloads: number;
  appStoreBrowse_product_page_views: number;
  totalDownloads: number;
  totalImpressions: number;
  totalProductPageViews: number;
}

export interface AsoData {
  summary: AsoMetrics;
  timeseriesData: TimeSeriesPoint[];
  trafficSources: TrafficSource[];
  trafficSourceTimeseriesData?: TrafficSourceTimeSeriesPoint[];
}

// Complete list of all available traffic sources - static and comprehensive
const ALL_AVAILABLE_TRAFFIC_SOURCES = [
  'App Store Search',
  'App Store Browse', 
  'Web Referrer',
  'Apple Search Ads',
  'App Referrer',
  'Event Notification',
  'Institutional Purchase',
  'Other'
];

export const useMockAsoData = (
  clientList: string[],
  dateRange: DateRange,
  trafficSources: string[]
): { data: AsoData | null; loading: boolean; error: Error | null } => {
  const [data, setData] = useState<AsoData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const generateMockData = async () => {
      try {
        setLoading(true);
        
        // Generate random values for metrics
        const generateMetric = (): MetricSummary => {
          const value = Math.floor(Math.random() * 99000) + 1000; // 1k to 100k
          const delta = (Math.random() * 40) - 20; // -20% to +20%
          return { value, delta };
        };
        
        // Generate summary metrics
        const summary: AsoMetrics = {
          impressions: generateMetric(),
          downloads: generateMetric(),
          product_page_views: generateMetric(), // Renamed from 'pageViews'
          product_page_cvr: {
            value: parseFloat((Math.random() * 100).toFixed(2)), // 0 to 100%
            delta: parseFloat((Math.random() * 40 - 20).toFixed(1)) // -20% to +20%
          },
          impressions_cvr: {
            value: parseFloat((Math.random() * 100).toFixed(2)), // 0 to 100%
            delta: parseFloat((Math.random() * 40 - 20).toFixed(1)) // -20% to +20%
          }
        };
        
        // Generate timeseries data for the last 30 days
        const timeseriesData: TimeSeriesPoint[] = [];
        const trafficSourceTimeseriesData: TrafficSourceTimeSeriesPoint[] = [];
        const endDate = dateRange.to;
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 29); // 30 days including the end date
        
        for (let i = 0; i < 30; i++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(startDate.getDate() + i);

          // Generate per-source metrics
          const sources = ['webReferrer', 'appStoreSearch', 'appReferrer', 'appleSearchAds', 'appStoreBrowse'] as const;
          const sourceMetrics: Record<typeof sources[number], { impressions: number; downloads: number; product_page_views: number }> = {
            webReferrer: {
              impressions: Math.floor(Math.random() * 1000),
              downloads: Math.floor(Math.random() * 200),
              product_page_views: Math.floor(Math.random() * 600)
            },
            appStoreSearch: {
              impressions: Math.floor(Math.random() * 1000),
              downloads: Math.floor(Math.random() * 200),
              product_page_views: Math.floor(Math.random() * 600)
            },
            appReferrer: {
              impressions: Math.floor(Math.random() * 1000),
              downloads: Math.floor(Math.random() * 200),
              product_page_views: Math.floor(Math.random() * 600)
            },
            appleSearchAds: {
              impressions: Math.floor(Math.random() * 1000),
              downloads: Math.floor(Math.random() * 200),
              product_page_views: Math.floor(Math.random() * 600)
            },
            appStoreBrowse: {
              impressions: Math.floor(Math.random() * 1000),
              downloads: Math.floor(Math.random() * 200),
              product_page_views: Math.floor(Math.random() * 600)
            }
          };

          const totalImpressions = sources.reduce((sum, s) => sum + sourceMetrics[s].impressions, 0);
          const totalDownloads = sources.reduce((sum, s) => sum + sourceMetrics[s].downloads, 0);
          const totalProductPageViews = sources.reduce((sum, s) => sum + sourceMetrics[s].product_page_views, 0);

          const product_page_cvr = totalProductPageViews > 0 ? (totalDownloads / totalProductPageViews) * 100 : 0;
          const impressions_cvr = totalImpressions > 0 ? (totalDownloads / totalImpressions) * 100 : 0;

          const dateStr = currentDate.toISOString().split('T')[0];
          timeseriesData.push({
            date: dateStr,
            impressions: totalImpressions,
            downloads: totalDownloads,
            product_page_views: totalProductPageViews,
            product_page_cvr,
            impressions_cvr,
          });

          trafficSourceTimeseriesData.push({
            date: dateStr,
            webReferrer_impressions: sourceMetrics.webReferrer.impressions,
            webReferrer_downloads: sourceMetrics.webReferrer.downloads,
            webReferrer_product_page_views: sourceMetrics.webReferrer.product_page_views,
            appStoreSearch_impressions: sourceMetrics.appStoreSearch.impressions,
            appStoreSearch_downloads: sourceMetrics.appStoreSearch.downloads,
            appStoreSearch_product_page_views: sourceMetrics.appStoreSearch.product_page_views,
            appReferrer_impressions: sourceMetrics.appReferrer.impressions,
            appReferrer_downloads: sourceMetrics.appReferrer.downloads,
            appReferrer_product_page_views: sourceMetrics.appReferrer.product_page_views,
            appleSearchAds_impressions: sourceMetrics.appleSearchAds.impressions,
            appleSearchAds_downloads: sourceMetrics.appleSearchAds.downloads,
            appleSearchAds_product_page_views: sourceMetrics.appleSearchAds.product_page_views,
            appStoreBrowse_impressions: sourceMetrics.appStoreBrowse.impressions,
            appStoreBrowse_downloads: sourceMetrics.appStoreBrowse.downloads,
            appStoreBrowse_product_page_views: sourceMetrics.appStoreBrowse.product_page_views,
            totalDownloads,
            totalImpressions,
            totalProductPageViews,
          });
        }
        
        // Generate traffic source data for ALL available sources, not just selected ones
        // This fixes the circular dependency issue where only selected sources were available
        const trafficSourceData: TrafficSource[] = ALL_AVAILABLE_TRAFFIC_SOURCES.map((source) => {
          const impressions = generateMetric();
          const downloads = generateMetric();
          const product_page_views = generateMetric();
          const product_page_cvr = {
            value: parseFloat((Math.random() * 100).toFixed(2)),
            delta: parseFloat((Math.random() * 40 - 20).toFixed(1))
          };
          const impressions_cvr = {
            value: parseFloat((Math.random() * 100).toFixed(2)),
            delta: parseFloat((Math.random() * 40 - 20).toFixed(1))
          };

          return {
            name: source,
            value: downloads.value,
            delta: downloads.delta,
            metrics: {
              impressions,
              downloads,
              product_page_views,
              product_page_cvr,
              impressions_cvr
            }
          };
        });
        
        const mockData: AsoData = {
          summary,
          timeseriesData,
          trafficSources: trafficSourceData, // Always return all available sources
          trafficSourceTimeseriesData,
        };
        
        // Simulate API delay
        setTimeout(() => {
          setData(mockData);
          setLoading(false);
        }, 800);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setLoading(false);
      }
    };
    
    generateMockData();
  }, [clientList, dateRange.from, dateRange.to, trafficSources]);
  
  return { data, loading, error };
};
