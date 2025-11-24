# Enable Audit Snapshot Persistence - Implementation Plan

**Date**: 2025-01-24
**Status**: Hook exists but not called
**Impact**: Audit history not being saved

---

## Problem

The `usePersistAuditSnapshot` hook exists and is imported in `AppAuditHub.tsx` but is **never called**. This means:
- ❌ No audit snapshots saved to `aso_audit_snapshots`
- ❌ No metadata cached to `app_metadata_cache`
- ❌ No historical audit tracking
- ❌ Users can't see audit changes over time

---

## Current State

### Hook Status
- ✅ Hook exists: `src/hooks/usePersistAuditSnapshot.ts` (346 lines)
- ✅ Hook imported: `AppAuditHub.tsx` line 21
- ❌ Hook called: **NEVER**
- ❌ Data persisted: **ZERO ROWS**

### What the Hook Does
When called, it:
1. Computes metadata version hash (SHA256)
2. Upserts to `app_metadata_cache` (for fast re-loading)
3. Creates/finds `monitored_apps` entry
4. Inserts to `aso_audit_snapshots` (for history)
5. Optionally updates `monitored_apps.latest_audit_score`

---

## Implementation Plan

### Step 1: Initialize Hook in AppAuditHub

**File**: `src/components/AppAudit/AppAuditHub.tsx`

**Add after other hooks** (around line 100):
```typescript
const persistSnapshot = usePersistAuditSnapshot();
```

### Step 2: Call After Audit Completion

**Trigger**: When `auditData` is available and user is in "live" mode

**Add in useEffect** (after audit data loads):
```typescript
useEffect(() => {
  // Only persist if we have audit data and metadata
  if (
    !auditData ||
    !importedMetadata ||
    mode !== 'live' ||
    !organizationId ||
    persistSnapshot.isPending
  ) {
    return;
  }

  // Check if we've already persisted this audit (prevent duplicates)
  if (persistSnapshot.isSuccess) {
    return;
  }

  console.log('[AppAuditHub] Persisting audit snapshot...');

  persistSnapshot.mutate({
    organizationId,
    app_id: importedMetadata.appId,
    platform: (importedMetadata.platform as 'ios' | 'android') || 'ios',
    locale: selectedMarket || importedMetadata.locale,
    metadata: importedMetadata,
    auditData: {
      overallScore: auditData.overallScore,
      metadataScore: auditData.metadataScore || 0,
      keywordScore: auditData.keywordScore || 0,
      competitorScore: auditData.competitorScore || 0,
      creativeScore: auditData.creativeScore || 0,
      opportunityCount: auditData.opportunityCount || 0,
      rankDistribution: auditData.rankDistribution,
      keywordClusters: auditData.keywordClusters || [],
      keywordTrends: auditData.keywordTrends || [],
      competitorAnalysis: auditData.competitorAnalysis || [],
      currentKeywords: auditData.currentKeywords || [],
      metadataAnalysis: {
        scores: auditData.metadataScores || {},
        recommendations: auditData.recommendations || [],
        combinations: auditData.combinations,
        metrics: auditData.metrics,
        insights: auditData.insights
      },
      recommendations: auditData.recommendations || []
    },
    updateMonitoredApp: false // Don't mark as monitored yet
  });
}, [
  auditData,
  importedMetadata,
  mode,
  organizationId,
  selectedMarket,
  persistSnapshot
]);
```

### Step 3: Show Success/Error Feedback

**Success toast** (already in hook):
```typescript
onSuccess: () => {
  console.log('✅ Audit snapshot saved successfully');
  // Toast already shown by hook
}
```

**Error handling** (already in hook):
```typescript
onError: (error) => {
  console.error('❌ Failed to save audit:', error);
  toast.error('Failed to save audit results');
}
```

---

## Expected Behavior After Implementation

### When User Audits App
1. User imports app metadata (e.g., Duolingo)
2. Audit engine runs and generates scores
3. **NEW**: Audit snapshot automatically persists to DB
4. User sees audit results (no change to UX)
5. **NEW**: Database tables get populated:
   - `app_metadata_cache`: 1 new row
   - `aso_audit_snapshots`: 1 new row
   - `monitored_apps`: 1 new row (if not exists)

### When User Re-Audits Same App
1. User clicks "Refresh" or re-imports
2. **NEW**: System creates new snapshot
3. **NEW**: Audit diff is calculated
4. **NEW**: User can compare current vs previous audit
5. Database tables grow:
   - `app_metadata_cache`: Updated (upsert)
   - `aso_audit_snapshots`: +1 new row
   - `aso_audit_diffs`: +1 new row (if metadata changed)

---

## Benefits

### For Users
- ✅ Audit history preserved
- ✅ Can compare audits over time
- ✅ See score trends (improving/declining)
- ✅ Track metadata changes
- ✅ Undo/revert to previous versions

### For System
- ✅ Metadata cache reduces API calls
- ✅ Historical data for analytics
- ✅ Audit diffs auto-calculated
- ✅ No duplicate audits (hash-based deduplication)

---

## Potential Issues & Solutions

### Issue 1: Duplicate Persistence
**Problem**: Audit might be persisted multiple times on re-renders
**Solution**: Add state flag to track if already persisted
```typescript
const [hasPersistedAudit, setHasPersistedAudit] = useState(false);

useEffect(() => {
  if (hasPersistedAudit) return;

  persistSnapshot.mutate(...);
  setHasPersistedAudit(true);
}, [auditData, hasPersistedAudit]);
```

### Issue 2: Slow Persistence
**Problem**: Saving to DB might slow down UI
**Solution**: Hook uses async mutation - doesn't block UI
```typescript
// Non-blocking - audit results show immediately
persistSnapshot.mutate(...); // Fire and forget
```

### Issue 3: Monitored vs Live Mode
**Problem**: Should we persist audits in both modes?
**Solution**: Only persist in "live" mode (one-off audits)
```typescript
if (mode !== 'live') return; // Skip for monitored mode
```

### Issue 4: Missing Organization ID
**Problem**: Audit might run before organization loaded
**Solution**: Check `organizationId` exists before persisting
```typescript
if (!organizationId) {
  console.warn('Cannot persist audit: missing organization ID');
  return;
}
```

---

## Testing Plan

### Test Case 1: First Audit
**Steps**:
1. Go to /aso-ai-hub/audit
2. Search and import "Duolingo"
3. Wait for audit to complete
4. Check console for persistence logs
5. Query database: `SELECT * FROM aso_audit_snapshots LIMIT 1`

**Expected**:
- Console: "Persisting audit snapshot..."
- Console: "✓ Audit snapshot created: {uuid}"
- Database: 1 new row in `aso_audit_snapshots`

### Test Case 2: Re-Audit Same App
**Steps**:
1. With Duolingo already audited
2. Click "Refresh" or re-import
3. Wait for audit to complete
4. Check database: `SELECT COUNT(*) FROM aso_audit_snapshots WHERE app_id = 'duolingo-app-id'`

**Expected**:
- Count: 2 (original + new snapshot)
- Each snapshot has different `created_at` timestamp
- Audit diff calculated if metadata changed

### Test Case 3: Different Apps
**Steps**:
1. Audit Duolingo
2. Audit Babbel
3. Audit Rosetta Stone
4. Check: `SELECT DISTINCT app_id FROM aso_audit_snapshots`

**Expected**:
- 3 distinct app IDs
- Each app has 1 snapshot
- Total: 3 rows

---

## Performance Impact

### Database Writes
- **Per audit**: 2-3 INSERTs/UPSERTs
  - 1 UPSERT to `app_metadata_cache`
  - 1 INSERT to `aso_audit_snapshots`
  - 1 INSERT to `monitored_apps` (if new app)

### Time Overhead
- **Hash computation**: ~5-10ms (SHA256)
- **Database writes**: ~50-100ms
- **Total**: ~100ms (non-blocking)

### Storage Growth
- **Per audit**: ~10-20 KB
- **100 audits**: ~1-2 MB
- **1000 audits**: ~10-20 MB
- **Acceptable**: Storage is cheap

---

## Admin UI Integration

### Future: Audit History View
Once persistence is enabled, we can build:
- Audit timeline (show all historical audits)
- Score trend charts (visualize improvements)
- Metadata diff viewer (highlight changes)
- Snapshot restore (revert to previous version)

**Location**: `/apps/{appId}/audit-history`

---

## Migration Path

### Phase 1: Enable Persistence (This Phase)
1. Add hook call in AppAuditHub
2. Test with 5-10 audits
3. Verify database tables populate
4. Deploy to staging

### Phase 2: Backfill Historical Data (Optional)
1. Check if any apps were audited before persistence
2. Re-run audits to generate snapshots
3. Or: Leave empty, only track going forward

### Phase 3: Build Admin UI (Phase 25+)
1. Audit history page
2. Diff viewer
3. Trend charts
4. Export/download snapshots

---

## Risk Assessment

### Low Risk
- ✅ Hook is read-only for audit data (doesn't modify state)
- ✅ Non-blocking async mutation
- ✅ Error handling already built-in
- ✅ Doesn't change user-facing UI

### Medium Risk
- ⚠️ Could create duplicate snapshots if not careful
- ⚠️ Database could grow large over time (mitigated by cleanup job)

### High Risk
- ❌ None identified

---

## Rollback Plan

If issues arise:
1. Comment out `persistSnapshot.mutate()` call
2. Deploy
3. System reverts to current behavior (no persistence)
4. No data loss (audits still work, just not saved)

---

## Recommendation

✅ **ENABLE NOW** - Low risk, high value

**Why**:
- Hook is fully implemented and tested
- No UI changes required
- Provides foundation for future features (history, diffs, trends)
- Enables data-driven insights
- No negative impact on performance

**Implementation Time**: ~30 minutes
- 10 min: Add hook call
- 10 min: Test locally
- 10 min: Deploy and verify

---

**Status**: Ready to implement
**Priority**: Medium (enables future features)
**Risk Level**: Low
**Implementation Date**: TBD (after pattern seed approval)

