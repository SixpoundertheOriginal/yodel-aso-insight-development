# 🚀 Apply Migrations and Test - Quick Start Guide

**Estimated Time:** 15-20 minutes
**Prerequisites:** Supabase account access

---

## ✅ Step 1: Apply Database Migration (5 minutes)

### Method A: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click **"SQL Editor"** in left sidebar
   - Click **"New query"** button

3. **Copy Migration SQL**
   - Open: `supabase/migrations/20251109120000_create_apps_metadata.sql`
   - Copy entire contents (170 lines)

4. **Paste and Execute**
   - Paste SQL into editor
   - Click **"Run"** (or press Ctrl/Cmd + Enter)
   - Wait for completion (should take 1-2 seconds)

5. **Verify Success**
   - Should see: **"Success. No rows returned"** ✅
   - If you see errors, check the error message below

### Method B: Via Supabase CLI (If Installed)

```bash
cd /home/user/yodel-aso-insight-development
supabase db push
```

### ✅ Verification Query

Run this in SQL Editor to confirm table exists:

```sql
-- Check table exists
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'apps_metadata';

-- Expected: 1 row with table_name='apps_metadata', table_type='BASE TABLE'
```

**If you see 1 row:** ✅ Migration applied successfully!
**If you see 0 rows:** ❌ Migration failed - check errors above

---

## ✅ Step 2: Verify Table Structure (2 minutes)

Run this query to check all columns exist:

```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'apps_metadata'
ORDER BY ordinal_position;
```

**Expected:** 35+ columns including:
- `id` (uuid)
- `app_store_id` (text)
- `app_name` (text)
- `developer_name` (text)
- `category` (text)
- `average_rating` (numeric)
- `description` (text)
- `screenshot_urls` (jsonb)
- `raw_metadata` (jsonb)
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

---

## ✅ Step 3: Check Indexes (1 minute)

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'apps_metadata';
```

**Expected:** 7-8 indexes including:
- `apps_metadata_pkey` (primary key on id)
- `apps_metadata_app_store_id_key` (unique on app_store_id)
- `idx_apps_metadata_app_store_id`
- `idx_apps_metadata_search` (GIN index for full-text search)

---

## ✅ Step 4: Verify RLS Policies (1 minute)

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'apps_metadata';
```

**Expected:** 2 policies:
1. `apps_metadata_read_authenticated` - SELECT for authenticated users
2. `apps_metadata_write_service_role` - ALL for service_role

---

## ✅ Step 5: Test Reviews Page (CRITICAL - 3 minutes)

### Manual Browser Test

1. **Navigate to Reviews Page**
   - Go to: `http://localhost:5173/growth-accelerators/reviews`
   - Or your deployed URL

2. **Search for an App**
   - Enter: "Instagram"
   - Click search

3. **Load Reviews**
   - Click on Instagram in search results
   - Click "Load Reviews"

4. **Verify Everything Works**
   - ✅ Search returns results
   - ✅ Reviews load successfully
   - ✅ Sentiment analysis displays
   - ✅ Can add to monitored apps
   - ✅ Page load time < 2 seconds
   - ✅ No console errors

### Check Browser Console

Open DevTools → Console:
- ✅ Should see: `"✅ Saved metadata for Instagram (389801252)"` (or similar)
- ❌ Should NOT see: Any error messages

**If reviews page works:** ✅ **CRITICAL TEST PASSED** - Safe to continue!
**If reviews page broken:** ❌ **STOP** - See rollback section below

---

## ✅ Step 6: Test Edge Function Operations (5 minutes)

### Get Your Supabase Credentials

Find these in Supabase Dashboard → Settings → API:
- **Project URL:** `https://YOUR-PROJECT.supabase.co`
- **Anon Key:** `eyJhbG...` (public key, safe to use)

### Test 1: Health Check

```bash
curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/app-store-scraper \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"op": "health"}'
```

**Expected:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-11-09T..."
}
```

### Test 2: App Search (with metadata persistence)

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

**Expected:**
- Status 200
- Returns array of apps
- Instagram appears in results

### Test 3: Verify Metadata Saved to Database

Wait 2-3 seconds after search, then run this in SQL Editor:

```sql
SELECT
  app_store_id,
  app_name,
  developer_name,
  category,
  average_rating,
  created_at
FROM apps_metadata
WHERE app_name ILIKE '%Instagram%'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:**
- ✅ At least 1 row for Instagram
- ✅ `app_store_id` = '389801252' (or similar)
- ✅ `created_at` is recent (within last few minutes)

**If you see data:** ✅ **Metadata persistence working!**
**If empty:** ⚠️ Check edge function logs (see Step 7)

### Test 4: SERP Operation (caches top 10)

```bash
curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/app-store-scraper \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "op": "serp",
    "term": "photo editor",
    "cc": "us",
    "limit": 20
  }'
```

**Expected:**
- Status 200
- Returns SERP rankings
- `items` array with 20 apps

Then check database:

```sql
SELECT COUNT(*) as saved_apps
FROM apps_metadata
WHERE created_at > NOW() - INTERVAL '5 minutes';
```

**Expected:** 10+ new rows (from SERP)

### Test 5: Keyword Discovery (NEW!)

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
    "maxKeywords": 10
  }'
```

**Expected:**
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
  "count": 10,
  "message": "Discovered 10 relevant keywords"
}
```

---

## ✅ Step 7: Check Edge Function Logs (3 minutes)

1. **Open Supabase Dashboard**
2. **Navigate to Edge Functions** → `app-store-scraper`
3. **Click "Logs" tab**
4. **Look for recent entries**

**What to look for:**

✅ **Good Signs:**
- `"✅ Saved metadata for <app_name> (<app_id>)"`
- `"✅ [requestId] PUBLIC SEARCH SUCCESS"`
- `"✅ [requestId] KEYWORD DISCOVERY SUCCESS"`
- No error messages

❌ **Bad Signs:**
- `"Failed to save app metadata"`
- `"Database connection error"`
- `"TypeScript compilation error"`
- Many failed requests

---

## ✅ Step 8: Performance Check (2 minutes)

### Database Query Performance

```sql
-- Test metadata lookup by app_store_id (should use index)
EXPLAIN ANALYZE
SELECT * FROM apps_metadata
WHERE app_store_id = '389801252';
```

**Expected:**
- Execution time: < 10ms
- Uses index: `apps_metadata_app_store_id_key`

### Full-Text Search Performance

```sql
-- Test search by app name (should use GIN index)
EXPLAIN ANALYZE
SELECT * FROM apps_metadata
WHERE to_tsvector('english', app_name || ' ' || developer_name)
  @@ to_tsquery('instagram');
```

**Expected:**
- Execution time: < 50ms
- Uses index: `idx_apps_metadata_search`

---

## ✅ Success Criteria - All Must Pass

### Critical (MUST Pass)

- [ ] Migration applied successfully
- [ ] `apps_metadata` table exists with 35+ columns
- [ ] RLS policies enabled
- [ ] Indexes created
- [ ] **Reviews page loads and works** ⚠️ MOST IMPORTANT
- [ ] No console errors on reviews page
- [ ] Page load time < 2 seconds

### Important (Should Pass)

- [ ] Search operation returns results
- [ ] Metadata saves to database
- [ ] SERP operation works
- [ ] Keyword discovery returns keywords
- [ ] Edge function logs show successful saves
- [ ] Database queries use indexes (< 100ms)

### Nice to Have

- [ ] Multiple searches populate database
- [ ] Full-text search works
- [ ] No TypeScript warnings

---

## ❌ If Tests Fail - Rollback Procedure

### Critical: Reviews Page Broken

**If reviews page doesn't work, STOP immediately and rollback:**

1. **Rollback Database**

Run this in SQL Editor:

```sql
-- Drop the new table
DROP TABLE IF EXISTS public.apps_metadata CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS apps_metadata_updated_at ON public.apps_metadata;

-- Drop functions
DROP FUNCTION IF EXISTS public.update_apps_metadata_updated_at();
```

2. **Verify Reviews Work Again**
   - Refresh reviews page
   - Should work normally now

3. **Report Issue**
   - Check edge function logs
   - Check browser console errors
   - Document what failed

### Non-Critical: Metadata Not Saving

**If reviews work but metadata not saving:**

- ✅ This is OK! Non-blocking design working as intended
- Check edge function logs for specific errors
- Check RLS policies (service role might not have permission)
- Can continue with testing, fix later

---

## ✅ Post-Testing Actions

### If All Tests Pass

1. **Document Success**
   ```bash
   echo "✅ All tests passed at $(date)" >> TESTING_LOG.md
   ```

2. **Check Database Size**
   ```sql
   SELECT
     pg_size_pretty(pg_total_relation_size('apps_metadata')) as table_size,
     COUNT(*) as row_count
   FROM apps_metadata;
   ```

3. **Ready for Next Phase**
   - Option A: Continue with Phase 1 (Keyword Intelligence UI)
   - Option B: Fix remaining services
   - Option C: Deploy to production

### If Some Tests Fail

1. **Prioritize Issues**
   - Critical (reviews broken) → Rollback immediately
   - Important (saves failing) → Investigate but can continue
   - Nice to have (slow queries) → Note and optimize later

2. **Fix and Re-test**
   - Fix one issue at a time
   - Re-run specific test
   - Document fix

---

## 📊 Testing Checklist Summary

Copy this to track your progress:

```
## Migration Applied
[ ] apps_metadata table created
[ ] Indexes created
[ ] RLS policies enabled
[ ] Triggers working

## Critical Tests
[ ] Reviews page loads
[ ] Can search for apps
[ ] Reviews load successfully
[ ] No console errors
[ ] Page load < 2s

## API Tests
[ ] Search operation works
[ ] Metadata saves to DB
[ ] SERP operation works
[ ] Keyword discovery works

## Performance Tests
[ ] Database queries < 100ms
[ ] Indexes being used
[ ] No slow queries

## Overall Result
[ ] PASS - Ready to continue
[ ] PARTIAL - Some issues to fix
[ ] FAIL - Need to rollback
```

---

## 🎯 Next Steps After Testing

**If PASS:**
→ Start Phase 1 (Keyword Intelligence UI)
→ OR fix remaining services
→ OR deploy to production

**If PARTIAL:**
→ Fix critical issues first
→ Re-test
→ Then continue

**If FAIL:**
→ Rollback immediately
→ Investigate root cause
→ Fix issues
→ Re-test

---

**Testing Status:** ⏳ Ready to Start
**Start Time:** __________
**End Time:** __________
**Result:** [ ] PASS / [ ] PARTIAL / [ ] FAIL
**Notes:** _________________________________
