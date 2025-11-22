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
