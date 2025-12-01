# Competition, Popularity, App Ranking Columns - Breakage Audit

**Date:** 2025-12-01
**Status:** 🔴 **CRITICAL** - Columns broken after rename/revert
**Affected:** Competition, Popularity, App Ranking columns

---

## 🔍 WHAT HAPPENED

1. **Initial State:** Popularity column implementation was complete and working
2. **Rename Attempt:** Changed table titles from "KEYWORD COMBO WORKBENCH" → "KEYWORDS INTELLIGENCE TABLE"
3. **User Reported:** Title change broke Competition, Popularity, and App Ranking columns
4. **Revert Attempt:** Reverted title changes back to original
5. **Result:** Columns still broken

---

## 📊 CURRENT GIT STATE

### Unstaged Changes (Never Committed):
```bash
modified:   src/components/AppAudit/KeywordComboWorkbench/EnhancedKeywordComboWorkbench.tsx
modified:   src/components/AppAudit/KeywordComboWorkbench/KeywordComboRow.tsx
modified:   src/components/AppAudit/KeywordComboWorkbench/KeywordComboTable.tsx
modified:   src/stores/useKeywordComboStore.ts
```

### Untracked Files (New, Never Committed):
```bash
src/components/AppAudit/KeywordComboWorkbench/CompetitionCell.tsx
src/components/AppAudit/KeywordComboWorkbench/RankingCell.tsx
src/hooks/useBatchComboRankings.ts
src/hooks/useComboRanking.ts
src/hooks/useKeywordPopularity.ts
```

### Key Finding:
**The last commit (321ad3a) does NOT include ANY of the new column code.**

The columns were added in this session but never committed. They exist only as unstaged changes.

---

## 🧩 CODE ANALYSIS

### 1. Competition Column

**KeywordComboRow.tsx (Lines 303-311):**
```typescript
{/* Competition */}
{visibleColumns.competition && (
  <TableCell>
    <CompetitionCell
      totalResults={rankingData?.totalResults ?? null}
      snapshotDate={rankingData?.snapshotDate}
    />
  </TableCell>
)}
```

**Status:** ✅ Code exists
**Component:** ✅ `CompetitionCell.tsx` exists
**Props:** ✅ `rankingData` passed from parent
**Visible:** ✅ `visibleColumns.competition` added to ColumnVisibility interface

### 2. Popularity Column

**KeywordComboRow.tsx (Lines 313-356):**
```typescript
{/* Popularity */}
<TableCell className="text-center">
  {popularityLoading ? (
    <span className="text-xs text-zinc-500">...</span>
  ) : popularityData ? (
    <TooltipProvider>
      <Tooltip>
        {/* Full tooltip implementation */}
      </Tooltip>
    </TooltipProvider>
  ) : (
    <span className="text-xs text-zinc-600">-</span>
  )}
</TableCell>
```

**Status:** ✅ Code exists
**Hook:** ✅ `useKeywordPopularity.ts` exists
**Props:** ✅ `popularityData` and `popularityLoading` passed from parent
**NOT Conditional:** ⚠️ **Always renders** (no `visibleColumns.popularity` check)

### 3. App Ranking Column

**KeywordComboRow.tsx (Lines 358-371):**
```typescript
{/* App Ranking */}
<TableCell>
  {metadata?.appId && metadata?.country ? (
    <RankingCell
      combo={combo.text}
      appId={metadata.appId}
      country={metadata.country}
      cachedRanking={rankingData}
      isLoading={rankingsLoading}
    />
  ) : (
    <span className="text-xs text-zinc-600">N/A</span>
  )}
</TableCell>
```

**Status:** ✅ Code exists
**Component:** ✅ `RankingCell.tsx` exists
**Props:** ✅ `metadata` and `rankingData` passed from parent
**NOT Conditional:** ⚠️ **Always renders** (no `visibleColumns.appRanking` check)

---

## 🔧 PARENT COMPONENT ANALYSIS

### KeywordComboTable.tsx

**Props Interface (Lines 73-78):**
```typescript
interface KeywordComboTableProps {
  metadata?: {
    appId?: string;
    country?: string;
  };
}
```

✅ Accepts metadata props

**Hook Calls:**
1. **Rankings:** Lines 152-229 - `fetchRankingsIfNeeded()` - ✅ Implemented
2. **Popularity:** Lines 255-258 - `useKeywordPopularity()` - ✅ Implemented

**Passing Props to Row (Lines 795-807):**
```typescript
<KeywordComboRow
  key={`${combo.text}-${actualIdx}`}
  combo={combo}
  index={actualIdx}
  isSelected={selectedIndices.has(actualIdx)}
  visibleColumns={visibleColumns}
  density={density}
  metadata={metadata}  // ✅
  rankingData={rankingData}  // ✅
  rankingsLoading={isFetchingRankings && !cachedRankings.has(combo.text)}  // ✅
  popularityData={popularityScores.get(combo.text.toLowerCase())}  // ✅
  popularityLoading={popularityLoading}  // ✅
/>
```

✅ All props passed correctly

---

## 🚨 POTENTIAL ROOT CAUSES

### Hypothesis 1: Missing Metadata Prop at Top Level ❓
**EnhancedKeywordComboWorkbench.tsx:623**
```typescript
<KeywordComboTable metadata={metadata} />
```

✅ Metadata IS being passed

But what IS metadata? Let's check the props:
```typescript
interface EnhancedKeywordComboWorkbenchProps {
  comboCoverage: UnifiedMetadataAuditResult['comboCoverage'];
  keywordCoverage: UnifiedMetadataAuditResult['keywordCoverage'];
  metadata: {
    title: string;
    subtitle: string;
    appId?: string; // ✅ Added
    country?: string; // ✅ Added
  };
}
```

✅ Props interface includes appId and country

### Hypothesis 2: ColumnVisibility State Issue ⚠️
**KeywordComboTable.tsx Lines 82-93:**
```typescript
const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>({
  status: false,      // Hidden
  type: true,
  priority: false,    // Hidden
  semantic: false,    // Hidden
  novelty: false,     // Hidden
  noise: false,       // Hidden
  source: true,
  length: true,
  competition: true,  // ✅ Visible by default
});
```

✅ Competition column visible by default

**BUT:** Popularity and App Ranking columns are **NOT in visibleColumns state** - they always render

### Hypothesis 3: Table Headers Missing? 🔴 POSSIBLE

Let me check if headers exist:

**KeywordComboTable.tsx Lines 730-740:**
```typescript
{visibleColumns.competition && (
  <SortableHeader column="competition" onClick={() => handleSort('competition')} sortIcon={getSortIcon('competition')}>
    Competition
  </SortableHeader>
)}
<SortableHeader column="popularity" onClick={() => handleSort('popularity')} sortIcon={getSortIcon('popularity')}>
  Popularity
</SortableHeader>
<SortableHeader column="appRanking" onClick={() => handleSort('appRanking')} sortIcon={getSortIcon('appRanking')}>
  App Ranking
</SortableHeader>
```

✅ All 3 headers exist
⚠️ Popularity and App Ranking headers **NOT conditional** (always show)

### Hypothesis 4: Column Count Mismatch 🔴 **LIKELY CAUSE**

**Problem:** The table has dynamic columns based on `visibleColumns`, but:
- Competition: Conditional (only if `visibleColumns.competition`)
- Popularity: **Always renders**
- App Ranking: **Always renders**

If `visibleColumns.competition` is `false`, there will be a **column count mismatch** between headers and cells!

**Empty State colSpan (Line 756):**
```typescript
<TableCell colSpan={12} className="h-48 text-center">
```

🔴 **HARDCODED to 12 columns** - This is fragile!

### Hypothesis 5: Missing Store Update 🔴 **LIKELY CAUSE**

**useKeywordComboStore.ts Line 12:**
```typescript
export type SortColumn = 'text' | 'source' | 'type' | 'relevance' | 'length' | 'competition' | 'appRanking' | 'popularity';
```

✅ All 3 sort columns added to type

**But check the sorting logic:**

Do the sorting handlers actually exist for these columns?

---

## 🎯 MOST LIKELY ROOT CAUSE

### **Column Visibility Inconsistency**

**The Problem:**
1. Competition column: Uses `visibleColumns.competition` (conditional)
2. Popularity column: **No visibility toggle** (always renders)
3. App Ranking column: **No visibility toggle** (always renders)

**This creates:**
- Mismatched header/cell counts
- Potential layout breakage
- Hardcoded colSpan values that don't account for dynamic columns

---

## ✅ RECOMMENDED FIX

### Option 1: Make ALL columns unconditional (simplest)
Remove `visibleColumns.competition` check - always show all 3 columns

### Option 2: Add visibility toggles for Popularity & App Ranking
```typescript
interface ColumnVisibility {
  // ... existing
  competition: boolean;
  popularity: boolean;   // ADD
  appRanking: boolean;   // ADD
}
```

And wrap cells:
```typescript
{visibleColumns.popularity && (
  <TableCell>...</TableCell>
)}

{visibleColumns.appRanking && (
  <TableCell>...</TableCell>
)}
```

### Option 3: Calculate colSpan dynamically
```typescript
const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length + 4; // +4 for always-visible
<TableCell colSpan={visibleColumnCount}>
```

---

## 🧪 DEBUGGING STEPS

1. **Open browser console** - Check for React errors
2. **Inspect table DOM** - Count `<th>` vs `<td>` elements
3. **Check if data is fetching** - Look for network requests to:
   - `/functions/v1/check-combo-rankings`
   - `/functions/v1/keyword-popularity`
4. **Check metadata values** - Are `appId` and `country` actually passed?
5. **Check visibleColumns state** - Is `competition` true?

---

## 🚀 NEXT STEPS

1. User needs to provide **specific error symptoms**:
   - Are columns completely missing?
   - Are columns showing but empty?
   - Are there console errors?
   - Is the table layout broken?

2. Based on symptoms, apply one of the fixes above

3. Test thoroughly before declaring "fixed"

---

## 📌 CRITICAL NOTES

- **These columns were NEVER committed to git** - they only exist as unstaged changes
- The "revert" only reverted title text - it didn't revert these columns because they were never in git history
- If we need to truly revert, we'd need to `git checkout HEAD -- [files]` which would DELETE all this work
- We should FIX forward, not revert, to preserve the column implementations

