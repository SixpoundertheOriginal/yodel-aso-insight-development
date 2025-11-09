# Phase 0 Testing Guide - Days 1-3

## 🎯 What We're Testing

We've implemented:
1. ✅ `apps_metadata` table for unified App Store data
2. ✅ Non-blocking metadata persistence in search/SERP operations
3. ✅ `discover_keywords` operation endpoint

**Critical:** Reviews page MUST continue working unchanged.

---

## 📋 Step 1: Apply Database Migration

### Option A: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy/paste the contents of: `supabase/migrations/20251109120000_create_apps_metadata.sql`
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Verify success: Should see "Success. No rows returned"

### Option B: Via Supabase CLI (if installed locally)

```bash
cd /home/user/yodel-aso-insight-development
supabase db push
```

### Verify Migration Applied

Run this SQL in Supabase SQL Editor:

```sql
-- Check table exists
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_name = 'apps_metadata';

-- Expected: 1 row with table_name='apps_metadata'

-- Check column count
SELECT count(*) as column_count
FROM information_schema.columns
WHERE table_name = 'apps_metadata';

-- Expected: ~35 columns

-- Check indexes exist
SELECT indexname
FROM pg_indexes
WHERE tablename = 'apps_metadata';

-- Expected: 7-8 indexes including primary key

-- Check RLS is enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'apps_metadata';

-- Expected: relrowsecurity = true
```

---

## 📋 Step 2: Deploy Edge Function Changes

### Via Supabase Dashboard

1. Navigate to **Edge Functions** → `app-store-scraper`
2. The changes should auto-deploy when you push to main/production branch
3. Or manually deploy:
   ```bash
   supabase functions deploy app-store-scraper
   ```

### Verify Deployment

Check the edge function logs for any errors:
1. Go to **Edge Functions** → `app-store-scraper` → **Logs**
2. Look for recent deployments
3. Should see: "Function deployed successfully"

---

## 📋 Step 3: Test Reviews Page (CRITICAL)

### Manual Test via Browser

1. Navigate to: `http://localhost:5173/growth-accelerators/reviews` (or your dev URL)
2. Search for an app (e.g., "Instagram")
3. Click "Load Reviews"
4. **Expected Results:**
   - ✅ App appears in search results
   - ✅ Reviews load successfully
   - ✅ Sentiment analysis displays
   - ✅ Can add to monitored apps
   - ✅ Page load time < 2 seconds
   - ✅ No console errors

### Console Verification

Open browser DevTools → Console:
- Should see NO errors
- Should see metadata save logs: `"✅ Saved metadata for Instagram (389801252)"`

**❌ IF REVIEWS PAGE FAILS:**
- STOP immediately
- Rollback: Execute the rollback SQL from migration file
- Check edge function logs for errors

---

## 📋 Step 4: Test Edge Function Operations

### Test 1: App Search (with metadata persistence)

```bash
curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/app-store-scraper \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "op": "search",
    "searchTerm": "Instagram",
    "country": "us"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "results": [
    {
      "name": "Instagram",
      "appId": "389801252",
      "developer": "Instagram, Inc.",
      "rating": 4.5,
      ...
    }
  ]
}
```

**Database Verification:**

Wait 2 seconds, then check database:

```sql
SELECT app_store_id, app_name, developer_name, created_at
FROM apps_metadata
WHERE app_name ILIKE '%Instagram%'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:** Row(s) for Instagram and other search results

---

### Test 2: SERP Operation (with metadata persistence)

```bash
curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/app-store-scraper \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "op": "serp",
    "term": "photo editor",
    "cc": "us",
    "appId": "389801252"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "term": "photo editor",
  "country": "us",
  "rank": 5,
  "items": [
    { "rank": 1, "appId": "...", "name": "..." },
    ...
  ]
}
```

**Database Verification:**

```sql
SELECT COUNT(*) as saved_apps
FROM apps_metadata
WHERE created_at > NOW() - INTERVAL '1 minute';
```

**Expected:** 10+ new rows (top 10 from SERP)

---

### Test 3: Keyword Discovery Operation (NEW)

```bash
curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/app-store-scraper \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "op": "discover_keywords",
    "targetApp": {
      "name": "Instagram",
      "appId": "389801252",
      "category": "Photo & Video"
    },
    "seedKeywords": ["photo", "social"],
    "country": "us",
    "maxKeywords": 20
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "keywords": [
    {
      "keyword": "photo editor",
      "estimatedVolume": 50000,
      "difficulty": 85,
      "source": "semantic",
      "relevanceScore": 0.95
    },
    ...
  ],
  "count": 20,
  "message": "Discovered 20 relevant keywords"
}
```

---

## 📋 Step 5: Performance Validation

### Reviews Page Performance

1. Open DevTools → Network tab
2. Navigate to reviews page
3. Search for "Instagram"
4. Load reviews
5. Check metrics:
   - **Page Load:** < 2 seconds ✅
   - **API Response:** < 1 second ✅
   - **No failed requests** ✅

### Database Query Performance

```sql
-- Test metadata lookup speed
EXPLAIN ANALYZE
SELECT * FROM apps_metadata
WHERE app_store_id = '389801252';

-- Expected: < 10ms (should use index)

-- Test search performance
EXPLAIN ANALYZE
SELECT * FROM apps_metadata
WHERE to_tsvector('english', app_name || ' ' || developer_name) @@ to_tsquery('instagram');

-- Expected: < 50ms (should use GIN index)
```

---

## 📋 Step 6: Edge Function Logs Check

### Via Supabase Dashboard

1. Go to **Edge Functions** → `app-store-scraper` → **Logs**
2. Look for recent operations
3. **Should see:**
   - ✅ `"✅ Saved metadata for <app_name> (<app_id>)"`
   - ✅ `"✅ [requestId] KEYWORD DISCOVERY SUCCESS: X keywords found"`
   - ✅ `"✅ [requestId] PUBLIC SEARCH SUCCESS"`

4. **Should NOT see:**
   - ❌ `"Failed to save app metadata"` errors blocking operations
   - ❌ TypeScript compilation errors
   - ❌ Database connection errors

### Check for Non-Blocking Behavior

Search for apps that don't exist:

```bash
curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/app-store-scraper \
  -H "Content-Type: application/json" \
  -d '{
    "op": "search",
    "searchTerm": "nonexistentapp12345xyz",
    "country": "us"
  }'
```

**Expected:**
- API returns empty results successfully
- No database errors
- Operation completes (doesn't hang)

---

## ✅ Success Criteria - All Must Pass

### Critical (Must Pass to Continue)

- [ ] Reviews page loads and works normally
- [ ] Reviews can be fetched successfully
- [ ] No console errors on reviews page
- [ ] Page load time < 2 seconds
- [ ] Database migration applied successfully
- [ ] Edge function deployed without errors

### Important (Should Pass)

- [ ] Metadata saves to `apps_metadata` table
- [ ] Search operation returns results
- [ ] SERP operation returns rankings
- [ ] Keyword discovery returns keywords
- [ ] All operations complete within timeout
- [ ] Database queries use indexes (< 100ms)

### Nice to Have

- [ ] Edge function logs show successful saves
- [ ] Multiple searches populate database
- [ ] No TypeScript warnings in edge function

---

## ❌ Rollback Procedure (If Tests Fail)

### If Reviews Page Breaks

1. **Immediate:** Stop all testing
2. **Check logs:** Look for specific error
3. **Rollback database:**

```sql
-- Drop new table
DROP TABLE IF EXISTS public.apps_metadata CASCADE;

-- Drop functions
DROP TRIGGER IF EXISTS apps_metadata_updated_at ON public.apps_metadata;
DROP FUNCTION IF EXISTS public.update_apps_metadata_updated_at();
```

4. **Revert code:**

```bash
git checkout HEAD~2  # Revert last 2 commits
git push -f origin your-branch
```

5. **Redeploy edge function:**

Deploy the reverted version via Supabase dashboard

6. **Verify:** Test reviews page works again

### If Only Metadata Saves Fail (Non-Critical)

- Reviews page should still work (by design)
- Check database permissions
- Check RLS policies
- Check Supabase service role key

---

## 📊 Expected Results Summary

After successful testing:

1. **Database:**
   - `apps_metadata` table exists with 30+ columns
   - RLS enabled with proper policies
   - Indexes created for performance
   - Triggers functioning (auto-update)

2. **Edge Function:**
   - Search saves metadata asynchronously
   - SERP saves top 10 apps
   - Keyword discovery returns results
   - Reviews operation unchanged

3. **Performance:**
   - Reviews page < 2s load time
   - API responses < 1s
   - Database queries < 100ms
   - No blocking on saves

4. **Logs:**
   - Successful metadata saves logged
   - No error messages
   - Operations complete successfully

---

## 🚀 Next Steps After Testing

If all tests pass:

✅ **Phase 0 Days 1-3 VALIDATED**
→ Proceed to Days 4-5: Fix 9 broken services with `@ts-nocheck`

If tests fail:

❌ **Investigate and fix issues**
→ Use rollback procedure if necessary
→ Don't proceed until critical tests pass

---

**Testing Status:** ⏳ PENDING
**Started:** [Date]
**Completed:** [Date]
**Tested By:** [Name]
**Result:** [ ] PASS / [ ] FAIL
**Notes:** _________________________________________
