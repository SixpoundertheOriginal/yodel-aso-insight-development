# Root Cause Analysis: Ranking Columns Breaking on Table Changes

## Problem Statement

The **Competition**, **Popularity**, and **App Ranking** columns in the Keyword Combo Table keep breaking whenever we make changes to the table structure or add new features. This is a recurring issue that suggests a fundamental architectural problem.

## Timeline of Breaks

1. **Initial Implementation** - Columns worked
2. **Added Sorting** - Columns broke (refetching on every sort)
3. **Fixed with Caching** - Columns worked again
4. **Added Custom Keywords** - Columns broke again

## Root Cause Analysis

### The Core Problem: Tight Coupling

The ranking columns data flow has **tight coupling** between:
1. Data source (combo list)
2. Data fetching (API calls)
3. Data caching (Map storage)
4. Data display (table rows)

When ANY of these changes, the others break.

### Specific Issues Identified

#### Issue #1: Hardcoded Data Source
**Location:** `KeywordComboTable.tsx:187-190`

```typescript
// PROBLEM: Only looks at combos, ignores customKeywords
const allUniqueComboTexts = useMemo(() => {
  const allCombos = useKeywordComboStore.getState().combos;
  return allCombos.map(c => c.text);
}, []); // Empty dependency array = computed ONCE
```

**Why it breaks:**
- When we added `customKeywords` to the store and merged them in `getFilteredCombos()`, this memo didn't update
- API calls were made with ONLY auto-generated combos
- Custom keywords had no ranking data
- Columns showed empty/loading state for custom keywords

**Fix Applied:**
```typescript
const allUniqueComboTexts = useMemo(() => {
  const allCombos = useKeywordComboStore.getState().combos;
  const allCustom = useKeywordComboStore.getState().customKeywords;
  const merged = [...allCombos, ...allCustom];
  return merged.map(c => c.text);
}, [customKeywords]); // Re-compute when custom keywords change
```

#### Issue #2: Inconsistent Data Merging

**The Problem:**
- `getFilteredCombos()` merges `combos + customKeywords` ✅
- `allUniqueComboTexts` only used `combos` ❌
- `popularityScores` lookup used `allUniqueComboTexts` ❌
- Result: Three different sources of truth

**Architectural Flaw:**
```
Store has TWO arrays:
├── combos (auto-generated)
└── customKeywords (user-added)

But various parts of the code use:
├── Only combos (allUniqueComboTexts)
├── Only customKeywords (nowhere)
└── Merged (getFilteredCombos)

❌ No single source of truth
```

#### Issue #3: Implicit Dependencies

**The Problem:**
```typescript
// This memo depends on customKeywords but doesn't declare it
const allUniqueComboTexts = useMemo(() => {
  // Uses store.customKeywords implicitly
}, []); // ❌ Missing dependency
```

React can't track changes to Zustand store unless explicitly declared in deps array.

#### Issue #4: Cache Key Mismatch

**The Problem:**
- Cache uses `combo.text` as key
- Display uses `combo` object
- When custom keywords added, cache has no entry for them
- Lookup fails silently, shows loading state

## Why This Keeps Happening

### 1. Split State Management
```
Data Lives In Multiple Places:
├── Zustand Store (combos array)
├── Zustand Store (customKeywords array)  <-- NEW
├── Component State (cachedRankings Map)
├── Component State (popularityScores Map)
└── Hook State (useBatchComboRankings)
```

Every new feature must update ALL of these.

### 2. No Single Entry Point
```
To Add Data to Table:
❌ No single addCombo() function that handles everything
✅ Should be: addCombo() → updates store → triggers fetch → updates cache → UI renders
❌ Reality: Manual updates to multiple states in multiple components
```

### 3. Implicit Data Flow
```
User Can't See:
- Where data comes from (combos vs customKeywords vs merged?)
- When API calls happen (on mount? on change? on sort?)
- Why columns are empty (cache miss? API error? wrong key?)
```

### 4. Reactive Dependencies Hell
```
When customKeywords Changes:
❌ allUniqueComboTexts doesn't update (empty deps)
❌ fetchRankingsIfNeeded doesn't re-run (missing dep)
❌ cachedRankings has no entries for new keywords (cache miss)
❌ Popularity lookup fails (wrong combo list)
Result: Columns show "..." or empty
```

## Architectural Recommendations

### Short-Term Fix (Applied)
✅ Update `allUniqueComboTexts` to include `customKeywords`
✅ Add `customKeywords` to dependency array

### Medium-Term Fix (Recommended)

#### 1. Unified Data Source
```typescript
// In Zustand Store
interface KeywordComboState {
  // REMOVE: combos, customKeywords as separate arrays
  // ADD: Single unified array
  allCombos: ClassifiedCombo[]; // Includes ALL combos regardless of source

  // Computed getters
  getAutoCombos: () => ClassifiedCombo[]; // Filter by source !== 'custom'
  getCustomCombos: () => ClassifiedCombo[]; // Filter by source === 'custom'
}
```

**Benefits:**
- Single source of truth
- Easier to keep in sync
- Less code duplication

#### 2. Centralized Data Fetching
```typescript
// Create a new hook: useComboMetrics()
const useComboMetrics = (combos: ClassifiedCombo[], metadata) => {
  // Handles ALL metrics: Competition, Popularity, Ranking
  // Single cache, single fetch logic, single error handling
  return {
    rankings: Map<string, RankingData>,
    popularity: Map<string, PopularityData>,
    competition: Map<string, CompetitionData>,
    isLoading: boolean,
    error: Error | null,
    refresh: () => void,
  };
};
```

**Benefits:**
- One place to update when data structure changes
- Consistent caching strategy
- Easier debugging

#### 3. Reactive Queries Pattern
```typescript
// Use React Query or similar
const { data: rankings } = useQuery(
  ['combo-rankings', appId, combos], // Auto-refreshes when combos change
  () => fetchRankings(appId, combos),
  { staleTime: 24 * 60 * 60 * 1000 } // 24h cache
);
```

**Benefits:**
- Auto-refresh when dependencies change
- Built-in caching and error handling
- Industry standard pattern

### Long-Term Fix (Ideal Architecture)

```
┌─────────────────────────────────────────┐
│         Zustand Store (Single Array)    │
│  allCombos: ClassifiedCombo[]           │
│  - source: 'title' | 'subtitle' |      │
│           'title+subtitle' | 'custom'   │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│      useComboMetrics() Hook             │
│  - Fetches all 3 metrics in parallel   │
│  - Single unified cache                 │
│  - Handles errors centrally             │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│      KeywordComboTable Component        │
│  - Just displays data                   │
│  - No cache logic                       │
│  - No API calls                         │
└─────────────────────────────────────────┘
```

**Separation of Concerns:**
- Store = Data ownership (what combos exist)
- Hook = Data fetching (get metrics for combos)
- Component = Data presentation (show in table)

## Prevention Checklist

For future features that touch the Keyword Combo Table:

- [ ] Does the feature add new data to the table?
  - If yes: Update `allUniqueComboTexts` dependency array
  - If yes: Check if cache keys still match
  - If yes: Update ALL places that iterate over combos

- [ ] Does the feature change how combos are stored?
  - If yes: Update `getFilteredCombos()` and `getSortedCombos()`
  - If yes: Update `allUniqueComboTexts` computation
  - If yes: Update popularity/ranking fetch functions

- [ ] Does the feature add a new "source" type?
  - If yes: Update `getSourceBadgeColor()`
  - If yes: Update source filter dropdown
  - If yes: Update CSV export headers

- [ ] After changes, test ALL columns:
  - [ ] Competition shows numbers
  - [ ] Popularity shows scores
  - [ ] App Ranking shows positions
  - [ ] Sort by each column works
  - [ ] Filter by source works
  - [ ] CSV export includes new data

## Lessons Learned

### What Went Wrong
1. **Added new data array** (`customKeywords`) without updating all consumers
2. **Memo optimization** (`[]` deps) prevented reactivity
3. **Implicit coupling** between store arrays and API calls
4. **No integration tests** to catch column breaks

### What Went Right
1. **Quick identification** - Logs helped pinpoint the issue
2. **Targeted fix** - Only needed to update one memo
3. **TypeScript safety** - No type errors after fix

### Action Items
1. ✅ Fix immediate issue (update `allUniqueComboTexts`)
2. ⏳ Add integration test for "add custom keyword → check columns work"
3. ⏳ Refactor to unified combo array (medium-term)
4. ⏳ Extract metrics fetching to dedicated hook (medium-term)
5. ⏳ Document data flow in architecture diagram

## Testing After Fix

Run these tests to verify the fix:

1. **Baseline Test**
   - Open Keyword Combo Table
   - Verify Competition, Popularity, App Ranking show data
   - Sort by each column → verify data persists

2. **Add Custom Keyword Test**
   - Add a custom keyword (e.g., "test keyword")
   - Verify all 3 columns load data for it
   - Verify sorting works including custom keyword

3. **Multiple Custom Keywords Test**
   - Add 5 custom keywords at once
   - Verify all 3 columns load for all 5
   - Verify pagination works
   - Verify CSV export includes them

4. **Delete Custom Keyword Test**
   - Delete a custom keyword
   - Verify it disappears from table
   - Verify remaining keywords still show metrics

5. **Refresh Test**
   - Add custom keyword
   - Refresh page
   - Verify custom keyword reloads from DB
   - Verify all 3 columns load

## Conclusion

**Root Cause:** Split state management (`combos` + `customKeywords` as separate arrays) combined with hard-coded data sources that didn't update when state changed.

**Immediate Fix:** Update `allUniqueComboTexts` to merge both arrays and add `customKeywords` to dependency array.

**Long-Term Solution:** Refactor to single unified combo array with `source` field, extract metrics fetching to dedicated hook, and add integration tests.

**Recurring Pattern:** Every time we add new combo sources (title, subtitle, cross-element, custom), we must update ~5 different places. This is a code smell indicating need for abstraction.
