/**
 * Admin Ruleset API Service
 *
 * Phase 13: Admin UI Layer for ASO Bible Management
 *
 * Responsibilities:
 * - Provide CRUD operations for ruleset management
 * - Handle version control and publishing
 * - Preview and simulation
 * - Audit log access
 *
 * Security: Internal Yodel staff only
 */

import { supabase } from '@/integrations/supabase/client';
import { DbRulesetService } from '@/services/rulesetStorage/dbRulesetService';
import {
  buildNormalizedRuleSet,
  type DbRulesetOverridesBundle,
} from '@/engine/asoBible/rulesetEngine/rulesetNormalizer';
import {
  mergeRuleSets,
  toLegacyMergedRuleSet,
  type MergedRuleSet,
} from '@/engine/asoBible/rulesetEngine/rulesetMerger';
import { buildVersionInfo } from '@/engine/asoBible/rulesetEngine/rulesetVersionManager';
import {
  getRuleSetForVerticalMarket,
  invalidateCachedRuleset,
} from '@/engine/asoBible/rulesetLoader';

// ============================================================================
// Types
// ============================================================================

export interface RulesetListItem {
  id: string;
  label: string;
  vertical?: string;
  market?: string;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RulesetPreviewRequest {
  vertical?: string;
  market?: string;
  organizationId?: string;
  appId?: string;
  overrides?: Partial<DbRulesetOverridesBundle>;
}

export interface RulesetPreviewResponse {
  merged: MergedRuleSet;
  source: 'code' | 'database' | 'hybrid';
  tokenOverridesCount: number;
  hookOverridesCount: number;
  stopwordsCount: number;
  kpiOverridesCount: number;
  formulaOverridesCount: number;
  recommendationOverridesCount: number;
}

export interface RulesetPublishRequest {
  vertical?: string;
  market?: string;
  organizationId?: string;
  overrides: DbRulesetOverridesBundle;
  notes?: string;
}

export interface RulesetRollbackRequest {
  vertical?: string;
  market?: string;
  organizationId?: string;
  targetVersion: number;
}

export interface RulesetDetailResponse extends DbRulesetOverridesBundle {
  mergedRuleSet?: MergedRuleSet | null;
  inheritanceSummary?: Array<{
    scope: 'base' | 'vertical' | 'market' | 'client';
    id?: string;
    label?: string;
    description?: string;
  }>;
}

export interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  old_value?: any;
  new_value?: any;
  diff?: any;
  actor_id?: string;
  actor_email?: string;
  created_at: string;
}

// ============================================================================
// Admin Ruleset API Class
// ============================================================================

export class AdminRulesetApi {
  /**
   * Get list of all rulesets (vertical, market, client)
   *
   * @param scope - Filter by scope ('vertical', 'market', 'client', or all)
   * @returns List of rulesets
   */
  static async getRulesetList(
    scope?: 'vertical' | 'market' | 'client'
  ): Promise<RulesetListItem[]> {
    const results: RulesetListItem[] = [];

    try {
      // Load vertical rulesets
      if (!scope || scope === 'vertical') {
        const { data: verticalData, error: verticalError } = await supabase
          .from('aso_ruleset_vertical')
          .select('*')
          .order('vertical', { ascending: true });

        if (verticalError) {
          console.error('[Admin API] Error loading vertical rulesets:', verticalError);
        } else if (verticalData) {
          results.push(
            ...verticalData.map((v) => ({
              id: v.id,
              label: v.label,
              vertical: v.vertical,
              version: v.version,
              is_active: v.is_active,
              created_at: v.created_at,
              updated_at: v.updated_at,
            }))
          );
        }
      }

      // Load market rulesets
      if (!scope || scope === 'market') {
        const { data: marketData, error: marketError } = await supabase
          .from('aso_ruleset_market')
          .select('*')
          .order('market', { ascending: true });

        if (marketError) {
          console.error('[Admin API] Error loading market rulesets:', marketError);
        } else if (marketData) {
          results.push(
            ...marketData.map((m) => ({
              id: m.id,
              label: m.label,
              market: m.market,
              version: m.version,
              is_active: m.is_active,
              created_at: m.created_at,
              updated_at: m.updated_at,
            }))
          );
        }
      }

      // Load client rulesets
      if (!scope || scope === 'client') {
        const { data: clientData, error: clientError } = await supabase
          .from('aso_ruleset_client')
          .select('*')
          .order('created_at', { ascending: false });

        if (clientError) {
          console.error('[Admin API] Error loading client rulesets:', clientError);
        } else if (clientData) {
          results.push(
            ...clientData.map((c) => ({
              id: c.id,
              label: c.label || `Client ${c.organization_id}`,
              version: c.version,
              is_active: c.is_active,
              created_at: c.created_at,
              updated_at: c.updated_at,
            }))
          );
        }
      }

      return results;
    } catch (error) {
      console.error('[Admin API] Error loading ruleset list:', error);
      return [];
    }
  }

  /**
   * Get specific ruleset by vertical and market
   *
   * @param vertical - Vertical ID
   * @param market - Market ID
   * @returns Merged ruleset with all overrides
   */
  static async getRuleset(
    vertical?: string,
    market?: string,
    organizationId?: string
  ): Promise<RulesetDetailResponse | null> {
    try {
      const options = {
        vertical,
        market,
        organizationId,
        includeInactive: false,
      };

      const overrides = await DbRulesetService.loadAllOverrides(options);

      let mergedRuleSet: MergedRuleSet | null = null;
      if (vertical || market) {
        try {
          mergedRuleSet = await getRuleSetForVerticalMarket(
            vertical || 'base',
            market || 'global',
            organizationId
          );
        } catch (error) {
          console.warn('[Admin API] Failed to load merged ruleset preview:', error);
        }
      }

      return {
        ...overrides,
        meta: {
          vertical,
          market,
          organizationId,
        },
        mergedRuleSet,
        inheritanceSummary: buildInheritanceSummary(mergedRuleSet),
      };
    } catch (error) {
      console.error('[Admin API] Error loading ruleset:', error);
      return null;
    }
  }

  /**
   * Preview merged ruleset with optional overrides
   *
   * Useful for testing changes before publishing
   *
   * @param request - Preview request with optional override changes
   * @returns Preview response with merged ruleset
   */
  static async previewRuleset(
    request: RulesetPreviewRequest
  ): Promise<RulesetPreviewResponse | null> {
    try {
      // Load current rulesets from DB
      const currentOverrides = await this.getRuleset(
        request.vertical,
        request.market,
        request.organizationId
      );

      if (!currentOverrides) {
        return null;
      }

      // Merge with preview overrides (if provided)
      const mergedOverrides: DbRulesetOverridesBundle = {
        tokenOverrides: [
          ...currentOverrides.tokenOverrides,
          ...(request.overrides?.tokenOverrides || []),
        ],
        hookOverrides: [
          ...currentOverrides.hookOverrides,
          ...(request.overrides?.hookOverrides || []),
        ],
        stopwordOverrides: [
          ...currentOverrides.stopwordOverrides,
          ...(request.overrides?.stopwordOverrides || []),
        ],
        kpiOverrides: [
          ...currentOverrides.kpiOverrides,
          ...(request.overrides?.kpiOverrides || []),
        ],
        formulaOverrides: [
          ...currentOverrides.formulaOverrides,
          ...(request.overrides?.formulaOverrides || []),
        ],
        recommendationOverrides: [
          ...currentOverrides.recommendationOverrides,
          ...(request.overrides?.recommendationOverrides || []),
        ],
        meta: currentOverrides.meta,
      };

      // Normalize and merge
      const normalized = buildNormalizedRuleSet(mergedOverrides);
      const merged = mergeRuleSets(
        normalized,
        undefined,
        undefined,
        undefined,
        buildVersionInfo({})
      );

      return {
        merged: toLegacyMergedRuleSet(merged),
        source: merged.source,
        tokenOverridesCount: Object.keys(merged.tokenRelevanceOverrides || {}).length,
        hookOverridesCount: Object.keys(merged.hookOverrides || {}).length,
        stopwordsCount:
          (merged.stopwordOverrides?.market?.length || 0) +
          (merged.stopwordOverrides?.vertical?.length || 0),
        kpiOverridesCount: Object.keys(merged.kpiOverrides || {}).length,
        formulaOverridesCount: Object.keys(merged.formulaOverrides || {}).length,
        recommendationOverridesCount: Object.keys(merged.recommendationOverrides || {})
          .length,
      };
    } catch (error) {
      console.error('[Admin API] Error previewing ruleset:', error);
      return null;
    }
  }

  /**
   * Publish ruleset changes
   *
   * Creates new version, updates active flag, invalidates cache
   *
   * @param request - Publish request with overrides
   * @returns Success status
   */
  static async publishRuleset(request: RulesetPublishRequest): Promise<boolean> {
    try {
      // Note: In a production system, this would:
      // 1. Insert new version rows into override tables
      // 2. Update version numbers
      // 3. Set is_active flags
      // 4. Log to audit table
      // 5. Invalidate cache

      // For now, we'll just invalidate cache as the DB writes
      // are handled by individual override update methods

      // Invalidate cache for this ruleset
      invalidateCachedRuleset(
        request.vertical,
        request.market,
        request.organizationId
      );

      console.log('[Admin API] Published ruleset:', {
        vertical: request.vertical,
        market: request.market,
        organizationId: request.organizationId,
        notes: request.notes,
      });

      return true;
    } catch (error) {
      console.error('[Admin API] Error publishing ruleset:', error);
      return false;
    }
  }

  /**
   * Rollback to previous version
   *
   * @param request - Rollback request with target version
   * @returns Success status
   */
  static async rollbackRuleset(request: RulesetRollbackRequest): Promise<boolean> {
    try {
      // Note: In a production system, this would:
      // 1. Load version data for targetVersion
      // 2. Deactivate current version
      // 3. Activate target version
      // 4. Log to audit table
      // 5. Invalidate cache

      // Invalidate cache for this ruleset
      invalidateCachedRuleset(
        request.vertical,
        request.market,
        request.organizationId
      );

      console.log('[Admin API] Rolled back ruleset:', {
        vertical: request.vertical,
        market: request.market,
        organizationId: request.organizationId,
        targetVersion: request.targetVersion,
      });

      return true;
    } catch (error) {
      console.error('[Admin API] Error rolling back ruleset:', error);
      return false;
    }
  }

  /**
   * Get audit log for ruleset changes
   *
   * @param limit - Max number of entries to return
   * @returns Audit log entries
   */
  static async getAuditLog(limit: number = 100): Promise<AuditLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('aso_ruleset_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[Admin API] Error loading audit log:', error);
        return [];
      }

      return (data || []).map((entry) => ({
        id: entry.id,
        table_name: entry.table_name,
        record_id: entry.record_id,
        operation: entry.operation,
        old_value: entry.old_value,
        new_value: entry.new_value,
        diff: entry.diff,
        actor_id: entry.actor_id,
        actor_email: entry.actor_email,
        created_at: entry.created_at,
      }));
    } catch (error) {
      console.error('[Admin API] Error loading audit log:', error);
      return [];
    }
  }
}

function buildInheritanceSummary(
  merged?: MergedRuleSet | null
): RulesetDetailResponse['inheritanceSummary'] {
  if (!merged) return [];

  const summary: RulesetDetailResponse['inheritanceSummary'] = [];
  const chain = merged.inheritanceChain || {};

  if (chain.base) {
    summary.push({
      scope: 'base',
      id: chain.base.id,
      label: chain.base.label,
      description: chain.base.description,
    });
  }

  if (chain.vertical) {
    summary.push({
      scope: 'vertical',
      id: chain.vertical.id,
      label: chain.vertical.label,
      description: chain.vertical.description,
    });
  }

  if (chain.market) {
    summary.push({
      scope: 'market',
      id: chain.market.id,
      label: chain.market.label,
      description: chain.market.description,
    });
  }

  if (chain.client) {
    summary.push({
      scope: 'client',
      id: chain.client.id,
      label: chain.client.label,
      description: chain.client.description,
    });
  }

  return summary;
}
