# App Picker Shows Only One App - Root Cause Analysis

**Date:** November 8, 2025
**Status:** 🔍 **ROOT CAUSE IDENTIFIED - NO CODE CHANGES YET**

---

## ✅ What's Working

The RLS fixes were successful:
- ✅ `agency_clients` table: Fixed, agency mode working
- ✅ `org_app_access` table: Fixed, returns 23 apps
- ✅ Edge Function logs: `allowed_apps: 23` ✅
- ✅ Agency mode: Detects 2 client orgs, queries 3 total orgs ✅

Edge Function is returning all 23 accessible apps correctly!

---

## ❌ The New Problem

**User reports:** App picker only shows ONE app instead of 23

**Edge Function logs show:** `allowed_apps: 23` ✅ (correct)

**This is a FRONTEND bug, not a backend bug.**

---

## 🔍 Root Cause Analysis

### The Bug: Dual-Purpose Field

**The Issue:**
The Edge Function returns `meta.app_ids` which serves **TWO different purposes**:

1. **Data Processing:** Which apps were actually queried in BigQuery
2. **UI Picker:** Which apps are available for the user to select

This creates a cascading bug:

### The Bug Flow:

```
Step 1: Initial Load
├─ Dashboard loads
├─ First query: requestedAppCount: 0 (no app selected)
├─ Edge Function: appIdsForQuery = all 23 apps
├─ Response: meta.app_ids = [23 apps] ✅
├─ Frontend: availableApps = 23 apps ✅
└─ App picker shows: 23 apps ✅

Step 2: Auto-Selection (Line 212-215 of ReportingDashboardV2.tsx)
├─ useEffect auto-selects first app
├─ setSelectedAppIds([availableApps[0].app_id])
└─ Triggers new query with selected app

Step 3: Second Query (THE BUG)
├─ Second query: requestedAppCount: 1 (one app selected)
├─ Edge Function: appIdsForQuery = [selected app only]  ← FILTERED
├─ Response: meta.app_ids = [1 app]  ← BUG: Only the queried app
├─ Frontend: availableApps = 1 app  ← BUG: Recalculated from meta.app_ids
└─ App picker shows: 1 app  ← USER SEES THIS

Step 4: User Opens App Picker
├─ Only 1 app visible in dropdown
└─ Cannot select other 22 apps (they're not in the list)
```

### The Code Evidence

**Edge Function (Lines 321-327):**
```typescript
const normalizedRequestedAppIds = Array.isArray(requestedAppIds)
  ? requestedAppIds.filter((id: unknown): id is string => typeof id === "string")
  : [];

const appIdsForQuery = normalizedRequestedAppIds.length > 0
  ? normalizedRequestedAppIds.filter((id) => allowedAppIds.includes(id))  // FILTERED
  : allowedAppIds;  // ALL apps
```

**Edge Function (Line 504):**
```typescript
meta: {
  app_ids: appIdsForQuery,  // ← BUG: This changes based on query
  // ...
}
```

**Frontend (Lines 93-109):**
```typescript
const availableApps = useMemo(() => {
  if (!data?.meta?.app_ids) {
    // Fallback...
  }

  // Use app_ids from meta if available
  return data.meta.app_ids.map(appId => ({  // ← BUG: Recalculates on every query
    app_id: appId,
    app_name: appId
  }));
}, [data?.meta?.app_ids, data?.rawData]);  // ← Dependency on meta.app_ids
```

**Frontend Auto-Selection (Lines 212-215):**
```typescript
useEffect(() => {
  if (availableApps.length > 0 && selectedAppIds.length === 0) {
    setSelectedAppIds([availableApps[0].app_id]);  // ← Triggers second query
  }
}, [availableApps.length]);
```

---

## 🎯 The Problem Explained

### Initial Load (Working):
```json
Request: {
  "requestedAppCount": 0
}

Edge Function:
  allowedAppIds = [23 apps]  ✅
  appIdsForQuery = allowedAppIds  ✅ (no filter applied)

Response: {
  "meta": {
    "app_ids": [23 apps]  ✅
  }
}

Frontend:
  availableApps = [23 apps]  ✅
  App picker shows: 23 apps  ✅
```

### After Auto-Selection (Broken):
```json
Request: {
  "requestedAppCount": 1,
  "appIds": ["1000928831"]  ← Auto-selected first app
}

Edge Function:
  allowedAppIds = [23 apps]  ✅ Still correct!
  appIdsForQuery = ["1000928831"]  ← FILTERED to requested app only

Response: {
  "meta": {
    "app_ids": ["1000928831"]  ❌ Only 1 app (not all 23!)
  }
}

Frontend:
  availableApps = ["1000928831"]  ❌ Recalculated from meta.app_ids
  App picker shows: 1 app  ❌ USER SEES THIS
```

---

## 🔧 The Fix Strategy

### Solution: Separate Query Scope from Available Apps

**Add a new field to Edge Function response:**

```typescript
meta: {
  // Existing field (keep for backward compatibility)
  app_ids: appIdsForQuery,  // Apps that were queried in BigQuery

  // NEW FIELD: All apps user has access to (for UI picker)
  all_accessible_app_ids: allowedAppIds,  // ← Always contains all 23 apps

  // Additional context
  app_count: appIdsForQuery.length,  // Number of apps queried
  total_accessible_apps: allowedAppIds.length,  // Total apps available (23)
}
```

**Update frontend to use the correct field:**

```typescript
const availableApps = useMemo(() => {
  // Priority 1: Use all_accessible_app_ids (always contains full list)
  if (data?.meta?.all_accessible_app_ids) {
    return data.meta.all_accessible_app_ids.map(appId => ({
      app_id: appId,
      app_name: appId
    }));
  }

  // Priority 2: Fallback to app_ids (for backward compatibility)
  if (data?.meta?.app_ids) {
    return data.meta.app_ids.map(appId => ({
      app_id: appId,
      app_name: appId
    }));
  }

  // Priority 3: Extract from raw data
  if (data?.rawData) {
    const uniqueAppIds = Array.from(new Set(data.rawData.map(row => row.app_id)));
    return uniqueAppIds.map(appId => ({
      app_id: appId,
      app_name: appId
    }));
  }

  return [];
}, [data?.meta?.all_accessible_app_ids, data?.meta?.app_ids, data?.rawData]);
```

---

## 📊 Before vs After Fix

### Before Fix:

```
Initial Load:
  meta.app_ids: [23 apps]
  availableApps: [23 apps]
  App picker: Shows 23 apps ✅

After Auto-Selection:
  meta.app_ids: [1 app]  ← Changes based on query
  availableApps: [1 app]  ← Recalculated
  App picker: Shows 1 app ❌ BUG
```

### After Fix:

```
Initial Load:
  meta.app_ids: [23 apps]
  meta.all_accessible_app_ids: [23 apps]
  availableApps: [23 apps]
  App picker: Shows 23 apps ✅

After Auto-Selection:
  meta.app_ids: [1 app]  ← Queried apps
  meta.all_accessible_app_ids: [23 apps]  ← Always full list
  availableApps: [23 apps]  ← Uses all_accessible_app_ids
  App picker: Shows 23 apps ✅ FIXED
```

---

## 🎯 Implementation Plan

### Phase 1: Update Edge Function Response

**File:** `supabase/functions/bigquery-aso-data/index.ts`

**Changes at line 496-519:**

```typescript
meta: {
  // [RESPONSE IDENTITY]
  request_id: requestId,
  timestamp: new Date().toISOString(),

  // [DATA CHARACTERISTICS]
  data_source: 'bigquery',
  row_count: rows.length,

  // [APP SCOPE] - Split into two fields
  app_ids: appIdsForQuery,  // Apps queried in BigQuery (filtered)
  all_accessible_app_ids: allowedAppIds,  // All apps user has access to (full list)
  app_count: appIdsForQuery.length,  // Number of apps queried
  total_accessible_apps: allowedAppIds.length,  // Total apps available

  // [QUERY PERFORMANCE]
  query_duration_ms: Math.round(performance.now() - startTime),

  // [ORGANIZATION CONTEXT]
  org_id: resolvedOrgId,

  // [DISCOVERY METADATA]
  discovery_method: scopeSource,
  discovered_apps: appIdsForQuery.length,

  // [AVAILABLE DIMENSIONS] - For UI pickers
  available_traffic_sources: availableTrafficSources,
},
```

### Phase 2: Update Frontend

**File:** `src/pages/ReportingDashboardV2.tsx`

**Changes at lines 93-109:**

```typescript
// ✅ EXTRACT AVAILABLE APPS: Get unique app IDs from response
const availableApps = useMemo(() => {
  // Priority 1: Use all_accessible_app_ids (always contains full list)
  if (data?.meta?.all_accessible_app_ids) {
    console.log('📱 [DASHBOARD-V2] Using all_accessible_app_ids:', data.meta.all_accessible_app_ids.length);
    return data.meta.all_accessible_app_ids.map(appId => ({
      app_id: appId,
      app_name: appId
    }));
  }

  // Priority 2: Fallback to app_ids for backward compatibility
  if (data?.meta?.app_ids) {
    console.log('📱 [DASHBOARD-V2] Fallback to app_ids:', data.meta.app_ids.length);
    return data.meta.app_ids.map(appId => ({
      app_id: appId,
      app_name: appId
    }));
  }

  // Priority 3: Extract unique app IDs from raw data
  if (data?.rawData) {
    const uniqueAppIds = Array.from(new Set(data.rawData.map(row => row.app_id)));
    console.log('📱 [DASHBOARD-V2] Extracted from raw data:', uniqueAppIds.length);
    return uniqueAppIds.map(appId => ({
      app_id: appId,
      app_name: appId
    }));
  }

  return [];
}, [data?.meta?.all_accessible_app_ids, data?.meta?.app_ids, data?.rawData]);
```

---

## 🧪 Testing Plan

### Test 1: Initial Load
1. Clear browser cache
2. Login as `cli@yodelmobile.com`
3. Navigate to `/dashboard-v2`
4. **Expected:** App picker shows 23 apps
5. **Verify:** Console shows `Using all_accessible_app_ids: 23`

### Test 2: Auto-Selection
1. After initial load, first app auto-selected
2. Dashboard re-queries with selected app
3. **Expected:** App picker STILL shows 23 apps
4. **Verify:** Console shows `Using all_accessible_app_ids: 23`

### Test 3: Manual Selection
1. Open app picker
2. Select a different app
3. **Expected:** App picker shows 23 apps
4. **Verify:** Data updates but picker doesn't change

### Test 4: Multi-Select
1. Select multiple apps
2. **Expected:** App picker shows 23 apps
3. **Verify:** All apps remain available

---

## 📋 Edge Function Logs Analysis

Looking at the provided logs:

### Initial Request (Working):
```
[bigquery-aso-data][5733810c-...] Incoming request {
  requestedOrgId: "7cccba3f...",
  requestedAppCount: 0  ← No app selected
}

[ACCESS] App access validated {
  organizations_queried: 3,
  is_agency: true,
  requested_apps: 0,
  allowed_apps: 23,  ✅ Correct!
  apps: [23 items]   ✅ All 23 apps
}

[BIGQUERY] Executing query {
  appCount: 23  ✅ Queries all 23 apps
}
```

### After Auto-Selection (Bug Manifest):
```
[bigquery-aso-data][301ab077-...] Incoming request {
  requestedOrgId: "7cccba3f...",
  requestedAppCount: 1  ← One app selected
}

[ACCESS] App access validated {
  organizations_queried: 3,
  is_agency: true,
  requested_apps: 1,  ← Frontend requested 1 app
  allowed_apps: 23,  ✅ Still has access to all 23!
  apps: [23 items]   ✅ All 23 apps still available
}

[BIGQUERY] Executing query {
  appCount: 1  ← Only queries the selected app
}
```

**The Edge Function is working correctly!** It still tracks all 23 apps in `allowedAppIds`. The bug is that it only returns `appIdsForQuery` in `meta.app_ids`, not the full `allowedAppIds`.

---

## 🎉 Summary

### Root Cause:
**Single Responsibility Principle Violation**

The `meta.app_ids` field serves two purposes:
1. Query scope (which apps were queried)
2. UI picker (which apps are available)

When the query scope narrows (user selects specific apps), the UI picker incorrectly narrows too.

### The Fix:
**Separate Concerns**

- `meta.app_ids`: Apps that were queried (can change)
- `meta.all_accessible_app_ids`: Apps user has access to (always full list)

### Impact:
- ✅ App picker will always show all 23 apps
- ✅ User can select any app even after filtering
- ✅ Backward compatible (fallback to `app_ids` if new field not available)

### Confidence Level: 🔥 **VERY HIGH**

This is a straightforward architectural fix. The backend already has all the data (`allowedAppIds`), we just need to include it in the response.

---

**Created:** November 8, 2025
**Status:** 🔍 READY FOR IMPLEMENTATION
**Next Action:** Implement the two-phase fix (Edge Function + Frontend)
