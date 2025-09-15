
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
  cvr: MetricSummary; // Add this to match MetricsData type
  product_page_cvr: MetricSummary;
  impressions_cvr: MetricSummary;
}

export interface TrafficSource {
  traffic_source: string;
  traffic_source_display: string; 
  impressions: number;
  downloads: number;
  product_page_views: number | null;
  conversion_rate: number;
  /**
   * @deprecated Use metrics instead. Kept for backwards compatibility
   */
  name?: string;
  value?: number;
  delta?: number;
  metrics?: {
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
  product_page_views: number | null; // Renamed to be consistent with AsoMetrics  
  conversion_rate: number; // Add for compatibility with aso.ts type
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

export interface TrafficSourceCVRTimeSeriesPoint {
  date: string;
  webReferrer_impression_cvr: number;
  webReferrer_product_page_cvr: number;
  other_impression_cvr: number;
  other_product_page_cvr: number;
  appleSearchAds_impression_cvr: number;
  appleSearchAds_product_page_cvr: number;
  appStoreSearch_impression_cvr: number;
  appStoreSearch_product_page_cvr: number;
  appStoreBrowse_impression_cvr: number;
  appStoreBrowse_product_page_cvr: number;
}

export interface AsoData {
  summary: AsoMetrics;
  timeseriesData: TimeSeriesPoint[];
  trafficSources: TrafficSource[];
  trafficSourceTimeseriesData?: TrafficSourceTimeSeriesPoint[];
  cvrTimeSeries?: TrafficSourceCVRTimeSeriesPoint[];
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
          cvr: {
            value: parseFloat((Math.random() * 100).toFixed(2)), // 0 to 100%
            delta: parseFloat((Math.random() * 40 - 20).toFixed(1)) // -20% to +20%
          },
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
          // Use profiles to ensure differing CVRs across sources
          const PROFILE: Record<typeof sources[number], { imprCvr: number; ppvRatio: number }> = {
            webReferrer: { imprCvr: 1.9, ppvRatio: 0.14 },
            appStoreSearch: { imprCvr: 3.5, ppvRatio: 0.18 },
            appReferrer: { imprCvr: 4.1, ppvRatio: 0.21 },
            appleSearchAds: { imprCvr: 4.6, ppvRatio: 0.22 },
            appStoreBrowse: { imprCvr: 2.6, ppvRatio: 0.15 },
          };
          const sourceMetrics: Record<typeof sources[number], { impressions: number; downloads: number; product_page_views: number }> = {
            webReferrer: (() => { const impr = Math.floor(Math.random() * 1000); return { impressions: impr, downloads: Math.round(impr * PROFILE.webReferrer.imprCvr / 100), product_page_views: Math.max(1, Math.round(impr * PROFILE.webReferrer.ppvRatio)) }; })(),
            appStoreSearch: (() => { const impr = Math.floor(Math.random() * 1000); return { impressions: impr, downloads: Math.round(impr * PROFILE.appStoreSearch.imprCvr / 100), product_page_views: Math.max(1, Math.round(impr * PROFILE.appStoreSearch.ppvRatio)) }; })(),
            appReferrer: (() => { const impr = Math.floor(Math.random() * 1000); return { impressions: impr, downloads: Math.round(impr * PROFILE.appReferrer.imprCvr / 100), product_page_views: Math.max(1, Math.round(impr * PROFILE.appReferrer.ppvRatio)) }; })(),
            appleSearchAds: (() => { const impr = Math.floor(Math.random() * 1000); return { impressions: impr, downloads: Math.round(impr * PROFILE.appleSearchAds.imprCvr / 100), product_page_views: Math.max(1, Math.round(impr * PROFILE.appleSearchAds.ppvRatio)) }; })(),
            appStoreBrowse: (() => { const impr = Math.floor(Math.random() * 1000); return { impressions: impr, downloads: Math.round(impr * PROFILE.appStoreBrowse.imprCvr / 100), product_page_views: Math.max(1, Math.round(impr * PROFILE.appStoreBrowse.ppvRatio)) }; })(),
          };

          const totalImpressions = sources.reduce((sum, s) => sum + sourceMetrics[s].impressions, 0);
          const totalDownloads = sources.reduce((sum, s) => sum + sourceMetrics[s].downloads, 0);
          const totalProductPageViews = sources.reduce((sum, s) => sum + sourceMetrics[s].product_page_views, 0);

          const product_page_cvr = totalProductPageViews > 0 ? (totalDownloads / totalProductPageViews) * 100 : 0;
          const impressions_cvr = totalImpressions > 0 ? (totalDownloads / totalImpressions) * 100 : 0;

          const dateStr = currentDate.toISOString().split('T')[0];
          const conversion_rate = totalImpressions > 0 ? (totalDownloads / totalImpressions) * 100 : 0;
          timeseriesData.push({
            date: dateStr,
            impressions: totalImpressions,
            downloads: totalDownloads,
            product_page_views: totalProductPageViews,
            conversion_rate,
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

        const cvrTimeSeries: TrafficSourceCVRTimeSeriesPoint[] = trafficSourceTimeseriesData.map(item => {
          const calc = (prefix: string) => {
            const impressions = (item as any)[`${prefix}_impressions`] || 0;
            const downloads = (item as any)[`${prefix}_downloads`] || 0;
            const views = (item as any)[`${prefix}_product_page_views`] || 0;
            return {
              impression_cvr: impressions > 0 ? (downloads / impressions) * 100 : 0,
              product_page_cvr: views > 0 ? (downloads / views) * 100 : 0,
            };
          };

          const webReferrer = calc('webReferrer');
          const other = { impression_cvr: 0, product_page_cvr: 0 };
          const appleSearchAds = calc('appleSearchAds');
          const appStoreSearch = calc('appStoreSearch');
          const appStoreBrowse = calc('appStoreBrowse');

          return {
            date: item.date,
            webReferrer_impression_cvr: webReferrer.impression_cvr,
            webReferrer_product_page_cvr: webReferrer.product_page_cvr,
            other_impression_cvr: other.impression_cvr,
            other_product_page_cvr: other.product_page_cvr,
            appleSearchAds_impression_cvr: appleSearchAds.impression_cvr,
            appleSearchAds_product_page_cvr: appleSearchAds.product_page_cvr,
            appStoreSearch_impression_cvr: appStoreSearch.impression_cvr,
            appStoreSearch_product_page_cvr: appStoreSearch.product_page_cvr,
            appStoreBrowse_impression_cvr: appStoreBrowse.impression_cvr,
            appStoreBrowse_product_page_cvr: appStoreBrowse.product_page_cvr,
          };
        });
        
        // Profile per source to ensure distinct CVRs in demo
        const SOURCE_PROFILES: Record<string, { imprCvr: number; ppvRatio: number }> = {
          'App Store Search': { imprCvr: 3.5, ppvRatio: 0.18 },
          'Apple Search Ads': { imprCvr: 4.6, ppvRatio: 0.22 },
          'App Store Browse': { imprCvr: 2.6, ppvRatio: 0.15 },
          'Web Referrer': { imprCvr: 1.9, ppvRatio: 0.14 },
          'App Referrer': { imprCvr: 4.1, ppvRatio: 0.21 },
          'Event Notification': { imprCvr: 5.0, ppvRatio: 0.24 },
          'Institutional Purchase': { imprCvr: 6.5, ppvRatio: 0.25 },
          'Other': { imprCvr: 2.0, ppvRatio: 0.16 },
        };

        // Generate traffic source data for ALL available sources using profiles
        const trafficSourceData: TrafficSource[] = ALL_AVAILABLE_TRAFFIC_SOURCES.map((source) => {
          const profile = SOURCE_PROFILES[source] || { imprCvr: 3.0, ppvRatio: 0.18 };
          const baseImpr = Math.floor(5000 + Math.random() * 50000); // 5k - 55k
          const impressions = { value: baseImpr, delta: parseFloat((Math.random() * 6).toFixed(1)) };
          const downloadsCount = Math.max(0, Math.round(baseImpr * (profile.imprCvr / 100)));
          const productPageViewsCount = Math.max(1, Math.round(baseImpr * profile.ppvRatio));

          const downloads = { value: downloadsCount, delta: parseFloat((Math.random() * 8).toFixed(1)) };
          const product_page_views = { value: productPageViewsCount, delta: parseFloat((Math.random() * 4).toFixed(1)) };
          const conversion_rate = baseImpr > 0 ? (downloadsCount / baseImpr) * 100 : 0;

          const product_page_cvr = {
            value: productPageViewsCount > 0 ? (downloadsCount / productPageViewsCount) * 100 : 0,
            delta: parseFloat((Math.random() * 1.2).toFixed(1))
          };
          const impressions_cvr = {
            value: conversion_rate,
            delta: parseFloat((Math.random() * 1.2).toFixed(1))
          };

          return {
            traffic_source: source.toLowerCase().replace(/ /g, '_'),
            traffic_source_display: source,
            impressions: impressions.value,
            downloads: downloads.value,
            product_page_views: product_page_views.value,
            conversion_rate,
            // Legacy compatibility
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
          cvrTimeSeries,
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
