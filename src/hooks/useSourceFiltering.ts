import { useMemo } from 'react';
import { TrafficSourceTimeSeriesPoint } from './useMockAsoData';
import { camelCase } from '@/utils/stringUtils';

export function useSourceFiltering(
  trafficSourceData: TrafficSourceTimeSeriesPoint[],
  selectedSources: string[]
) {
  return useMemo(() => {
    if (!selectedSources.length) return trafficSourceData;

    return trafficSourceData.map(dataPoint => {
      const filtered: any = {
        date: dataPoint.date,
        totalDownloads: dataPoint.totalDownloads,
        totalImpressions: dataPoint.totalImpressions,
        totalProductPageViews: dataPoint.totalProductPageViews
      };

      selectedSources.forEach(source => {
        const base = camelCase(source);
        ['impressions', 'downloads', 'product_page_views'].forEach(metric => {
          const key = `${base}_${metric}` as keyof TrafficSourceTimeSeriesPoint;
          if (key in dataPoint) {
            filtered[key] = dataPoint[key];
          }
        });
      });

      return filtered as TrafficSourceTimeSeriesPoint;
    });
  }, [trafficSourceData, selectedSources]);
}
