# 🚀 Keyword Popularity Engine - Quick Start Guide

**Option A MVP** - No Google Trends, $0/month cost, 3-4 weeks to production

---

## ✅ What's Ready

### Files Created
1. ✅ **`KEYWORD_POPULARITY_MVP_IMPLEMENTATION.md`** - Complete implementation spec
2. ✅ **`KEYWORD_POPULARITY_ENGINE_AUDIT.md`** - Architecture audit with all context
3. ✅ **`supabase/migrations/20251201000000_create_keyword_popularity_scores.sql`** - Database migration

### What's Already Built (50% Done!)
- ✅ `autocomplete-intelligence` edge function (fetches Apple autocomplete)
- ✅ `combo_rankings_cache` table (competition data)
- ✅ `search_intent_registry` table (intent classifications)
- ✅ Combo generation engine (extracts tokens)

---

## 🏁 Getting Started (Step-by-Step)

### Step 1: Apply Database Migration (5 min)

```bash
# Apply migration to create keyword_popularity_scores table
supabase db push

# Verify table was created
psql $DATABASE_URL -c "\d keyword_popularity_scores"
```

**Expected Output**:
```
Table "public.keyword_popularity_scores"
Column               | Type      | Nullable
---------------------+-----------+---------
id                   | uuid      | not null
keyword              | text      | not null
locale               | text      | not null
popularity_score     | float     | not null
...
```

---

### Step 2: Test Intent Score Calculation (10 min)

```bash
# Test the SQL function with existing combo data
psql $DATABASE_URL -c "
SELECT * FROM calculate_token_intent_scores('us', 'ios')
LIMIT 10;
"
```

**Expected Output**:
```
token        | combo_count | intent_score
-------------+-------------+-------------
meditation   | 45          | 0.89
wellness     | 38          | 0.76
self         | 52          | 1.00
care         | 31          | 0.62
...
```

**What to Check**:
- ✅ Common keywords (meditation, wellness) should have high scores (>0.5)
- ✅ Rare keywords should have low scores (<0.3)
- ✅ If all scores are 0 → No data in `combo_rankings_cache` yet

---

### Step 3: Create Edge Functions (Next Steps)

#### Option A: Manual Setup (Recommended for MVP)
Create these files in order:

1. **`supabase/functions/refresh-keyword-popularity/index.ts`**
   - Copy from `KEYWORD_POPULARITY_MVP_IMPLEMENTATION.md` (Section: Backend Implementation)
   - This is the daily refresh job

2. **`supabase/functions/keyword-popularity/index.ts`**
   - Copy from `KEYWORD_POPULARITY_MVP_IMPLEMENTATION.md` (Section: API Implementation)
   - This is the GET endpoint for frontend

#### Option B: Automated (Claude can do this)
Just ask: "Create the edge functions from the implementation plan"

---

### Step 4: Test Locally (30 min)

```bash
# Start Supabase locally
supabase start

# Deploy edge functions locally
supabase functions deploy refresh-keyword-popularity --no-verify-jwt
supabase functions deploy keyword-popularity --no-verify-jwt

# Test refresh function (fetches autocomplete + computes scores)
curl -X POST http://localhost:54321/functions/v1/refresh-keyword-popularity \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"

# Expected: { "success": true, "updated": 100, "message": "..." }

# Check database
psql $DATABASE_URL -c "SELECT keyword, popularity_score FROM keyword_popularity_scores LIMIT 10;"

# Test API endpoint
curl -X POST http://localhost:54321/functions/v1/keyword-popularity \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"keywords": ["meditation", "wellness", "self care"], "locale": "us"}'

# Expected: { "success": true, "results": [...] }
```

---

### Step 5: Validate Scores (15 min)

**Sanity Check Test Cases**:

```sql
-- High-volume keywords should score high (>60)
SELECT keyword, popularity_score
FROM keyword_popularity_scores
WHERE keyword IN ('meditation', 'app', 'wellness', 'fitness')
ORDER BY popularity_score DESC;

-- Expected:
-- app        -> 80-90
-- meditation -> 70-85
-- wellness   -> 65-80
-- fitness    -> 70-85

-- Nonsense keywords should score low (<20)
SELECT keyword, popularity_score
FROM keyword_popularity_scores
WHERE keyword IN ('xyzqwerty', 'asdfasdf')
ORDER BY popularity_score DESC;

-- Expected: 0-15

-- Broad terms > specific terms
SELECT keyword, popularity_score
FROM keyword_popularity_scores
WHERE keyword IN ('meditation', 'mindfulness meditation technique')
ORDER BY popularity_score DESC;

-- Expected: 'meditation' > 'mindfulness meditation technique'
```

**Action**: Share results with ASO expert for validation.

---

### Step 6: Set Up Daily Cron Job (10 min)

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily refresh at 3 AM UTC
SELECT cron.schedule(
  'refresh-keyword-popularity',
  '0 3 * * *', -- Every day at 3 AM
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/refresh-keyword-popularity',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )
  $$
);

-- Verify job was created
SELECT * FROM cron.job WHERE jobname = 'refresh-keyword-popularity';

-- Test job manually (don't wait for 3 AM)
SELECT cron.schedule('test-refresh-now', '* * * * *', $$ /* same as above */ $$);
-- Wait 1 minute, check if it ran
SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'test-refresh-now');
-- Delete test job
SELECT cron.unschedule('test-refresh-now');
```

---

### Step 7: Frontend Integration (Week 3)

#### Add Hook to Project

Create: `src/hooks/useKeywordPopularity.ts`
- Copy from `KEYWORD_POPULARITY_MVP_IMPLEMENTATION.md` (Section: Frontend Integration)

#### Update Combo Workbench

File: `src/components/AppAudit/KeywordComboWorkbench/KeywordComboTable.tsx`

```typescript
// 1. Import hook
import { useKeywordPopularity } from '@/hooks/useKeywordPopularity';

// 2. Add hook call (after existing hooks)
const allComboTexts = useMemo(() => {
  return finalSortedCombos.map(c => c.text);
}, [finalSortedCombos]);

const { scores: popularityScores, isLoading: popularityLoading } =
  useKeywordPopularity(allComboTexts, metadata?.country || 'us');

// 3. Add column to store type
// File: src/stores/useKeywordComboStore.ts
export type SortColumn = '...' | 'popularity'; // Add 'popularity'

// 4. Add sorting logic
// In KeywordComboTable.tsx, add to finalSortedCombos logic
else if (sortColumn === 'popularity') {
  return [...sortedCombos].sort((a, b) => {
    const aScore = popularityScores.get(a.text.toLowerCase())?.popularity_score ?? 0;
    const bScore = popularityScores.get(b.text.toLowerCase())?.popularity_score ?? 0;
    return sortDirection === 'asc' ? aScore - bScore : bScore - aScore;
  });
}

// 5. Add table header (after Competition column)
<SortableHeader
  column="popularity"
  onClick={() => handleSort('popularity')}
  sortIcon={getSortIcon('popularity')}
>
  Popularity
</SortableHeader>

// 6. Add table cell (in map over paginatedCombos)
<TableCell className="text-center">
  {(() => {
    const score = popularityScores.get(combo.text.toLowerCase());
    if (!score) return <span className="text-zinc-500">-</span>;

    const emoji =
      score.popularity_score >= 80 ? '🔥' :
      score.popularity_score >= 60 ? '⚡' :
      score.popularity_score >= 40 ? '💡' :
      score.popularity_score >= 20 ? '📉' : '⛔';

    return (
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center justify-center gap-1">
            <span className="font-mono">{score.popularity_score}</span>
            <span>{emoji}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <div className="font-semibold">Popularity Breakdown</div>
            <div>Autocomplete: {Math.round(score.autocomplete_score * 100)}/100</div>
            <div>Intent: {Math.round(score.intent_score * 100)}/100</div>
            <div>Length: {Math.round(score.length_prior * 100)}/100</div>
            <div className="text-zinc-500 mt-1">
              Updated: {formatDistanceToNow(new Date(score.last_updated))} ago
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  })()}
</TableCell>
```

---

## 🎯 Success Checklist

### Week 1: Backend Foundation
- [ ] Database migration applied successfully
- [ ] `calculate_token_intent_scores()` returns sensible values
- [ ] Edge functions deployed locally
- [ ] Manual test: `refresh-keyword-popularity` fetches 100 keywords
- [ ] Database has 100+ rows in `keyword_popularity_scores`
- [ ] Scores validated by ASO expert (meditation > obscure terms)

### Week 2: API Layer
- [ ] `keyword-popularity` API endpoint works
- [ ] API returns scores in <500ms
- [ ] Cache hit rate >90% (after initial fetch)
- [ ] Integration tests pass

### Week 3: Frontend
- [ ] Popularity column visible in Combo Workbench
- [ ] Sorting by popularity works
- [ ] Tooltips show score breakdown
- [ ] Emojis display correctly (🔥⚡💡📉⛔)

### Week 4: Production Launch
- [ ] Daily cron job runs successfully
- [ ] 1,000+ keywords refreshed automatically
- [ ] Zero downtime
- [ ] User feedback collected

---

## 🐛 Troubleshooting

### Issue: "No data in keyword_popularity_scores"

**Check**:
```sql
-- Do we have combos in cache?
SELECT COUNT(*) FROM combo_rankings_cache;
-- Expected: >100

-- Did the refresh function run?
SELECT * FROM keyword_popularity_scores LIMIT 1;
-- If empty → Run refresh function manually

-- Check edge function logs
supabase functions logs refresh-keyword-popularity
```

### Issue: "All scores are 0"

**Likely Cause**: Autocomplete fetch failed

**Fix**:
```sql
-- Check fetch_errors column
SELECT keyword, fetch_errors
FROM keyword_popularity_scores
WHERE autocomplete_score = 0
LIMIT 10;

-- If errors show rate limiting → Slow down batch fetches
-- Update BATCH_SIZE in refresh-keyword-popularity/index.ts
```

### Issue: "Cron job not running"

**Check**:
```sql
-- Is pg_cron enabled?
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Is job scheduled?
SELECT * FROM cron.job WHERE jobname = 'refresh-keyword-popularity';

-- Check last run
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
```

---

## 📊 Monitoring & Metrics

### Key Metrics to Track

```sql
-- Total keywords tracked
SELECT COUNT(*) FROM keyword_popularity_scores;

-- Score distribution
SELECT
  CASE
    WHEN popularity_score >= 80 THEN 'High (80-100)'
    WHEN popularity_score >= 60 THEN 'Medium-High (60-79)'
    WHEN popularity_score >= 40 THEN 'Medium (40-59)'
    WHEN popularity_score >= 20 THEN 'Low (20-39)'
    ELSE 'Very Low (0-19)'
  END AS score_range,
  COUNT(*) AS keyword_count
FROM keyword_popularity_scores
GROUP BY score_range
ORDER BY score_range DESC;

-- Data quality
SELECT data_quality, COUNT(*)
FROM keyword_popularity_scores
GROUP BY data_quality;

-- Freshness (how old is data?)
SELECT
  COUNT(*) FILTER (WHERE last_checked_at > NOW() - INTERVAL '24 hours') AS fresh,
  COUNT(*) FILTER (WHERE last_checked_at <= NOW() - INTERVAL '24 hours') AS stale,
  COUNT(*) AS total
FROM keyword_popularity_scores;
```

---

## 🎓 Tips for Success

### 1. Start Small
- Begin with 100 keywords (ASO experts' most common terms)
- Validate scores make sense
- Gradually expand to 1,000, then 10,000

### 2. Validate With Experts
- Share top 50 keywords with ASO team
- Ask: "Do these scores feel right?"
- Adjust weights if needed (autocomplete 60% → 70%?)

### 3. Monitor Performance
- Check API response times weekly
- Watch cache hit rates
- Optimize queries if slow

### 4. Plan for v2
- Add Google Trends later if budget allows
- Tune weights based on real data
- Consider ML model for v3

---

## 🚀 Ready to Build?

**Next Step**: Apply database migration and test intent score calculation

```bash
supabase db push
psql $DATABASE_URL -c "SELECT * FROM calculate_token_intent_scores('us', 'ios') LIMIT 10;"
```

**Questions?** Check the full implementation plan: `KEYWORD_POPULARITY_MVP_IMPLEMENTATION.md`

**Timeline**: 3-4 weeks to production 🎉
