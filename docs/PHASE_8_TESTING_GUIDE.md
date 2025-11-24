# Phase 8: Multi-Market System Testing Guide

**Date**: 2025-01-24
**Status**: Ready for Testing
**Purpose**: Comprehensive test plan for multi-market monitoring system

## Overview

This document provides a complete testing guide for the multi-market monitoring system. It includes database migration verification, UI testing procedures, and automated test scripts.

## Prerequisites

Before testing, ensure:

1. ✅ **Database Migration Applied**:
   ```bash
   # Apply the multi-market migration
   supabase db push

   # Or manually run the migration file:
   # supabase/migrations/20250124200000_create_multi_market_support.sql
   ```

2. ✅ **Environment Variables Set**:
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   ```

3. ✅ **Development Server Running**:
   ```bash
   npm run dev
   ```

---

## Part 1: Database Schema Verification

### Test 1.1: Verify monitored_app_markets Table

```sql
-- Check table exists
SELECT * FROM public.monitored_app_markets LIMIT 1;

-- Expected: Table exists with columns:
-- id, monitored_app_id, organization_id, market_code, title, subtitle,
-- description, keywords, price_amount, price_currency, is_active,
-- is_available, last_fetched_at, created_at, updated_at
```

**✅ Pass Criteria**: Query returns columns (may be 0 rows)
**❌ Fail**: "relation does not exist" error

### Test 1.2: Verify UNIQUE Constraint

```sql
-- Try to insert duplicate market (should fail)
INSERT INTO public.monitored_app_markets (
  monitored_app_id,
  organization_id,
  market_code,
  title,
  is_active
) VALUES (
  'same-app-id',
  'same-org-id',
  'gb',
  'Test App',
  true
);

-- Insert again with same values (should fail)
INSERT INTO public.monitored_app_markets (
  monitored_app_id,
  organization_id,
  market_code,
  title,
  is_active
) VALUES (
  'same-app-id',
  'same-org-id',
  'gb',  -- Same market!
  'Test App',
  true
);

-- Expected: duplicate key value violates unique constraint
```

**✅ Pass Criteria**: Second insert fails with "unique constraint" error
**❌ Fail**: Second insert succeeds (duplicate allowed)

### Test 1.3: Verify CHECK Constraint

```sql
-- Try to insert invalid market code (should fail)
INSERT INTO public.monitored_app_markets (
  monitored_app_id,
  organization_id,
  market_code,
  title,
  is_active
) VALUES (
  'test-app',
  'test-org',
  'xx',  -- Invalid market code!
  'Test App',
  true
);

-- Expected: new row violates check constraint
```

**✅ Pass Criteria**: Insert fails with "check constraint" error
**❌ Fail**: Insert succeeds (invalid code allowed)

### Test 1.4: Verify CASCADE Relationship

```sql
-- Check aso_audit_snapshots has FK column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'aso_audit_snapshots'
  AND column_name = 'monitored_app_market_id';

-- Expected: monitored_app_market_id | uuid
```

**✅ Pass Criteria**: Column exists with uuid type
**❌ Fail**: Column doesn't exist

### Test 1.5: Verify Migration Data

```sql
-- Check if existing apps were migrated
SELECT
  ma.app_name,
  COUNT(mam.id) as market_count,
  ARRAY_AGG(mam.market_code) as markets
FROM public.monitored_apps ma
LEFT JOIN public.monitored_app_markets mam ON ma.id = mam.monitored_app_id
WHERE mam.id IS NOT NULL
GROUP BY ma.app_name
ORDER BY ma.app_name;

-- Expected: Each existing app has at least 1 market (from migration)
```

**✅ Pass Criteria**: Each app has ≥1 market
**❌ Fail**: Apps exist with 0 markets

---

## Part 2: UI Testing - Add Market Flow

### Test 2.1: Navigate to Apps Page

1. Open browser: `http://localhost:5173/apps`
2. Sign in if needed
3. Verify apps list loads

**✅ Pass**: Apps page displays with monitored apps
**❌ Fail**: Error or blank page

### Test 2.2: Open Add Market Modal

1. Click `[•••]` menu on any app card
2. Select "🌍 Add Market"
3. Verify modal opens

**Expected**:
```
┌─────────────────────────────────────┐
│ Add Market - [App Name]             │
│ Add a new market to monitor...      │
├─────────────────────────────────────┤
│ Currently monitoring (1):           │
│ ✅ 🇬🇧 United Kingdom               │
│                                     │
│ Select new market:                  │
│ [Choose a market to add...    ▼]   │
│                                     │
│ ⚠️  Fresh metadata fetch: This will│
│    fetch the latest app data from  │
│    the [Market] App Store...       │
│                                     │
│ [Cancel] [Add Market]               │
└─────────────────────────────────────┘
```

**✅ Pass**: Modal opens with current markets shown
**❌ Fail**: Modal doesn't open or shows errors

### Test 2.3: Select and Add Market

1. Click market selector dropdown
2. Verify only unavailable markets shown (not already added)
3. Select "🇺🇸 United States"
4. Verify warning message updates to mention US App Store
5. Click "Add United States" button
6. Wait for completion

**Expected Console Logs**:
```
[useMarketManagement] Adding market us to app [app-id]
[useMarketManagement] Fetching metadata for [App] in US
[APPSTORE-INTEGRATION-V2] Searching via Phase A adapters...
✅ [useMarketManagement] Market US added successfully
[useMarketManagement] Warming cache for market US
[MarketCache] Warming cache for: [app-id] (us)
[MarketCache] Cache warmed successfully
```

**Expected UI**:
- Toast: "Market added successfully - 🇺🇸 United States is now being monitored"
- Modal closes
- App card updates to show: `🇬🇧 GB 🇺🇸 US`

**✅ Pass**: Market added, cache warmed, badge appears
**❌ Fail**: Error, no cache warming, or badge doesn't appear

### Test 2.4: Verify Market in Database

```sql
SELECT
  market_code,
  title,
  is_active,
  last_fetched_at
FROM public.monitored_app_markets
WHERE monitored_app_id = '[app-id]'
ORDER BY market_code;

-- Expected: Shows both gb and us markets
```

**✅ Pass**: US market entry exists with recent `last_fetched_at`
**❌ Fail**: Market entry missing or `last_fetched_at` is null

### Test 2.5: Verify Cache Entry

```sql
SELECT
  app_id,
  locale,
  title,
  fetched_at,
  version_hash
FROM public.app_metadata_cache
WHERE app_id = '[app-store-id]'
  AND locale = 'us'
ORDER BY fetched_at DESC
LIMIT 1;

-- Expected: Cache entry exists with recent fetched_at
```

**✅ Pass**: Cache entry exists (< 1 minute old)
**❌ Fail**: No cache entry found

### Test 2.6: Test Duplicate Prevention

1. Open Add Market modal again
2. Verify US is NOT in the dropdown (already added)
3. Try to add all 15 markets
4. When all added, verify message: "All 15 supported markets are already being monitored"

**✅ Pass**: Duplicate prevention works, all markets can be added
**❌ Fail**: Can add duplicates or error after 15 markets

---

## Part 3: UI Testing - Remove Market Flow

### Test 3.1: Open Remove Market Modal

1. Click `[•••]` menu on app with multiple markets
2. Select "🗑 Remove Market"
3. Verify modal opens

**Expected**:
```
┌─────────────────────────────────────┐
│ 🗑 Remove Markets - [App Name]      │
│ Remove markets from [App Name]      │
├─────────────────────────────────────┤
│ ⚠️  WARNING: Removing a market will │
│    permanently delete all audit     │
│    snapshots and historical data... │
│                                     │
│ Select markets to remove (2 total):│
│ ☐ 🇬🇧 United Kingdom  [42 audits]  │
│ ☐ 🇺🇸 United States   [38 audits]  │
│                                     │
│ [Cancel] [🗑 Remove]                │
└─────────────────────────────────────┘
```

**✅ Pass**: Modal opens with warning and market list
**❌ Fail**: Modal doesn't open or missing warnings

### Test 3.2: Test Last Market Protection

1. Check all markets (select all)
2. Verify warning appears: "Cannot remove all markets: Apps must have at least one market"
3. Verify "Remove" button is disabled
4. Uncheck one market
5. Verify button becomes enabled

**✅ Pass**: Cannot remove all markets, button disabled
**❌ Fail**: Can remove all markets or button always enabled

### Test 3.3: Remove a Market

1. Select "🇺🇸 United States" checkbox
2. Verify deletion impact summary updates:
   ```
   Deletion impact:
   • 1 market will be removed
   • [N] audit snapshots will be permanently deleted
   • All historical data for these markets will be lost
   ```
3. Check confirmation checkbox: "I understand that this action is permanent..."
4. Click "🗑 Remove (1)" button
5. Wait for completion

**Expected Console Logs**:
```
[useMarketManagement] Removing market us from app [app-id]
✅ [useMarketManagement] Market US removed successfully
[useMarketManagement] Invalidating cache for market US
[MarketCache] Invalidating cache: [app-id] (us)
[MarketCache] Cache invalidated successfully
```

**Expected UI**:
- Toast: "Markets removed - Successfully removed 1 market"
- Modal closes
- App card updates: `🇬🇧 GB` (US badge gone)

**✅ Pass**: Market removed, cache invalidated, badge disappears
**❌ Fail**: Error, cache remains, or badge still shows

### Test 3.4: Verify CASCADE Deletion

```sql
-- Check market is deleted
SELECT * FROM public.monitored_app_markets
WHERE monitored_app_id = '[app-id]'
  AND market_code = 'us';

-- Expected: 0 rows

-- Check audit snapshots are deleted
SELECT COUNT(*) FROM public.aso_audit_snapshots
WHERE monitored_app_market_id = '[us-market-id]';

-- Expected: 0 rows (CASCADE worked)
```

**✅ Pass**: Market deleted, audit snapshots deleted
**❌ Fail**: Market remains or orphaned snapshots exist

### Test 3.5: Verify Cache Deletion

```sql
SELECT * FROM public.app_metadata_cache
WHERE app_id = '[app-store-id]'
  AND locale = 'us';

-- Expected: 0 rows
```

**✅ Pass**: Cache entry deleted
**❌ Fail**: Cache entry still exists (orphaned)

---

## Part 4: UI Testing - Market Switcher

### Test 4.1: Navigate to Monitored App Audit

1. Go to `/apps` page
2. Click an app with multiple markets
3. Navigate to audit view (if implemented)
4. OR use monitored mode: Add `?mode=monitored&appId=[id]` to URL

**Expected**: Audit view loads in monitored mode

**✅ Pass**: Audit view opens
**❌ Fail**: Error or blank page

### Test 4.2: Verify Market Switcher Appears

1. Check audit view header
2. Verify market switcher is visible: `🌍 [🇬🇧 United Kingdom ▼] 2 markets`

**Expected Placement**:
```
Header:
🎯 [App Name]  [Monitored]
Education • 🌍 [🇬🇧 United Kingdom ▼] 2 markets
[Re-run Audit] [Export PDF]
```

**✅ Pass**: Switcher appears next to other controls
**❌ Fail**: Switcher missing or wrong position

### Test 4.3: Switch Between Markets

1. Click market switcher dropdown
2. Verify all app's markets shown:
   ```
   🇬🇧 United Kingdom  ← Selected
   🇺🇸 United States
   ```
3. Click "🇺🇸 United States"
4. Wait for data to reload

**Expected Console Logs**:
```
[useMonitoredAudit] Fetching cached audit for: [app-id]
[useMonitoredAudit] Normalized key for cache lookup: { app_id, platform, locale: 'us' }
[useMonitoredAudit] ✓ Metadata cache found
[useMonitoredAudit] ✓ Bible snapshot found (score: [N])
```

**Expected UI**:
- Switcher updates: `🌍 [🇺🇸 United States ▼]`
- Audit data refreshes (may show different scores for US market)
- URL updates (if implemented): `?market=us`

**✅ Pass**: Switcher updates, audit data loads for US market
**❌ Fail**: No data change or error

### Test 4.4: Verify Session Storage

1. Switch to US market
2. Open browser DevTools → Application → Session Storage
3. Check for key: `audit-market-[app-id]`
4. Verify value: `us`
5. Refresh page
6. Verify US market still selected

**✅ Pass**: Session storage persists, selection maintained on refresh
**❌ Fail**: Storage not set or selection resets

### Test 4.5: Test Single Market Behavior

1. Navigate to app with only 1 market
2. Verify market switcher does NOT appear
3. Audit view works normally without switcher

**✅ Pass**: Switcher hidden for single-market apps
**❌ Fail**: Switcher shows for 1 market (unnecessary UI)

---

## Part 5: Performance Testing

### Test 5.1: Cache Hit Performance

1. Open app audit with cached market
2. Check console for cache hit message
3. Measure page load time

**Expected Console**:
```
[MarketCache] Cache HIT (age: 120 minutes)
```

**✅ Pass**: Cache hit, fast load (<1s)
**❌ Fail**: Cache miss or slow load (>3s)

### Test 5.2: Market Switch Performance

1. Open audit with 3+ markets
2. Switch between markets rapidly
3. Verify each switch is instant

**Expected**:
- React Query cache provides instant switch
- No loading spinner between cached markets
- First-time market may show brief loading

**✅ Pass**: Instant switching between cached markets
**❌ Fail**: Loading spinner every switch (cache not working)

### Test 5.3: Add Market Performance

1. Time the full "Add Market" flow
2. Measure from button click to badge appearing

**Expected Duration**: 2-5 seconds
- App Store API fetch: 1-3s
- Database insert: <100ms
- Cache warming: <100ms
- UI update: <100ms

**✅ Pass**: Complete within 5 seconds
**❌ Fail**: Takes >10 seconds (API timeout?)

---

## Part 6: Edge Cases

### Test 6.1: Network Failure

1. Disconnect internet
2. Try to add market
3. Verify graceful error handling

**Expected**: Toast notification: "Failed to add market: Network error"

**✅ Pass**: User-friendly error message
**❌ Fail**: Silent failure or confusing error

### Test 6.2: Invalid Market Code

1. Manually insert invalid market via API
2. Verify CHECK constraint prevents it

**Already tested in Part 1.3**

### Test 6.3: Stale Cache Detection

1. Manually update cache `fetched_at` to 25 hours ago:
   ```sql
   UPDATE app_metadata_cache
   SET fetched_at = NOW() - INTERVAL '25 hours'
   WHERE app_id = '[id]' AND locale = 'gb';
   ```
2. Fetch cache via service
3. Verify marked as stale

**Expected Console**:
```
[MarketCache] Cache STALE (age: 1500 minutes)
```

**✅ Pass**: Stale detection works
**❌ Fail**: Cache marked as fresh

### Test 6.4: Concurrent Market Addition

1. Open Add Market modal in 2 browser tabs
2. Add same market in both tabs simultaneously
3. Verify one succeeds, other fails gracefully

**Expected**: Second tab shows: "Market GB is already being monitored"

**✅ Pass**: UNIQUE constraint prevents duplicate, clear error
**❌ Fail**: Both succeed (duplicate markets) or crash

---

## Part 7: Automated Test Suite

### Run Automated Tests

```bash
# Ensure database is ready
npx tsx scripts/tests/test_multi_market_system.ts
```

**Expected Output**:
```
🚀 Multi-Market System End-to-End Test Suite
============================================================

🧪 TEST: Database Schema Validation
  ✅ monitored_app_markets table exists
  ✅ aso_audit_snapshots has monitored_app_market_id FK
  ✅ app_metadata_cache table exists with locale field
  ✅ Test passed (156ms)

🧪 TEST: Create Test App with Markets
  ✅ Created test app: Duolingo (Test)
  ✅ Added market: GB
  ✅ Added market: US
  ✅ Added market: DE
  ✅ Test passed (432ms)

...

📊 TEST SUMMARY
Total Tests: 9
✅ Passed: 9
❌ Failed: 0
⏱️  Total Duration: 2156ms

🎉 All tests passed!
```

**✅ Pass**: All 9 tests pass
**❌ Fail**: Any test fails (see failure details)

---

## Part 8: Data Integrity Checks

### Test 8.1: Orphaned Cache Check

```sql
-- Find cache entries with no corresponding market
SELECT amc.app_id, amc.locale, amc.title
FROM app_metadata_cache amc
LEFT JOIN monitored_app_markets mam
  ON amc.app_id = mam.monitored_app_id::text
  AND amc.locale = mam.market_code
WHERE mam.id IS NULL;

-- Expected: 0 rows (no orphans)
```

**✅ Pass**: 0 orphaned cache entries
**❌ Fail**: Orphaned entries found (cache cleanup failed)

### Test 8.2: Orphaned Audit Check

```sql
-- Find audit snapshots with no corresponding market
SELECT COUNT(*) as orphaned_audits
FROM aso_audit_snapshots
WHERE monitored_app_market_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM monitored_app_markets
    WHERE id = aso_audit_snapshots.monitored_app_market_id
  );

-- Expected: 0 rows (no orphans)
```

**✅ Pass**: 0 orphaned audit snapshots
**❌ Fail**: Orphaned snapshots found (CASCADE failed)

### Test 8.3: Market Count Consistency

```sql
-- Verify all monitored apps have at least 1 market
SELECT
  ma.app_name,
  COUNT(mam.id) as market_count
FROM monitored_apps ma
LEFT JOIN monitored_app_markets mam ON ma.id = mam.monitored_app_id
GROUP BY ma.app_name
HAVING COUNT(mam.id) = 0;

-- Expected: 0 rows (all apps have ≥1 market)
```

**✅ Pass**: All apps have markets
**❌ Fail**: Apps exist with 0 markets (data integrity issue)

---

## Test Results Checklist

Use this checklist to track testing progress:

### Database Schema (Part 1)
- [ ] 1.1 - monitored_app_markets table exists
- [ ] 1.2 - UNIQUE constraint works
- [ ] 1.3 - CHECK constraint works
- [ ] 1.4 - CASCADE relationship verified
- [ ] 1.5 - Migration data verified

### Add Market Flow (Part 2)
- [ ] 2.1 - Apps page loads
- [ ] 2.2 - Add Market modal opens
- [ ] 2.3 - Market added successfully
- [ ] 2.4 - Market in database
- [ ] 2.5 - Cache warmed
- [ ] 2.6 - Duplicate prevention works

### Remove Market Flow (Part 3)
- [ ] 3.1 - Remove Market modal opens
- [ ] 3.2 - Last market protection works
- [ ] 3.3 - Market removed successfully
- [ ] 3.4 - CASCADE deletion verified
- [ ] 3.5 - Cache invalidated

### Market Switcher (Part 4)
- [ ] 4.1 - Audit view opens
- [ ] 4.2 - Switcher appears
- [ ] 4.3 - Switching works
- [ ] 4.4 - Session storage persists
- [ ] 4.5 - Single market behavior

### Performance (Part 5)
- [ ] 5.1 - Cache hit performance
- [ ] 5.2 - Market switch performance
- [ ] 5.3 - Add market performance

### Edge Cases (Part 6)
- [ ] 6.1 - Network failure handling
- [ ] 6.2 - Invalid market code prevented
- [ ] 6.3 - Stale cache detection
- [ ] 6.4 - Concurrent addition handling

### Automated Tests (Part 7)
- [ ] All 9 automated tests pass

### Data Integrity (Part 8)
- [ ] 8.1 - No orphaned caches
- [ ] 8.2 - No orphaned audits
- [ ] 8.3 - Market count consistency

---

## Troubleshooting

### Issue: "relation does not exist"
**Solution**: Apply database migration:
```bash
supabase db push
```

### Issue: Cache not warming
**Solution**: Check console logs for errors. Verify `MarketCacheService.warmCacheForMarket()` is called.

### Issue: Market switcher not appearing
**Solution**: Verify:
1. Mode is 'monitored' (not 'live')
2. App has 2+ markets
3. `appMarkets` state is populated
4. Check React DevTools for component state

### Issue: CASCADE not deleting audits
**Solution**: Verify foreign key constraint:
```sql
SELECT
  conname,
  confdeltype
FROM pg_constraint
WHERE conname = 'aso_audit_snapshots_monitored_app_market_id_fkey';

-- Expected: confdeltype = 'c' (CASCADE)
```

---

## Conclusion

This comprehensive test guide ensures all aspects of the multi-market system are validated:
- ✅ Database schema and constraints
- ✅ UI flows (add, remove, switch)
- ✅ Cache lifecycle (warm, invalidate)
- ✅ Performance benchmarks
- ✅ Edge case handling
- ✅ Data integrity

Complete all tests before deploying to production.

**Status**: Ready for Testing
**Next Step**: Apply database migration and begin testing
