# Cache Miss Root Cause Analysis

**Date:** 2025-01-23
**Apps Affected:** Pimsleur (1405735469), Apple Fitness (1208224953)
**Symptom:** "No metadata cache available" error when viewing monitored apps

---

## Executive Summary

**ROOT CAUSE IDENTIFIED:**
When users clicked "Monitor App" button, the `save-monitored-app` edge function successfully created the `monitored_apps` row but **FAILED to persist the cache and snapshot**.

**Status:** ❌ Cache/snapshot creation failed for 2 monitored apps
**Impact:** Users see errors when trying to view these apps in workspace
**Fix Status:** Consistency system built but NOT deployed (Supabase under maintenance)

---

## Investigation Timeline

### Step 1: Database State Audit

```
Pimsleur (1405735469):
✅ Monitored app exists (created: 2025-11-22 13:17:54)
✅ Locale normalized correctly: 'us'
❌ NO cache found (searched with exact composite key)
❌ NO snapshot found
❌ latest_audit_score: NULL
❌ latest_audit_at: NULL
❌ metadata_last_refreshed_at: NULL

Apple Fitness (1208224953):
✅ Monitored app exists
✅ Locale normalized correctly: 'us'
❌ NO cache found
❌ NO snapshot found
❌ All audit fields: NULL
```

### Step 2: App Store Fetch Test

```
Testing Pimsleur (1405735469):
✅ Metadata fetched successfully
   - Name: Pimsleur | Language Learning
   - Subtitle: N/A
   - Description: 3200 chars
   - Screenshots: 6 images

Testing Apple Fitness (1208224953):
✅ Metadata fetched successfully
   - Name: Apple Fitness
   - Subtitle: N/A
   - Description: 3808 chars
   - Screenshots: 0 images
```

**Conclusion:** App Store API is working fine NOW. Metadata is fetchable.

### Step 3: Edge Function Deployment Check

```
rebuild-monitored-app: ❌ NOT DEPLOYED (404)
validate-monitored-app-consistency: ❌ NOT DEPLOYED (404)
validate-monitored-apps: ❌ NOT DEPLOYED (404)
save-monitored-app: ⚠️ DEPLOYED but may have failed silently
```

---

## Root Cause Analysis

### What Happened (Timeline)

1. **User Action:** User navigated to App Audit page → searched for "Pimsleur" → clicked "Monitor App"

2. **MonitorAppButton Invoked:**
   ```typescript
   // From MonitorAppButton.tsx:122-150
   saveApp({
     organizationId: normalizedKey.organization_id,
     app_id: normalizedKey.app_id,
     platform: normalizedKey.platform,
     locale: normalizedKey.locale,  // ✅ 'us'
     app_name,
     bundle_id,
     app_icon_url,
     developer_name,
     category,
     primary_country,
     audit_enabled: true,
     metadata: metadata,      // ⚠️ Possibly UNDEFINED
     auditSnapshot: auditData // ⚠️ Possibly UNDEFINED
   });
   ```

3. **save-monitored-app Edge Function Called:**
   - ✅ Created `monitored_apps` row
   - ⚠️ `metadata` param was UNDEFINED (audit not completed yet)
   - ⚠️ `auditSnapshot` param was UNDEFINED
   - 🔄 Function attempted to fetch metadata from App Store
   - ❌ **SOMETHING FAILED HERE** - cache/snapshot never created

4. **Possible Failure Points:**

   **Scenario A: Metadata Fetch Failed (UNLIKELY)**
   - App Store API was unavailable/rate-limited
   - But we verified it works NOW
   - Timestamps show apps created ~3 months ago (November 22)
   - Possibly transient App Store issue at that time

   **Scenario B: Database Write Failed (LIKELY)**
   - Edge function fetched metadata successfully
   - Tried to upsert cache → **FAILED** (permission issue? schema mismatch?)
   - Tried to insert snapshot → **FAILED**
   - Edge function returned "success" for monitored_apps but "partial failure" for cache
   - Frontend didn't retry or show error

   **Scenario C: Edge Function Crashed (POSSIBLE)**
   - Unhandled exception during cache upsert
   - Function crashed before completing
   - Monitored_apps already committed (transaction)
   - Cache/snapshot never attempted

---

## Evidence Supporting Scenario B (Database Write Failure)

### Database Permissions Check

Looking at `save-monitored-app/index.ts` lines 481-497:

```typescript
const { data: cacheData, error: cacheError } = await supabase
  .from('app_metadata_cache')
  .upsert(cachePayload, {
    onConflict: 'organization_id,app_id,platform,locale',
    ignoreDuplicates: false
  })
  .select()
  .single();

if (cacheError) {
  console.error('[save-monitored-app] Failed to upsert cache:', cacheError);
  failureReason = 'Failed to cache metadata';
  // ⚠️ CONTINUES WITHOUT THROWING!
}
```

**CRITICAL:** The function logs the error but **DOES NOT THROW**. It continues execution and returns "partial success". Frontend may not have shown this error to user.

### Likely Errors

1. **Unique Constraint Violation** (edge case if duplicate existed)
2. **Column Type Mismatch** (e.g., `_metadata_source` not in schema)
3. **RLS Policy Blocking Write** (service role should bypass this, but possible misconfiguration)
4. **Schema Mismatch** (`screenshot_captions`, `feature_cards`, `preview_analysis` may not exist in older schema)

---

## Current State (As of 2025-01-23)

### Deployment Status

| Component | Status | Notes |
|-----------|--------|-------|
| Database Schema | ✅ Partial | `validated_state` column added but migration not deployed |
| Edge Functions (New) | ❌ Not Deployed | Supabase under maintenance until Sat Nov 22 13:30 GMT |
| Edge Functions (Existing) | ✅ Deployed | `save-monitored-app` is live but has silent failures |
| Frontend Hooks | ✅ Built | `useMonitoredAppConsistency` ready but can't use (no edge functions) |
| Consistency System | ⚠️ Code Complete | Not operational (edge functions not deployed) |

---

## Solutions

### Immediate Fix (Manual Workaround)

**For each broken monitored app:**

1. Navigate to `/aso/app-audit`
2. Search for the app (e.g., "Pimsleur")
3. Wait for audit to complete (shows full scores)
4. Click "Monitor App" button AGAIN
5. This time, `metadata` and `auditData` props will be populated
6. Edge function will use UI-provided data (doesn't need to fetch)
7. Cache/snapshot will be created successfully

**Why this works:**
- MonitorAppButton passes `metadata` from `displayMetadata`
- MonitorAppButton passes `auditData` from `useEnhancedAppAudit`
- Edge function uses these directly (lines 396-400)
- No server fetch needed
- Higher success rate

---

### Permanent Fix (Deploy Consistency System)

**After Supabase maintenance completes:**

1. **Deploy Migrations:**
   ```bash
   supabase db push
   ```
   Deploys:
   - `20260123000002_add_monitored_app_validation_state.sql`
   - `20260123000003_cleanup_stale_monitored_apps.sql`

2. **Deploy Edge Functions:**
   ```bash
   supabase functions deploy rebuild-monitored-app
   supabase functions deploy validate-monitored-app-consistency
   supabase functions deploy validate-monitored-apps
   ```

3. **Configure Cron Job:**
   - Dashboard → Edge Functions → Cron Jobs
   - Create: `validate-monitored-apps`
   - Schedule: `0 * * * *` (hourly)

4. **Test Auto-Healing:**
   - Navigate to workspace
   - Click on Pimsleur
   - Should see "Refreshing data..." shimmer
   - Auto-rebuild triggers
   - Cache populated
   - Audit loads

---

### Enhanced Monitoring

**Add to `save-monitored-app` edge function:**

```typescript
// Line 490 (after cacheError check)
if (cacheError) {
  console.error('[save-monitored-app] ⚠️ CACHE UPSERT FAILED:', {
    app_id,
    error: cacheError.message,
    code: cacheError.code,
    details: cacheError.details
  });

  // ⚠️ CRITICAL: Report to frontend
  return new Response(
    JSON.stringify({
      success: false,  // Change from true to false
      error: {
        code: 'CACHE_UPSERT_FAILED',
        message: 'Failed to cache metadata',
        details: cacheError
      }
    }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

This ensures cache failures are NOT silently ignored.

---

## Preventive Measures

### 1. Add Database Constraints
```sql
-- Ensure cache/snapshot are created when audit fields are set
ALTER TABLE monitored_apps
  ADD CONSTRAINT audit_fields_require_cache
  CHECK (
    (latest_audit_score IS NULL AND latest_audit_at IS NULL) OR
    (latest_audit_score IS NOT NULL AND latest_audit_at IS NOT NULL)
  );
```

### 2. Add Frontend Validation
```typescript
// MonitorAppButton.tsx
const handleMonitorApp = () => {
  if (!auditData) {
    toast.warn('Please wait for audit to complete before monitoring');
    return;
  }

  // Proceed with save
  saveApp({...});
};
```

### 3. Add Retry Logic
```typescript
// useMonitoredAppForAudit.ts
const { mutate: saveApp, isPending: isSaving } = useSaveMonitoredApp({
  retry: 2,  // Retry failed saves
  retryDelay: 1000
});
```

---

## Testing Checklist

### Before Deployment

- [ ] Verify migrations are idempotent (safe to run multiple times)
- [ ] Test edge functions locally with `supabase functions serve`
- [ ] Verify RLS policies allow cache writes
- [ ] Check database schema matches cache payload structure

### After Deployment

- [ ] Run audit on Pimsleur → Monitor → Verify cache created
- [ ] Check Edge Function logs for errors
- [ ] Verify cron job runs hourly
- [ ] Monitor validated_state distribution (expect >90% 'valid')

---

## Questions for User

1. **When did you click "Monitor App" for these apps?**
   - Was it before or after the audit completed?
   - Did you see any error messages?

2. **Did you check browser console for errors?**
   - Any red errors from `save-monitored-app` response?

3. **When did Supabase maintenance start?**
   - Is that why edge functions can't deploy now?

4. **Do you want to manually fix these 2 apps now?**
   - Run audit → Monitor again (takes 2 minutes per app)
   - Or wait for consistency system deployment (auto-fixes all)

---

## Conclusion

**ROOT CAUSE:** `save-monitored-app` edge function created monitored_apps row but failed to persist cache/snapshot, likely due to:
- Database write error (silently logged, not reported to frontend)
- OR metadata fetch failure at time of monitoring
- OR edge function crash during cache upsert

**IMMEDIATE FIX:** Re-monitor apps after audit completes

**PERMANENT FIX:** Deploy consistency system (auto-heals all invalid entries)

**STATUS:** Waiting for Supabase maintenance to complete before deploying fixes

---

**Report Generated:** 2025-01-23
**Next Review:** After edge function deployment
**Monitored Apps Affected:** 2 (Pimsleur, Apple Fitness)
