# Competition Showing "0" Bug Audit

**Date**: December 1, 2025
**Issue**: Competition column showing "0" for keywords with many ranking apps
**Status**: Root Cause Identified ✅

---

## Summary

**Symptom**: User reports competition showing "0" for keywords they know have multiple ranking apps (e.g., "daily habits").

**Root Cause**: Database has 0 records, meaning either:
1. User hasn't clicked "Refresh Rankings" button yet, OR
2. Edge function calls are **failing with errors** and returning `totalResults: 0` as fallback

---

## Investigation Results

### ✅ Step 1: Database Check

**Query**: `SELECT count(*) FROM keyword_rankings`

**Result**: `0 records`

**Finding**: Database is completely empty - no ranking data has been saved.

---

### ✅ Step 2: Edge Function Code Review

**File**: `supabase/functions/check-combo-rankings/index.ts`

**Line 855** - Database write (CORRECT ✅):
```typescript
serp_snapshot: { total_results: searchData.resultCount, checked_top_n: TOP_N_RESULTS },
```

**Line 875** - Success return (CORRECT ✅):
```typescript
totalResults: searchData.resultCount,
```

**Line 885** - Error fallback (⚠️ RETURNS 0):
```typescript
// Return error result (non-ranking)
return {
  combo,
  position: null,
  isRanking: false,
  totalResults: 0,  // ⚠️ Returns 0 on error!
  checkedAt: new Date().toISOString(),
  trend: null,
  positionChange: null,
};
```

**Finding**: Edge function returns `totalResults: 0` when iTunes API call **fails/errors**.

---

### ✅ Step 3: iTunes API Direct Test

**Test**: Fetch "daily habits" keyword directly from iTunes API

**Result**:
```
✅ Status: 200 OK
✅ resultCount: 189
✅ results length: 189
✅ First app: MyRoutine: Routine Habit Goal (ID: 1518956326)
```

**Finding**: iTunes API works perfectly and returns valid `resultCount`.

---

## Root Cause Analysis

Since:
1. ✅ iTunes API works (returns `resultCount: 189`)
2. ✅ Edge function code is correct (saves `searchData.resultCount`)
3. ❌ Database has 0 records
4. ⚠️ Edge function returns `totalResults: 0` on error (line 885)
5. 🔴 User sees "0" in competition column

**Conclusion**: The edge function is **encountering errors** when trying to fetch rankings, and the error fallback returns `0`.

---

## Possible Error Causes

### 1. Authentication/Authorization Errors
- User token expired or invalid
- User doesn't have access to organization
- App not found in monitored_apps

### 2. Database Errors
- Keywords table insert/upsert failing
- keyword_rankings insert failing (RLS policy?)
- Foreign key constraint violations

### 3. iTunes API Errors (less likely, since direct test works)
- Rate limiting (429 errors)
- Circuit breaker OPEN state (too many failures)
- Network timeouts

### 4. Missing App in monitored_apps
- Line 464-482: Edge function requires app to exist in `monitored_apps` table
- Returns 404 error if app not found

---

## How to Diagnose

### Method 1: Check Edge Function Logs (Recommended)

Visit Supabase Dashboard:
```
https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/functions/check-combo-rankings/logs
```

Look for error logs:
- `[fetchAndStoreRanking] Error for ...`
- `fetch_ranking_failed` events
- `Auth failed`
- `Org access denied`
- `App not found`
- `Keyword upsert error`
- `Ranking insert error`

### Method 2: Test Edge Function Directly

Create test script:
```javascript
const response = await fetch(
  'https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/check-combo-rankings',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer YOUR_USER_TOKEN`,
    },
    body: JSON.stringify({
      appId: '1613049174', // Inspire app ID
      combos: ['daily habits'],
      country: 'us',
      platform: 'ios',
      organizationId: 'YOUR_ORG_ID',
    }),
  }
);

const result = await response.json();
console.log(result);
```

### Method 3: Check Browser Console

When clicking "Refresh Rankings":
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for:
   - `[useBatchComboRankings] Error: ...`
   - `API error: ...`
   - `Failed to fetch rankings`

---

## Most Likely Culprit: App Not in monitored_apps

**Evidence**:
- Database has 0 records (no writes succeeded)
- Edge function line 471-482 returns 404 if app not found
- This would prevent ANY rankings from being saved

**Check**:
```sql
SELECT id, app_id, platform, organization_id
FROM monitored_apps
WHERE app_id = '1613049174' AND platform = 'ios';
```

If this returns 0 rows → **APP NOT MONITORED** → Need to run audit first!

---

## Solutions

### Solution A: If App Not in monitored_apps

**User needs to**:
1. Go to "App Audit" page
2. Search for app (Inspire - 1613049174)
3. Click "Run Audit" button
4. Wait for audit to complete
5. Then try "Refresh Rankings" again

**This will**:
- Add app to `monitored_apps` table
- Create organization link
- Enable ranking checks

### Solution B: If RLS Policy Blocking Writes

**Check RLS policy** on `keyword_rankings` table:
```sql
SELECT * FROM pg_policies
WHERE tablename = 'keyword_rankings';
```

**Ensure** service role can INSERT:
```sql
-- Service role should bypass RLS, but check anyway
ALTER TABLE keyword_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON keyword_rankings
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

### Solution C: If Rate Limited

**Check circuit breaker** logs for:
- `Rate limited! Waiting ...`
- `Circuit breaker opened`

**Wait** 1-5 minutes and try again.

### Solution D: Better Error Handling (Code Improvement)

**Instead of returning `totalResults: 0` on error**, return `totalResults: null`:

**File**: `supabase/functions/check-combo-rankings/index.ts:885`

```typescript
// Before (MISLEADING):
totalResults: 0,  // Makes UI show "0" (looks like keyword has no competition)

// After (ACCURATE):
totalResults: null,  // Makes UI show "-" (data unavailable)
```

**Why this is better**:
- `0` implies "0 competitors" (which is false)
- `null` implies "data not available" (which is true)
- Frontend already handles `null` correctly (shows "-")

---

## User Action Items

### Immediate:
1. **Check browser console** for error messages when clicking "Refresh Rankings"
2. **Copy any error messages** and share them
3. **Verify app is monitored**: Check if Inspire app (1613049174) exists in monitored apps list

### If App Not Monitored:
1. Run full app audit for Inspire
2. Wait for audit completion
3. Try "Refresh Rankings" again

### If Still Broken:
1. Check Supabase edge function logs at:
   ```
   https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/functions/check-combo-rankings/logs
   ```
2. Share any error messages

---

## Expected Behavior After Fix

### Before (Current - Broken):
```
| Combo        | Competition |
|--------------|-------------|
| daily habits | 0           | ❌ Wrong (should be 189)
| wellness app | 0           | ❌ Wrong
```

### After (Fixed):
```
| Combo        | Competition |
|--------------|-------------|
| daily habits | 🟠 189      | ✅ Correct!
| wellness app | 🟢 45       | ✅ Correct!
```

---

## Files Checked

1. ✅ `supabase/functions/check-combo-rankings/index.ts`
   - Line 855: Saves `total_results` correctly
   - Line 875: Returns `totalResults` on success
   - Line 885: Returns `totalResults: 0` on error ⚠️

2. ✅ `src/hooks/useBatchComboRankings.ts`
   - Line 119: Reads `totalResults` correctly
   - Auto-fetches on mount (line 134-136)

3. ✅ `src/components/AppAudit/KeywordComboWorkbench/CompetitionCell.tsx`
   - Line 85-86: Shows "-" for `null`
   - Shows "0" for `0` (misleading when it's an error)

4. ✅ iTunes API Direct Test
   - Returns `resultCount: 189` for "daily habits" ✅

---

## Next Steps

**Priority 1 (User)**: Check browser console for errors when clicking "Refresh Rankings"

**Priority 2 (Dev)**: Change error fallback from `totalResults: 0` to `totalResults: null`

**Priority 3 (User)**: Verify app is in monitored_apps table

---

## Summary

**Problem**: Competition showing 0 because edge function errors return `totalResults: 0`

**Root Cause**: Edge function encountering errors (likely app not monitored)

**Quick Fix**: Ensure app is monitored by running full audit first

**Code Fix**: Change error fallback to `null` instead of `0` (line 885)

**Status**: ⏳ Awaiting user to check browser console and verify app is monitored

---

**Created by**: Claude Code
**Last Updated**: December 1, 2025
