# Phase A - Metadata Name/Subtitle Diagnostic Report

**Date:** 2025-01-18
**Status:** ⚠️ CRITICAL ISSUES IDENTIFIED
**Scope:** Complete audit of metadata naming system

---

## Executive Summary

**Current State:** The metadata pipeline has **architectural confusion** between `name`, `title`, and `subtitle` fields that causes **unreliable subtitle behavior** depending on which adapter is used and whether the normalizer strips it.

**Root Causes Identified:**
1. **Field Redundancy:** `name` and `title` are treated as duplicates (both mirror each other)
2. **Normalizer Interference:** `normalizeSubtitle()` strips subtitle if it matches title or name
3. **Inconsistent Source Mapping:** Different adapters use different field mappings
4. **No Source Distinction:** No way to know if subtitle came from HTML `<h2>` or parsed trackName

**Recommendation:** Implement new architecture with distinct `appStoreName`/`appStoreSubtitle` vs `fallbackName`/`fallbackSubtitle` fields.

---

## 1. HTML Path Analysis (PRODUCT_PAGE Mode)

### Edge Function Extraction

**File:** `supabase/functions/appstore-metadata/index.ts`
**Lines:** 389-416

```typescript
// Line 389-400: extractTitle()
function extractTitle($: cheerio.CheerioAPI): string {
  const element = $('h1.product-header__title').first();
  if (element && element.text()) {
    const title = element.text().trim();
    console.log(`[EXTRACTION] ✅ Extracted title from <h1.product-header__title>: "${title}"`);
    return title;
  }
  return '';
}

// Line 405-416: extractSubtitle()
function extractSubtitle($: cheerio.CheerioAPI): string {
  const element = $('h2.product-header__subtitle, .product-header__subtitle').first();
  if (element && element.text()) {
    const subtitle = element.text().trim();
    console.log(`[EXTRACTION] ✅ Extracted subtitle: "${subtitle}"`);
    return subtitle;
  }
  return '';
}
```

**What Gets Extracted (PRODUCT_PAGE Example: Pimsleur):**
```
title:    "Pimsleur | Language Learning"  (from <h1>)
subtitle: "Speak fluently in 30 Days!"     (from <h2>)
```

**Edge Function Returns (Lines 621-639):**
```typescript
return {
  appId,
  country,
  success: true,
  title,        // "Pimsleur | Language Learning"
  subtitle,     // "Speak fluently in 30 Days!"
  developer,
  ...
  _debugInfo: {
    source: 'edge-scrape'
  }
};
```

✅ **Status:** HTML extraction works correctly

---

### AppStoreEdge Adapter Mapping

**File:** `src/services/metadata-adapters/appstore-edge.adapter.ts`
**Lines:** 207-237

```typescript
const transformed = {
  // Core fields
  appId: data.appId,
  name: data.title,  // ← Line 210: Uses Edge Function's 'title'
  url: `https://apps.apple.com/${data.country}/app/id${data.appId}`,

  // Metadata fields
  title: data.title,     // ← Line 214: Same as name
  subtitle: data.subtitle || '',  // ← Line 215: Passes through subtitle from Edge Function
  developer: data.developer || 'Unknown Developer',
  ...
};
```

**Adapter Output (PRODUCT_PAGE Example):**
```
name:     "Pimsleur | Language Learning"  (from data.title)
title:    "Pimsleur | Language Learning"  (from data.title)
subtitle: "Speak fluently in 30 Days!"     (from data.subtitle)
_source:  "appstore-edge"
```

✅ **Status:** Adapter correctly passes through HTML values

---

### Normalizer Behavior (HTML Path)

**File:** `src/services/metadata-adapters/normalizer.ts`
**Lines:** 38-39

```typescript
title: this.normalizeTitle(metadata.title, metadata.name),
subtitle: this.normalizeSubtitle(metadata.subtitle, metadata.title, metadata.name),
```

**normalizeSubtitle() Logic (Lines 90-147):**

```typescript
private normalizeSubtitle(subtitle: string | undefined, title: string, name: string): string {
  const cleaned = this.normalizeString(subtitle) || '';

  // If no subtitle, return empty
  if (!cleaned) {
    return '';
  }

  // Case 1: Subtitle exactly matches title (complete duplication)
  if (cleaned.toLowerCase() === title.toLowerCase()) {
    console.log('[NORMALIZER] ❌ Subtitle duplication detected: subtitle === title');
    return '';  // ❌ STRIPS SUBTITLE
  }

  // Case 2: Subtitle exactly matches name (complete duplication)
  if (cleaned.toLowerCase() === name.toLowerCase()) {
    console.log('[NORMALIZER] ❌ Subtitle duplication detected: subtitle === name');
    return '';  // ❌ STRIPS SUBTITLE
  }

  // Case 3: Subtitle contains "Title - Actual Subtitle" pattern
  const separators = [' - ', ' – ', ' — ', ': ', ' | ', ' · ', ' • '];
  for (const sep of separators) {
    const prefixPattern = new RegExp(`^${this.escapeRegex(title)}${this.escapeRegex(sep)}`, 'i');
    if (prefixPattern.test(cleaned)) {
      const withoutPrefix = cleaned.replace(prefixPattern, '').trim();
      return withoutPrefix;  // ⚠️ STRIPS TITLE PREFIX
    }
  }

  // Subtitle is valid
  return cleaned;
}
```

**Example Flow (PRODUCT_PAGE - Pimsleur):**

```
Input to normalizer:
  name:     "Pimsleur | Language Learning"
  title:    "Pimsleur | Language Learning"
  subtitle: "Speak fluently in 30 Days!"

normalizeSubtitle() checks:
  1. Does "Speak fluently in 30 Days!" === "Pimsleur | Language Learning"? NO
  2. Does "Speak fluently in 30 Days!" === "Pimsleur | Language Learning"? NO
  3. Does "Speak fluently in 30 Days!" start with "Pimsleur | Language Learning" + separator? NO

Result: subtitle passes through unchanged ✅
```

**Final Normalized Output (PRODUCT_PAGE):**
```
name:     "Pimsleur | Language Learning"
title:    "Pimsleur | Language Learning"
subtitle: "Speak fluently in 30 Days!"
```

✅ **Status:** Normalizer preserves subtitle in PRODUCT_PAGE mode (subtitle is different from title)

---

## 2. Fallback Path Analysis (iTunes Lookup Mode)

### Edge Function iTunes Lookup Fallback

**File:** `supabase/functions/appstore-metadata/index.ts`
**Lines:** 246-294 (parseTrackName function)
**Lines:** 299-381 (fetchViaItunesLookup function)

```typescript
// parseTrackName splits trackName on separators
function parseTrackName(trackName: string): { title: string; subtitle: string } {
  const separators = [' - ', ' – ', ' — ', ' | ', ': ', ' · ', ' • '];

  for (const sep of separators) {
    if (trimmed.includes(sep)) {
      const parts = trimmed.split(sep);

      if (parts.length === 2 && parts[0].trim().length > 0) {
        return {
          title: parts[0].trim(),
          subtitle: parts[1].trim(),
        };
      }

      if (parts.length > 2 && parts[0].trim().length > 0) {
        return {
          title: parts[0].trim(),
          subtitle: parts.slice(1).join(sep).trim(),
        };
      }
    }
  }

  // No separator found
  return {
    title: trimmed,
    subtitle: '',
  };
}

// fetchViaItunesLookup uses parseTrackName
const { title, subtitle } = parseTrackName(app.trackName);

return {
  appId,
  country,
  success: true,
  title,        // Parsed from trackName
  subtitle,     // Parsed from trackName
  ...
  _debugInfo: {
    source: 'itunes-lookup-fallback',
    note: 'Title and subtitle parsed from trackName',
  },
};
```

**Example (iTunes Lookup - Pimsleur):**

```
iTunes API returns:
  trackName: "Pimsleur | Language Learning"

parseTrackName() splits on " | ":
  title:    "Pimsleur"
  subtitle: "Language Learning"

Edge Function returns:
  title:    "Pimsleur"
  subtitle: "Language Learning"
  _debugInfo.source: "itunes-lookup-fallback"
```

✅ **Status:** Edge Function fallback parses subtitle correctly

---

### AppStoreEdge Adapter Mapping (Fallback Path)

**Same adapter code (Lines 207-237):**

```typescript
const transformed = {
  name: data.title,      // "Pimsleur" (parsed from trackName)
  title: data.title,     // "Pimsleur"
  subtitle: data.subtitle || '',  // "Language Learning" (parsed from trackName)
  ...
};
```

**Adapter Output (Fallback Example):**
```
name:     "Pimsleur"
title:    "Pimsleur"
subtitle: "Language Learning"
_source:  "appstore-edge"
```

✅ **Status:** Adapter correctly passes through parsed values

---

### Normalizer Behavior (Fallback Path)

**⚠️ CRITICAL ISSUE IDENTIFIED**

**Input to normalizer (Fallback - Pimsleur):**
```
name:     "Pimsleur"
title:    "Pimsleur"
subtitle: "Language Learning"
```

**normalizeSubtitle() checks (Lines 90-147):**

```
1. Does "Language Learning" === "Pimsleur"? NO
2. Does "Language Learning" === "Pimsleur"? NO
3. Does "Language Learning" start with "Pimsleur" + separator?

   Checking: /^Pimsleur - /i  → NO
   Checking: /^Pimsleur – /i  → NO
   Checking: /^Pimsleur — /i  → NO
   Checking: /^Pimsleur: /i   → NO
   Checking: /^Pimsleur \| /i → NO  (separator is " | " with spaces)
   ...

Result: subtitle passes through ✅
```

**Final Normalized Output (Fallback):**
```
name:     "Pimsleur"
title:    "Pimsleur"
subtitle: "Language Learning"
```

✅ **Status:** Normalizer preserves subtitle in fallback mode

---

## 3. iTunes Search/Lookup Adapter Analysis

**File:** `src/services/metadata-adapters/itunes-search.adapter.ts`
**Lines:** 143-179

```typescript
// Parse title and subtitle from trackName
const { title, subtitle } = this.parseTitle(app.trackName);

return {
  appId: String(app.trackId),
  name: title,   // ← Line 157: Uses PARSED title, not full trackName
  url: app.trackViewUrl || '',
  locale: 'en-US',

  // Parsed title/subtitle
  title,         // ← Parsed from trackName
  subtitle,      // ← Parsed from trackName
  ...
};
```

**iTunes Search Adapter Output (Example: Pimsleur):**
```
trackName: "Pimsleur | Language Learning"

After parseTitle():
  name:     "Pimsleur"
  title:    "Pimsleur"
  subtitle: "Language Learning"
```

**iTunes Lookup Adapter (Lines 149-152 in itunes-lookup.adapter.ts):**
```typescript
// Same logic as Search adapter
const { title, subtitle } = this.parseTitle(app.trackName);

return {
  name: title,   // Parsed
  title,         // Parsed
  subtitle,      // Parsed
  ...
};
```

✅ **Status:** iTunes adapters parse subtitle correctly (same as Edge Function fallback)

---

## 4. UI Binding Analysis

### What Fields Are Actually Consumed

**File:** `src/components/shared/AsoShared/AppHeader.tsx`
**Lines:** 42, 48-51

```tsx
<img alt={app.name} ... />
<h1>{app.name}</h1>
{app.subtitle && (
  <p>{app.subtitle}</p>
)}
```

**File:** `src/components/AppAudit/AppAuditHub.tsx`
**Lines:** 51-63

```typescript
console.log('🎯 [APP-AUDIT] App imported:', metadata.name);
console.log('[DIAGNOSTIC-IMPORT] BEFORE onSelect:', {
  'metadata.name': metadata.name,
  'metadata.title': metadata.title,
  'metadata.subtitle': metadata.subtitle,
});

toast.success(`Started comprehensive audit for ${metadata.name}`);
```

**Fields Used:**
- ✅ `metadata.name` - Primary display field (header, logs, toasts)
- ✅ `metadata.subtitle` - Secondary display field (shown if present)
- ⚠️ `metadata.title` - Logged but NOT displayed in UI

**Conclusion:** UI consumes `name` and `subtitle` fields. The `title` field is **redundant for display purposes**.

---

## 5. Root Cause Analysis

### Current Field Architecture (Broken)

```
metadata.name      → Either HTML title OR parsed title (ambiguous)
metadata.title     → Duplicate of name (redundant)
metadata.subtitle  → Either HTML subtitle OR parsed subtitle (ambiguous)
```

**Problems:**

1. **No Source Distinction:**
   - Can't tell if subtitle came from `<h2>` (accurate) or parsed trackName (inferred)
   - Can't tell if name came from `<h1>` or parsed trackName

2. **Normalizer Can Erase Subtitle:**
   - If `subtitle === title`, normalizer returns empty string
   - If `subtitle === name`, normalizer returns empty string
   - If subtitle starts with `title + separator`, normalizer strips prefix

3. **Field Redundancy:**
   - `name` and `title` always mirror each other
   - Causes confusion about which field to use
   - Wastes memory and increases complexity

4. **Adapter Priority Can Override Better Data:**
   - Edge adapter (priority 5) always wins
   - If Edge uses fallback (parsed trackName), it overrides potential iTunes Search data
   - But Edge adapter itself is using iTunes Lookup, so this is circular

---

### Specific Failure Scenarios

#### Scenario 1: Normalizer Strips Subtitle Due to Exact Match

**If trackName = "Instagram":**
```
parseTrackName("Instagram") →
  title: "Instagram"
  subtitle: ""

Edge Function returns:
  title: "Instagram"
  subtitle: ""

Adapter transforms:
  name: "Instagram"
  title: "Instagram"
  subtitle: ""

Normalizer:
  subtitle is already empty → returns ""

Final:
  name: "Instagram"
  subtitle: ""  ✅ Correct (no subtitle in trackName)
```

**If we hypothetically had trackName = "Instagram: Share Photos":**
```
parseTrackName("Instagram: Share Photos") →
  title: "Instagram"
  subtitle: "Share Photos"

Adapter transforms:
  name: "Instagram"
  title: "Instagram"
  subtitle: "Share Photos"

Normalizer:
  Does "Share Photos" === "Instagram"? NO
  Does "Share Photos" start with "Instagram:"? NO (already parsed)

  Returns "Share Photos" ✅
```

**Verdict:** Normalizer does NOT strip subtitle in current implementation UNLESS subtitle exactly matches title/name.

---

#### Scenario 2: Edge Function Fallback Uses Full trackName as Title

**This was the previous bug (now fixed):**

```
OLD (BROKEN):
  title = app.trackName;  // "Pimsleur | Language Learning"
  subtitle = '';

NEW (FIXED):
  const { title, subtitle } = parseTrackName(app.trackName);
  // title: "Pimsleur"
  // subtitle: "Language Learning"
```

**Verdict:** This bug is NOW FIXED (as of most recent deployment).

---

#### Scenario 3: No Subtitle in HTML

**If App Store HTML has no `<h2>` tag:**

```
HTML extraction:
  title:    "App Name"  (from <h1>)
  subtitle: ""          (no <h2> found)

Edge Function returns:
  title:    "App Name"
  subtitle: ""

Adapter:
  name:     "App Name"
  subtitle: ""

Normalizer:
  subtitle is empty → returns ""

Final:
  name:     "App Name"
  subtitle: ""  ✅ Correct (app has no subtitle)
```

**Verdict:** Works correctly.

---

## 6. Why Subtitle Can Still Break

### Potential Breaking Points (Current Architecture)

Despite the fix, subtitle can STILL break in these scenarios:

#### A. Normalizer Interference (Rare but Possible)

**If subtitle happens to exactly match title:**
```
Example (hypothetical):
  title:    "Fitness Tracker"
  subtitle: "Fitness Tracker"  (bad data from App Store)

Normalizer check (Line 110-112):
  if (cleaned.toLowerCase() === title.toLowerCase()) {
    return '';  // ❌ Strips subtitle
  }

Result: subtitle becomes empty
```

**Risk Level:** LOW (App Store rarely has duplicate subtitle)

---

#### B. Normalizer Prefix Stripping (More Likely)

**If subtitle contains title as prefix:**
```
Example:
  title:    "Pimsleur"
  subtitle: "Pimsleur | Language Learning"  (contains title)

Normalizer check (Line 133-141):
  Pattern: /^Pimsleur \| /i
  Does "Pimsleur | Language Learning" match? YES

  Result: strips prefix → "Language Learning"
```

**This is INTENDED behavior** (removes duplication), but could strip valid subtitles if trackName parsing was incorrect.

**Risk Level:** MEDIUM (depends on accurate parsing)

---

#### C. Empty Subtitle After Cleaning

**If subtitle has only whitespace:**
```
subtitle: "   "

normalizer:
  const cleaned = this.normalizeString(subtitle) || '';
  // cleaned = ""

  if (!cleaned) {
    return '';  // Returns empty
  }
```

**Risk Level:** LOW (rare)

---

## 7. Recommended New Architecture

### Proposed Field Structure

```typescript
interface EnhancedMetadata {
  // SOURCE-SPECIFIC FIELDS (internal)
  appStoreName?: string;        // From HTML <h1> only
  appStoreSubtitle?: string;    // From HTML <h2> only
  fallbackName?: string;        // From iTunes trackName (parsed)
  fallbackSubtitle?: string;    // From iTunes trackName (parsed)

  // COMPUTED FIELDS (public API)
  name: string;                 // appStoreName ?? fallbackName
  subtitle: string;             // appStoreSubtitle ?? fallbackSubtitle
  title: string;                // DEPRECATED: mirror of name for backward compat

  // METADATA
  _source: string;              // Which adapter provided data
  _htmlExtraction: boolean;     // True if from HTML, false if from API
}
```

### Benefits

1. **Clear Source Tracking:**
   - Know exactly where name/subtitle came from
   - Can distinguish HTML (accurate) vs parsed (inferred)

2. **No Normalizer Interference:**
   - appStoreSubtitle never compared to fallbackName
   - No false-positive duplication detection

3. **Explicit Fallback Logic:**
   - `name = appStoreName ?? fallbackName`
   - Clear priority without normalizer guesswork

4. **Backward Compatible:**
   - Keep `title` field for existing code
   - Gradually migrate UI to use `name`/`subtitle` explicitly

---

## 8. Summary of Findings

### What Works ✅

1. **HTML Extraction (PRODUCT_PAGE mode):**
   - Correctly extracts from `<h1>` and `<h2>`
   - Edge Function returns clean values
   - Adapter passes through correctly
   - Normalizer preserves subtitle (different from title)

2. **iTunes Lookup Fallback:**
   - parseTrackName() correctly splits on separators
   - Returns parsed title and subtitle
   - Adapter passes through correctly
   - Normalizer preserves subtitle

3. **UI Binding:**
   - Uses `metadata.name` and `metadata.subtitle` consistently
   - Title field is logged but not displayed

---

### What's Broken/Risky ⚠️

1. **No Source Distinction:**
   - Can't tell if subtitle is from HTML or parsed trackName
   - Can't verify accuracy of subtitle

2. **Field Redundancy:**
   - `name` and `title` are duplicates
   - Causes confusion and maintenance burden

3. **Normalizer Can Strip Subtitle:**
   - If subtitle === title (rare)
   - If subtitle === name (rare)
   - If subtitle starts with title + separator (intended but risky)

4. **Lack of Traceability:**
   - No `_htmlExtraction` flag
   - No separate fields for App Store vs fallback data
   - Hard to debug when subtitle goes missing

---

## 9. Verification Checklist

Based on current code inspection:

- ✅ **HTML extraction works:** Lines 389-416 extract from `<h1>` and `<h2>`
- ✅ **Fallback parsing works:** Lines 246-294 parse trackName correctly
- ✅ **Adapter passes through:** Lines 207-237 map correctly
- ⚠️ **Normalizer can interfere:** Lines 90-147 have stripping logic
- ✅ **UI uses correct fields:** `name` and `subtitle` are consumed

**Current Test Result (Pimsleur fallback mode):**
```json
{
  "title": "Pimsleur",
  "subtitle": "Language Learning",
  "_debugInfo": { "source": "itunes-lookup-fallback" }
}
```

✅ This works correctly NOW, but architecture is fragile.

---

## 10. Recommendation

**APPROVE FOR PHASE B IMPLEMENTATION:**

Implement new field architecture:
- Add `appStoreName`, `appStoreSubtitle`, `fallbackName`, `fallbackSubtitle`
- Compute `name` and `subtitle` as first non-empty value
- Keep `title` for backward compatibility
- Add `_htmlExtraction` flag
- Update normalizer to NOT compare across sources

**DO NOT IMPLEMENT YET** - Awaiting user approval.

---

**Author:** Claude Code
**Date:** 2025-01-18
**Status:** Phase A Complete - Awaiting Approval for Phase B
**Risk Level:** MEDIUM (current implementation works but is architecturally fragile)
