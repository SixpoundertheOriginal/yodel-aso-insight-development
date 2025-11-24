# Phase 6: Market Switcher in Audit Views - Implementation Complete ✅

**Date**: 2025-01-24
**Status**: Complete
**Feature**: Multi-Market Support - Market Switcher for Audit Views

## Overview

Implemented market switcher functionality in audit views, allowing users to seamlessly switch between different markets when viewing monitored app audits. The switcher dynamically filters audit data by the selected market and persists the selection in session storage for better UX.

## What Was Implemented

### 1. **MarketSwitcher Component** (`src/components/AppAudit/MarketSwitcher.tsx`)

Dropdown selector component for switching between markets.

#### Features:
- ✅ Only shows when app has multiple markets
- ✅ Displays flag emoji + market name (e.g., "🇬🇧 United Kingdom")
- ✅ Shows market count badge
- ✅ Highlights inactive markets with badge
- ✅ Auto-sorts markets (active first, then alphabetical)
- ✅ Clean integration with existing UI
- ✅ Globe icon for visual consistency

#### UI Structure:
```
┌────────────────────────────────────┐
│ 🌍 [🇬🇧 United Kingdom  ▼]  3 markets │
└────────────────────────────────────┘

Dropdown:
🇬🇧 United Kingdom
🇺🇸 United States
🇩🇪 Germany
```

#### Key Props:
```typescript
interface MarketSwitcherProps {
  markets: Array<{
    market_code: string;
    is_active: boolean;
    last_fetched_at: string | null;
  }>;
  selectedMarket: MarketCode;
  onMarketChange: (market: MarketCode) => void;
  className?: string;
}
```

---

### 2. **Enhanced useMonitoredAudit Hook** (`src/hooks/useMonitoredAudit.ts`)

Updated to support market-specific audit filtering.

#### Changes:

**Function Signature**:
```typescript
export function useMonitoredAudit(
  monitoredAppId: string | undefined,
  organizationId: string | undefined,
  marketCode?: string  // ✅ NEW: Optional market filter
)
```

**Market Filtering Logic**:
```typescript
// Step 1: Get monitored_app_market_id from market_code
let marketId: string | null = null;
if (marketCode) {
  const { data: marketData } = await supabase
    .from('monitored_app_markets')
    .select('id')
    .eq('monitored_app_id', monitoredAppId)
    .eq('market_code', marketCode)
    .maybeSingle();

  marketId = marketData?.id || null;
}

// Step 2: Filter Bible snapshots by market
let bibleSnapshotQuery = supabase
  .from('aso_audit_snapshots')
  .select('*')
  .eq('monitored_app_id', monitoredAppId);

if (marketId) {
  bibleSnapshotQuery = bibleSnapshotQuery.eq('monitored_app_market_id', marketId);
}
```

**Query Key Update**:
```typescript
queryKey: ['monitored-audit', organizationId, monitoredAppId, marketCode]
```

This ensures React Query caches data separately for each market.

---

### 3. **AppAuditHub Integration** (`src/components/AppAudit/AppAuditHub.tsx`)

Integrated market switcher into the audit view header.

#### Changes:

**New State**:
```typescript
const [selectedMarket, setSelectedMarket] = useState<MarketCode | null>(null);
const [appMarkets, setAppMarkets] = useState<any[]>([]);

const { getAppMarkets } = useMarketManagement();
```

**Market Loading**:
```typescript
useEffect(() => {
  if (mode === 'monitored' && monitoredAppId) {
    loadMarkets();
  }
}, [mode, monitoredAppId]);

const loadMarkets = async () => {
  if (!monitoredAppId) return;

  const markets = await getAppMarkets(monitoredAppId);
  setAppMarkets(markets);

  // Auto-select first market if none selected
  if (!selectedMarket && markets.length > 0) {
    setSelectedMarket(markets[0].market_code as MarketCode);
  }
};
```

**Market Change Handler**:
```typescript
const handleMarketChange = (market: MarketCode) => {
  setSelectedMarket(market);
  // Persist to session storage
  sessionStorage.setItem(`audit-market-${monitoredAppId}`, market);
};
```

**Hook Integration**:
```typescript
const {
  data: monitoredAuditData,
  isLoading: isLoadingMonitored,
  error: monitoredError
} = useMonitoredAudit(
  mode === 'monitored' ? monitoredAppId : undefined,
  mode === 'monitored' ? organizationId : undefined,
  selectedMarket || undefined  // ✅ Pass selected market
);
```

**UI Placement** (in header):
```tsx
<div className="flex items-center space-x-2">
  {/* Market Switcher (monitored mode only, when multiple markets) */}
  {mode === 'monitored' && appMarkets.length > 0 && selectedMarket && (
    <MarketSwitcher
      markets={appMarkets}
      selectedMarket={selectedMarket}
      onMarketChange={handleMarketChange}
    />
  )}

  {/* Refresh/Re-run buttons */}
  ...
</div>
```

---

## User Flow

### Scenario: User switches from UK to US market for Duolingo

1. **Open Monitored App Audit**
   - User navigates to audit view for Duolingo (monitored app)
   - System loads available markets: GB, US, DE

2. **Market Switcher Appears**
   ```
   Header shows:
   🎯 Duolingo  [Monitored]
   Developer: Duolingo
   Education • 🌍 [🇬🇧 United Kingdom ▼] 3 markets
   ```

3. **User Clicks Switcher**
   ```
   Dropdown opens:
   🇬🇧 United Kingdom    ← Currently selected
   🇺🇸 United States
   🇩🇪 Germany
   ```

4. **Select US Market**
   - User clicks "🇺🇸 United States"
   - Switcher updates to show US
   - Session storage saves preference: `audit-market-{appId}` = 'us'

5. **Data Refresh**
   - React Query invalidates cache for old market
   - Fetches audit snapshots filtered by US market:
     ```sql
     SELECT * FROM aso_audit_snapshots
     WHERE monitored_app_id = 'duolingo-id'
       AND monitored_app_market_id = 'us-market-id'
     ORDER BY created_at DESC
     LIMIT 1
     ```
   - Audit view updates with US-specific data

6. **Result**
   - User sees US App Store metadata
   - Audit scores are specific to US market
   - All visualizations show US market data

---

## Technical Implementation

### Market-Aware Query Flow

```
User selects "US" market
         ↓
handleMarketChange('us')
         ↓
setSelectedMarket('us')
         ↓
sessionStorage.setItem('audit-market-{appId}', 'us')
         ↓
useMonitoredAudit re-runs with marketCode='us'
         ↓
Query monitored_app_markets for market_id
         ↓
Filter aso_audit_snapshots by monitored_app_market_id
         ↓
Return market-specific audit data
         ↓
UI updates with US market data
```

### React Query Cache Separation

Each market has its own cache entry:

```typescript
// Cache keys for different markets
['monitored-audit', 'org-123', 'app-456', 'gb']  // UK market data
['monitored-audit', 'org-123', 'app-456', 'us']  // US market data
['monitored-audit', 'org-123', 'app-456', 'de']  // Germany market data
```

This prevents data mixing and enables instant switching between cached markets.

### Session Storage Persistence

When user switches markets:

```typescript
sessionStorage.setItem(`audit-market-${monitoredAppId}`, market);
```

On page reload:

```typescript
const savedMarket = sessionStorage.getItem(`audit-market-${monitoredAppId}`);
if (savedMarket) {
  setSelectedMarket(savedMarket as MarketCode);
}
```

This maintains user's market preference across page refreshes.

---

## Database Queries

### Get Markets for App:
```sql
SELECT *
FROM monitored_app_markets
WHERE monitored_app_id = $1
ORDER BY market_code ASC
```

### Get Market ID from Code:
```sql
SELECT id
FROM monitored_app_markets
WHERE monitored_app_id = $1
  AND market_code = $2
LIMIT 1
```

### Get Market-Specific Audits:
```sql
SELECT *
FROM aso_audit_snapshots
WHERE monitored_app_id = $1
  AND monitored_app_market_id = $2  -- Market filter
ORDER BY created_at DESC
LIMIT 1
```

---

## UI/UX Considerations

### When Switcher Shows:
- ✅ Monitored mode only (not live audits)
- ✅ App has 2+ markets
- ✅ Markets data loaded successfully

### When Switcher Hides:
- ❌ Live audit mode (no market concept)
- ❌ App has only 1 market (no choice needed)
- ❌ Loading state

### Visual Design:
- **Globe icon** - Indicates market/geography
- **Flag emoji** - Quick visual identification
- **Market count badge** - Shows total markets
- **Inactive badge** - Grayed out for inactive markets
- **Zinc color scheme** - Matches existing UI

---

## Performance Optimizations

### 1. **Auto-Select First Market**
```typescript
if (!selectedMarket && markets.length > 0) {
  setSelectedMarket(markets[0].market_code as MarketCode);
}
```

Prevents empty state on initial load.

### 2. **Conditional Rendering**
```tsx
{mode === 'monitored' && appMarkets.length > 0 && selectedMarket && (
  <MarketSwitcher ... />
)}
```

Only renders when needed, reducing DOM size.

### 3. **React Query Caching**
```typescript
queryKey: ['monitored-audit', organizationId, monitoredAppId, marketCode]
```

Each market cached separately for instant switching.

### 4. **Session Storage**
```typescript
sessionStorage.setItem(`audit-market-${monitoredAppId}`, market);
```

Persists selection without database write.

---

## Error Handling

### No Market Found:
```typescript
if (!marketId) {
  console.warn(`Market ${marketCode} not found for app ${monitoredAppId}`);
}
```

Falls back to showing all audits without filter.

### Market Load Failure:
```typescript
const markets = await getAppMarkets(monitoredAppId);
if (markets.length === 0) {
  // Switcher doesn't render
  console.warn('No markets found for app');
}
```

Gracefully hides switcher if no markets available.

### Hook Error Handling:
```typescript
export function useMonitoredAudit(..., marketCode?: string) {
  return useQuery({
    queryKey: ['monitored-audit', organizationId, monitoredAppId, marketCode],
    enabled: Boolean(monitoredAppId && organizationId),
    retry: 1  // Only retry once to avoid cascading failures
  });
}
```

---

## Testing Checklist

✅ TypeScript compilation passes
✅ MarketSwitcher component created
✅ useMonitoredAudit hook updated with market parameter
✅ AppAuditHub integration complete

### Manual Testing Required:
- [ ] Open monitored app audit with multiple markets
- [ ] Verify MarketSwitcher appears in header
- [ ] Switch between markets
- [ ] Verify audit data updates correctly per market
- [ ] Check session storage persistence
- [ ] Refresh page and verify market selection persists
- [ ] Test app with only 1 market (switcher should hide)
- [ ] Test inactive market display
- [ ] Verify React Query caching works (instant switch)

---

## Next Steps

### Phase 7: Market-Aware Caching (Optional Enhancement)
While the current implementation uses React Query caching effectively, we could enhance it with:
- Explicit cache key format: `app_metadata:${appId}:${market}`
- Cache lifecycle management (TTL per market)
- Cache invalidation on market removal
- Proactive cache warming for all markets

**Note**: Current implementation already provides sufficient caching via React Query. Phase 7 would be an optimization for very large-scale deployments.

### Phase 8: End-to-End Testing
- Complete multi-market workflow testing
- Performance testing with many markets
- Edge case handling (deleted markets, stale data)

---

## Files Created

1. `src/components/AppAudit/MarketSwitcher.tsx` (92 lines)

## Files Modified

1. `src/hooks/useMonitoredAudit.ts` (+30 lines)
   - Added marketCode parameter
   - Implemented market filtering logic
   - Updated query keys for cache separation
   - Updated useMonitoredAuditWithConsistency signature

2. `src/components/AppAudit/AppAuditHub.tsx` (+35 lines)
   - Added market state management
   - Integrated market loading
   - Added market switcher to header
   - Implemented session storage persistence

---

## Success Metrics

This implementation provides:
- ✅ Seamless market switching in audit views
- ✅ Market-specific audit data filtering
- ✅ React Query cache optimization
- ✅ Session storage persistence
- ✅ Clean, intuitive UI
- ✅ Automatic market selection
- ✅ Graceful degradation (single market apps)
- ✅ Type-safe market handling

---

## Conclusion

Phase 6 is complete! Users can now switch between markets when viewing monitored app audits. The system intelligently filters audit data by the selected market and provides a smooth, cached experience with session persistence. The switcher only appears when needed and automatically handles edge cases.

**Status**: ✅ Ready for Phase 7 (Market-Aware Caching - Optional) or Phase 8 (End-to-End Testing)
