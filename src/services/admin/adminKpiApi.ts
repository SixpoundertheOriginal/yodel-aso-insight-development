/**
 * KPI Admin API
 *
 * Phase 14: Admin API layer for KPI registry management
 *
 * Provides HTTP-style API interface for React Query hooks.
 * All operations handle auth, validation, and cache invalidation.
 */

import {
  getAllKpisWithAdminMeta,
  getKpiWithAdminMeta,
  getAllFamiliesWithStats,
  getFamilyWithStats,
  updateKpiWeight,
  deleteKpiWeightOverride,
  updateKpiAdminMeta,
  updateFamilyWeight,
  updateKpiFormulaRef,
  getKpisByFamilyWithWeights,
} from './adminKpiService';
import type {
  KpiWithAdminMeta,
  FamilyWithStats,
  UpdateKpiMetaRequest,
  UpdateKpiWeightRequest,
  UpdateFamilyWeightRequest,
} from './adminKpiService';
import type { KpiId, KpiFamilyId } from '@/engine/metadata/kpi/kpi.types';

// ============================================================================
// API Response Types
// ============================================================================

/**
 * KPI Registry response
 */
export interface KpiRegistryResponse {
  kpis: KpiWithAdminMeta[];
  families: FamilyWithStats[];
  totalKpis: number;
  totalFamilies: number;
}

/**
 * KPI detail response
 */
export interface KpiDetailResponse {
  kpi: KpiWithAdminMeta;
  family: FamilyWithStats;
  relatedKpis: KpiWithAdminMeta[];
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get complete KPI registry with families and stats
 *
 * @param scope - Optional scope for effective weights
 * @returns KPI registry data
 */
export class AdminKpiApi {
  /**
   * Get KPI registry
   */
  static async getKpiRegistry(
    vertical?: string,
    market?: string,
    organizationId?: string
  ): Promise<KpiRegistryResponse> {
    try {
      const [kpis, families] = await Promise.all([
        getAllKpisWithAdminMeta(vertical, market, organizationId),
        getAllFamiliesWithStats(vertical, market, organizationId),
      ]);

      return {
        kpis,
        families,
        totalKpis: kpis.length,
        totalFamilies: families.length,
      };
    } catch (error) {
      console.error('Error fetching KPI registry:', error);
      throw new Error('Failed to fetch KPI registry');
    }
  }

  /**
   * Get single KPI with detail
   */
  static async getKpiDetail(
    kpiId: KpiId,
    vertical?: string,
    market?: string,
    organizationId?: string
  ): Promise<KpiDetailResponse | null> {
    try {
      const kpi = await getKpiWithAdminMeta(kpiId, vertical, market, organizationId);
      if (!kpi) return null;

      const [family, relatedKpis] = await Promise.all([
        getFamilyWithStats(kpi.familyId, vertical, market, organizationId),
        getKpisByFamilyWithWeights(kpi.familyId, vertical, market, organizationId),
      ]);

      if (!family) {
        throw new Error(`Family ${kpi.familyId} not found`);
      }

      return {
        kpi,
        family,
        relatedKpis: relatedKpis.filter((k) => k.id !== kpiId),
      };
    } catch (error) {
      console.error(`Error fetching KPI detail for ${kpiId}:`, error);
      return null;
    }
  }

  /**
   * Get KPIs by family
   */
  static async getKpisByFamily(
    familyId: KpiFamilyId,
    vertical?: string,
    market?: string,
    organizationId?: string
  ): Promise<KpiWithAdminMeta[]> {
    try {
      return await getKpisByFamilyWithWeights(familyId, vertical, market, organizationId);
    } catch (error) {
      console.error(`Error fetching KPIs for family ${familyId}:`, error);
      return [];
    }
  }

  /**
   * Get all families with stats
   */
  static async getFamilies(
    vertical?: string,
    market?: string,
    organizationId?: string
  ): Promise<FamilyWithStats[]> {
    try {
      return await getAllFamiliesWithStats(vertical, market, organizationId);
    } catch (error) {
      console.error('Error fetching families:', error);
      return [];
    }
  }

  // ============================================================================
  // Mutation Operations
  // ============================================================================

  /**
   * Update KPI admin metadata
   */
  static async updateKpiMeta(request: UpdateKpiMetaRequest): Promise<boolean> {
    try {
      const success = await updateKpiAdminMeta(request);

      // Cache invalidation handled by React Query hooks

      return success;
    } catch (error) {
      console.error('Error updating KPI metadata:', error);
      return false;
    }
  }

  /**
   * Update KPI weight override
   */
  static async updateKpiWeightOverride(request: UpdateKpiWeightRequest): Promise<boolean> {
    try {
      const success = await updateKpiWeight(request);

      // Cache invalidation handled by React Query hooks

      return success;
    } catch (error) {
      console.error('Error updating KPI weight:', error);
      return false;
    }
  }

  /**
   * Delete KPI weight override
   */
  static async deleteKpiWeightOverride(
    overrideId: string,
    vertical?: string,
    market?: string,
    organizationId?: string
  ): Promise<boolean> {
    try {
      const success = await deleteKpiWeightOverride(overrideId);

      // Cache invalidation handled by React Query hooks

      return success;
    } catch (error) {
      console.error('Error deleting KPI weight override:', error);
      return false;
    }
  }

  /**
   * Update family weight override
   */
  static async updateFamilyWeight(request: UpdateFamilyWeightRequest): Promise<boolean> {
    try {
      const success = await updateFamilyWeight(request);

      // Cache invalidation handled by React Query hooks

      return success;
    } catch (error) {
      console.error('Error updating family weight:', error);
      return false;
    }
  }

  /**
   * Update KPI formula reference
   */
  static async updateKpiFormula(
    kpiId: KpiId,
    formulaId: string,
    vertical?: string,
    market?: string,
    organizationId?: string
  ): Promise<boolean> {
    try {
      const success = await updateKpiFormulaRef(kpiId, formulaId);

      // Cache invalidation handled by React Query hooks

      return success;
    } catch (error) {
      console.error('Error updating KPI formula:', error);
      return false;
    }
  }
}

export default AdminKpiApi;
