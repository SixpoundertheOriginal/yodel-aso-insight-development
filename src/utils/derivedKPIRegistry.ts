export interface EdgeCaseRule {
  condition: string;
  action: 'set_zero' | 'use_fallback' | 'skip';
  fallbackValue?: number;
}

export interface DerivedKPIDefinition {
  id: string;
  name: string;
  description: string;
  calculations: {
    impressions?: string;
    downloads?: string;
    product_page_views?: string;
  };
  dependencies: string[];
  category: 'organic' | 'paid' | 'efficiency' | 'conversion';
  edgeCaseHandling: EdgeCaseRule[];
}

export const DERIVED_KPI_REGISTRY: Record<string, DerivedKPIDefinition> = {
  'true-organic-search': {
    id: 'true-organic-search',
    name: 'True Organic Search',
    description:
      'App Store Search minus Apple Search Ads for pure organic performance',
    calculations: {
      impressions: 'app_store_search.impressions - apple_search_ads.impressions',
      downloads: 'app_store_search.downloads - apple_search_ads.downloads',
      product_page_views:
        'app_store_search.product_page_views - apple_search_ads.product_page_views',
    },
    dependencies: ['App Store Search', 'Apple Search Ads'],
    category: 'organic',
    edgeCaseHandling: [
      {
        condition: 'result < 0',
        action: 'set_zero',
      },
      {
        condition: 'dependency_missing',
        action: 'use_fallback',
        fallbackValue: 0,
      },
    ],
  },
};
