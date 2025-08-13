import { aggregateTrafficSources } from './trafficSourceGroups';

export const executiveTrafficSources = [
  'App Store Search',
  'App Store Browse',
  'Apple Search Ads',
  'App Referrer',
  'Web Referrer'
] as const;

export const executiveTrafficSourceGroups: Record<string, string[]> = {
  organic: ['App Store Search', 'App Store Browse'],
  paid: ['Apple Search Ads', 'App Referrer', 'Web Referrer'],
};

export { aggregateTrafficSources };
