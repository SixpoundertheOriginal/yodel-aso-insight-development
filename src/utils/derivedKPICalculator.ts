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
          // Secure calculation without dynamic code execution
          const value = this.evaluateFormulaSafely(
            formula,
            depNames,
            dataMap
          );
          
          if (!isFinite(value)) {
            result.metrics[metric] = 0;
            return;
          }
          
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
          // Safe condition evaluation without dynamic code execution
          conditionMet = this.evaluateConditionSafely(rule.condition, result);
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

  /**
   * Safely evaluate mathematical formulas without dynamic code execution
   */
  private static evaluateFormulaSafely(
    formula: string,
    depNames: string[],
    dataMap: Record<string, TrafficSourceData>
  ): number {
    // Create safe variable mapping
    const variables: Record<string, TrafficSourceData> = {};
    depNames.forEach((dep) => {
      const varName = dep.toLowerCase().replace(/\s+/g, '_');
      variables[varName] = dataMap[dep] || {
        id: dep,
        impressions: 0,
        downloads: 0,
        product_page_views: 0,
      };
    });

    // Parse and evaluate the formula safely
    return this.parseAndEvaluateFormula(formula, variables);
  }

  /**
   * Parse and evaluate mathematical expressions safely
   */
  private static parseAndEvaluateFormula(
    formula: string,
    variables: Record<string, TrafficSourceData>
  ): number {
    // Simple mathematical expression parser for basic operations
    // This replaces dynamic code execution with a controlled parser
    
    // For now, handle common patterns manually - in production this should use a proper math expression parser
    const cleanFormula = formula.trim();
    
    // Handle simple addition patterns like "source1.metric + source2.metric"
    if (cleanFormula.includes('+')) {
      const parts = cleanFormula.split('+').map(p => p.trim());
      return parts.reduce((sum, part) => sum + this.evaluateSimpleExpression(part, variables), 0);
    }
    
    // Handle simple subtraction
    if (cleanFormula.includes('-') && !cleanFormula.startsWith('-')) {
      const parts = cleanFormula.split('-');
      if (parts.length === 2) {
        const left = this.evaluateSimpleExpression(parts[0].trim(), variables);
        const right = this.evaluateSimpleExpression(parts[1].trim(), variables);
        return left - right;
      }
    }
    
    // Handle simple multiplication
    if (cleanFormula.includes('*')) {
      const parts = cleanFormula.split('*').map(p => p.trim());
      return parts.reduce((product, part) => product * this.evaluateSimpleExpression(part, variables), 1);
    }
    
    // Handle simple division
    if (cleanFormula.includes('/')) {
      const parts = cleanFormula.split('/');
      if (parts.length === 2) {
        const numerator = this.evaluateSimpleExpression(parts[0].trim(), variables);
        const denominator = this.evaluateSimpleExpression(parts[1].trim(), variables);
        return denominator !== 0 ? numerator / denominator : 0;
      }
    }
    
    // Single expression
    return this.evaluateSimpleExpression(cleanFormula, variables);
  }

  /**
   * Evaluate simple variable.property expressions
   */
  private static evaluateSimpleExpression(
    expression: string,
    variables: Record<string, TrafficSourceData>
  ): number {
    const trimmed = expression.trim();
    
    // Handle numeric literals
    const numValue = parseFloat(trimmed);
    if (!isNaN(numValue)) {
      return numValue;
    }
    
    // Handle variable.property patterns
    if (trimmed.includes('.')) {
      const [varName, property] = trimmed.split('.');
      const variable = variables[varName];
      if (variable && property in variable) {
        const value = variable[property as keyof TrafficSourceData];
        return typeof value === 'number' ? value : 0;
      }
    }
    
    // Default to 0 for unknown expressions
    return 0;
  }

  /**
   * Safely evaluate conditions without dynamic code execution
   */
  private static evaluateConditionSafely(condition: string, result: number): boolean {
    const cleanCondition = condition.trim();
    
    // Handle common comparison patterns
    if (cleanCondition.includes('result')) {
      // Simple comparisons like "result > 0", "result === 0", etc.
      if (cleanCondition.includes('>=')) {
        const parts = cleanCondition.split('>=');
        if (parts.length === 2) {
          const threshold = parseFloat(parts[1].trim());
          return !isNaN(threshold) && result >= threshold;
        }
      }
      
      if (cleanCondition.includes('<=')) {
        const parts = cleanCondition.split('<=');
        if (parts.length === 2) {
          const threshold = parseFloat(parts[1].trim());
          return !isNaN(threshold) && result <= threshold;
        }
      }
      
      if (cleanCondition.includes('>')) {
        const parts = cleanCondition.split('>');
        if (parts.length === 2) {
          const threshold = parseFloat(parts[1].trim());
          return !isNaN(threshold) && result > threshold;
        }
      }
      
      if (cleanCondition.includes('<')) {
        const parts = cleanCondition.split('<');
        if (parts.length === 2) {
          const threshold = parseFloat(parts[1].trim());
          return !isNaN(threshold) && result < threshold;
        }
      }
      
      if (cleanCondition.includes('===')) {
        const parts = cleanCondition.split('===');
        if (parts.length === 2) {
          const threshold = parseFloat(parts[1].trim());
          return !isNaN(threshold) && result === threshold;
        }
      }
      
      if (cleanCondition.includes('!==')) {
        const parts = cleanCondition.split('!==');
        if (parts.length === 2) {
          const threshold = parseFloat(parts[1].trim());
          return !isNaN(threshold) && result !== threshold;
        }
      }
    }
    
    // Default to false for unknown conditions
    return false;
  }
}
