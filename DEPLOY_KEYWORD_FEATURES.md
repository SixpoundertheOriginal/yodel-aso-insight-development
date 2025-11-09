# Deploy Keyword Discovery Features
**Complete the missing advanced features for keyword intelligence**

---

## 🎯 What This Deploys

1. **Database Tables** for bulk discovery
2. **Edge Function** with `discover_keywords` operation
3. **Enables** Bulk Discovery and Competitors tabs on keywords page

---

## ⚡ Quick Deployment (5 minutes)

### Step 1: Apply Database Migration

**Via Supabase Dashboard:**

1. Go to https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/editor
2. Click **SQL Editor** in left sidebar
3. Click **New Query**
4. Copy and paste the migration file:
   ```bash
   cat supabase/migrations/20251109140000_create_keyword_discovery_tables.sql
   ```
5. Click **Run**
6. Verify success (should see "Success. No rows returned")

**Via psql (alternative):**
```bash
psql "postgresql://postgres:YOUR_PASSWORD@db.bkbcqocpjahewqjmlgvf.supabase.co:5432/postgres" \
  -f supabase/migrations/20251109140000_create_keyword_discovery_tables.sql
```

### Step 2: Deploy Edge Function

**Via Supabase Dashboard:**

1. Go to https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/functions
2. Click **app-store-scraper** function
3. Click **Deploy new version**
4. Select all files in `supabase/functions/app-store-scraper/`
5. Click **Deploy**

**Via Supabase CLI (if installed):**
```bash
supabase functions deploy app-store-scraper --project-ref bkbcqocpjahewqjmlgvf
```

---

## ✅ Verification

### Test 1: Check Tables Created
```sql
-- In SQL Editor, run:
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('keyword_discovery_jobs', 'enhanced_keyword_rankings');
```
**Expected:** 2 rows returned

### Test 2: Check Database Function
```sql
-- In SQL Editor, run:
SELECT proname
FROM pg_proc
WHERE proname = 'start_keyword_discovery_job';
```
**Expected:** 1 row returned

### Test 3: Test Edge Function API
```bash
curl -X POST "https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/app-store-scraper" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "op": "discover_keywords",
    "organizationId": "public",
    "targetApp": {"name": "Instagram", "appId": "389801252"},
    "seedKeywords": ["photo", "social"],
    "country": "us",
    "maxKeywords": 20
  }'
```
**Expected:** JSON response with `"success": true` and list of keywords

---

## 🧪 Test in UI

1. Go to http://localhost:8080/growth-accelerators/keywords
2. Search for "Instagram" and select it
3. Go to **"Bulk Discovery"** tab
4. Select "Top 30 Keywords"
5. Click **"Start Discovery"**
6. **Expected:** Progress bar shows discovery in progress

---

## 📋 What Gets Created

### Database Tables

**keyword_discovery_jobs** (9 columns)
- Tracks bulk discovery jobs
- Stores job status, progress, results
- RLS enabled for multi-tenant access

**enhanced_keyword_rankings** (12 columns)
- Stores discovered keywords
- Includes rank, volume, difficulty, confidence
- Historical tracking via snapshot_date
- RLS enabled for multi-tenant access

### Database Function

**start_keyword_discovery_job()**
- Creates new discovery job
- Returns job UUID
- Grants permission to authenticated + anon users

### Edge Function Operation

**discover_keywords**
- Advanced keyword discovery API
- Uses KeywordDiscoveryService (600 lines)
- Returns scored and ranked keywords

---

## 🐛 Troubleshooting

### "Table does not exist" error
- Migration not applied
- Go to Step 1 and apply migration

### "Missing required fields" error
- Edge function not deployed with new code
- Go to Step 2 and redeploy function

### "Failed to load recent jobs" in UI
- Table exists but has no data (normal for first run)
- Ignore this warning, it will populate after first discovery

### "Function not found" error
- Database function not created
- Re-run migration in SQL Editor

---

## 🎉 What Works After Deployment

### Bulk Discovery Tab
✅ Discover top 10/30/100 keywords
✅ Track discovery job progress
✅ View recent discovery jobs
✅ Auto-save results to database

### Advanced Discovery API
✅ `discover_keywords` operation available
✅ Multiple discovery strategies (SERP, competitor, category)
✅ Keyword scoring and ranking

### Historical Tracking
✅ Keywords saved with timestamps
✅ Track keyword performance over time
✅ Query historical snapshots

---

## 📊 Migration Details

**File:** `supabase/migrations/20251109140000_create_keyword_discovery_tables.sql`
**Lines:** 279
**Tables:** 2
**Functions:** 3 (including triggers)
**Indexes:** 11
**RLS Policies:** 6

**Safe to run:** Yes (uses `IF NOT EXISTS`)
**Reversible:** Yes (can drop tables if needed)

---

## 🚀 Next Steps After Deployment

1. Test bulk discovery in UI
2. Verify keywords save to database
3. Check job history in Bulk Discovery tab
4. (Optional) Build competitor intelligence features
5. (Optional) Add automated rank checking

---

## 💡 Alternative: Deploy via Lovable.dev

If you're using Lovable.dev:

1. Push this branch to GitHub
2. Lovable will detect the migration
3. Apply migration via Lovable's Supabase integration
4. Edge function will auto-deploy

---

## ❓ Need Help?

**Migration not working?**
- Check migration file: `supabase/migrations/20251109140000_create_keyword_discovery_tables.sql`
- Verify syntax: No errors in SQL

**Edge function not deploying?**
- Check files exist: `supabase/functions/app-store-scraper/`
- Verify imports: All services imported correctly
- Check logs: Supabase Dashboard → Functions → Logs

**Still stuck?**
- Check BACKEND_API_STATUS.md for API testing
- Check TESTING_PHASE_0.md for comprehensive tests
