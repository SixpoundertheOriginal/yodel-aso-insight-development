/**
 * Ruleset Version Manager
 *
 * Phase 12: Handles version stamping for merged rulesets
 *
 * Responsibilities:
 * - Build version metadata from DB
 * - Attach version info to merged rulesets
 * - Support reproducibility and audit trail
 */

// ============================================================================
// Types
// ============================================================================

export interface RulesetVersionInfo {
  rulesetVersion?: number;
  verticalVersion?: number;
  marketVersion?: number;
  clientVersion?: number;
  kpiSchemaVersion?: string;
  formulaSchemaVersion?: string;
}

export interface DbRulesetVersionMeta {
  rulesetVersion?: number;
  verticalVersion?: number;
  marketVersion?: number;
  clientVersion?: number;
}

// ============================================================================
// Version Building
// ============================================================================

/**
 * Build version info from DB metadata
 *
 * @param dbMeta - Version metadata from DB
 * @returns Complete version info
 */
export function buildVersionInfo(dbMeta: DbRulesetVersionMeta = {}): RulesetVersionInfo {
  return {
    rulesetVersion: dbMeta.rulesetVersion,
    verticalVersion: dbMeta.verticalVersion,
    marketVersion: dbMeta.marketVersion,
    clientVersion: dbMeta.clientVersion,
    kpiSchemaVersion: 'v1', // From Phase 10
    formulaSchemaVersion: 'v1', // From Phase 10
  };
}

/**
 * Create default version info (for code-based rulesets)
 *
 * @returns Default version info
 */
export function createDefaultVersionInfo(): RulesetVersionInfo {
  return {
    rulesetVersion: 1,
    kpiSchemaVersion: 'v1',
    formulaSchemaVersion: 'v1',
  };
}

/**
 * Increment ruleset version
 *
 * @param current - Current version info
 * @returns New version info with incremented ruleset version
 */
export function incrementRulesetVersion(current: RulesetVersionInfo): RulesetVersionInfo {
  return {
    ...current,
    rulesetVersion: (current.rulesetVersion || 0) + 1,
  };
}
