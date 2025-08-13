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

export const DERIVED_KPI_REGISTRY: Record<string, DerivedKPIDefinition> = {};
