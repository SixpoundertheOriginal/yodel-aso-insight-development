# Pimsleur Subtitle Issue - Root Cause Analysis

**Date:** 2025-01-17
**App:** Pimsleur (ID: 1405735469)
**Issue:** Subtitle displays "Pimsleur | Language Learning" instead of "Language Learning"
**Status:** 🚨 **ROOT CAUSE IDENTIFIED - ITUNES API HAS NO SUBTITLE FIELD**

---

## Executive Summary

The iTunes API **does NOT provide a separate subtitle field**. The full app name in the iTunes API is literally `"Pimsleur | Language Learning"` - this is the `trackName`, not a title + subtitle combination.

**iTunes API Reality:**
```json
{
  "trackName": "Pimsleur | Language Learning",
  "trackCensoredName": "Pimsleur | Language Learning"
  // NO subtitle field exists!
}
```

**The Problem:**
Our code currently does:
```typescript
title: app.trackName,           // "Pimsleur | Language Learning"
subtitle: app.trackCensoredName // "Pimsleur | Language Learning"
```

Then normalizer sees:
- title === subtitle (both are "Pimsleur | Language Learning")
- Returns empty string (Case 1: exact match)
- **Result:** No subtitle at all OR subtitle stays as full string

---

## Actual iTunes API Response

**App ID:** 1405735469
**App Name:** Pimsleur

```json
{
  "trackId": 1405735469,
  "trackName": "Pimsleur | Language Learning",
  "trackCensoredName": "Pimsleur | Language Learning",
  "primaryGenreName": "Education",
  "artistName": "Simon & Schuster",
  "description": "Is your goal to actually speak a new language? ...",
  "screenshotUrls": [ ... ],
  // NO subtitle field in iTunes API!
}
```

**Key Finding:** iTunes API has **NO separate subtitle field**.

---

## How App Store Actually Displays It

When you view Pimsleur in the real App Store:

**App Card Display:**
```
[Icon] Pimsleur
       Language Learning
       Education • Free
```

**What the User Sees:**
- **Name:** Pimsleur
- **Subtitle:** Language Learning

**But iTunes API Only Provides:**
- **trackName:** "Pimsleur | Language Learning" (combined!)

---

## The Real Issue

### iTunes API Design

Apple's iTunes Search API combines the app name and subtitle into a **single `trackName` field** using a separator (usually `|` or `-`).

**There is NO separate subtitle field in the JSON response.**

---

### Our Current Implementation

**File:** `src/services/direct-itunes.service.ts`

**transformItunesResult() (Line 178-200):**
```typescript
private transformItunesResult(app: any): ScrapedMetadata {
  return {
    name: app.trackName || 'Unknown App',        // "Pimsleur | Language Learning"
    appId: app.trackId?.toString() || `direct-${Date.now()}`,
    title: app.trackName || 'Unknown App',        // "Pimsleur | Language Learning"
    subtitle: app.trackCensoredName || '',        // "Pimsleur | Language Learning"
    // ...
  };
}
```

**Problem:**
- `title` = `"Pimsleur | Language Learning"` ❌
- `subtitle` = `"Pimsleur | Language Learning"` ❌

**Both fields get the SAME value!**

---

### Normalizer Execution

**File:** `src/services/metadata-adapters/normalizer.ts`

**normalizeSubtitle() receives:**
```typescript
subtitle: "Pimsleur | Language Learning"
title: "Pimsleur | Language Learning"
name: "Pimsleur | Language Learning"
```

**normalizeSubtitle() logic:**
```typescript
// Case 1: Subtitle exactly matches title
if (cleaned.toLowerCase() === title.toLowerCase()) {
  console.log('[NORMALIZER] Subtitle duplication detected: subtitle === title');
  return '';  // ← Returns empty string!
}
```

**Result:** Subtitle is set to **empty string** because it matches title.

---

## Why User Sees "Pimsleur | Language Learning" as Subtitle

**Two Possibilities:**

### Possibility 1: Normalizer Not Running
If normalizer isn't being called for some reason, the raw subtitle `"Pimsleur | Language Learning"` passes through unchanged.

### Possibility 2: Title Also Shows Full String
Both title AND subtitle might be showing `"Pimsleur | Language Learning"`, making it look like subtitle is wrong when actually BOTH are wrong.

---

## The Correct Solution

We need to **split the `trackName` into title and subtitle** BEFORE passing to normalizer.

### Option A: Split in transformItunesResult()

**File:** `src/services/direct-itunes.service.ts`

**Before:**
```typescript
title: app.trackName || 'Unknown App',
subtitle: app.trackCensoredName || '',
```

**After:**
```typescript
// Split trackName into title and subtitle
const { title, subtitle } = this.splitTrackName(app.trackName);
return {
  name: title,                    // "Pimsleur"
  title: title,                   // "Pimsleur"
  subtitle: subtitle,             // "Language Learning"
  // ...
};

private splitTrackName(trackName: string): { title: string; subtitle: string } {
  const separators = [' | ', ' - ', ' – ', ' — ', ': '];

  for (const sep of separators) {
    if (trackName.includes(sep)) {
      const [title, subtitle] = trackName.split(sep, 2);
      return {
        title: title.trim(),
        subtitle: subtitle?.trim() || ''
      };
    }
  }

  // No separator found, return full string as title
  return {
    title: trackName,
    subtitle: ''
  };
}
```

---

### Option B: Split in Normalizer (normalizeTitle)

**File:** `src/services/metadata-adapters/normalizer.ts`

Add logic to `normalizeTitle()` to extract subtitle from title:

```typescript
private normalizeTitle(title: string | undefined, fallbackName: string): { title: string; subtitle: string } {
  const normalized = this.normalizeString(title) || this.normalizeString(fallbackName) || 'Unknown App';

  // Check if title contains subtitle
  const separators = [' | ', ' - ', ' – ', ' — ', ': '];

  for (const sep of separators) {
    if (normalized.includes(sep)) {
      const [titlePart, subtitlePart] = normalized.split(sep, 2);
      return {
        title: titlePart.trim(),
        subtitle: subtitlePart?.trim() || ''
      };
    }
  }

  return {
    title: normalized,
    subtitle: ''
  };
}
```

---

## Recommended Solution

**Split the trackName in `transformItunesResult()`** (Option A)

**Reasons:**
1. ✅ Happens closest to data source (iTunes API)
2. ✅ Only affects direct-itunes.service
3. ✅ Normalizer can still handle edge cases
4. ✅ Clear separation of concerns
5. ✅ Easier to test

---

## Data Flow - After Fix

### Current (Broken):
```
iTunes API:
  trackName: "Pimsleur | Language Learning"
    ↓
transformItunesResult():
  title: "Pimsleur | Language Learning"   ❌
  subtitle: "Pimsleur | Language Learning" ❌
    ↓
normalizer:
  Detects title === subtitle
  Returns subtitle = "" ❌
    ↓
UI:
  Shows no subtitle OR shows full string
```

---

### After Fix (Option A):
```
iTunes API:
  trackName: "Pimsleur | Language Learning"
    ↓
transformItunesResult() WITH splitTrackName():
  title: "Pimsleur"            ✅
  subtitle: "Language Learning" ✅
    ↓
normalizer:
  title !== subtitle (different values)
  Checks for prefix patterns (none match)
  Returns subtitle = "Language Learning" ✅
    ↓
UI:
  Shows subtitle: "Language Learning" ✅
```

---

## Impact Analysis

### Apps Affected

**All apps where trackName contains separators:**
- `"Pimsleur | Language Learning"`
- `"Instagram - Photo & Video"` (might already work if trackCensoredName is different)
- `"TikTok – Make Your Day"`
- Any app using `|`, `-`, `–`, `—`, `:` separators

**Percentage:** Unknown, but likely **10-30% of apps** use combined trackName format.

---

## Current Normalizer Limitations

The normalizer can ONLY:
1. Detect if subtitle === title (remove duplication)
2. Remove title prefix from subtitle (e.g., "Instagram - Photo & Video" → "Photo & Video")

The normalizer CANNOT:
- Split a title into two separate fields
- Extract subtitle from title when no separate subtitle exists

**We must split BEFORE the normalizer runs.**

---

## Test Case

### Input (iTunes API):
```json
{
  "trackName": "Pimsleur | Language Learning",
  "trackCensoredName": "Pimsleur | Language Learning"
}
```

### Current Output (Broken):
```typescript
title: "Pimsleur | Language Learning"
subtitle: "" // Empty because normalizer detected duplication
```

### Expected Output (After Fix):
```typescript
title: "Pimsleur"
subtitle: "Language Learning"
```

---

## Verification Commands

### Check iTunes API Response:
```bash
curl -s "https://itunes.apple.com/lookup?id=1405735469&country=us&entity=software" | python3 -m json.tool | grep "trackName\|trackCensoredName"
```

**Output:**
```json
"trackCensoredName": "Pimsleur | Language Learning",
"trackName": "Pimsleur | Language Learning",
```

**Confirms:** Both fields are identical, no separate subtitle field exists.

---

## Root Cause Summary

### The Problem is NOT:
- ❌ Normalizer separator patterns (we added `|` already)
- ❌ UI rendering (we fixed that)
- ❌ Cached data

### The Problem IS:
- ✅ **iTunes API has NO subtitle field**
- ✅ **trackName contains BOTH title AND subtitle**
- ✅ **We don't split trackName before assigning to title/subtitle**
- ✅ **Normalizer receives identical values for title and subtitle**
- ✅ **Normalizer returns empty string (duplication detected)**

---

## Next Steps (DO NOT IMPLEMENT YET)

### Step 1: Add splitTrackName() method
**File:** `src/services/direct-itunes.service.ts`
**Location:** Add private method before transformItunesResult()

### Step 2: Modify transformItunesResult()
**File:** `src/services/direct-itunes.service.ts`
**Lines:** 178-200
**Change:** Use splitTrackName() to extract title and subtitle

### Step 3: Test with Pimsleur
- Re-import Pimsleur app
- Verify title shows: "Pimsleur"
- Verify subtitle shows: "Language Learning"

---

## Conclusion

The pipe separator fix we applied earlier was **correct but incomplete**.

**What we fixed:**
- ✅ Normalizer now handles `|` separator in subtitle normalization

**What we MISSED:**
- ❌ iTunes API doesn't provide separate subtitle - it's embedded in `trackName`
- ❌ We need to SPLIT `trackName` before setting title/subtitle fields
- ❌ Current code sets both fields to the same value

**The Real Fix:**
Split `trackName` into title + subtitle in `transformItunesResult()` using the same separator patterns.

---

**Diagnostic Complete**
**Root Cause:** ✅ IDENTIFIED
**Solution:** ✅ DESIGNED (not implemented yet)
**Awaiting:** User approval to implement title splitting logic

