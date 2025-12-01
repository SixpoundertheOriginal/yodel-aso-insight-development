# Competition Showing "-" Debug Plan

**Date**: December 1, 2025
**Issue**: Competition still showing "-" for Inspire app after both backend and frontend fixes
**Status**: Need to debug actual cause

---

## What We've Fixed So Far

✅ **Backend (Edge Function)**: Supports ephemeral mode (no monitored_apps requirement)
✅ **Frontend (React Hook)**: Falls back to user's organization for ephemeral mode

**But competition still shows "-" everywhere** 😕

---

## Possible Root Causes

### 1. `metadata.appId` is Missing/Undefined

**Where to check**:
- `EnhancedKeywordComboWorkbench` receives `metadata` prop with `appId`
- Passes to `KeywordComboTable metadata={metadata}`
- Hook checks: `if (!appId || combos.length === 0) return;`

**Diagnosis**:
```typescript
// In useBatchComboRankings (line 44-47):
if (!appId || combos.length === 0) {
  setIsLoading(false);
  return; // ❌ Stops here if appId missing!
}
```

**How to verify**:
- Check browser console for log: `[useBatchComboRankings] Fetching X combos for app XXXXX`
- If you DON'T see this log → `appId` is missing!

---

### 2. User Has No Organization in `user_roles`

**Where to check**:
- Frontend tries to get user's org from `user_roles` table (line 80-95)
- If query fails → Early return

**Diagnosis**:
```typescript
const { data: userRoles, error: roleError } = await supabase
  .from('user_roles')
  .select('organization_id')
  .eq('user_id', session.user.id)
  .single();

if (roleError || !userRoles) {
  console.error(`Could not get user's organization:`, roleError);
  setIsLoading(false);
  return; // ❌ Stops here!
}
```

**How to verify**:
- Check browser console for error: `[useBatchComboRankings] Could not get user's organization`
- Check database:
```sql
SELECT * FROM user_roles WHERE user_id = 'YOUR_USER_ID';
```

---

### 3. Edge Function Returning Errors

**Where to check**:
- Frontend calls edge function (line 98-115)
- Edge function might be rejecting request

**Diagnosis**:
```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/check-combo-rankings`,
  { method: 'POST', body: JSON.stringify({ appId, combos, country, platform, organizationId }) }
);

if (!response.ok) {
  throw new Error(`API error: ${response.statusText}`);
}
```

**How to verify**:
- Browser console: Look for `[useBatchComboRankings] Error: API error: ...`
- Network tab: Check `/functions/v1/check-combo-rankings` request → Response tab for error JSON

---

### 4. Edge Function Returns Empty Results

**Where to check**:
- Edge function returns `{ success: true, results: [] }` (empty array)
- Frontend builds empty Map → All show "-"

**Diagnosis**:
```typescript
const result = await response.json();
console.log(`Received ${result.results?.length || 0} results`);

// If result.results is empty array → No rankings added to Map
```

**How to verify**:
- Browser console: Look for `[useBatchComboRankings] Received 0 results`
- Network tab: Check response JSON → `results` array length

---

### 5. Combos Array is Empty

**Where to check**:
- `KeywordComboTable` passes `allComboTexts` to hook (line 113-118)
- If `sortedCombos` is empty → `allComboTexts = []` → Hook returns early

**Diagnosis**:
```typescript
const allComboTexts = sortedCombos.map(c => c.text);
// If sortedCombos is empty → allComboTexts = []

// In hook:
if (!appId || combos.length === 0) {
  return; // ❌ Stops here!
}
```

**How to verify**:
- Check if combo table has any rows visible
- If table is empty → No combos loaded yet

---

## Debug Steps (In Order)

### Step 1: Check Browser Console

Open browser DevTools (F12) → Console tab

**Look for these logs**:
1. `[useBatchComboRankings] Fetching X combos for app XXXXX`
   - ✅ If you see this → appId and combos are OK
   - ❌ If you DON'T see this → appId or combos missing

2. `Using monitored app's organization` OR `Ephemeral mode - using user's organization`
   - ✅ If you see this → Organization lookup succeeded
   - ❌ If you DON'T see this → Check for error logs

3. `[useBatchComboRankings] Error: ...`
   - ❌ Shows what went wrong

4. `[useBatchComboRankings] Received X results`
   - ✅ If X > 0 → Data returned
   - ❌ If X = 0 → Edge function returned empty

### Step 2: Check Network Tab

Open DevTools → Network tab → Reload page

**Look for**:
1. Request to `/functions/v1/check-combo-rankings`
   - ✅ If exists → Frontend is calling edge function
   - ❌ If missing → Frontend stopped before API call

2. Request status:
   - ✅ 200 OK → Edge function succeeded
   - ❌ 400/401/403/404/500 → Check response body for error

3. Response body:
   - Check `success` field (should be `true`)
   - Check `results` array length (should be > 0)
   - Check each result has `totalResults` field

### Step 3: Check Database (If Needed)

**Only if frontend reaches edge function but fails**:

```sql
-- Check if user has organization
SELECT * FROM user_roles
WHERE user_id = 'YOUR_USER_ID';

-- Check if app is monitored (optional - shouldn't matter)
SELECT * FROM monitored_apps
WHERE app_id = '1613049174';

-- Check if any ranking data exists (should be empty for ephemeral)
SELECT COUNT(*) FROM keyword_rankings;
```

---

## Most Likely Issues (In Order)

### #1: `metadata.appId` is Missing (90% likely)

**Symptom**: No logs in console at all

**Cause**: Parent component not passing `appId` in metadata prop

**Where to check**: Parent component that renders `EnhancedKeywordComboWorkbench`

**Fix**: Ensure metadata includes `appId: '1613049174'`

### #2: User Not in `user_roles` Table (5% likely)

**Symptom**: Console error: "Could not get user's organization"

**Cause**: User account doesn't have organization assignment

**Fix**: Add user to `user_roles` table with organization_id

### #3: Edge Function Permission Error (3% likely)

**Symptom**: Network error 403 Forbidden

**Cause**: User doesn't have access to organization or edge function

**Fix**: Check RLS policies on edge function

### #4: Combos Array Empty (2% likely)

**Symptom**: Table shows no rows

**Cause**: Audit hasn't generated combos yet

**Fix**: Wait for audit to complete

---

## User Action Required

**Please do the following and report back**:

### 1. Open Browser Console (F12)

**Copy and paste ALL logs that contain**:
- `[useBatchComboRankings]`
- Any red errors

### 2. Check Network Tab

**Filter for**: `check-combo-rankings`

**Report**:
- Is there a request? (Yes/No)
- What's the status code? (200, 400, 403, 404, 500, etc.)
- If error, what's the response body?

### 3. Quick Test

**In browser console, run**:
```javascript
// Check if metadata has appId
console.log('Metadata:', window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
```

OR just tell me:
- Are there combos visible in the table? (Yes/No)
- Do you see any error messages in red? (If yes, copy them)

---

## Expected Behavior

**If working correctly, console should show**:
```
[useBatchComboRankings] Fetching 50 combos for app 1613049174
Ephemeral mode - using user's organization: abc12345...
[useBatchComboRankings] Received 50 results
```

**And Network tab should show**:
```
POST /functions/v1/check-combo-rankings
Status: 200 OK
Response: { success: true, results: [{combo: "daily habits", totalResults: 189, ...}, ...] }
```

---

## Next Steps

Once you share:
1. Console logs
2. Network request status
3. Whether combos are visible

I can pinpoint the exact issue and provide the correct fix!

---

**Status**: Awaiting user debug info 🔍
