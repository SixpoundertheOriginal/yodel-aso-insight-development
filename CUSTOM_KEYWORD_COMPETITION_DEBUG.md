# Custom Keyword "wellness" - Competition Column Shows "-"

## Problem
- Custom keyword "wellness" was added
- ✅ Popularity works (shows score)
- ✅ App Ranking works (shows position)
- ❌ Competition shows "-" (no data)

## Root Cause Investigation

### Most Likely Cause: Timing Issue

When you add a custom keyword, the table needs to re-fetch metrics for the NEW keyword. The fix we applied updates `allUniqueComboTexts` to include custom keywords, but it depends on the React dependency array triggering a re-render.

**Timeline:**
1. Initial page load → Fetches rankings for auto-generated combos
2. User adds "wellness" → Stored in Zustand + database
3. Table re-renders with custom keyword visible
4. BUT: `fetchRankingsIfNeeded()` might not re-run if cache is still valid

### Debug Steps

I've added extensive logging. Open browser console and look for these logs:

#### 1. Check What Was Sent to API
```
[KeywordComboTable] 📡 Fetching rankings for X combos...
```
- Does this number include "wellness"?
- If NO → The dependency array issue isn't fully fixed

#### 2. Check What API Returned
```
[KeywordComboTable] 📥 API returned combo: "wellness", totalResults: 158
```
- Does the API return "wellness"?
- What is the totalResults value?
- If NULL → API couldn't fetch competition data
- If missing → API never tried to fetch it

#### 3. Check Cache Keys
```
[KeywordComboTable] 🔑 Cache keys: ["meditation app", "mindfulness", ...]
```
- Is "wellness" in this list?
- Check case sensitivity (Wellness vs wellness)

#### 4. Check Lookup
```
[KeywordComboTable] 🔍 Custom keyword lookup:
  comboText: "wellness"
  rankingData: undefined
  cacheHasKey: false
  cacheKeys: ["Wellness", "wellness app"]
```
- Is `rankingData` undefined or null?
- Is `cacheHasKey` false?
- Does `cacheKeys` show similar entries with different casing?

## Possible Solutions

### Solution A: Manual Refresh (Quick Fix)
If the cache is valid (< 24h), the fetch won't re-run automatically.

**Fix:**
1. Look for the "Refresh Rankings" button in the Bulk Actions banner
2. Click it to force a re-fetch
3. Should include "wellness" in the new request

### Solution B: Case Normalization (If Case Mismatch)
If logs show "Wellness" in cache but we're looking up "wellness":

**Fix needed in `KeywordComboTable.tsx:857`:**
```typescript
// BEFORE
const rankingData = cachedRankings.get(combo.text);

// AFTER (normalize to lowercase)
const rankingData = cachedRankings.get(combo.text.toLowerCase());
```

AND in line 271 where we store:
```typescript
// Store with lowercase key
newRankings.set(rankingResult.combo.toLowerCase(), { ... });
```

### Solution C: Force Re-fetch on Custom Keyword Add (Ideal)
When a custom keyword is added, automatically trigger a ranking fetch.

**Fix needed in `CustomKeywordInput.tsx` after successful save:**
```typescript
// After keywords saved to database
const { refreshRankings } = useKeywordComboStore(); // Add this action
refreshRankings(); // Trigger immediate re-fetch
```

### Solution D: Invalidate Cache on Custom Keyword Change
Update the `fetchRankingsIfNeeded` dependency array to detect custom keyword changes.

**Check `KeywordComboTable.tsx:292`:**
```typescript
}, [metadata?.appId, metadata?.country, allUniqueComboTexts, isCacheValid, cachedRankings.size]);
```

Should `customKeywords` be explicitly in the deps? Currently it's indirectly included via `allUniqueComboTexts` dependency on `customKeywords`.

## Testing Instructions

1. **Open Browser Console** (F12 → Console tab)

2. **Clear existing logs** (click trash icon)

3. **Add a new custom keyword** (e.g., "meditation")
   - Watch for these logs:
     - `[KeywordComboTable] 📡 Fetching rankings for X combos...`
     - `[KeywordComboTable] 📥 API returned combo: "meditation", totalResults: ...`
     - `[KeywordComboTable] 🔍 Custom keyword lookup: ...`

4. **Check the Competition column** for "meditation"
   - Does it show a number + emoji?
   - Or does it show "-"?

5. **Try manual refresh**:
   - Select any combo (checkbox)
   - Click "Refresh Rankings" button
   - Wait for fetch to complete
   - Check if "wellness" now has competition data

6. **Check database** (Supabase dashboard):
   - Go to `combo_rankings_cache` table
   - Filter: `combo = 'wellness'` and `snapshot_date = today`
   - Does a row exist?
   - What is the `total_results` value?

## Expected Results

### If Working Correctly:
```
✅ Console shows: "Fetching rankings for 47 combos..." (includes wellness)
✅ Console shows: API returned combo: "wellness", totalResults: 158
✅ Console shows: Custom keyword lookup has rankingData with totalResults: 158
✅ UI shows: 🟠 158 in Competition column
```

### If Still Broken:
```
❌ Console shows: "Fetching rankings for 46 combos..." (excludes wellness)
OR
❌ Console shows: API returned combo: "wellness", totalResults: null
OR
❌ Console shows: cacheHasKey: false (cache miss)
OR
❌ UI shows: - in Competition column
```

## Next Steps Based on Logs

**Share the console logs** from steps 3-4 above, specifically:
- The "Fetching rankings for X combos" log
- The "API returned combo" logs (all of them)
- The "Custom keyword lookup" log for "wellness"

This will tell us exactly which scenario we're in and how to fix it.

## Temporary Workaround

Until we identify the root cause:

1. After adding custom keywords, **always click "Refresh Rankings"**
2. This forces a re-fetch that should include the new keywords
3. Wait ~5-10 seconds for API to complete
4. Check if Competition column now shows data

If even manual refresh doesn't work, then the issue is in the API layer (Edge Function) not fetching competition data, not in the frontend caching.
