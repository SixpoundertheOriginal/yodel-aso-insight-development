import { BigQueryDataPoint } from '@/hooks/useBigQueryData';

export const filterByTrafficSources = (
  data: BigQueryDataPoint[],
  selectedSources: string[]
): BigQueryDataPoint[] => {
  if (!data || selectedSources.length === 0) return data;
  return data.filter((point) => selectedSources.includes(point.traffic_source));
};
