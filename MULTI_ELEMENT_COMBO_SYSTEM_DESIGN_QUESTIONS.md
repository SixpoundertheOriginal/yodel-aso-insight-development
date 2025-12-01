# Multi-Element Combination System - Design Questions & Audit

**Status:** 🔍 DESIGN PHASE - NEED DECISIONS
**Date:** 2025-12-01
**Scope:** Expand from 2 elements (title, subtitle) to 4 elements (title, subtitle, keywords, promo)

---

## Current State vs Target State

### Current System (2 Elements)
```
Input:
  Title: "Headspace: Meditation & Sleep" (3 keywords)
  Subtitle: "Mindfulness Timer & Wellness App" (4 keywords)

Total Keywords: 7
Total Combinations: ~91 (all possible 2-word + 3-word)

Performance: ✅ Instant (<100ms)
UI: ✅ Responsive
```

### Target System (4 Elements)
```
Input:
  Title: "Headspace: Meditation & Sleep" (3 keywords)
  Subtitle: "Mindfulness Timer & Wellness App" (4 keywords)
  Keywords: "stress anxiety calm focus breathe relax mental health yoga meditation music" (11 keywords)
  Promo: "Daily guided sessions..." (8 keywords)

Total Keywords: 26
Total Combinations: ~6,500+ (all possible 2-word + 3-word)

Performance: ⚠️ Slow (~2-5 seconds)
UI: ⚠️ May freeze
Database: ⚠️ Large storage needed
```

---

## Critical Design Questions

### SECTION 1: Keywords Field Fundamentals

#### Q1.1: How should we treat the Keywords field algorithmically?

**Context:**
- Keywords field is 100 characters, comma-separated
- Only visible to app owner (not fetchable for competitors)
- Used ONLY by App Store backend ranking algorithm
- Does NOT appear in visible metadata

**Option A: Equal Weight to Title/Subtitle**
```
Generate combos from keywords same as title/subtitle
Example: "stress anxiety" combo treated like "meditation sleep" combo
Classification: Keywords combos get their own strength level?
```

**Option B: Lower Weight (Supplementary)**
```
Keywords combos are secondary to title/subtitle
Example: "stress anxiety" marked as weaker than "meditation sleep"
Classification: Keywords = new strength tier below subtitle?
```

**Option C: Cross-Element Booster**
```
Keywords field primarily used to create cross-element combos
Example: "meditation stress", "sleep anxiety" (keywords + title/subtitle)
Don't generate keywords-only combos
```

**❓ QUESTION:** Which option best represents App Store algorithm behavior?

**❓ FOLLOW-UP:** Do we know the actual ranking power of keywords field vs title/subtitle?

---

#### Q1.2: Should keywords field combos be visible in UI?

**Context:**
- User can't see competitors' keywords field
- Competitive intelligence features rely on visible metadata

**Option A: Show Keywords Field Combos Separately**
```
Workbench sections:
- Title Combos (🔥🔥🔥)
- Subtitle Combos (💤)
- Keywords Combos (🔑) ← NEW SECTION
- Cross-Element Combos (⚡)

Benefit: Clear separation
Risk: UI clutter
```

**Option B: Merge Keywords into Strength Classification**
```
Add new strength tiers:
- KEYWORDS_CONSECUTIVE
- KEYWORDS_NON_CONSECUTIVE
- KEYWORDS_CROSS_TITLE
- KEYWORDS_CROSS_SUBTITLE

Benefit: Unified view
Risk: More complexity
```

**Option C: Keywords Field as Filter/Overlay**
```
Show title/subtitle combos by default
Toggle to show "Enhanced with Keywords" view
Highlight which combos are boosted by keywords

Benefit: Progressive disclosure
Risk: Hidden information
```

**❓ QUESTION:** Which UI approach is most valuable for users?

---

#### Q1.3: How to handle keywords field overlap?

**Scenario:**
```
Title: "Meditation Sleep Timer"
Keywords: "meditation, sleep, stress, anxiety"

Overlapping keywords: meditation, sleep
New keywords: stress, anxiety
```

**Option A: Deduplicate (Don't Generate Duplicate Combos)**
```
"meditation sleep" already exists from title
Skip generating it from keywords field
Focus on new combos: "stress anxiety", "meditation stress", etc.

Benefit: Cleaner combo list
Risk: Might miss strength boost from keywords field
```

**Option B: Keep Duplicates with Strength Boost**
```
"meditation sleep" from title = 🔥🔥🔥 (Strongest)
"meditation sleep" from keywords = 🔑 (Keywords boost)

Mark combo as "STRENGTHENED BY KEYWORDS FIELD"

Benefit: Shows keyword field impact
Risk: Duplicate combos in list
```

**Option C: Merge into Combined Strength**
```
"meditation sleep":
  - Base: Title consecutive (🔥🔥🔥)
  - Boost: Also in keywords field (+10%)
  - Final: Title + Keywords (🔥🔥🔥+)

Show single combo with strength indicator

Benefit: No duplicates, clear boost
Risk: Complex strength calculation
```

**❓ QUESTION:** How should we handle overlap to reflect actual ranking behavior?

---

### SECTION 2: Element Prioritization & Weighting

#### Q2.1: What is the ranking power hierarchy?

**Based on App Store algorithm knowledge:**

**Current understanding (2 elements):**
```
🔥🔥🔥 Title Consecutive > 🔥🔥 Title Non-Consecutive > ⚡ Cross-Element > 💤 Subtitle
```

**With Keywords field (need to confirm):**
```
Option A: Keywords between Title and Subtitle
🔥🔥🔥 Title Consecutive > 🔥🔥 Title Non-Consecutive > 🔑🔑 Keywords Consecutive > ⚡ Cross-Element > 💤 Subtitle

Option B: Keywords equal to Subtitle
🔥🔥🔥 Title Consecutive > 🔥🔥 Title Non-Consecutive > ⚡ Cross-Element > 🔑 Keywords = 💤 Subtitle

Option C: Keywords only boost existing combos (no standalone strength)
🔥🔥🔥 Title Consecutive (+keywords boost) > 🔥🔥 Title Non-Consecutive > ⚡ Cross-Element (+keywords boost) > 💤 Subtitle
```

**❓ QUESTION:** What is the confirmed ranking power of keywords field?

**❓ FOLLOW-UP:** Should we run A/B tests to determine actual impact?

---

#### Q2.2: How to weight cross-element combinations?

**With 4 elements, we have many cross-element possibilities:**

```
2-Element Crosses (current):
- Title + Subtitle ⚡

3-Element Crosses (new):
- Title + Keywords 🔑⚡
- Subtitle + Keywords 🔑💤
- Title + Promo 📢⚡
- Subtitle + Promo 📢💤
- Keywords + Promo 🔑📢

4-Element Crosses (new):
- Title + Subtitle + Keywords ⚡🔑
- Title + Keywords + Promo ⚡🔑📢
- All 4 elements ⚡🔑💤📢
```

**Option A: Simple Hierarchy (Weakest Element Dominates)**
```
Title + Keywords = Medium (limited by keywords)
Subtitle + Keywords = Weak (both weak)
Title + Subtitle + Keywords = Medium (limited by weakest)

Easy to calculate, clear rules
```

**Option B: Additive Scoring**
```
Title (100) + Keywords (50) = 150 / 2 = 75 (Medium-High)
Subtitle (30) + Keywords (50) = 80 / 2 = 40 (Low-Medium)
Title + Subtitle + Keywords = (100 + 30 + 50) / 3 = 60 (Medium)

More nuanced, but complex
```

**Option C: Discrete Tiers**
```
Create specific strength tiers for each cross-element type:
TITLE_KEYWORDS_CROSS = new tier between title and subtitle
SUBTITLE_KEYWORDS_CROSS = same as subtitle
etc.

Clear tiers, but many to manage
```

**❓ QUESTION:** How should we calculate strength for multi-element combos?

---

### SECTION 3: Combination Explosion & Performance

#### Q3.1: How to handle 30+ keyword combination explosion?

**Math:**
```
Current (7 keywords):
  2-word: C(7,2) × 2 = 42 combos
  3-word: C(7,3) = 35 combos
  Total: 77 combos ✅

Target (26 keywords):
  2-word: C(26,2) × 2 = 650 combos
  3-word: C(26,3) = 2,600 combos
  Total: 3,250 combos ⚠️

Worst Case (50 keywords if including promo):
  2-word: C(50,2) × 2 = 2,450 combos
  3-word: C(50,3) = 19,600 combos
  Total: 22,050 combos ❌ UNUSABLE
```

**Option A: Hard Limit (Top N)**
```
Generate up to 500 highest-value combos
Stop when limit reached
Warn user: "Showing top 500 of 3,250 possible combinations"

Benefit: Predictable performance
Risk: Missing important combos
```

**Option B: Tiered Generation**
```
Tier 1: Generate ALL title-only combos (always small)
Tier 2: Generate ALL title+subtitle combos (medium)
Tier 3: Sample keywords field combos (large)
Tier 4: Sample promo field combos (largest)

Benefit: Prioritizes important combos
Risk: Complex logic
```

**Option C: Progressive/Async Generation**
```
Generate in batches:
1. Title combos (show immediately)
2. Subtitle combos (show after 100ms)
3. Keywords combos (show after 500ms)
4. Cross-element combos (show after 1s)

UI shows "Generating... X of Y"

Benefit: Responsive UI
Risk: Complex implementation
```

**Option D: Database Pre-generation**
```
Generate all combos server-side
Store in database
Frontend just fetches and filters

Benefit: Fast frontend
Risk: Database storage costs
```

**❓ QUESTION:** Which strategy best balances performance and completeness?

**❓ FOLLOW-UP:** What's acceptable generation time? 1s? 5s? 10s?

---

#### Q3.2: Should we limit combo length?

**Current:** 2-word and 3-word combos only

**Options:**

**Option A: Keep 2-3 Word Limit**
```
Rationale: Most searches are 2-3 words
Benefit: Manageable size
Risk: Missing long-tail opportunities
```

**Option B: Add 4-Word Combos**
```
With 26 keywords:
  4-word: C(26,4) = 14,950 combos ← HUGE!

Benefit: More comprehensive
Risk: Massive explosion
```

**Option C: Conditional Length**
```
If keywords ≤ 15: Generate 2, 3, 4-word
If keywords 16-25: Generate 2, 3-word only
If keywords 26+: Generate 2-word only

Benefit: Adaptive to keyword count
Risk: Inconsistent results
```

**❓ QUESTION:** What combo lengths are most valuable for ASO?

**❓ FOLLOW-UP:** Do 4+ word combos actually rank in App Store?

---

### SECTION 4: Prioritization & Filtering

#### Q4.1: What makes a combination "high priority"?

**Factors to consider:**

**Strength-based:**
```
Priority = f(strength)
Title combos > Cross-element > Keywords > Subtitle

Simple, already implemented
```

**Search volume-based:**
```
Priority = f(estimated search volume)
Need external data source (Search Ads, third-party)

Most relevant for user
```

**Competition-based:**
```
Priority = f(competitor gap)
Show combos competitors are missing

Strategic advantage
```

**Strategic value-based:**
```
Priority = f(vertical relevance, intent, brand)
Use ASO Bible intelligence

Best for optimization
```

**Combined scoring:**
```
Priority = (strength × 40%) + (search volume × 30%) + (strategic value × 30%)

Most comprehensive
```

**❓ QUESTION:** What prioritization formula should we use?

**❓ FOLLOW-UP:** Do we have access to search volume data?

---

#### Q4.2: What filtering options should users have?

**Current filters:**
- Existence (existing/missing/all)
- Length (2-word/3-word/all)
- Source (title/subtitle/both)
- Keyword search (text filter)

**Proposed additional filters:**

**Element-based:**
```
☑ Show Title combos
☑ Show Subtitle combos
☑ Show Keywords combos
☑ Show Promo combos
☑ Show Cross-element combos

Allows focusing on specific elements
```

**Strength-based:**
```
☑ Strongest (🔥🔥🔥)
☑ Very Strong (🔥🔥)
☑ Medium (⚡)
☑ Weak (💤)
☑ Missing (❌)

Already implemented in Phase 2
```

**Opportunity-based:**
```
☑ Can Strengthen (combos that can be improved)
☑ Missing from Competitors (competitive gaps)
☑ High Search Volume (if we have data)
☑ Low Competition (if we have data)

Strategic filtering
```

**Intent-based:**
```
☑ Learning intent
☑ Outcome intent
☑ Brand intent
☑ Discovery intent

ASO Bible integration
```

**❓ QUESTION:** Which filters are most important for users?

**❓ FOLLOW-UP:** Should filters be AND (all must match) or OR (any can match)?

---

### SECTION 5: Keywords Field Specifics

#### Q5.1: How to handle comma-separated keywords input?

**Example input:**
```
"meditation, sleep music, stress relief, anxiety, calm, focus"
```

**Option A: Treat Each Comma-Separated Item as Single Unit**
```
Keywords: ["meditation", "sleep music", "stress relief", "anxiety", "calm", "focus"]

Combinations:
- "meditation anxiety" ✅
- "sleep music stress relief" ✅
- "meditation sleep music" ✅

Benefit: Preserves multi-word keywords
Risk: "sleep music" vs "sleep" + "music" ambiguity
```

**Option B: Split Everything into Individual Words**
```
Keywords: ["meditation", "sleep", "music", "stress", "relief", "anxiety", "calm", "focus"]

Combinations:
- "meditation anxiety" ✅
- "sleep stress" ✅
- "music relief" ✅

Benefit: Maximum combinations
Risk: Loses semantic meaning of "sleep music"
```

**Option C: Hybrid (Preserve Multi-Word + Individual)**
```
Keywords:
  Multi-word: ["sleep music", "stress relief"]
  Individual: ["meditation", "anxiety", "calm", "focus"]

Generate combos from both

Benefit: Best of both worlds
Risk: Complex parsing
```

**❓ QUESTION:** How should we parse comma-separated keywords?

**❓ FOLLOW-UP:** Should we allow users to specify multi-word vs single-word?

---

#### Q5.2: Should we validate/clean keywords input?

**User might input:**
```
"meditation,sleep,STRESS,Anxiety  , calm,,focus,meditation"
```

**Cleaning needed:**
- Trim whitespace
- Remove duplicates
- Normalize case
- Remove empty entries
- Remove stopwords?
- Limit to 100 characters

**❓ QUESTION:** What validation rules should we apply?

**❓ FOLLOW-UP:** Should we warn user about stopwords in keywords field?

---

#### Q5.3: How to indicate keywords field in UI?

**Visual indicators needed:**

**Option A: Special Icon/Badge**
```
"meditation stress" 🔑 Keywords
"meditation sleep" 🔥🔥🔥 Title

Clear visual distinction
```

**Option B: Color Coding**
```
Title combos: Blue background
Subtitle combos: Purple background
Keywords combos: Gold background

Easy to scan
```

**Option C: Dedicated Section**
```
Workbench tabs:
- Title & Subtitle Combos
- Keywords Field Combos
- Cross-Element Combos
- All Combos

Organized view
```

**❓ QUESTION:** How should we visually distinguish keywords field combos?

---

### SECTION 6: Promo Text Handling

#### Q6.1: Should we include promotional text?

**Context:**
- Promotional text is short-term (seasonal, event-based)
- Not always present
- 170 characters (iOS) / 80 characters (Android)
- Visible in search results

**Option A: Include as 4th Element**
```
Generate combos from promo same as other fields
Track separately for seasonal optimization

Benefit: Complete coverage
Risk: Temporary data clutter
```

**Option B: Optional/Toggle**
```
Default: Don't include promo
User can toggle "Include promotional text"
Show combos separately when enabled

Benefit: Clean default view
Risk: Users might forget to enable
```

**Option C: Exclude for Now**
```
Focus on title, subtitle, keywords first
Add promo in future phase

Benefit: Simpler initial implementation
Risk: Incomplete system
```

**❓ QUESTION:** Should promotional text be included in MVP?

**❓ FOLLOW-UP:** How often do users change promotional text?

---

### SECTION 7: Brand Filtering at Scale

#### Q7.1: How to handle brand filtering with 4 elements?

**Current:**
- Brand detection in title/subtitle
- Filter out branded combos

**With keywords field:**
```
Keywords might include: "headspace meditation, headspace sleep, calm alternative"

Should we:
A) Filter out "headspace meditation" (contains brand)
B) Keep it (keywords field IS for branding)
C) Mark it as "brand combo" but show it
```

**❓ QUESTION:** Should keywords field allow brand terms?

**❓ FOLLOW-UP:** How to detect brand in user-provided keywords string?

---

#### Q7.2: Should we filter competitor brands from keywords field?

**Scenario:**
```
User inputs keywords: "calm alternative, headspace vs, better than insight timer"
```

**Option A: Filter Competitor References**
```
Remove "calm", "insight timer" from keywords
Warn user: "Competitor brand names removed"

Benefit: Clean results
Risk: User wanted those comparisons
```

**Option B: Mark as Competitor Combos**
```
"calm alternative" → marked as 🏢 Competitor Reference
Show in separate section

Benefit: User sees what was detected
Risk: UI complexity
```

**Option C: Allow Everything**
```
User is responsible for content
Just show warning about competitor brand policy

Benefit: Maximum flexibility
Risk: User might violate App Store guidelines
```

**❓ QUESTION:** How should we handle competitor brand references?

---

### SECTION 8: Algorithm Selection

#### Q8.1: Which algorithm for which element?

**For each element, choose:**

**N-Grams (Consecutive Sequences):**
- ✅ Produces actual phrases
- ✅ Fast O(n)
- ❌ Misses non-consecutive

**Permutations (All Possible):**
- ✅ Comprehensive
- ✅ Better represents App Store
- ❌ Slow O(n²)

**Proposed:**
```
Title: Permutations (comprehensive, small set)
Subtitle: Permutations (comprehensive, small set)
Keywords: Permutations (user-curated, important)
Promo: N-Grams (large, temporary, phrases matter)

OR

All elements: Permutations with tiered generation
```

**❓ QUESTION:** Should all elements use same algorithm?

**❓ FOLLOW-UP:** Should keywords field use special algorithm?

---

### SECTION 9: Database & Storage

#### Q9.1: Should we store generated combinations?

**Pros:**
- ✅ No re-generation on page load
- ✅ Can track changes over time
- ✅ Historical analysis
- ✅ Fast filtering/sorting

**Cons:**
- ❌ Storage costs (6,500 combos × many apps)
- ❌ Stale data if metadata changes
- ❌ Complex cache invalidation

**Option A: Store Everything**
```
Table: app_combinations
Store all 6,500+ combos per app

Benefit: Complete history
Cost: ~10MB per app
```

**Option B: Store Top N Only**
```
Store only top 500 highest-priority combos

Benefit: Manageable size
Risk: Can't reconstruct full set
```

**Option C: Store Nothing (Generate on Demand)**
```
Generate fresh every time

Benefit: Always current
Risk: Slow performance
```

**❓ QUESTION:** Should we persist generated combinations?

**❓ FOLLOW-UP:** If yes, how to handle metadata changes?

---

#### Q9.2: How to track keywords field changes?

**Keywords field is user-provided, can change frequently**

**Option A: Version Control**
```
Table: keywords_history
Track each change with timestamp

Can analyze impact of keywords changes on rankings
```

**Option B: Hash-Based Invalidation**
```
Store hash of keywords string
Regenerate combos if hash changes

Simple cache invalidation
```

**Option C: Manual Refresh**
```
User clicks "Regenerate Combos" after editing keywords

User controls when to regenerate
```

**❓ QUESTION:** How to handle keywords field updates?

---

### SECTION 10: User Experience

#### Q10.1: How to input keywords field?

**UI Options:**

**Option A: Simple Textarea**
```
┌─────────────────────────────────────────────┐
│ Keywords Field (100 chars max)             │
├─────────────────────────────────────────────┤
│ meditation, sleep, stress, anxiety, calm    │
│                                             │
│ 45/100 characters used                      │
└─────────────────────────────────────────────┘
[Generate Combinations]
```

**Option B: Tag Input**
```
┌─────────────────────────────────────────────┐
│ Keywords Field                              │
├─────────────────────────────────────────────┤
│ [meditation ×] [sleep ×] [stress ×]         │
│ [anxiety ×] [calm ×]                        │
│                                             │
│ + Add keyword                               │
│ 45/100 characters                           │
└─────────────────────────────────────────────┘
```

**Option C: Smart Input with Suggestions**
```
┌─────────────────────────────────────────────┐
│ Keywords Field                              │
├─────────────────────────────────────────────┤
│ meditation, sleep, str█                     │
│                                             │
│ Suggestions: stress, stream, strength       │
│ Already used: meditation (title)            │
└─────────────────────────────────────────────┘
```

**❓ QUESTION:** What's the best input UX for keywords field?

---

#### Q10.2: How to display 3,000+ combinations?

**Current table works for 91 combos, but 3,000?**

**Option A: Pagination**
```
Show 50 combos per page
60 pages total

Standard approach
```

**Option B: Virtual Scrolling**
```
Render only visible rows
Smooth infinite scroll

Better UX, complex implementation
```

**Option C: Collapsible Sections**
```
▼ Title Combos (45)
▼ Subtitle Combos (62)
▶ Keywords Combos (1,240) ← Collapsed by default
▼ Cross-Element Combos (1,653)

Progressive disclosure
```

**Option D: Search-First UI**
```
Don't show all combos
Start with search/filter
Show matching combos only

Like Google - empty until search
```

**❓ QUESTION:** How should we display thousands of combinations?

---

### SECTION 11: Migration & Compatibility

#### Q11.1: How to handle apps without keywords field?

**Most apps won't have keywords field initially**

**Option A: Optional Field**
```
If keywords field empty:
  - Generate from title + subtitle only (current behavior)
  - Show "Add Keywords Field" prompt

Graceful degradation
```

**Option B: Generate Suggestions**
```
If keywords field empty:
  - Analyze title + subtitle
  - Suggest keywords to add
  - "We recommend adding: stress, anxiety, calm"

Proactive help
```

**Option C: Require Keywords Field**
```
Force user to input keywords field
Can be empty but must acknowledge

Ensures data completeness
```

**❓ QUESTION:** Should keywords field be required or optional?

---

### SECTION 12: Testing & Validation

#### Q12.1: How to validate the system works correctly?

**Test cases needed:**

**Test 1: Small Input (Current)**
```
Title: 3 keywords
Subtitle: 4 keywords
Keywords: empty
Expected: 77-91 combos (current behavior)
```

**Test 2: Medium Input**
```
Title: 3 keywords
Subtitle: 4 keywords
Keywords: 10 keywords
Expected: ~300-500 combos
Generation time: <1s
```

**Test 3: Large Input**
```
Title: 4 keywords
Subtitle: 6 keywords
Keywords: 15 keywords
Expected: ~1,500 combos
Generation time: <3s
```

**Test 4: Stress Test**
```
Title: 5 keywords
Subtitle: 8 keywords
Keywords: 20 keywords
Expected: ~4,000 combos
Generation time: <10s (acceptable?)
```

**❓ QUESTION:** What are acceptable performance benchmarks?

---

## Summary of Critical Decisions Needed

### High Priority (Blocks Implementation)

1. **Keywords field ranking power** - Equal to title? subtitle? between?
2. **Combination limit strategy** - Hard cap? Tiered? Progressive?
3. **Parsing strategy** - Multi-word keywords or split to individual?
4. **Strength classification** - How to classify keywords combos?
5. **Performance target** - What's acceptable generation time?

### Medium Priority (Affects Design)

6. **UI display strategy** - How to show 3,000+ combos?
7. **Filtering options** - Which filters are most valuable?
8. **Brand filtering** - Allow brand in keywords field?
9. **Database storage** - Store combos or generate on demand?
10. **Promo text** - Include in MVP or defer?

### Low Priority (Can Decide Later)

11. **Input UX** - Textarea vs tag input vs smart suggestions?
12. **Algorithm choice** - Same for all elements or different?
13. **Competitor brands** - Filter or mark?
14. **Historical tracking** - Version control for keywords?
15. **Validation rules** - How strict on input?

---

## Recommended Phased Approach

### Phase 1: Keywords Field Foundation (This Sprint)
- Add keywords field input to UI
- Implement basic parsing (comma-separated)
- Generate combinations from keywords
- Add keywords strength tier
- Implement hard limit (500 combos max)

**Decision needed:**
- How to weight keywords combos?
- Multi-word parsing or split?
- What's the limit?

### Phase 2: Cross-Element Combinations (Next Sprint)
- Generate title+keywords combos
- Generate subtitle+keywords combos
- Classify cross-element strength
- Add filtering by element

**Decision needed:**
- Cross-element strength calculation?
- Which crosses to prioritize?

### Phase 3: Scaling & Performance (Later)
- Implement tiered generation
- Add database storage
- Optimize for 30+ keywords
- Progressive loading UI

**Decision needed:**
- Database storage strategy?
- Performance targets?

### Phase 4: Promo & Advanced Features (Future)
- Add promotional text element
- Add search volume integration
- Add competitive intelligence
- Add AI recommendations

**Decision needed:**
- Include promo in MVP?

---

## Next Steps

**Before writing any code, please answer:**

1. ✅ Keywords field ranking power relative to title/subtitle
2. ✅ Maximum acceptable generation time
3. ✅ Should we limit to top N combos or generate all?
4. ✅ Multi-word keywords handling
5. ✅ UI strategy for displaying thousands of combos

**Then we can:**
- Design the unified architecture
- Implement Phase 1
- Test with real data
- Iterate based on performance

---

## Document Control

**Created:** 2025-12-01
**Status:** AWAITING DECISIONS
**Priority:** HIGH - Blocks next implementation phase
**Owner:** Product + Engineering
**Next Action:** Answer critical questions 1-5
