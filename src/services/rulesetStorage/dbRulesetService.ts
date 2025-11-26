/**
 * DB Ruleset Service
 *
 * Phase 11: Handles CRUD operations for all ruleset override types
 *
 * Responsibilities:
 * - Load overrides from Supabase
 * - Scope filtering (vertical, market, client)
 * - Active rule filtering
 * - Type-safe queries
 *
 * Integration: Used by rulesetLoader to fetch DB overrides before fallback to code
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Types
// ============================================================================

export type RulesetScope = 'vertical' | 'market' | 'client';
export type OverrideType =
  | 'token_relevance'
  | 'intent_pattern'
  | 'hook_pattern'
  | 'stopword'
  | 'kpi_weight'
  | 'formula'
  | 'recommendation';

export interface TokenRelevanceOverride {
  id: string;
  scope: RulesetScope;
  vertical?: string;
  market?: string;
  organization_id?: string;
  token: string;
  relevance: 0 | 1 | 2 | 3;
  notes?: string;
  version: number;
  is_active: boolean;
}

export interface HookPatternOverride {
  id: string;
  scope: RulesetScope;
  vertical?: string;
  market?: string;
  organization_id?: string;
  hook_category: string;
  weight_multiplier: number;
  keywords?: string[];
  notes?: string;
  version: number;
  is_active: boolean;
}

export interface StopwordOverride {
  id: string;
  scope: RulesetScope;
  vertical?: string;
  market?: string;
  organization_id?: string;
  stopwords: string[];
  notes?: string;
  version: number;
  is_active: boolean;
}

export interface KpiWeightOverride {
  id: string;
  scope: RulesetScope;
  vertical?: string;
  market?: string;
  organization_id?: string;
  kpi_id: string;
  weight_multiplier: number;
  notes?: string;
  version: number;
  is_active: boolean;
}

export interface FormulaOverride {
  id: string;
  scope: RulesetScope;
  vertical?: string;
  market?: string;
  organization_id?: string;
  formula_id: string;
  override_payload: Record<string, any>;
  notes?: string;
  version: number;
  is_active: boolean;
}

export interface RecommendationTemplate {
  id: string;
  scope: RulesetScope;
  vertical?: string;
  market?: string;
  organization_id?: string;
  recommendation_id: string;
  message: string;
  notes?: string;
  version: number;
  is_active: boolean;
}

export interface LoadRulesOptions {
  vertical?: string;
  market?: string;
  organizationId?: string;
  appId?: string;
  includeInactive?: boolean;
}

// ============================================================================
// DB Ruleset Service Class
// ============================================================================

export class DbRulesetService {
  /**
   * Load token relevance overrides from database
   *
   * @param options - Filter options (vertical, market, client)
   * @returns Array of token relevance overrides
   */
  static async loadTokenRelevanceOverrides(
    options: LoadRulesOptions
  ): Promise<TokenRelevanceOverride[]> {
    let query = supabase
      .from('aso_token_relevance_overrides')
      .select('*');

    // Filter by scope
    if (options.vertical) {
      query = query.eq('vertical', options.vertical);
    }
    if (options.market) {
      query = query.eq('market', options.market);
    }
    if (options.organizationId) {
      query = query.eq('organization_id', options.organizationId);
    }

    // Filter active only (unless includeInactive)
    if (!options.includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[DB Ruleset Service] Error loading token relevance overrides:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Load hook pattern overrides from database
   *
   * @param options - Filter options (vertical, market, client)
   * @returns Array of hook pattern overrides
   */
  static async loadHookPatternOverrides(
    options: LoadRulesOptions
  ): Promise<HookPatternOverride[]> {
    let query = supabase
      .from('aso_hook_pattern_overrides')
      .select('*');

    // Filter by scope
    if (options.vertical) {
      query = query.eq('vertical', options.vertical);
    }
    if (options.market) {
      query = query.eq('market', options.market);
    }
    if (options.organizationId) {
      query = query.eq('organization_id', options.organizationId);
    }

    // Filter active only
    if (!options.includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[DB Ruleset Service] Error loading hook pattern overrides:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Load stopword overrides from database
   *
   * @param options - Filter options (vertical, market, client)
   * @returns Array of stopword overrides
   */
  static async loadStopwordOverrides(
    options: LoadRulesOptions
  ): Promise<StopwordOverride[]> {
    let query = supabase
      .from('aso_stopword_overrides')
      .select('*');

    // Filter by scope
    if (options.vertical) {
      query = query.eq('vertical', options.vertical);
    }
    if (options.market) {
      query = query.eq('market', options.market);
    }
    if (options.organizationId) {
      query = query.eq('organization_id', options.organizationId);
    }

    // Filter active only
    if (!options.includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[DB Ruleset Service] Error loading stopword overrides:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Load KPI weight overrides from database
   *
   * @param options - Filter options (vertical, market, client)
   * @returns Array of KPI weight overrides
   */
  static async loadKpiWeightOverrides(
    options: LoadRulesOptions
  ): Promise<KpiWeightOverride[]> {
    let query = supabase
      .from('aso_kpi_weight_overrides')
      .select('*');

    // Filter by scope
    if (options.vertical) {
      query = query.eq('vertical', options.vertical);
    }
    if (options.market) {
      query = query.eq('market', options.market);
    }
    if (options.organizationId) {
      query = query.eq('organization_id', options.organizationId);
    }

    // Filter active only
    if (!options.includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[DB Ruleset Service] Error loading KPI weight overrides:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Load formula overrides from database
   *
   * @param options - Filter options (vertical, market, client)
   * @returns Array of formula overrides
   */
  static async loadFormulaOverrides(
    options: LoadRulesOptions
  ): Promise<FormulaOverride[]> {
    let query = supabase
      .from('aso_formula_overrides')
      .select('*');

    // Filter by scope
    if (options.vertical) {
      query = query.eq('vertical', options.vertical);
    }
    if (options.market) {
      query = query.eq('market', options.market);
    }
    if (options.organizationId) {
      query = query.eq('organization_id', options.organizationId);
    }

    // Filter active only
    if (!options.includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[DB Ruleset Service] Error loading formula overrides:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Load recommendation templates from database
   *
   * @param options - Filter options (vertical, market, client)
   * @returns Array of recommendation templates
   */
  static async loadRecommendationTemplates(
    options: LoadRulesOptions
  ): Promise<RecommendationTemplate[]> {
    let query = supabase
      .from('aso_recommendation_templates')
      .select('*');

    // Filter by scope
    if (options.vertical) {
      query = query.eq('vertical', options.vertical);
    }
    if (options.market) {
      query = query.eq('market', options.market);
    }
    if (options.organizationId) {
      query = query.eq('organization_id', options.organizationId);
    }

    // Filter active only
    if (!options.includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[DB Ruleset Service] Error loading recommendation templates:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Load category template metadata from aso_ruleset_category
   *
   * Phase 2A: Category-Based RuleSet Assignment
   *
   * @param categoryId - Category ID (e.g., 'category_entertainment')
   * @returns Category template metadata or null
   */
  static async loadCategoryTemplateMeta(categoryId: string): Promise<Record<string, any> | null> {
    if (!categoryId) {
      return null;
    }

    const { data, error } = await supabase
      .from('aso_ruleset_category')
      .select('vertical_template_meta')
      .eq('category_id', categoryId)
      .single();

    if (error) {
      console.error('[DB Ruleset Service] Error loading category template meta:', error);
      return null;
    }

    return data?.vertical_template_meta || null;
  }

  /**
   * Get category by iOS genre ID
   *
   * Phase 2A: Category-Based RuleSet Assignment
   *
   * @param genreId - iOS App Store genre ID
   * @returns Category info or null
   */
  static async getCategoryByGenreId(genreId: number): Promise<{
    categoryId: string;
    categoryName: string;
    genreId: number;
    verticalTemplateMeta: Record<string, any> | null;
  } | null> {
    if (!genreId) {
      return null;
    }

    const { data, error } = await supabase
      .from('aso_ruleset_category')
      .select('category_id, category_name, genre_id, vertical_template_meta')
      .eq('genre_id', genreId)
      .single();

    if (error) {
      console.error('[DB Ruleset Service] Error fetching category by genre ID:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      categoryId: data.category_id,
      categoryName: data.category_name,
      genreId: data.genre_id,
      verticalTemplateMeta: data.vertical_template_meta || null,
    };
  }

  /**
   * Load vertical template metadata from aso_ruleset_vertical
   *
   * Phase 21: Vertical Intelligence Layer
   *
   * @param verticalId - Vertical ID
   * @returns Vertical template metadata or null
   */
  static async loadVerticalTemplateMeta(verticalId: string): Promise<Record<string, any> | null> {
    if (!verticalId || verticalId === 'base') {
      return null;
    }

    const { data, error } = await supabase
      .from('aso_ruleset_vertical')
      .select('vertical_template_meta')
      .eq('vertical', verticalId)
      .single();

    if (error) {
      console.error('[DB Ruleset Service] Error loading vertical template meta:', error);
      return null;
    }

    return data?.vertical_template_meta || null;
  }

  /**
   * Load market template metadata from aso_ruleset_market
   *
   * Phase 21: Vertical Intelligence Layer
   *
   * @param marketId - Market ID
   * @returns Market template metadata or null
   */
  static async loadMarketTemplateMeta(marketId: string): Promise<Record<string, any> | null> {
    if (!marketId) {
      return null;
    }

    const { data, error } = await supabase
      .from('aso_ruleset_market')
      .select('market_template_meta')
      .eq('market', marketId)
      .single();

    if (error) {
      console.error('[DB Ruleset Service] Error loading market template meta:', error);
      return null;
    }

    return data?.market_template_meta || null;
  }

  /**
   * Load client template metadata from aso_ruleset_client
   *
   * Phase 21: Vertical Intelligence Layer
   *
   * @param organizationId - Organization ID
   * @returns Client template metadata or null
   */
  static async loadClientTemplateMeta(organizationId: string): Promise<Record<string, any> | null> {
    if (!organizationId) {
      return null;
    }

    const { data, error } = await supabase
      .from('aso_ruleset_client')
      .select('client_template_meta')
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      console.error('[DB Ruleset Service] Error loading client template meta:', error);
      return null;
    }

    return data?.client_template_meta || null;
  }

  /**
   * Load all overrides for given scope (vertical/market/client)
   *
   * @param options - Filter options
   * @returns Combined overrides object
   */
  static async loadAllOverrides(options: LoadRulesOptions) {
    const [
      tokenOverrides,
      hookOverrides,
      stopwordOverrides,
      kpiOverrides,
      formulaOverrides,
      recommendationOverrides,
    ] = await Promise.all([
      this.loadTokenRelevanceOverrides(options),
      this.loadHookPatternOverrides(options),
      this.loadStopwordOverrides(options),
      this.loadKpiWeightOverrides(options),
      this.loadFormulaOverrides(options),
      this.loadRecommendationTemplates(options),
    ]);

    return {
      tokenOverrides,
      hookOverrides,
      stopwordOverrides,
      kpiOverrides,
      formulaOverrides,
      recommendationOverrides,
    };
  }

  /**
   * Check if database has any overrides (for fallback logic)
   *
   * @returns True if database has at least one active override
   */
  static async hasAnyOverrides(): Promise<boolean> {
    const { count } = await supabase
      .from('aso_token_relevance_overrides')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .limit(1);

    return (count ?? 0) > 0;
  }
}
