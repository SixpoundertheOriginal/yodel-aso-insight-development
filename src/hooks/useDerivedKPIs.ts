import { useMemo } from 'react';
import type { TrafficSource } from './useMockAsoData';
import {
  DERIVED_KPI_REGISTRY,
  DerivedKPIDefinition
} from '@/utils/derivedKPIRegistry';
import {
  DerivedKPICalculator,
  TrafficSourceData,
  DerivedKPIResult
} from '@/utils/derivedKPICalculator';
import { executiveTrafficSourceGroups } from '@/utils/executiveTrafficSourceGroups';

export function useDerivedKPIs(
  sourceData: TrafficSource[] = []
): DerivedKPIResult[] {
  return useMemo(() => {
    const base: TrafficSourceData[] = sourceData.map((src) => ({
      id: src.name,
      impressions: src.metrics.impressions.value,
      downloads: src.metrics.downloads.value,
      product_page_views: src.metrics.product_page_views.value,
    }));

    const grouped: TrafficSourceData[] = Object.entries(
      executiveTrafficSourceGroups
    ).map(([groupId, members]) => {
      const aggregate = members.reduce(
        (acc, id) => {
          const match = base.find((s) => s.id === id);
          if (match) {
            acc.impressions += match.impressions;
            acc.downloads += match.downloads;
            acc.product_page_views += match.product_page_views;
          }
          return acc;
        },
        { impressions: 0, downloads: 0, product_page_views: 0 }
      );
      return { id: groupId, ...aggregate };
    });

    const prepared = [...base, ...grouped];

    return Object.values(DERIVED_KPI_REGISTRY).map((def) =>
      DerivedKPICalculator.calculate(def, prepared)
    );
  }, [sourceData]);
}

export function getDerivedKPICategories(): Record<
  string,
  DerivedKPIDefinition[]
> {
  return Object.values(DERIVED_KPI_REGISTRY).reduce(
    (acc, def) => {
      (acc[def.category] ||= []).push(def);
      return acc;
    },
    {} as Record<string, DerivedKPIDefinition[]>
  );
}

export function validateDerivedKPIDependencies(
  availableSources: string[]
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  Object.values(DERIVED_KPI_REGISTRY).forEach((def) => {
    result[def.id] = DerivedKPICalculator.validateDependencies(
      def,
      availableSources
    );
  });
  return result;
}
