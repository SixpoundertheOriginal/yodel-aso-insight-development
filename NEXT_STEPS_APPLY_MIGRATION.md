# 🔧 Next Step: Apply Database Migration

**Status**: Edge functions deployed ✅, but database table needs to be created

---

## ⚠️ Current Issue

The `refresh-keyword-popularity` function is running but failing with:
```
{"success":false,"error":"Database upsert failed: undefined"}
```

**Root Cause**: The `keyword_popularity_scores` table doesn't exist yet in the database.

---

## ✅ Solution: Apply Migration via Dashboard

### Step 1: Go to SQL Editor

**URL**: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/sql

### Step 2: Create New Query

Click the "**+ New Query**" button

### Step 3: Copy Migration SQL

**File**: `supabase/migrations/20251202000000_create_keyword_popularity_scores.sql`

The SQL is below (copy everything):

```sql
-- ============================================================================
-- Keyword Popularity Scores Table (MVP - Option A, No Google Trends)
-- Stores computed popularity scores (0-100) for iOS keywords
-- Updated daily via pg_cron job
-- ============================================================================

CREATE TABLE IF NOT EXISTS keyword_popularity_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Keyword identification
  keyword TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'us',
  platform TEXT NOT NULL DEFAULT 'ios',

  -- Feature scores (0-1 normalized)
  autocomplete_score FLOAT DEFAULT 0,
  autocomplete_rank INTEGER,
  autocomplete_appears BOOLEAN DEFAULT false,

  intent_score FLOAT DEFAULT 0,
  combo_participation_count INTEGER DEFAULT 0,

  length_prior FLOAT DEFAULT 0,
  word_count INTEGER,

  -- Final score (0-100)
  popularity_score FLOAT NOT NULL,

  -- Versioning
  scoring_version TEXT DEFAULT 'v1-mvp-no-trends',

  -- Metadata
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Error tracking
  fetch_errors JSONB,
  data_quality TEXT DEFAULT 'complete',

  UNIQUE(keyword, locale, platform)
);

CREATE INDEX idx_popularity_scores_lookup
  ON keyword_popularity_scores(locale, platform, popularity_score DESC);

CREATE INDEX idx_popularity_scores_keyword
  ON keyword_popularity_scores(keyword, locale);

CREATE INDEX idx_popularity_scores_stale
  ON keyword_popularity_scores(last_checked_at)
  WHERE data_quality IN ('stale', 'partial');

ALTER TABLE keyword_popularity_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read keyword popularity scores"
  ON keyword_popularity_scores
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage keyword popularity scores"
  ON keyword_popularity_scores
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE OR REPLACE FUNCTION update_popularity_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER popularity_scores_updated_at
  BEFORE UPDATE ON keyword_popularity_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_popularity_scores_updated_at();

CREATE OR REPLACE FUNCTION get_stale_keywords(
  max_age_hours INTEGER DEFAULT 24,
  batch_size INTEGER DEFAULT 1000
)
RETURNS TABLE (keyword TEXT, locale TEXT, platform TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT kps.keyword, kps.locale, kps.platform
  FROM keyword_popularity_scores kps
  WHERE kps.last_checked_at < NOW() - (max_age_hours || ' hours')::INTERVAL
  ORDER BY kps.last_checked_at ASC
  LIMIT batch_size;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_token_intent_scores(
  p_locale TEXT DEFAULT 'us',
  p_platform TEXT DEFAULT 'ios'
)
RETURNS TABLE (
  token TEXT,
  combo_count INTEGER,
  intent_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH token_combos AS (
    SELECT
      UNNEST(string_to_array(LOWER(combo), ' ')) AS token,
      COUNT(*) AS combo_count
    FROM combo_rankings_cache
    WHERE platform = p_platform
      AND country = p_locale
      AND snapshot_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY token
  ),
  token_stats AS (
    SELECT
      tc.token,
      tc.combo_count,
      CASE
        WHEN MAX(tc.combo_count) OVER () = MIN(tc.combo_count) OVER () THEN 0.5
        ELSE (tc.combo_count::float - MIN(tc.combo_count) OVER ()) /
             NULLIF(MAX(tc.combo_count) OVER () - MIN(tc.combo_count) OVER (), 0)
      END AS intent_score
    FROM token_combos tc
    WHERE LENGTH(tc.token) > 1
  )
  SELECT
    ts.token,
    ts.combo_count::INTEGER,
    COALESCE(ts.intent_score, 0)::FLOAT AS intent_score
  FROM token_stats ts
  ORDER BY ts.intent_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE keyword_popularity_scores IS
  'Stores computed popularity scores (0-100) for iOS keywords. Updated daily via cron job. MVP version (Option A) without Google Trends.';

COMMENT ON COLUMN keyword_popularity_scores.autocomplete_score IS
  'Score from Apple autocomplete (0-1). Based on rank position in suggestions.';

COMMENT ON COLUMN keyword_popularity_scores.intent_score IS
  'Score from combo participation (0-1). Measures keyword breadth across apps.';

COMMENT ON COLUMN keyword_popularity_scores.length_prior IS
  'Short-tail bias (0-1). Single words score higher than long phrases.';

COMMENT ON COLUMN keyword_popularity_scores.popularity_score IS
  'Final score (0-100). MVP Formula: (autocomplete * 0.6) + (intent * 0.3) + (length * 0.1) * 100';

COMMENT ON FUNCTION calculate_token_intent_scores IS
  'Calculates intent scores for tokens based on combo participation in last 30 days.';
```

### Step 4: Run the Query

Click the "**Run**" button (or press `Cmd/Ctrl + Enter`)

### Step 5: Verify Success

You should see:
```
Success. No rows returned.
```

---

## ✅ After Migration is Applied

### Test the Refresh Function Again

```bash
curl -X POST "https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/refresh-keyword-popularity" \
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

### Verify Data in Database

Go to Table Editor:
https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/editor

Look for the `keyword_popularity_scores` table - you should see ~100 rows with scores!

### Check Sample Scores

Go to SQL Editor and run:
```sql
SELECT keyword, popularity_score, autocomplete_score, intent_score
FROM keyword_popularity_scores
ORDER BY popularity_score DESC
LIMIT 10;
```

**Expected**: Top keywords like "meditation", "wellness", "fitness" with scores 60-90

---

## 📊 Validation Queries

After data is loaded, run these:

```sql
-- 1. Total keywords
SELECT COUNT(*) FROM keyword_popularity_scores;
-- Expected: 100+

-- 2. Score distribution
SELECT
  CASE
    WHEN popularity_score >= 80 THEN '🔥 High (80-100)'
    WHEN popularity_score >= 60 THEN '⚡ Medium-High (60-79)'
    WHEN popularity_score >= 40 THEN '💡 Medium (40-59)'
    WHEN popularity_score >= 20 THEN '📉 Low (20-39)'
    ELSE '⛔ Very Low (0-19)'
  END AS range,
  COUNT(*) AS count
FROM keyword_popularity_scores
GROUP BY range
ORDER BY range DESC;

-- 3. Data quality
SELECT data_quality, COUNT(*)
FROM keyword_popularity_scores
GROUP BY data_quality;

-- 4. Test RPC function
SELECT * FROM calculate_token_intent_scores('us', 'ios')
LIMIT 10;
-- Expected: List of tokens with intent scores
```

---

## 🎉 What Happens Next

Once the migration is applied and data is loaded:

1. ✅ Backend is fully operational
2. ✅ API endpoint works
3. ⏳ Frontend integration (Week 3)
4. ⏳ UI updates to Combo Workbench
5. ⏳ Daily cron job setup

**Timeline**: 2-3 weeks to full production! 🚀

---

## 🆘 Troubleshooting

### "No rows returned" - Is that good?

**Yes!** This means the migration ran successfully. Tables and functions are created.

### "relation already exists"

**Good!** The table was already created. You can skip to testing the refresh function.

### "permission denied"

**Check**: Make sure you're logged into the correct Supabase project.

### "syntax error"

**Double-check**: Make sure you copied the entire SQL (all ~150 lines) with no truncation.

---

## ✅ Quick Checklist

- [ ] Go to SQL Editor in dashboard
- [ ] Create new query
- [ ] Copy migration SQL
- [ ] Run query
- [ ] Verify "Success" message
- [ ] Test refresh function via curl
- [ ] Check table has data
- [ ] Run validation queries
- [ ] Celebrate! 🎉

**Let me know when the migration is applied and I'll help with the next phase!**
