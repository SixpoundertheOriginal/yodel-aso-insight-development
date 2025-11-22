/**
 * Feature Flags for ASO Audit
 *
 * Controls which features are enabled/disabled in the audit system.
 * Use these flags to progressively enable features during refactoring.
 */

/**
 * AUDIT_KEYWORDS_ENABLED
 *
 * When false:
 * - Keyword-dependent tabs are hidden from navigation
 * - Keyword API calls are skipped
 * - Keyword scoring is removed from overall audit score
 * - Placeholders are shown in tabs that require keyword data
 *
 * When true:
 * - Full keyword intelligence features are enabled
 * - All 11 tabs are available
 */
export const AUDIT_KEYWORDS_ENABLED = false;

/**
 * AUDIT_MODE
 *
 * Defines the operational mode of the audit system:
 * - "metadata-only": Only metadata-based analysis (no keyword scraping)
 * - "full": Complete analysis including keyword intelligence
 */
export const AUDIT_MODE: 'metadata-only' | 'full' = 'metadata-only';

/**
 * Tab Configuration
 *
 * Defines which tabs require keywords and should be hidden
 * when AUDIT_KEYWORDS_ENABLED is false
 *
 * CLEANUP (2025-01-18):
 * - DELETED: 'search-domination', 'keyword-strategy', 'keywords' - Keyword intelligence not implemented
 * - See docs/AUDIT_SECTIONS_CLEANUP.md for details on hidden sections
 *
 * CLEANUP (2025-11-21):
 * - DELETED: 'creative' tab - Creative analysis moved to dedicated Creative Intelligence module
 * - Creative Intelligence is a standalone module at /creative-intelligence
 */
export const TAB_KEYWORD_DEPENDENCIES = {
  'slide-view': false,              // ✅ VISIBLE - Metadata-dominated (shows placeholders for keyword sections)
  'executive-summary': false,       // ✅ VISIBLE - Metadata-only narratives
  'overview': false,                // ✅ VISIBLE - Metadata-only
  'metadata': false,                // ✅ VISIBLE - Metadata-only
  // 'creative': DELETED (2025-11-21) - Use Creative Intelligence module instead
  'competitors': true,              // ❌ HIDDEN - REQUIRES keywords (keyword overlap analysis)
  'risk-assessment': true,          // ❌ HIDDEN - REQUIRES keywords (brand risk needs keyword data)
  'recommendations': true,          // ❌ HIDDEN - REQUIRES keywords (opportunities derived from keyword gaps)
} as const;

/**
 * Get list of tabs that should be visible based on current feature flags
 */
export function getVisibleTabs(): string[] {
  if (AUDIT_KEYWORDS_ENABLED) {
    return Object.keys(TAB_KEYWORD_DEPENDENCIES);
  }

  return Object.entries(TAB_KEYWORD_DEPENDENCIES)
    .filter(([_, requiresKeywords]) => !requiresKeywords)
    .map(([tabId]) => tabId);
}

/**
 * Check if a specific tab should be visible
 */
export function isTabVisible(tabId: string): boolean {
  if (AUDIT_KEYWORDS_ENABLED) {
    return true;
  }

  return !TAB_KEYWORD_DEPENDENCIES[tabId as keyof typeof TAB_KEYWORD_DEPENDENCIES];
}
