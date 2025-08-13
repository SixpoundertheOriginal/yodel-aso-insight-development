import type { TrafficSource } from '@/hooks/useMockAsoData';
import { getTrafficSourceColor } from './trafficSourceColors';

export interface ProcessedTrafficSource {
  trafficSource: string;
  displayName: string;
  cvr: number;
  cvrLabel: string;
  formula: string;
  impressions: number;
  downloads: number;
  productPageViews: number;
  denominator: number;
  color: string;
}

export type CVRType = 'impression' | 'productpage';

export function processTrafficSourceCVR(
  rawData: TrafficSource[],
  cvrType: CVRType
): ProcessedTrafficSource[] {
  return rawData
    .map((source) => {
      const impressions = source.metrics.impressions.value;
      const downloads = source.metrics.downloads.value;
      const productPageViews = source.metrics.product_page_views.value;

      let cvr: number;
      let denominator: number;
      let cvrLabel: string;
      let formula: string;

      if (cvrType === 'impression') {
        cvr = impressions > 0 ? (downloads / impressions) * 100 : 0;
        denominator = impressions;
        cvrLabel = 'Impression CVR';
        formula = 'downloads ÷ impressions';
      } else {
        cvr = productPageViews > 0 ? (downloads / productPageViews) * 100 : 0;
        denominator = productPageViews;
        cvrLabel = 'Product Page CVR';
        formula = 'downloads ÷ product page views';
      }

      return {
        trafficSource: source.name,
        displayName: source.name,
        cvr,
        cvrLabel,
        formula,
        impressions,
        downloads,
        productPageViews,
        denominator,
        color: getTrafficSourceColor(source.name),
      } as ProcessedTrafficSource;
    })
    .sort((a, b) => b.cvr - a.cvr);
}

