# App Picker Single App Bug - Fix Complete ✅

**Date:** November 8, 2025
**Status:** 🎉 **FIX DEPLOYED - READY FOR TESTING**

---

## ✅ What Was Fixed

### The Bug:
App picker showed only 1 app instead of 23 after auto-selection.

### Root Cause:
The `meta.app_ids` field served two purposes:
1. **Data processing:** Which apps were queried in BigQuery (changes based on user selection)
2. **UI picker:** Which apps are available (should always be all 23)

When the user selected an app, `meta.app_ids` changed to contain only that app, causing the UI picker to recalculate and show only 1 app.

### The Fix:
Separated concerns by adding a new field:
- `meta.app_ids` - Apps that were queried (can change)
- `meta.all_accessible_app_ids` - ALL apps user has access to (always 23)

---

## 📝 Changes Made

### 1. Edge Function Update

**File:** `supabase/functions/bigquery-aso-data/index.ts`

**Added two new fields to response metadata (lines 519-520):**

```typescript
meta: {
  // ... existing fields ...

  // [AVAILABLE DIMENSIONS] - For UI pickers
  available_traffic_sources: availableTrafficSources,
  all_accessible_app_ids: allowedAppIds, // All apps user has access to (full list for UI picker)
  total_accessible_apps: allowedAppIds.length, // Total number of accessible apps
}
```

### 2. Frontend Update

**File:** `src/pages/ReportingDashboardV2.tsx`

**Updated app extraction logic with priority fallback (lines 93-123):**

```typescript
const availableApps = useMemo(() => {
  // Priority 1: Use all_accessible_app_ids (always contains full list)
  if (data?.meta?.all_accessible_app_ids) {
    return data.meta.all_accessible_app_ids.map(appId => ({
      app_id: appId,
      app_name: appId
    }));
  }

  // Priority 2: Fallback to app_ids for backward compatibility
  // Priority 3: Extract from raw data
  // ...
}, [data?.meta?.all_accessible_app_ids, data?.meta?.app_ids, data?.rawData]);
```

---

## 🎯 Expected Behavior Now

### After Auto-Selection (The Bug Scenario):
```
1. First app auto-selected
2. Dashboard queries with selected app
3. Edge Function returns:
   - meta.app_ids: [1 app] (queried app)
   - meta.all_accessible_app_ids: [23 apps] ← STILL ALL APPS
4. Frontend: availableApps = 23 apps (uses all_accessible_app_ids)
5. App picker shows: 23 apps ✅ FIXED!
```

---

## 🧪 Testing Instructions

### Test the Fix:
1. Clear browser cache (Cmd+Shift+R)
2. Login as `cli@yodelmobile.com`
3. Navigate to `/dashboard-v2`
4. **Expected:** App picker shows 23 apps
5. **Verify in console:** `Using all_accessible_app_ids: 23`
6. After auto-selection: Picker still shows 23 apps ✅

### Console Logs to Check:
```
✅ Expected:
📱 [DASHBOARD-V2] Using all_accessible_app_ids: 23

❌ Should NOT see:
📱 [DASHBOARD-V2] Fallback to app_ids: 1
```

---

## 🎉 Summary

**What Was Fixed:**
- App picker now always shows all 23 accessible apps
- Added `all_accessible_app_ids` field to Edge Function response
- Updated frontend to use new field with fallback logic

**Status:** ✅ **DEPLOYED**

**Next:** Test in UI to confirm all 23 apps visible in picker

---

**Created:** November 8, 2025
**Deployed:** Edge Function + Frontend updates
**Ready for:** User testing
