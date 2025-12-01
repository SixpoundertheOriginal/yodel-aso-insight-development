# 🎯 Keyword Popularity Engine - Implementation Status

**Date**: December 1, 2025
**Status**: ✅ **Backend Deployed** - Ready for Testing

---

## ✅ What's Complete

### 1. Database Schema ✅
- **Migration File**: `supabase/migrations/20251202000000_create_keyword_popularity_scores.sql`
- **Status**: Created (needs verification in database)
- **Tables Created**:
  - `keyword_popularity_scores` - Stores popularity scores (0-100)
  - **RPC Function**: `calculate_token_intent_scores()` - Computes intent from combo data

### 2. Edge Functions Deployed ✅
- ✅ **`refresh-keyword-popularity`** - Daily refresh job
  - URL: `https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/refresh-keyword-popularity`
  - Fetches autocomplete data
  - Calculates intent scores
  - Computes popularity (0-100)
  - Stores in database

- ✅ **`keyword-popularity`** - API endpoint for frontend
  - URL: `https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/keyword-popularity`
  - Returns scores for requested keywords
  - Fast cache lookups
  - Fallback for missing keywords

### 3. Documentation ✅
- ✅ **Architecture Audit**: `KEYWORD_POPULARITY_ENGINE_AUDIT.md`
- ✅ **Implementation Plan**: `KEYWORD_POPULARITY_MVP_IMPLEMENTATION.md`
- ✅ **Quick Start Guide**: `KEYWORD_POPULARITY_QUICKSTART.md`

---

## 🧪 Testing Required (Next Steps)

### Step 1: Verify Database Table Exists

**Via Supabase Dashboard**:
1. Go to https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf
2. Click "Table Editor" in sidebar
3. Look for `keyword_popularity_scores` table
4. If **NOT** found → Run migration manually:
   - Go to "SQL Editor"
   - Paste contents of `supabase/migrations/20251202000000_create_keyword_popularity_scores.sql`
   - Click "Run"

**Via SQL**:
```sql
-- Check if table exists
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'keyword_popularity_scores';

-- If exists, check structure
\d keyword_popularity_scores

-- Test RPC function
SELECT * FROM calculate_token_intent_scores('us', 'ios')
LIMIT 10;
```

---

### Step 2: Test Refresh Function

**Option A: Via Dashboard**
1. Go to https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/functions
2. Find `refresh-keyword-popularity`
3. Click "Invoke"
4. Wait ~30 seconds
5. Check logs for success

**Option B: Via curl** (needs proper service role key)
```bash
curl -X POST "https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/refresh-keyword-popularity" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "success": true,
  "updated": 100,
  "message": "Updated popularity scores for 100 keywords"
}
```

**What It Does**:
1. Extracts unique tokens from `combo_rankings_cache`
2. Fetches autocomplete scores (via `autocomplete-intelligence`)
3. Calculates intent scores (from combo participation)
4. Computes popularity = (autocomplete * 0.6) + (intent * 0.3) + (length * 0.1)
5. Stores results in `keyword_popularity_scores` table

---

### Step 3: Verify Data in Database

```sql
-- Check if scores were inserted
SELECT COUNT(*) FROM keyword_popularity_scores;
-- Expected: 100+ rows

-- View sample scores
SELECT
  keyword,
  popularity_score,
  autocomplete_score,
  intent_score,
  length_prior,
  last_checked_at
FROM keyword_popularity_scores
ORDER BY popularity_score DESC
LIMIT 10;

-- Expected output:
-- keyword        | popularity_score | autocomplete_score | intent_score | length_prior
-- ---------------|------------------|--------------------|--------------|--------------
-- meditation     | 87               | 0.9                | 0.82         | 1.0
-- wellness       | 76               | 0.8                | 0.68         | 1.0
-- self           | 72               | 0.7                | 0.75         | 1.0
```

---

### Step 4: Test API Endpoint

**Via curl**:
```bash
curl -X POST "https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/keyword-popularity" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["meditation", "wellness", "self care"],
    "locale": "us",
    "platform": "ios"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "results": [
    {
      "keyword": "meditation",
      "popularity_score": 87,
      "autocomplete_score": 0.9,
      "intent_score": 0.82,
      "length_prior": 1.0,
      "last_updated": "2025-12-01T10:30:00Z",
      "source": "cache",
      "data_quality": "complete"
    },
    {
      "keyword": "wellness",
      "popularity_score": 76,
      "autocomplete_score": 0.8,
      "intent_score": 0.68,
      "length_prior": 1.0,
      "last_updated": "2025-12-01T10:30:00Z",
      "source": "cache",
      "data_quality": "complete"
    },
    {
      "keyword": "self care",
      "popularity_score": 42,
      "autocomplete_score": 0.4,
      "intent_score": 0.5,
      "length_prior": 0.5,
      "last_updated": "2025-12-01T10:30:00Z",
      "source": "cache",
      "data_quality": "complete"
    }
  ],
  "cached_count": 3,
  "computed_count": 0
}
```

---

## 🚫 Known Issues

### Issue 1: Migration State Mismatch
**Problem**: Local migration history doesn't match remote
**Workaround**: Run SQL manually via dashboard (see Step 1 above)
**Resolution**: Migration repair commands were run, but table needs verification

### Issue 2: Service Role Key Auth
**Problem**: curl test failed with "Invalid JWT"
**Solution**: Use correct service role key from dashboard:
1. Go to Project Settings → API
2. Copy "service_role" secret key
3. Use in Authorization header

---

## 🔄 Next Implementation Phase: Frontend Integration

Once backend testing is complete, proceed with frontend:

### Week 3 Tasks:

1. **Create Hook**: `src/hooks/useKeywordPopularity.ts`
   - Fetches scores from `keyword-popularity` API
   - Caches results locally
   - Code ready in `KEYWORD_POPULARITY_MVP_IMPLEMENTATION.md`

2. **Update Combo Workbench**: `src/components/AppAudit/KeywordComboWorkbench/KeywordComboTable.tsx`
   - Add Popularity column
   - Add sorting by popularity
   - Add tooltips with score breakdown
   - Add emojis (🔥⚡💡📉⛔)

3. **Update Store**: `src/stores/useKeywordComboStore.ts`
   - Add `'popularity'` to `SortColumn` type

---

## 🎯 Success Validation

### Sanity Checks to Run:

```sql
-- Test 1: High-volume keywords should score high (>60)
SELECT keyword, popularity_score
FROM keyword_popularity_scores
WHERE keyword IN ('meditation', 'app', 'wellness', 'fitness')
ORDER BY popularity_score DESC;

-- Expected: All scores 60-90

-- Test 2: Nonsense keywords should score low (<20)
SELECT keyword, popularity_score
FROM keyword_popularity_scores
WHERE keyword IN ('xyzqwerty', 'asdfasdf')
ORDER BY popularity_score DESC;

-- Expected: 0-15

-- Test 3: Broad terms > specific terms
SELECT keyword, popularity_score
FROM keyword_popularity_scores
WHERE keyword IN ('meditation', 'mindfulness meditation technique')
ORDER BY popularity_score DESC;

-- Expected: 'meditation' > 'mindfulness meditation technique'

-- Test 4: Score distribution
SELECT
  CASE
    WHEN popularity_score >= 80 THEN '🔥 High (80-100)'
    WHEN popularity_score >= 60 THEN '⚡ Medium-High (60-79)'
    WHEN popularity_score >= 40 THEN '💡 Medium (40-59)'
    WHEN popularity_score >= 20 THEN '📉 Low (20-39)'
    ELSE '⛔ Very Low (0-19)'
  END AS score_range,
  COUNT(*) AS keyword_count,
  ROUND(AVG(popularity_score), 1) AS avg_score
FROM keyword_popularity_scores
GROUP BY score_range
ORDER BY score_range DESC;

-- Expected: Normal distribution with most keywords in medium range
```

---

## 📊 Monitoring Queries

```sql
-- Total keywords tracked
SELECT COUNT(*) FROM keyword_popularity_scores;

-- Data freshness
SELECT
  COUNT(*) FILTER (WHERE last_checked_at > NOW() - INTERVAL '24 hours') AS fresh,
  COUNT(*) FILTER (WHERE last_checked_at <= NOW() - INTERVAL '24 hours') AS stale,
  COUNT(*) AS total
FROM keyword_popularity_scores;

-- Data quality breakdown
SELECT data_quality, COUNT(*)
FROM keyword_popularity_scores
GROUP BY data_quality;

-- Top 20 keywords by popularity
SELECT keyword, popularity_score, autocomplete_appears, intent_score
FROM keyword_popularity_scores
ORDER BY popularity_score DESC
LIMIT 20;

-- Bottom 20 keywords (potential noise)
SELECT keyword, popularity_score, autocomplete_appears, intent_score
FROM keyword_popularity_scores
ORDER BY popularity_score ASC
LIMIT 20;
```

---

## 🔧 Troubleshooting

### Problem: "Table keyword_popularity_scores does not exist"

**Solution**:
1. Go to Supabase Dashboard → SQL Editor
2. Run migration SQL manually
3. Verify with: `SELECT * FROM keyword_popularity_scores LIMIT 1;`

### Problem: "Function returns 0 results"

**Diagnosis**:
```sql
-- Check if combo_rankings_cache has data
SELECT COUNT(*) FROM combo_rankings_cache;
-- If 0 → No combo data yet, need to run app audit first

-- Check if RPC function works
SELECT * FROM calculate_token_intent_scores('us', 'ios') LIMIT 5;
-- If error → Function not created, run migration
```

### Problem: "All scores are 0"

**Diagnosis**:
- Autocomplete fetch likely failed
- Check function logs in dashboard
- May need to slow down batch fetching (increase DELAY_MS in code)

---

## 🚀 Deployment Checklist

- [x] Database migration created
- [x] Edge functions created
- [x] Edge functions deployed
- [ ] Database table verified
- [ ] Refresh function tested
- [ ] Scores validated by ASO expert
- [ ] API endpoint tested
- [ ] Frontend hook created
- [ ] UI integration complete
- [ ] Daily cron job set up

---

## 📅 Timeline

- **Week 1 (Current)**: Backend deployment ✅
- **Week 2**: Testing & validation
- **Week 3**: Frontend integration
- **Week 4**: Production launch & monitoring

---

## 🎓 Key URLs

- **Dashboard**: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf
- **Functions**: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/functions
- **SQL Editor**: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/sql
- **Table Editor**: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/editor

---

## ✅ Summary

**What's Done**:
- ✅ Database schema designed
- ✅ Edge functions written and deployed
- ✅ Autocomplete integration (reusing existing function)
- ✅ Intent score calculation (from combo data)
- ✅ Formula implemented: (autocomplete * 0.6) + (intent * 0.3) + (length * 0.1)

**What's Next**:
1. **Verify database table exists** (via dashboard)
2. **Test refresh function** (via dashboard "Invoke" button)
3. **Validate scores** (run sanity check SQL queries)
4. **Test API endpoint** (via curl or Postman)

**Cost**: $0/month ✅
**Timeline**: 2-3 weeks remaining to production

**Ready for testing!** 🎉
