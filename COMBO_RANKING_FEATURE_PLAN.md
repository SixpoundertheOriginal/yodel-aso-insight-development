# Combo Ranking Feature - Implementation Plan

**Status:** Ready for Implementation
**Created:** 2025-01-12
**Feature:** Show app rankings for keyword combos in All Combos Table

---

## 🎯 FEATURE OVERVIEW

Add a new "App Ranking" column to the All Combos Table in ASO Audit V2 that:
- Shows if the target app ranks in top 100 for each combo keyword
- Displays ranking position (#1-100) or "Not Ranked"
- Auto-fetches rankings when combos are added to the table
- Caches results and refreshes daily
- Tracks historical changes since monitoring began

---

## 📋 REQUIREMENTS

### User Story
**As an ASO Manager**, I want to see if my app ranks for each keyword combo so I can:
- Identify which combos my app already ranks for
- Discover ranking opportunities (combos I don't rank for yet)
- Track ranking improvements over time
- Prioritize metadata optimization based on ranking potential

### Functional Requirements
1. **Display Rankings**: Show ranking position for each combo in the All Combos Table
2. **Top 100 Search**: Check if app ranks in top 100 results (iTunes Search API)
3. **Auto-Fetch on Add**: Immediately fetch ranking when user adds combo/keyword
4. **Daily Refresh**: Auto-refresh rankings every 24 hours for tracked combos
5. **Historical Tracking**: Store daily snapshots to show trends
6. **Country-Based**: Use app's selected country from audit settings
7. **Always Visible**: Column always visible (not optional)
8. **Simple Display**: Show `#3`, `Not Ranked`, `Checking...`

### Non-Functional Requirements
- **Performance**: Batch ranking checks (max 50 combos per API call)
- **Rate Limiting**: Respect iTunes API limits (no more than 20 req/sec)
- **Caching**: Cache results for 24 hours minimum
- **Error Handling**: Graceful degradation if API unavailable
- **Scalability**: Support up to 500 tracked combos per app

---

## 🏗️ ARCHITECTURE

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                        │
├─────────────────────────────────────────────────────────────┤
│ • KeywordComboTable.tsx (UI)                                │
│ • useComboRankings.ts (React Hook)                          │
│ • RankingColumn Component                                   │
│ • Historical Chart Modal                                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Supabase Client
                 ↓
┌─────────────────────────────────────────────────────────────┐
│              EDGE FUNCTIONS (Deno)                          │
├─────────────────────────────────────────────────────────────┤
│ • check-combo-rankings (fetch rankings)                     │
│ • refresh-daily-rankings (cron job)                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ iTunes Search API
                 ↓
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE (PostgreSQL)                      │
├─────────────────────────────────────────────────────────────┤
│ • keywords (stores combos)                                  │
│ • keyword_rankings (historical snapshots)                   │
│ • keyword_refresh_queue (daily refresh jobs)                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ DATABASE SCHEMA

### Existing Tables (Reuse)

The existing keyword tracking system supports this feature! We just need to:
1. Use `keywords.keyword` field to store multi-word combos (e.g., "wellness self")
2. Extend `keywords` to support `combo` type
3. Reuse `keyword_rankings` for historical tracking
4. Reuse `keyword_refresh_queue` for daily refreshes

### Schema Changes Needed

#### 1. Add combo support to keywords table

```sql
-- Migration: 20260112000000_add_combo_tracking_support.sql

-- Add combo tracking fields to keywords table
ALTER TABLE keywords
  ADD COLUMN IF NOT EXISTS keyword_type TEXT DEFAULT 'single' CHECK (keyword_type IN ('single', 'combo')),
  ADD COLUMN IF NOT EXISTS word_count INTEGER GENERATED ALWAYS AS (
    array_length(string_to_array(keyword, ' '), 1)
  ) STORED;

-- Add index for combo lookups
CREATE INDEX IF NOT EXISTS idx_keywords_type_word_count
  ON keywords(keyword_type, word_count);

-- Add comment
COMMENT ON COLUMN keywords.keyword_type IS
  'Type of keyword: single (one word) or combo (multi-word phrase)';
COMMENT ON COLUMN keywords.word_count IS
  'Number of words in the keyword (auto-calculated)';

-- Update position constraint to support top 100
ALTER TABLE keyword_rankings
  DROP CONSTRAINT IF EXISTS keyword_rankings_position_check;

ALTER TABLE keyword_rankings
  ADD CONSTRAINT keyword_rankings_position_check
  CHECK (position IS NULL OR (position >= 1 AND position <= 100));

-- Update is_ranking logic for top 100
COMMENT ON COLUMN keyword_rankings.is_ranking IS
  'true if position <= 100 (was 50 before)';

-- Update visibility score calculation function
CREATE OR REPLACE FUNCTION calculate_visibility_score(
  p_position INTEGER,
  p_search_volume INTEGER
) RETURNS NUMERIC AS $$
BEGIN
  IF p_position IS NULL OR p_position > 100 THEN
    RETURN 0;
  END IF;

  -- Visibility formula: (101 - position) * search_volume / 100
  RETURN (101 - p_position) * p_search_volume / 100.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_visibility_score IS
  'Calculates visibility score for rankings in top 100';
```

---

## 🔧 EDGE FUNCTIONS

### 1. check-combo-rankings

**Purpose**: Fetch rankings for one or more combos

**Endpoint**: `POST /functions/v1/check-combo-rankings`

**Request**:
```json
{
  "appId": "123456789",
  "combos": ["wellness self", "mental health", "meditation app"],
  "country": "us",
  "platform": "ios",
  "organizationId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "results": [
    {
      "combo": "wellness self",
      "position": 3,
      "isRanking": true,
      "totalResults": 250,
      "checkedAt": "2025-01-12T10:30:00Z",
      "trend": "up" // compared to previous check
    },
    {
      "combo": "mental health",
      "position": null,
      "isRanking": false,
      "totalResults": 500,
      "checkedAt": "2025-01-12T10:30:00Z",
      "trend": null
    }
  ],
  "cached": false
}
```

**Implementation Flow**:
```typescript
// supabase/functions/check-combo-rankings/index.ts

1. Validate request (appId, combos[], country)
2. Check cache (if last_tracked_at < 24h, return cached)
3. For each combo:
   a. Query iTunes Search API with term=combo&country=country&limit=100
   b. Find app's position in results (by trackId)
   c. Store result in keyword_rankings table
4. Calculate trend (compare with previous snapshot)
5. Return results
```

**Rate Limiting**:
- Batch API calls (max 10 parallel requests)
- Wait 50ms between batches
- Total time: ~500ms for 50 combos

---

### 2. refresh-daily-rankings (Cron Job)

**Purpose**: Daily refresh of all tracked combos

**Schedule**: Every day at 3:00 AM UTC

**Implementation**:
```typescript
// supabase/functions/refresh-daily-rankings/index.ts

1. Query all apps with tracked combos
2. For each app:
   a. Get all combo keywords (keyword_type='combo')
   b. Batch into groups of 50
   c. Call check-combo-rankings for each batch
3. Update keyword_refresh_queue status
4. Send notifications for major ranking changes (optional)
```

**Supabase Cron Config**:
```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily ranking refresh
SELECT cron.schedule(
  'daily-combo-ranking-refresh',
  '0 3 * * *', -- 3:00 AM UTC daily
  $$
    SELECT net.http_post(
      url := 'https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/refresh-daily-rankings',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object('source', 'cron')
    );
  $$
);
```

---

## 🎨 FRONTEND IMPLEMENTATION

### 1. New Ranking Column in KeywordComboTable

**File**: `src/components/AppAudit/KeywordComboWorkbench/KeywordComboTable.tsx`

**Changes**:
```tsx
// Add new column to table headers (after "Length")
<TableHead className="font-mono text-xs uppercase tracking-wider text-zinc-400">
  App Ranking
</TableHead>

// Add cell in KeywordComboRow
<TableCell>
  <RankingCell
    combo={combo.text}
    appId={metadata.appId}
    country={metadata.country}
  />
</TableCell>
```

---

### 2. RankingCell Component

**File**: `src/components/AppAudit/KeywordComboWorkbench/RankingCell.tsx`

**Implementation**:
```tsx
interface RankingCellProps {
  combo: string;
  appId: string;
  country: string;
}

export const RankingCell: React.FC<RankingCellProps> = ({ combo, appId, country }) => {
  const { ranking, isLoading, error } = useComboRanking(appId, combo, country);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-zinc-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">Checking...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Badge variant="outline" className="border-red-500/30 text-red-400 text-xs">
        Error
      </Badge>
    );
  }

  if (!ranking || !ranking.isRanking) {
    return (
      <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-xs">
        Not Ranked
      </Badge>
    );
  }

  // Ranked - show position with color coding
  const badgeColor =
    ranking.position <= 10 ? 'border-emerald-500/30 text-emerald-400' :
    ranking.position <= 30 ? 'border-yellow-500/30 text-yellow-400' :
    ranking.position <= 50 ? 'border-orange-500/30 text-orange-400' :
    'border-zinc-600/30 text-zinc-400';

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={`${badgeColor} text-xs font-mono`}>
        #{ranking.position}
      </Badge>

      {ranking.trend && (
        <span className="text-xs text-zinc-500">
          {ranking.trend === 'up' && '↑'}
          {ranking.trend === 'down' && '↓'}
          {ranking.trend === 'stable' && '→'}
        </span>
      )}

      <button
        onClick={() => showHistoricalChart(combo)}
        className="text-zinc-500 hover:text-violet-400 transition-colors"
        title="View ranking history"
      >
        <TrendingUp className="h-3 w-3" />
      </button>
    </div>
  );
};
```

---

### 3. useComboRanking Hook

**File**: `src/hooks/useComboRanking.ts`

**Implementation**:
```typescript
export const useComboRanking = (appId: string, combo: string, country: string) => {
  const [ranking, setRanking] = useState<RankingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        setIsLoading(true);

        // 1. Check cache first (query keyword_rankings directly)
        const { data: cachedRanking } = await supabase
          .from('keyword_rankings')
          .select('*')
          .eq('keyword.keyword', combo)
          .eq('keyword.app_id', appId)
          .order('snapshot_date', { ascending: false })
          .limit(1)
          .single();

        // If cached and fresh (< 24h), use it
        if (cachedRanking && isWithin24Hours(cachedRanking.snapshot_date)) {
          setRanking(cachedRanking);
          setIsLoading(false);
          return;
        }

        // 2. Otherwise, fetch from edge function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-combo-rankings`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              appId,
              combos: [combo],
              country,
              platform: 'ios',
            }),
          }
        );

        const result = await response.json();

        if (result.success && result.results[0]) {
          setRanking(result.results[0]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRanking();
  }, [appId, combo, country]);

  return { ranking, isLoading, error };
};
```

---

### 4. Historical Chart Modal

**File**: `src/components/AppAudit/KeywordComboWorkbench/RankingHistoryModal.tsx`

**Features**:
- Line chart showing ranking position over time
- Trend indicators (↑↓→)
- Date range selector (7d, 30d, 90d, All)
- Export to CSV

**Implementation**:
```tsx
export const RankingHistoryModal: React.FC<{ combo: string; appId: string }> = ({ combo, appId }) => {
  const { history, isLoading } = useRankingHistory(appId, combo);

  return (
    <Dialog>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Ranking History: {combo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Chart */}
          <LineChart
            data={history}
            xKey="snapshot_date"
            yKey="position"
            yAxisReversed={true} // Lower position = better
            height={300}
          />

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Current" value={`#${history[0]?.position || 'N/A'}`} />
            <StatCard label="Best" value={`#${Math.min(...history.map(h => h.position))}`} />
            <StatCard label="Avg" value={`#${Math.round(average(history.map(h => h.position)))}`} />
            <StatCard label="Trend" value={calculateTrend(history)} />
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((snapshot, i) => (
                <TableRow key={snapshot.id}>
                  <TableCell>{formatDate(snapshot.snapshot_date)}</TableCell>
                  <TableCell>#{snapshot.position}</TableCell>
                  <TableCell>
                    {i > 0 && (
                      <span className={snapshot.position_change < 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {snapshot.position_change > 0 ? '+' : ''}{snapshot.position_change}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

---

## 🚀 IMPLEMENTATION PHASES

### Phase 1: Database Setup (Day 1)
- ✅ Create migration for combo tracking support
- ✅ Update constraints for top 100 rankings
- ✅ Test migration on dev environment

### Phase 2: Edge Functions (Days 2-3)
- ✅ Implement check-combo-rankings function
- ✅ Add iTunes Search API integration
- ✅ Add caching logic
- ✅ Add rate limiting
- ✅ Test with various combos
- ✅ Implement refresh-daily-rankings cron
- ✅ Set up Supabase cron schedule

### Phase 3: Frontend - Basic Column (Day 4)
- ✅ Add "App Ranking" column to KeywordComboTable
- ✅ Create RankingCell component
- ✅ Implement useComboRanking hook
- ✅ Add loading/error states
- ✅ Test with real data

### Phase 4: Auto-Fetch on Add (Day 5)
- ✅ Detect when user adds combo to table
- ✅ Trigger ranking fetch automatically
- ✅ Update UI in real-time
- ✅ Handle batch adds

### Phase 5: Historical Tracking UI (Day 6)
- ✅ Create RankingHistoryModal component
- ✅ Implement useRankingHistory hook
- ✅ Add line chart visualization
- ✅ Add stats cards
- ✅ Add export functionality

### Phase 6: Testing & Polish (Day 7)
- ✅ End-to-end testing
- ✅ Performance optimization
- ✅ Error handling improvements
- ✅ Documentation
- ✅ Deploy to production

---

## 🧪 TESTING PLAN

### Unit Tests
- ✅ Edge function ranking logic
- ✅ Cache validation
- ✅ Trend calculation
- ✅ React hooks

### Integration Tests
- ✅ Full ranking fetch flow (frontend → edge function → database)
- ✅ Daily cron job execution
- ✅ Historical data queries

### Manual Testing
- ✅ Test with Headspace app (meditation combos)
- ✅ Test with combos that rank (top 10, 30, 50, 100)
- ✅ Test with combos that don't rank
- ✅ Test country switching (US, UK, DE)
- ✅ Test daily refresh (wait 24h or mock)
- ✅ Test historical chart with 7d, 30d data

---

## 📊 SUCCESS METRICS

### Technical Metrics
- ✅ Ranking fetch time < 2s for 50 combos
- ✅ Cache hit rate > 80% after initial fetch
- ✅ Daily cron job success rate > 99%
- ✅ Database query time < 100ms

### User Metrics
- ✅ Users view historical chart for 30%+ of ranked combos
- ✅ Users add combos to tracking after seeing rankings
- ✅ Users export ranking data for reports

---

## ⚠️ RISKS & MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|------------|
| iTunes API rate limits | High | Implement exponential backoff, batch requests, cache aggressively |
| Slow ranking checks (100 combos) | Medium | Paginated fetching, show cached first, background refresh |
| Inaccurate rankings | Medium | Cross-validate with App Store Connect data if available |
| Storage costs (daily snapshots) | Low | Prune old snapshots after 90 days, compress JSONB data |
| Cron job failures | Medium | Add retry logic, monitoring alerts, manual trigger option |

---

## 🔮 FUTURE ENHANCEMENTS

### v1.1 - Advanced Features
- ✅ Competitor ranking comparison (show competitors' positions)
- ✅ Ranking alerts (email when position changes > 10)
- ✅ Bulk export (CSV/Excel of all combo rankings)
- ✅ Ranking forecast (predict position in 30d based on trends)

### v1.2 - Multi-Platform
- ✅ Android Play Store rankings
- ✅ Cross-platform comparison

### v1.3 - AI Insights
- ✅ AI-powered combo suggestions based on ranking gaps
- ✅ Automated opportunity detection ("these combos have high volume + low competition + you're not ranking")

---

## 📝 NEXT STEPS

1. ✅ **Get Approval** - Review this plan with product team
2. ✅ **Create Feature Branch** - `feature/combo-ranking-column`
3. ✅ **Phase 1** - Start with database migration
4. ✅ **Phase 2** - Build edge functions
5. ✅ **Phase 3-6** - Frontend implementation and polish
6. ✅ **Deploy** - Roll out to production with feature flag

---

## 🎯 IMPLEMENTATION CHECKLIST

### Database
- [ ] Create migration `20260112000000_add_combo_tracking_support.sql`
- [ ] Test migration on dev DB
- [ ] Deploy migration to production

### Edge Functions
- [ ] Create `check-combo-rankings` function
- [ ] Add iTunes Search API integration
- [ ] Add caching and rate limiting
- [ ] Create `refresh-daily-rankings` cron function
- [ ] Set up Supabase cron schedule
- [ ] Deploy both functions

### Frontend
- [ ] Add "App Ranking" column to KeywordComboTable
- [ ] Create RankingCell component
- [ ] Implement useComboRanking hook
- [ ] Add auto-fetch on combo add
- [ ] Create RankingHistoryModal
- [ ] Implement useRankingHistory hook
- [ ] Add loading/error states
- [ ] Add export functionality

### Testing
- [ ] Unit tests for edge functions
- [ ] Integration tests for full flow
- [ ] Manual testing with real apps
- [ ] Performance testing (50+ combos)

### Documentation
- [ ] Update README with new feature
- [ ] Add API documentation for edge functions
- [ ] Create user guide for ranking column
- [ ] Document cron job setup

### Deployment
- [ ] Deploy database migration
- [ ] Deploy edge functions
- [ ] Deploy frontend changes
- [ ] Enable cron job
- [ ] Monitor for 24h

---

**Ready to implement! 🚀**
