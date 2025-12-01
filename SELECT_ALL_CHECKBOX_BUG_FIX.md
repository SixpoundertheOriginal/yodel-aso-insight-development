# Select All Checkbox Bug - FIXED ✅

## Problem Description

**User Report:** "When you check all keywords and then try to unselect all keywords, they still stay selected."

**Symptoms:**
1. Click "Select All" checkbox at top of table → All rows get selected ✅
2. Click "Select All" checkbox again to deselect → Checkbox changes to unchecked BUT rows stay selected ❌
3. Individual row checkboxes remain checked
4. Bulk actions banner still shows "X combos selected"

## Root Cause

**File:** `src/stores/useKeywordComboStore.ts:148-151`

**The Bug:**
```typescript
// BEFORE (BROKEN)
selectAll: () =>
  set((state) => ({
    selectedIndices: new Set(state.combos.map((_, i) => i)),
  })),
```

**Problem:**
- `selectAll()` only creates indices for `state.combos` array
- But the table displays **MERGED** data: `combos + customKeywords`
- Result: Only first N rows get selected (where N = combos.length)

**Example:**
```
Auto-generated combos: 40 items (indices 0-39)
Custom keywords: 2 items (indices 40-41)
Total displayed: 42 rows

selectAll() creates: Set([0,1,2,...,39]) ← Only 40 indices!
Table needs: Set([0,1,2,...,41]) ← All 42 indices

Missing: Indices 40-41 (the custom keywords)
```

**Why Deselect Appears Broken:**
1. User clicks "Select All"
2. Only indices 0-39 get selected (combos only)
3. Custom keywords at indices 40-41 are NOT selected
4. Checkbox at top calculates: `selectedIndices.size (40) === finalSortedCombos.length (42)` → FALSE
5. Checkbox shows as "indeterminate" (some selected)
6. User clicks to deselect → Calls `deselectAll()` → Clears the Set
7. BUT if user manually clicked custom keyword checkboxes, those indices were never in the Set
8. Visual state: Rows appear selected, but Set is empty → Checkbox unchecked, rows still checked

## The Fix

**File:** `src/stores/useKeywordComboStore.ts:148-155`

```typescript
// AFTER (FIXED)
selectAll: () =>
  set((state) => {
    // Select all indices from merged combos + customKeywords
    const allCombos = [...state.combos, ...state.customKeywords];
    return {
      selectedIndices: new Set(allCombos.map((_, i) => i)),
    };
  }),
```

**What Changed:**
- Now merges both arrays before creating indices
- Selects ALL rows in the table, not just auto-generated combos
- Matches the same merge logic used in `getFilteredCombos()`

## Why This Bug Occurred

**Root Cause Pattern:** Same issue as the Competition column bug!

We have **split state** (`combos` + `customKeywords` as separate arrays), but various parts of the code operate on different subsets:

| Component | Data Source | Bug Impact |
|-----------|-------------|------------|
| `getFilteredCombos()` | `combos + customKeywords` | ✅ Displays all rows |
| `selectAll()` | `combos` only | ❌ Only selects N rows |
| `allUniqueComboTexts` | `combos` only (before fix) | ❌ Missing metrics |
| Table display | Uses `getFilteredCombos()` | ✅ Shows all rows |

**The Pattern:**
Every time we add a new combo source (title, subtitle, custom), we must update ~10 different places that iterate or count combos. This is a **code smell** indicating need for refactoring.

## Testing

### Test Case 1: Select All (Basic)
1. Open Keyword Combo Table with some auto-generated combos
2. Click "Select All" checkbox at top
3. ✅ All rows should be checked
4. ✅ Bulk actions banner shows correct count

### Test Case 2: Deselect All (Basic)
1. With all rows selected from Test 1
2. Click "Select All" checkbox again
3. ✅ All rows should become unchecked
4. ✅ Bulk actions banner disappears

### Test Case 3: With Custom Keywords
1. Add 2-3 custom keywords
2. Click "Select All"
3. ✅ All rows including custom keywords should be checked
4. ✅ Bulk actions count includes custom keywords
5. Click "Select All" again
6. ✅ All rows including custom keywords should uncheck

### Test Case 4: Partial Selection
1. Manually check 5 random rows (mix of auto + custom)
2. ✅ "Select All" checkbox shows indeterminate state (dash)
3. Click "Select All" → All rows become checked
4. Click again → All rows become unchecked

### Test Case 5: After Adding Custom Keyword
1. Select some rows
2. Add a new custom keyword
3. ✅ New keyword row appears unselected
4. ✅ Previously selected rows stay selected
5. Click "Select All"
6. ✅ All rows including new keyword become selected

## Related Issues Fixed

This is the **third occurrence** of the split state management bug:

1. ✅ **Competition/Popularity/Ranking columns** - `allUniqueComboTexts` didn't include custom keywords
2. ✅ **Select All checkbox** - `selectAll()` didn't include custom keywords
3. ⏳ **Potential future bugs** - Any new feature that iterates over combos

## Long-Term Solution

**Recommendation:** Refactor to single unified array

```typescript
// Current (problematic):
interface KeywordComboState {
  combos: ClassifiedCombo[];
  customKeywords: ClassifiedCombo[]; // Separate array = bug magnet
}

// Better:
interface KeywordComboState {
  allCombos: ClassifiedCombo[]; // Single source of truth

  // Computed getters
  getAutoCombos: () => allCombos.filter(c => c.source !== 'custom')
  getCustomCombos: () => allCombos.filter(c => c.source === 'custom')
}
```

**Benefits:**
- Single loop in all operations
- Impossible to forget to merge arrays
- Easier to maintain and debug
- Follows DRY principle

## Status

✅ **FIXED** - Ready to test
✅ **TypeScript compiles** - No type errors
⏳ **Needs testing** - Follow test cases above

## Prevention Checklist

When adding features that touch combos:

- [ ] Check if `selectAll()` needs updating
- [ ] Check if `deselectAll()` needs updating
- [ ] Check if `getFilteredCombos()` needs updating
- [ ] Check if `getSortedCombos()` needs updating
- [ ] Check if `allUniqueComboTexts` needs updating
- [ ] Check if export functions need updating
- [ ] Test with mixed auto + custom keywords
- [ ] Test select all → deselect all flow

Or better yet: **Refactor to single array!**
