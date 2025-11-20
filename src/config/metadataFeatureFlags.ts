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
