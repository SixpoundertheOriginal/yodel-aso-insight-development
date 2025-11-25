/**
 * Admin LLM Rules API Service
 *
 * Provides CRUD operations for LLM visibility rule overrides.
 *
 * Follows same patterns as adminRulesetApi.ts:
 * - Scope-based overrides (vertical/market/client)
 * - Version control
 * - Preview before publish
 * - Cache invalidation
 *
 * Security: Internal Yodel staff only (admin role required)
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  LLMVisibilityRules,
  LLMVisibilityRuleOverride,
} from '@/engine/llmVisibility/llmVisibility.types';
import { loadLLMVisibilityRules, mergeRules } from '@/engine/llmVisibility/llmVisibilityRuleLoader';

// ============================================================================
// Types
// ============================================================================

export interface LLMRuleOverrideListItem {
  id: string;
  scope: 'vertical' | 'market' | 'client';
  vertical?: string;
  market?: string;
  organization_id?: string;
  version: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LLMRuleOverrideDetail {
  id: string;
  scope: 'vertical' | 'market' | 'client';
  vertical?: string;
  market?: string;
  organization_id?: string;
  rules_override: Partial<LLMVisibilityRules>;
  notes?: string;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  /** Preview of merged rules */
  mergedPreview?: LLMVisibilityRules;
}

export interface LLMRulePreviewRequest {
  scope: 'vertical' | 'market' | 'client';
  vertical?: string;
  market?: string;
  organizationId?: string;
  rulesOverride: Partial<LLMVisibilityRules>;
}

export interface LLMRulePreviewResponse {
  merged: LLMVisibilityRules;
  changesCount: {
    weights: number;
    structure_rules: number;
    clusters: number;
    factual_rules: number;
    intent_rules: number;
    snippet_rules: number;
    safety_rules: number;
  };
}

export interface LLMRulePublishRequest {
  scope: 'vertical' | 'market' | 'client';
  vertical?: string;
  market?: string;
  organizationId?: string;
  rulesOverride: Partial<LLMVisibilityRules>;
  notes?: string;
}

// ============================================================================
// Admin LLM Rules API Class
// ============================================================================

export class AdminLLMRulesApi {
  /**
   * Get list of all LLM rule overrides
   *
   * @param scope - Filter by scope ('vertical', 'market', 'client', or all)
   * @returns List of rule overrides
   */
  static async getRuleOverrideList(
    scope?: 'vertical' | 'market' | 'client'
  ): Promise<LLMRuleOverrideListItem[]> {
    try {
      let query = supabase
        .from('llm_visibility_rule_overrides')
        .select('*')
        .order('created_at', { ascending: false });

      if (scope) {
        query = query.eq('scope', scope);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Admin LLM Rules] Error loading rule overrides:', error);
        return [];
      }

      return (data || []).map((row) => ({
        id: row.id,
        scope: row.scope as 'vertical' | 'market' | 'client',
        vertical: row.vertical || undefined,
        market: row.market || undefined,
        organization_id: row.organization_id || undefined,
        version: row.version,
        is_active: row.is_active,
        notes: row.notes || undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    } catch (error) {
      console.error('[Admin LLM Rules] Error loading rule override list:', error);
      return [];
    }
  }

  /**
   * Get specific rule override by ID
   *
   * @param id - Rule override ID
   * @returns Rule override detail with merged preview
   */
  static async getRuleOverride(id: string): Promise<LLMRuleOverrideDetail | null> {
    try {
      const { data, error } = await supabase
        .from('llm_visibility_rule_overrides')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        console.error('[Admin LLM Rules] Error loading rule override:', error);
        return null;
      }

      // Load merged preview
      let mergedPreview: LLMVisibilityRules | undefined;
      try {
        const baseRules = loadLLMVisibilityRules({
          vertical: data.vertical || undefined,
          market: data.market || undefined,
          organizationId: data.organization_id || undefined,
        });

        mergedPreview = mergeRules(baseRules, data.rules_override as Partial<LLMVisibilityRules>);
      } catch (error) {
        console.warn('[Admin LLM Rules] Failed to generate merged preview:', error);
      }

      return {
        id: data.id,
        scope: data.scope as 'vertical' | 'market' | 'client',
        vertical: data.vertical || undefined,
        market: data.market || undefined,
        organization_id: data.organization_id || undefined,
        rules_override: data.rules_override as Partial<LLMVisibilityRules>,
        notes: data.notes || undefined,
        version: data.version,
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
        mergedPreview,
      };
    } catch (error) {
      console.error('[Admin LLM Rules] Error loading rule override detail:', error);
      return null;
    }
  }

  /**
   * Preview merged rules before publishing
   *
   * @param request - Preview request with override changes
   * @returns Merged rules and change counts
   */
  static async previewRuleOverride(
    request: LLMRulePreviewRequest
  ): Promise<LLMRulePreviewResponse | null> {
    try {
      // Load base rules for the given scope
      const baseRules = loadLLMVisibilityRules({
        vertical: request.vertical,
        market: request.market,
        organizationId: request.organizationId,
      });

      // Merge with proposed overrides
      const merged = mergeRules(baseRules, request.rulesOverride);

      // Count changes
      const changesCount = {
        weights: Object.keys(request.rulesOverride.weights || {}).length,
        structure_rules: Object.keys(request.rulesOverride.structure_rules || {}).length,
        clusters: Object.keys(request.rulesOverride.clusters || {}).length,
        factual_rules: Object.keys(request.rulesOverride.factual_rules || {}).length,
        intent_rules: Object.keys(request.rulesOverride.intent_rules || {}).length,
        snippet_rules: Object.keys(request.rulesOverride.snippet_rules || {}).length,
        safety_rules: Object.keys(request.rulesOverride.safety_rules || {}).length,
      };

      return {
        merged,
        changesCount,
      };
    } catch (error) {
      console.error('[Admin LLM Rules] Error previewing rule override:', error);
      return null;
    }
  }

  /**
   * Publish (create or update) rule override
   *
   * Creates new version if already exists, otherwise creates new record
   *
   * @param request - Publish request with rule overrides
   * @returns Success status and new override ID
   */
  static async publishRuleOverride(
    request: LLMRulePublishRequest
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      // Check if override already exists for this scope
      let query = supabase
        .from('llm_visibility_rule_overrides')
        .select('id, version')
        .eq('scope', request.scope)
        .eq('is_active', true);

      if (request.vertical) {
        query = query.eq('vertical', request.vertical);
      }
      if (request.market) {
        query = query.eq('market', request.market);
      }
      if (request.organizationId) {
        query = query.eq('organization_id', request.organizationId);
      }

      const { data: existing } = await query.maybeSingle();

      let newVersion = 1;
      if (existing) {
        // Deactivate existing version
        await supabase
          .from('llm_visibility_rule_overrides')
          .update({ is_active: false })
          .eq('id', existing.id);

        newVersion = existing.version + 1;
      }

      // Insert new version
      const { data: newOverride, error: insertError } = await supabase
        .from('llm_visibility_rule_overrides')
        .insert({
          scope: request.scope,
          vertical: request.vertical || null,
          market: request.market || null,
          organization_id: request.organizationId || null,
          rules_override: request.rulesOverride,
          notes: request.notes || null,
          version: newVersion,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[Admin LLM Rules] Error publishing rule override:', insertError);
        return { success: false, error: insertError.message };
      }

      console.log('[Admin LLM Rules] Published rule override:', {
        id: newOverride.id,
        scope: request.scope,
        vertical: request.vertical,
        market: request.market,
        version: newVersion,
      });

      return { success: true, id: newOverride.id };
    } catch (error) {
      console.error('[Admin LLM Rules] Error publishing rule override:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete rule override
   *
   * @param id - Rule override ID
   * @returns Success status
   */
  static async deleteRuleOverride(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('llm_visibility_rule_overrides')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Admin LLM Rules] Error deleting rule override:', error);
        return false;
      }

      console.log('[Admin LLM Rules] Deleted rule override:', id);
      return true;
    } catch (error) {
      console.error('[Admin LLM Rules] Error deleting rule override:', error);
      return false;
    }
  }

  /**
   * Rollback to previous version
   *
   * @param id - Current override ID to rollback from
   * @returns Success status
   */
  static async rollbackRuleOverride(id: string): Promise<boolean> {
    try {
      // Get current override
      const { data: current, error: currentError } = await supabase
        .from('llm_visibility_rule_overrides')
        .select('*')
        .eq('id', id)
        .single();

      if (currentError || !current) {
        console.error('[Admin LLM Rules] Error loading current override:', currentError);
        return false;
      }

      // Find previous version
      let query = supabase
        .from('llm_visibility_rule_overrides')
        .select('*')
        .eq('scope', current.scope)
        .lt('version', current.version)
        .order('version', { ascending: false })
        .limit(1);

      if (current.vertical) query = query.eq('vertical', current.vertical);
      if (current.market) query = query.eq('market', current.market);
      if (current.organization_id) query = query.eq('organization_id', current.organization_id);

      const { data: previous } = await query.maybeSingle();

      if (!previous) {
        console.error('[Admin LLM Rules] No previous version found');
        return false;
      }

      // Deactivate current
      await supabase
        .from('llm_visibility_rule_overrides')
        .update({ is_active: false })
        .eq('id', id);

      // Activate previous
      await supabase
        .from('llm_visibility_rule_overrides')
        .update({ is_active: true })
        .eq('id', previous.id);

      console.log('[Admin LLM Rules] Rolled back to version:', previous.version);
      return true;
    } catch (error) {
      console.error('[Admin LLM Rules] Error rolling back rule override:', error);
      return false;
    }
  }

  /**
   * Get version history for a specific scope
   *
   * @param scope - Scope type
   * @param identifier - Vertical/market/orgId based on scope
   * @returns Version history
   */
  static async getVersionHistory(
    scope: 'vertical' | 'market' | 'client',
    identifier: string
  ): Promise<LLMRuleOverrideListItem[]> {
    try {
      let query = supabase
        .from('llm_visibility_rule_overrides')
        .select('*')
        .eq('scope', scope)
        .order('version', { ascending: false });

      if (scope === 'vertical') {
        query = query.eq('vertical', identifier);
      } else if (scope === 'market') {
        query = query.eq('market', identifier);
      } else if (scope === 'client') {
        query = query.eq('organization_id', identifier);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Admin LLM Rules] Error loading version history:', error);
        return [];
      }

      return (data || []).map((row) => ({
        id: row.id,
        scope: row.scope as 'vertical' | 'market' | 'client',
        vertical: row.vertical || undefined,
        market: row.market || undefined,
        organization_id: row.organization_id || undefined,
        version: row.version,
        is_active: row.is_active,
        notes: row.notes || undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    } catch (error) {
      console.error('[Admin LLM Rules] Error loading version history:', error);
      return [];
    }
  }
}
