# Dashboard V2 App Picker - Diagnostic Instructions

**Issue:** App picker not displaying after Edge Function updates
**Status:** Need to gather evidence before fixing

---

## 🔍 Quick Diagnostic Steps

### Step 1: Open Browser Console (2 minutes)

1. Navigate to http://localhost:8080/dashboard-v2 (or your deployed URL)
2. Open DevTools (F12 or Cmd+Option+I on Mac)
3. Go to "Console" tab
4. Look for these log messages and copy them:

**Look for:**
```
📊 [DASHBOARD-V2] Rendering
📊 [DASHBOARD-V2] Hook Result
📊 [ENTERPRISE-ANALYTICS] Fetching data...
✅ [ENTERPRISE-ANALYTICS] Data received successfully
```

**Specifically check:**
- What does "Hook Result" show?
- Does it say "hasData: true" or "hasData: false"?
- What is the "rawRows" count?

### Step 2: Check Available Apps (1 minute)

**In the browser console, type:**
```javascript
// Get the component state
const data = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.get(1).getCurrentFiber();

// Or simply refresh and look for:
// "availableApps:" in the console logs
```

**Or look for console logs that say:**
```
Available apps: []  // or
Available apps: [{ app_id: '...', app_name: '...' }]
```

### Step 3: Check Network Tab (2 minutes)

1. Stay on /dashboard-v2 page
2. Go to "Network" tab in DevTools
3. Clear network log (trash icon)
4. Refresh the page (Cmd+R or F5)
5. Filter by: `bigquery`
6. Find request: `bigquery-aso-data`
7. Click on it
8. Go to "Response" tab
9. Copy the full response (or take screenshot)

**Check:**
- Does response have `data` field?
- Does response have `meta` field?
- Does `meta` have `app_ids` field?
- How many items in `meta.app_ids`?

### Step 4: Check Edge Function Logs (2 minutes)

1. Open: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/functions/bigquery-aso-data/logs
2. Look at the most recent invocation (timestamp matches your page load)
3. Copy the logs

**Check for:**
```
[AGENCY] Agency mode enabled
[ACCESS] App access validated
  allowed_apps: 23
[BIGQUERY] Query completed
  rowCount: ?
```

---

## 📋 What to Report

### Minimum Information Needed:

1. **Console Logs:**
   ```
   Copy all logs that start with:
   📊 [DASHBOARD-V2]
   📊 [ENTERPRISE-ANALYTICS]
   🔍 [ENTERPRISE-ANALYTICS]
   ```

2. **Network Response:**
   ```json
   {
     "data": ...,
     "meta": {
       "app_ids": ...  // Does this exist?
     }
   }
   ```
   (Just the structure, first few items is fine)

3. **Edge Function Logs:**
   ```
   The last invocation log showing:
   - [AGENCY] messages
   - [ACCESS] messages
   - [BIGQUERY] messages
   ```

---

## 🎯 Quick Self-Diagnosis

### Scenario A: meta.app_ids exists in Network response

**If Network tab shows:**
```json
{
  "meta": {
    "app_ids": ["app1", "app2", ...],
    "app_count": 23
  }
}
```

**But app picker is missing:**
→ Frontend processing issue
→ Check console for `availableApps` value
→ Might be React Query cache or unwrapping logic

---

### Scenario B: meta.app_ids missing in Network response

**If Network tab shows:**
```json
{
  "meta": {
    "timestamp": "...",
    "row_count": 123
    // NO app_ids here
  }
}
```

**App picker missing:**
→ Edge Function not updated
→ Deployment failed or old code cached
→ Need to redeploy

---

### Scenario C: Network request fails or returns error

**If Network tab shows:**
```json
{
  "error": "...",
  "details": "..."
}
```

**App picker missing:**
→ Edge Function error
→ Check Edge Function logs for error
→ Might be BigQuery auth issue, query error, etc.

---

### Scenario D: data field is empty or has no app_id

**If Network tab shows:**
```json
{
  "data": [],  // Empty!
  "meta": {
    "app_ids": ["app1", "app2"],
    "row_count": 0
  }
}
```

**App picker might appear BUT no data in charts:**
→ BigQuery returned no results
→ Date range issue or app access issue
→ Check Edge Function logs for query details

---

## 🚀 Quick Fixes (If Obvious)

### If: Edge Function not deployed

**Check:**
```bash
supabase functions list
# Look for bigquery-aso-data, check "Last Deployed" timestamp
```

**Fix:**
```bash
supabase functions deploy bigquery-aso-data
```

---

### If: React Query cache issue

**Fix:** Hard refresh
- Chrome/Edge: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Firefox: Cmd+Shift+R (Mac) or Ctrl+F5 (Windows)
- Safari: Cmd+Option+R

---

### If: Console shows "availableApps: []" but Network has meta.app_ids

**Temporary Fix:** Add console.log to force recompute

Open browser console and run:
```javascript
localStorage.clear();
location.reload();
```

---

## 📊 Expected Values (For Reference)

### Healthy Response:

**Network Tab:**
```json
{
  "data": [ /* 500+ rows */ ],
  "scope": {
    "app_ids": ["app1", "app2", ...],  // 23 apps
    "organization_id": "7cccba3f..."
  },
  "meta": {
    "request_id": "...",
    "timestamp": "...",
    "data_source": "bigquery",
    "row_count": 523,
    "app_ids": ["app1", "app2", ...],  // 23 apps ✅
    "app_count": 23,
    "available_traffic_sources": ["App_Store_Search", "App_Store_Browse"],
    "query_duration_ms": 1234
  }
}
```

**Console:**
```
📊 [DASHBOARD-V2] Rendering
   Organization: Yodel Mobile
   Selected Apps: 1

📊 [DASHBOARD-V2] Hook Result: {
  isLoading: false,
  hasError: false,
  hasData: true,
  rawRows: 523,
  dataSource: 'bigquery'
}

Available apps: [
  { app_id: 'app1', app_name: 'app1' },
  ...
]  // 23 items
```

**UI:**
```
✅ App picker displays
✅ Shows "Apps: App1 (+22 more)"
✅ Traffic sources shows "All Sources (2)"
✅ Charts display data
```

---

## 🎯 Summary

**What we need to know:**

1. **Is meta.app_ids in the response?**
   → Check Network tab

2. **Is rawData in the hook result?**
   → Check Console logs

3. **Is availableApps empty or populated?**
   → Check Console logs

4. **Are there any errors?**
   → Check Console and Edge Function logs

Once we have this information, we can identify the exact issue and fix it properly.

---

**Time Required:** 5-10 minutes to gather evidence
**No Code Changes:** Just diagnostics
**Goal:** Understand exactly where the data flow breaks
