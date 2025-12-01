# Keyword Combo Table System Documentation

**Version:** 2.0 (Current - Working)
**Last Updated:** 2025-12-01
**Status:** ✅ **PRODUCTION READY**

---

## 🎯 OVERVIEW

The Keyword Combo Table displays comprehensive keyword intelligence with 3 key metrics:
1. **Competition** - How many apps compete for this keyword
2. **Popularity** - Search demand score (0-100)
3. **App Ranking** - Your app's position in search results

---

## 🏗️ SYSTEM ARCHITECTURE

### Component Hierarchy

```
UnifiedMetadataAuditModule
  ↓ passes metadata (appId, country)
EnhancedKeywordComboWorkbench
  ↓ passes metadata prop
KeywordComboTable (Table Container)
  ↓ fetches data & passes props
KeywordComboRow (Individual Row)
  ↓ renders cells
CompetitionCell | PopularityCell | RankingCell
```

---

## 📊 DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│ UnifiedMetadataAuditModule.tsx                              │
│                                                             │
│ metadata = {                                                │
│   appId: "1234567890",                                      │
│   country: "us",                                            │
│   title: "App Title",                                       │
│   subtitle: "App Subtitle"                                  │
│ }                                                           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓ passes metadata
┌─────────────────────────────────────────────────────────────┐
│ EnhancedKeywordComboWorkbench.tsx                           │
│                                                             │
│ <KeywordComboTable metadata={metadata} />                  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓ receives metadata prop
┌─────────────────────────────────────────────────────────────┐
│ KeywordComboTable.tsx                                       │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 1. Fetch Rankings (Competition + App Ranking)       │   │
│ │    fetchRankingsIfNeeded()                          │   │
│ │    ↓                                                 │   │
│ │    Edge Function: check-combo-rankings              │   │
│ │    ↓                                                 │   │
│ │    Returns: Map<comboText, ComboRankingData>        │   │
│ │    - position: number | null                        │   │
│ │    - totalResults: number | null (COMPETITION)      │   │
│ │    - snapshotDate: string                           │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 2. Fetch Popularity Scores                          │   │
│ │    useKeywordPopularity(combos, country)            │   │
│ │    ↓                                                 │   │
│ │    Edge Function: keyword-popularity                │   │
│ │    ↓                                                 │   │
│ │    Returns: Map<keyword, KeywordPopularityData>     │   │
│ │    - popularity_score: 0-100                        │   │
│ │    - autocomplete_score: 0-1                        │   │
│ │    - intent_score: 0-1                              │   │
│ │    - length_prior: 0-1                              │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 3. Pass Data to Rows                                │   │
│ │    <KeywordComboRow                                 │   │
│ │      rankingData={cachedRankings.get(combo.text)}   │   │
│ │      popularityData={popularityScores.get(...)}     │   │
│ │      metadata={metadata}                            │   │
│ │    />                                               │   │
│ └─────────────────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓ passes data props
┌─────────────────────────────────────────────────────────────┐
│ KeywordComboRow.tsx                                         │
│                                                             │
│ ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐ │
│ │ CompetitionCell │  │ Popularity   │  │ RankingCell    │ │
│ │                 │  │ (inline)     │  │                │ │
│ │ Shows:          │  │ Shows:       │  │ Shows:         │ │
│ │ totalResults    │  │ score + 🔥   │  │ position #1-100│ │
│ └─────────────────┘  └──────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 KEY COMPONENTS & FILES

### 1. **Parent Component**
**File:** `src/components/AppAudit/UnifiedMetadataAuditModule/UnifiedMetadataAuditModule.tsx`

**Responsibility:** Passes metadata to child workbench

**Critical Code (Lines 418-427):**
```typescript
<EnhancedKeywordComboWorkbench
  comboCoverage={auditResult.comboCoverage}
  keywordCoverage={auditResult.keywordCoverage}
  metadata={{
    title: metadata.title || '',
    subtitle: metadata.subtitle || '',
    appId: metadata.appId,  // ✅ CRITICAL
    country: metadata.locale?.split('-')[1]?.toLowerCase() || 'us', // ✅ CRITICAL
  }}
/>
```

**🚨 CRITICAL:** If `appId` or `country` are undefined, columns will be empty!

---

### 2. **Workbench Wrapper**
**File:** `src/components/AppAudit/KeywordComboWorkbench/EnhancedKeywordComboWorkbench.tsx`

**Responsibility:** Passes metadata prop to table

**Critical Code (Lines 35-40, 623):**
```typescript
// Props interface
interface EnhancedKeywordComboWorkbenchProps {
  metadata: {
    title: string;
    subtitle: string;
    appId?: string; // For brand override storage + RANKINGS
    country?: string; // For ranking checks (e.g., 'us', 'gb')
  };
}

// Usage
<KeywordComboTable metadata={metadata} />
```

**✅ SAFE TO CHANGE:** UI text, layout
**🚨 NEVER CHANGE:** metadata prop passing

---

### 3. **Table Container**
**File:** `src/components/AppAudit/KeywordComboWorkbench/KeywordComboTable.tsx`

**Responsibility:**
- Fetch all data
- Manage sorting/filtering
- Pass data to rows

**Critical Props Interface (Lines 73-78):**
```typescript
interface KeywordComboTableProps {
  metadata?: {
    appId?: string;
    country?: string;
  };
}
```

**Critical Data Fetching:**

#### A. Rankings Fetch (Lines 152-229)
```typescript
const fetchRankingsIfNeeded = useCallback(async (force = false) => {
  // Check cache validity (24h)
  if (isCacheValid && !force && cachedRankings.size > 0) {
    return; // Use cached data
  }

  // Fetch from edge function
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/check-combo-rankings`,
    {
      method: 'POST',
      body: JSON.stringify({
        appId: metadata.appId,  // ✅ REQUIRED
        combos: allUniqueComboTexts,
        country: metadata.country || 'us', // ✅ REQUIRED
        platform: 'ios',
      }),
    }
  );

  // Store in state
  setCachedRankings(newRankings); // Map<string, ComboRankingData>
  setLastFetchTimestamp(Date.now());
}, [metadata?.appId, metadata?.country]);
```

**Returns:**
```typescript
interface ComboRankingData {
  position: number | null;       // App Ranking (1-100 or null)
  totalResults: number | null;   // Competition count
  isRanking: boolean;
  snapshotDate: string;
  trend?: 'up' | 'down' | 'stable';
  positionChange?: number;
  visibilityScore: number | null;
}
```

#### B. Popularity Fetch (Lines 267-270)
```typescript
const { scores: popularityScores, isLoading: popularityLoading } = useKeywordPopularity(
  allUniqueComboTexts,
  metadata?.country || 'us' // ✅ REQUIRED
);
```

**Returns:**
```typescript
Map<string, KeywordPopularityData>

interface KeywordPopularityData {
  popularity_score: number;      // 0-100
  autocomplete_score: number;    // 0-1
  intent_score: number;          // 0-1
  length_prior: number;          // 0-1
  last_updated: string;
  source: 'cache' | 'computed';
  data_quality: string;
}
```

**Critical Row Props Passing (Lines 795-807):**
```typescript
<KeywordComboRow
  combo={combo}
  metadata={metadata}  // ✅ CRITICAL
  rankingData={cachedRankings.get(combo.text)}  // ✅ CRITICAL
  rankingsLoading={isFetchingRankings && !cachedRankings.has(combo.text)}
  popularityData={popularityScores.get(combo.text.toLowerCase())}  // ✅ CRITICAL
  popularityLoading={popularityLoading}
/>
```

---

### 4. **Row Component**
**File:** `src/components/AppAudit/KeywordComboWorkbench/KeywordComboRow.tsx`

**Responsibility:** Render individual cells with data

**Critical Props (Lines 46-56):**
```typescript
interface KeywordComboRowProps {
  combo: ClassifiedCombo;
  metadata?: {
    appId?: string;
    country?: string;
  };
  rankingData?: ComboRankingData;
  rankingsLoading?: boolean;
  popularityData?: KeywordPopularityData;
  popularityLoading?: boolean;
}
```

**Critical Cells:**

#### A. Competition Cell (Lines 303-311)
```typescript
{visibleColumns.competition && (
  <TableCell>
    <CompetitionCell
      totalResults={rankingData?.totalResults ?? null}
      snapshotDate={rankingData?.snapshotDate}
    />
  </TableCell>
)}
```

#### B. Popularity Cell (Lines 313-356)
```typescript
<TableCell className="text-center">
  {popularityLoading ? (
    <span>...</span>
  ) : popularityData ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <span>{popularityData.popularity_score}</span>
          <span>{getPopularityEmoji(popularityData.popularity_score)}</span>
        </TooltipTrigger>
        <TooltipContent>
          {/* Breakdown: autocomplete, intent, length */}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    <span>-</span>
  )}
</TableCell>
```

#### C. App Ranking Cell (Lines 358-371)
```typescript
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
    <span>N/A</span>
  )}
</TableCell>
```

---

### 5. **Supporting Components**

#### CompetitionCell.tsx
**File:** `src/components/AppAudit/KeywordComboWorkbench/CompetitionCell.tsx`

**Purpose:** Display competition count with visual indicators

**Displays:**
- `0-100` apps: 🟢 Low (easy to rank)
- `100-500` apps: 🟡 Medium
- `500-1000` apps: 🟠 High
- `1000+` apps: 🔴 Very High (hard to rank)
- `-` if no data

#### RankingCell.tsx
**File:** `src/components/AppAudit/KeywordComboWorkbench/RankingCell.tsx`

**Purpose:** Display app's ranking position

**Displays:**
- `#1` - `#10`: 🥇 Top 10 (gold)
- `#11` - `#50`: 🥈 Top 50 (silver)
- `#51` - `#100`: 🥉 Top 100 (bronze)
- `Not Ranked`: ⛔ Outside top 100
- `...` while loading

---

### 6. **Hooks**

#### useKeywordPopularity
**File:** `src/hooks/useKeywordPopularity.ts`

**Purpose:** Fetch popularity scores from edge function

**Usage:**
```typescript
const { scores, isLoading, error, refresh } = useKeywordPopularity(
  keywords: string[],
  locale: string = 'us'
);
```

**Returns:** `Map<string, KeywordPopularityData>`

**Edge Function:** `/functions/v1/keyword-popularity`

**Cache:** In-memory during component lifecycle

#### useBatchComboRankings (Deprecated - Not Used)
**File:** `src/hooks/useBatchComboRankings.ts`

**Status:** Replaced by table-level `fetchRankingsIfNeeded()` for better caching

---

### 7. **Edge Functions**

#### check-combo-rankings
**Path:** `supabase/functions/check-combo-rankings/index.ts`

**Input:**
```typescript
{
  appId: string;
  combos: string[];
  country: string;
  platform: 'ios' | 'android';
}
```

**Output:**
```typescript
{
  success: boolean;
  results: Array<{
    combo: string;
    position: number | null;
    totalResults: number | null;
    isRanking: boolean;
    checkedAt: string;
  }>;
}
```

**Database:** Reads from `combo_rankings_cache` table

**Cache:** 24 hours per combo

#### keyword-popularity
**Path:** `supabase/functions/keyword-popularity/index.ts`

**Input:**
```typescript
{
  keywords: string[];
  locale: string;
  platform: 'ios' | 'android';
}
```

**Output:**
```typescript
{
  success: boolean;
  results: Array<{
    keyword: string;
    popularity_score: number;
    autocomplete_score: number;
    intent_score: number;
    length_prior: number;
    last_updated: string;
    source: 'cache' | 'computed';
    data_quality: string;
  }>;
}
```

**Database:** Reads from `keyword_popularity_scores` table

**Formula:** `(autocomplete * 0.6) + (intent * 0.3) + (length * 0.1) * 100`

---

## 🚨 CRITICAL DEPENDENCIES

### Must ALWAYS Be Present:

1. **metadata.appId**
   - Source: `UnifiedMetadataAuditModule` → comes from route params or monitored_apps
   - Used by: Rankings fetch, App Ranking cell
   - If missing: App Ranking shows "N/A", Competition may be empty

2. **metadata.country**
   - Source: `UnifiedMetadataAuditModule` → extracted from `locale` (e.g., "en-US" → "us")
   - Used by: Rankings fetch, Popularity fetch
   - If missing: Falls back to "us"

3. **combos array**
   - Source: `useKeywordComboStore` → populated from `comboCoverage`
   - Used by: Both fetches (list of keywords to check)
   - If empty: Table shows "No combos found"

---

## 🐛 DEBUGGING GUIDE

### Problem: Columns Show Empty (-) Data

**Step 1: Check Metadata Props**

Add this to `KeywordComboTable.tsx` (already present with debug logging):
```typescript
useEffect(() => {
  console.log('[KeywordComboTable] 🔍 Metadata received:', {
    metadata,
    hasAppId: !!metadata?.appId,
    hasCountry: !!metadata?.country,
    appId: metadata?.appId,
    country: metadata?.country,
  });
}, [metadata]);
```

**Expected:**
```
🔍 Metadata received: {
  hasAppId: true,
  hasCountry: true,
  appId: "1234567890",
  country: "us"
}
```

**If FALSE:** Check `UnifiedMetadataAuditModule` → verify `metadata.appId` and `metadata.locale` are set

---

**Step 2: Check Popularity Data**

Look for this log (already present):
```typescript
console.log('[KeywordComboTable] 🎯 Popularity data:', {
  scoresSize: popularityScores.size,
  isLoading: popularityLoading,
  country: metadata?.country || 'us',
  comboCount: allUniqueComboTexts.length,
});
```

**Expected:**
```
🎯 Popularity data: {
  scoresSize: 50,
  isLoading: false,
  country: "us",
  comboCount: 50
}
```

**If scoresSize = 0:** Check edge function `/functions/v1/keyword-popularity` in Network tab

---

**Step 3: Check Rankings Data**

Look for this log (already present):
```typescript
console.log('[KeywordComboTable] Cached rankings:', cachedRankings.size);
```

**Expected:**
```
Cached rankings: 50 entries
```

**If size = 0:** Check edge function `/functions/v1/check-combo-rankings` in Network tab

---

**Step 4: Check Network Requests**

Open DevTools → Network tab → Filter: `check-combo-rankings` or `keyword-popularity`

**For Rankings:**
- URL: `https://.../functions/v1/check-combo-rankings`
- Method: POST
- Status: 200 OK
- Response: `{ success: true, results: [...] }`

**For Popularity:**
- URL: `https://.../functions/v1/keyword-popularity`
- Method: POST
- Status: 200 OK
- Response: `{ success: true, results: [...] }`

**If 401 Unauthorized:** Functions need `--no-verify-jwt` flag
**If 500 Error:** Check Supabase logs

---

**Step 5: Check Database**

Run in Supabase SQL Editor:

```sql
-- Check combo_rankings_cache
SELECT COUNT(*) FROM combo_rankings_cache
WHERE app_id = '1234567890' AND country = 'us';

-- Check keyword_popularity_scores
SELECT COUNT(*) FROM keyword_popularity_scores
WHERE locale = 'us';
```

**Expected:** Non-zero counts

**If 0:** Run refresh functions:
```bash
# Refresh rankings
curl -X POST "https://[PROJECT].supabase.co/functions/v1/refresh-daily-rankings"

# Refresh popularity
curl -X POST "https://[PROJECT].supabase.co/functions/v1/refresh-keyword-popularity"
```

---

## ⚡ QUICK FIX PROCEDURES

### Issue: Columns Suddenly Empty After Code Change

**Diagnosis:** Props chain broken

**Quick Fix:**
1. Check `git diff src/components/AppAudit/KeywordComboWorkbench/`
2. Look for changes to:
   - `metadata` prop passing
   - `rankingData` prop passing
   - `popularityData` prop passing
3. Revert suspicious changes:
```bash
git checkout HEAD -- src/components/AppAudit/KeywordComboWorkbench/KeywordComboTable.tsx
```

---

### Issue: Only ONE Column Empty

**Competition Empty:**
- Check: `rankingData?.totalResults` is defined
- Fix: Verify `fetchRankingsIfNeeded()` is running
- Log: `console.log(cachedRankings)`

**Popularity Empty:**
- Check: `popularityData?.popularity_score` is defined
- Fix: Verify `useKeywordPopularity()` returns data
- Log: `console.log(popularityScores)`

**App Ranking Empty:**
- Check: `metadata?.appId` and `metadata?.country` are defined
- Fix: Verify props passed from parent
- Log: `console.log(metadata)`

---

### Issue: Columns Show "..." (Loading) Forever

**Cause:** API call hanging or failing silently

**Quick Fix:**
1. Open Network tab → Look for stuck request
2. Check edge function logs in Supabase
3. Add timeout to fetch:
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);

fetch(url, {
  signal: controller.signal,
  ...
});
```

---

## 🔄 ROLLBACK PROCEDURES

### Emergency Rollback (Nuclear Option)

**If everything is broken:**

```bash
# Stash current work
git stash push -u -m "EMERGENCY_BACKUP_$(date +%Y%m%d_%H%M%S)"

# List recent commits
git log --oneline -10

# Rollback to known good commit (e.g., before changes)
git reset --hard <commit-hash>

# Build
npm run build

# Test in browser
```

**⚠️ WARNING:** This discards all uncommitted work! Use stash to preserve it.

---

### Surgical Rollback (Specific Files)

**If only table files are broken:**

```bash
# Stash current changes first
git stash push -m "BACKUP_table_changes" \
  src/components/AppAudit/KeywordComboWorkbench/KeywordComboTable.tsx \
  src/components/AppAudit/KeywordComboWorkbench/KeywordComboRow.tsx

# Rollback specific files
git checkout HEAD -- \
  src/components/AppAudit/KeywordComboWorkbench/KeywordComboTable.tsx \
  src/components/AppAudit/KeywordComboWorkbench/KeywordComboRow.tsx

# Build
npm run build

# If it works, you can cherry-pick changes from stash
git stash show -p stash@{0}
```

---

### Restore from Stash

**To recover stashed work:**

```bash
# List stashes
git stash list

# View stash content
git stash show -p stash@{0}

# Restore stash
git stash pop  # Removes from stash list
# OR
git stash apply stash@{0}  # Keeps in stash list
```

---

## ✅ TESTING CHECKLIST

### Before Committing Changes to Table:

- [ ] **Metadata Props:**
  - [ ] `metadata.appId` is defined in console logs
  - [ ] `metadata.country` is defined in console logs

- [ ] **API Calls:**
  - [ ] `/check-combo-rankings` returns 200 OK
  - [ ] `/keyword-popularity` returns 200 OK
  - [ ] Network tab shows no 401/500 errors

- [ ] **Data Loading:**
  - [ ] `cachedRankings.size > 0` in console
  - [ ] `popularityScores.size > 0` in console
  - [ ] No infinite "..." loading states

- [ ] **Column Rendering:**
  - [ ] Competition column shows numbers (0-1000+)
  - [ ] Popularity column shows scores (0-100) with emojis
  - [ ] App Ranking column shows positions (#1-100) or "Not Ranked"

- [ ] **Tooltips:**
  - [ ] Hover over Popularity → shows breakdown
  - [ ] Tooltip displays autocomplete/intent/length scores

- [ ] **Sorting:**
  - [ ] Click "Competition" header → sorts by totalResults
  - [ ] Click "Popularity" header → sorts by popularity_score
  - [ ] Click "App Ranking" header → sorts by position

- [ ] **Empty States:**
  - [ ] If no data → shows "-" not blank
  - [ ] If loading → shows "..." not blank
  - [ ] If error → shows error message

---

## 📝 SAFE CHANGE GUIDELINES

### ✅ SAFE TO CHANGE:

1. **UI Text:**
   - Table titles ("KEYWORD COMBO WORKBENCH")
   - Column headers ("Competition", "Popularity", "App Ranking")
   - Button labels ("Refresh Rankings")

2. **Styling:**
   - CSS classes
   - Colors, fonts, spacing
   - Tooltips content (as long as data bindings stay)

3. **Visual Indicators:**
   - Emoji choices (🔥⚡💡)
   - Color ranges (high=red, low=green)
   - Badge styles

4. **Column Visibility:**
   - Default visibility in `visibleColumns` state
   - Column toggle UI

5. **Sorting Logic:**
   - Sort order (asc/desc)
   - Secondary sorts

### 🚨 NEVER CHANGE (Without Testing):

1. **Props Passing:**
   - `metadata={metadata}` in any component
   - `rankingData={cachedRankings.get(...)}`
   - `popularityData={popularityScores.get(...)}`

2. **Data Fetching:**
   - `useKeywordPopularity()` hook call
   - `fetchRankingsIfNeeded()` function
   - Edge function URLs

3. **Data Mapping:**
   - `.get(combo.text)` lookups
   - `.toLowerCase()` normalizations
   - Field access (e.g., `?.totalResults`)

4. **Conditional Rendering:**
   - `metadata?.appId && metadata?.country ? <RankingCell /> : "N/A"`
   - `popularityData ? <Tooltip /> : "-"`

---

## 🎓 LESSONS LEARNED FROM 2025-12-01 INCIDENT

### What Happened:
1. Attempted to rename table title from "KEYWORD COMBO WORKBENCH" → "KEYWORDS INTELLIGENCE TABLE"
2. User reported columns (Competition, Popularity, App Ranking) broke - showing empty data
3. Initial "revert" attempt reverted TOO FAR (lost all column work)
4. Had to restore from git stash

### Root Cause:
- **FALSE ALARM:** The rename itself didn't break anything
- **ACTUAL ISSUE:** Missing debug logging made it SEEM broken
- **FIX:** Added console.log statements revealed data WAS loading correctly

### What We Learned:

1. **Always Add Debug Logging First**
   - Before assuming something is broken
   - Log metadata props at component mount
   - Log API responses
   - Log data mapping results

2. **Never Revert Without Understanding**
   - Don't `git reset --hard` without diagnosis
   - Use `git stash` to preserve work
   - Check `git diff` to see what actually changed

3. **Test Incrementally**
   - Change UI text → test
   - Change props → test
   - Change data fetching → test
   - Don't change multiple things at once

4. **Preserve Working State**
   - Commit working code BEFORE making risky changes
   - Use feature branches for experiments
   - Tag releases: `git tag -a v2.0-working -m "Columns working"`

---

## 🚀 DEPLOYMENT CHECKLIST

### Before Deploying Table Changes:

- [ ] **Local Testing:**
  - [ ] `npm run build` succeeds
  - [ ] All columns show data in dev mode
  - [ ] No console errors

- [ ] **Stash/Commit:**
  - [ ] `git add` all changed files
  - [ ] `git commit -m "Clear description"`
  - [ ] OR `git stash push -m "Description"` if experimental

- [ ] **Edge Functions:**
  - [ ] `check-combo-rankings` deployed with `--no-verify-jwt`
  - [ ] `keyword-popularity` deployed with `--no-verify-jwt`
  - [ ] Test functions via curl before deploying frontend

- [ ] **Database:**
  - [ ] `combo_rankings_cache` table exists
  - [ ] `keyword_popularity_scores` table exists
  - [ ] RLS policies allow user access

- [ ] **Documentation:**
  - [ ] Update this file if architecture changes
  - [ ] Add comments to complex code
  - [ ] Create rollback plan

---

## 📞 SUPPORT & TROUBLESHOOTING

### Common Issues:

| Symptom | Likely Cause | Quick Fix |
|---------|-------------|-----------|
| All 3 columns empty | `metadata` not passed | Check `UnifiedMetadataAuditModule` |
| Only Competition empty | Rankings not cached | Run `refresh-daily-rankings` |
| Only Popularity empty | Scores not in DB | Run `refresh-keyword-popularity` |
| Only App Ranking empty | Missing `appId`/`country` | Check metadata props |
| Infinite "..." loading | API timeout | Check network tab, restart dev server |
| 401 errors | Edge functions need `--no-verify-jwt` | Redeploy functions |
| "-" in all cells | Empty combos array | Check `comboCoverage` data |

### Debug Commands:

```bash
# Check if columns working
npm run dev
# Open http://localhost:5173/app-audit/[appId]
# Open DevTools → Console
# Look for debug logs starting with [KeywordComboTable]

# Check edge functions
curl -X POST "https://[project].supabase.co/functions/v1/check-combo-rankings" \
  -H "Content-Type: application/json" \
  -d '{"appId":"1234567890","combos":["meditation"],"country":"us","platform":"ios"}'

# Check database
psql [connection-string]
SELECT COUNT(*) FROM combo_rankings_cache;
SELECT COUNT(*) FROM keyword_popularity_scores;
```

---

## 📚 RELATED DOCUMENTATION

- `KEYWORD_POPULARITY_MVP_IMPLEMENTATION.md` - Popularity system architecture
- `APP_RANKING_CACHING_COMPLETE.md` - Rankings cache system
- `COMPETITION_COLUMN_COMPLETE.md` - Competition column implementation
- `COLUMN_BREAKAGE_AUDIT.md` - Detailed audit from 2025-12-01 incident
- `KEYWORD_COMBO_RENAME_PLAN.md` - Safe rename procedures

---

## 🔖 VERSION HISTORY

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 2.0 | 2025-12-01 | Added Competition, Popularity, App Ranking columns | ✅ Current |
| 1.0 | 2025-11-30 | Basic table with Type, Source, Length | Deprecated |

---

**Last Updated:** 2025-12-01
**Maintained By:** Development Team
**Status:** ✅ **PRODUCTION READY - ALL SYSTEMS OPERATIONAL**
