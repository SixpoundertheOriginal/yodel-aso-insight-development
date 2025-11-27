/**
 * Intent Pattern Admin Service
 *
 * Phase 16: Intent Intelligence Registry - Service Layer
 *
 * Provides read/write access to intent pattern registry with admin capabilities:
 * - Get patterns with effective weights (base + overrides)
 * - Update pattern weights, priorities, and metadata
 * - Manage scope-specific overrides (vertical, market, client, app)
 * - Get patterns by intent type (informational, commercial, navigational, transactional)
 *
 * All changes are stored as database overrides, not code modifications.
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Types
// ============================================================================

// v2.0: Expanded from 4 to 7 intent types (Phase 1)
export type IntentType =
  | 'informational'   // "learn", "how to", "what is"
  | 'commercial'      // "best", "top", "compare"
  | 'navigational'    // LEGACY: brand intent (keeping for backward compatibility)
  | 'transactional'   // "try", "start", "get", "free", "download"
  | 'brand'           // NEW v2.0: brand intent (preferred term, same as navigational)
  | 'category'        // NEW v2.0: "language learning app", "finance app"
  | 'feature';        // NEW v2.0: "offline mode", "voice recognition"

export type IntentScope = 'base' | 'vertical' | 'market' | 'client' | 'app';

/**
 * Intent pattern with admin metadata and effective configuration
 */
export interface IntentPatternWithAdminMeta {
  // Base pattern data
  id: string;
  pattern: string;
  intent_type: IntentType;
  example?: string;
  description?: string;

  // Scope
  scope: IntentScope;
  vertical?: string;
  market?: string;
  organization_id?: string;
  app_id?: string;

  // Default configuration
  weight: number;
  priority: number;

  // Pattern matching config
  is_regex: boolean;
  case_sensitive: boolean;
  word_boundary: boolean;

  // Status
  is_active: boolean;

  // Admin metadata
  admin_tags?: string[];
  notes?: string;

  // Effective configuration (with overrides applied)
  effective_weight?: number;
  effective_priority?: number;
  has_override?: boolean;
  override_source?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  version: number;
}

/**
 * Intent pattern override
 */
export interface IntentPatternOverride {
  id: string;
  base_pattern_id: string;
  scope: Exclude<IntentScope, 'base'>;
  vertical?: string;
  market?: string;
  organization_id?: string;
  app_id?: string;
  weight_multiplier?: number;
  is_active?: boolean;
  priority_override?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Request to create new intent pattern
 */
export interface CreateIntentPatternRequest {
  pattern: string;
  intent_type: IntentType;
  example?: string;
  description?: string;
  scope?: IntentScope;
  vertical?: string;
  market?: string;
  organization_id?: string;
  app_id?: string;
  weight?: number;
  priority?: number;
  is_regex?: boolean;
  case_sensitive?: boolean;
  word_boundary?: boolean;
  admin_tags?: string[];
  notes?: string;
}

/**
 * Request to update intent pattern metadata
 */
export interface UpdateIntentPatternRequest {
  patternId: string;
  example?: string;
  description?: string;
  weight?: number;
  priority?: number;
  is_regex?: boolean;
  case_sensitive?: boolean;
  word_boundary?: boolean;
  admin_tags?: string[];
  notes?: string;
  is_active?: boolean;
}

/**
 * Request to create/update intent pattern override
 */
export interface CreateIntentOverrideRequest {
  basePatternId: string;
  scope: Exclude<IntentScope, 'base'>;
  vertical?: string;
  market?: string;
  organizationId?: string;
  appId?: string;
  weightMultiplier?: number;
  priorityOverride?: number;
  isActive?: boolean;
}

/**
 * Filter options for querying patterns
 */
export interface IntentPatternFilters {
  intentType?: IntentType;
  scope?: IntentScope;
  vertical?: string;
  market?: string;
  organizationId?: string;
  appId?: string;
  isActive?: boolean;
  tags?: string[];
}

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get all intent patterns with admin metadata and effective weights
 *
 * @param filters - Optional filters
 * @returns Array of patterns with effective configuration
 */
export async function getAllIntentPatternsWithAdminMeta(
  filters?: IntentPatternFilters
): Promise<IntentPatternWithAdminMeta[]> {
  try {
    // Build query
    let query = supabase
      .from('aso_intent_patterns')
      .select('*')
      .order('priority', { ascending: false })
      .order('pattern');

    // Apply filters
    if (filters?.intentType) {
      query = query.eq('intent_type', filters.intentType);
    }
    if (filters?.scope) {
      query = query.eq('scope', filters.scope);
    }
    if (filters?.vertical) {
      query = query.eq('vertical', filters.vertical);
    }
    if (filters?.market) {
      query = query.eq('market', filters.market);
    }
    if (filters?.organizationId) {
      query = query.eq('organization_id', filters.organizationId);
    }
    if (filters?.appId) {
      query = query.eq('app_id', filters.appId);
    }
    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }
    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('admin_tags', filters.tags);
    }

    const { data: patterns, error } = await query;

    if (error) {
      console.error('Error fetching intent patterns:', error);
      return [];
    }

    if (!patterns) return [];

    // Fetch overrides for patterns
    const { data: overrides, error: overridesError } = await supabase
      .from('aso_intent_pattern_overrides')
      .select('*')
      .eq('is_active', true);

    if (overridesError) {
      console.error('Error fetching pattern overrides:', overridesError);
    }

    // Merge patterns with overrides
    return patterns.map((pattern) => {
      // Find best matching override for this pattern
      const matchingOverrides = (overrides || []).filter((o) => {
        if (o.base_pattern_id !== pattern.id) return false;

        // Check scope match
        if (filters?.appId && o.app_id === filters.appId) return true;
        if (filters?.organizationId && o.organization_id === filters.organizationId) return true;
        if (filters?.market && filters?.vertical && o.market === filters.market && o.vertical === filters.vertical) return true;
        if (filters?.market && o.market === filters.market && !o.vertical) return true;
        if (filters?.vertical && o.vertical === filters.vertical && !o.market) return true;

        return false;
      });

      // Get highest priority override (app > client > market+vertical > market > vertical)
      const override = matchingOverrides.sort((a, b) => {
        const priorityA = a.app_id ? 1 : a.organization_id ? 2 : a.market && a.vertical ? 3 : a.market ? 4 : 5;
        const priorityB = b.app_id ? 1 : b.organization_id ? 2 : b.market && b.vertical ? 3 : b.market ? 4 : 5;
        return priorityA - priorityB;
      })[0];

      const weightMultiplier = override?.weight_multiplier || 1.0;
      const effectiveWeight = pattern.weight * weightMultiplier;

      return {
        ...pattern,
        effective_weight: effectiveWeight,
        effective_priority: override?.priority_override ?? pattern.priority,
        has_override: !!override,
        override_source: override ? override.scope : undefined,
      };
    });
  } catch (error) {
    console.error('Error in getAllIntentPatternsWithAdminMeta:', error);
    return [];
  }
}

/**
 * Get single intent pattern with admin metadata
 *
 * @param patternId - Pattern UUID
 * @param filters - Optional context filters for effective weights
 * @returns Pattern with admin metadata or null
 */
export async function getIntentPatternWithAdminMeta(
  patternId: string,
  filters?: IntentPatternFilters
): Promise<IntentPatternWithAdminMeta | null> {
  const allPatterns = await getAllIntentPatternsWithAdminMeta(filters);
  return allPatterns.find((p) => p.id === patternId) || null;
}

/**
 * Get patterns by intent type
 *
 * @param intentType - Intent type filter
 * @returns Array of patterns for the specified type
 */
export async function getPatternsByIntentType(
  intentType: IntentType
): Promise<IntentPatternWithAdminMeta[]> {
  return getAllIntentPatternsWithAdminMeta({ intentType });
}

/**
 * Get patterns by scope
 *
 * @param scope - Scope filter
 * @returns Array of patterns for the specified scope
 */
export async function getPatternsByScope(
  scope: IntentScope
): Promise<IntentPatternWithAdminMeta[]> {
  return getAllIntentPatternsWithAdminMeta({ scope });
}

/**
 * Get effective patterns for a given context
 *
 * Uses the database helper function to merge base patterns with overrides
 * based on scope precedence.
 *
 * @param vertical - Vertical context
 * @param market - Market context
 * @param organizationId - Organization context
 * @param appId - App context
 * @returns Array of effective patterns with overrides applied
 */
export async function getEffectiveIntentPatterns(
  vertical?: string,
  market?: string,
  organizationId?: string,
  appId?: string
): Promise<IntentPatternWithAdminMeta[]> {
  try {
    const { data, error } = await supabase.rpc('get_effective_intent_patterns', {
      p_vertical: vertical || null,
      p_market: market || null,
      p_organization_id: organizationId || null,
      p_app_id: appId || null,
    });

    if (error) {
      console.error('Error fetching effective patterns:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.pattern_id,
      pattern: row.pattern,
      intent_type: row.intent_type,
      example: row.example,
      scope: 'base' as IntentScope,
      weight: row.effective_weight,
      priority: row.priority,
      is_active: row.is_active,
      is_regex: false,
      case_sensitive: false,
      word_boundary: true,
      effective_weight: row.effective_weight,
      effective_priority: row.priority,
      has_override: row.has_override,
      override_source: row.override_source,
      created_at: '',
      updated_at: '',
      version: 1,
    }));
  } catch (error) {
    console.error('Error in getEffectiveIntentPatterns:', error);
    return [];
  }
}

// ============================================================================
// Write Operations - Patterns
// ============================================================================

/**
 * Create new intent pattern
 *
 * @param request - Pattern creation request
 * @returns Created pattern ID or null
 */
export async function createIntentPattern(
  request: CreateIntentPatternRequest
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('aso_intent_patterns')
      .insert({
        pattern: request.pattern,
        intent_type: request.intent_type,
        example: request.example || null,
        description: request.description || null,
        scope: request.scope || 'base',
        vertical: request.vertical || null,
        market: request.market || null,
        organization_id: request.organization_id || null,
        app_id: request.app_id || null,
        weight: request.weight ?? 1.0,
        priority: request.priority ?? 0,
        is_regex: request.is_regex ?? false,
        case_sensitive: request.case_sensitive ?? false,
        word_boundary: request.word_boundary ?? true,
        is_active: true,
        admin_tags: request.admin_tags || null,
        notes: request.notes || null,
        version: 1,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating intent pattern:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('Error in createIntentPattern:', error);
    return null;
  }
}

/**
 * Update intent pattern metadata
 *
 * @param request - Pattern update request
 * @returns Success boolean
 */
export async function updateIntentPattern(
  request: UpdateIntentPatternRequest
): Promise<boolean> {
  try {
    const updates: any = {};

    if (request.example !== undefined) updates.example = request.example;
    if (request.description !== undefined) updates.description = request.description;
    if (request.weight !== undefined) updates.weight = request.weight;
    if (request.priority !== undefined) updates.priority = request.priority;
    if (request.is_regex !== undefined) updates.is_regex = request.is_regex;
    if (request.case_sensitive !== undefined) updates.case_sensitive = request.case_sensitive;
    if (request.word_boundary !== undefined) updates.word_boundary = request.word_boundary;
    if (request.admin_tags !== undefined) updates.admin_tags = request.admin_tags;
    if (request.notes !== undefined) updates.notes = request.notes;
    if (request.is_active !== undefined) updates.is_active = request.is_active;

    const { error } = await supabase
      .from('aso_intent_patterns')
      .update(updates)
      .eq('id', request.patternId);

    if (error) {
      console.error('Error updating intent pattern:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateIntentPattern:', error);
    return false;
  }
}

/**
 * Delete intent pattern
 *
 * @param patternId - Pattern UUID to delete
 * @returns Success boolean
 */
export async function deleteIntentPattern(patternId: string): Promise<boolean> {
  try {
    // Soft delete by marking inactive
    const { error } = await supabase
      .from('aso_intent_patterns')
      .update({ is_active: false })
      .eq('id', patternId);

    if (error) {
      console.error('Error deleting intent pattern:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteIntentPattern:', error);
    return false;
  }
}

// ============================================================================
// Write Operations - Overrides
// ============================================================================

/**
 * Create or update intent pattern override
 *
 * @param request - Override creation/update request
 * @returns Success boolean
 */
export async function createOrUpdateIntentOverride(
  request: CreateIntentOverrideRequest
): Promise<boolean> {
  try {
    // Validate weight multiplier bounds
    if (request.weightMultiplier !== undefined) {
      if (request.weightMultiplier < 0.1 || request.weightMultiplier > 3.0) {
        console.error('Weight multiplier must be between 0.1 and 3.0');
        return false;
      }
    }

    // Check if base pattern exists
    const { data: basePattern } = await supabase
      .from('aso_intent_patterns')
      .select('id')
      .eq('id', request.basePatternId)
      .maybeSingle();

    if (!basePattern) {
      console.error(`Base pattern ${request.basePatternId} not found`);
      return false;
    }

    // Upsert override
    const { error } = await supabase
      .from('aso_intent_pattern_overrides')
      .upsert(
        {
          base_pattern_id: request.basePatternId,
          scope: request.scope,
          vertical: request.vertical || null,
          market: request.market || null,
          organization_id: request.organizationId || null,
          app_id: request.appId || null,
          weight_multiplier: request.weightMultiplier ?? null,
          priority_override: request.priorityOverride ?? null,
          is_active: request.isActive ?? true,
        },
        {
          onConflict: 'base_pattern_id,scope,vertical,market,organization_id,app_id',
        }
      );

    if (error) {
      console.error('Error creating/updating intent override:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in createOrUpdateIntentOverride:', error);
    return false;
  }
}

/**
 * Delete intent pattern override
 *
 * @param overrideId - Override UUID to delete
 * @returns Success boolean
 */
export async function deleteIntentOverride(overrideId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('aso_intent_pattern_overrides')
      .delete()
      .eq('id', overrideId);

    if (error) {
      console.error('Error deleting intent override:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteIntentOverride:', error);
    return false;
  }
}

// ============================================================================
// Statistics and Analytics
// ============================================================================

/**
 * Get intent pattern statistics
 *
 * @returns Statistics about pattern registry
 */
export async function getIntentPatternStatistics() {
  const allPatterns = await getAllIntentPatternsWithAdminMeta();

  return {
    total: allPatterns.length,
    active: allPatterns.filter((p) => p.is_active).length,
    inactive: allPatterns.filter((p) => !p.is_active).length,
    withOverrides: allPatterns.filter((p) => p.has_override).length,
    byIntentType: {
      informational: allPatterns.filter((p) => p.intent_type === 'informational').length,
      commercial: allPatterns.filter((p) => p.intent_type === 'commercial').length,
      navigational: allPatterns.filter((p) => p.intent_type === 'navigational').length,
      transactional: allPatterns.filter((p) => p.intent_type === 'transactional').length,
    },
    byScope: {
      base: allPatterns.filter((p) => p.scope === 'base').length,
      vertical: allPatterns.filter((p) => p.scope === 'vertical').length,
      market: allPatterns.filter((p) => p.scope === 'market').length,
      client: allPatterns.filter((p) => p.scope === 'client').length,
      app: allPatterns.filter((p) => p.scope === 'app').length,
    },
    regex: allPatterns.filter((p) => p.is_regex).length,
    caseSensitive: allPatterns.filter((p) => p.case_sensitive).length,
    averageWeight: allPatterns.reduce((sum, p) => sum + p.weight, 0) / allPatterns.length || 1.0,
    averagePriority: allPatterns.reduce((sum, p) => sum + p.priority, 0) / allPatterns.length || 0,
  };
}

/**
 * Get all unique tags used across patterns
 *
 * @returns Array of unique tags
 */
export async function getAllPatternTags(): Promise<string[]> {
  const allPatterns = await getAllIntentPatternsWithAdminMeta();
  const tagSet = new Set<string>();

  allPatterns.forEach((pattern) => {
    if (pattern.admin_tags) {
      pattern.admin_tags.forEach((tag) => tagSet.add(tag));
    }
  });

  return Array.from(tagSet).sort();
}
