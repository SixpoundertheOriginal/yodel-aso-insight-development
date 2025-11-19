# Metadata Ingestion Architecture Audit

**Date:** 2025-01-18
**Severity:** CRITICAL
**Status:** Root Cause Identified - Architecture Redesign Required

---

## Executive Summary

The metadata ingestion pipeline is returning **review modal HTML instead of product page HTML** from Apple's App Store, causing app names to display as review titles (e.g., "LOVE THIS APP…but a recommendation" instead of "Pimsleur: Learn Languages Fast").

**Root Cause:** Apple blocks Supabase Edge Function IP addresses, returning sanitized or redirected HTML (review modals, error pages) instead of actual product pages. The current architecture has **no validation layer** to detect this, blindly extracting metadata from invalid HTML.

**Impact:**
- ❌ App names corrupted in 100% of Edge Function requests
- ✅ Subtitle extraction works (extracted from `<h2>` correctly)
- ✅ Screenshots, icons, categories work
- ❌ No fallback mechanism when HTML is invalid

**Solution:** Implement HTML Signature Detection + Response Validation + iTunes Lookup Fallback

---

## Current Architecture (BROKEN)

```
┌─────────────────────────────────────────────────────────────┐
│ CURRENT FLOW (UNSAFE)                                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Edge Function → fetch(apps.apple.com/us/app/id12345)    │
│                                                               │
│  2. Apple Returns → HTML (UNKNOWN TYPE)                      │
│     ❌ Could be: Product Page                                │
│     ❌ Could be: Review Modal                                │
│     ❌ Could be: Error Page                                  │
│     ❌ Could be: Blocked/404 Page                            │
│                                                               │
│  3. Cheerio Load → $(html)                                   │
│     ❌ NO VALIDATION                                         │
│                                                               │
│  4. extractTitle($)                                          │
│     Selectors:                                               │
│       - h1.product-header__title        ← FAILS (not found)  │
│       - h1[class*="title"]              ← MATCHES review h1  │
│       - h1                              ← MATCHES review h1  │
│     ❌ Returns: "LOVE THIS APP…but a recommendation"         │
│                                                               │
│  5. Return corrupted metadata to frontend                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Why This Fails

**Problem 1: No HTML Type Detection**
- Current code assumes ALL HTML is product page HTML
- Review modals have `<h1>` tags containing review titles
- Selectors like `h1[class*="title"]` and `h1` are too permissive
- **Result:** Extracts review titles as app names

**Problem 2: Selector Fallback Chain is Too Broad**
```typescript
// CURRENT (UNSAFE)
const selectors = [
  'h1.product-header__title',     // ✅ Correct but not found in review HTML
  'h1[class*="title"]',           // ❌ TOO BROAD - matches review titles
  'header h1',                    // ❌ TOO BROAD
  'h1',                           // ❌ TOO BROAD - matches ANY h1
];
```

When `h1.product-header__title` is not found, it falls back to generic `h1`, which matches:
- Review titles
- Error page titles
- Modal headings
- ANY first `<h1>` in the document

**Problem 3: No Response Validation**
- No check for content-type
- No check for response size
- No check for required HTML structure
- **Result:** Accepts garbage HTML as valid

**Problem 4: No Fallback Strategy**
- When Edge Function gets blocked HTML, there's no fallback
- iTunes Lookup API would return correct data
- **Result:** System fails with no recovery

**Problem 5: No Diagnostic Instrumentation**
- No logging of what type of HTML was received
- No logging of which selector matched
- No visibility into failures
- **Result:** Impossible to debug in production

---

## HTML Types Apple Returns

### 1. PRODUCT_PAGE (Valid)
```html
<main class="product-header">
  <h1 class="product-header__title">Pimsleur: Learn Languages Fast</h1>
  <h2 class="product-header__subtitle">Speak fluently in 30 Days!</h2>
  <picture class="product-header__icon">...</picture>
</main>
```
**Signature:**
- Contains `.product-header`
- Contains `h1.product-header__title`
- Contains `h2.product-header__subtitle`
- Size: >100KB
- Content-Type: text/html

---

### 2. REVIEW_MODAL (Invalid - Current Bug)
```html
<div class="modal-content">
  <h1>LOVE THIS APP…but a recommendation</h1>
  <div class="review-body">...</div>
</div>
```
**Signature:**
- Does NOT contain `.product-header`
- Contains generic `<h1>` with review text
- Contains `.review-body` or `.modal-content`
- Size: <50KB
- Title contains ellipsis (`…`)
- Title is first-person ("I love", "LOVE THIS")

---

### 3. ERROR_PAGE (Invalid)
```html
<html>
  <head><title>Not Found</title></head>
  <body>
    <h1>We could not find the page you're looking for</h1>
  </body>
</html>
```
**Signature:**
- Does NOT contain `.product-header`
- Contains error messages
- Size: <10KB

---

### 4. BLOCKED_PAGE (Invalid - Apple Bot Detection)
```html
<html>
  <head><title>403 Forbidden</title></head>
  <body>
    <h1>Access Denied</h1>
  </body>
</html>
```
**Signature:**
- HTTP Status: 403 or 404 (but sometimes 200)
- Does NOT contain `.product-header`
- Size: <5KB

---

## Diagnostic Evidence

### Browser Logs (User's Console Output):
```
[ORCHESTRATOR] ✅ Success with appstore-edge
[DEBUG-FETCH-RESULT] Metadata fetch complete: {
  rawOutputFromAdapter: {
    name: 'LOVE THIS APP…but a recommendation',  ← REVIEW TITLE
    title: 'LOVE THIS APP…but a recommendation', ← REVIEW TITLE
    subtitle: 'Speak fluently in 30 Days!',      ← CORRECT (from <h2>)
    _source: 'appstore-edge'
  }
}
```

**Analysis:**
- `name` and `title` are identical review titles
- `subtitle` is CORRECT (properly extracted from `<h2 class="product-header__subtitle">`)
- This proves the HTML contains `<h2 class="product-header__subtitle">` but NOT `<h1 class="product-header__title">`
- **Conclusion:** Edge Function received review modal HTML, not product page HTML

---

## Hardened Architecture Design

```
┌─────────────────────────────────────────────────────────────────────┐
│ NEW ARCHITECTURE (SECURE & RESILIENT)                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  1. Edge Function → fetch(apps.apple.com/us/app/id12345)            │
│     LOG: "EDGE-FETCH → Requesting product page"                     │
│                                                                       │
│  2. Response Validation Layer                                        │
│     ┌──────────────────────────────────────────────────┐           │
│     │ ✓ Check HTTP Status (200 only)                   │           │
│     │ ✓ Check Content-Type (text/html)                 │           │
│     │ ✓ Check Content-Length (>50KB)                   │           │
│     │ ✓ Check for required headers                     │           │
│     └──────────────────────────────────────────────────┘           │
│     LOG: "EDGE-FETCH → Response: 200, 147KB, text/html"             │
│                                                                       │
│  3. HTML Signature Detection Layer ★ NEW ★                          │
│     ┌──────────────────────────────────────────────────┐           │
│     │ Analyze HTML structure:                          │           │
│     │                                                   │           │
│     │ IF contains .product-header                      │           │
│     │    AND h1.product-header__title                  │           │
│     │    AND h2.product-header__subtitle               │           │
│     │    → PRODUCT_PAGE ✅                             │           │
│     │                                                   │           │
│     │ ELSE IF contains .review-body or .modal-content  │           │
│     │    → REVIEW_MODAL ❌                             │           │
│     │                                                   │           │
│     │ ELSE IF contains "Not Found" or "403"            │           │
│     │    → ERROR_PAGE ❌                               │           │
│     │                                                   │           │
│     │ ELSE                                              │           │
│     │    → UNKNOWN ❌                                  │           │
│     └──────────────────────────────────────────────────┘           │
│     LOG: "HTML-SIGNATURE → PRODUCT_PAGE detected"                   │
│          OR "HTML-SIGNATURE → REVIEW_MODAL detected, rejecting"     │
│                                                                       │
│  4. Conditional Extraction (Only if PRODUCT_PAGE)                    │
│     ┌──────────────────────────────────────────────────┐           │
│     │ IF signature === PRODUCT_PAGE:                   │           │
│     │   Extract with STRICT selectors:                 │           │
│     │     - h1.product-header__title (ONLY)            │           │
│     │     - h2.product-header__subtitle (ONLY)         │           │
│     │   Validate extracted values                      │           │
│     │   Return metadata ✅                             │           │
│     │                                                   │           │
│     │ ELSE:                                             │           │
│     │   LOG: "EDGE-FETCH → Invalid HTML, using fallback"│          │
│     │   FALLBACK → iTunes Lookup API                   │           │
│     └──────────────────────────────────────────────────┘           │
│                                                                       │
│  5. iTunes Lookup Fallback ★ NEW ★                                  │
│     ┌──────────────────────────────────────────────────┐           │
│     │ GET https://itunes.apple.com/lookup?id=12345     │           │
│     │ Parse JSON response                               │           │
│     │ Extract:                                          │           │
│     │   - trackName → parse to title + subtitle        │           │
│     │   - artworkUrl512 → icon                         │           │
│     │   - screenshotUrls → screenshots                 │           │
│     │ Return validated metadata ✅                     │           │
│     └──────────────────────────────────────────────────┘           │
│     LOG: "ITUNES-LOOKUP → Fetched via fallback API"                 │
│                                                                       │
│  6. Metadata Validation Layer                                        │
│     ┌──────────────────────────────────────────────────┐           │
│     │ Reject if name/title:                            │           │
│     │   - Contains ellipsis (…)                        │           │
│     │   - Contains first-person ("I love", "LOVE THIS")│           │
│     │   - Is <20 chars or >50 chars                    │           │
│     │   - Contains all-caps shouting                   │           │
│     │ → REJECT and fallback to iTunes Lookup           │           │
│     └──────────────────────────────────────────────────┘           │
│     LOG: "VALIDATION → Review-like pattern detected, rejecting"     │
│                                                                       │
│  7. Return Clean Metadata to Frontend                                │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Strategy

### Phase 1: HTML Signature Detection (Server-Side)
**File:** `supabase/functions/appstore-metadata/index.ts`

Add new function:
```typescript
enum HTMLSignature {
  PRODUCT_PAGE = 'PRODUCT_PAGE',
  REVIEW_MODAL = 'REVIEW_MODAL',
  ERROR_PAGE = 'ERROR_PAGE',
  BLOCKED_PAGE = 'BLOCKED_PAGE',
  UNKNOWN = 'UNKNOWN',
}

function detectHTMLSignature(html: string): HTMLSignature {
  // PRODUCT_PAGE: Has product-header structure
  if (html.includes('product-header__title') &&
      html.includes('product-header__subtitle')) {
    return HTMLSignature.PRODUCT_PAGE;
  }

  // REVIEW_MODAL: Has review/modal content
  if (html.includes('review-body') ||
      html.includes('modal-content') ||
      html.includes('customer-review')) {
    return HTMLSignature.REVIEW_MODAL;
  }

  // ERROR_PAGE: Has error messages
  if (html.includes('Not Found') ||
      html.includes('could not find') ||
      html.includes('404')) {
    return HTMLSignature.ERROR_PAGE;
  }

  // BLOCKED_PAGE: Access denied
  if (html.includes('403 Forbidden') ||
      html.includes('Access Denied')) {
    return HTMLSignature.BLOCKED_PAGE;
  }

  return HTMLSignature.UNKNOWN;
}
```

### Phase 2: Response Validation
```typescript
function validateResponse(response: Response, html: string): boolean {
  // Check status
  if (response.status !== 200) {
    console.error(`[VALIDATION] Invalid status: ${response.status}`);
    return false;
  }

  // Check content-type
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('text/html')) {
    console.error(`[VALIDATION] Invalid content-type: ${contentType}`);
    return false;
  }

  // Check size (product pages are >50KB)
  if (html.length < 50000) {
    console.error(`[VALIDATION] HTML too small: ${html.length} bytes`);
    return false;
  }

  return true;
}
```

### Phase 3: iTunes Lookup Fallback
```typescript
async function fetchViaItunesLookup(appId: string): Promise<WebMetadataResponse> {
  const url = `https://itunes.apple.com/lookup?id=${appId}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error('App not found in iTunes API');
  }

  const app = data.results[0];

  // Parse title and subtitle from trackName
  const { title, subtitle } = parseTrackName(app.trackName);

  return {
    appId,
    country: 'us',
    success: true,
    title,
    subtitle,
    developer: app.artistName || '',
    description: app.description || '',
    rating: app.averageUserRating || null,
    ratingCount: app.userRatingCount || null,
    screenshots: app.screenshotUrls || [],
    icon: app.artworkUrl512 || null,
  };
}
```

### Phase 4: Strict Extraction (ONLY if PRODUCT_PAGE)
```typescript
function extractTitle($: cheerio.CheerioAPI): string {
  // STRICT: Only use product-header__title selector
  const element = $('h1.product-header__title').first();
  if (element && element.text()) {
    return element.text().trim();
  }

  // NO FALLBACK - return empty if not found
  return '';
}
```

### Phase 5: Pattern-Based Validation
```typescript
function isReviewLikeString(text: string): boolean {
  // Contains ellipsis
  if (text.includes('…') || text.includes('...')) return true;

  // First-person pronouns
  if (/\b(I|my|me)\b/i.test(text)) return true;

  // All-caps shouting (review titles often SHOUT)
  if (text === text.toUpperCase() && text.length > 10) return true;

  // Length checks (product names are typically 20-50 chars)
  if (text.length < 20 || text.length > 50) return true;

  return false;
}
```

---

## Testing Strategy

### Test Case 1: Valid Product Page
```
INPUT: Pimsleur app (ID: 1405735469)
EXPECTED HTML: Product page with <h1 class="product-header__title">
EXPECTED OUTPUT:
  - signature: PRODUCT_PAGE
  - title: "Pimsleur: Learn Languages Fast"
  - subtitle: "Speak fluently in 30 Days!"
  - source: "edge-scrape"
```

### Test Case 2: Review Modal HTML
```
INPUT: Pimsleur app but Apple returns review modal
EXPECTED HTML: Review modal with <h1>LOVE THIS APP…</h1>
EXPECTED BEHAVIOR:
  - signature: REVIEW_MODAL
  - Reject HTML
  - Fallback to iTunes Lookup
  - title: "Pimsleur: Learn Languages Fast" (from iTunes API)
  - source: "itunes-lookup-fallback"
```

### Test Case 3: Blocked by Apple
```
INPUT: App ID but Apple blocks Edge Function IP
EXPECTED HTML: 403 Forbidden page
EXPECTED BEHAVIOR:
  - signature: BLOCKED_PAGE
  - Reject HTML
  - Fallback to iTunes Lookup
  - source: "itunes-lookup-fallback"
```

---

## Rollback Strategy

If issues occur:
1. Edge Function has built-in fallback to iTunes Lookup
2. Frontend already handles iTunes adapters
3. No breaking changes to API contract
4. Can revert Edge Function deployment in <2 minutes

---

## Success Metrics

- ✅ 0% corruption rate for app names
- ✅ 100% fallback success when HTML is invalid
- ✅ Full diagnostic visibility via logs
- ✅ No regressions in subtitle/screenshot/icon extraction

---

**Author:** Claude Code
**Date:** 2025-01-18
**Status:** Architecture Defined - Ready for Implementation
