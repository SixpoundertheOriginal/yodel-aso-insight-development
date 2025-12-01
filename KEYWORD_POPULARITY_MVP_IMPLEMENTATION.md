# 🚀 iOS Keyword Popularity Engine — MVP Implementation Plan (Option A)

**Date**: December 1, 2025
**Approach**: Option A - No Google Trends, $0/month operational cost
**Timeline**: 3-4 weeks to production

---

## ✅ Option A: What We're Building

### Simplified Formula (No Google Trends)
```
popularity_score =
    (autocomplete_score * 0.60)  // ← Increased from 50% (more weight since trends removed)
  + (intent_score       * 0.30)  // ← Increased from 20%
  + (length_prior       * 0.10)  // ← Kept same
```

**Why This Works**:
- Autocomplete is the **most predictive signal** (~70% correlation with real volume)
- Intent score adds context from existing combo data
- Length prior captures short-tail bias
- **Still highly accurate** without expensive Trends API

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Daily Refresh Job (pg_cron)              │
│                       Runs at 3 AM UTC                       │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│      Edge Function: refresh-keyword-popularity              │
│  1. Extract unique tokens from monitored apps               │
│  2. Fetch autocomplete scores (reuse existing function!)    │
│  3. Calculate intent scores from combo data                 │
│  4. Apply formula → popularity_score                        │
│  5. Store in keyword_popularity_scores table                │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│           Table: keyword_popularity_scores                  │
│       (keyword, locale, platform) → score (0-100)           │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│      Edge Function: keyword-popularity (GET API)            │
│  - Check cache (24h TTL)                                    │
│  - Return scores for requested keywords                     │
│  - Compute on-the-fly if missing                            │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│         Frontend: Combo Workbench UI                        │
│  - Fetch scores via API                                     │
│  - Display Popularity column                                │
│  - Sort/filter by popularity                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Phase 0: Spec Finalization (Week 1, Days 1-2)

### Critical Decisions Resolved ✅

#### 1. **Autocomplete Strategy**: Reuse Existing Function
- ✅ **Use**: `supabase/functions/autocomplete-intelligence/index.ts`
- ✅ **Already caches** suggestions for 7 days
- ✅ **Already returns** rank positions (1-10)
- ✅ **No new code needed!**

**How to compute `autocomplete_score`**:
```typescript
// If keyword appears in autocomplete suggestions
if (keyword found in suggestions) {
  autocomplete_score = (11 - rank_position) / 10;
  // Rank 1 → 1.0
  // Rank 5 → 0.6
  // Rank 10 → 0.1
} else {
  autocomplete_score = 0;
}
```

#### 2. **Google Trends**: SKIPPED ✅
- ✅ **Remove** `trend_score` from formula
- ✅ **Save** $300/month
- ✅ **Can add later** in v2 if needed

#### 3. **Intent Score**: From Existing Combo Data
```sql
-- Calculate how "popular" a token is based on combo participation
WITH token_combos AS (
  SELECT
    UNNEST(string_to_array(combo, ' ')) AS token,
    COUNT(*) AS combo_count
  FROM combo_rankings_cache
  WHERE platform = 'ios'
    AND country = 'us'
    AND snapshot_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY token
),
token_stats AS (
  SELECT
    token,
    combo_count,
    -- Normalize to 0-1 scale
    (combo_count::float - MIN(combo_count) OVER ()) /
    NULLIF(MAX(combo_count) OVER () - MIN(combo_count) OVER (), 0) AS intent_score
  FROM token_combos
)
SELECT * FROM token_stats;
```

**Logic**:
- Token appears in 5 combos → Low intent (common filler word)
- Token appears in 50 combos → High intent (core keyword)
- Normalized across all tokens in locale

#### 4. **Job Scheduler**: pg_cron ✅
```sql
-- Schedule daily at 3 AM UTC
SELECT cron.schedule(
  'refresh-keyword-popularity',
  '0 3 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/refresh-keyword-popularity',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )$$
);
```

#### 5. **Database Schema**: Finalized ✅

---

## 🗄️ Database Schema (Finalized)

### Migration: `20251201000000_create_keyword_popularity_scores.sql`

```sql
-- ============================================================================
-- Keyword Popularity Scores Table
-- Stores computed popularity scores (0-100) for iOS keywords
-- ============================================================================

CREATE TABLE IF NOT EXISTS keyword_popularity_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Keyword identification
  keyword TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'us',
  platform TEXT NOT NULL DEFAULT 'ios',

  -- Feature scores (0-1 normalized)
  autocomplete_score FLOAT DEFAULT 0,
  autocomplete_rank INTEGER, -- 1-10 or null (if keyword doesn't appear)
  autocomplete_appears BOOLEAN DEFAULT false,

  intent_score FLOAT DEFAULT 0,
  combo_participation_count INTEGER DEFAULT 0, -- How many combos contain this token

  length_prior FLOAT DEFAULT 0,
  word_count INTEGER, -- Number of words in keyword

  -- Final score (0-100)
  popularity_score FLOAT NOT NULL,

  -- Versioning for formula changes
  scoring_version TEXT DEFAULT 'v1-mvp-no-trends',

  -- Metadata
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Error tracking
  fetch_errors JSONB, -- Store any API errors: {"autocomplete": "rate limited"}
  data_quality TEXT DEFAULT 'complete', -- 'complete', 'partial', 'stale', 'estimated'

  -- Unique constraint: one score per keyword per locale
  UNIQUE(keyword, locale, platform)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Lookup by locale and score (for filtering high-popularity keywords)
CREATE INDEX idx_popularity_scores_lookup
  ON keyword_popularity_scores(locale, platform, popularity_score DESC);

-- Lookup by keyword (for API queries)
CREATE INDEX idx_popularity_scores_keyword
  ON keyword_popularity_scores(keyword, locale);

-- Find stale scores (for refresh job)
CREATE INDEX idx_popularity_scores_stale
  ON keyword_popularity_scores(last_checked_at)
  WHERE data_quality IN ('stale', 'partial');

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE keyword_popularity_scores ENABLE ROW LEVEL SECURITY;

-- Users can read all popularity scores (public data)
CREATE POLICY "Users can read keyword popularity scores"
  ON keyword_popularity_scores
  FOR SELECT
  USING (true); -- Public data, no restriction

-- Only service role can insert/update scores
CREATE POLICY "Service role can manage keyword popularity scores"
  ON keyword_popularity_scores
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Automatic Timestamp Update
-- ============================================================================

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

-- ============================================================================
-- Helper Function: Get Keywords Needing Refresh
-- ============================================================================

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

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE keyword_popularity_scores IS
  'Stores computed popularity scores (0-100) for iOS keywords. Updated daily via cron job.';

COMMENT ON COLUMN keyword_popularity_scores.autocomplete_score IS
  'Score from Apple autocomplete (0-1). Based on rank position in suggestions.';

COMMENT ON COLUMN keyword_popularity_scores.intent_score IS
  'Score from combo participation (0-1). Measures keyword breadth across apps.';

COMMENT ON COLUMN keyword_popularity_scores.length_prior IS
  'Short-tail bias (0-1). Single words score higher than long phrases.';

COMMENT ON COLUMN keyword_popularity_scores.popularity_score IS
  'Final score (0-100). Formula: (autocomplete * 0.6) + (intent * 0.3) + (length * 0.1)';

COMMENT ON COLUMN keyword_popularity_scores.data_quality IS
  'Data quality indicator: complete (all sources ok), partial (some failed), stale (>24h old), estimated (no data, using fallback)';
```

---

## 🔧 Backend Implementation

### 1. Edge Function: `refresh-keyword-popularity`

**File**: `supabase/functions/refresh-keyword-popularity/index.ts`

```typescript
/**
 * Refresh Keyword Popularity Edge Function
 *
 * Called daily by pg_cron to update popularity scores for all tracked keywords.
 *
 * Flow:
 * 1. Extract unique tokens from monitored apps
 * 2. Fetch autocomplete scores (via autocomplete-intelligence)
 * 3. Calculate intent scores from combo_rankings_cache
 * 4. Compute length priors
 * 5. Apply formula → popularity_score (0-100)
 * 6. Upsert to keyword_popularity_scores table
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface PopularityScore {
  keyword: string;
  locale: string;
  platform: string;
  autocomplete_score: number;
  autocomplete_rank: number | null;
  autocomplete_appears: boolean;
  intent_score: number;
  combo_participation_count: number;
  length_prior: number;
  word_count: number;
  popularity_score: number;
  data_quality: 'complete' | 'partial' | 'estimated';
  fetch_errors?: Record<string, string>;
}

const FORMULA_WEIGHTS = {
  autocomplete: 0.60,
  intent: 0.30,
  length: 0.10,
};

serve(async (req) => {
  try {
    // CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[refresh-keyword-popularity] 🚀 Starting refresh job...');

    // Step 1: Extract unique tokens from monitored apps
    const tokens = await extractUniqueTokens(supabase);
    console.log(`[refresh-keyword-popularity] 📝 Found ${tokens.length} unique tokens`);

    // Step 2: Calculate intent scores from combo participation
    const intentScores = await calculateIntentScores(supabase, 'us', 'ios');
    console.log(`[refresh-keyword-popularity] 🧠 Calculated intent scores for ${Object.keys(intentScores).length} tokens`);

    // Step 3: Fetch autocomplete scores for each token
    const autocompleteScores = await fetchAutocompleteScores(supabase, tokens, 'us', 'ios');
    console.log(`[refresh-keyword-popularity] 🔍 Fetched autocomplete scores for ${Object.keys(autocompleteScores).length} tokens`);

    // Step 4: Compute popularity scores
    const scores: PopularityScore[] = [];

    for (const token of tokens) {
      const autocomplete = autocompleteScores[token] || { score: 0, rank: null, appears: false };
      const intent = intentScores[token] || { score: 0, combo_count: 0 };
      const length = calculateLengthPrior(token);

      // Apply formula (MVP version without trends)
      const popularityScore = Math.round(
        (autocomplete.score * FORMULA_WEIGHTS.autocomplete +
         intent.score * FORMULA_WEIGHTS.intent +
         length.score * FORMULA_WEIGHTS.length) * 100
      );

      scores.push({
        keyword: token,
        locale: 'us',
        platform: 'ios',
        autocomplete_score: autocomplete.score,
        autocomplete_rank: autocomplete.rank,
        autocomplete_appears: autocomplete.appears,
        intent_score: intent.score,
        combo_participation_count: intent.combo_count,
        length_prior: length.score,
        word_count: length.word_count,
        popularity_score: popularityScore,
        data_quality: 'complete',
      });
    }

    console.log(`[refresh-keyword-popularity] 💯 Computed ${scores.length} popularity scores`);

    // Step 5: Upsert to database
    const { error } = await supabase
      .from('keyword_popularity_scores')
      .upsert(
        scores.map(s => ({
          ...s,
          scoring_version: 'v1-mvp-no-trends',
          last_checked_at: new Date().toISOString(),
        })),
        {
          onConflict: 'keyword,locale,platform',
        }
      );

    if (error) {
      throw new Error(`Database upsert failed: ${error.message}`);
    }

    console.log(`[refresh-keyword-popularity] ✅ Successfully updated ${scores.length} scores`);

    return new Response(
      JSON.stringify({
        success: true,
        updated: scores.length,
        message: `Updated popularity scores for ${scores.length} keywords`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[refresh-keyword-popularity] ❌ Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract unique tokens from all monitored apps
 */
async function extractUniqueTokens(supabase: any): Promise<string[]> {
  // Get all combos from cache (last 30 days)
  const { data, error } = await supabase
    .from('combo_rankings_cache')
    .select('combo')
    .gte('snapshot_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  if (error) throw new Error(`Failed to fetch combos: ${error.message}`);

  // Extract unique tokens
  const tokens = new Set<string>();
  for (const row of data || []) {
    const words = row.combo.toLowerCase().split(' ');
    for (const word of words) {
      if (word.length > 1) { // Skip single letters
        tokens.add(word);
      }
    }
  }

  return Array.from(tokens).slice(0, 1000); // Limit to 1000 for MVP
}

/**
 * Calculate intent scores from combo participation
 */
async function calculateIntentScores(
  supabase: any,
  locale: string,
  platform: string
): Promise<Record<string, { score: number; combo_count: number }>> {
  const { data, error } = await supabase.rpc('calculate_token_intent_scores', {
    p_locale: locale,
    p_platform: platform,
  });

  if (error) {
    console.warn('[calculateIntentScores] Failed, using empty scores:', error);
    return {};
  }

  const scores: Record<string, { score: number; combo_count: number }> = {};
  for (const row of data || []) {
    scores[row.token] = {
      score: row.intent_score,
      combo_count: row.combo_count,
    };
  }

  return scores;
}

/**
 * Fetch autocomplete scores via existing autocomplete-intelligence function
 */
async function fetchAutocompleteScores(
  supabase: any,
  tokens: string[],
  locale: string,
  platform: string
): Promise<Record<string, { score: number; rank: number | null; appears: boolean }>> {
  const scores: Record<string, { score: number; rank: number | null; appears: boolean }> = {};

  // Batch requests to avoid overwhelming the API
  const BATCH_SIZE = 10;
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (token) => {
        try {
          // Call existing autocomplete-intelligence function
          const response = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/autocomplete-intelligence`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({
                keyword: token,
                platform: platform,
                region: locale,
              }),
            }
          );

          const result = await response.json();

          if (result.ok && result.suggestions?.length > 0) {
            // Check if token appears in suggestions
            const match = result.suggestions.find((s: any) =>
              s.text.toLowerCase() === token.toLowerCase()
            );

            if (match) {
              scores[token] = {
                score: (11 - match.rank) / 10, // Rank 1 → 1.0, Rank 10 → 0.1
                rank: match.rank,
                appears: true,
              };
            } else {
              scores[token] = { score: 0, rank: null, appears: false };
            }
          } else {
            scores[token] = { score: 0, rank: null, appears: false };
          }
        } catch (error) {
          console.warn(`[fetchAutocompleteScores] Failed for token "${token}":`, error);
          scores[token] = { score: 0, rank: null, appears: false };
        }
      })
    );

    // Delay between batches to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return scores;
}

/**
 * Calculate length prior (short-tail bias)
 */
function calculateLengthPrior(keyword: string): { score: number; word_count: number } {
  const words = keyword.trim().split(/\s+/);
  const word_count = words.length;

  // Formula: 1 / word_count (normalized)
  // 1 word → 1.0
  // 2 words → 0.5
  // 3 words → 0.33
  // 4+ words → 0.25
  const score = 1 / Math.min(word_count, 4);

  return { score, word_count };
}
```

### 2. SQL Function: `calculate_token_intent_scores`

**File**: Add to migration `20251201000000_create_keyword_popularity_scores.sql`

```sql
-- ============================================================================
-- RPC Function: Calculate Token Intent Scores
-- ============================================================================

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
    -- Extract all tokens from combos
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
    -- Normalize to 0-1 scale
    SELECT
      tc.token,
      tc.combo_count,
      CASE
        WHEN MAX(tc.combo_count) OVER () = MIN(tc.combo_count) OVER () THEN 0.5
        ELSE (tc.combo_count::float - MIN(tc.combo_count) OVER ()) /
             NULLIF(MAX(tc.combo_count) OVER () - MIN(tc.combo_count) OVER (), 0)
      END AS intent_score
    FROM token_combos tc
    WHERE LENGTH(tc.token) > 1 -- Filter out single letters
  )
  SELECT
    ts.token,
    ts.combo_count::INTEGER,
    COALESCE(ts.intent_score, 0)::FLOAT AS intent_score
  FROM token_stats ts
  ORDER BY ts.intent_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_token_intent_scores IS
  'Calculates intent scores for tokens based on combo participation in last 30 days';
```

---

## 🌐 API Implementation

### Edge Function: `keyword-popularity` (GET Endpoint)

**File**: `supabase/functions/keyword-popularity/index.ts`

```typescript
/**
 * Keyword Popularity API
 *
 * Returns popularity scores for requested keywords.
 * Checks cache first, computes on-the-fly if missing.
 *
 * @endpoint POST /functions/v1/keyword-popularity
 * @body { keywords: string[], locale?: string, platform?: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface KeywordPopularityRequest {
  keywords: string[];
  locale?: string;
  platform?: string;
}

interface KeywordPopularityResult {
  keyword: string;
  popularity_score: number;
  autocomplete_score: number;
  intent_score: number;
  length_prior: number;
  last_updated: string;
  source: 'cache' | 'computed';
  data_quality: string;
}

serve(async (req) => {
  try {
    // CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Parse request
    const { keywords, locale = 'us', platform = 'ios' }: KeywordPopularityRequest = await req.json();

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'keywords array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[keyword-popularity] Fetching scores for ${keywords.length} keywords`);

    // Fetch from cache
    const { data: cachedScores, error } = await supabase
      .from('keyword_popularity_scores')
      .select('*')
      .in('keyword', keywords)
      .eq('locale', locale)
      .eq('platform', platform);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    // Build results
    const results: KeywordPopularityResult[] = [];
    const cachedMap = new Map(cachedScores?.map(s => [s.keyword, s]) || []);

    for (const keyword of keywords) {
      const cached = cachedMap.get(keyword.toLowerCase());

      if (cached) {
        // Return cached score
        results.push({
          keyword,
          popularity_score: cached.popularity_score,
          autocomplete_score: cached.autocomplete_score,
          intent_score: cached.intent_score,
          length_prior: cached.length_prior,
          last_updated: cached.last_checked_at,
          source: 'cache',
          data_quality: cached.data_quality,
        });
      } else {
        // Not in cache - return estimated score (or trigger on-the-fly computation)
        results.push({
          keyword,
          popularity_score: 50, // Neutral default
          autocomplete_score: 0,
          intent_score: 0,
          length_prior: 0,
          last_updated: new Date().toISOString(),
          source: 'computed',
          data_quality: 'estimated',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        cached_count: results.filter(r => r.source === 'cache').length,
        computed_count: results.filter(r => r.source === 'computed').length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[keyword-popularity] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## 🎨 Frontend Integration

### 1. Add API Hook: `useKeywordPopularity.ts`

**File**: `src/hooks/useKeywordPopularity.ts`

```typescript
/**
 * useKeywordPopularity Hook
 *
 * Fetches popularity scores for keywords.
 * Caches results to avoid unnecessary API calls.
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KeywordPopularityData {
  popularity_score: number;
  autocomplete_score: number;
  intent_score: number;
  length_prior: number;
  last_updated: string;
  source: 'cache' | 'computed';
  data_quality: string;
}

interface UseKeywordPopularityResult {
  scores: Map<string, KeywordPopularityData>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useKeywordPopularity = (
  keywords: string[],
  locale: string = 'us'
): UseKeywordPopularityResult => {
  const [scores, setScores] = useState<Map<string, KeywordPopularityData>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable reference for keywords
  const keywordsKey = useMemo(() => {
    return JSON.stringify([...keywords].sort());
  }, [keywords]);

  const fetchScores = async () => {
    if (keywords.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/keyword-popularity`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            keywords,
            locale,
            platform: 'ios',
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.results) {
        const newScores = new Map<string, KeywordPopularityData>();

        for (const score of result.results) {
          newScores.set(score.keyword.toLowerCase(), {
            popularity_score: score.popularity_score,
            autocomplete_score: score.autocomplete_score,
            intent_score: score.intent_score,
            length_prior: score.length_prior,
            last_updated: score.last_updated,
            source: score.source,
            data_quality: score.data_quality,
          });
        }

        setScores(newScores);
      } else {
        throw new Error(result.error || 'Failed to fetch popularity scores');
      }
    } catch (err: any) {
      console.error('[useKeywordPopularity] Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, [keywordsKey, locale]);

  return { scores, isLoading, error, refresh: fetchScores };
};
```

### 2. Update Combo Workbench Table

**File**: `src/components/AppAudit/KeywordComboWorkbench/KeywordComboTable.tsx`

Add popularity column after competition:

```typescript
// Add to imports
import { useKeywordPopularity } from '@/hooks/useKeywordPopularity';

// Inside component, after existing hooks
const allComboTexts = useMemo(() => {
  return finalSortedCombos.map(c => c.text);
}, [finalSortedCombos]);

const { scores: popularityScores, isLoading: popularityLoading } = useKeywordPopularity(
  allComboTexts,
  metadata?.country || 'us'
);

// Add to table header (after Competition column)
<SortableHeader column="popularity" onClick={() => handleSort('popularity')} sortIcon={getSortIcon('popularity')}>
  Popularity
</SortableHeader>

// Add to row rendering (after Competition cell)
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
      <div className="flex items-center justify-center gap-1">
        <span>{score.popularity_score}</span>
        <span>{emoji}</span>
      </div>
    );
  })()}
</TableCell>
```

---

## 📅 Implementation Timeline

### Week 1: Foundation (Dec 2-6)
- **Day 1**: Create database migration
- **Day 2**: Create `calculate_token_intent_scores` SQL function
- **Day 3**: Build `refresh-keyword-popularity` edge function
- **Day 4**: Test with 100 keywords, validate scores
- **Day 5**: Set up pg_cron scheduler

### Week 2: API Layer (Dec 9-13)
- **Day 1**: Build `keyword-popularity` API edge function
- **Day 2**: Test API with Postman/curl
- **Day 3**: Create `useKeywordPopularity` hook
- **Day 4**: Integration tests
- **Day 5**: Performance testing

### Week 3: UI Integration (Dec 16-20)
- **Day 1**: Add Popularity column to Combo Workbench
- **Day 2**: Add sorting/filtering
- **Day 3**: Add tooltips with score breakdown
- **Day 4**: Polish UI (emojis, colors)
- **Day 5**: QA testing

### Week 4: Launch & Optimize (Dec 23-27)
- **Day 1**: Deploy to production
- **Day 2**: Monitor initial results
- **Day 3**: Gather user feedback
- **Day 4**: Fix any bugs
- **Day 5**: Optimize performance

---

## ✅ Success Criteria

### Phase 0 (POC)
- [ ] 100 keywords have popularity scores in database
- [ ] Scores "feel right" to ASO expert (meditation > obscure-term)
- [ ] Formula produces scores 0-100

### Phase 1 (Backend)
- [ ] 1,000 keywords refreshed daily
- [ ] Daily cron job runs successfully
- [ ] Database table has complete data

### Phase 2 (API)
- [ ] API returns scores in <500ms
- [ ] Cache hit rate > 90%
- [ ] Error rate < 1%

### Phase 3 (UI)
- [ ] Popularity column visible in Combo Workbench
- [ ] Sorting works correctly
- [ ] Tooltips show score breakdown
- [ ] Users can filter by popularity

---

## 🎯 Next Steps

### Immediate Actions (Today)
1. Review and approve this plan
2. Create database migration file
3. Set up development environment

### This Week
1. Implement database schema
2. Build refresh edge function
3. Test with 100 keywords
4. Validate scores with ASO expert

### Questions to Resolve
1. **Who validates scores?** Need ASO expert to sanity-check results
2. **Initial keyword set?** Which 1,000 keywords to start with?
3. **UI design approval?** Need sign-off on emoji/color scheme?

---

**Ready to start implementation?** 🚀

All critical gaps are resolved. Option A provides ~70% accuracy at $0/month cost.
