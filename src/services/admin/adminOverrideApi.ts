/**
 * Admin Override API Service
 *
 * Phase 13: CRUD operations for individual override types
 *
 * Responsibilities:
 * - Token relevance overrides
 * - Intent pattern overrides
 * - Hook pattern overrides
 * - Stopword overrides
 * - KPI weight overrides
 * - Formula overrides
 * - Recommendation template overrides
 *
 * Security: Internal Yodel staff only
 */

import { supabase } from '@/integrations/supabase/client';
import { invalidateCachedRuleset } from '@/engine/asoBible/rulesetLoader';
import type {
  TokenRelevanceOverride,
  HookPatternOverride,
  StopwordOverride,
  KpiWeightOverride,
  FormulaOverride,
  RecommendationTemplate,
} from '@/services/rulesetStorage/dbRulesetService';

// ============================================================================
// Types
// ============================================================================

export type OverrideScope = 'vertical' | 'market' | 'client';

export interface CreateTokenOverrideRequest {
  scope: OverrideScope;
  vertical?: string;
  market?: string;
  organization_id?: string;
  token: string;
  relevance: 0 | 1 | 2 | 3;
}

export interface CreateHookOverrideRequest {
  scope: OverrideScope;
  vertical?: string;
  market?: string;
  organization_id?: string;
  hook_category: string;
  keywords: string[];
  weight_multiplier: number;
}

export interface CreateStopwordOverrideRequest {
  scope: OverrideScope;
  vertical?: string;
  market?: string;
  organization_id?: string;
  stopwords: string[];
}

export interface CreateKpiOverrideRequest {
  scope: OverrideScope;
  vertical?: string;
  market?: string;
  organization_id?: string;
  kpi_id: string;
  weight_multiplier: number;
}

export interface CreateFormulaOverrideRequest {
  scope: OverrideScope;
  vertical?: string;
  market?: string;
  organization_id?: string;
  formula_id: string;
  override_payload: any;
}

export interface CreateRecommendationOverrideRequest {
  scope: OverrideScope;
  vertical?: string;
  market?: string;
  organization_id?: string;
  recommendation_id: string;
  message: string;
}

// ============================================================================
// Admin Override API Class
// ============================================================================

export class AdminOverrideApi {
  /**
   * Create or update token relevance override
   *
   * @param request - Token override request
   * @returns Created override or null
   */
  static async upsertTokenOverride(
    request: CreateTokenOverrideRequest
  ): Promise<TokenRelevanceOverride | null> {
    try {
      const { data, error } = await supabase
        .from('aso_token_relevance_overrides')
        .upsert(
          {
            scope: request.scope,
            vertical: request.vertical,
            market: request.market,
            organization_id: request.organization_id,
            token: request.token.toLowerCase().trim(),
            relevance: request.relevance,
            is_active: true,
            version: 1,
          },
          {
            onConflict: 'scope,vertical,market,organization_id,token',
          }
        )
        .select()
        .single();

      if (error) {
        console.error('[Admin Override API] Error upserting token override:', error);
        return null;
      }

      // Invalidate cache
      invalidateCachedRuleset(request.vertical, request.market, request.organization_id);

      return data;
    } catch (error) {
      console.error('[Admin Override API] Error upserting token override:', error);
      return null;
    }
  }

  /**
   * Delete token relevance override
   *
   * @param id - Override ID
   * @returns Success status
   */
  static async deleteTokenOverride(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('aso_token_relevance_overrides')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Admin Override API] Error deleting token override:', error);
        return false;
      }

      // Note: Ideally we'd invalidate cache based on the deleted row's scope
      // For now, we'll just return success
      return true;
    } catch (error) {
      console.error('[Admin Override API] Error deleting token override:', error);
      return false;
    }
  }

  /**
   * Create or update hook pattern override
   *
   * @param request - Hook override request
   * @returns Created override or null
   */
  static async upsertHookOverride(
    request: CreateHookOverrideRequest
  ): Promise<HookPatternOverride | null> {
    try {
      const { data, error } = await supabase
        .from('aso_hook_pattern_overrides')
        .upsert(
          {
            scope: request.scope,
            vertical: request.vertical,
            market: request.market,
            organization_id: request.organization_id,
            hook_category: request.hook_category,
            keywords: request.keywords,
            weight_multiplier: request.weight_multiplier,
            is_active: true,
            version: 1,
          },
          {
            onConflict: 'scope,vertical,market,organization_id,hook_category',
          }
        )
        .select()
        .single();

      if (error) {
        console.error('[Admin Override API] Error upserting hook override:', error);
        return null;
      }

      // Invalidate cache
      invalidateCachedRuleset(request.vertical, request.market, request.organization_id);

      return data;
    } catch (error) {
      console.error('[Admin Override API] Error upserting hook override:', error);
      return null;
    }
  }

  /**
   * Delete hook pattern override
   *
   * @param id - Override ID
   * @returns Success status
   */
  static async deleteHookOverride(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('aso_hook_pattern_overrides')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Admin Override API] Error deleting hook override:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Admin Override API] Error deleting hook override:', error);
      return false;
    }
  }

  /**
   * Create or update stopword override
   *
   * @param request - Stopword override request
   * @returns Created override or null
   */
  static async upsertStopwordOverride(
    request: CreateStopwordOverrideRequest
  ): Promise<StopwordOverride | null> {
    try {
      const { data, error } = await supabase
        .from('aso_stopword_overrides')
        .upsert(
          {
            scope: request.scope,
            vertical: request.vertical,
            market: request.market,
            organization_id: request.organization_id,
            stopwords: request.stopwords.map((w) => w.toLowerCase().trim()),
            is_active: true,
            version: 1,
          },
          {
            onConflict: 'scope,vertical,market,organization_id',
          }
        )
        .select()
        .single();

      if (error) {
        console.error('[Admin Override API] Error upserting stopword override:', error);
        return null;
      }

      // Invalidate cache
      invalidateCachedRuleset(request.vertical, request.market, request.organization_id);

      return data;
    } catch (error) {
      console.error('[Admin Override API] Error upserting stopword override:', error);
      return null;
    }
  }

  /**
   * Delete stopword override
   *
   * @param id - Override ID
   * @returns Success status
   */
  static async deleteStopwordOverride(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('aso_stopword_overrides')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Admin Override API] Error deleting stopword override:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Admin Override API] Error deleting stopword override:', error);
      return false;
    }
  }

  /**
   * Create or update KPI weight override
   *
   * @param request - KPI override request
   * @returns Created override or null
   */
  static async upsertKpiOverride(
    request: CreateKpiOverrideRequest
  ): Promise<KpiWeightOverride | null> {
    try {
      const { data, error } = await supabase
        .from('aso_kpi_weight_overrides')
        .upsert(
          {
            scope: request.scope,
            vertical: request.vertical,
            market: request.market,
            organization_id: request.organization_id,
            kpi_id: request.kpi_id,
            weight_multiplier: request.weight_multiplier,
            is_active: true,
            version: 1,
          },
          {
            onConflict: 'scope,vertical,market,organization_id,kpi_id',
          }
        )
        .select()
        .single();

      if (error) {
        console.error('[Admin Override API] Error upserting KPI override:', error);
        return null;
      }

      // Invalidate cache
      invalidateCachedRuleset(request.vertical, request.market, request.organization_id);

      return data;
    } catch (error) {
      console.error('[Admin Override API] Error upserting KPI override:', error);
      return null;
    }
  }

  /**
   * Delete KPI weight override
   *
   * @param id - Override ID
   * @returns Success status
   */
  static async deleteKpiOverride(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('aso_kpi_weight_overrides')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Admin Override API] Error deleting KPI override:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Admin Override API] Error deleting KPI override:', error);
      return false;
    }
  }

  /**
   * Create or update formula override
   *
   * @param request - Formula override request
   * @returns Created override or null
   */
  static async upsertFormulaOverride(
    request: CreateFormulaOverrideRequest
  ): Promise<FormulaOverride | null> {
    try {
      const { data, error } = await supabase
        .from('aso_formula_overrides')
        .upsert(
          {
            scope: request.scope,
            vertical: request.vertical,
            market: request.market,
            organization_id: request.organization_id,
            formula_id: request.formula_id,
            override_payload: request.override_payload,
            is_active: true,
            version: 1,
          },
          {
            onConflict: 'scope,vertical,market,organization_id,formula_id',
          }
        )
        .select()
        .single();

      if (error) {
        console.error('[Admin Override API] Error upserting formula override:', error);
        return null;
      }

      // Invalidate cache
      invalidateCachedRuleset(request.vertical, request.market, request.organization_id);

      return data;
    } catch (error) {
      console.error('[Admin Override API] Error upserting formula override:', error);
      return null;
    }
  }

  /**
   * Delete formula override
   *
   * @param id - Override ID
   * @returns Success status
   */
  static async deleteFormulaOverride(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('aso_formula_overrides')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Admin Override API] Error deleting formula override:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Admin Override API] Error deleting formula override:', error);
      return false;
    }
  }

  /**
   * Create or update recommendation template override
   *
   * @param request - Recommendation override request
   * @returns Created override or null
   */
  static async upsertRecommendationOverride(
    request: CreateRecommendationOverrideRequest
  ): Promise<RecommendationTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('aso_recommendation_templates')
        .upsert(
          {
            scope: request.scope,
            vertical: request.vertical,
            market: request.market,
            organization_id: request.organization_id,
            recommendation_id: request.recommendation_id,
            message: request.message.trim(),
            is_active: true,
            version: 1,
          },
          {
            onConflict: 'scope,vertical,market,organization_id,recommendation_id',
          }
        )
        .select()
        .single();

      if (error) {
        console.error(
          '[Admin Override API] Error upserting recommendation override:',
          error
        );
        return null;
      }

      // Invalidate cache
      invalidateCachedRuleset(request.vertical, request.market, request.organization_id);

      return data;
    } catch (error) {
      console.error(
        '[Admin Override API] Error upserting recommendation override:',
        error
      );
      return null;
    }
  }

  /**
   * Delete recommendation template override
   *
   * @param id - Override ID
   * @returns Success status
   */
  static async deleteRecommendationOverride(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('aso_recommendation_templates')
        .delete()
        .eq('id', id);

      if (error) {
        console.error(
          '[Admin Override API] Error deleting recommendation override:',
          error
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        '[Admin Override API] Error deleting recommendation override:',
        error
      );
      return false;
    }
  }
}
