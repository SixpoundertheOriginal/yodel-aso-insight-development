# App Picker Showing Demo Apps - Root Cause Analysis

**Date:** November 8, 2025
**Status:** 🔍 **ROOT CAUSE IDENTIFIED - ANALYZING SOLUTION**

---

## 📊 Current Situation

**org_app_access table has 23 apps:**
- 8 real apps (numeric IDs like `1000928831`)
- 15 demo/test apps (`Client_One`, `DemoApp_*`, `TestFlight`, etc.)

**BigQuery has data for only ~7 apps**

**App picker now shows:** All 23 apps (including 15 demo apps)

**User wants:** Only the 7-8 apps with actual BigQuery data

---

## 🔍 What Changed and Why

### Before RLS Fixes (Accidentally Correct):

```
1. org_app_access table RLS broken
   ↓
2. Edge Function couldn't read org_app_access (silent filtering)
   ↓
3. allowedAppIds = [] (empty or very limited)
   ↓
4. Edge Function returns meta.app_ids = []
   ↓
5. Frontend Priority 3 fallback: Extract apps from rawData
   ↓
6. rawData only contains apps with BigQuery data (7 apps)
   ↓
7. App picker shows: 7 apps ✅ (accidentally correct)
```

**The broken RLS was accidentally hiding the demo apps!**

### After RLS Fixes (Technically Correct but Wrong Result):

```
1. org_app_access table RLS fixed ✅
   ↓
2. Edge Function reads all 23 apps from org_app_access ✅
   ↓
3. allowedAppIds = [23 apps] ✅
   ↓
4. Edge Function returns all_accessible_app_ids = [23 apps] ✅
   ↓
5. Frontend Priority 1: Use all_accessible_app_ids
   ↓
6. App picker shows: 23 apps (including 15 demo apps) ❌
```

**The RLS fix revealed the underlying data quality issue!**

---

## 🎯 The Real Problem

**Data Quality Issue in org_app_access Table:**

The `org_app_access` table has 15 demo/legacy apps that shouldn't be there:

```
Demo Apps (15):
  - App_Store_Connect
  - Client_One, Client_Two, ..., Client_Seven (7 apps)
  - DemoApp_ProductivitySuite
  - DemoApp_SocialNetwork
  - DemoApp_EcommerceApp
  - DemoApp_HealthFitness
  - DemoApp_EntertainmentHub
  - Mixbook
  - TestFlight

Real Apps (8):
  - 1000928831
  - 1011928031
  - 1011929871
  - 102228831
  - 2311928831
  - 839292831
  - 9080004421
  - 9082344213
```

---

## 🔧 Solution Options

### Option 1: Clean Up org_app_access Table (Recommended)

**Remove demo apps from database:**

```sql
DELETE FROM org_app_access
WHERE organization_id = 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f'
  AND app_id IN (
    'App_Store_Connect',
    'Client_One', 'Client_Two', 'Client_Three', 'Client_Four',
    'Client_Five', 'Client_Six', 'Client_Seven',
    'DemoApp_ProductivitySuite',
    'DemoApp_SocialNetwork',
    'DemoApp_EcommerceApp',
    'DemoApp_HealthFitness',
    'DemoApp_EntertainmentHub',
    'Mixbook',
    'TestFlight'
  );
```

**Pros:**
- ✅ Clean data source (single source of truth)
- ✅ No filtering logic needed
- ✅ Works across entire application
- ✅ Permanent fix

**Cons:**
- ⚠️ Need to verify these apps aren't used elsewhere
- ⚠️ Requires database migration

### Option 2: Filter in Edge Function

**Add logic to exclude demo apps in Edge Function:**

```typescript
// Filter out demo/test apps
const demoAppPatterns = [
  'Client_',
  'DemoApp_',
  'TestFlight',
  'App_Store_Connect',
  'Mixbook'
];

const filteredAllowedAppIds = allowedAppIds.filter(appId => 
  !demoAppPatterns.some(pattern => appId.startsWith(pattern))
);

// Use filtered list in response
meta: {
  all_accessible_app_ids: filteredAllowedAppIds,
  total_accessible_apps: filteredAllowedAppIds.length,
}
```

**Pros:**
- ✅ Quick fix, no database changes
- ✅ Can be deployed immediately

**Cons:**
- ❌ Filtering logic scattered (not DRY)
- ❌ Pattern matching fragile (what if app IDs change?)
- ❌ Doesn't fix underlying data issue

### Option 3: Filter Only Apps with BigQuery Data

**Return only apps that have actual data:**

```typescript
// After querying BigQuery, get unique app IDs from results
const appsWithData = Array.from(
  new Set(rows.map(row => row.app_id))
);

// Filter allowed apps to only those with data
const appsWithDataInAllowed = allowedAppIds.filter(appId =>
  appsWithData.includes(appId)
);

meta: {
  all_accessible_app_ids: appsWithDataInAllowed,
  total_accessible_apps: appsWithDataInAllowed.length,
}
```

**Pros:**
- ✅ Dynamic (always accurate)
- ✅ No hardcoded patterns
- ✅ Self-healing (as data changes)

**Cons:**
- ❌ Initial load problem (no apps selected = query all 23 = might show 0)
- ❌ Circular dependency (need to query to know which apps to show)
- ❌ Won't work for initial picker population

### Option 4: Add is_demo Flag to org_app_access

**Add column to mark demo apps:**

```sql
ALTER TABLE org_app_access
ADD COLUMN is_demo BOOLEAN DEFAULT FALSE;

UPDATE org_app_access
SET is_demo = TRUE
WHERE app_id IN ('Client_One', 'DemoApp_*', ...);
```

**Filter in Edge Function:**

```typescript
const { data: accessData } = await supabaseClient
  .from('org_app_access')
  .select('app_id, is_demo')
  .in('organization_id', organizationsToQuery)
  .is('detached_at', null)
  .eq('is_demo', false);  // Filter out demo apps
```

**Pros:**
- ✅ Flexible (can toggle per app)
- ✅ Clear intent (explicit flag)
- ✅ Queryable (can filter in SQL)

**Cons:**
- ⚠️ Requires schema change
- ⚠️ Requires data migration
- ⚠️ More complex than just deleting

---

## 🎯 Recommended Approach

**Option 1: Clean Up org_app_access Table**

**Why:**
1. Demo apps serve no production purpose
2. Clean data is better than filtered data
3. Permanent solution
4. No ongoing maintenance

**Implementation:**
1. Verify demo apps aren't used in other features
2. Create migration to delete demo app records
3. Validate only real apps remain
4. Test app picker shows correct apps

---

## 📋 Demo Apps to Remove

```
Client 1 (dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f):
  15 demo apps to remove:
  - App_Store_Connect
  - Client_One
  - Client_Two
  - Client_Three
  - Client_Four
  - Client_Five
  - Client_Six
  - Client_Seven
  - DemoApp_ProductivitySuite
  - DemoApp_SocialNetwork
  - DemoApp_EcommerceApp
  - DemoApp_HealthFitness
  - DemoApp_EntertainmentHub
  - Mixbook
  - TestFlight

After cleanup:
  8 real apps will remain:
  - 1000928831
  - 1011928031
  - 1011929871
  - 102228831
  - 2311928831
  - 839292831
  - 9080004421
  - 9082344213

But user says only 7 have BigQuery data, so we need to identify which one doesn't have data.
```

---

## 🔍 Next Steps

1. **Identify which of the 8 apps have BigQuery data**
   - Check BigQuery for each app
   - Determine which one to remove (if any)

2. **Verify demo apps aren't used elsewhere**
   - Check if any other features reference these apps
   - Check if other orgs use them

3. **Create cleanup migration**
   - Delete demo app records from org_app_access
   - Keep only apps with actual BigQuery data

4. **Test after cleanup**
   - App picker should show only real apps
   - All apps should have data

---

**Created:** November 8, 2025
**Status:** 🔍 AWAITING DECISION
**Recommendation:** Option 1 - Clean up org_app_access table
