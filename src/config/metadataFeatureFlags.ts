/**
 * Feature Flags for Metadata Extraction
 *
 * Controls experimental and progressive rollout features for the metadata pipeline.
 */

/**
 * ENABLE_DOM_SUBTITLE_EXTRACTION
 *
 * Controls DOM-based subtitle extraction from hydrated App Store HTML.
 *
 * **Background:**
 * Real-world testing has proven that App Store subtitles are ONLY present in the
 * hydrated DOM and NOT in any JSON blocks (JSON-LD, application/json, etc.).
 *
 * **When false (default - SAFETY MODE):**
 * - Uses existing multi-selector fallback approach
 * - Subtitle extraction attempts all legacy selectors
 * - No behavioral changes to production
 *
 * **When true (EXPERIMENTAL):**
 * - Uses validated DOM-first extraction approach
 * - Primary selector: 'h2.subtitle' (95% success rate in testing)
 * - Fallback selectors: Legacy multi-selector approach
 * - Telemetry logs: subtitle_source = "dom" | "fallback" | "none"
 *
 * **Experimental Validation:**
 * - Tested on 20 high-quality App Store pages
 * - DOM extraction: 19/20 success (95%)
 * - JSON extraction: 0/20 success (0% - expected)
 * - Scripts: scripts/test-subtitle-dom-extractor.ts
 * - Documentation: scripts/README.subtitle-dom-testing.md
 *
 * **Hydrated HTML Requirement:**
 * App Store uses JavaScript hydration to render subtitles dynamically.
 * Static HTML (curl/fetch) does NOT contain subtitles.
 * Hydrated HTML (Puppeteer/browser rendering) DOES contain subtitles.
 *
 * **Integration Architecture:**
 * This flag controls behavior in:
 * - src/services/metadata-adapters/appstore-web.adapter.ts (extractSubtitle method)
 *
 * **Rollout Plan:**
 * 1. Phase 1 (Current): Flag=false, no changes, safe deployment
 * 2. Phase 2: Flag=true, monitor telemetry for subtitle_source="dom" vs "fallback"
 * 3. Phase 3: If DOM success rate >90%, remove flag and make DOM-first default
 *
 * @default false
 * @see scripts/README.subtitle-dom-testing.md
 * @see docs/METADATA_EXTRACTION.md
 */
export const ENABLE_DOM_SUBTITLE_EXTRACTION = true; // PRODUCTION - Enabled after successful staging validation (95% success rate)

/**
 * Subtitle extraction telemetry
 *
 * Tracks which method successfully extracted the subtitle:
 * - "dom": Primary DOM selector (h2.subtitle) succeeded
 * - "fallback": Fallback selectors succeeded
 * - "none": No subtitle found
 */
export type SubtitleSource = 'dom' | 'fallback' | 'none';

/**
 * ENABLE_PRERENDERED_FETCH
 *
 * Controls whether to fetch Apple's pre-rendered (SSR) version of App Store pages
 * instead of the default client-side hydrated HTML.
 *
 * **Background:**
 * Apple App Store pages are available in two forms:
 * 1. Client-side hydrated (default): Requires JavaScript execution to render subtitles
 * 2. Server-side rendered (SSR): Pre-rendered HTML with all content including subtitles
 *
 * The SSR version is triggered by specific URL parameters (?platform=iphone&see-all=reviews)
 * and provides immediate access to subtitle content without Puppeteer/browser automation.
 *
 * **When false (default - SAFETY MODE):**
 * - Uses standard App Store URLs without SSR parameters
 * - Relies on existing fetch logic (static HTML or Puppeteer)
 * - No behavioral changes to production
 * - Subtitle extraction depends on DOM hydration state
 *
 * **When true (EXPERIMENTAL - SSR MODE):**
 * - Appends SSR trigger parameters to App Store URLs
 * - Fetches pre-rendered HTML with subtitle content already present
 * - No JavaScript execution required
 * - Eliminates need for Puppeteer for subtitle extraction
 * - Dev-only diagnostic logging enabled
 *
 * **Expected Behavior:**
 * - SSR HTML is ~50-70% larger than static HTML
 * - Contains fully rendered <h2 class="subtitle"> elements
 * - Includes all metadata visible on page load
 * - Compatible with existing DOM extraction pipeline
 *
 * **Safety Features:**
 * - URL construction never throws (fallback to original URL)
 * - Preserves all existing query parameters
 * - Maintains country/region detection
 * - Zero changes to extraction logic
 *
 * **Rollout Plan:**
 * 1. Phase 1 (Current): Flag=false, no changes, safe deployment
 * 2. Phase 2: Flag=true in staging, validate subtitle extraction success rate
 * 3. Phase 3: Flag=true in production (canary 10%), monitor errors/latency
 * 4. Phase 4: Flag=true for all traffic if success rate >95%
 * 5. Phase 5: Remove flag and make SSR fetch default behavior
 *
 * **Rollback Plan:**
 * - Instant rollback: Set flag to false (restores legacy behavior)
 * - Emergency rollback: Revert commit
 * - No data loss, no migration required
 *
 * **Integration Architecture:**
 * This flag controls behavior in:
 * - src/services/metadata-adapters/appstore-web.adapter.ts (fetch method)
 * - Specifically the URL construction before HTML fetch
 *
 * **Telemetry to Monitor:**
 * - HTML response size (should increase 50-70%)
 * - Subtitle extraction success rate (should reach ~100%)
 * - Fetch latency (may increase slightly due to larger response)
 * - HTTP errors (should remain same or improve)
 *
 * @default false
 * @see docs/PRERENDERED_FETCH_IMPLEMENTATION.md
 */
export const ENABLE_PRERENDERED_FETCH = true; // DEVELOPMENT TESTING - E2E Subtitle Validation

/**
 * ENABLE_WEB_ADAPTER_PRIORITY
 *
 * Controls whether the App Store Web Adapter runs before the App Store Edge Adapter
 * in the orchestrator's adapter priority chain.
 *
 * **Background:**
 * The orchestrator tries adapters in priority order. By default:
 * - AppStoreEdge (priority 5) runs first - uses Edge Function, NO subtitle support
 * - AppStoreWeb (priority 10) runs second - uses pre-rendered fetch, HAS subtitle support
 *
 * This means subtitles are NEVER extracted because Edge adapter succeeds without subtitles,
 * and Web adapter never gets a chance to run.
 *
 * **When false (default - LEGACY BEHAVIOR):**
 * - Edge adapter runs first (priority 5)
 * - Web adapter runs as fallback (priority 10)
 * - Subtitles NOT extracted (Edge adapter doesn't support them)
 * - Original orchestrator behavior preserved
 *
 * **When true (SUBTITLE-FIRST MODE):**
 * - Web adapter runs first (priority temporarily adjusted to 1)
 * - Edge adapter runs as fallback (priority remains 5)
 * - Subtitles ARE extracted (Web adapter supports pre-rendered fetch + DOM extraction)
 * - All other adapters maintain their original priority
 * - Dev-only diagnostic logging enabled
 *
 * **Integration Architecture:**
 * This flag controls behavior in:
 * - src/services/metadata-adapters/orchestrator.ts (getActiveAdapters method)
 * - Temporarily adjusts Web adapter priority when flag is true
 * - No changes to adapter implementations
 *
 * **Safety Features:**
 * - Zero changes to adapter logic
 * - Edge adapter still used as fallback if Web adapter fails
 * - iTunes adapters remain unchanged
 * - Fully reversible via flag toggle
 *
 * **Rollout Plan:**
 * 1. Phase 1 (Current): Flag=false, no changes, safe deployment
 * 2. Phase 2: Flag=true in development, validate subtitle extraction success rate
 * 3. Phase 3: Flag=true in staging, monitor for 48 hours
 * 4. Phase 4: Flag=true in production (canary 10%), monitor errors/latency
 * 5. Phase 5: Remove flag and make Web-first priority default
 *
 * **Rollback Plan:**
 * - Instant rollback: Set flag to false (restores Edge-first behavior)
 * - Emergency rollback: Revert commit
 * - No data loss, no migration required
 *
 * **Expected Behavior:**
 * - Web adapter priority: 1 (runs first)
 * - Edge adapter priority: 5 (runs second)
 * - iTunes Search priority: 10 (runs third)
 * - iTunes Lookup priority: 20 (runs fourth)
 *
 * **Telemetry to Monitor:**
 * - Subtitle extraction success rate (should reach ~100%)
 * - Web adapter success rate (should remain high)
 * - Edge adapter usage (should decrease significantly)
 * - Overall fetch latency (may increase slightly)
 *
 * @default false
 * @see docs/METADATA_EXTRACTION.md
 */
export const ENABLE_WEB_ADAPTER_PRIORITY = true; // DEVELOPMENT TESTING - E2E Subtitle Validation

/**
 * PHASE D: SSR-Lite Subtitle Hydration Fallback
 *
 * When enabled, if DOM subtitle extraction fails (subtitle is empty after pre-rendered fetch),
 * the system will attempt to hydrate the subtitle using Playwright WebKit.
 *
 * This is a fallback mechanism for cases where Apple's pre-rendered HTML doesn't include
 * the subtitle element, requiring JavaScript execution to populate it.
 *
 * Technical Details:
 * - Uses headless Playwright WebKit browser
 * - Only hydrates the header area (minimal resources)
 * - Strict 10-second timeout to prevent hanging
 * - Gracefully degrades on failure
 * - Adds ~2-5 seconds latency when triggered
 * - Only runs when DOM extraction returns empty subtitle
 *
 * Performance Impact:
 * - ONLY when subtitle is missing from pre-rendered HTML
 * - Adds hydration latency (2-5s) but ensures subtitle is extracted
 * - Memory: ~50-100MB per hydration (cleaned up immediately)
 * - Network: One additional page load
 *
 * Telemetry:
 * - subtitleHydrationAttempted: boolean
 * - subtitleHydrationSucceeded: boolean
 * - hydrationLatencyMs: number
 *
 * Rollback:
 * - Set to false to disable hydration fallback
 * - No other code changes needed
 *
 * @default false
 * @since 2024-11-20 Phase D Implementation
 * @see src/lib/metadata/subtitleHydration.ssr.ts
 */
export const ENABLE_SSR_LITE_SUBTITLE_HYDRATION = true; // ENABLED for Phase D testing

/**
 * AUDIT_METADATA_V2_ENABLED
 *
 * Controls rollout of the new Unified Metadata Audit V2 UI module.
 *
 * **Background:**
 * Consolidates two overlapping scoring systems into a single backend-driven approach:
 * - Legacy: MetadataScoringPanel + EnhancedOverviewTab (frontend computation)
 * - New: UnifiedMetadataAuditModule (backend metadata-audit-v2 Edge Function)
 *
 * **When false (default - LEGACY MODE):**
 * - Uses existing EnhancedOverviewTab in Slide View
 * - Frontend-based scoring logic
 * - No changes to production behavior
 *
 * **When true (UNIFIED AUDIT V2):**
 * - Uses UnifiedMetadataAuditModule in Slide View
 * - Backend-driven scoring via metadata-audit-v2 Edge Function
 * - Element-by-element analysis with 15+ scoring rules
 * - Benchmark comparisons with category percentiles
 * - Keyword and combo coverage visualization
 *
 * **Features:**
 * - Overall metadata score (0-100)
 * - Per-element scoring (app_name, title, subtitle, description)
 * - Rule-by-rule evaluation with pass/fail indicators
 * - Top recommendations prioritized by impact
 * - Expandable element detail cards
 * - Real-time API integration with React Query
 *
 * **Integration:**
 * - Modifies: src/components/AppAudit/SlideView/SlideViewPanel.tsx
 * - Conditionally renders UnifiedMetadataAuditModule vs EnhancedOverviewTab
 * - Zero impact when flag is false
 *
 * **Rollout Plan:**
 * 1. Phase 1 (Current): Flag=false, no changes, safe deployment
 * 2. Phase 2: Flag=true in development, validate UI and API integration
 * 3. Phase 3: Flag=true in staging, user acceptance testing
 * 4. Phase 4: Flag=true in production (canary 10%), monitor performance
 * 5. Phase 5: Remove flag and make V2 default
 *
 * @default false
 * @since 2025-11-22 Metadata Audit V2 Implementation
 * @see src/components/AppAudit/UnifiedMetadataAuditModule/
 */
export const AUDIT_METADATA_V2_ENABLED = true; // ENABLED for development testing

/**
 * AUTOCOMPLETE_INTELLIGENCE_ENABLED
 *
 * Controls rollout of the Autocomplete Intelligence Layer for semantic keyword expansion.
 *
 * **Background:**
 * Adds search intent classification to the Keyword Intelligence and Metadata Copilot systems
 * using Apple/Google autocomplete API data. This enables smarter keyword recommendations based
 * on how users actually search in the App Store.
 *
 * **When false (default - LEGACY MODE):**
 * - Keyword Intelligence uses basic keyword analysis only
 * - Metadata Copilot seed expansion uses simple token matching
 * - No autocomplete API calls
 * - No intent classification
 * - No changes to production behavior
 *
 * **When true (AUTOCOMPLETE INTELLIGENCE MODE):**
 * - Fetches Apple/Google autocomplete suggestions for target keywords
 * - Classifies search intent (navigational, informational, commercial, transactional)
 * - Stores intent classifications in search_intent_registry table
 * - Caches autocomplete responses (7-day TTL) in autocomplete_intelligence_cache
 * - Keyword Intelligence shows intent badges and autocomplete-aware scoring
 * - Metadata Copilot seed expansion prioritizes high-intent keywords
 *
 * **Features:**
 * - Search Intent Registry: Persistent keyword intent classifications
 * - Autocomplete Cache: 7-day TTL cache to reduce external API costs
 * - Intent Classification: Heuristic-based intent analysis from autocomplete patterns
 * - Edge Function Integration: autocomplete-intelligence function for API calls
 * - UI Enhancements: Intent badges in Keyword Intelligence, seed keyword expansion hints
 *
 * **Intent Types:**
 * - Navigational: User searching for specific app (e.g., "facebook", "spotify")
 * - Informational: User seeking information (e.g., "how to learn spanish")
 * - Commercial: User researching products (e.g., "best fitness tracker")
 * - Transactional: User ready to download (e.g., "free photo editor")
 *
 * **Database Tables:**
 * - search_intent_registry: Stores keyword intent classifications
 * - autocomplete_intelligence_cache: Caches autocomplete API responses
 * - Migration: 20260123000004_create_autocomplete_intelligence_tables.sql
 *
 * **Integration Points:**
 * - ASO Audit V2: Intent-aware keyword coverage scoring
 * - Keyword Intelligence: Intent badges and autocomplete-aware ranking
 * - Metadata Copilot: Seed keyword expansion with intent prioritization
 * - Competitor Intelligence: Optional intent analysis for competitor keywords
 *
 * **Protected Invariants (NEVER MODIFIED):**
 * - MetadataOrchestrator: No changes to metadata extraction flow
 * - Metadata Adapters: No changes to scraping logic
 * - BigQuery schemas: No changes to analytics pipeline
 * - Analytics Edge Functions: No changes to existing metrics
 *
 * **Rollout Plan:**
 * 1. Phase 1 (Current): Database migration + Edge Function deployment
 * 2. Phase 2: Service layer integration (hooks, React Query)
 * 3. Phase 3: UI integration (Keyword Intelligence, Metadata Copilot)
 * 4. Phase 4: Staging validation + user acceptance testing
 * 5. Phase 5: Production canary rollout (10% traffic)
 * 6. Phase 6: Full production rollout
 *
 * **Rollback Plan:**
 * - Instant rollback: Set flag to false (disables all autocomplete features)
 * - Emergency rollback: Revert commits (no data loss)
 * - Database tables remain (safe to keep for future re-enablement)
 *
 * **Performance Considerations:**
 * - Autocomplete API latency: ~200-500ms per query
 * - Cache hit rate target: >80% (7-day TTL)
 * - Database inserts: Async, non-blocking
 * - UI updates: React Query with stale-while-revalidate strategy
 *
 * **Cost Management:**
 * - Cache reduces external API calls by ~80%
 * - No autocomplete calls for cached keywords
 * - Intent classifications persist indefinitely (no re-fetching needed)
 *
 * @default false
 * @since 2026-01-23 Autocomplete Intelligence V1 Implementation
 * @see docs/AUTOCOMPLETE_INTELLIGENCE_AUDIT.md
 * @see supabase/functions/autocomplete-intelligence/
 */
export const AUTOCOMPLETE_INTELLIGENCE_ENABLED = true; // ENABLED - Phase 2 testing

/**
 * AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED
 *
 * Controls rollout of the Brand Intelligence enrichment layer for combo and intent analysis.
 *
 * **Background:**
 * Phase 5 extension that adds brand/generic classification to:
 * - Combo Coverage (Audit V2)
 * - Autocomplete Intent Intelligence (Phases 2-4)
 *
 * This is a NON-INVASIVE enrichment layer that adds optional brand classification fields
 * to existing data structures without modifying core logic.
 *
 * **When false (default - DISABLED):**
 * - No brand classification on combos or intent clusters
 * - No brand badges in UI
 * - No brand-aware recommendations
 * - brandClassification, matchedBrandAlias, matchedCompetitor fields remain undefined
 * - Zero impact on existing V2.3 logic
 *
 * **When true (BRAND INTELLIGENCE MODE):**
 * - Extracts canonical brand from app metadata (developer name, app title)
 * - Generates brand aliases (e.g., "pimsleur" → "pimsleur language", "pimsleur app")
 * - Classifies combos as brand/generic/competitor
 * - Enriches intent clusters with brand keyword counts
 * - UI shows brand badges in ComboCoverageCard
 * - UI shows brand summary in SearchIntentAnalysisCard
 * - Recommendations include brand-specific insights
 *
 * **Architecture:**
 * - Pure enrichment layer (post-processing only)
 * - No modifications to:
 *   - comboEngineV2 generation logic
 *   - MetadataOrchestrator
 *   - Metadata adapters
 *   - Scoring registry weights
 *   - Existing audit rules
 * - All brand fields are OPTIONAL in DTOs
 * - Graceful fallback on error (no brand fields added)
 *
 * **Classification Logic:**
 * - brand: Contains canonical brand name or aliases
 * - generic: Meaningful keywords/combos without brand
 * - competitor: Contains competitor brand names (detection only, UI not implemented yet)
 *
 * **Integration Points:**
 * - metadataAuditEngine.ts: Combo brand classification (lines 503-542)
 * - intent-intelligence.service.ts: Intent cluster enrichment (lines 407-421, 511-537)
 * - ComboCoverageCard.tsx: Brand badge display
 * - SearchIntentAnalysisCard.tsx: Brand summary stats
 * - Recommendation Engine V2: Brand-aware recommendations
 *
 * **Protected Invariants (NEVER MODIFIED):**
 * - Combo generation logic (comboEngineV2)
 * - Scoring weights and rules
 * - MetadataOrchestrator flow
 * - Database schema (no migrations)
 * - BigQuery analytics
 *
 * **Competitor Detection:**
 * - Competitor detection functions exist in brand-intelligence.service.ts
 * - Competitor classification is computed but NOT surfaced in UI yet
 * - matchedCompetitor field remains optional and unused
 * - Future phase will add competitor UI
 *
 * **Performance Impact:**
 * - Minimal: Only adds brand classification to existing objects
 * - No external API calls
 * - No database queries
 * - Adds ~5-10ms to audit computation
 *
 * **Rollout Plan:**
 * 1. Phase 1 (Current): Flag=false, safe deployment
 * 2. Phase 2: Flag=true in development, validate brand detection accuracy
 * 3. Phase 3: Flag=true in staging, user acceptance testing
 * 4. Phase 4: Flag=true in production (canary 10%), monitor UI/UX
 * 5. Phase 5: Remove flag and make brand intelligence default
 *
 * **Rollback Plan:**
 * - Instant rollback: Set flag to false (no brand fields, no UI changes)
 * - Emergency rollback: Revert commits (fully backward compatible)
 * - No data loss, no migrations to reverse
 *
 * @default false
 * @since 2026-01-23 Brand Intelligence Phase 5 Implementation
 * @see docs/BRAND_INTELLIGENCE_PHASE5_COMPLETE.md
 * @see src/services/brand-intelligence.service.ts
 */
export const AUTOCOMPLETE_BRAND_INTELLIGENCE_ENABLED = true; // ENABLED - Phase 5 brand classification active

/**
 * AUDIT_METADATA_V2_1_ENABLED
 *
 * Controls rollout of Metadata Audit V2.1 advanced features.
 *
 * **Background:**
 * V2.1 builds on top of V2.0 with frontend-only enhancements:
 * - Ranking Element Analysis
 * - Subtitle Value Analysis
 * - Enhanced Combo Workbench with priority scoring
 * - Long-Tail Distribution Chart
 * - Slot Utilization Heatmap
 *
 * **When false (default - V2.0 MODE):**
 * - Uses existing V2.0 UnifiedMetadataAuditModule
 * - No ranking block, subtitle panel, or enhanced filters
 * - Legacy combo workbench without priority scoring
 * - No changes to production behavior
 *
 * **When true (V2.1 MODE):**
 * - Enables all V2.1 features (master toggle)
 * - Individual features can be controlled with granular flags below
 * - Frontend-only computation (no backend changes required)
 * - Backward compatible with existing V2.0 data structures
 *
 * **Performance Budget:**
 * - Maximum +350ms impact on audit computation
 * - Ranking Block: +100ms
 * - Subtitle Panel: +50ms
 * - Combo Enhancements: +100ms
 * - Charts/Heatmap: +50ms each
 *
 * **Rollout Plan:**
 * 1. Stage 1: 10% (internal testing, monitor performance)
 * 2. Stage 2: 25% (early adopters, collect feedback)
 * 3. Stage 3: 50% (majority rollout, validate stability)
 * 4. Stage 4: 100% (full release, remove flag)
 *
 * **Rollback Plan:**
 * - Instant rollback: Set flag to false (restores V2.0)
 * - Emergency rollback: Revert commits
 * - No data loss, no migrations required
 *
 * @default false
 * @since 2025-11-28 Metadata Audit V2.1 Implementation
 * @see docs/METADATA_AUDIT_V2.1_ARCHITECTURE.md
 */
export const AUDIT_METADATA_V2_1_ENABLED = true; // ENABLED - Testing V2.1 features

/**
 * AUDIT_METADATA_V2_1_RANKING_BLOCK
 *
 * Controls Chapter 1: Ranking Elements Panel
 *
 * **Features:**
 * - Ranking token extraction (title + subtitle)
 * - Slot efficiency analysis
 * - Duplicate keyword detection
 * - Ranking distribution map (title vs subtitle)
 *
 * **Performance Budget:** +100ms
 *
 * @default false
 */
export const AUDIT_METADATA_V2_1_RANKING_BLOCK = true; // ENABLED for testing

/**
 * AUDIT_METADATA_V2_1_SUBTITLE_PANEL
 *
 * Controls Chapter 2: Subtitle Value Panel
 *
 * **Features:**
 * - Incremental keyword analysis (new keywords from subtitle)
 * - New combo detection
 * - Title alignment scoring
 * - Subtitle synergy metrics
 *
 * **Performance Budget:** +50ms
 *
 * @default false
 */
export const AUDIT_METADATA_V2_1_SUBTITLE_PANEL = true; // ENABLED for testing

/**
 * AUDIT_METADATA_V2_1_COMBO_ENHANCE
 *
 * Controls Chapter 3: Enhanced Combo Workbench
 *
 * **Features:**
 * - Priority scoring column (semantic + length + hybrid + novelty + noise)
 * - High-value filter (priority_score > 70)
 * - Brand+Generic filter (hybrid combos)
 * - Long-tail filter (3+ words)
 * - Max noise filter (noise_confidence > threshold)
 * - XLSX export
 * - JSON export
 *
 * **Performance Budget:** +100ms
 *
 * @default false
 */
export const AUDIT_METADATA_V2_1_COMBO_ENHANCE = true; // ENABLED for testing

/**
 * AUDIT_METADATA_V2_1_LONG_TAIL_CHART
 *
 * Controls Chapter 4: Long-Tail Distribution Chart (Nice-to-Have)
 *
 * **Features:**
 * - Visualization of long-tail keyword combos (3+ words)
 * - Combo count by length
 * - Recharts bar chart
 *
 * **Performance Budget:** +50ms
 *
 * @default false
 */
export const AUDIT_METADATA_V2_1_LONG_TAIL_CHART = true; // ENABLED for testing

/**
 * AUDIT_METADATA_V2_1_HEATMAP
 *
 * Controls Chapter 5: Slot Utilization Heatmap (Nice-to-Have)
 *
 * **Features:**
 * - Character usage heatmap (title, subtitle, description)
 * - Efficiency visualization
 * - Color-coded utilization levels
 *
 * **Performance Budget:** +50ms
 *
 * @default false
 */
export const AUDIT_METADATA_V2_1_HEATMAP = true; // ENABLED for testing

/**
 * AUDIT_METADATA_V2_1_BIBLE_INTEGRATION
 *
 * Controls ASO Bible Integration (Future/Optional)
 *
 * **Features:**
 * - Contextual keyword suggestions from ASO Bible
 * - Real-time guidance tooltips
 * - Best practice recommendations
 *
 * **Note:** Requires ASO Bible API integration (not implemented yet)
 *
 * @default false
 */
export const AUDIT_METADATA_V2_1_BIBLE_INTEGRATION = false;

/**
 * Helper function to check if V2.1 is enabled
 */
export function isV2_1Enabled(): boolean {
  return AUDIT_METADATA_V2_1_ENABLED;
}

/**
 * Helper function to check if a specific V2.1 feature is enabled
 */
export function isV2_1FeatureEnabled(
  feature: 'RANKING_BLOCK' | 'SUBTITLE_PANEL' | 'COMBO_ENHANCE' | 'LONG_TAIL_CHART' | 'HEATMAP' | 'BIBLE_INTEGRATION'
): boolean {
  if (!AUDIT_METADATA_V2_1_ENABLED) return false;

  switch (feature) {
    case 'RANKING_BLOCK':
      return AUDIT_METADATA_V2_1_RANKING_BLOCK;
    case 'SUBTITLE_PANEL':
      return AUDIT_METADATA_V2_1_SUBTITLE_PANEL;
    case 'COMBO_ENHANCE':
      return AUDIT_METADATA_V2_1_COMBO_ENHANCE;
    case 'LONG_TAIL_CHART':
      return AUDIT_METADATA_V2_1_LONG_TAIL_CHART;
    case 'HEATMAP':
      return AUDIT_METADATA_V2_1_HEATMAP;
    case 'BIBLE_INTEGRATION':
      return AUDIT_METADATA_V2_1_BIBLE_INTEGRATION;
    default:
      return false;
  }
}

/**
 * Get all enabled V2.1 features
 */
export function getEnabledV2_1Features(): string[] {
  if (!AUDIT_METADATA_V2_1_ENABLED) return [];

  const features: string[] = [];
  if (AUDIT_METADATA_V2_1_RANKING_BLOCK) features.push('RANKING_BLOCK');
  if (AUDIT_METADATA_V2_1_SUBTITLE_PANEL) features.push('SUBTITLE_PANEL');
  if (AUDIT_METADATA_V2_1_COMBO_ENHANCE) features.push('COMBO_ENHANCE');
  if (AUDIT_METADATA_V2_1_LONG_TAIL_CHART) features.push('LONG_TAIL_CHART');
  if (AUDIT_METADATA_V2_1_HEATMAP) features.push('HEATMAP');
  if (AUDIT_METADATA_V2_1_BIBLE_INTEGRATION) features.push('BIBLE_INTEGRATION');

  return features;
}
