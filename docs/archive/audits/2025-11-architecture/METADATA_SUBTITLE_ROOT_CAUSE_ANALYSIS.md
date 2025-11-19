# Metadata Name/Subtitle Root Cause Analysis

**Date:** 2025-01-18
**Status:** DIAGNOSTIC COMPLETE - Root Cause Identified
**Severity:** CRITICAL - Architectural Interference

---

## Executive Summary

**Root Cause:** The Edge Function fallback path (iTunes Lookup API) sets `subtitle: ''` which is then passed through the entire pipeline unchanged, resulting in empty subtitles in the UI even though we COULD parse subtitle from trackName.

**Interference Pattern:** Fixing the name field by removing `parseTrackName` logic broke subtitle because:
1. I removed ALL trackName parsing (including subtitle extraction)
2. Edge Function fallback now returns `subtitle: ''`
3. Frontend iTunes adapters HAVE parsing logic but are NEVER USED (Edge adapter has higher priority)
4. Result: Empty subtitle in fallback mode

**The Fix:** Edge Function fallback should parse subtitle from trackName (same logic as frontend iTunes adapters), then normalizer validates it.

---

## Complete Chain of Custody Trace

### Scenario 1: PRODUCT_PAGE HTML Available (Working)

```
1. Edge Function (appstore-metadata/index.ts)
   Lines 520-528:
   ┌─────────────────────────────────────────┐
   │ const $ = cheerio.load(html);          │
   │ const title = extractTitle($);         │   ← Line 523: Extracts from <h1.product-header__title>
   │ const subtitle = extractSubtitle($);   │   ← Line 524: Extracts from <h2.product-header__subtitle>
   └─────────────────────────────────────────┘

   Lines 547-548:
   ┌─────────────────────────────────────────┐
   │ return {                                │
   │   title,                                │   ← "Pimsleur | Language Learning"
   │   subtitle,                             │   ← "Speak fluently in 30 Days!" ✅
   │   _debugInfo: { source: 'edge-scrape' } │
   │ }                                       │
   └─────────────────────────────────────────┘

2. AppStoreEdgeAdapter (appstore-edge.adapter.ts)
   Lines 209-215:
   ┌─────────────────────────────────────────┐
   │ const transformed = {                   │
   │   name: data.title,                     │   ← "Pimsleur | Language Learning"
   │   title: data.title,                    │   ← "Pimsleur | Language Learning"
   │   subtitle: data.subtitle || '',        │   ← "Speak fluently in 30 Days!" ✅ (passed through)
   │   _source: 'appstore-edge',            │
   │ }                                       │
   └─────────────────────────────────────────┘

3. Orchestrator (orchestrator.ts)
   Line 210:
   ┌─────────────────────────────────────────┐
   │ const normalized =                      │
   │   this.normalizer.normalize(            │
   │     metadata, adapter.name              │
   │   );                                    │
   └─────────────────────────────────────────┘

4. Normalizer (normalizer.ts)
   Lines 37-38:
   ┌─────────────────────────────────────────┐
   │ title: this.normalizeTitle(             │
   │   metadata.title, metadata.name),       │   ← "Pimsleur | Language Learning"
   │ subtitle: this.normalizeSubtitle(       │
   │   metadata.subtitle, metadata.title,    │   ← Input: "Speak fluently in 30 Days!"
   │   metadata.name),                       │
   └─────────────────────────────────────────┘

   Lines 89-146 (normalizeSubtitle):
   ┌─────────────────────────────────────────┐
   │ const cleaned = normalizeString(        │
   │   subtitle) || '';                      │   ← "Speak fluently in 30 Days!"
   │                                         │
   │ // Case 1: subtitle === title? NO      │
   │ // Case 2: subtitle === name? NO       │
   │ // Case 3: Contains title prefix? NO   │
   │                                         │
   │ return cleaned;                         │   ← "Speak fluently in 30 Days!" ✅
   └─────────────────────────────────────────┘

5. Final Result:
   ┌─────────────────────────────────────────┐
   │ name: "Pimsleur | Language Learning"   │  ✅
   │ title: "Pimsleur | Language Learning"  │  ✅
   │ subtitle: "Speak fluently in 30 Days!" │  ✅
   └─────────────────────────────────────────┘
```

**Verdict:** ✅ Works perfectly when PRODUCT_PAGE HTML is available

---

### Scenario 2: iTunes Lookup Fallback (BROKEN - Current State)

```
1. Edge Function (appstore-metadata/index.ts)
   Lines 249-303 (fetchViaItunesLookup):
   ┌─────────────────────────────────────────┐
   │ const app = data.results[0];            │
   │                                         │
   │ // Line 274: Use trackName as title    │
   │ const title = app.trackName ||         │   ← "Pimsleur | Language Learning"
   │               'Unknown App';            │
   │                                         │
   │ // Line 288: ❌ PROBLEM HERE            │
   │ return {                                │
   │   title,                                │   ← "Pimsleur | Language Learning"
   │   subtitle: '',                         │   ← ❌ EMPTY! Should be parsed from trackName
   │   _debugInfo: {                        │
   │     source: 'itunes-lookup-fallback'   │
   │   }                                     │
   │ }                                       │
   └─────────────────────────────────────────┘

   **ROOT CAUSE LOCATION:** Line 288
   **What's Wrong:** Subtitle is hardcoded to empty string instead of parsed from trackName

2. AppStoreEdgeAdapter (appstore-edge.adapter.ts)
   Lines 209-215:
   ┌─────────────────────────────────────────┐
   │ const transformed = {                   │
   │   name: data.title,                     │   ← "Pimsleur | Language Learning"
   │   title: data.title,                    │   ← "Pimsleur | Language Learning"
   │   subtitle: data.subtitle || '',        │   ← ❌ '' (empty from Edge Function)
   │   _source: 'appstore-edge',            │
   │ }                                       │
   └─────────────────────────────────────────┘

   **Note:** Adapter has NO parsing logic - just passes through what Edge Function returns

3. Orchestrator (orchestrator.ts)
   Line 210:
   ┌─────────────────────────────────────────┐
   │ const normalized =                      │
   │   this.normalizer.normalize(            │
   │     metadata, adapter.name              │   ← metadata.subtitle is already ''
   │   );                                    │
   └─────────────────────────────────────────┘

4. Normalizer (normalizer.ts)
   Lines 89-106 (normalizeSubtitle):
   ┌─────────────────────────────────────────┐
   │ const cleaned = normalizeString(        │
   │   subtitle) || '';                      │   ← Input: '' (empty)
   │                                         │
   │ // Line 103-106: If no subtitle,       │
   │ // return empty                         │
   │ if (!cleaned) {                         │
   │   console.log('⚠️ No subtitle after     │
   │     cleaning');                         │
   │   return '';                            │   ← Returns empty
   │ }                                       │
   └─────────────────────────────────────────┘

5. Final Result:
   ┌─────────────────────────────────────────┐
   │ name: "Pimsleur | Language Learning"   │  ✅ Correct
   │ title: "Pimsleur | Language Learning"  │  ✅ Correct
   │ subtitle: ""                            │  ❌ EMPTY!
   └─────────────────────────────────────────┘
```

**Verdict:** ❌ Broken - subtitle is lost in iTunes Lookup fallback

---

### Scenario 3: Frontend iTunes Adapters (NOT USED Due to Priority)

For context, here's what WOULD happen if iTunes adapters were used directly:

```
1. ItunesSearchAdapter (itunes-search.adapter.ts)
   Lines 145-163:
   ┌─────────────────────────────────────────┐
   │ // Line 145: Parse title and subtitle  │
   │ const { title, subtitle } =             │
   │   this.parseTitle(app.trackName);       │
   │                                         │
   │ // trackName: "Pimsleur | Language      │
   │ // Learning"                            │
   │ //                                      │
   │ // parseTitle splits on '|':           │
   │ // title: "Pimsleur"                    │
   │ // subtitle: "Language Learning"        │
   │                                         │
   │ return {                                │
   │   name: title,                          │   ← "Pimsleur"
   │   title,                                │   ← "Pimsleur"
   │   subtitle,                             │   ← "Language Learning" ✅
   │ }                                       │
   └─────────────────────────────────────────┘

   **Note:** This adapter DOES parse subtitle from trackName!

2. Normalizer (normalizer.ts)
   Lines 89-146:
   ┌─────────────────────────────────────────┐
   │ Input:                                  │
   │   subtitle: "Language Learning"         │
   │   title: "Pimsleur"                     │
   │   name: "Pimsleur"                      │
   │                                         │
   │ // Case 1: subtitle === title? NO      │
   │ // Case 2: subtitle === name? NO       │
   │ // Case 3: Contains prefix? NO         │
   │                                         │
   │ return "Language Learning";             │   ← ✅ Would work
   └─────────────────────────────────────────┘

3. Final Result (If iTunes Search Adapter Was Used):
   ┌─────────────────────────────────────────┐
   │ name: "Pimsleur"                        │  ✅
   │ title: "Pimsleur"                       │  ✅
   │ subtitle: "Language Learning"           │  ✅ Parsed from trackName
   └─────────────────────────────────────────┘
```

**BUT:** iTunes adapters have priority 10, Edge adapter has priority 5 (higher), so iTunes adapters are NEVER USED.

---

## Why Fixing Name Broke Subtitle

### Historical Timeline:

#### Original State (Before Any Fixes):
```
Edge Function (fetchViaItunesLookup):
- Had parseTrackName() function
- Parsed trackName: "Pimsleur | Language Learning"
- Returned:
  title: "Pimsleur"
  subtitle: "Language Learning"

Result:
✅ Subtitle worked (parsed from trackName)
❌ Name broke (due to other issues with HTML extraction)
```

#### My "Fix" Attempt:
```
User said: "Do NOT fake subtitle in fallback mode"
I interpreted this as: "Set subtitle to empty string"

Edge Function (fetchViaItunesLookup):
- Removed parseTrackName() function
- Used full trackName as title
- Set subtitle: '' (empty)

Result:
✅ Name works (full trackName used)
❌ Subtitle broke (hardcoded to empty)
```

#### Why This Happened:
1. **Misunderstood Requirements:** User said "don't fake subtitle" but ALSO said "accurate subtitle (from <h2> or fallback parsed trackName)"
2. **Removed Too Much Logic:** I deleted ALL trackName parsing, including subtitle extraction
3. **Edge Function Has Highest Priority:** Frontend iTunes adapters HAVE the parsing logic, but are never used

---

## The Actual Interference

### Where Name and Subtitle Depend On Each Other:

**Location:** Edge Function fallback - `fetchViaItunesLookup()` function (lines 249-303)

```typescript
// iTunes API returns:
trackName: "Pimsleur | Language Learning"

// Current (BROKEN) approach:
title = trackName;           // "Pimsleur | Language Learning"
subtitle = '';               // ❌ Empty

// Correct approach (same as frontend iTunes adapters):
const { title, subtitle } = parseTrackName(trackName);
// title: "Pimsleur"
// subtitle: "Language Learning"
```

**The Interference:**
- Both name and subtitle are derived from the SAME source (trackName)
- If we use full trackName for title → subtitle must be empty OR we have duplication
- If we parse trackName → we can have both title AND subtitle correctly

### Normalizer's Role in Interference:

**File:** `normalizer.ts`
**Lines:** 89-146 (`normalizeSubtitle`)

**Interference Logic:**
```typescript
// Line 109-112: If subtitle === title, return ''
if (cleaned.toLowerCase() === title.toLowerCase()) {
  return '';  // ❌ Prevents duplication
}

// Line 115-118: If subtitle === name, return ''
if (cleaned.toLowerCase() === name.toLowerCase()) {
  return '';  // ❌ Prevents duplication
}
```

**Example of Normalizer Interference:**
```
If Edge Function returned:
  title: "Pimsleur | Language Learning"
  subtitle: "Language Learning"  // Parsed from trackName

Then normalizer would see:
  title: "Pimsleur | Language Learning"
  subtitle: "Language Learning"

  // title contains subtitle → prefix stripping logic (lines 121-141)
  // Would detect "Language Learning" in title
  // Might strip it or keep it depending on separator logic
```

But currently this doesn't happen because Edge Function returns empty subtitle, so normalizer has nothing to process.

---

## Regression Map

### Why Previous Fix for Name Broke Subtitle:

```
┌─────────────────────────────────────────────────────────────┐
│ ORIGINAL PROBLEM (Before Any Fixes)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Edge Function HTML Extraction:                              │
│   - Had over-broad selectors: h1[class*="title"], h1       │
│   - Matched review titles from modal HTML                   │
│   - Returned: name = "LOVE THIS APP…but a recommendation"   │
│                                                              │
│ Edge Function Fallback (iTunes Lookup):                     │
│   - Had parseTrackName() function                           │
│   - Returned: title="Pimsleur", subtitle="Language Learning"│
│   - ✅ Subtitle worked in fallback mode                     │
│                                                              │
│ Result:                                                      │
│   ❌ Name broken (review titles)                            │
│   ✅ Subtitle worked (parsed from trackName)                │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ FIX ATTEMPT #1: Hardened Architecture (Phase A7)            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Changes:                                                     │
│   - Added HTML Signature Detection                          │
│   - Added strict selectors (h1.product-header__title only)  │
│   - Added iTunes Lookup fallback                            │
│   - ✅ Fixed review title bug                               │
│                                                              │
│ Fallback Logic:                                              │
│   - Still had parseTrackName() in fallback                  │
│   - ✅ Subtitle still worked                                │
│                                                              │
│ Result:                                                      │
│   ✅ Name fixed (no more review titles)                     │
│   ✅ Subtitle still worked                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ FIX ATTEMPT #2: Remove Subtitle Faking (BROKE SUBTITLE)     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ User Request:                                                │
│   "Do NOT fake subtitle in fallback mode"                   │
│   "subtitle should be '' in fallback mode"                  │
│                                                              │
│ Changes:                                                     │
│   - Removed parseTrackName() function entirely              │
│   - Set subtitle: '' in iTunes Lookup fallback              │
│   - Used full trackName as title                            │
│                                                              │
│ Result:                                                      │
│   ✅ Name still works (full trackName)                      │
│   ❌ Subtitle broke (hardcoded to empty)                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### The Core Issue:

**Misinterpretation of Requirements:**

User said TWO contradictory things:
1. "Do NOT set subtitle from trackName" (in one message)
2. "Accurate subtitle (from <h2> or fallback parsed trackName)" (in latest message)

I implemented #1 (set subtitle to empty), but user actually wanted #2 (parse it from trackName).

---

## Root Cause Summary

### Primary Cause:

**File:** `supabase/functions/appstore-metadata/index.ts`
**Function:** `fetchViaItunesLookup()`
**Line:** 288

```typescript
subtitle: '', // ❌ WRONG - Should parse from trackName
```

**Why Wrong:**
- iTunes Lookup API provides `trackName` in format "Title | Subtitle"
- Frontend iTunes adapters parse this correctly
- Edge Function fallback should do the same
- Instead, it returns empty subtitle

### Secondary Contributing Factors:

1. **Adapter Priority:**
   - Edge adapter (priority 5) runs before iTunes adapters (priority 10)
   - Frontend iTunes adapters HAVE correct parsing logic
   - But they're never used because Edge adapter succeeds first

2. **No Parsing in Edge Adapter:**
   - AppStoreEdgeAdapter just passes through what Edge Function returns
   - Has no logic to parse trackName
   - Relies entirely on Edge Function to return correct data

3. **Normalizer Interference (Potential):**
   - If Edge Function returns parsed subtitle, normalizer might strip it
   - Lines 109-118: Strips subtitle if it equals title or name
   - Lines 121-141: Strips title prefix from subtitle
   - This COULD cause issues if parsing logic isn't careful

---

## Proposed Fix (DO NOT IMPLEMENT YET)

### Option 1: Restore parseTrackName in Edge Function (Recommended)

**File:** `supabase/functions/appstore-metadata/index.ts`
**Location:** Lines 271-302 (fetchViaItunesLookup function)

**Change:**
```typescript
// CURRENT (BROKEN):
const title = app.trackName || 'Unknown App';

return {
  title,
  subtitle: '', // ❌ Empty
  ...
};

// PROPOSED FIX:
function parseTrackName(trackName: string): { title: string; subtitle: string } {
  if (!trackName) {
    return { title: 'Unknown App', subtitle: '' };
  }

  // Same separators as frontend iTunes adapters
  const separators = [' - ', ' – ', ' — ', ' | ', ': ', ' · ', ' • '];

  for (const sep of separators) {
    if (trackName.includes(sep)) {
      const parts = trackName.split(sep);
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

  // No separator found - use full trackName as title
  return {
    title: trackName.trim(),
    subtitle: '',
  };
}

const { title, subtitle } = parseTrackName(app.trackName);

console.log(`[${requestId}] [ITUNES-LOOKUP] ✅ Fetched via iTunes API:`, {
  trackName: app.trackName,
  title,
  subtitle,
  developer: app.artistName,
});

return {
  title,
  subtitle, // ✅ Parsed from trackName
  ...
};
```

**Why This Works:**
- ✅ Same logic as frontend iTunes adapters
- ✅ Parses subtitle from trackName
- ✅ Normalizer will validate and clean it
- ✅ Falls back to empty subtitle if no separator found
- ✅ No duplication issues (title="Pimsleur", subtitle="Language Learning")

**Potential Issues:**
- Normalizer might detect "Language Learning" in full trackName and strip it
- Need to verify normalizer doesn't interfere

### Option 2: Use Full trackName for title, Parse Subtitle Separately

**Alternative approach:**
```typescript
const title = app.trackName || 'Unknown App';  // "Pimsleur | Language Learning"
const subtitle = parseSubtitleOnly(app.trackName); // "Language Learning"

function parseSubtitleOnly(trackName: string): string {
  const separators = [' - ', ' – ', ' — ', ' | ', ': ', ' · ', ' • '];

  for (const sep of separators) {
    if (trackName.includes(sep)) {
      const parts = trackName.split(sep);
      if (parts.length >= 2) {
        return parts.slice(1).join(sep).trim();
      }
    }
  }

  return '';
}

return {
  title,        // "Pimsleur | Language Learning"
  subtitle,     // "Language Learning"
  ...
};
```

**Why This Might Work:**
- ✅ Title contains full app name as it appears in iTunes
- ✅ Subtitle extracted from trackName
- ⚠️ But normalizer might strip subtitle because it's contained in title

**Risk:**
- Normalizer line 132: `if (prefixPattern.test(cleaned))` might detect subtitle in title and strip it
- Would need to test thoroughly

### Option 3: Frontend Adapter Parsing (Requires Adapter Changes)

**Change AppStoreEdgeAdapter to parse if Edge Function returns empty subtitle:**

**File:** `src/services/metadata-adapters/appstore-edge.adapter.ts`
**Location:** transform() method

```typescript
transform(raw: RawMetadata): ScrapedMetadata {
  const data = raw.data as EdgeMetadataResponse;

  // If Edge Function is in fallback mode and subtitle is empty, parse from title
  const shouldParse =
    data._debugInfo?.source === 'itunes-lookup-fallback' &&
    !data.subtitle;

  let finalTitle = data.title;
  let finalSubtitle = data.subtitle || '';

  if (shouldParse) {
    const parsed = this.parseTrackName(data.title);
    finalTitle = parsed.title;
    finalSubtitle = parsed.subtitle;
  }

  return {
    name: finalTitle,
    title: finalTitle,
    subtitle: finalSubtitle,
    ...
  };
}

private parseTrackName(trackName: string): { title: string; subtitle: string } {
  // Same logic as iTunes adapters
  ...
}
```

**Why This Might Work:**
- ✅ Keeps Edge Function simple (just returns trackName)
- ✅ Adapter handles parsing logic
- ✅ Can reuse frontend parsing code
- ⚠️ Adds complexity to adapter

---

## Recommended Solution

**Recommended:** Option 1 - Restore `parseTrackName()` in Edge Function

**Why:**
1. ✅ **Consistency:** Same logic as frontend iTunes adapters
2. ✅ **Single Source of Truth:** Edge Function handles parsing, adapter just passes through
3. ✅ **Tested Pattern:** Frontend adapters already prove this works
4. ✅ **Simple:** No adapter complexity
5. ✅ **Future-Proof:** When Apple unblocks Edge Function, HTML extraction takes precedence anyway

**Validation Required:**
1. Verify normalizer doesn't strip parsed subtitle
2. Test with multiple apps:
   - "Pimsleur | Language Learning" → title="Pimsleur", subtitle="Language Learning"
   - "Instagram" → title="Instagram", subtitle=""
   - "TikTok - Make Your Day" → title="TikTok", subtitle="Make Your Day"

---

## Verification Plan

### Before Implementation:

1. **Read Current Logs:**
   - Check browser console for existing diagnostic logs
   - Verify Edge Function is using fallback mode
   - Confirm subtitle is empty in current state

### After Implementation:

1. **Test Case 1: Pimsleur (Fallback Mode)**
   ```
   Search: "pimsleur"
   Expected:
     title: "Pimsleur"
     subtitle: "Language Learning"
     _debugInfo.source: "itunes-lookup-fallback"

   Console should show:
     [ITUNES-LOOKUP] trackName: "Pimsleur | Language Learning"
     [ITUNES-LOOKUP] title: "Pimsleur"
     [ITUNES-LOOKUP] subtitle: "Language Learning"
     [DIAG-FETCH] subtitle: "Language Learning"
     [NORMALIZER] subtitle is valid: "Language Learning"
   ```

2. **Test Case 2: Instagram (Fallback Mode)**
   ```
   Search: "instagram"
   Expected:
     title: "Instagram"
     subtitle: "" (no separator in trackName)
   ```

3. **Test Case 3: App with PRODUCT_PAGE HTML (No Regression)**
   ```
   If any app has valid HTML:
     title: from <h1>
     subtitle: from <h2>
     _debugInfo.source: "edge-scrape"

   Should NOT use trackName parsing at all
   ```

4. **Test Case 4: Normalizer Doesn't Strip Subtitle**
   ```
   Verify normalizer logs:
     [NORMALIZER] subtitle is valid: "..."

   NOT:
     [NORMALIZER] Subtitle duplication detected
     [NORMALIZER] Removed title prefix from subtitle
   ```

### Regression Checks:

- ✅ Screenshots still work
- ✅ Icon still works
- ✅ Description still works
- ✅ Developer still works
- ✅ No "LOVE THIS APP" titles return
- ✅ Name field is correct

---

## Conclusion

### Root Cause:
**File:** `supabase/functions/appstore-metadata/index.ts`
**Line:** 288
**Issue:** `subtitle: ''` should be `subtitle: parseTrackName(trackName).subtitle`

### Why This Happened:
1. Misunderstood user requirements (thought they wanted empty subtitle, not parsed)
2. Removed ALL trackName parsing logic
3. Frontend adapters have correct logic but are never used (lower priority)

### The Fix:
Restore `parseTrackName()` function in Edge Function fallback, identical to frontend iTunes adapters.

### Expected Outcome:
- ✅ Name: Correct (from HTML <h1> or parsed trackName)
- ✅ Subtitle: Correct (from HTML <h2> or parsed trackName)
- ✅ No cross-contamination
- ✅ No regressions

---

**Author:** Claude Code
**Date:** 2025-01-18
**Status:** Diagnostic Complete - Ready for User Review
**Next Step:** User approval before implementing fix
