# App Ranking State Management - Improvement Plan

**Date**: December 1, 2025
**Issue**: Rankings show "Checking..." on every sort/filter change
**Goal**: Cache rankings in memory, only fetch once per day or on manual refresh

---

## Current Problem

### What Happens Now

1. **User sorts by column** → `sortedCombos` order changes
2. **`allComboTexts` array recreated** with new order
3. **`combosKey` changes** (based on JSON.stringify of combos)
4. **`useBatchComboRankings` hook re-runs** (combosKey is in dependency array)
5. **Shows "Checking..."** even though data is already cached
6. **Re-fetches from edge function** (which returns cached data from `combo_rankings_cache`)

### Result
- Unnecessary "Checking..." state on every interaction
- Hook re-runs on sort/filter despite having the data
- User sees loading spinner when data is already available

---

## Root Cause

**File**: `src/components/AppAudit/KeywordComboWorkbench/KeywordComboTable.tsx` (Lines 113-117)

```typescript
// Problem: This recreates array on every sort/filter
const allComboTexts = sortedCombos.map(c => c.text);

// Hook depends on combosKey which changes when array order changes
const { rankings, isLoading: rankingsLoading, refresh: refreshRankings } = useBatchComboRankings(
  metadata?.appId,
  allComboTexts,  // ← New array reference every time sortedCombos changes
  metadata?.country || 'us'
);
```

**File**: `src/hooks/useBatchComboRankings.ts` (Line 44, 189)

```typescript
// combosKey is based on JSON.stringify(combos)
const combosKey = useMemo(() => JSON.stringify(combos), [combos]);

// Hook re-runs when combosKey changes
}, [appId, country, combosKey]); // ← combosKey changes when array order changes
```

---

## Solution Design

### Option 1: Sort-Agnostic combosKey (RECOMMENDED)

**Idea**: Make `combosKey` independent of array order by sorting combo names before stringifying.

**Implementation**:
```typescript
// In useBatchComboRankings.ts
const combosKey = useMemo(() => {
  // Sort combos alphabetically to make key order-independent
  const sortedCombos = [...combos].sort();
  return JSON.stringify(sortedCombos);
}, [combos]);
```

**Benefits**:
- ✅ Simple fix (one line change)
- ✅ Hook only re-runs when combo SET changes (not order)
- ✅ Maintains all existing logic
- ✅ No breaking changes

**Drawbacks**:
- Still re-runs if user adds/removes combos from filter

### Option 2: Separate Fetch Logic from Display (BETTER)

**Idea**: Fetch rankings once on mount, store in table state, only re-fetch on explicit refresh or daily expiry.

**Implementation**:
1. **Fetch once on mount** using all unique combos (unfiltered)
2. **Store rankings in table state** (Map<combo, data>)
3. **Display filtered/sorted combos** using stored rankings
4. **Only re-fetch** on:
   - Manual refresh button click
   - Daily cache expiry (check snapshotDate)
   - New app/country selected

**Code Structure**:
```typescript
// KeywordComboTable.tsx
const [cachedRankings, setCachedRankings] = useState<Map<string, ComboRankingData>>(new Map());
const [lastFetchDate, setLastFetchDate] = useState<string | null>(null);

// Fetch rankings ONLY once or on explicit trigger
useEffect(() => {
  const today = new Date().toISOString().split('T')[0];

  // Only fetch if:
  // - Never fetched before
  // - New day
  // - App/country changed
  if (!lastFetchDate || lastFetchDate !== today || appIdChanged || countryChanged) {
    fetchRankings();
  }
}, [metadata?.appId, metadata?.country]);

// Display uses cached data
const rankingData = cachedRankings.get(combo.text);
```

**Benefits**:
- ✅ Zero unnecessary re-fetches
- ✅ Instant sorting/filtering (no loading state)
- ✅ Clear daily refresh logic
- ✅ User understands when data is stale

**Drawbacks**:
- More code changes
- Need to manage cache state manually

### Option 3: React Query / SWR (BEST LONG-TERM)

**Idea**: Use proper data fetching library with built-in caching.

**Implementation**:
```typescript
import { useQuery } from '@tanstack/react-query';

const { data: rankings } = useQuery({
  queryKey: ['combo-rankings', appId, country, combos.sort()],
  queryFn: () => fetchRankings(appId, combos, country),
  staleTime: 24 * 60 * 60 * 1000, // 24 hours
  cacheTime: 24 * 60 * 60 * 1000,
});
```

**Benefits**:
- ✅ Professional caching solution
- ✅ Automatic stale-while-revalidate
- ✅ Built-in refetch on window focus
- ✅ Optimistic updates
- ✅ Parallel request deduplication

**Drawbacks**:
- Requires adding dependency
- Needs React Query provider setup
- Overkill for simple case

---

## Recommended Implementation: Option 2

### Phase 1: Quick Fix (5 min)

**File**: `src/hooks/useBatchComboRankings.ts` (Line 44)

```typescript
// BEFORE
const combosKey = useMemo(() => JSON.stringify(combos), [combos]);

// AFTER
const combosKey = useMemo(() => {
  // Sort combos alphabetically to make key order-independent
  const sortedCombos = [...combos].sort();
  return JSON.stringify(sortedCombos);
}, [combos]);
```

This instantly fixes the "Checking..." on sort issue.

### Phase 2: Proper State Management (30 min)

**File**: `src/components/AppAudit/KeywordComboWorkbench/KeywordComboTable.tsx`

#### 2.1: Add Cache State

```typescript
// Add to KeywordComboTable component
const [cachedRankings, setCachedRankings] = useState<Map<string, ComboRankingData>>(new Map());
const [lastFetchTimestamp, setLastFetchTimestamp] = useState<number | null>(null);
const [isFetchingRankings, setIsFetchingRankings] = useState(false);
```

#### 2.2: Check Cache Validity

```typescript
const isCacheValid = useMemo(() => {
  if (!lastFetchTimestamp) return false;

  const now = Date.now();
  const cacheAge = now - lastFetchTimestamp;
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  return cacheAge < CACHE_TTL;
}, [lastFetchTimestamp]);
```

#### 2.3: Fetch Only When Needed

```typescript
const fetchRankingsIfNeeded = useCallback(async (force = false) => {
  // Skip if cache is valid and not forcing refresh
  if (isCacheValid && !force) {
    console.log('[KeywordComboTable] Using cached rankings (valid for 24h)');
    return;
  }

  if (!metadata?.appId || combos.length === 0) return;

  try {
    setIsFetchingRankings(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Get organization_id
    const { data: appData } = await supabase
      .from('monitored_apps')
      .select('organization_id')
      .eq('app_id', metadata.appId)
      .eq('platform', 'ios')
      .single();

    if (!appData) return;

    // Fetch from edge function (returns from combo_rankings_cache)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-combo-rankings`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          appId: metadata.appId,
          combos: combos.map(c => c.text),
          country: metadata.country || 'us',
          platform: 'ios',
          organizationId: appData.organization_id,
        }),
      }
    );

    const result = await response.json();

    if (result.success && result.results) {
      const newRankings = new Map<string, ComboRankingData>();

      for (const rankingResult of result.results) {
        newRankings.set(rankingResult.combo, {
          position: rankingResult.position,
          isRanking: rankingResult.isRanking,
          snapshotDate: rankingResult.checkedAt,
          trend: rankingResult.trend,
          positionChange: rankingResult.positionChange,
          visibilityScore: null,
          totalResults: rankingResult.totalResults ?? null,
        });
      }

      setCachedRankings(newRankings);
      setLastFetchTimestamp(Date.now());

      console.log(`[KeywordComboTable] Cached ${newRankings.size} rankings (valid for 24h)`);
    }
  } catch (error) {
    console.error('[KeywordComboTable] Failed to fetch rankings:', error);
  } finally {
    setIsFetchingRankings(false);
  }
}, [metadata?.appId, metadata?.country, combos, isCacheValid]);
```

#### 2.4: Fetch Once on Mount

```typescript
useEffect(() => {
  fetchRankingsIfNeeded();
}, [fetchRankingsIfNeeded]);
```

#### 2.5: Manual Refresh Button

```typescript
<Button
  onClick={() => fetchRankingsIfNeeded(true)}
  disabled={isFetchingRankings}
  className="h-8 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
>
  {isFetchingRankings ? (
    <>
      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
      Refreshing...
    </>
  ) : (
    <>
      <RefreshCw className="h-3 w-3 mr-2" />
      Refresh Rankings
    </>
  )}
</Button>
```

#### 2.6: Display Cached Data

```typescript
// For each row
const rankingData = cachedRankings.get(combo.text);

<KeywordComboRow
  combo={combo}
  index={paginatedIdx}
  isSelected={selectedIndices.has(paginatedIdx)}
  visibleColumns={visibleColumns}
  density={density}
  metadata={metadata}
  rankingData={rankingData}
  rankingsLoading={isFetchingRankings && !cachedRankings.has(combo.text)}
/>
```

#### 2.7: Show Cache Status

```typescript
{cachedRankings.size > 0 && (
  <div className="text-xs text-zinc-500">
    Rankings cached ({cachedRankings.size} combos) •
    {isCacheValid ? (
      <span className="text-emerald-400">Fresh</span>
    ) : (
      <span className="text-yellow-400">Stale (refresh recommended)</span>
    )}
  </div>
)}
```

---

## Benefits After Implementation

### User Experience
- ✅ **No "Checking..." on sort/filter** - instant display using cached data
- ✅ **Clear refresh indicator** - users know when data is loading
- ✅ **Stale data warning** - visual indicator when cache is >24h old
- ✅ **Manual refresh control** - explicit button to update rankings
- ✅ **Automatic daily refresh** - fresh data when cache expires

### Performance
- ✅ **Zero unnecessary API calls** - only fetch on mount or manual trigger
- ✅ **Instant sorting/filtering** - no re-fetch on display changes
- ✅ **Efficient batching** - all combos fetched in one request
- ✅ **Server-side caching** - edge function returns from `combo_rankings_cache`

### Maintainability
- ✅ **Clear separation** - fetch logic separate from display logic
- ✅ **Predictable behavior** - easy to understand when data updates
- ✅ **Testable** - can mock cache state independently
- ✅ **Debuggable** - console logs show cache hits/misses

---

## Testing Plan

### Test 1: Initial Load
1. Load app audit page
2. **Expect**: Shows "Refreshing..." for ~5 seconds
3. **Expect**: Rankings display
4. **Expect**: Console shows "Cached 77 rankings (valid for 24h)"

### Test 2: Sort Without Refetch
1. Click "App Ranking" header to sort
2. **Expect**: NO "Checking..." state
3. **Expect**: Instant re-sort using cached data
4. **Expect**: No API calls in Network tab

### Test 3: Filter Without Refetch
1. Type in search box to filter combos
2. **Expect**: NO "Checking..." state
3. **Expect**: Instant filter using cached data
4. **Expect**: No API calls in Network tab

### Test 4: Manual Refresh
1. Click "Refresh Rankings" button
2. **Expect**: Button shows "Refreshing..." spinner
3. **Expect**: API call in Network tab
4. **Expect**: Rankings update
5. **Expect**: Cache timestamp updates

### Test 5: Cache Expiry
1. Set `lastFetchTimestamp` to 25 hours ago (mock)
2. **Expect**: "Stale (refresh recommended)" warning
3. Refresh page
4. **Expect**: Auto-refetch on mount

---

## Migration Path

### Step 1: Quick Fix (Deploy Now)
- Sort combos before stringifying in `combosKey`
- Fixes "Checking..." on sort
- No breaking changes

### Step 2: Proper Implementation (Next Session)
- Add cache state to table component
- Fetch once on mount
- Manual refresh button
- Daily expiry logic

### Step 3: Polish (Optional)
- Add "Last refreshed X minutes ago" display
- Show cache hit rate in console
- Add refresh on window focus
- Persist cache to localStorage (survive page refresh)

---

## Files to Modify

1. **src/hooks/useBatchComboRankings.ts** (Phase 1)
   - Line 44: Sort combos before stringifying

2. **src/components/AppAudit/KeywordComboWorkbench/KeywordComboTable.tsx** (Phase 2)
   - Add cache state variables
   - Add fetch function with validity check
   - Update button to use manual refresh
   - Pass cached data to rows

3. **src/components/AppAudit/KeywordComboWorkbench/RankingCell.tsx** (Phase 2)
   - Update loading logic to check cache
   - Show stale indicator if cache >24h old
