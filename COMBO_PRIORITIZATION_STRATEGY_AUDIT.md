# Combination Prioritization Strategy - Audit & Design

**Status:** 🔍 DESIGN PHASE - CLARIFICATIONS NEEDED
**Date:** 2025-12-01
**Based on:** User decisions on multi-element combo system

---

## Confirmed Design Decisions

### Decision Summary
```
✅ Keywords field weight = Subtitle weight (equal)
✅ Title has most weight (strongest)
✅ Same-field combos > Cross-element combos
✅ Hard limit: 500 combos initially
✅ Parse keywords: Split everything (comma → individual words)
✅ Display: Collapsible table, start with 50 rows, load more
✅ Long-term: Store all combos for monitored apps
```

---

## Strength Hierarchy (Based on Decisions)

### Confirmed Hierarchy

```
🔥🔥🔥 TIER 1: Title-Only Combos (STRONGEST)
├─ Title Consecutive (e.g., "meditation sleep" in title)
└─ Title Non-Consecutive (e.g., "meditation timer" from "Meditation & Sleep Timer")

🔥🔥 TIER 2: Cross-Element with Title (VERY STRONG)
├─ Title + Keywords (e.g., "meditation stress" - meditation in title, stress in keywords)
└─ Title + Subtitle (e.g., "meditation mindfulness" - meditation in title, mindfulness in subtitle)

⚡ TIER 3: Same-Field Secondary Elements (MEDIUM)
├─ Keywords Consecutive (e.g., "stress anxiety" in keywords field)
├─ Keywords Non-Consecutive (e.g., "stress calm" from keywords field)
├─ Subtitle Consecutive (e.g., "mindfulness wellness" in subtitle)
└─ Subtitle Non-Consecutive (e.g., "mindfulness app" from subtitle)

💤 TIER 4: Cross-Element Secondary (WEAK)
├─ Keywords + Subtitle (e.g., "stress mindfulness")
└─ Title + Subtitle + Keywords (3-way cross)

❌ TIER 5: Missing (NOT IN METADATA)
└─ Keywords not in any field
```

---

## Critical Clarification Questions

### Q1: Same-Field Priority - Exact Order

**User said:** "exact match and combination in the same field have higher priority"

**Need clarification on this hierarchy:**

**Option A: Consecutive Always Beats Cross-Element**
```
1. Title Consecutive        🔥🔥🔥 "meditation sleep"
2. Title Non-Consecutive    🔥🔥 "meditation timer"
3. Title + Keywords         🔥⚡ "meditation stress"
4. Keywords Consecutive     💤 "stress anxiety"
```

**Option B: Title Cross-Element Beats Non-Consecutive**
```
1. Title Consecutive        🔥🔥🔥 "meditation sleep"
2. Title + Keywords         🔥⚡ "meditation stress"
3. Title Non-Consecutive    🔥🔥 "meditation timer"
4. Keywords Consecutive     💤 "stress anxiety"
```

**❓ QUESTION 1:** Which hierarchy is correct for App Store algorithm?

**❓ FOLLOW-UP:** Does "meditation timer" (title non-consecutive) rank higher or lower than "meditation stress" (title + keywords)?

---

### Q2: Keywords + Subtitle Strength

**User confirmed:** Keywords = Subtitle in weight

**But what about cross between them?**

```
Scenario:
  Subtitle: "Mindfulness Wellness App"
  Keywords: "stress, anxiety, calm"

Combo: "stress mindfulness"
  - stress from keywords
  - mindfulness from subtitle
```

**Option A: Weakest Cross-Element**
```
Rank: 💤 Same as subtitle-only
Reasoning: Both are weak fields
```

**Option B: Separate Tier**
```
Rank: 💤⚡ Keywords-Subtitle Cross
Reasoning: Distinct from subtitle-only
```

**❓ QUESTION 2:** How to rank Keywords + Subtitle combos?

---

### Q3: Three-Way Cross-Element Combos

**Scenario:**
```
Title: "Meditation Sleep"
Subtitle: "Mindfulness"
Keywords: "stress"

Combo: "meditation mindfulness stress"
  - meditation from title
  - mindfulness from subtitle
  - stress from keywords
```

**Option A: Rank by Strongest Element**
```
Has title keyword → Treat as Title cross-element (🔥⚡)
```

**Option B: Rank by Weakest Element**
```
Has keywords/subtitle → Treat as weak cross (💤)
```

**Option C: Separate Tier**
```
3-way cross = unique tier between strong and weak
```

**❓ QUESTION 3:** How to rank 3+ element combos?

---

### Q4: Consecutive Detection Across Fields

**User said:** "combination in the same field have higher priority"

**What about consecutive across field boundaries?**

```
Scenario:
  Title: "Meditation Sleep"
  Subtitle: "Mindfulness Wellness"

Text as written: "Meditation Sleep Mindfulness Wellness"

Is "sleep mindfulness" consecutive?
  - Adjacent in combined text
  - But from different fields
```

**Option A: Consecutive Only Within Same Field**
```
"meditation sleep" = consecutive ✅ (both in title)
"sleep mindfulness" = cross-element ❌ (different fields)

Strict field boundaries
```

**Option B: Consecutive in Combined Text**
```
"sleep mindfulness" = consecutive ✅ (adjacent in full text)

Treat as consecutive cross-element
```

**❓ QUESTION 4:** Does consecutiveness matter across field boundaries?

**❓ FOLLOW-UP:** Does App Store treat "Sleep Mindfulness" (consecutive across fields) differently than "Sleep Stress" (non-consecutive cross)?

---

## Prioritization Algorithm Research

### What Do Industry Tools Do?

#### AppTweak Prioritization

**Based on public info and likely approach:**

```
Priority Score = f(
  Search Volume,       // 40% weight - How many users search this
  Competition,         // 20% weight - How many apps rank for this
  Relevance,           // 20% weight - Semantic match to app
  Current Ranking,     // 10% weight - Where you rank now
  Keyword Difficulty   // 10% weight - How hard to rank
)
```

**Features:**
- Traffic Score (0-100)
- Keyword Difficulty (Easy/Medium/Hard)
- Search Ads Popularity
- Chance Score (likelihood of ranking)

**❓ QUESTION 5:** Do we have access to search volume data?
**❓ QUESTION 6:** Do we have access to competition data?
**❓ QUESTION 7:** Should we integrate with Apple Search Ads API?

---

#### Sensor Tower Prioritization

**Based on public info:**

```
Priority = f(
  Search Score,        // Estimated monthly searches
  Competition Level,   // Low/Medium/High
  Ranking Position,    // Current position for keyword
  Install Share,       // % of installs from keyword
  Relevance Score      // How relevant to app category
)
```

**Features:**
- Search Popularity Index (0-100)
- Keyword Spy (competitor keywords)
- Keyword Suggestions
- Category-specific trends

---

### Basic Prioritization (Without External Data)

**For initial implementation without search volume API:**

```typescript
interface ComboPriorityScore {
  strengthScore: number;        // 40% - Based on tier (title > keywords/subtitle)
  lengthScore: number;          // 15% - 2-word > 3-word (more specific)
  frequencyScore: number;       // 15% - How often keyword appears across fields
  strategicScore: number;       // 15% - ASO Bible vertical relevance
  brandScore: number;           // 10% - Generic > Branded
  noveltyScore: number;         // 5%  - New keyword = higher priority

  totalScore: number;           // Sum: 0-100
}
```

**Breakdown:**

**1. Strength Score (40%)** - Based on confirmed hierarchy
```typescript
function calculateStrengthScore(combo: GeneratedCombo): number {
  switch (combo.strength) {
    case ComboStrength.TITLE_CONSECUTIVE:
      return 100;  // 🔥🔥🔥
    case ComboStrength.TITLE_NON_CONSECUTIVE:
      return 85;   // 🔥🔥
    case ComboStrength.TITLE_KEYWORDS_CROSS:
      return 75;   // 🔥⚡ (NEW TIER)
    case ComboStrength.TITLE_SUBTITLE_CROSS:
      return 70;   // 🔥⚡
    case ComboStrength.KEYWORDS_CONSECUTIVE:
      return 50;   // 💤
    case ComboStrength.KEYWORDS_NON_CONSECUTIVE:
      return 45;   // 💤
    case ComboStrength.SUBTITLE_CONSECUTIVE:
      return 50;   // 💤
    case ComboStrength.SUBTITLE_NON_CONSECUTIVE:
      return 45;   // 💤
    case ComboStrength.KEYWORDS_SUBTITLE_CROSS:
      return 30;   // 💤💤
    case ComboStrength.MISSING:
      return 0;    // ❌
  }
}
```

**2. Length Score (15%)** - Shorter = more common searches
```typescript
function calculateLengthScore(combo: GeneratedCombo): number {
  switch (combo.length) {
    case 2: return 100;  // "meditation sleep"
    case 3: return 70;   // "meditation sleep timer"
    case 4: return 40;   // "meditation sleep timer app"
    default: return 20;
  }
}
```

**3. Frequency Score (15%)** - Keyword appears in multiple fields
```typescript
function calculateFrequencyScore(combo: GeneratedCombo, allFields: string[][]): number {
  const keywords = combo.keywords;
  let totalAppearances = 0;

  keywords.forEach(keyword => {
    allFields.forEach(field => {
      if (field.includes(keyword)) totalAppearances++;
    });
  });

  // More appearances = more important keyword
  return Math.min(100, totalAppearances * 20);
}
```

**4. Strategic Score (15%)** - ASO Bible vertical relevance
```typescript
function calculateStrategicScore(combo: GeneratedCombo, vertical: string): number {
  // Check if combo matches vertical intent patterns
  // Example: "meditation sleep" high for Health & Fitness
  // Use ASO Bible vertical templates

  // Placeholder implementation:
  return 50; // TODO: Integrate with ASO Bible
}
```

**5. Brand Score (10%)** - Generic better than branded
```typescript
function calculateBrandScore(combo: GeneratedCombo, brandKeywords: string[]): number {
  const hasBrand = combo.keywords.some(kw =>
    brandKeywords.some(brand => kw.toLowerCase().includes(brand.toLowerCase()))
  );

  return hasBrand ? 30 : 100; // Generic gets full score
}
```

**6. Novelty Score (5%)** - New keywords prioritized
```typescript
function calculateNoveltyScore(combo: GeneratedCombo, titleKeywords: string[]): number {
  const titleSet = new Set(titleKeywords.map(k => k.toLowerCase()));
  const newKeywords = combo.keywords.filter(kw => !titleSet.has(kw.toLowerCase()));

  return (newKeywords.length / combo.keywords.length) * 100;
}
```

**❓ QUESTION 8:** Does this basic scoring make sense as MVP?

**❓ QUESTION 9:** What weights would you adjust?

**❓ QUESTION 10:** Should we add "competitor gap" scoring (missing from competitors)?

---

## Enhanced Prioritization (With External Data)

**Phase 2: When we have search volume + competition data**

```typescript
interface EnhancedPriorityScore extends ComboPriorityScore {
  searchVolumeScore: number;    // 30% - Estimated monthly searches
  competitionScore: number;     // 15% - How many apps compete
  difficultyScore: number;      // 10% - Ranking difficulty

  // Adjust other weights:
  strengthScore: number;        // 25% (reduced from 40%)
  strategicScore: number;       // 10% (reduced from 15%)
  lengthScore: number;          // 10% (reduced from 15%)
}
```

**Search Volume Score (30%)**
```typescript
function calculateSearchVolumeScore(combo: string, searchData: SearchVolumeData): number {
  const monthlySearches = searchData.getVolume(combo);

  // Logarithmic scale (high volume keywords dominate)
  if (monthlySearches > 100000) return 100;
  if (monthlySearches > 50000) return 90;
  if (monthlySearches > 10000) return 75;
  if (monthlySearches > 5000) return 60;
  if (monthlySearches > 1000) return 40;
  if (monthlySearches > 100) return 20;
  return 10;
}
```

**Competition Score (15%)**
```typescript
function calculateCompetitionScore(combo: string, competitionData: CompetitionData): number {
  const competitorCount = competitionData.getCompetitorCount(combo);

  // Inverse score - fewer competitors = better opportunity
  if (competitorCount < 10) return 100;      // Blue ocean!
  if (competitorCount < 50) return 80;
  if (competitorCount < 100) return 60;
  if (competitorCount < 500) return 40;
  if (competitorCount < 1000) return 20;
  return 10;
}
```

**❓ QUESTION 11:** When should we implement enhanced scoring?

**❓ QUESTION 12:** What data sources should we prioritize? (Search Ads API? Third-party?)

---

## Table UI/UX Design

### Reference: AppTweak-Style Keyword Analysis Table

**Key Features to Replicate:**

1. **Collapsible Sections**
```
▼ Title Combos (142)
  ├─ meditation sleep 🔥🔥🔥 [Priority: 95]
  ├─ meditation timer 🔥🔥 [Priority: 88]
  └─ ... (50 shown, 92 hidden)

▶ Keywords Combos (1,240) [Click to expand]

▼ Cross-Element Combos (1,653)
  └─ ... (50 shown, 1,603 hidden)
```

2. **Progressive Loading**
```
Showing 50 of 3,250 combinations

[Show 50 More] [Show 100 More] [Show All]

Current display: 50-100 of 3,250
```

3. **Multi-Column Filters**
```
┌─────────────────────────────────────────────────────┐
│ Filters                                             │
├─────────────────────────────────────────────────────┤
│ Strength: [All] [🔥🔥🔥] [🔥🔥] [⚡] [💤] [❌]      │
│ Length:   [All] [2-word] [3-word]                   │
│ Source:   [All] [Title] [Subtitle] [Keywords]       │
│ Priority: [All] [High 80+] [Medium 50-80] [Low <50] │
│ Search:   [____________]                            │
└─────────────────────────────────────────────────────┘
```

4. **Sortable Columns**
```
┌──────┬──────────────────┬─────────┬────────┬──────────┬─────────┐
│ Rank │ Combination      │ Strength│ Length │ Priority │ Actions │
├──────┼──────────────────┼─────────┼────────┼──────────┼─────────┤
│  1   │ meditation sleep │ 🔥🔥🔥   │   2    │   95     │ [Copy]  │
│  2   │ meditation timer │ 🔥🔥     │   2    │   88     │ [Copy]  │
│  3   │ meditation stress│ 🔥⚡     │   2    │   82     │ [Copy]  │
│  ...  (click header to sort)                                    │
└──────┴──────────────────┴─────────┴────────┴──────────┴─────────┘
```

5. **Inline Actions**
```
Each row:
- [📋 Copy] - Copy combo to clipboard
- [⭐ Track] - Add to tracking list
- [🔍 Analyze] - Deep dive into combo
- [❌ Hide] - Mark as noise/ignore
```

6. **Bulk Actions**
```
☑ Select all visible
☐ meditation sleep
☐ meditation timer
☑ meditation stress

With selected (1):
[📋 Copy All] [⭐ Track All] [❌ Hide All] [📊 Export]
```

**❓ QUESTION 13:** Which features are most important for MVP?

**❓ QUESTION 14:** Should we have a "favorites/tracking" feature?

**❓ QUESTION 15:** Export formats needed? (CSV? Excel? PDF?)

---

## Implementation Plan

### Phase 1: Foundation (Week 1)

**Goal:** Get keywords field working with basic prioritization

**Tasks:**
1. Add keywords field input to database schema
2. Update metadata fetch to include keywords
3. Implement keywords field parsing (comma → split)
4. Update combo generation to include keywords
5. Add new strength tiers (KEYWORDS_CONSECUTIVE, TITLE_KEYWORDS_CROSS, etc.)
6. Implement basic priority scoring (without external data)
7. Apply hard limit: top 500 combos by priority

**Deliverable:** Workbench shows top 500 combos including keywords field

**Blockers:**
- ❓ Exact strength hierarchy (Q1-Q4)
- ❓ Basic scoring weights (Q8-Q9)

---

### Phase 2: UI Enhancement (Week 2)

**Goal:** AppTweak-style collapsible table

**Tasks:**
1. Redesign table with collapsible sections
2. Implement progressive loading (show 50, load more)
3. Add multi-column filters
4. Add sortable columns
5. Add inline actions (copy, track, analyze)
6. Add bulk selection and actions

**Deliverable:** Professional table UI that scales to 3,000+ combos

**Blockers:**
- ❓ Which features for MVP? (Q13)

---

### Phase 3: Monitored Apps Storage (Week 3)

**Goal:** Store all combos for tracked apps

**Tasks:**
1. Create `app_combinations` table
2. Background job to generate all combos (not just top 500)
3. Store with metadata_version hash
4. Implement delta tracking (combo changes over time)
5. Add historical comparison view

**Deliverable:** Long-term combo tracking for monitored apps

---

### Phase 4: Smart Filtering (Week 4+)

**Goal:** External data integration

**Tasks:**
1. Research search volume data sources
2. Integrate Apple Search Ads API (if possible)
3. Add search volume to priority scoring
4. Add competition data
5. Implement enhanced priority algorithm
6. Add "high-volume opportunities" filter

**Deliverable:** Search volume-aware prioritization

**Blockers:**
- ❓ Data source availability (Q5-Q7)
- ❓ Budget for third-party APIs

---

## Data Model Updates

### Database Schema Changes

**1. Add Keywords Field to Metadata**
```sql
ALTER TABLE app_metadata_cache
ADD COLUMN keywords_field TEXT;

ALTER TABLE monitored_apps
ADD COLUMN keywords_field TEXT;
```

**2. Create Combinations Table (Phase 3)**
```sql
CREATE TABLE app_combinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  locale TEXT NOT NULL,

  -- Combo data
  combo_text TEXT NOT NULL,
  keywords TEXT[] NOT NULL,
  length INTEGER NOT NULL,

  -- NEW: Strength classification
  strength TEXT NOT NULL,  -- title_consecutive, title_keywords_cross, etc.
  is_consecutive BOOLEAN,
  element_sources TEXT[],  -- ['title', 'keywords'] for cross-element

  -- NEW: Priority scoring
  priority_score DECIMAL(5,2),  -- 0-100
  strength_score DECIMAL(5,2),
  length_score DECIMAL(5,2),
  frequency_score DECIMAL(5,2),
  strategic_score DECIMAL(5,2),

  -- NEW: External data (Phase 4)
  search_volume INTEGER,
  competition_level TEXT,  -- low, medium, high
  keyword_difficulty DECIMAL(5,2),

  -- Tracking
  metadata_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(app_id, platform, locale, combo_text)
);

CREATE INDEX idx_combinations_priority
  ON app_combinations(app_id, platform, locale, priority_score DESC);

CREATE INDEX idx_combinations_strength
  ON app_combinations(app_id, platform, locale, strength);
```

**3. Create Combination History (Phase 3)**
```sql
CREATE TABLE app_combination_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  locale TEXT NOT NULL,
  combo_text TEXT NOT NULL,

  -- Snapshot data
  strength TEXT NOT NULL,
  priority_score DECIMAL(5,2),
  metadata_version TEXT NOT NULL,

  -- Tracking
  snapshot_date TIMESTAMP DEFAULT NOW(),

  INDEX(app_id, platform, locale, combo_text, snapshot_date)
);
```

---

## Testing Strategy

### Test Case 1: Small Keywords Field
```
Input:
  Title: "Meditation Sleep" (2 keywords)
  Subtitle: "Mindfulness App" (2 keywords)
  Keywords: "stress, anxiety" (2 keywords)

Expected:
  Total possible: ~30 combos
  Top 500: All 30 (under limit)
  Performance: <100ms
```

### Test Case 2: Medium Keywords Field
```
Input:
  Title: "Meditation Sleep Timer" (3 keywords)
  Subtitle: "Mindfulness Wellness" (2 keywords)
  Keywords: "stress, anxiety, calm, focus, breathe, relax" (6 keywords)

Expected:
  Total possible: ~200 combos
  Top 500: All 200 (under limit)
  Performance: <300ms
```

### Test Case 3: Large Keywords Field
```
Input:
  Title: "Headspace" (1 keyword)
  Subtitle: "Meditation & Sleep" (2 keywords)
  Keywords: "stress, anxiety, calm, focus, breathe, relax, mental, health, yoga, meditation, music, sleep, timer, wellness, mindfulness" (15 keywords)

Expected:
  Total possible: ~500 combos
  Top 500: All 500 (at limit)
  Performance: <500ms
```

### Test Case 4: Very Large Keywords Field (Stress Test)
```
Input:
  Title: 4 keywords
  Subtitle: 6 keywords
  Keywords: 20 keywords

Expected:
  Total possible: ~4,000 combos
  Top 500: Top 500 by priority
  Performance: <2s
  Warning: "Showing top 500 of 4,000 possible combinations"
```

---

## Critical Questions Summary

**Blocking Implementation (Must Answer):**

1. ❓ **Q1:** Title non-consecutive vs Title+Keywords - which ranks higher?
2. ❓ **Q2:** How to rank Keywords + Subtitle cross-element combos?
3. ❓ **Q3:** How to rank 3-way cross-element combos (Title+Subtitle+Keywords)?
4. ❓ **Q4:** Does consecutiveness matter across field boundaries?

**Prioritization Strategy:**

5. ❓ **Q5-Q7:** Do we have search volume data? Competition data? Search Ads API access?
6. ❓ **Q8-Q10:** Does basic scoring algorithm make sense? Adjust weights? Add competitor gap?

**Long-term Planning:**

11. ❓ **Q11-Q12:** When to implement enhanced scoring? What data sources to prioritize?

**UI/UX:**

13. ❓ **Q13-Q15:** Which table features for MVP? Favorites/tracking? Export formats?

---

## Recommended Next Steps

**OPTION A: Start with MVP (Fastest)**

1. Answer Q1-Q4 (strength hierarchy edge cases)
2. Implement basic priority scoring (Q8-Q10)
3. Build Phase 1: Keywords field + basic prioritization
4. Ship MVP with top 500 combos
5. Iterate based on user feedback

**Timeline:** 1 week

---

**OPTION B: Research-First Approach**

1. Audit AppTweak/Sensor Tower APIs
2. Research search volume data sources
3. Answer all questions (Q1-Q15)
4. Design complete system architecture
5. Implement all phases

**Timeline:** 3-4 weeks

---

**OPTION C: Hybrid Approach (Recommended)**

1. Answer critical Q1-Q4 (blocking)
2. Implement Phase 1 with basic scoring
3. Research external data in parallel
4. Release MVP quickly
5. Enhance with external data in Phase 4

**Timeline:** MVP in 1 week, enhancements ongoing

---

## Document Control

**Created:** 2025-12-01
**Status:** AWAITING CLARIFICATIONS (Q1-Q4 blocking)
**Priority:** HIGH
**Next Action:** Answer Q1-Q4 to unblock implementation
**Owner:** Product + Engineering
