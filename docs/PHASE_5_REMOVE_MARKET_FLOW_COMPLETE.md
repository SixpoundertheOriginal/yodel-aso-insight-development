# Phase 5: Remove Market Flow - Implementation Complete ✅

**Date**: 2025-01-24
**Status**: Complete
**Feature**: Multi-Market Support - Remove Market Flow with CASCADE Warnings

## Overview

Implemented the "Remove Market" flow that allows users to remove markets from monitored apps with comprehensive warnings about CASCADE deletion of audit history. This ensures users understand the permanent nature of market removal and prevents accidental data loss.

## What Was Implemented

### 1. **RemoveMarketModal Component** (`src/components/AppManagement/RemoveMarketModal.tsx`)

Modal dialog for removing markets from existing apps with safety features.

#### Features:
- ✅ Multi-select for batch removal of markets
- ✅ Displays audit snapshot count per market
- ✅ Warning about irreversible CASCADE deletion
- ✅ Prevents removing the last market (apps must have ≥1 market)
- ✅ Confirmation checkbox for safety
- ✅ Real-time audit count loading from database
- ✅ Deletion impact summary
- ✅ Toast notifications on success/error
- ✅ Callback to refresh app list after removal

#### UI Structure:
```
┌─────────────────────────────────────────────────┐
│ 🗑 Remove Markets                               │
│ Remove markets from Duolingo                    │
├─────────────────────────────────────────────────┤
│ ⚠️ Warning: Removing a market will permanently  │
│    delete all audit snapshots and historical    │
│    data for that market. This cannot be undone. │
│                                                 │
│ Select markets to remove (3 total):            │
│                                                 │
│ ☑ 🇬🇧 United Kingdom      [42 audits] [Active] │
│ ☐ 🇺🇸 United States       [38 audits] [Active] │
│ ☐ 🇩🇪 Germany              [15 audits] [Active] │
│                                                 │
│ Deletion impact:                                │
│ • 1 market will be removed                      │
│ • 42 audit snapshots will be permanently deleted│
│ • All historical data for these markets lost    │
│                                                 │
│ ☑ I understand that this action is permanent    │
│   and irreversible, and all audit history for   │
│   the selected markets will be deleted.         │
│                                                 │
│ [Cancel] [🗑 Remove (1)]                        │
└─────────────────────────────────────────────────┘
```

#### Key Props:
```typescript
interface RemoveMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  app: { id: string; app_name: string };
  markets: MonitoredAppMarket[];
  onMarketRemoved?: () => void;
}
```

---

### 2. **Apps Page Updates** (`src/pages/apps.tsx`)

Integrated market removal functionality into the apps list view.

#### Changes:
1. **"Remove Market" Menu Action**
   - Added to app dropdown menu (after "Add Market")
   - Trash icon for visual consistency
   - Opens RemoveMarketModal on click

2. **Market Removal Handler**
   - `handleRemoveMarket(app)` - Opens modal with app context
   - `handleMarketRemoved()` - Refreshes markets after removal
   - Reuses existing `loadMarketsForApp()` for data refresh

#### Dropdown Menu Structure:
```
Dropdown Menu:
- ✏️ Edit App
- ⏸ Deactivate
- ────────
- 🌍 Add Market
- 🗑 Remove Market  ← NEW
- ────────
- 🗑 Delete App
```

---

## Key Features

### 1. **Audit Count Display**

When modal opens, it queries the database to get exact audit snapshot counts for each market:

```typescript
const { count, error } = await supabase
  .from('aso_audit_snapshots')
  .select('id', { count: 'exact', head: true })
  .eq('monitored_app_market_id', market.id);
```

This gives users visibility into what they're about to delete:
- **42 audits** - Shows substantial history
- **0 audits** - Indicates no data loss
- **Loading state** - Spinner while fetching counts

---

### 2. **Multi-Select Removal**

Users can select multiple markets at once for batch removal:

```typescript
const [selectedMarkets, setSelectedMarkets] = useState<MarketCode[]>([]);

const handleToggleMarket = (marketCode: MarketCode) => {
  if (selectedMarkets.includes(marketCode)) {
    setSelectedMarkets(selectedMarkets.filter((m) => m !== marketCode));
  } else {
    setSelectedMarkets([...selectedMarkets, marketCode]);
  }
};
```

---

### 3. **Last Market Protection**

Prevents removing all markets (apps must have at least one):

```typescript
if (selectedMarkets.length === markets.length) {
  toast({
    variant: 'destructive',
    title: 'Cannot remove all markets',
    description: 'Apps must have at least one market. Add a new market before removing the last one.',
  });
  return;
}
```

UI shows warning badge when all markets selected:
```
⚠️ Cannot remove all markets: Apps must have at least one market.
    Please add a new market before removing the last one.
```

---

### 4. **Deletion Impact Summary**

Real-time calculation of what will be deleted:

```typescript
const totalAuditSnapshots = marketsWithCounts
  .filter((m) => selectedMarkets.includes(m.market_code as MarketCode))
  .reduce((sum, m) => sum + (m.auditCount || 0), 0);
```

Display:
```
Deletion impact:
• 2 markets will be removed
• 80 audit snapshots will be permanently deleted
• All historical data for these markets will be lost
```

---

### 5. **Confirmation Checkbox**

Safety mechanism requiring explicit user confirmation:

```typescript
const [confirmChecked, setConfirmChecked] = useState(false);

if (!confirmChecked) {
  toast({
    variant: 'destructive',
    title: 'Confirmation required',
    description: 'Please check the confirmation box to proceed',
  });
  return;
}
```

Checkbox text:
> I understand that this action is **permanent and irreversible**, and all audit history for the selected markets will be deleted.

---

### 6. **CASCADE Deletion Flow**

When markets are removed, PostgreSQL CASCADE automatically deletes linked data:

```sql
-- monitored_app_markets table
ON DELETE CASCADE

-- This means when a market is deleted:
DELETE FROM monitored_app_markets WHERE id = 'market-uuid';

-- PostgreSQL automatically runs:
DELETE FROM aso_audit_snapshots WHERE monitored_app_market_id = 'market-uuid';
```

The hook simply calls:
```typescript
const { error: deleteError } = await supabase
  .from('monitored_app_markets')
  .delete()
  .eq('monitored_app_id', appId)
  .eq('market_code', marketCode);
```

No manual cleanup needed - database handles it!

---

## User Flow

### Scenario: User wants to remove Germany market from Duolingo

1. **Navigate to Apps Page**
   - User sees Duolingo: `iOS | Education | 🇬🇧 GB 🇺🇸 US 🇩🇪 DE`

2. **Open Dropdown**
   - Click `[•••]` menu on Duolingo card
   - Select "🗑 Remove Market"

3. **Remove Market Modal Opens**
   ```
   ⚠️ Warning: Removing a market will permanently delete
      all audit snapshots and historical data for that market.

   Currently monitoring (3):
   ☐ 🇬🇧 United Kingdom    [42 audits] [Active]
   ☐ 🇺🇸 United States     [38 audits] [Active]
   ☑ 🇩🇪 Germany            [15 audits] [Active]

   Deletion impact:
   • 1 market will be removed
   • 15 audit snapshots will be permanently deleted
   • All historical data for these markets will be lost

   ☑ I understand this action is permanent and irreversible
   ```

4. **Confirm Removal**
   - Check Germany market
   - Check confirmation checkbox
   - Click "🗑 Remove (1)"

5. **Backend Processing**
   - Call `removeMarket(duolingoId, 'de')`
   - Delete monitored_app_markets entry for Germany
   - PostgreSQL CASCADE deletes 15 audit snapshots
   - Return success

6. **Success**
   - Toast: "Markets removed - Successfully removed 1 market"
   - Modal closes
   - Apps list refreshes
   - Duolingo now shows: `iOS | Education | 🇬🇧 GB 🇺🇸 US`

---

## Error Handling

### Modal-Level Validations:

1. **No markets selected**
   ```typescript
   if (selectedMarkets.length === 0) {
     toast({ title: 'No markets selected', description: '...' });
     return;
   }
   ```

2. **Confirmation not checked**
   ```typescript
   if (!confirmChecked) {
     toast({ title: 'Confirmation required', description: '...' });
     return;
   }
   ```

3. **Cannot remove all markets**
   ```typescript
   if (selectedMarkets.length === markets.length) {
     toast({ title: 'Cannot remove all markets', description: '...' });
     return;
   }
   ```

### Hook-Level Errors:
- Database deletion failure
- Network errors
- Supabase RLS policy violations

### Batch Removal Error Handling:

If removing multiple markets, some may succeed and others fail:

```typescript
let successCount = 0;
let failCount = 0;

for (const marketCode of selectedMarkets) {
  const success = await removeMarket(app.id, marketCode);
  if (success) successCount++;
  else failCount++;
}

toast({
  title: 'Markets removed',
  description: `Successfully removed ${successCount} markets (${failCount} failed)`,
});
```

---

## Safety Features Summary

| Feature | Purpose |
|---------|---------|
| **Audit Count Display** | Shows exactly how much data will be lost |
| **Deletion Impact Summary** | Real-time calculation of deletion scope |
| **Warning Alerts** | Red alert box at top of modal |
| **Confirmation Checkbox** | Requires explicit user acknowledgment |
| **Last Market Protection** | Prevents removing all markets from an app |
| **Toast Notifications** | Immediate feedback on success/error |
| **Loading States** | Prevents double-clicks during deletion |
| **Batch Error Handling** | Reports partial success in multi-select |

---

## Visual Design

### Color Scheme:
- **Red Theme** - Indicates destructive action
  - `bg-red-900/20` - Modal title background
  - `border-red-400/30` - Warning alert borders
  - `text-red-400` - Warning text and title
  - `bg-red-600 hover:bg-red-700` - Remove button

### Icons:
- `<Trash2>` - Primary action icon
- `<AlertTriangle>` - Warning indicators
- `<Loader2>` - Loading spinner

### Badge Colors:
- **Selected markets**: `bg-red-900/20 border-red-400/30` (red glow)
- **Unselected markets**: `bg-zinc-800/50 border-zinc-700` (neutral)
- **Audit counts**: `border-zinc-600 text-zinc-400` (subtle)
- **Active status**: `border-emerald-400/30 text-emerald-400` (green)

---

## Database Integration

Uses existing CASCADE relationship:

```sql
ALTER TABLE public.aso_audit_snapshots
  ADD COLUMN monitored_app_market_id UUID
  REFERENCES public.monitored_app_markets(id) ON DELETE CASCADE;
```

When a market is deleted:
1. `monitored_app_markets` row is removed
2. PostgreSQL automatically deletes all `aso_audit_snapshots` rows where `monitored_app_market_id` matches
3. No orphaned data left behind

---

## Performance Considerations

### Database Queries:
- **Audit count loading**: One query per market (parallel execution)
- **Market deletion**: One DELETE per selected market (sequential to handle errors)
- **CASCADE deletion**: Handled by PostgreSQL (optimized indexes)

### UI Updates:
- Loading state during audit count fetch
- Disabled buttons during deletion
- Refresh only affected app's markets
- Toast notifications for instant feedback

---

## Testing Checklist

✅ TypeScript compilation passes
✅ RemoveMarketModal component created
✅ "Remove Market" menu action added
✅ Modal integration complete

### Manual Testing Required:
- [ ] Open Remove Market modal for an app
- [ ] Verify audit counts load correctly
- [ ] Select multiple markets
- [ ] Check deletion impact summary updates
- [ ] Try removing without confirmation checkbox (should fail)
- [ ] Try removing all markets (should fail with warning)
- [ ] Remove one market and verify CASCADE deletion
- [ ] Verify market badge disappears from app card
- [ ] Test batch removal (2+ markets)
- [ ] Check error handling for failed deletions

---

## Next Steps

### Phase 6: Market Switcher in Audit Views
- Add market dropdown to audit page header
- Filter audits by selected market
- Update URLs to include market parameter (`/audit?market=gb`)
- Persist market selection in session storage

### Phase 7: Market-Aware Caching
- Update cache keys: `app_metadata:${appId}:${market}`
- Implement cache create/update/delete lifecycle
- Clear cache when market is removed
- Add cache TTL per market

### Phase 8: End-to-End Testing
- Test complete multi-market workflow
- Verify all 15 markets work correctly
- Test edge cases (last market, duplicate removal)
- Performance testing with many markets

---

## Files Created

1. `src/components/AppManagement/RemoveMarketModal.tsx` (320 lines)

## Files Modified

1. `src/pages/apps.tsx` (+20 lines)
   - Added "Remove Market" menu action
   - Integrated RemoveMarketModal
   - Added market removal handler

---

## Security & Permissions

### RLS Policies (Already in Place):
```sql
CREATE POLICY "Users can delete markets for their organization"
  ON monitored_app_markets FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));
```

Users can only remove markets from apps in their organization.

### CASCADE Safety:
- Database enforces referential integrity
- No orphaned audit snapshots
- Transaction-safe deletion

---

## Success Metrics

This implementation provides:
- ✅ Safe market removal with comprehensive warnings
- ✅ Audit history visibility before deletion
- ✅ Multi-select batch removal
- ✅ Protection against removing last market
- ✅ Automatic CASCADE cleanup
- ✅ User-friendly confirmation flow
- ✅ Real-time deletion impact summary
- ✅ Graceful error handling

---

## Conclusion

Phase 5 is complete! Users can now safely remove markets from their monitored apps with full visibility into the data deletion impact. The system prevents accidental data loss through multiple safety mechanisms while providing a smooth UX for intentional market removal.

**Status**: ✅ Ready for Phase 6 (Market Switcher in Audit Views)
