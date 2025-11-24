# Multi-Market Implementation Plan

**Status**: 🚧 In Progress
**Model**: AppTweak-style (each market = separate entity)
**Date**: 2025-01-24

---

## Overview

Implementing multi-market support where each app can be monitored in multiple markets simultaneously. Each market is treated as a separate entity (like AppTweak), allowing independent:
- Metadata storage
- Audit snapshots
- Cache management
- Market add/remove operations

---

## Key Requirements

1. **Default Market**: GB (United Kingdom) 🇬🇧
2. **Platform**: iOS only (Android future scope)
3. **Supported Markets**: 15 key markets (GB, US, CA, AU, DE, FR, ES, IT, NL, SE, NO, DK, FI, PL, BR)
4. **Data Model**: Each market = separate `monitored_app_markets` entry
5. **Cache Strategy**: Keep data while monitored, delete on market removal
6. **Bible Rules**: Base rules apply to all markets (infrastructure ready for market overrides)

---

## Database Schema

### New Table: monitored_app_markets

```sql
CREATE TABLE public.monitored_app_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitored_app_id UUID NOT NULL REFERENCES monitored_apps(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Market identification
  market_code TEXT NOT NULL CHECK (market_code IN ('gb', 'us', 'ca', 'au', 'de', 'fr', 'es', 'it', 'nl', 'se', 'no', 'dk', 'fi', 'pl', 'br')),

  -- Market-specific metadata
  title TEXT,
  subtitle TEXT,
  description TEXT,
  keywords TEXT,

  -- Market-specific pricing
  price_amount DECIMAL,
  price_currency TEXT,

  -- Market status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_available BOOLEAN NOT NULL DEFAULT true,
  last_fetched_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(monitored_app_id, market_code)
);

CREATE INDEX idx_monitored_app_markets_app_id ON monitored_app_markets(monitored_app_id);
CREATE INDEX idx_monitored_app_markets_market ON monitored_app_markets(market_code);
CREATE INDEX idx_monitored_app_markets_active ON monitored_app_markets(monitored_app_id, is_active);
```

### Update Audit Snapshots

```sql
ALTER TABLE public.aso_audit_snapshots
  ADD COLUMN monitored_app_market_id UUID REFERENCES monitored_app_markets(id) ON DELETE CASCADE;

CREATE INDEX idx_audit_snapshots_market ON aso_audit_snapshots(monitored_app_market_id);
```

---

## Implementation Phases

### Phase 1: Database Migration ✅ (Planned)
- [ ] Create `monitored_app_markets` table
- [ ] Migrate existing apps to new schema (create GB market for all existing apps)
- [ ] Update `aso_audit_snapshots` with market foreign key
- [ ] Test data integrity

### Phase 2: Config & Types
- [ ] Create `src/config/markets.ts` with 15 supported markets
- [ ] Create `src/types/market.ts` with market types
- [ ] Update `ScrapedMetadata` type to include market info
- [ ] Create helper functions (flag emoji, market lookup, etc.)

### Phase 3: Market Selector Component
- [ ] Create `src/components/AppManagement/MarketSelector.tsx`
- [ ] Support single-select mode (for search)
- [ ] Support multi-select mode (for adding multiple markets)
- [ ] Add tier-based grouping (Tier 1, 2, 3)

### Phase 4: Add New App Flow
- [ ] Update `AppManagementModal` to include market selector (default GB)
- [ ] Update `AppStoreIntegrationService.searchApp()` to accept market parameter
- [ ] Add "Add More Markets" step after initial app add
- [ ] Test app creation with single market
- [ ] Test app creation with multiple markets

### Phase 5: Market Management
- [ ] Create "Add Market" modal/flow
- [ ] Create "Remove Market" modal/flow (with warnings)
- [ ] Add market badges to apps list
- [ ] Add market dropdown to app detail view
- [ ] Implement market switching in audit view

### Phase 6: API & Caching
- [ ] Update all API endpoints to accept market parameter
- [ ] Implement market-aware cache keys: `app:${appId}:${market}`
- [ ] Add cache lifecycle management (delete on market removal)
- [ ] Test cache isolation between markets

### Phase 7: Audit System Integration
- [ ] Add market switcher to audit header
- [ ] Update audit snapshot saves to include market
- [ ] Add market filter to audit history
- [ ] Ensure Bible Engine respects market context
- [ ] Test audit generation for different markets

### Phase 8: Testing & Polish
- [ ] Test all 15 markets with real apps
- [ ] Handle "app not available in market" errors
- [ ] Add bulk market operations
- [ ] Performance testing with many markets
- [ ] Documentation

---

## UI/UX Flows

### 1. Add New App (Single Market)

```
User → Search "Duolingo" in GB market
     → Select app from results
     → App created with GB market
     → Option to add more markets
```

### 2. Add New App (Multiple Markets)

```
User → Search "Duolingo" in GB market
     → Select app from results
     → Check [US, DE, FR] in market selector
     → App created with 4 markets (GB, US, DE, FR)
     → 4 separate monitored_app_markets entries
     → 4 separate audit baselines
```

### 3. Add Market to Existing App

```
User → Click "Add Market" on Duolingo
     → Select ES (Spain) from dropdown
     → System fetches metadata from Spanish App Store
     → Creates new monitored_app_markets entry
     → Creates initial audit snapshot for ES
     → User can now switch to ES market in audit view
```

### 4. Remove Market

```
User → Click "Remove Market" on Duolingo
     → Select DE (Germany) from dropdown
     → Warning: "All German audit history will be deleted"
     → Confirm deletion
     → monitored_app_markets entry for DE deleted (CASCADE)
     → All aso_audit_snapshots for DE deleted (CASCADE)
     → Cache cleared for Duolingo:DE
```

### 5. View Audit with Market Switching

```
User → Opens Duolingo audit (default: GB)
     → Sees GB market data and audit scores
     → Clicks market dropdown [GB ▼]
     → Selects US from dropdown
     → URL updates: /audit/duolingo?market=us
     → Audit data refreshes with US market data
     → All charts/KPIs show US-specific scores
```

---

## Market-Aware Caching Strategy

### Cache Key Format

```typescript
// BEFORE (market-agnostic) ❌
const cacheKey = `app_metadata:${appId}`;

// AFTER (market-aware) ✅
const cacheKey = `app_metadata:${appId}:${market}`;
```

### Cache Lifecycle

1. **App Added**: Cache metadata for selected markets
2. **Market Added**: Fetch and cache metadata for new market
3. **Market Removed**: Delete cache for that market
4. **App Deleted**: Delete cache for all markets
5. **Manual Refresh**: Invalidate specific market cache

### Cache Duration

- **While monitored**: Keep indefinitely (until manual refresh or market removal)
- **After market removal**: Delete immediately
- **Stale data**: Flag as "needs refresh" after 30 days

### Cache Storage

```typescript
// Browser localStorage (for quick access)
localStorage.setItem('app_metadata:123456:gb', JSON.stringify(metadata));
localStorage.setItem('app_metadata:123456:us', JSON.stringify(metadata));

// Supabase cache table (for persistence)
INSERT INTO app_metadata_cache (app_id, market_code, metadata, cached_at)
VALUES ('123456', 'gb', {...}, NOW());
```

---

## Bible Engine Market Support

### Current State
- Base rules apply to all apps
- Vertical overrides: `language_learning`, `rewards`, etc.
- **No market overrides yet** ❌

### Future State (Infrastructure Ready)
```
Base Rules (all markets)
  ↓
Vertical Rules (language_learning)
  ↓
Market Rules (language_learning:gb)  ← Ready for this!
  ↓
Client Rules (language_learning:gb:duolingo)
```

### Example Market Override (Future)

```typescript
// UK-specific rule for language learning apps
{
  verticalId: 'language_learning',
  marketId: 'gb',
  tokenRelevanceOverrides: {
    'british': 3,    // High relevance in UK
    'colour': 3,     // UK spelling
    'favourite': 3,  // UK spelling
    'color': 0,      // Low relevance in UK (US spelling)
  },
  hookOverrides: {
    learning_educational: [..., 'revise', 'practise'], // UK terms
  }
}
```

**For now**: All markets use same base rules (works fine for most cases)

---

## Error Handling

### App Not Available in Market

```typescript
// User tries to add DE market for app only available in US
const metadata = await fetchMetadata(appId, 'de');

if (!metadata) {
  toast.error('This app is not available in the German App Store. Try a different market.');
  return;
}
```

### Market Fetch Failed

```typescript
// Network error or App Store API down
try {
  const metadata = await fetchMetadata(appId, market);
} catch (error) {
  toast.error(`Failed to fetch data from ${market.toUpperCase()} market. Please try again.`);
  // Don't create monitored_app_markets entry
}
```

### Market Removed But Audit In Progress

```typescript
// User removes market while audit is running
if (auditInProgress && marketRemoved) {
  // Cancel in-flight audit
  // Show message: "Market removed during audit. Audit cancelled."
}
```

---

## Performance Considerations

### Database Queries

**Efficient Query** (single join):
```sql
SELECT
  ma.id,
  ma.app_name,
  mam.market_code,
  mam.title,
  mam.is_active
FROM monitored_apps ma
JOIN monitored_app_markets mam ON ma.id = mam.monitored_app_id
WHERE ma.organization_id = :org_id
  AND mam.is_active = true
ORDER BY ma.app_name, mam.market_code;
```

**Index Usage**:
- `idx_monitored_app_markets_app_id` for app lookups
- `idx_monitored_app_markets_market` for market filtering
- `idx_monitored_app_markets_active` for active market queries

### API Rate Limits

**iTunes Search API**:
- Rate limit: ~20 requests/minute per IP
- Strategy: Queue market fetches, max 1/market/3 seconds
- Bulk add: Fetch markets sequentially, not parallel

**Edge Functions**:
- Rate limit: 500 invocations/hour (free tier)
- Strategy: Cache aggressively, only fetch on explicit user action

---

## Migration Strategy

### Existing Apps Migration

All existing apps have `primary_country` set. Migration steps:

1. **Backup existing data**
   ```sql
   CREATE TABLE monitored_apps_backup AS SELECT * FROM monitored_apps;
   ```

2. **Create monitored_app_markets entries**
   ```sql
   INSERT INTO monitored_app_markets (
     monitored_app_id,
     organization_id,
     market_code,
     title,
     subtitle,
     description,
     is_active,
     created_at
   )
   SELECT
     id,
     organization_id,
     primary_country,
     app_name,
     NULL, -- subtitle
     NULL, -- description
     true,
     created_at
   FROM monitored_apps;
   ```

3. **Link existing audit snapshots**
   ```sql
   UPDATE aso_audit_snapshots
   SET monitored_app_market_id = (
     SELECT id FROM monitored_app_markets
     WHERE monitored_app_markets.monitored_app_id = aso_audit_snapshots.monitored_app_id
       AND monitored_app_markets.market_code = aso_audit_snapshots.locale
   );
   ```

4. **Verify data integrity**
   ```sql
   -- Check all apps have at least one market
   SELECT COUNT(*) FROM monitored_apps ma
   WHERE NOT EXISTS (
     SELECT 1 FROM monitored_app_markets mam
     WHERE mam.monitored_app_id = ma.id
   );
   -- Should return 0
   ```

5. **Drop old column** (after verification)
   ```sql
   ALTER TABLE monitored_apps DROP COLUMN primary_country;
   ```

---

## Testing Checklist

### Unit Tests
- [ ] MarketSelector component renders all 15 markets
- [ ] Market lookup by code works
- [ ] Flag emoji helper returns correct emoji
- [ ] Cache key generation includes market

### Integration Tests
- [ ] Add app with single market (GB) creates correct DB entries
- [ ] Add app with multiple markets creates N market entries
- [ ] Add market to existing app fetches correct data
- [ ] Remove market deletes all related data (CASCADE)
- [ ] Market switcher updates audit data correctly

### E2E Tests
- [ ] Complete flow: Search → Add → Add Market → View Audit → Remove Market
- [ ] Test with real apps in all 15 markets
- [ ] Verify app not available error handling
- [ ] Test cache persistence across page reloads
- [ ] Test audit history filtering by market

---

## Known Limitations

1. **iOS Only**: Android (Google Play) not supported yet
2. **15 Markets**: Limited to predefined list (can expand later)
3. **Single Platform per Market**: Can't monitor iOS + Android for same market
4. **No Market-Specific Bible Rules**: All markets use base rules (for now)
5. **Sequential Market Fetching**: Adding 5 markets = 5 sequential API calls (~15 seconds)

---

## Future Enhancements

### Phase 2 (Future)
- [ ] Market-specific Bible rule overrides
- [ ] Bulk market operations (add 10 markets at once)
- [ ] Market availability checker (before adding)
- [ ] Market performance comparison dashboard

### Phase 3 (Future)
- [ ] Android (Google Play) market support
- [ ] Market recommendations (suggest which markets to add)
- [ ] Market-specific keyword suggestions
- [ ] Multi-market ASO strategy recommendations

---

## Success Metrics

### Before Multi-Market
- ❌ Users can only monitor 1 market per app
- ❌ Switching markets requires creating new app entry
- ❌ No market comparison capabilities
- ❌ Audit history fragmented across "duplicate" apps

### After Multi-Market
- ✅ Users can monitor up to 15 markets per app
- ✅ Market switching via dropdown (instant)
- ✅ All market data under single app entity
- ✅ Market comparison ready (future phase)
- ✅ Clean audit history per market

---

## Questions & Decisions

### Resolved ✅
1. **Default market**: GB (United Kingdom)
2. **Platform support**: iOS only
3. **Data model**: AppTweak-style (separate entities)
4. **Cache strategy**: Keep while monitored, delete on removal
5. **Bible rules**: Base rules for all markets initially

### Pending ⏳
1. **Market add limit**: Should there be a max markets per app? (e.g., 10 max?)
2. **Bulk operations**: Priority for "add all markets" feature?
3. **Cost monitoring**: Alert when API rate limits approached?
4. **Market recommendations**: AI-powered "you should add X market" suggestions?

---

## Contact & Support

**Implementation Lead**: Claude + Igor
**Start Date**: 2025-01-24
**Estimated Completion**: 3-4 weeks
**Documentation**: This file + inline code comments

---

**Status**: Ready to start implementation 🚀
