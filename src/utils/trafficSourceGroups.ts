import { TrafficSourceTimeSeriesPoint, TimeSeriesPoint } from '@/hooks/useMockAsoData';

export const trafficSourceGroups: Record<string, string[]> = {
  organic: ['App Store Search', 'App Store Browse', 'App Referrer'],
  paid: ['Apple Search Ads'],
  external: ['Web Referrer', 'Event Notification'],
  other: ['Institutional Purchase', 'Other'],
};

const sourceKeyMap: Record<string, string> = {
  'App Store Search': 'appStoreSearch',
  'App Store Browse': 'appStoreBrowse',
  'App Referrer': 'appReferrer',
  'Apple Search Ads': 'appleSearchAds',
  'Web Referrer': 'webReferrer',
  'Event Notification': 'eventNotification',
  'Institutional Purchase': 'institutionalPurchase',
  Other: 'other',
};

export function aggregateTrafficSources(
  data: TrafficSourceTimeSeriesPoint[] = [],
  sources: string[]
): TimeSeriesPoint[] {
  return data.map((item) => {
    let impressions = 0;
    let downloads = 0;
    let product_page_views = 0;

    const record = item as unknown as Record<string, number>;
    for (const source of sources) {
      const key = sourceKeyMap[source];
      impressions += record[`${key}_impressions`] || 0;
      downloads += record[`${key}_downloads`] || 0;
      product_page_views += record[`${key}_product_page_views`] || 0;
    }

    const product_page_cvr =
      product_page_views > 0 ? (downloads / product_page_views) * 100 : 0;
    const impressions_cvr =
      impressions > 0 ? (downloads / impressions) * 100 : 0;

    return {
      date: item.date,
      impressions,
      downloads,
      product_page_views,
      product_page_cvr,
      impressions_cvr,
    };
  });
}
