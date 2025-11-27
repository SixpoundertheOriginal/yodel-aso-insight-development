# BigQuery Pipeline - Quick Fix Guide

**Use this when Dashboard V2 is broken and you need to fix it FAST.**

---

## 🚨 Emergency Checklist

### Is it broken right now?

- [ ] Dashboard V2 won't load
- [ ] Seeing error messages
- [ ] Data not showing
- [ ] Infinite loading spinner

**If YES → Follow this guide step by step.**

---

## ⚡ 5-Minute Fix (Most Common Issues)

### Issue 1: "Dataset not found"

**Symptoms:** Error message mentions "Dataset" or "aso_reports"

**Fix:**
```bash
# 1. Open the edge function
code supabase/functions/bigquery-aso-data/index.ts

# 2. Search for "aso_reports" (Cmd+F or Ctrl+F)

# 3. Replace ALL occurrences with "client_reports"

# 4. Search for the query requests (around line 603 and 686)
# 5. Make sure they have: location: "EU"

# 6. Deploy
npx supabase functions deploy bigquery-aso-data

# 7. Test
# Open Dashboard V2 in browser
```

**Time:** ~5 minutes

---

### Issue 2: "Authentication failed"

**Symptoms:** "Authentication required" or 401 errors

**Fix:**
```bash
# 1. Check if user is logged in
# Go to browser → DevTools → Application → Local Storage
# Look for supabase.auth.token

# 2. If missing, log out and back in

# 3. If still broken, check edge function logs:
# https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/logs/edge-functions
```

**Time:** ~2 minutes

---

### Issue 3: Empty data (no errors)

**Symptoms:** Dashboard loads but shows no data

**Fix:**
```bash
# 1. Check if apps exist in database
psql -h bkbcqocpjahewqjmlgvf.supabase.co -U postgres

# Run:
SELECT COUNT(*) FROM org_app_access
WHERE organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'
AND detached_at IS NULL;

# Should return > 0
# If 0, apps need to be added to org_app_access table
```

**Time:** ~5 minutes

---

### Issue 4: Slow loading (>10 seconds)

**Symptoms:** Dashboard eventually loads but takes forever

**Fix:**
```bash
# Quick fix: Reduce date range in Dashboard V2
# Change from "Last 90 days" to "Last 30 days"

# Permanent fix: Add partitioning to BigQuery table
# (Requires BigQuery admin access)
```

**Time:** ~2 minutes (quick fix)

---

## 🔍 Diagnosis (What's Actually Wrong?)

### Step 1: Check Edge Function Logs

```
1. Go to: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/logs/edge-functions
2. Filter by: "bigquery-aso-data"
3. Look at most recent error
```

**Common errors and what they mean:**

| Error Message | Meaning | Fix |
|---------------|---------|-----|
| "Dataset aso-reporting-1:aso_reports was not found" | Wrong dataset name | Change to `client_reports` |
| "Location US" | Wrong region | Add `location: "EU"` |
| "Authentication failed" | User not logged in | Re-login |
| "Permission denied for table agency_clients" | RLS blocking | Check is_super_admin() function |
| "Failed to obtain Google OAuth token" | BigQuery credentials invalid | Update BIGQUERY_CREDENTIALS secret |

---

### Step 2: Check Browser Console

```
1. Open Dashboard V2
2. Press F12 (or Cmd+Option+I on Mac)
3. Go to Console tab
4. Look for red error messages
```

**Common errors:**

| Error | Meaning | Fix |
|-------|---------|-----|
| "FunctionsHttpError" | Edge function crashed | Check edge function logs |
| "Network error" | Can't reach Supabase | Check internet connection |
| "Unauthorized" | Not logged in | Re-login |
| "TypeError: Cannot read..." | Frontend code issue | Check if response structure changed |

---

### Step 3: Check Network Tab

```
1. Open Dashboard V2
2. F12 → Network tab
3. Refresh page
4. Find "bigquery-aso-data" request
5. Click it → Response tab
```

**What to look for:**

| Status Code | Response | Problem |
|-------------|----------|---------|
| 200 | `{ "success": true, "data": [...] }` | ✅ Working! Issue is elsewhere |
| 200 | `{ "success": false, "error": "..." }` | Edge function returned error (read error message) |
| 401 | Any | Not authenticated (re-login) |
| 500 | Any | Edge function crashed (check logs) |
| Pending... | Never completes | Timeout (check BigQuery) |

---

## 🛠️ Standard Fixes

### Fix A: Redeploy Edge Function

```bash
# This fixes most code-related issues
npx supabase functions deploy bigquery-aso-data

# Wait 10 seconds, then test Dashboard V2
```

---

### Fix B: Check Configuration

```bash
# 1. Verify secrets exist
npx supabase secrets list

# Should show:
# - BIGQUERY_CREDENTIALS
# - BIGQUERY_PROJECT_ID

# 2. If missing, set them:
npx supabase secrets set BIGQUERY_PROJECT_ID="aso-reporting-1"
npx supabase secrets set BIGQUERY_CREDENTIALS="$(cat path/to/creds.json)"
```

---

### Fix C: Verify BigQuery Access

```bash
# Test BigQuery manually
# Go to: https://console.cloud.google.com/bigquery

# Run this query:
SELECT COUNT(*) as total_rows
FROM `aso-reporting-1.client_reports.aso_all_apple`
WHERE date >= CURRENT_DATE() - 7

# Should return a number
# If error → BigQuery access issue (check service account)
```

---

### Fix D: Check Database State

```sql
-- Connect to database
psql -h bkbcqocpjahewqjmlgvf.supabase.co -U postgres

-- Check user exists
SELECT id, email FROM auth.users WHERE email = 'cli@yodelmobile.com';

-- Check user has role
SELECT * FROM user_roles WHERE user_id = '8920ac57-63da-4f8e-9970-719be1e2569c';

-- Check org has apps
SELECT COUNT(*) FROM org_app_access
WHERE organization_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

-- Check agency relationships
SELECT * FROM agency_clients
WHERE agency_org_id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
```

---

## 🚑 Emergency Recovery

### Nuclear Option: Complete Reset

**⚠️ Only use if everything else failed**

```bash
# 1. Backup current state
git add .
git commit -m "Backup before BigQuery reset"

# 2. Find last working version
git log --oneline | head -20

# Look for commit that says "working" or "fix"
# Example: a4b5c4c Fix BigQuery dataset name

# 3. Restore that version
git checkout a4b5c4c -- supabase/functions/bigquery-aso-data/index.ts

# 4. Redeploy
npx supabase functions deploy bigquery-aso-data

# 5. Test
# Open Dashboard V2
```

---

## ✅ Verification Steps

After any fix, verify it worked:

```
1. Open Dashboard V2
   URL: http://localhost:5173/dashboard-v2

2. Wait 5 seconds

3. Check:
   ✅ KPI cards show numbers (not 0)
   ✅ Charts render
   ✅ No error messages in console
   ✅ App picker shows apps
   ✅ Traffic sources available

4. Change date range
   ✅ Data updates

5. Change app selection
   ✅ Data updates

If all ✅ → FIXED!
```

---

## 📞 When to Escalate

**Call for help if:**
- Tried all fixes above
- Still broken after 30 minutes
- BigQuery console shows errors
- Service account credentials lost
- Database corruption suspected

**What to provide:**
1. Edge function logs (screenshot)
2. Browser console errors (screenshot)
3. Network tab response (copy JSON)
4. What you tried already
5. When it last worked

---

## 📚 Related Docs

- **Full Documentation:** `docs/BIGQUERY_PIPELINE.md`
- **Fix Summary:** `BIGQUERY_FIX_SUMMARY.md`
- **Audit Report:** `AUDIT_FINDINGS.md`

---

## 🔑 Critical Values (Write These Down)

```
BigQuery Project:  aso-reporting-1
BigQuery Dataset:  client_reports
BigQuery Region:   EU
BigQuery Table:    aso_all_apple

Organization ID:   7cccba3f-0a8f-446f-9dba-86e9cb68c92b
User ID (CLI):     8920ac57-63da-4f8e-9970-719be1e2569c

Edge Function:     bigquery-aso-data
Supabase Project:  bkbcqocpjahewqjmlgvf
```

Keep these values handy when troubleshooting!

---

**Last Updated:** November 27, 2025
