/**
 * Rule Config Loader
 *
 * Phase 15.7: Service for loading effective rule configurations from ASO Bible
 *
 * Responsibilities:
 * - Load rule evaluator configs from database (with overrides)
 * - Merge base configs with vertical/market/client overrides
 * - Fallback to code-based defaults if DB not available
 * - Cache configs for performance
 *
 * Pattern: Bible-first, code-fallback (Phase 12 pattern)
 */

import { supabase } from '@/integrations/supabase/client';
import type { MergedRuleSet } from '@/engine/asoBible/ruleset.types';

// ============================================================================
// Types
// ============================================================================

/**
 * Effective rule configuration (merged base + overrides)
 */
export interface EffectiveRuleConfig {
  rule_id: string;
  name: string;
  scope: string;
  family: string;

  // Effective values (base × overrides)
  weight: number;
  severity: 'critical' | 'strong' | 'moderate' | 'optional' | 'info';
  threshold_low?: number;
  threshold_high?: number;

  // Metadata
  description?: string;
  help_text?: string;

  // Override info
  has_override: boolean;
  override_source?: 'client' | 'vertical' | 'market' | 'base';
}

/**
 * Rule configs grouped by scope
 */
export interface RuleConfigsByScope {
  title: EffectiveRuleConfig[];
  subtitle: EffectiveRuleConfig[];
  description: EffectiveRuleConfig[];
  coverage: EffectiveRuleConfig[];
  intent: EffectiveRuleConfig[];
  global: EffectiveRuleConfig[];
}

// ============================================================================
// Cache
// ============================================================================

interface CacheEntry {
  configs: RuleConfigsByScope;
  timestamp: number;
}

const configCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(vertical?: string, market?: string, organizationId?: string): string {
  return `${vertical || 'none'}_${market || 'none'}_${organizationId || 'none'}`;
}

function getCachedConfigs(
  vertical?: string,
  market?: string,
  organizationId?: string
): RuleConfigsByScope | null {
  const key = getCacheKey(vertical, market, organizationId);
  const entry = configCache.get(key);

  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL) {
    configCache.delete(key);
    return null;
  }

  return entry.configs;
}

function setCachedConfigs(
  configs: RuleConfigsByScope,
  vertical?: string,
  market?: string,
  organizationId?: string
): void {
  const key = getCacheKey(vertical, market, organizationId);
  configCache.set(key, {
    configs,
    timestamp: Date.now(),
  });
}

/**
 * Clear rule config cache
 */
export function clearRuleConfigCache(): void {
  configCache.clear();
}

// ============================================================================
// Load from Database
// ============================================================================

/**
 * Load effective rule configurations from database
 *
 * @param vertical - Optional vertical filter
 * @param market - Optional market filter
 * @param organizationId - Optional organization filter
 * @returns Effective rule configs by scope, or null if DB unavailable
 */
async function loadRuleConfigsFromDB(
  vertical?: string,
  market?: string,
  organizationId?: string
): Promise<RuleConfigsByScope | null> {
  try {
    // Check cache first
    const cached = getCachedConfigs(vertical, market, organizationId);
    if (cached) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[RuleConfigLoader] Using cached configs');
      }
      return cached;
    }

    // Fetch all active rules
    const { data: rules, error: rulesError } = await supabase
      .from('aso_rule_evaluators')
      .select('*')
      .eq('is_active', true)
      .order('scope')
      .order('rule_id');

    if (rulesError) {
      console.error('[RuleConfigLoader] Error fetching rules:', rulesError);
      return null;
    }

    if (!rules || rules.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[RuleConfigLoader] No rules found in database');
      }
      return null;
    }

    // Fetch overrides
    const { data: overrides, error: overridesError } = await supabase
      .from('aso_rule_evaluator_overrides')
      .select('*')
      .eq('is_active', true);

    if (overridesError) {
      console.error('[RuleConfigLoader] Error fetching overrides:', overridesError);
    }

    // Merge rules with overrides
    const effectiveConfigs: EffectiveRuleConfig[] = rules.map((rule) => {
      // Find best matching override (priority: client > vertical+market > market > vertical)
      const matchingOverrides = (overrides || []).filter((o) => {
        if (o.rule_id !== rule.rule_id) return false;

        if (o.scope === 'client' && o.organization_id === organizationId) return true;
        if (o.scope === 'vertical' && o.vertical === vertical && o.market === market) return true;
        if (o.scope === 'market' && o.market === market && !o.vertical) return true;
        if (o.scope === 'vertical' && o.vertical === vertical && !o.market) return true;

        return false;
      });

      // Get highest priority override
      const override = matchingOverrides.sort((a, b) => {
        const priorityA = a.scope === 'client' ? 1 : a.scope === 'vertical' && a.market ? 2 : a.scope === 'market' ? 3 : 4;
        const priorityB = b.scope === 'client' ? 1 : b.scope === 'vertical' && b.market ? 2 : b.scope === 'market' ? 3 : 4;
        return priorityA - priorityB;
      })[0];

      const weightMultiplier = override?.weight_multiplier || 1.0;
      const effectiveWeight = rule.weight_default * weightMultiplier;

      return {
        rule_id: rule.rule_id,
        name: rule.name,
        scope: rule.scope,
        family: rule.family,
        weight: effectiveWeight,
        severity: (override?.severity_override || rule.severity_default) as any,
        threshold_low: override?.threshold_low_override ?? rule.threshold_low,
        threshold_high: override?.threshold_high_override ?? rule.threshold_high,
        description: rule.description,
        help_text: rule.help_text,
        has_override: !!override,
        override_source: override?.scope as any,
      };
    });

    // Group by scope
    const configsByScope: RuleConfigsByScope = {
      title: effectiveConfigs.filter((c) => c.scope === 'title'),
      subtitle: effectiveConfigs.filter((c) => c.scope === 'subtitle'),
      description: effectiveConfigs.filter((c) => c.scope === 'description'),
      coverage: effectiveConfigs.filter((c) => c.scope === 'coverage'),
      intent: effectiveConfigs.filter((c) => c.scope === 'intent'),
      global: effectiveConfigs.filter((c) => c.scope === 'global'),
    };

    // Cache the result
    setCachedConfigs(configsByScope, vertical, market, organizationId);

    if (process.env.NODE_ENV === 'development') {
      console.log('[RuleConfigLoader] Loaded configs from DB:', {
        title: configsByScope.title.length,
        subtitle: configsByScope.subtitle.length,
        description: configsByScope.description.length,
        withOverrides: effectiveConfigs.filter((c) => c.has_override).length,
      });
    }

    return configsByScope;
  } catch (error) {
    console.error('[RuleConfigLoader] Error loading rule configs from DB:', error);
    return null;
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get effective rule configuration for a specific rule
 *
 * @param ruleId - Rule identifier
 * @param activeRuleSet - Optional merged ruleset context
 * @returns Effective rule config or null if not found
 */
export async function getRuleConfig(
  ruleId: string,
  activeRuleSet?: MergedRuleSet
): Promise<EffectiveRuleConfig | null> {
  const configs = await getRuleConfigs(
    activeRuleSet?.verticalId,
    activeRuleSet?.marketId,
    activeRuleSet?.organizationId
  );

  if (!configs) return null;

  // Search all scopes
  for (const scope of Object.values(configs)) {
    const config = scope.find((c) => c.rule_id === ruleId);
    if (config) return config;
  }

  return null;
}

/**
 * Get all effective rule configurations
 *
 * Bible-first pattern:
 * 1. Try to load from database
 * 2. Fallback to code-based defaults if DB unavailable
 *
 * @param vertical - Optional vertical filter
 * @param market - Optional market filter
 * @param organizationId - Optional organization filter
 * @returns Rule configs grouped by scope
 */
export async function getRuleConfigs(
  vertical?: string,
  market?: string,
  organizationId?: string
): Promise<RuleConfigsByScope | null> {
  // Try Bible first
  const dbConfigs = await loadRuleConfigsFromDB(vertical, market, organizationId);

  if (dbConfigs) {
    return dbConfigs;
  }

  // Fallback to code defaults (will be handled by metadataScoringRegistry)
  if (process.env.NODE_ENV === 'development') {
    console.log('[RuleConfigLoader] Falling back to code-based defaults');
  }

  return null;
}

/**
 * Get rule configs from active ruleset context
 *
 * @param activeRuleSet - Merged ruleset
 * @returns Rule configs grouped by scope
 */
export async function getRuleConfigsFromRuleset(
  activeRuleSet?: MergedRuleSet
): Promise<RuleConfigsByScope | null> {
  if (!activeRuleSet) {
    return await getRuleConfigs();
  }

  return await getRuleConfigs(
    activeRuleSet.verticalId,
    activeRuleSet.marketId,
    activeRuleSet.organizationId
  );
}
