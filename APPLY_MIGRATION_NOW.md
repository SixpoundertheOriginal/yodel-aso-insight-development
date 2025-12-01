# ⚡ Apply Migration in 2 Minutes

The Supabase CLI has migration sync issues. **Fastest way: Use the Dashboard.**

---

## 📋 Steps (2 minutes):

### 1. Open SQL Editor
**Click this link**: https://supabase.com/dashboard/project/bkbcqocpjahewqjmlgvf/sql/new

### 2. Copy This SQL

```sql
-- Create keyword_popularity_scores table
CREATE TABLE IF NOT EXISTS keyword_popularity_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'us',
  platform TEXT NOT NULL DEFAULT 'ios',
  autocomplete_score FLOAT DEFAULT 0,
  autocomplete_rank INTEGER,
  autocomplete_appears BOOLEAN DEFAULT false,
  intent_score FLOAT DEFAULT 0,
  combo_participation_count INTEGER DEFAULT 0,
  length_prior FLOAT DEFAULT 0,
  word_count INTEGER,
  popularity_score FLOAT NOT NULL,
  scoring_version TEXT DEFAULT 'v1-mvp-no-trends',
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fetch_errors JSONB,
  data_quality TEXT DEFAULT 'complete',
  UNIQUE(keyword, locale, platform)
);

CREATE INDEX IF NOT EXISTS idx_popularity_scores_lookup ON keyword_popularity_scores(locale, platform, popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_popularity_scores_keyword ON keyword_popularity_scores(keyword, locale);
CREATE INDEX IF NOT EXISTS idx_popularity_scores_stale ON keyword_popularity_scores(last_checked_at) WHERE data_quality IN ('stale', 'partial');

ALTER TABLE keyword_popularity_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read keyword popularity scores" ON keyword_popularity_scores;
CREATE POLICY "Users can read keyword popularity scores" ON keyword_popularity_scores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage keyword popularity scores" ON keyword_popularity_scores;
CREATE POLICY "Service role can manage keyword popularity scores" ON keyword_popularity_scores FOR ALL USING (auth.jwt() ->> 'role' = 'service_role') WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE OR REPLACE FUNCTION update_popularity_scores_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS popularity_scores_updated_at ON keyword_popularity_scores;
CREATE TRIGGER popularity_scores_updated_at BEFORE UPDATE ON keyword_popularity_scores FOR EACH ROW EXECUTE FUNCTION update_popularity_scores_updated_at();

CREATE OR REPLACE FUNCTION get_stale_keywords(max_age_hours INTEGER DEFAULT 24, batch_size INTEGER DEFAULT 1000)
RETURNS TABLE (keyword TEXT, locale TEXT, platform TEXT) AS $$
BEGIN
  RETURN QUERY SELECT kps.keyword, kps.locale, kps.platform FROM keyword_popularity_scores kps WHERE kps.last_checked_at < NOW() - (max_age_hours || ' hours')::INTERVAL ORDER BY kps.last_checked_at ASC LIMIT batch_size;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_token_intent_scores(p_locale TEXT DEFAULT 'us', p_platform TEXT DEFAULT 'ios')
RETURNS TABLE (token TEXT, combo_count INTEGER, intent_score FLOAT) AS $$
BEGIN
  RETURN QUERY
  WITH token_combos AS (
    SELECT UNNEST(string_to_array(LOWER(combo), ' ')) AS token, COUNT(*) AS combo_count
    FROM combo_rankings_cache
    WHERE platform = p_locale AND country = p_locale AND snapshot_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY token
  ),
  token_stats AS (
    SELECT tc.token, tc.combo_count,
    CASE WHEN MAX(tc.combo_count) OVER () = MIN(tc.combo_count) OVER () THEN 0.5
    ELSE (tc.combo_count::float - MIN(tc.combo_count) OVER ()) / NULLIF(MAX(tc.combo_count) OVER () - MIN(tc.combo_count) OVER (), 0) END AS intent_score
    FROM token_combos tc WHERE LENGTH(tc.token) > 1
  )
  SELECT ts.token, ts.combo_count::INTEGER, COALESCE(ts.intent_score, 0)::FLOAT AS intent_score FROM token_stats ts ORDER BY ts.intent_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Click "Run" (or press Cmd+Enter)

You should see: **"Success. No rows returned"**

### 4. Verify Table Exists

Run this query:
```sql
SELECT COUNT(*) FROM keyword_popularity_scores;
```

Expected: `0` (table exists but empty)

---

## ✅ Then Test the Refresh Function

```bash
curl -X POST "https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/refresh-keyword-popularity"
```

**Expected Response**:
```json
{"success":true,"updated":100,"message":"Updated popularity scores for 100 keywords"}
```

---

## 🎉 Done!

After this, check the table:
```sql
SELECT keyword, popularity_score FROM keyword_popularity_scores ORDER BY popularity_score DESC LIMIT 10;
```

**You should see keywords with scores 0-100!** 🚀

Let me know when it's done and I'll help test!
