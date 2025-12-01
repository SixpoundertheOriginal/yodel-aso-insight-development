# Competition Indicator Feature - Audit & Plan

**Date**: December 1, 2025
**Feature**: Add "Indexed Apps" / "Competition" column to combo tables
**Goal**: Identify low-competition keywords (fewer apps ranked = easier to rank)

---

## Executive Summary

User wants to add a column showing **how many apps are indexed/ranked** for each keyword combo to identify low-competition opportunities.

**Good News**: We're already capturing this data! The iTunes API returns `resultCount` (total apps found), and we store it in `keyword_rankings.serp_snapshot.total_results`. We just need to pass it through to the frontend.

**Implementation Effort**: ~1 hour (backend + frontend changes)
**Database Migration**: None needed (data already exists)
**Deployment**: Edge function + frontend only

---

## Current State Audit

### Data Already Available ✅

**Backend** (`supabase/functions/check-combo-rankings/index.ts`):
- Line 36: `totalResults: number` in `ComboRankingResult` interface
- Line 767: iTunes API returns `searchData.resultCount`
- Line 838: Stored in DB as `serp_snapshot: { total_results, checked_top_n }`
- Line 653, 868: Returned in edge function response

**Database** (`keyword_rankings` table):
- Column: `serp_snapshot JSONB`
- Structure: `{ "total_results": 2435, "checked_top_n": 100 }`
- Example values: 50-10000+ apps per keyword

**Frontend Gap** ❌:
- `src/hooks/useBatchComboRankings.ts` line 17-24: `ComboRankingData` interface is missing `totalResults`
- Line 111-118: Mapping from backend to frontend drops `totalResults` field
- UI components don't display this data

### Example Data Flow (Current)

```
iTunes API Response
└─> resultCount: 2435

Edge Function (check-combo-rankings)
└─> totalResults: 2435
    └─> Stored in DB: serp_snapshot.total_results = 2435
    └─> Returned to frontend: { totalResults: 2435 }

Frontend Hook (useBatchComboRankings)
└─> ❌ DROPS totalResults (line 111-118)
    └─> NOT passed to UI components
```

---

## Questions for User

Before implementing, I need clarification on:

### 1. Display Location

Where should this column appear?

**Option A: Keyword Combo Workbench Table** (primary table in Audit V2)
- File: `src/components/AppAudit/KeywordComboWorkbench/KeywordComboTable.tsx`
- Current columns: Combo, Status, Type, Priority, Semantic, Novelty, Noise, Source, Length, Ranking
- New column: "Competition" or "Indexed Apps"

**Option B: Competitive Intelligence → Keyword Ranking Tab**
- File: `src/components/AppAudit/CompetitiveIntelligence/KeywordRankingTab.tsx`
- Focused view for ranking data
- Better UX for competitive analysis

**Option C: Both** (recommended)
- Add to main table for quick scanning
- Add to ranking tab for detailed analysis

**My Recommendation**: **Option C (Both)** - Add to main workbench table as it helps prioritize which combos to focus on.

---

### 2. Column Name

What should we call this column?

| Option | Pros | Cons | Example |
|--------|------|------|---------|
| **"Competition"** | Clear intent, short | Ambiguous (high/low?) | 2,435 apps |
| **"Indexed Apps"** | Technically accurate | Longer, less clear | 2,435 indexed |
| **"App Count"** | Simple, short | Generic | 2,435 |
| **"Market Size"** | Business-focused | Confusing (not revenue) | 2,435 apps |
| **"Results"** | Matches iTunes API | Vague meaning | 2,435 results |
| **"Total Apps"** | Descriptive | Longer | 2,435 |

**My Recommendation**: **"Competition"** with tooltip explaining "Total apps indexed by Apple for this keyword"

---

### 3. Display Format

How should we display this data?

**Option A: Number Only**
```
2,435
```
- Simple, compact
- User interprets meaning

**Option B: Number + Badge**
```
2,435 apps  [Low Competition]
```
- Shows number + interpretation
- Takes more space
- Need to define thresholds

**Option C: Badge with Tooltip**
```
[Low]  (hover: "2,435 apps indexed")
```
- Compact, color-coded
- Hides exact number unless hover
- Fastest to scan

**Option D: Number + Color Indicator**
```
2,435  🟢
```
- Shows both number and signal
- Color indicates competition level

**My Recommendation**: **Option D** - Show formatted number (2,435) with color dot indicator:
- 🟢 Green dot: < 500 apps (Low competition)
- 🟡 Yellow dot: 500-2000 apps (Medium competition)
- 🔴 Red dot: > 2000 apps (High competition)

---

### 4. Competition Level Thresholds

What defines "low", "medium", "high" competition?

**Proposed Thresholds** (based on ASO best practices):

| Level | Range | Color | Strategy |
|-------|-------|-------|----------|
| **Low** | < 500 apps | 🟢 Green | Easy to rank, high opportunity |
| **Medium** | 500-2,000 | 🟡 Yellow | Moderate effort, good ROI |
| **High** | 2,000-5,000 | 🟠 Orange | Hard to rank, competitive |
| **Very High** | > 5,000 | 🔴 Red | Extremely competitive, avoid |

**Questions**:
- Do these thresholds make sense for your use case?
- Should we make thresholds configurable per organization?
- Should we adjust thresholds by category? (e.g., "fitness" is more competitive than "meditation timer")

**My Recommendation**: Start with fixed thresholds above, make configurable later if needed.

---

### 5. Sorting Capability

Should users be able to sort by this column?

**Use Cases**:
- Sort ascending: Find lowest competition keywords (easiest to rank)
- Sort descending: Find highest competition keywords (validate if worth targeting)

**My Recommendation**: **Yes, add sortable column** - Very useful for identifying opportunities.

---

### 6. Null Data Handling

What if we don't have competition data yet?

**Scenario**: Combo exists in table but hasn't been ranked yet (no `totalResults` data)

**Options**:
- Show "-" (dash)
- Show "N/A"
- Show "Not Checked"
- Show empty cell
- Show "Check Ranking" button

**My Recommendation**: Show "-" (dash) until first ranking check, then cache value.

---

### 7. Data Staleness

Should we show when competition data was last updated?

**Current System**: Rankings cached for 24 hours

**Options**:
- Don't show age (simpler)
- Show age on hover (e.g., "2,435 apps • Checked 2h ago")
- Show stale indicator if > 7 days old

**My Recommendation**: Show age on hover (reuse existing `formatCacheAge` helper from `useBatchComboRankings.ts`).

---

## Technical Implementation Plan

### Phase 1: Backend (Already Complete! ✅)

No changes needed - data already flows through edge function.

```typescript
// supabase/functions/check-combo-rankings/index.ts
// Line 864-872 - Already returning totalResults
return {
  combo,
  position: finalPosition,
  isRanking,
  totalResults: searchData.resultCount,  // ✅ Already here!
  checkedAt: new Date().toISOString(),
  trend,
  positionChange,
};
```

### Phase 2: Frontend Hook Updates

**File**: `src/hooks/useBatchComboRankings.ts`

**Changes**:
1. Add `totalResults` to `ComboRankingData` interface (line 17-24)
2. Include `totalResults` in mapping (line 111-118)

**Before**:
```typescript
export interface ComboRankingData {
  position: number | null;
  isRanking: boolean;
  snapshotDate: string;
  trend: 'up' | 'down' | 'stable' | 'new' | null;
  positionChange: number | null;
  visibilityScore: number | null;
}
```

**After**:
```typescript
export interface ComboRankingData {
  position: number | null;
  isRanking: boolean;
  snapshotDate: string;
  trend: 'up' | 'down' | 'stable' | 'new' | null;
  positionChange: number | null;
  visibilityScore: number | null;
  totalResults: number | null;  // ✅ Add this
}
```

**Mapping Fix** (line 111-118):
```typescript
newRankings.set(rankingResult.combo, {
  position: rankingResult.position,
  isRanking: rankingResult.isRanking,
  snapshotDate: rankingResult.checkedAt,
  trend: rankingResult.trend,
  positionChange: rankingResult.positionChange,
  visibilityScore: null,
  totalResults: rankingResult.totalResults,  // ✅ Add this
});
```

### Phase 3: Create Competition Cell Component

**File**: `src/components/AppAudit/KeywordComboWorkbench/CompetitionCell.tsx` (new file)

```typescript
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CompetitionCellProps {
  totalResults: number | null;
  checkedAt?: string;
}

type CompetitionLevel = 'low' | 'medium' | 'high' | 'very-high';

function getCompetitionLevel(totalResults: number): CompetitionLevel {
  if (totalResults < 500) return 'low';
  if (totalResults < 2000) return 'medium';
  if (totalResults < 5000) return 'high';
  return 'very-high';
}

function getCompetitionColor(level: CompetitionLevel): string {
  switch (level) {
    case 'low': return 'bg-green-500/20 text-green-400 border-green-500/50';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
    case 'very-high': return 'bg-red-500/20 text-red-400 border-red-500/50';
  }
}

function getCompetitionDot(level: CompetitionLevel): string {
  switch (level) {
    case 'low': return '🟢';
    case 'medium': return '🟡';
    case 'high': return '🟠';
    case 'very-high': return '🔴';
  }
}

export const CompetitionCell: React.FC<CompetitionCellProps> = ({ totalResults, checkedAt }) => {
  if (totalResults === null) {
    return <span className="text-zinc-500">-</span>;
  }

  const level = getCompetitionLevel(totalResults);
  const formatted = totalResults.toLocaleString();
  const dot = getCompetitionDot(level);

  const tooltipText = `${formatted} apps indexed by Apple for this keyword`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{dot}</span>
            <span className="text-sm font-mono">{formatted}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <div className="font-semibold">{tooltipText}</div>
            <div className="text-zinc-400 mt-1">
              Competition: <span className="capitalize">{level.replace('-', ' ')}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
```

### Phase 4: Add Column to Table

**File**: `src/components/AppAudit/KeywordComboWorkbench/KeywordComboTable.tsx`

**Changes**:

1. **Add to column visibility state** (line 37-46):
```typescript
interface ColumnVisibility {
  status: boolean;
  type: boolean;
  priority: boolean;
  semantic: boolean;
  novelty: boolean;
  noise: boolean;
  source: boolean;
  length: boolean;
  competition: boolean;  // ✅ Add this
}
```

2. **Add to initial state** (line 77-86):
```typescript
const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>({
  status: true,
  type: true,
  priority: true,
  semantic: true,
  novelty: true,
  noise: true,
  source: true,
  length: true,
  competition: true,  // ✅ Add this
});
```

3. **Add sortable header** (after line ~450):
```typescript
{visibleColumns.competition && (
  <SortableHeader
    column="competition"
    onClick={() => handleSort('competition')}
    sortIcon={getSortIcon('competition')}
  >
    Competition
  </SortableHeader>
)}
```

4. **Pass data to row component** (line ~574):
```typescript
<KeywordComboRow
  // ... existing props
  rankingData={rankings.get(combo.text)}
  rankingsLoading={rankingsLoading}
/>
```

5. **Add to column toggle popover** (in the Columns dropdown):
```typescript
<div className="flex items-center gap-2">
  <Checkbox
    checked={visibleColumns.competition}
    onCheckedChange={() => toggleColumn('competition')}
  />
  <span>Competition</span>
</div>
```

### Phase 5: Update Row Component

**File**: `src/components/AppAudit/KeywordComboWorkbench/KeywordComboRow.tsx`

**Add competition cell**:
```typescript
import { CompetitionCell } from './CompetitionCell';

{visibleColumns.competition && (
  <TableCell>
    <CompetitionCell
      totalResults={rankingData?.totalResults ?? null}
      checkedAt={rankingData?.snapshotDate}
    />
  </TableCell>
)}
```

### Phase 6: Add Sorting Logic

**File**: `src/stores/useKeywordComboStore.ts`

**Add to SortColumn type**:
```typescript
export type SortColumn =
  | 'text'
  | 'priority'
  | 'semantic'
  | 'novelty'
  | 'noise'
  | 'source'
  | 'length'
  | 'competition';  // ✅ Add this
```

**Add sorting function** (in the store):
```typescript
// When sorting by competition, need to join with ranking data
case 'competition':
  return [...combos].sort((a, b) => {
    const aResults = rankingsMap.get(a.text)?.totalResults ?? Infinity;
    const bResults = rankingsMap.get(b.text)?.totalResults ?? Infinity;
    return direction === 'asc'
      ? aResults - bResults  // Low competition first
      : bResults - aResults; // High competition first
  });
```

---

## Implementation Checklist

### Backend ✅
- [x] Edge function returns `totalResults` (already done)
- [x] Database stores `serp_snapshot.total_results` (already done)

### Frontend
- [ ] Update `ComboRankingData` interface to include `totalResults`
- [ ] Update hook mapping to include `totalResults`
- [ ] Create `CompetitionCell` component
- [ ] Add column to table header
- [ ] Add column to row component
- [ ] Add column visibility toggle
- [ ] Add sorting logic
- [ ] Test with real data
- [ ] Deploy frontend

**Estimated Time**: 1-2 hours total

---

## Success Metrics

After implementation, users should be able to:

✅ **Identify Low-Competition Opportunities**
- Sort by competition ascending
- See keywords with < 500 apps (green dot)
- Prioritize these for ranking efforts

✅ **Validate Keyword Difficulty**
- See if high-priority keywords are actually achievable
- Example: "meditation timer" (245 apps) vs "fitness app" (8,432 apps)

✅ **Make Data-Driven Decisions**
- Filter out ultra-competitive keywords (> 5,000 apps)
- Focus resources on winnable battles

---

## Example UI Mock

```
┌────────────────────────────────────────────────────────────────────┐
│ Keyword Combo Table                                                │
├────────────────┬─────────┬──────────────┬──────────────────────────┤
│ Combo          │ Ranking │ Competition  │ Priority                 │
├────────────────┼─────────┼──────────────┼──────────────────────────┤
│ meditation app │ #12     │ 🟢 245       │ High                     │
│ wellness self  │ Not Top │ 🟡 1,834     │ Medium                   │
│ fitness app    │ #47     │ 🔴 8,432     │ Low (too competitive)    │
│ yoga timer     │ -       │ 🟢 127       │ High (easy win!)         │
└────────────────┴─────────┴──────────────┴──────────────────────────┘
```

When hovering over "🟢 245":
```
┌──────────────────────────────────────┐
│ 245 apps indexed by Apple for this   │
│ keyword                              │
│                                      │
│ Competition: Low                     │
│ Last checked: 2h ago                 │
└──────────────────────────────────────┘
```

---

## Future Enhancements (Optional)

### 1. Historical Competition Trends
Track how competition changes over time:
- "meditation app": 245 apps → 310 apps (+26% in 30 days)
- Shows growing/declining markets

### 2. Competition vs Ranking Correlation
Show insights like:
- "You rank #12 in a field of 245 apps (top 5%)"
- "To reach top 10, you need to beat 2 apps"

### 3. Smart Recommendations
AI-powered suggestions:
- "Focus on 'yoga timer' (127 apps) before 'fitness app' (8,432 apps)"
- "Your ranking #47 in high competition (8,432 apps) is impressive!"

### 4. Category-Adjusted Thresholds
Different thresholds per category:
- Productivity: < 300 = low, > 2000 = high
- Games: < 1000 = low, > 10000 = high

---

## Questions Summary

Please answer:

1. **Display Location**: Main workbench table, ranking tab, or both?
2. **Column Name**: "Competition", "Indexed Apps", or other?
3. **Display Format**: Number only, number + badge, badge only, or number + dot?
4. **Thresholds**: Are < 500 (low), 500-2000 (medium), > 2000 (high) good?
5. **Sorting**: Should users sort by this column? (Recommended: yes)
6. **Null Handling**: Show "-" for unchecked keywords? (Recommended: yes)
7. **Staleness**: Show age on hover? (Recommended: yes)

**My Recommendations**:
1. Both (main table + ranking tab)
2. "Competition"
3. Number + color dot (🟢 245)
4. Yes, thresholds look good
5. Yes, sortable
6. Yes, show "-"
7. Yes, show age on hover

---

## Ready to Implement?

Once you answer the questions above, I can implement this feature in ~1 hour with zero database migration needed (data already exists!).

This will be a high-value feature for identifying keyword opportunities and making data-driven ASO decisions.
