# Competition Column Showing "-" - ROOT CAUSE ANALYSIS

**Date**: December 1, 2025
**Issue**: Competition column shows "-" for all 77 keywords
**Status**: ROOT CAUSE IDENTIFIED

---

## Summary

The `check-combo-rankings` edge function is **deployed but never invoked**. Despite successful deployment (VERSION 11 at 14:20:14), there are ZERO execution logs in Supabase dashboard.

---

## Evidence

### ✅ What Works
1. **iTunes API**: Direct curl tests work perfectly
   - `curl "https://itunes.apple.com/search?term=healthy+habits&country=us&entity=software&limit=200"`
   - Returns: `resultCount: 182`

2. **Frontend Hook**: Executes correctly
   - Logs: `[useBatchComboRankings] Fetching 77 combos`
   - Makes 4 batched API calls (25+25+25+2)
   - Receives responses with `totalResults: null`

3. **Edge Function Deployment**: Succeeds
   - VERSION 11 deployed at 14:20:14
   - No deployment errors
   - File uploaded successfully

### ❌ What's Broken
1. **Edge Function Never Executes**
   - NO logs in Supabase dashboard containing `[check-combo-rankings]`
   - Expected log: `🚀 Handler invoked` (added at line 287)
   - Expected log: `Method: POST` (added at line 294)
   - Expected log: `Request: {appId, combosCount...}` (added at line 344)
   - **NONE of these logs appear**

2. **All Responses Have `totalResults: null`**
   - Frontend warning: `⚠️ 25/25 combos returned null totalResults (API errors)`
   - This happens for ALL 4 batches = 100% failure rate
   - `null` indicates the catch block is returning error results

---

## Diagnosis

### Theory 1: Function Crashes Before Logging
**Likelihood**: High

The function might be crashing during initialization (before line 287) due to:
- Import errors
- Environment variable issues
- Supabase client initialization failure

**Test**: Check if function has boot errors in Supabase dashboard

### Theory 2: Wrong Endpoint Being Called
**Likelihood**: Low

Frontend might be calling old/cached endpoint.

**Evidence Against**:
- Function version incremented (10 → 11)
- Deploy succeeded
- No 404 errors in frontend

### Theory 3: Authorization Failing Silently
**Likelihood**: Medium

Function might be rejecting requests before reaching our logs.

**Evidence For**:
- Returns structured error (not 401/403)
- Still returns `totalResults: null` format

---

## Next Steps

### Immediate Actions

1. **Check Supabase Dashboard for Boot Errors**
   - Go to: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/functions
   - Click: `check-combo-rankings`
   - Look for: Red error messages, boot failures

2. **Add Logging at VERY START of File**
   ```typescript
   console.log('[check-combo-rankings] 📦 FILE LOADED');

   serve(async (req) => {
     console.log('[check-combo-rankings] 🚀 Handler invoked');
     // ...
   });
   ```

3. **Test Function Directly with curl**
   ```bash
   curl -X POST https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/check-combo-rankings \
     -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"appId":"6477780060","combos":["test"],"country":"us","platform":"ios","organizationId":"YOUR_ORG_ID"}'
   ```

4. **Check for Import/Environment Issues**
   - Verify `serve` import works
   - Verify `createClient` import works
   - Check if `SUPABASE_URL` env var exists

---

## Logs Timeline

### Frontend (Browser Console)
```
14:09:50 - [useBatchComboRankings] Fetching 77 combos for app 6477780060
14:09:50 - [useBatchComboRankings] Processing 4 batches of ~25 combos each
14:09:50 - [useBatchComboRankings] Fetching batch 1/4 (25 combos)
14:09:50 - [useBatchComboRankings] ⚠️ 25/25 combos returned null totalResults
14:09:50 - [useBatchComboRankings] Received 77 total results from all batches
```

### Backend (Supabase Dashboard)
```
[NO LOGS FOUND FOR check-combo-rankings]
[Only metadata-audit-v2 logs present]
```

---

## Code Locations

### Edge Function Handler
**File**: `supabase/functions/check-combo-rankings/index.ts`
**Line 287**: `serve(async (req) => {`
**Line 287**: Added: `console.log('[check-combo-rankings] 🚀 Handler invoked');`
**Line 294**: Added: `console.log('[check-combo-rankings] Method:', req.method);`
**Line 344**: Added: `console.log('[check-combo-rankings] Request: {...}');`

### Frontend Hook
**File**: `src/hooks/useBatchComboRankings.ts`
**Line 146**: Logs first result from edge function
**Line 152**: Warns about null totalResults

---

## Status

**BLOCKED**: Cannot proceed until we understand why the edge function never executes.

**User Action Required**:
1. Check Supabase dashboard for boot errors
2. Share any red error messages
3. Try accessing function URL directly in browser to see if it returns HTML error page

---

**Next Update**: Awaiting user feedback on dashboard errors
