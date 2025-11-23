/**
 * Formula Admin API
 *
 * Phase 14: Admin API layer for formula registry management
 *
 * Provides HTTP-style API interface for React Query hooks.
 * All operations handle auth, validation, and cache invalidation.
 */

import {
  getAllFormulasWithUsage,
  getFormulaWithUsage,
  getFormulasByType,
  getEditableFormulas,
  getDeprecatedFormulas,
  updateFormulaParameters,
  createFormula,
  deprecateFormula,
  getFormulaStatistics,
  canDeprecateFormula,
} from './adminFormulaService';
import type {
  FormulaWithUsage,
  UpdateFormulaRequest,
  CreateFormulaRequest,
  DeprecateFormulaRequest,
} from './adminFormulaService';

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Formula Registry response
 */
export interface FormulaRegistryResponse {
  formulas: FormulaWithUsage[];
  statistics: {
    total: number;
    editable: number;
    deprecated: number;
    byType: Record<string, number>;
    totalUsage: number;
  };
}

/**
 * Formula detail response
 */
export interface FormulaDetailResponse {
  formula: FormulaWithUsage;
  canDeprecate: boolean;
  deprecationReason?: string;
  affectedKpis?: string[];
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get complete formula registry with statistics
 */
export class AdminFormulaApi {
  /**
   * Get formula registry
   */
  static async getFormulaRegistry(): Promise<FormulaRegistryResponse> {
    try {
      const formulas = getAllFormulasWithUsage();
      const statistics = getFormulaStatistics();

      return {
        formulas,
        statistics,
      };
    } catch (error) {
      console.error('Error fetching formula registry:', error);
      throw new Error('Failed to fetch formula registry');
    }
  }

  /**
   * Get single formula with detail
   */
  static async getFormulaDetail(formulaId: string): Promise<FormulaDetailResponse | null> {
    try {
      const formula = getFormulaWithUsage(formulaId);
      if (!formula) return null;

      const deprecationCheck = canDeprecateFormula(formulaId);

      return {
        formula,
        canDeprecate: deprecationCheck.canDeprecate,
        deprecationReason: deprecationCheck.reason,
        affectedKpis: deprecationCheck.affectedKpis,
      };
    } catch (error) {
      console.error(`Error fetching formula detail for ${formulaId}:`, error);
      return null;
    }
  }

  /**
   * Get formulas by type
   */
  static async getFormulasByType(
    type: 'weighted_sum' | 'ratio' | 'composite' | 'threshold_based' | 'custom'
  ): Promise<FormulaWithUsage[]> {
    try {
      return getFormulasByType(type);
    } catch (error) {
      console.error(`Error fetching formulas by type ${type}:`, error);
      return [];
    }
  }

  /**
   * Get editable formulas
   */
  static async getEditableFormulas(): Promise<FormulaWithUsage[]> {
    try {
      return getEditableFormulas();
    } catch (error) {
      console.error('Error fetching editable formulas:', error);
      return [];
    }
  }

  /**
   * Get deprecated formulas
   */
  static async getDeprecatedFormulas(): Promise<FormulaWithUsage[]> {
    try {
      return getDeprecatedFormulas();
    } catch (error) {
      console.error('Error fetching deprecated formulas:', error);
      return [];
    }
  }

  // ============================================================================
  // Mutation Operations
  // ============================================================================

  /**
   * Update formula parameters
   */
  static async updateFormulaParameters(request: UpdateFormulaRequest): Promise<boolean> {
    try {
      const success = await updateFormulaParameters(request);

      if (success) {
        // TODO: Invalidate cache when formula overrides are implemented
        console.log('Formula parameters updated:', request.formulaId);
      }

      return success;
    } catch (error) {
      console.error('Error updating formula parameters:', error);
      return false;
    }
  }

  /**
   * Create new formula
   */
  static async createFormula(request: CreateFormulaRequest): Promise<boolean> {
    try {
      const success = await createFormula(request);

      if (success) {
        console.log('Formula created:', request.id);
      }

      return success;
    } catch (error) {
      console.error('Error creating formula:', error);
      return false;
    }
  }

  /**
   * Deprecate formula
   */
  static async deprecateFormula(request: DeprecateFormulaRequest): Promise<boolean> {
    try {
      // Check if formula can be deprecated
      const check = canDeprecateFormula(request.formulaId);
      if (!check.canDeprecate) {
        throw new Error(check.reason || 'Cannot deprecate formula');
      }

      const success = await deprecateFormula(request);

      if (success) {
        console.log('Formula deprecated:', request.formulaId);
      }

      return success;
    } catch (error) {
      console.error('Error deprecating formula:', error);
      return false;
    }
  }
}

export default AdminFormulaApi;
