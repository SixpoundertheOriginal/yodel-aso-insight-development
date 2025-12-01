# Combo Ranking "Not Tracked" Issue - Fix Plan

**Issue:** When viewing an existing app (Inspire Wellness), the App Ranking column shows "Not Tracked" for all combos even though the app exists and has combo data.

**Date:** 2025-01-12
**Status:** Audit Complete - Fix Plan Ready

---

## 🔍 ROOT CAUSE ANALYSIS

### Issue Identified

The ranking feature is **querying the wrong table** and using the **wrong field name**.

### Data Flow Trace

1. **AppAuditHub** (monitored mode)
   ```typescript
   const cachedMetadata: ScrapedMetadata = {
     appId: monitoredApp.app_id,  // ❌ PROBLEM: app_id doesn't exist!
     ...
   }
   ```

2. **monitored_apps table** (actual schema)
   ```sql
   CREATE TABLE monitored_apps (
     app_store_id TEXT NOT NULL,  // ✅ This is the iTunes trackId
     app_name TEXT,
     ...
   )
   ```

3. **useComboRanking hook** (ranking lookup)
   ```typescript
   const { data: appData } = await supabase
     .from('apps')  // ❌ Wrong table!
     .eq('app_id', appId)  // ❌ Wrong field name!
   ```

### The Problems

**Problem 1: Wrong Field Name**
- `AppAuditHub` tries to access `monitoredApp.app_id`
- But `monitored_apps` table has `app_store_id` instead
- Result: `metadata.appId` is **undefined**

**Problem 2: Wrong Table**
- `useComboRanking` queries the `apps` table
- But monitored apps are in `monitored_apps` table
- These are **two separate systems**

**Problem 3: Missing Lookup Strategy**
- No fallback to check `monitored_apps` if `apps` lookup fails
- No unified way to find app regardless of source

---

## 📊 CURRENT STATE

### Table Structure

**monitored_apps table** (for review monitoring)
```sql
CREATE TABLE monitored_apps (
  id UUID PRIMARY KEY,
  organization_id UUID,
  app_store_id TEXT NOT NULL,  // iTunes trackId
  app_name TEXT,
  bundle_id TEXT,
  primary_country TEXT,
  ...
)
```

**apps table** (for ASC/BigQuery apps)
```sql
CREATE TABLE apps (
  id UUID PRIMARY KEY,
  organization_id UUID,
  app_id TEXT,  // Different field name!
  app_name TEXT,
  bundle_id TEXT,
  ...
)
```

**keywords table** (for ranking tracking)
```sql
CREATE TABLE keywords (
  id UUID PRIMARY KEY,
  organization_id UUID,
  app_id UUID,  // References apps.id
  keyword TEXT,
  keyword_type TEXT,  // 'single' | 'combo'
  ...
)
```

### Current Behavior

1. User views "Inspire Wellness" app in audit
2. AppAuditHub loads from `monitored_apps` table
3. Sets `metadata.appId = monitoredApp.app_id` (undefined!)
4. RankingCell tries to fetch with undefined appId
5. useComboRanking queries `apps` table with undefined
6. Query fails → shows "Not Tracked"

---

## 🎯 FIX STRATEGY

### Option A: Unified App Lookup (Recommended)

**Make the ranking system work with BOTH tables:**

1. Update `useComboRanking` to check both tables
2. Try `apps` table first (faster)
3. Fallback to `monitored_apps` if not found
4. Cache the lookup result

**Pros:**
- ✅ Works with both monitored apps AND ASC apps
- ✅ Future-proof (handles any app source)
- ✅ No data migration needed

**Cons:**
- Additional query if app not in `apps` table

### Option B: Fix Field Name (Quick Fix)

**Just fix the field name in AppAuditHub:**

```typescript
const cachedMetadata: ScrapedMetadata = {
  appId: monitoredApp.app_store_id,  // Use correct field
  ...
}
```

Then update `useComboRanking` to query `monitored_apps`:

```typescript
const { data: appData } = await supabase
  .from('monitored_apps')
  .eq('app_store_id', appId)
```

**Pros:**
- ✅ Quick and simple
- ✅ Works immediately

**Cons:**
- ❌ Only works for monitored apps
- ❌ Won't work for ASC/BigQuery apps
- ❌ Brittle (depends on source)

### Option C: Hybrid Approach (Best)

**Combine both fixes:**

1. Fix `AppAuditHub` to use correct field (`app_store_id`)
2. Update `useComboRanking` to check both tables with smart logic
3. Add debug logging to track which path is used

**Pros:**
- ✅ Works everywhere
- ✅ Graceful degradation
- ✅ Easy to debug

**Cons:**
- Slightly more code

---

## 🔧 IMPLEMENTATION PLAN (Option C - Recommended)

### Step 1: Fix AppAuditHub Field Name

**File:** `src/components/AppAudit/AppAuditHub.tsx`

**Change:**
```typescript
const cachedMetadata: ScrapedMetadata = {
  name: monitoredApp.app_name,
  appId: monitoredApp.app_store_id,  // ✅ FIX: Use app_store_id
  title: metadataCache?.title || monitoredApp.app_name,
  ...
}
```

**Impact:** Monitored apps will now pass correct appId

### Step 2: Update useComboRanking for Dual Table Support

**File:** `src/hooks/useComboRanking.ts`

**Current:**
```typescript
// Step 1: Get app UUID from appId
const { data: appData, error: appError } = await supabase
  .from('apps')
  .select('id, organization_id')
  .eq('app_id', appId)
  .eq('platform', 'ios')
  .single();

if (appError || !appData) {
  console.warn(`App ${appId} not found in database.`);
  setRanking(null);
  setIsLoading(false);
  return;
}
```

**New (with dual table support):**
```typescript
// Step 1: Get app UUID from appId - try both tables
let appData = null;
let organizationId = null;

// Try apps table first (ASC/BigQuery apps)
const { data: appsData } = await supabase
  .from('apps')
  .select('id, organization_id')
  .eq('app_id', appId)
  .eq('platform', 'ios')
  .maybeSingle();

if (appsData) {
  appData = appsData;
  organizationId = appsData.organization_id;
  console.log(`[useComboRanking] Found app in 'apps' table`);
} else {
  // Fallback: try monitored_apps table
  const { data: monitoredData } = await supabase
    .from('monitored_apps')
    .select('id, organization_id')
    .eq('app_store_id', appId)
    .maybeSingle();

  if (monitoredData) {
    appData = monitoredData;
    organizationId = monitoredData.organization_id;
    console.log(`[useComboRanking] Found app in 'monitored_apps' table`);
  }
}

if (!appData) {
  console.warn(`[useComboRanking] App ${appId} not found in any table.`);
  setRanking(null);
  setIsLoading(false);
  return;
}

const appUUID = appData.id;
```

**Impact:** Works with both monitored apps AND ASC apps

### Step 3: Add Debug Logging

Add console logs at key points to track data flow:

1. **AppAuditHub** - Log what appId is being set
2. **useComboRanking** - Log which table was used
3. **RankingCell** - Log when data is received

### Step 4: Update Check-Combo-Rankings Edge Function

**File:** `supabase/functions/check-combo-rankings/index.ts`

**Current:**
```typescript
const { data: appData, error: appError } = await supabase
  .from('apps')
  .select('id')
  .eq('app_id', appId)
  .eq('platform', platform)
  .single();
```

**New:**
```typescript
// Try both tables
let appData = null;

const { data: appsData } = await supabase
  .from('apps')
  .select('id')
  .eq('app_id', appId)
  .eq('platform', platform)
  .maybeSingle();

if (appsData) {
  appData = appsData;
} else {
  const { data: monitoredData } = await supabase
    .from('monitored_apps')
    .select('id')
    .eq('app_store_id', appId)
    .maybeSingle();

  if (monitoredData) {
    appData = monitoredData;
  }
}

if (!appData) {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'APP_NOT_FOUND',
        message: `App ${appId} not found. Please add to monitored apps first.`,
      },
    }),
    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

---

## ✅ TESTING PLAN

### Test Case 1: Monitored App (Inspire Wellness)

**Setup:**
- App exists in `monitored_apps` table
- Has app_store_id = "XXXX"

**Steps:**
1. Navigate to Inspire Wellness audit
2. Scroll to All Combos Table
3. Check App Ranking column

**Expected Result:**
- ✅ Shows "Checking..." then ranking or "Not Ranked"
- ✅ No "Not Tracked" errors
- ✅ Console shows: "Found app in 'monitored_apps' table"

### Test Case 2: ASC/BigQuery App

**Setup:**
- App exists in `apps` table
- Has app_id = "YYYY"

**Steps:**
1. Navigate to app audit
2. Scroll to All Combos Table
3. Check App Ranking column

**Expected Result:**
- ✅ Shows ranking data
- ✅ Console shows: "Found app in 'apps' table"

### Test Case 3: New App (Not in Either Table)

**Setup:**
- App doesn't exist in any table

**Steps:**
1. Run standalone audit for new app
2. Scroll to All Combos Table
3. Check App Ranking column

**Expected Result:**
- ✅ Shows "Not Tracked" badge
- ✅ Tooltip: "Add this app to tracked apps to enable ranking checks"
- ✅ No console errors

---

## 📝 IMPLEMENTATION CHECKLIST

### Phase 1: Fix Field Names
- [ ] Update `AppAuditHub.tsx` to use `app_store_id` instead of `app_id`
- [ ] Test that metadata.appId is now populated correctly
- [ ] Verify with console.log

### Phase 2: Update useComboRanking Hook
- [ ] Add dual table lookup logic
- [ ] Handle both `apps` and `monitored_apps` tables
- [ ] Add debug logging
- [ ] Test with monitored app
- [ ] Test with ASC app (if available)

### Phase 3: Update Edge Function
- [ ] Update `check-combo-rankings/index.ts` with dual table support
- [ ] Deploy edge function
- [ ] Test end-to-end ranking fetch

### Phase 4: Testing & Validation
- [ ] Test Inspire Wellness app (monitored)
- [ ] Verify rankings appear correctly
- [ ] Check console logs for correct table usage
- [ ] Test with multiple countries
- [ ] Verify caching works

### Phase 5: Documentation
- [ ] Update COMBO_RANKING_IMPLEMENTATION_COMPLETE.md
- [ ] Add troubleshooting section
- [ ] Document table differences

---

## 🚀 DEPLOYMENT PLAN

### Step 1: Frontend Changes
```bash
# Update files locally
git add src/components/AppAudit/AppAuditHub.tsx
git add src/hooks/useComboRanking.ts
git add src/components/AppAudit/KeywordComboWorkbench/RankingCell.tsx

# Build and test
npm run build

# Commit
git commit -m "Fix combo ranking for monitored apps"
```

### Step 2: Edge Function Update
```bash
# Deploy updated edge function
supabase functions deploy check-combo-rankings
```

### Step 3: Verification
1. Test in production with Inspire Wellness
2. Monitor console for errors
3. Check Supabase logs
4. Verify rankings appear

---

## 🎯 SUCCESS CRITERIA

✅ **Inspire Wellness app shows rankings** instead of "Not Tracked"
✅ **Console logs show correct table usage**
✅ **No errors in browser console**
✅ **Caching works (instant load on refresh)**
✅ **Works for both monitored apps AND ASC apps**

---

## 🐛 KNOWN LIMITATIONS

After this fix:
- Apps must be in `monitored_apps` OR `apps` table to show rankings
- Standalone audits (not saved) will still show "Not Tracked" (by design)
- First-time ranking checks take 2-3 seconds (expected)

---

## 📞 ROLLBACK PLAN

If issues occur:

1. **Revert frontend changes:**
   ```bash
   git revert HEAD
   npm run build
   ```

2. **Revert edge function:**
   ```bash
   git checkout main -- supabase/functions/check-combo-rankings/
   supabase functions deploy check-combo-rankings
   ```

3. **Clear browser cache** to remove stale code

---

**Ready to implement! 🔧**
