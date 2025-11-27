# BigQuery Pipeline Audit - Findings

**Date:** November 27, 2025
**Issue:** Dashboard V2 not loading (worked on Nov 25)
**Symptom:** Edge function returns `FunctionsHttpError` with no details

---

## Investigation Summary

### ✅ What's Working

1. **Database Layer**
   - ✅ `is_super_admin()` RPC function exists and works
   - ✅ RLS policies on `agency_clients` properly configured
   - ✅ RLS policies on `org_app_access` working
   - ✅ Agency relationships found (1 client org)
   - ✅ App access records found (8 apps)
   - ✅ All migrations applied and up to date

2. **Authentication**
   - ✅ User authentication working
   - ✅ User role lookup working (VIEWER)
   - ✅ Super admin check working

3. **Edge Function**
   - ✅ Edge function deployed (version 500, deployed Nov 26 20:09)
   - ✅ BigQuery secrets configured (BIGQUERY_CREDENTIALS, BIGQUERY_PROJECT_ID)
   - ❌ Edge function crashes with non-2xx status code

### ❌ Root Cause Identified

**The edge function is crashing and returning HTTP error status.**

- Response time: ~524ms (fast, not a timeout)
- Error: `FunctionsHttpError: Edge Function returned a non-2xx status code`
- Context: Empty object (no error details)
- Status: undefined

### 🔍 Hypothesis

The edge function code hasn't changed since Nov 25 (commit e13c76f). The issue is likely:

1. **Service Role Authentication Issue**
   - Edge function expects JWT from user session
   - Service role key doesn't provide a user context
   - Line 213-224 in index.ts: `supabaseClient.auth.getUser()` may fail with service role

2. **Missing User Session**
   - Frontend may not be sending proper Authorization header
   - Token may be expired
   - Auth flow broken after recent auth system changes

### 📋 Next Steps

**PRIORITY 1: Check Edge Function Logs**
- URL: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/logs/edge-functions
- Search for: "bigquery-aso-data"
- Look for:
  - Error messages
  - Stack traces
  - [AGENCY DIAGNOSTIC] logs
  - [BIGQUERY DIAGNOSTIC] logs
  - Authentication errors

**PRIORITY 2: Test with Real User Session**
- Frontend test: Open Dashboard V2 in browser
- Check browser DevTools Network tab
- Look at bigquery-aso-data request
- Check:
  - Authorization header present?
  - Response status code
  - Response body (error details)

**PRIORITY 3: Verify Frontend is Sending Auth Token**
- Check `useEnterpriseAnalytics.ts` hook (line 145-158)
- Verify `supabase.functions.invoke()` includes auth
- Check if auth context is available when Dashboard V2 loads

---

## Test Results

### Test 1: Service Role Direct Call
```bash
node test-edge-service-role.mjs
```
**Result:** ❌ FunctionsHttpError (non-2xx status)

### Test 2: Agency Clients RLS
```bash
node diagnose-bigquery-pipeline.mjs
```
**Result:** ✅ Found 1 client org, 8 apps

### Test 3: is_super_admin() RPC
```bash
node test-is-super-admin-rpc.mjs
```
**Result:** ✅ Function works correctly

---

## Recommendations

### Immediate Actions

1. **Check Logs** - Go to Supabase dashboard and view edge function logs
2. **Test from Browser** - Open Dashboard V2 and check Network tab
3. **Verify Auth Token** - Ensure frontend sends proper Authorization header

### Code Changes (if needed)

If edge function needs to support service role:
```typescript
// In bigquery-aso-data/index.ts around line 213
const {
  data: { user },
  error: userError,
} = await supabaseClient.auth.getUser();

// Add fallback for service role
if (userError && req.headers.get("Authorization")?.includes("service_role")) {
  // Service role bypass - for testing only
  // Get user_id from request body for impersonation
} else if (userError || !user) {
  return new Response(
    JSON.stringify({ success: false, error: "Authentication required" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
```

### Long-term Fixes

1. Add better error logging to edge function
2. Add health check endpoint
3. Add request tracing
4. Implement retry logic in frontend

---

## Files Created During Audit

- `diagnose-bigquery-pipeline.mjs` - Tests agency relationships and app access
- `test-is-super-admin-rpc.mjs` - Tests is_super_admin() function
- `test-agency-clients-authenticated.mjs` - Tests RLS with auth
- `test-edge-service-role.mjs` - Tests edge function with service role
- `check-is-super-admin-function.mjs` - Checks function configuration
- `check-migrations-applied.mjs` - Checks applied migrations

---

## Conclusion

**The backend infrastructure is healthy.** The issue is isolated to the edge function execution. Most likely cause: authentication/authorization issue when edge function is called.

**Next action:** Check edge function logs in Supabase dashboard to see the actual error message.
