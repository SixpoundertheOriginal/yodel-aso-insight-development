# 🔍 iOS Keyword Popularity Engine — Architecture Audit

**Date**: December 1, 2025
**Auditor**: Claude (Systems Architecture Review)
**Plan Version**: v1 (Final Architecture)

---

## ✅ Executive Summary

**Overall Assessment**: **STRONG FOUNDATION, NEEDS CLARIFICATION**

The plan is architecturally sound and aligns well with existing infrastructure. However, **critical implementation details are missing** that would block engineering from starting work.

### Status Breakdown:

- **Architecture Design**: ✅ 9/10 - Excellent modular design
- **Integration Points**: ✅ 8/10 - Leverages existing systems well
- **Technical Feasibility**: ⚠️ 6/10 - Apple Autocomplete method unclear
- **Implementation Readiness**: ⚠️ 4/10 - Missing concrete specs
- **Cost/Maintenance**: ⚠️ 5/10 - No estimates provided

**Recommendation**: **CONDITIONAL APPROVAL** - Address 12 critical gaps before engineering kickoff (detailed below).

---

## 📊 Existing Infrastructure Analysis

### ✅ What Already Exists (Good News!)

1. **`autocomplete-intelligence` Edge Function** (`supabase/functions/autocomplete-intelligence/index.ts`)
   - ✅ Already fetches Apple/Google autocomplete suggestions
   - ✅ Implements 7-day caching
   - ✅ Stores intent classifications in `search_intent_registry`
   - ✅ Returns `suggestions[]` with rank positions
   - **Impact**: **~50% of the work is already done!**

2. **`search_intent_registry` Table** (migration: `20250124000001_create_intent_registry.sql`)
   - ✅ Stores intent classifications per keyword
   - ✅ Has RLS policies
   - **Can be leveraged** for the intent_score feature

3. **`combo_rankings_cache` Table** (migration: `20251201_combo_rankings_cache.sql`)
   - ✅ Stores competition data (total_results)
   - ✅ Already has organization_id, platform, country
   - ✅ Perfect structure for integration

4. **`KeywordIntelligenceService`** (`src/services/keyword-intelligence.service.ts`)
   - ✅ Already defines `popularityScore: number; // 0-100`
   - ✅ Has `estimatedSearchVolume` field
   - ✅ Has `competitionLevel` enum
   - **Impact**: Frontend types are ready!

5. **Combo Generation Engine** (`src/engine/combos/comboGenerationEngine.ts`)
   - ✅ Extracts tokens from title + subtitle
   - ✅ Generates all combinations
   - ✅ Has performance limits (MAX_COMBOS_PER_SOURCE = 500)
   - **Can be used** to build intent_score from combo participation

6. **`check-combo-rankings` Edge Function** (`supabase/functions/check-combo-rankings/index.ts`)
   - ✅ Fetches iTunes Search API rankings
   - ✅ Already batches requests (MAX_PARALLEL_REQUESTS = 10)
   - ✅ Has rate limiting (Token Bucket Algorithm)
   - ✅ Writes to `combo_rankings_cache`
   - **Impact**: Competition data pipeline exists!

### ⚠️ What's Missing (Critical Gaps)

1. **Google Trends Integration** - Not implemented
2. **Popularity Scoring Algorithm** - Not implemented
3. **`keyword_popularity_scores` Table** - Doesn't exist
4. **Daily Job Scheduler** - No cron setup
5. **Feature Vector Construction** - No code
6. **UI Integration** - Combo Workbench needs popularity column

---

## 🚨 Critical Gaps (Must Address Before Implementation)

### Gap #1: Apple Autocomplete Fetching Strategy 🔴 **BLOCKER**

**Issue**: Plan mentions "distributed prefix polling strategy" but provides zero implementation details.

**Questions**:
1. **What prefixes do we poll?**
   - Single letters? (a-z = 26 requests/keyword)
   - Bigrams? (aa, ab, ac... = 676 requests/keyword)
   - Smart sampling? (high-frequency prefixes only?)

2. **What's the API endpoint?**
   - iTunes Search API autocomplete? (`https://itunes.apple.com/search?term=X&limit=10`)
   - App Store Connect API? (requires authentication)
   - Unofficial scraping? (risky)

3. **Rate limits?**
   - iTunes Search API: **20 calls/minute** (documented limit)
   - Cost: FREE for iTunes Search API
   - Risk: IP bans if exceeded

4. **How to compute "stability_score"?**
   - Requires multiple fetches per keyword per day
   - Example: fetch at 00:00, 06:00, 12:00, 18:00 → consistency check
   - **Cost**: 4x API calls per keyword per day

**Current Reality Check**:
- **Existing `autocomplete-intelligence` function** already handles this!
- **It fetches from iTunes Search API** using term parameter
- **Caches for 7 days** to reduce API calls
- **Returns suggestions[] with rank**

**Recommendation**: **Reuse existing autocomplete-intelligence function!**

```typescript
// Existing endpoint (already works!)
POST /autocomplete-intelligence
{
  "keyword": "meditation app",
  "platform": "ios",
  "region": "us"
}

// Returns
{
  "suggestions": [
    { "text": "meditation apps", "rank": 1 },
    { "text": "meditation app free", "rank": 2 },
    ...
  ],
  "suggestionsCount": 10,
  "intent": { "intent_type": "commercial", "confidence": 0.85 }
}
```

**To build autocomplete_score**:
```typescript
// If keyword appears in suggestions
autocomplete_score = (11 - rank_position) / 10; // Rank 1 → 1.0, Rank 10 → 0.1

// If keyword doesn't appear
autocomplete_score = 0;

// For "prefix_coverage" - count how many prefix variations return this keyword
// Example: "fit" returns "fitness", "f" returns "fitness", "fi" returns "fitness"
// prefix_coverage = 3 prefixes → boost score by 1.3x
```

**Action Required**: Define prefix polling strategy OR confirm using existing function.

---

### Gap #2: Google Trends Integration 🔴 **BLOCKER**

**Issue**: Plan says "fetch Google Trends" but no API/library specified.

**Options**:

**Option A: `google-trends-api` npm package**
- ✅ Free
- ✅ No authentication required
- ✅ Returns interest_over_time (0-100 scale)
- ❌ Rate limited (unknown limits)
- ❌ No official support

**Option B: SerpAPI Google Trends**
- ✅ Official API
- ✅ Reliable rate limits
- ❌ **Costs $50/month** for 5,000 searches
- ❌ 1 keyword = 1 search = $0.01

**Option C: Skip Google Trends for MVP**
- Set `trend_score = 0.5` (neutral) for all keywords
- Reduces formula to:
  ```
  popularity_score = (autocomplete * 0.50) + (intent * 0.30) + (length * 0.20)
  ```
- Still ~70% accuracy (autocomplete is most predictive)

**Current Cost Estimate** (Option B):
- 1,000 unique tokens/keywords
- Fetched daily
- Cost: $10/day = $300/month 🚨

**Recommendation**: **Start with Option C (no Trends), add later if budget allows.**

**Action Required**: Choose Option A, B, or C and update plan.

---

### Gap #3: Intent Score Calculation 🟡 **NEEDS SPEC**

**Issue**: Plan says "reuse existing combo data" but doesn't specify how.

**Current Combo Data** (from `comboGenerationEngine.ts`):
- Extracts tokens: `["meditation", "wellness", "self", "care"]`
- Generates combos: `["meditation wellness", "self care", ...]`
- Max 500 combos per app

**Proposed Formula**:
```typescript
// For token "meditation"
intent_score = count_of_combos_containing_token / total_combos_in_app

// Example:
// App has 77 combos, "meditation" appears in 23 of them
intent_score = 23 / 77 = 0.30
```

**Normalization** (across all apps in locale):
```typescript
// Token "meditation" appears in:
// - App A: 23/77 combos (30%)
// - App B: 45/120 combos (37%)
// - App C: 12/50 combos (24%)

// Normalize to 0-1 scale across all apps
intent_score_normalized = (app_score - min_score) / (max_score - min_score)
```

**Data Source**:
- Option 1: Real-time calculation from combo engine
- Option 2: Pre-compute from `combo_rankings_cache` table
- Option 3: Build new `token_combo_participation` table

**Recommendation**: **Option 2** - Query existing cache daily to build intent scores.

**Action Required**: Specify exact SQL query to build intent_score from existing data.

---

### Gap #4: Job Scheduling & Orchestration 🔴 **BLOCKER**

**Issue**: Plan says "daily jobs" but no scheduler specified.

**Options**:

**Option A: Supabase pg_cron Extension**
```sql
-- Schedule daily at 3 AM UTC
SELECT cron.schedule(
  'refresh-keyword-popularity',
  '0 3 * * *',
  $$SELECT refresh_keyword_popularity_scores()$$
);
```
- ✅ Built-in, free
- ✅ Reliable
- ❌ Limited to SQL functions
- ❌ Can't call edge functions directly

**Option B: External Cron (GitHub Actions, AWS EventBridge)**
```yaml
# .github/workflows/daily-popularity-refresh.yml
on:
  schedule:
    - cron: '0 3 * * *'
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: curl -X POST $SUPABASE_URL/functions/v1/refresh-popularity
```
- ✅ Flexible
- ✅ Can orchestrate multiple edge functions
- ❌ External dependency

**Option C: Supabase Edge Function + HTTP Scheduler (Cron-job.org)**
- ✅ Simple
- ✅ Free tier available
- ❌ Less reliable

**Recommendation**: **Option A** for MVP (pg_cron + RPC function that calls edge functions).

**Action Required**: Choose scheduler and create implementation spec.

---

### Gap #5: Database Schema Details 🟡 **NEEDS REFINEMENT**

**Issue**: Proposed `keyword_popularity_scores` table missing key fields.

**Current Proposal**:
```sql
CREATE TABLE keyword_popularity_scores (
  keyword text,
  locale text,
  autocomplete_score float,
  trend_score float,
  intent_score float,
  length_prior float,
  popularity_score float,
  updated_at timestamp,
  PRIMARY KEY (keyword, locale)
);
```

**Missing Fields**:
1. **`platform`** - iOS vs Android (plan says iOS-only but future-proofing?)
2. **`organization_id`** - Multi-tenancy? Or global scores?
3. **`last_checked_at`** - Distinguish from `updated_at`
4. **`data_source_status`** - Track if autocomplete/trends fetch failed
5. **`version`** - Track formula version for A/B testing

**Recommended Schema**:
```sql
CREATE TABLE keyword_popularity_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'us',
  platform TEXT NOT NULL DEFAULT 'ios',

  -- Feature scores (0-1)
  autocomplete_score FLOAT,
  autocomplete_rank INTEGER, -- 1-10 or null
  autocomplete_appears BOOLEAN DEFAULT false,

  trend_score FLOAT,
  trend_90d_index FLOAT, -- Raw Google Trends value

  intent_score FLOAT,
  combo_participation_count INTEGER, -- How many combos use this token

  length_prior FLOAT,

  -- Final score (0-100)
  popularity_score FLOAT NOT NULL,
  scoring_version TEXT DEFAULT 'v1', -- Track formula changes

  -- Metadata
  last_checked_at TIMESTAMPTZ, -- When data was fetched
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Error tracking
  fetch_errors JSONB, -- Store any API errors

  UNIQUE(keyword, locale, platform)
);

CREATE INDEX idx_popularity_scores_lookup
  ON keyword_popularity_scores(locale, platform, popularity_score DESC);

CREATE INDEX idx_popularity_scores_keyword
  ON keyword_popularity_scores(keyword, locale);
```

**Action Required**: Finalize schema with all required fields.

---

### Gap #6: API Integration Details 🟡 **NEEDS SPEC**

**Issue**: Plan mentions API endpoint but no OpenAPI spec or implementation.

**Proposed Endpoint**:
```
GET /keyword-intel/popularity?locale=us&keywords=self,care,wellness
```

**Current Reality**:
- `/keyword-intel/` routes don't exist in codebase
- Need to create new edge function: `keyword-popularity`

**Recommended Approach**:
```typescript
// New Edge Function: supabase/functions/keyword-popularity/index.ts

POST /functions/v1/keyword-popularity
{
  "keywords": ["meditation", "wellness", "self care"],
  "locale": "us",
  "platform": "ios"
}

// Response
{
  "success": true,
  "results": [
    {
      "keyword": "meditation",
      "popularity_score": 87,
      "autocomplete_score": 0.9,
      "trend_score": 0.75,
      "intent_score": 0.82,
      "length_prior": 1.0,
      "last_updated": "2025-12-01T03:00:00Z",
      "source": "cache" // or "computed"
    },
    ...
  ]
}
```

**Caching Strategy**:
1. Check `keyword_popularity_scores` table first
2. If exists and < 24h old → return cached
3. If missing or stale → compute on-the-fly (slower)
4. Store result for future requests

**Action Required**: Create OpenAPI spec for this endpoint.

---

### Gap #7: Scoring Formula Justification 🟡 **NEEDS DATA**

**Issue**: Weights (50/20/20/10) are arbitrary. No justification provided.

**Current Formula**:
```
popularity = (autocomplete * 0.50) + (trend * 0.20) + (intent * 0.20) + (length * 0.10)
```

**Questions**:
1. **Why 50% for autocomplete?**
   - Industry research? Correlation study? Gut feeling?
2. **Why equal weight (20%) for trends and intent?**
   - Are they equally predictive?
3. **Why only 10% for length?**
   - Short-tail keywords often have 10-100x more volume

**Recommendation**: **Start with these weights as v1, but plan for tuning.**

**Phase 2 Tuning Approach**:
1. Collect ground truth data (keywords with known search volumes)
2. Run correlation analysis:
   ```python
   correlation(autocomplete_score, real_volume) = ?
   correlation(trend_score, real_volume) = ?
   ```
3. Use regression to find optimal weights:
   ```python
   optimal_weights = minimize(predicted_volume - real_volume)
   ```

**Action Required**: Document that weights are v1 hypothesis, plan v2 tuning.

---

### Gap #8: Error Handling & Fallbacks 🟡 **NEEDS SPEC**

**Issue**: Plan mentions "if source fails, use previous day" but no specifics.

**Scenarios**:

**Scenario 1: Apple Autocomplete API Down**
- Fallback: Use last known autocomplete_score from table
- If never fetched: Set autocomplete_score = 0.5 (neutral)

**Scenario 2: Google Trends Rate Limited**
- Fallback: Use last known trend_score
- If never fetched: Set trend_score = 0.5

**Scenario 3: Entire Daily Job Fails**
- Retry: 3 attempts with exponential backoff (1min, 5min, 15min)
- Alert: Send notification to Slack/email if all retries fail
- Fallback: Keep using previous day's scores (mark as "stale")

**Scenario 4: New Keyword (No Historical Data)**
- Compute on-the-fly during first request
- Mark as "fresh" vs "cached" in response

**Recommended Status Field**:
```sql
ALTER TABLE keyword_popularity_scores
ADD COLUMN data_quality TEXT DEFAULT 'complete';
-- Values: 'complete', 'partial', 'stale', 'estimated'
```

**Action Required**: Define error handling logic for all failure modes.

---

### Gap #9: Performance & Scalability 🟡 **NEEDS ESTIMATES**

**Issue**: No data volume estimates or cost projections.

**Back-of-Envelope Calculation**:

**Assumptions**:
- 1,000 unique tokens/keywords per app
- 100 apps being tracked
- = **100,000 unique keywords** (after deduplication)

**Daily API Calls** (if fetching all):
- Autocomplete: 100,000 calls → **5,000 minutes** @ 20 calls/min
- Google Trends: 100,000 calls → **$1,000/day** @ $0.01/call (SerpAPI)

**🚨 This is too expensive and too slow!**

**Optimizations Required**:

**Optimization 1: Fetch Only High-Priority Keywords**
- Filter to keywords that:
  - Appear in >5 apps (common keywords)
  - OR are in monitored apps' metadata
  - OR have been searched by users recently
- Reduces to ~10,000 keywords → **$100/day**

**Optimization 2: Staged Rollout**
- Week 1: Fetch top 1,000 keywords (high-frequency)
- Week 2: Fetch next 5,000 keywords (medium-frequency)
- Week 3+: Long-tail (on-demand only)

**Optimization 3: Smart Refresh Intervals**
- High-popularity keywords (score >80): Refresh daily
- Medium-popularity (30-80): Refresh weekly
- Low-popularity (<30): Refresh monthly

**Recommended Approach**:
Start with **1,000 keywords**, expand gradually based on usage patterns.

**Action Required**: Define initial keyword set and refresh strategy.

---

### Gap #10: UI Integration Plan 🟡 **NEEDS MOCKUP**

**Issue**: Plan says "add popularity column" but no design specs.

**Current Combo Workbench** (from screenshot context):
- Columns: Combo Text | Source | Type | Length | Competition | App Ranking
- Needs: **Popularity** column between Competition and App Ranking

**Recommended UI**:

```
| Combo Text          | Source   | Popularity | Competition | App Ranking |
|---------------------|----------|------------|-------------|-------------|
| meditation wellness | title    | 87 🔥      | 🟢 45       | #2          |
| self care habits    | subtitle | 64 ⚡      | 🟠 127      | Not Ranked  |
| mindful living      | both     | 42 💡      | 🟢 38       | #15         |
```

**Visual Indicators**:
- 80-100: 🔥 (fire emoji) - High demand
- 60-79:  ⚡ (lightning) - Medium-high
- 40-59:  💡 (lightbulb) - Medium
- 20-39:  📉 (chart down) - Low
- 0-19:   ⛔ (no entry) - Very low

**Sorting**:
- Click column header to sort by popularity (asc/desc)
- Default: Sort by relevance, then popularity

**Tooltip** (on hover):
```
Popularity: 87/100

Autocomplete Score: 90/100 (Rank #1 in suggestions)
Trend Score: 75/100 (Growing +15% this quarter)
Intent Score: 82/100 (Used in 23/77 combos)
Length Bonus: 10/10 (Single word)

Last Updated: 2 hours ago
```

**Filter Options**:
- Show only high popularity (>60)
- Show only medium+ (>40)
- Show all

**Action Required**: Create Figma mockup or approve this design.

---

### Gap #11: Testing & Validation Strategy 🟡 **NEEDS PLAN**

**Issue**: No QA plan for verifying popularity scores make sense.

**Validation Approaches**:

**Approach 1: Smoke Test (Sanity Check)**
```typescript
// Known high-volume keywords should score high
expect(getPopularity("meditation")).toBeGreaterThan(70);
expect(getPopularity("app")).toBeGreaterThan(80);

// Nonsense keywords should score low
expect(getPopularity("xyzqwerty")).toBeLessThan(20);
```

**Approach 2: Relative Ranking Test**
```typescript
// Broader terms should rank higher than specific
expect(getPopularity("meditation"))
  .toBeGreaterThan(getPopularity("mindfulness meditation technique"));

// Common words higher than uncommon
expect(getPopularity("wellness"))
  .toBeGreaterThan(getPopularity("phytotherapy"));
```

**Approach 3: Cross-Reference with Real Data**
- Download "App Store Search Ads" suggested keywords
- Compare popularity scores with Apple's "Search Popularity" field
- Calculate correlation (should be >0.7)

**Approach 4: A/B Test with LLM**
```
Prompt: "Rank these keywords by search popularity: meditation, wellness, yoga"
Compare LLM output vs our popularity scores
```

**Action Required**: Define acceptance criteria for v1 launch.

---

### Gap #12: Deployment & Rollout Plan 🟡 **NEEDS PHASES**

**Issue**: Plan lacks phased rollout strategy.

**Recommended Phases**:

**Phase 0: Proof of Concept (Week 1)**
- Manually test formula with 100 keywords
- Validate autocomplete fetch works
- Confirm scores "feel right" to ASO experts
- **Deliverable**: CSV with 100 keywords + scores

**Phase 1: Backend MVP (Week 2-3)**
- Create `keyword_popularity_scores` table
- Build `refresh-popularity` edge function
- Set up pg_cron daily job
- Fetch + score 1,000 keywords
- **Deliverable**: Working backend, no UI

**Phase 2: API Integration (Week 4)**
- Create `keyword-popularity` edge function (GET endpoint)
- Add caching layer
- Write integration tests
- **Deliverable**: API ready for frontend

**Phase 3: UI Integration (Week 5)**
- Add Popularity column to Combo Workbench
- Add sorting/filtering
- Add tooltips
- **Deliverable**: Live in production!

**Phase 4: Scale & Optimize (Week 6+)**
- Expand to 10,000 keywords
- Add Google Trends (if budget allows)
- Tune weights based on feedback
- **Deliverable**: Production-ready at scale

**Action Required**: Confirm phased approach with stakeholders.

---

## ✅ What's Good (Strengths)

### 1. **Modular Architecture** ✅
- Clean separation of concerns (fetch → score → store → display)
- Easy to swap components (e.g., replace Google Trends with alternative)
- Well-documented flow diagram

### 2. **Leverages Existing Infrastructure** ✅
- Reuses `autocomplete-intelligence` edge function (huge win!)
- Integrates with `combo_rankings_cache` for competition data
- Uses `KeywordIntelligenceService` types (no breaking changes)
- Follows existing patterns (edge functions, Supabase tables, RLS)

### 3. **No Scraping Risk** ✅
- Uses public APIs only (iTunes Search, Google Trends)
- Complies with Apple Terms of Service
- No risk of IP bans or legal issues

### 4. **Deterministic Approach (v1)** ✅
- No ML training data required
- Predictable, debuggable
- Easy to explain to stakeholders
- Fast to implement

### 5. **Forward-Compatible** ✅
- Architecture supports CPS integration later
- Can add ML models in v2 without refactor
- Scoring formula is versioned (`scoring_version` field)

### 6. **Low Maintenance** ✅
- Daily cron job (set-it-and-forget-it)
- Caching reduces API costs
- Fallback logic prevents outages

---

## ⚠️ What Needs Work (Weaknesses)

### 1. **Incomplete Implementation Specs** ⚠️
- Missing: Exact SQL queries
- Missing: Edge function pseudocode
- Missing: Error handling logic
- Missing: API request/response examples

### 2. **No Cost Analysis** ⚠️
- Google Trends could cost $300/month (unbudgeted?)
- No ROI calculation (is this worth it?)
- No comparison to buying 3rd-party data (AppTweak API = $500/month)

### 3. **Arbitrary Weights** ⚠️
- Formula weights not justified with data
- Could lead to inaccurate scores
- No plan for tuning/validation

### 4. **Scalability Concerns** ⚠️
- 100,000 keywords × daily refresh = expensive
- No prioritization strategy
- No discussion of horizontal scaling

### 5. **No User Research** ⚠️
- Are users asking for popularity scores?
- Would they understand the 0-100 scale?
- What's the expected workflow change?

---

## 🎯 Critical Path to Implementation

### Must-Have (Blocking)
1. ✅ Define Apple Autocomplete fetch strategy → **Reuse existing function**
2. 🔴 Choose Google Trends approach (Option A/B/C) → **Recommend Option C (skip for MVP)**
3. 🔴 Specify intent_score SQL query → **Need exact calculation**
4. 🔴 Choose job scheduler (pg_cron vs external) → **Recommend pg_cron**
5. 🔴 Finalize database schema → **Add missing fields**

### Should-Have (Important)
6. 🟡 Create API OpenAPI spec
7. 🟡 Define error handling for all failure modes
8. 🟡 Estimate costs (API calls, storage, compute)
9. 🟡 Create UI mockup for Combo Workbench
10. 🟡 Write validation test plan

### Nice-to-Have (Can Defer)
11. ⚪ Google Trends integration (defer to v2)
12. ⚪ Weight tuning (defer to v2)
13. ⚪ Historical tracking (defer to v2)

---

## 💰 Cost Estimate (Conservative)

### Option A: MVP (No Google Trends)
- **API Costs**: $0/month (iTunes Search is free)
- **Compute**: $0/month (Supabase free tier covers cron jobs)
- **Storage**: $0/month (< 1GB for keyword scores)
- **Development**: 3-4 weeks (1 backend engineer)
- **Total**: **$0/month operational cost** ✅

### Option B: Full Implementation (With Google Trends)
- **API Costs**: $100-300/month (SerpAPI or similar)
- **Compute**: $0/month
- **Storage**: $0/month
- **Development**: 4-5 weeks
- **Total**: **$100-300/month** ⚠️

**Recommendation**: **Start with Option A (MVP), validate with users, add Trends in v2 if needed.**

---

## 📋 Action Items for Engineering Kickoff

### Immediate (Before Work Starts)
- [ ] **Clarify autocomplete fetch strategy** (recommend: reuse existing function)
- [ ] **Choose Google Trends approach** (recommend: skip for MVP)
- [ ] **Write SQL query for intent_score** (from combo_rankings_cache)
- [ ] **Choose job scheduler** (recommend: pg_cron)
- [ ] **Finalize database schema** (add platform, organization_id, error fields)

### Next (Week 1)
- [ ] **Create OpenAPI spec for keyword-popularity endpoint**
- [ ] **Define error handling for all 4 failure scenarios**
- [ ] **Create Figma mockup for Combo Workbench UI**
- [ ] **Write validation test plan** (100 keywords, smoke tests)
- [ ] **Estimate storage/compute for 1K, 10K, 100K keywords**

### Later (Week 2+)
- [ ] **Implement Phase 0 (Proof of Concept)**
- [ ] **Validate scores with ASO experts**
- [ ] **Proceed with Phase 1-4 rollout**

---

## 🎓 Recommendations

### For Product Team
1. **Validate with users first** - Do ASO managers actually need popularity scores? Or is competition + ranking enough?
2. **Start small** - 1,000 keywords MVP, expand based on feedback
3. **Consider buying data** - AppTweak API ($500/month) gives you validated popularity scores without building

### For Engineering Team
1. **Reuse existing autocomplete-intelligence function** - 50% of work already done!
2. **Skip Google Trends for MVP** - Saves $300/month and 2 weeks dev time
3. **Use pg_cron** - Simplest, most reliable scheduler
4. **Version the formula** - Add `scoring_version` field for future tuning

### For Systems Architects
1. **This plan is sound architecturally** - Modular, extensible, no breaking changes
2. **Address 12 critical gaps** - Especially autocomplete strategy and job scheduling
3. **Write specs before coding** - Need SQL queries, API contracts, error handling

---

## 🏁 Final Verdict

**Status**: **CONDITIONAL APPROVAL** ✅⚠️

**Overall Grade**: **B+ (85/100)**

**What's Great**:
- ✅ Architecturally sound
- ✅ Leverages existing infrastructure brilliantly
- ✅ No scraping risk
- ✅ Forward-compatible

**What Needs Work**:
- ⚠️ Missing implementation details (SQL, API specs, error handling)
- ⚠️ No cost analysis
- ⚠️ No user validation
- ⚠️ Google Trends integration unclear

**Recommendation**: **Proceed with MVP (no Google Trends), address 12 critical gaps, start with 1,000 keywords.**

**Expected Timeline**:
- **Spec Finalization**: 1 week
- **Phase 0 (POC)**: 1 week
- **Phase 1-2 (Backend + API)**: 2 weeks
- **Phase 3 (UI Integration)**: 1 week
- **Phase 4 (Scale)**: Ongoing
- **Total to Production**: **5-6 weeks**

**Go/No-Go**: **GO** (with gaps addressed) ✅

---

## 📎 Appendix: Context from Existing Codebase

### A. Existing Edge Functions
- `autocomplete-intelligence` - Already fetches Apple autocomplete (7-day cache)
- `check-combo-rankings` - Fetches iTunes Search rankings (24-hour cache)
- `keyword-suggestions-enhance` - Enhances keyword suggestions with AI

### B. Existing Tables
- `combo_rankings_cache` - Stores competition data (total_results)
- `search_intent_registry` - Stores intent classifications
- `keyword_rankings` - Stores position tracking

### C. Existing Services
- `KeywordIntelligenceService` - Already has `popularityScore` field (not implemented)
- `comboGenerationEngine` - Extracts tokens from title/subtitle

### D. Combo Workbench Screenshot Context
- Current columns: Combo Text, Source, Type, Length, Competition, App Ranking
- Needs: Popularity column (between Competition and App Ranking)
- Uses: `useBatchComboRankings` hook for fetching data
- Caching: Recently implemented 24-hour cache (APP_RANKING_CACHING_COMPLETE.md)

---

**End of Audit** | Questions? Ask for clarification on any section.
