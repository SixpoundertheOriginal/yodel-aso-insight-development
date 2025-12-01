# Combination Prioritization with Real Analytics Data

**Status:** 🎯 DESIGN PHASE - Using Actual Data
**Date:** 2025-12-01
**Discovery:** System already has ranking, popularity, and competition data!

---

## Confirmed Strength Hierarchy

Based on user answers:

```
🔥🔥🔥 TIER 1: Title Consecutive (STRONGEST)
└─ e.g., "meditation sleep" in title

🔥🔥 TIER 2: Title Non-Consecutive
└─ e.g., "meditation timer" from "Meditation & Sleep Timer"

🔥⚡ TIER 2: Title + Keywords (SAME WEIGHT as Title + Subtitle)
⚡   TIER 2: Title + Subtitle
└─ e.g., "meditation stress" (title + keywords)

💤 TIER 3: Keywords/Subtitle Same-Field
├─ Keywords Consecutive
├─ Keywords Non-Consecutive
├─ Subtitle Consecutive
└─ Subtitle Non-Consecutive
└─ e.g., "stress anxiety" in keywords field

💤⚡ TIER 4: Keywords + Subtitle Cross
└─ e.g., "stress mindfulness" (both weak fields)

💤💤 TIER 5: Three-Way Cross (Separate Tier)
└─ e.g., "meditation mindfulness stress" (title + subtitle + keywords)

❌ MISSING: Not in any field
```

**Key Rules:**
- Same-field combos rank higher than cross-element within same tier
- No field boundaries for consecutiveness (App Store sees combined text)
- Title + Keywords = Title + Subtitle (equal weight)

---

## Available Real Data

### Data Sources Discovered

#### 1. Combo Rankings (`useBatchComboRankings`)

```typescript
interface ComboRankingData {
  position: number | null;        // Where app ranks (1-100+)
  isRanking: boolean;             // Whether app ranks at all
  totalResults: number | null;    // Total competing apps (0-100+)
  trend: 'up' | 'down' | 'stable' | 'new' | null;
  positionChange: number | null;  // Change since last check
  visibilityScore: number | null; // Computed visibility metric
  snapshotDate: string;           // When data was captured
}
```

**What this gives us:**
- ✅ Current ranking position
- ✅ Competition level (totalResults)
- ✅ Ranking momentum (trend)
- ✅ Visibility potential

---

#### 2. Keyword Popularity (`useKeywordPopularity`)

```typescript
interface KeywordPopularityData {
  popularity_score: number;       // 0-100 (search volume proxy)
  autocomplete_score: number;     // 0-1 (autocomplete frequency)
  intent_score: number;           // 0-1 (intent relevance)
  length_prior: number;           // 0-1 (length adjustment)
  last_updated: string;
  source: 'cache' | 'computed';
  data_quality: string;           // 'complete' | 'partial' | 'stale' | 'estimated'
}
```

**What this gives us:**
- ✅ Search volume estimate (popularity_score)
- ✅ User intent signals
- ✅ Autocomplete presence (high-value indicator)

---

#### 3. Difficulty Score (Database)

```typescript
// From database: keyword_rankings table
interface KeywordDifficulty {
  difficulty_score: number;       // 0-10 (how hard to rank)
}
```

**What this gives us:**
- ✅ Ranking difficulty estimate

---

## Prioritization Algorithm Design

### Formula Overview

```
Priority Score (0-100) =
  Strength Score (30%)          // Metadata position (title > subtitle)
  + Popularity Score (25%)      // Search volume
  + Opportunity Score (20%)     // Competition vs Position balance
  + Trend Score (15%)           // Ranking momentum
  + Intent Score (10%)          // User intent relevance
```

**Rationale:**
- **Strength (30%)** - Foundation: Where combo appears matters most
- **Popularity (25%)** - Traffic potential: High-volume = high value
- **Opportunity (20%)** - Strategic: Low competition + not ranking = opportunity
- **Trend (15%)** - Momentum: Rising rankings = working strategy
- **Intent (10%)** - Relevance: User intent match = conversion

---

### Component 1: Strength Score (30%)

**Based on confirmed hierarchy:**

```typescript
function calculateStrengthScore(combo: GeneratedCombo): number {
  // Map strength to 0-100 scale
  const strengthMap = {
    TITLE_CONSECUTIVE: 100,           // 🔥🔥🔥
    TITLE_NON_CONSECUTIVE: 90,        // 🔥🔥
    TITLE_KEYWORDS_CROSS: 80,         // 🔥⚡
    TITLE_SUBTITLE_CROSS: 80,         // ⚡ (equal to title+keywords)
    KEYWORDS_CONSECUTIVE: 60,         // 💤
    KEYWORDS_NON_CONSECUTIVE: 55,     // 💤
    SUBTITLE_CONSECUTIVE: 60,         // 💤 (equal to keywords)
    SUBTITLE_NON_CONSECUTIVE: 55,     // 💤
    KEYWORDS_SUBTITLE_CROSS: 40,      // 💤⚡
    THREE_WAY_CROSS: 30,              // 💤💤
    MISSING: 0,                       // ❌
  };

  return strengthMap[combo.strength] || 0;
}
```

**Weight:** 30% of total score

---

### Component 2: Popularity Score (25%)

**Uses real `popularity_score` from useKeywordPopularity:**

```typescript
function calculatePopularityScore(
  combo: GeneratedCombo,
  popularityData: Map<string, KeywordPopularityData>
): number {
  // Get average popularity across all keywords in combo
  let totalPopularity = 0;
  let foundCount = 0;

  for (const keyword of combo.keywords) {
    const data = popularityData.get(keyword.toLowerCase());
    if (data) {
      totalPopularity += data.popularity_score;
      foundCount++;
    }
  }

  if (foundCount === 0) {
    return 50; // Default: medium popularity (unknown)
  }

  // Average popularity across keywords
  const avgPopularity = totalPopularity / foundCount;

  // Already 0-100 scale
  return avgPopularity;
}
```

**Weight:** 25% of total score

**❓ QUESTION 1:** Should we use average or minimum popularity of keywords?
- Average = "meditation sleep" gets (popularity_meditation + popularity_sleep) / 2
- Minimum = limited by weakest keyword (more conservative)

---

### Component 3: Opportunity Score (20%)

**Strategic metric: Competition vs Current Ranking**

```typescript
function calculateOpportunityScore(
  combo: GeneratedCombo,
  rankingData: ComboRankingData | undefined
): number {
  if (!rankingData) {
    // No ranking data - assume medium opportunity
    return 50;
  }

  const { position, totalResults } = rankingData;

  // Scenario 1: Not ranking + Low competition = HIGH OPPORTUNITY
  if (!position || position > 100) {
    if (totalResults && totalResults < 30) {
      return 100; // Blue ocean! Not ranking in low-competition keyword
    }
    if (totalResults && totalResults < 60) {
      return 80; // Good opportunity
    }
    return 60; // Medium opportunity
  }

  // Scenario 2: Ranking well = Already captured opportunity
  if (position <= 10) {
    return 40; // Already winning, focus elsewhere
  }

  // Scenario 3: Ranking poorly + High competition = LOW OPPORTUNITY
  if (position > 50 && totalResults && totalResults > 80) {
    return 20; // Uphill battle
  }

  // Scenario 4: Mid-range = Some opportunity
  if (position <= 30) {
    return 70; // Can improve to top 10
  }

  return 50; // Medium opportunity
}
```

**Weight:** 20% of total score

**❓ QUESTION 2:** Should we prioritize "not ranking + low competition" or "ranking 20th + high volume"?
- Option A: Blue ocean strategy (unranked low-competition)
- Option B: Improvement strategy (already ranking, push to top 10)

---

### Component 4: Trend Score (15%)

**Momentum indicator:**

```typescript
function calculateTrendScore(
  combo: GeneratedCombo,
  rankingData: ComboRankingData | undefined
): number {
  if (!rankingData) {
    return 50; // Neutral: no trend data
  }

  const { trend, positionChange } = rankingData;

  // Strong upward momentum
  if (trend === 'up' && positionChange && positionChange < -10) {
    return 100; // Rising fast! Keep pushing
  }

  // Moderate upward momentum
  if (trend === 'up' && positionChange && positionChange < -5) {
    return 85;
  }

  // Slight upward momentum
  if (trend === 'up') {
    return 70;
  }

  // New ranking (just started ranking)
  if (trend === 'new') {
    return 80; // New momentum, good sign
  }

  // Stable (no change)
  if (trend === 'stable') {
    return 50; // Neutral
  }

  // Downward trend
  if (trend === 'down' && positionChange && positionChange > 10) {
    return 20; // Falling fast, might be losing relevance
  }

  if (trend === 'down') {
    return 35; // Declining
  }

  return 50; // Default: no trend
}
```

**Weight:** 15% of total score

**❓ QUESTION 3:** Should downward trends be deprioritized or prioritized?
- Deprioritize = Focus on what's working (upward trends)
- Prioritize = Fix what's broken (downward trends need attention)

---

### Component 5: Intent Score (10%)

**User intent relevance:**

```typescript
function calculateIntentScore(
  combo: GeneratedCombo,
  popularityData: Map<string, KeywordPopularityData>
): number {
  // Get average intent score across keywords
  let totalIntent = 0;
  let foundCount = 0;

  for (const keyword of combo.keywords) {
    const data = popularityData.get(keyword.toLowerCase());
    if (data) {
      totalIntent += data.intent_score; // 0-1 scale
      foundCount++;
    }
  }

  if (foundCount === 0) {
    return 50; // Default: medium intent
  }

  // Average intent across keywords
  const avgIntent = totalIntent / foundCount;

  // Scale from 0-1 to 0-100
  return avgIntent * 100;
}
```

**Weight:** 10% of total score

---

## Combined Priority Calculation

### Implementation

```typescript
interface ComboPriorityScore {
  strengthScore: number;        // 0-100
  popularityScore: number;      // 0-100
  opportunityScore: number;     // 0-100
  trendScore: number;           // 0-100
  intentScore: number;          // 0-100

  totalScore: number;           // Weighted sum: 0-100

  // Metadata for display
  hasRankingData: boolean;
  hasPopularityData: boolean;
  dataQuality: 'complete' | 'partial' | 'estimated';
}

function calculateComboPriority(
  combo: GeneratedCombo,
  rankingData: ComboRankingData | undefined,
  popularityData: Map<string, KeywordPopularityData>
): ComboPriorityScore {
  const strengthScore = calculateStrengthScore(combo);
  const popularityScore = calculatePopularityScore(combo, popularityData);
  const opportunityScore = calculateOpportunityScore(combo, rankingData);
  const trendScore = calculateTrendScore(combo, rankingData);
  const intentScore = calculateIntentScore(combo, popularityData);

  // Weighted sum
  const totalScore =
    (strengthScore * 0.30) +
    (popularityScore * 0.25) +
    (opportunityScore * 0.20) +
    (trendScore * 0.15) +
    (intentScore * 0.10);

  // Data quality assessment
  const hasRankingData = !!rankingData;
  const hasPopularityData = combo.keywords.some(kw =>
    popularityData.has(kw.toLowerCase())
  );

  let dataQuality: 'complete' | 'partial' | 'estimated';
  if (hasRankingData && hasPopularityData) {
    dataQuality = 'complete';
  } else if (hasRankingData || hasPopularityData) {
    dataQuality = 'partial';
  } else {
    dataQuality = 'estimated';
  }

  return {
    strengthScore,
    popularityScore,
    opportunityScore,
    trendScore,
    intentScore,
    totalScore,
    hasRankingData,
    hasPopularityData,
    dataQuality,
  };
}
```

---

## Example Calculations

### Example 1: High-Priority Combo

**Combo:** "meditation stress" (title + keywords)

```typescript
Input Data:
  strength: TITLE_KEYWORDS_CROSS
  ranking: { position: null, totalResults: 25, trend: null }
  popularity: { meditation: 85, stress: 78 }
  intent: { meditation: 0.8, stress: 0.7 }

Calculation:
  Strength:     80/100  (Title + Keywords tier)
  Popularity:   81.5/100  ((85 + 78) / 2)
  Opportunity:  100/100  (Not ranking + low competition)
  Trend:        50/100  (No trend data)
  Intent:       75/100  ((0.8 + 0.7) / 2 * 100)

  Total Score = (80 × 0.30) + (81.5 × 0.25) + (100 × 0.20) + (50 × 0.15) + (75 × 0.10)
              = 24 + 20.375 + 20 + 7.5 + 7.5
              = 79.375/100

Priority: HIGH (79.4/100)
Reason: Title+Keywords combo, high popularity, blue ocean opportunity
```

---

### Example 2: Medium-Priority Combo

**Combo:** "mindfulness wellness" (subtitle consecutive)

```typescript
Input Data:
  strength: SUBTITLE_CONSECUTIVE
  ranking: { position: 45, totalResults: 85, trend: 'stable' }
  popularity: { mindfulness: 62, wellness: 58 }
  intent: { mindfulness: 0.6, wellness: 0.5 }

Calculation:
  Strength:     60/100  (Subtitle tier)
  Popularity:   60/100  ((62 + 58) / 2)
  Opportunity:  50/100  (Mid-range ranking, high competition)
  Trend:        50/100  (Stable, no momentum)
  Intent:       55/100  ((0.6 + 0.5) / 2 * 100)

  Total Score = (60 × 0.30) + (60 × 0.25) + (50 × 0.20) + (50 × 0.15) + (55 × 0.10)
              = 18 + 15 + 10 + 7.5 + 5.5
              = 56/100

Priority: MEDIUM (56/100)
Reason: Subtitle combo (weak position), medium popularity, already ranking but not improving
```

---

### Example 3: Low-Priority Combo

**Combo:** "meditation sleep" (title consecutive) - Already ranking #3

```typescript
Input Data:
  strength: TITLE_CONSECUTIVE
  ranking: { position: 3, totalResults: 95, trend: 'stable' }
  popularity: { meditation: 85, sleep: 82 }
  intent: { meditation: 0.8, sleep: 0.9 }

Calculation:
  Strength:     100/100  (Title consecutive - strongest)
  Popularity:   83.5/100  ((85 + 82) / 2)
  Opportunity:  40/100   (Already ranking top 10)
  Trend:        50/100   (Stable)
  Intent:       85/100   ((0.8 + 0.9) / 2 * 100)

  Total Score = (100 × 0.30) + (83.5 × 0.25) + (40 × 0.20) + (50 × 0.15) + (85 × 0.10)
              = 30 + 20.875 + 8 + 7.5 + 8.5
              = 74.875/100

Priority: HIGH-MEDIUM (74.9/100)
Reason: Strong combo, high popularity BUT already winning - focus effort elsewhere
```

**❓ QUESTION 4:** Should "already ranking well" combos be deprioritized or kept high?
- Deprioritize = Focus on opportunities (what we're NOT ranking for)
- Keep high = Protect what's working (maintain top rankings)

---

## Top 500 Selection Strategy

### Strategy Overview

With 3,000+ possible combos, we need to select top 500:

```typescript
function selectTop500Combos(
  allCombos: GeneratedCombo[],
  rankingData: Map<string, ComboRankingData>,
  popularityData: Map<string, KeywordPopularityData>
): GeneratedCombo[] {
  // 1. Calculate priority for all combos
  const scoredCombos = allCombos.map(combo => ({
    combo,
    priority: calculateComboPriority(combo, rankingData.get(combo.text), popularityData)
  }));

  // 2. Sort by total score descending
  scoredCombos.sort((a, b) => b.priority.totalScore - a.priority.totalScore);

  // 3. Apply diversity rules (optional)
  const selected = applyDiversityRules(scoredCombos.slice(0, 500));

  // 4. Return top 500
  return selected.map(s => s.combo);
}
```

---

### Diversity Rules (Optional)

**Problem:** Top 500 might be dominated by one element

**Solution:** Ensure mix of combo types

```typescript
function applyDiversityRules(
  topCombos: Array<{ combo: GeneratedCombo; priority: ComboPriorityScore }>
): Array<{ combo: GeneratedCombo; priority: ComboPriorityScore }> {
  // Ensure minimum representation of each tier:
  // - 30% Title combos (strongest)
  // - 30% Title cross-element (title + keywords/subtitle)
  // - 20% Keywords/Subtitle same-field
  // - 20% Other cross-elements

  // Count by tier
  const tiers = {
    titleOnly: topCombos.filter(c =>
      c.combo.strength === 'TITLE_CONSECUTIVE' ||
      c.combo.strength === 'TITLE_NON_CONSECUTIVE'
    ),
    titleCross: topCombos.filter(c =>
      c.combo.strength === 'TITLE_KEYWORDS_CROSS' ||
      c.combo.strength === 'TITLE_SUBTITLE_CROSS'
    ),
    secondaryField: topCombos.filter(c =>
      c.combo.strength.includes('KEYWORDS_') ||
      c.combo.strength.includes('SUBTITLE_')
    ),
    other: topCombos.filter(c =>
      c.combo.strength === 'THREE_WAY_CROSS' ||
      c.combo.strength === 'KEYWORDS_SUBTITLE_CROSS'
    ),
  };

  // If imbalanced, adjust...
  // (Implementation details depend on requirements)

  return topCombos;
}
```

**❓ QUESTION 5:** Should we enforce diversity rules or pure score-based selection?
- Pure score = Top 500 by priority only (might be 450 title combos + 50 others)
- Diversity = Ensure mix (e.g., 200 title + 150 title-cross + 100 secondary + 50 other)

---

## Integration Plan

### Phase 1: Add Priority Calculation

**Update combo generation engine:**

```typescript
// src/engine/combos/comboGenerationEngine.ts

export interface GeneratedCombo {
  text: string;
  keywords: string[];
  length: number;
  exists: boolean;
  source?: 'title' | 'subtitle' | 'keywords' | 'both' | 'missing';

  // Strength classification (already implemented)
  strength: ComboStrength;
  isConsecutive?: boolean;
  canStrengthen: boolean;
  strengtheningSuggestion?: string;

  // NEW: Priority scoring
  priorityScore?: number;           // 0-100 total score
  strengthScore?: number;
  popularityScore?: number;
  opportunityScore?: number;
  trendScore?: number;
  intentScore?: number;
  dataQuality?: 'complete' | 'partial' | 'estimated';
}
```

---

### Phase 2: Fetch Analytics Data

**In Workbench component:**

```typescript
// src/components/AppAudit/KeywordComboWorkbench/EnhancedKeywordComboWorkbench.tsx

const [comboAnalysis, setComboAnalysis] = useState(() => {
  return analyzeAllCombos(
    keywordCoverage.titleKeywords,
    keywordCoverage.subtitleNewKeywords,
    metadata.title,
    metadata.subtitle,
    comboCoverage.titleCombosClassified,
    appBrand
  );
});

// NEW: Fetch analytics data for all combos
const allComboTexts = comboAnalysis.allPossibleCombos.map(c => c.text);

const { rankings, isLoading: rankingsLoading } = useBatchComboRankings(
  metadata.appId,
  allComboTexts,
  metadata.country || 'us'
);

const allKeywords = Array.from(
  new Set(
    comboAnalysis.allPossibleCombos.flatMap(c => c.keywords)
  )
);

const { scores: popularityScores, isLoading: popularityLoading } = useKeywordPopularity(
  allKeywords,
  metadata.country || 'us'
);

// NEW: Calculate priorities once data loaded
useEffect(() => {
  if (!rankingsLoading && !popularityLoading) {
    const updatedCombos = comboAnalysis.allPossibleCombos.map(combo => {
      const priority = calculateComboPriority(
        combo,
        rankings.get(combo.text),
        popularityScores
      );

      return {
        ...combo,
        priorityScore: priority.totalScore,
        strengthScore: priority.strengthScore,
        popularityScore: priority.popularityScore,
        opportunityScore: priority.opportunityScore,
        trendScore: priority.trendScore,
        intentScore: priority.intentScore,
        dataQuality: priority.dataQuality,
      };
    });

    setComboAnalysis({
      ...comboAnalysis,
      allPossibleCombos: updatedCombos,
    });
  }
}, [rankingsLoading, popularityLoading, rankings, popularityScores]);
```

---

### Phase 3: Apply Top 500 Filter

```typescript
// Filter to top 500 by priority
const top500Combos = useMemo(() => {
  if (!comboAnalysis.allPossibleCombos[0]?.priorityScore) {
    // No priority scores yet - return first 500
    return comboAnalysis.allPossibleCombos.slice(0, 500);
  }

  return comboAnalysis.allPossibleCombos
    .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
    .slice(0, 500);
}, [comboAnalysis]);
```

---

### Phase 4: Update UI

**Add priority column to table:**

```tsx
<TableHead>Priority</TableHead>

{/* In row */}
<TableCell>
  <div className="flex items-center gap-2">
    <span className={getPriorityColor(combo.priorityScore)}>
      {combo.priorityScore?.toFixed(1) || '—'}
    </span>
    {combo.dataQuality === 'partial' && (
      <span title="Incomplete data">⚠️</span>
    )}
  </div>
</TableCell>
```

---

## Critical Questions

### Data Integration

**❓ Q1:** Should we use **average** or **minimum** popularity of keywords in combo?

**❓ Q2:** Prioritize **blue ocean** (not ranking + low competition) or **improvement** (ranking 20th + high volume)?

**❓ Q3:** Should **downward trends** be deprioritized or prioritized (fix what's broken)?

**❓ Q4:** Should "**already ranking well**" combos be kept high priority or deprioritized?

**❓ Q5:** Enforce **diversity rules** (mix of tiers) or **pure score-based** selection?

---

### Weight Adjustments

**❓ Q6:** Are these weights correct?
```
Strength: 30%
Popularity: 25%
Opportunity: 20%
Trend: 15%
Intent: 10%
```

**❓ Q7:** Should we add **difficulty score** as a component?
- Currently using `opportunityScore` (competition vs ranking)
- Could add explicit difficulty factor

---

### Performance

**❓ Q8:** Fetching analytics for 3,000+ combos - acceptable load time?
- Batch rankings API: ~1-2 seconds for 3,000 combos
- Popularity API: ~500ms for 100 keywords
- Total: ~2-3 seconds initial load

**❓ Q9:** Should we cache priority scores in database (Phase 3)?

---

### UI/UX

**❓ Q10:** Display priority score breakdown?
```
Priority: 79.4/100
├─ Strength: 80 (30%)
├─ Popularity: 81 (25%)
├─ Opportunity: 100 (20%)
├─ Trend: 50 (15%)
└─ Intent: 75 (10%)

Tooltip on hover?
```

**❓ Q11:** Filter by priority ranges?
```
☑ High Priority (80-100)
☑ Medium Priority (50-80)
☐ Low Priority (0-50)
```

---

## Recommended Approach

**OPTION A: MVP with Real Data** (Recommended)

1. Answer Q1-Q5 (critical scoring decisions)
2. Implement priority calculation using real analytics
3. Fetch rankings + popularity for all combos
4. Sort by priority, show top 500
5. Display priority score in table

**Timeline:** 2-3 days (includes API integration)

**Blockers:** Q1-Q5 decisions

---

**OPTION B: Pure Strength-Based (Fallback)**

If analytics integration is too slow:

1. Use only strength score (already implemented)
2. Sort by strength + length
3. Show top 500 by strength
4. Add analytics later

**Timeline:** 1 day
**Trade-off:** Less strategic, misses opportunities

---

## Next Steps

1. **Answer Q1-Q5** (blocking decisions)
2. **Test analytics APIs** with 3,000 combo batch
3. **Implement priority calculation** function
4. **Integrate with Workbench** component
5. **Add priority column** to table UI

---

## Document Control

**Created:** 2025-12-01
**Status:** AWAITING DECISIONS (Q1-Q11)
**Priority:** HIGH
**Depends On:** Analytics API performance testing
**Owner:** Product + Engineering
