# Combo Prioritization - Default Decisions

**Status:** Default decisions for Phase 1 implementation
**Date:** 2025-12-01

---

## Default Answers to Critical Questions

### Q1: Average vs Minimum Popularity?
**Decision: AVERAGE**
- Rationale: "meditation sleep" with popularity(meditation)=80, popularity(sleep)=70 → average=75
- More balanced than minimum (would unfairly penalize combos with one strong keyword)
- Standard practice in keyword research tools

### Q2: Blue Ocean vs Improvement Priority?
**Decision: BLUE OCEAN (High Opportunity)**
- Rationale: Prioritize combos with high search volume + low competition + not ranking
- These represent easiest wins with highest impact
- Improvement opportunities (already ranking 20th) get moderate scores via trend component

### Q3: Downward Trends - Deprioritize or Prioritize?
**Decision: DEPRIORITIZE**
- Rationale: Downward trends suggest algorithm changes or increased competition
- Focus resources on upward/stable trends
- Formula: Positive trend change = higher score, negative = lower score

### Q4: Already Ranking Well - Keep High or Deprioritize?
**Decision: DEPRIORITIZE (Focus on Opportunities)**
- Rationale: If combo ranks top 5, it's already optimized
- Higher priority for combos ranking 15-50 (room for improvement)
- Opportunity Score formula: `max(0, 100 - (position * 2))` → rank 1 = 0pts, rank 50 = 0pts, rank 20 = 60pts

### Q5: Diversity Rules vs Pure Score-Based?
**Decision: PURE SCORE-BASED**
- Rationale: Objective and transparent
- Top 500 naturally includes mix of strengths due to strength component (30% weight)
- Can add manual diversity filters in Phase 4 if needed

### Q6: Weight Distribution Correct?
**Decision: YES - Strength(30%), Popularity(25%), Opportunity(20%), Trend(15%), Intent(10%)**
- Rationale:
  - Strength = most important (metadata position directly impacts ranking)
  - Popularity = second (high volume = more impressions)
  - Opportunity = third (ranking potential)
  - Trend = fourth (momentum indicator)
  - Intent = fifth (quality signal)
- Total: 100%

### Q7: Add Explicit Difficulty Score Component?
**Decision: NO (Already captured in Opportunity Score)**
- Rationale: Opportunity Score = f(ranking position, competition)
- Adding separate difficulty would double-count competition
- Keep formula simple and avoid redundancy

### Q8: 2-3 Second Load Time Acceptable?
**Decision: YES**
- Rationale: One-time load on page render for 3,000 combos
- Progressive loading (render first 50 rows immediately, calculate rest in background)
- Add loading skeleton UI
- Consider Web Worker for calculation in Phase 2

### Q9: Cache Priority Scores in Database?
**Decision: YES (Phase 3)**
- Rationale: For monitored apps, calculate once daily
- Speeds up subsequent loads
- Enables historical priority tracking
- Phase 1: Calculate on-demand, Phase 3: Add database caching

### Q10: Display Priority Score Breakdown in Tooltip?
**Decision: YES**
- Rationale: Transparency helps users understand prioritization
- Tooltip shows:
  ```
  Priority Score: 78/100
  ├─ Strength: 24/30 (🔥🔥 Title Non-Consecutive)
  ├─ Popularity: 20/25 (High search volume)
  ├─ Opportunity: 16/20 (Ranking #25, can improve)
  ├─ Trend: 12/15 (↑ Up 5 positions)
  └─ Intent: 6/10 (Moderate intent signals)
  ```

### Q11: Filter by Priority Ranges?
**Decision: YES**
- Rationale: Enable filtering by priority tiers
  - High Priority: 70-100 (top opportunities)
  - Medium Priority: 40-69 (moderate opportunities)
  - Low Priority: 0-39 (low opportunities)
- Add to existing filter system in table

---

## Implementation Formula Summary

### Priority Score Calculation
```typescript
function calculateComboPriority(
  combo: GeneratedCombo,
  rankingData: ComboRankingData | undefined,
  popularityData: Map<string, KeywordPopularityData>
): number {

  // 1. Strength Score (0-100) - 30% weight
  const strengthScore = mapStrengthToScore(combo.strength);

  // 2. Popularity Score (0-100) - 25% weight
  const avgPopularity = calculateAveragePopularity(combo.keywords, popularityData);
  const popularityScore = avgPopularity; // Already 0-100

  // 3. Opportunity Score (0-100) - 20% weight
  const opportunityScore = calculateOpportunityScore(rankingData);
  // Formula: If not ranking = 80, If ranking = max(0, 100 - position*2)

  // 4. Trend Score (0-100) - 15% weight
  const trendScore = calculateTrendScore(rankingData);
  // Formula: Up trend = 80-100, Stable = 50, Down = 20-40, New = 60

  // 5. Intent Score (0-100) - 10% weight
  const intentScore = calculateIntentScore(combo.keywords, popularityData);
  // Formula: Average intent_score * 100

  // Weighted sum
  const totalScore =
    (strengthScore * 0.30) +
    (popularityScore * 0.25) +
    (opportunityScore * 0.20) +
    (trendScore * 0.15) +
    (intentScore * 0.10);

  return Math.round(totalScore);
}
```

### Strength Score Mapping
```typescript
const STRENGTH_SCORES = {
  TITLE_CONSECUTIVE: 100,           // 🔥🔥🔥
  TITLE_NON_CONSECUTIVE: 85,        // 🔥🔥
  TITLE_KEYWORDS_CROSS: 70,         // 🔥⚡ (new)
  CROSS_ELEMENT: 70,                // ⚡ (title+subtitle)
  KEYWORDS_CONSECUTIVE: 50,         // 💤 (new)
  SUBTITLE_CONSECUTIVE: 50,         // 💤
  KEYWORDS_SUBTITLE_CROSS: 35,      // 💤⚡ (new)
  SUBTITLE_NON_CONSECUTIVE: 30,     // 💤💤
  KEYWORDS_NON_CONSECUTIVE: 30,     // 💤💤 (new)
  THREE_WAY_CROSS: 20,              // 💤💤💤 (new)
  MISSING: 0,                       // ❌
};
```

---

## Top 500 Selection Algorithm

```typescript
function selectTop500Combos(
  allCombos: GeneratedCombo[],
  priorityScores: Map<string, number>
): { topCombos: GeneratedCombo[], totalGenerated: number, limitReached: boolean } {

  // Sort by priority score descending
  const sorted = allCombos
    .map(combo => ({
      combo,
      priority: priorityScores.get(combo.text) || 0
    }))
    .sort((a, b) => b.priority - a.priority);

  const topCombos = sorted.slice(0, 500).map(x => x.combo);

  return {
    topCombos,
    totalGenerated: allCombos.length,
    limitReached: allCombos.length > 500
  };
}
```

---

## UI Warning Message

When limit is reached, display:

```
⚠️ Showing top 500 of 3,247 possible combinations
Combinations prioritized by: Strength (30%) + Popularity (25%) +
Opportunity (20%) + Trend (15%) + Intent (10%)

💡 To see different combinations, adjust filters or metadata fields.
```

---

## Phase 1 Scope (This Implementation)

**IN SCOPE:**
- ✅ Keywords field database schema
- ✅ 4-element combo generation (title, subtitle, keywords, promo-future)
- ✅ New strength tiers (KEYWORDS_CONSECUTIVE, TITLE_KEYWORDS_CROSS, etc.)
- ✅ Priority scoring with real analytics
- ✅ Top 500 limit with warning
- ✅ Priority column in table
- ✅ Priority breakdown tooltip

**OUT OF SCOPE (Future Phases):**
- ❌ AppTweak-style collapsible sections (Phase 2)
- ❌ Database caching of scores (Phase 3)
- ❌ Historical priority tracking (Phase 3)
- ❌ Web Worker calculation (Phase 2 optimization)
- ❌ Promotional text field (Phase 4)

---

## Document Control

**Created:** 2025-12-01
**Status:** Default decisions for Phase 1
**Owner:** ASO Team
**Next Step:** Begin database schema updates
