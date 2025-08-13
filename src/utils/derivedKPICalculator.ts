import type { DerivedKPIDefinition, EdgeCaseRule } from './derivedKPIRegistry';

export interface TrafficSourceData {
  id: string;
  impressions: number;
  downloads: number;
  product_page_views: number;
}

export interface DerivedKPIResult {
  id: string;
  name: string;
  metrics: {
    impressions?: number;
    downloads?: number;
    product_page_views?: number;
  };
}

export class DerivedKPICalculator {
  static calculate(
    kpiDefinition: DerivedKPIDefinition,
    sourceData: TrafficSourceData[]
  ): DerivedKPIResult {
    const dataMap: Record<string, TrafficSourceData> = sourceData.reduce(
      (acc, item) => {
        acc[item.id] = item;
        return acc;
      },
      {} as Record<string, TrafficSourceData>
    );

    const depNames = kpiDefinition.dependencies;
    const missingDeps = depNames.filter((dep) => !dataMap[dep]);

    const result: DerivedKPIResult = {
      id: kpiDefinition.id,
      name: kpiDefinition.name,
      metrics: {},
    };

    (['impressions', 'downloads', 'product_page_views'] as const).forEach(
      (metric) => {
        const formula = kpiDefinition.calculations[metric];
        if (!formula) return;

        if (
          depNames.includes('App Store Search') &&
          !dataMap['App Store Search']
        ) {
          result.metrics[metric] = 0;
          return;
        }

        try {
          const varNames = depNames.map((d) =>
            d.toLowerCase().replace(/\s+/g, '_')
          );
          const fn = new Function(
            ...varNames,
            `return ${formula};`
          ) as (...args: TrafficSourceData[]) => number;
          const args = depNames.map(
            (dep) =>
              dataMap[dep] || {
                id: dep,
                impressions: 0,
                downloads: 0,
                product_page_views: 0,
              }
          );
          let value = fn(...args);
          if (!isFinite(value)) value = 0;
          const processed = this.handleEdgeCases(
            value,
            kpiDefinition.edgeCaseHandling,
            missingDeps,
            depNames.length
          );
          if (processed !== null && !isNaN(processed)) {
            result.metrics[metric] = processed;
          }
        } catch {
          // On parsing or execution errors, omit the metric
        }
      }
    );

    return result;
  }

  static validateDependencies(
    kpiDefinition: DerivedKPIDefinition,
    availableSources: string[]
  ): boolean {
    return kpiDefinition.dependencies.every((dep) =>
      availableSources.includes(dep)
    );
  }

  static handleEdgeCases(
    result: number,
    rules: EdgeCaseRule[] = [],
    missingDeps: string[] = [],
    totalDeps = 0
  ): number | null {
    for (const rule of rules) {
      let conditionMet = false;
      if (rule.condition === 'dependency_missing') {
        conditionMet = missingDeps.length === totalDeps && totalDeps > 0;
      } else {
        try {
          const fn = new Function('result', `return ${rule.condition};`) as (
            r: number
          ) => boolean;
          conditionMet = fn(result);
        } catch {
          conditionMet = false;
        }
      }
      if (conditionMet) {
        switch (rule.action) {
          case 'set_zero':
            return 0;
          case 'use_fallback':
            return rule.fallbackValue ?? 0;
          case 'skip':
            return null;
          default:
            break;
        }
      }
    }
    return result;
  }
}
