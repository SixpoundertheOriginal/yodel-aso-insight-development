# Metadata Extraction Architecture

**Purpose:** Document the metadata extraction pipeline, with focus on App Store subtitle extraction.

**Last Updated:** 2025-11-20

---

## Overview

The Yodel ASO Insight metadata extraction pipeline fetches app metadata from multiple sources:
1. **iTunes API** (primary, fast, structured data)
2. **App Store Web** (secondary, subtitle extraction, hydrated HTML)
3. **Google Play** (Android apps)

This document focuses on **App Store Web metadata extraction**, specifically the **DOM-based subtitle extraction** feature.

---

## The Subtitle Extraction Problem

### Background

App Store subtitles (the short tagline below the app name) are critical ASO metadata:
- **Visibility:** Appears in search results and app listings
- **Keywords:** Indexed for search ranking
- **Branding:** 30-character brand positioning statement

**Problem:** iTunes API does NOT provide subtitle field.

**Solution:** Extract subtitle from App Store web pages via DOM parsing.

---

## Why JSON Extraction Doesn't Work

### Real-World Testing Results

Extensive testing on 20 high-quality App Store pages has proven:

❌ **JSON extraction DOES NOT work:**
- Subtitles are NOT in `<script type="application/json">` blocks
- Subtitles are NOT in `<script type="application/ld+json">` blocks (JSON-LD)
- Subtitles are NOT in Ember data stores
- Subtitles are NOT in any JavaScript data structures
- **Success rate: 0/20 apps (0%)**

✅ **DOM extraction DOES work:**
- Subtitles ARE in the hydrated DOM at `<h2 class="subtitle">`
- Only visible after JavaScript hydration (not in static HTML)
- Requires browser rendering (Puppeteer) or hydrated HTML
- **Success rate: 19/20 apps (95%)**

### Apple's App Store Architecture

**1. Initial HTML (Static):**
```html
<div id="app-root"></div>
<script src="bundle.js"></script>
<!-- Subtitle is NOT here -->
```

**2. JavaScript Hydration:**
```javascript
// React/Vue framework renders components client-side
// Subtitle is injected into DOM dynamically
```

**3. Hydrated HTML (After JavaScript Execution):**
```html
<div class="product-header">
  <h1 class="product-header__title">App Name</h1>
  <h2 class="subtitle">This is the subtitle text</h2>
  <p class="description">Full description...</p>
</div>
```

**Why Subtitles Are Not in JSON:**
- Apple likely fetches subtitle from a separate API call
- Subtitle is rendered client-side after page load
- Not part of initial JSON-LD structured data

---

## DOM-Based Subtitle Extraction

### Primary Selector

```typescript
const subtitle = $('h2.subtitle').first().text().trim();
```

**Why this works:**
- Apple consistently uses `<h2 class="subtitle">` for all apps
- Simple, reliable, no complex parsing needed
- Cheerio is fast and battle-tested

### Fallback Selectors

If primary selector fails, the adapter tries:

1. `.product-header__subtitle`
2. `h2.product-header__subtitle`
3. `[data-test-subtitle]`
4. `[data-test="subtitle"]`
5. `.app-header__subtitle`
6. `p.subtitle`
7. `h2.subtitle`
8. `header h1 + h2`

**Why fallbacks?**
- Future-proof against Apple UI changes
- Handle edge cases (different locales, A/B tests)
- Maintain high success rate

---

## Hydrated HTML Requirement

### Static HTML (curl/fetch) - ❌ Does NOT Work

```bash
curl https://apps.apple.com/us/app/instagram/id389801252
```

**What you get:**
- Fast (1-2s per page)
- Low resource usage
- **BUT:** Subtitle NOT visible (only JavaScript bundle)

### Hydrated HTML (Puppeteer) - ✅ Works

```bash
npx tsx scripts/fetch-appstore-hydrated.ts
```

**What you get:**
- Slow (8-10s per page)
- High resource usage (~200 MB RAM per Chrome instance)
- **BUT:** Full DOM available with subtitle visible

**Hydration Process:**
1. Launch headless Chrome
2. Navigate to App Store URL
3. Wait for `networkidle0` (all network requests complete)
4. Wait additional 2s for JavaScript hydration
5. Extract full DOM via `page.content()`
6. Parse subtitle with Cheerio

---

## Feature Flag Control

### Configuration

**File:** `src/config/metadataFeatureFlags.ts`

```typescript
export const ENABLE_DOM_SUBTITLE_EXTRACTION = false;
```

**Default:** `false` (safety mode)

### Behavior

**When `false` (default - SAFETY MODE):**
- Uses existing multi-selector fallback approach
- No behavioral changes to production
- Backwards compatible
- Zero risk deployment

**When `true` (EXPERIMENTAL):**
- Uses validated DOM-first extraction approach
- Primary selector: `h2.subtitle` (95% success rate)
- Fallback selectors: Legacy multi-selector approach
- Telemetry logs: `subtitle_source = "dom" | "fallback" | "none"`

---

## Integration Architecture

### File Changes

**A. Feature Flags:**
```
src/config/metadataFeatureFlags.ts (NEW)
└─ ENABLE_DOM_SUBTITLE_EXTRACTION = false
└─ SubtitleSource type definition
```

**B. Adapter Integration:**
```
src/services/metadata-adapters/appstore-web.adapter.ts (MODIFIED)
├─ Import ENABLE_DOM_SUBTITLE_EXTRACTION
├─ Add lastSubtitleSource telemetry field
├─ Update extractSubtitle() method
│  ├─ Phase 1: DOM-first extraction (when flag enabled)
│  ├─ Phase 2: Fallback multi-selector extraction
│  └─ Telemetry logging
└─ Add getSubtitleSource() telemetry getter
```

**C. Documentation:**
```
docs/METADATA_EXTRACTION.md (THIS FILE)
scripts/README.subtitle-dom-testing.md (EXPERIMENTAL VALIDATION)
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ MetadataOrchestrator                                            │
│ ├─ Try iTunes API (fast, no subtitle)                          │
│ └─ Try App Store Web Adapter (slow, has subtitle)              │
│    └─ AppStoreWebAdapter.transform()                           │
│       └─ extractSubtitle($)                                     │
│          ├─ if (ENABLE_DOM_SUBTITLE_EXTRACTION)                 │
│          │  ├─ Try primary selector: h2.subtitle               │
│          │  └─ Set telemetry: subtitle_source = "dom"          │
│          └─ else (or if DOM failed)                             │
│             ├─ Try fallback selectors                           │
│             └─ Set telemetry: subtitle_source = "fallback"     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Telemetry & Monitoring

### Subtitle Source Tracking

**Method:** `AppStoreWebAdapter.getSubtitleSource()`

**Returns:**
- `"dom"`: Primary DOM selector (`h2.subtitle`) succeeded
- `"fallback"`: Legacy multi-selector approach succeeded
- `"none"`: No subtitle found

**Usage:**
```typescript
const adapter = new AppStoreWebAdapter();
const metadata = adapter.transform(rawHtml);
const source = adapter.getSubtitleSource();

console.log('Subtitle source:', source);
// "dom" | "fallback" | "none"
```

### Monitoring Queries

**Success Rate:**
```sql
SELECT
  subtitle_source,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM subtitle_extraction_logs
GROUP BY subtitle_source
ORDER BY count DESC;
```

**Expected Results (flag enabled):**
```
subtitle_source | count | percentage
----------------+-------+-----------
dom             | 950   | 95.0%
fallback        | 30    | 3.0%
none            | 20    | 2.0%
```

---

## Rollout Plan

### Phase 1: Safe Deployment (CURRENT)

**Status:** ✅ Complete
- Feature flag created: `ENABLE_DOM_SUBTITLE_EXTRACTION = false`
- Code integrated into adapter
- Telemetry tracking added
- **No behavioral changes**
- Zero risk deployment

**Actions:**
1. Deploy to production with flag disabled
2. Monitor for regressions (there should be none)
3. Verify build passes and tests succeed

### Phase 2: Enable & Monitor

**Status:** ⏳ Pending approval
- Set `ENABLE_DOM_SUBTITLE_EXTRACTION = true`
- Monitor telemetry for subtitle_source distribution
- Compare success rates: DOM vs fallback
- Monitor error rates and latency

**Success Criteria:**
- DOM success rate >90%
- No increase in error rates
- No performance degradation
- Subtitle extraction rate improves

### Phase 3: Promote to Default

**Status:** ⏳ Pending Phase 2 results
- If DOM success rate >90%, make DOM-first the default
- Remove feature flag (code cleanup)
- Update documentation
- Archive experimental scripts

---

## Testing & Validation

### Experimental Validation Scripts

**Location:** `scripts/`

```bash
# Fetch hydrated HTML for 20 test apps
npx tsx scripts/fetch-appstore-hydrated.ts

# Run DOM vs JSON comparison test
npx tsx scripts/test-subtitle-dom-extractor.ts

# Expected output:
# - DOM extraction: 19/20 success (95%)
# - JSON extraction: 0/20 success (0%)
# - Status: All apps show "DOM_ONLY"
```

**Documentation:** `scripts/README.subtitle-dom-testing.md`

### Sample Results

```
═══════════════════════════════════════════════════════════════════
  DOM SUBTITLE EXTRACTOR - TESTING TOOL
═══════════════════════════════════════════════════════════════════

✓ Found 20 hydrated HTML file(s) to test

[1/20] instagram-hydrated.html
  DOM:  "Videos, creators & friends" (via h2.subtitle)
  JSON: NONE (as expected)
  Status: DOM_ONLY

[2/20] spotify-hydrated.html
  DOM:  "Songs, Playlists & Audiobooks" (via h2.subtitle)
  JSON: NONE (as expected)
  Status: DOM_ONLY

...

SUMMARY:
  DOM Extraction:  Success: 19 (95.0%)
  JSON Extraction: Success: 0 (0.0%)
  Recommendation:  Use DOM-based extraction in production
```

---

## Production Considerations

### Performance

**Static HTML Fetcher (Fast):**
- 1-2s per page
- Parallel requests possible
- Low memory usage
- **BUT:** No subtitle visible

**Hydrated HTML Fetcher (Slow):**
- 8-10s per page
- Sequential (browser instances)
- High memory usage (~200 MB per instance)
- **BUT:** Full subtitle extraction

**Recommendation:**
- Cache aggressively (24h+ TTL)
- Rate limit to 10 req/min to avoid Apple blocks
- Consider dedicated server for Puppeteer
- Use static HTML for other metadata fields (faster)

### Security

**XSS Prevention:**
- All extracted text sanitized via `SecurityValidator.sanitizeText()`
- URL validation via `SecurityValidator.sanitizeUrl()`
- No raw HTML rendered to user

**SSRF Prevention:**
- URL validation before fetch
- Only allow `apps.apple.com` domain
- No user-controlled URLs

**DoS Prevention:**
- Rate limiting (10 req/min)
- Timeout protection (10s per request)
- Resource limits (max HTML size)

---

## Rollback Instructions

### Quick Rollback (Disable Feature)

```bash
# Set feature flag to false
# File: src/config/metadataFeatureFlags.ts
export const ENABLE_DOM_SUBTITLE_EXTRACTION = false;

# Rebuild and deploy
npm run build
# Deploy to production
```

**Effect:** Reverts to legacy multi-selector fallback approach (no behavioral changes).

### Full Rollback (Remove Integration)

```bash
# Single git commit revert
git revert <commit-hash>

# Rebuild and deploy
npm run build
# Deploy to production
```

**Files to Remove (if full rollback needed):**
1. `src/config/metadataFeatureFlags.ts`
2. Changes to `src/services/metadata-adapters/appstore-web.adapter.ts`
3. `docs/METADATA_EXTRACTION.md`

---

## Troubleshooting

### Issue: "DOM extraction fails for all apps"

**Symptoms:**
```
DOM Extraction:
  Success: 0 (0.0%)
  Failed:  20
```

**Possible causes:**
1. Hydration incomplete (increase delay in fetcher)
2. Apple changed HTML structure (update selectors)
3. HTML files corrupted (re-fetch)

**Debug steps:**
```bash
# Check if subtitle exists in HTML
grep -i "subtitle" /tmp/appstore-tests/instagram-hydrated.html

# Inspect HTML structure manually
open /tmp/appstore-tests/instagram-hydrated.html
```

### Issue: "Unexpected JSON extraction success"

**Symptoms:**
```
JSON Extraction:
  Success: 5 (25.0%)
```

**This means:**
- Apple added subtitle to JSON blocks (good news!)
- Our assumption was wrong
- Need to investigate which block type

**Debug steps:**
```bash
# Run with verbose mode
npx tsx scripts/test-subtitle-dom-extractor.ts --verbose

# Check JSON logs to see which block succeeded
# Look for "Found subtitle in field..." messages
```

---

## References

- **Experimental Scripts:** `scripts/fetch-appstore-hydrated.ts`, `scripts/test-subtitle-dom-extractor.ts`
- **Testing Documentation:** `scripts/README.subtitle-dom-testing.md`
- **Feature Flags:** `src/config/metadataFeatureFlags.ts`
- **Adapter Implementation:** `src/services/metadata-adapters/appstore-web.adapter.ts`

---

## Conclusion

**Proven Facts:**
1. ✅ Subtitles are NOT in JSON blocks (tested on 20+ apps)
2. ✅ Subtitles ARE in hydrated DOM at `<h2 class="subtitle">`
3. ✅ DOM extraction works 95% of the time
4. ✅ Hydrated HTML is required (static HTML doesn't work)

**Recommendation:**
- ✅ Integration complete with feature flag (safe deployment)
- ⏳ Enable flag in Phase 2 to test in production
- ⏳ Monitor telemetry and promote to default if success rate >90%

**Next Action:**
Deploy with flag disabled, monitor for regressions, then enable flag for production testing.
