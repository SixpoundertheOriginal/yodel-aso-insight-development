# Enterprise Monitored Apps System - Part 2: Frontend & Deployment

**Continuation of:** `ENTERPRISE_MONITORED_APPS_AUDIT_AND_FIX.md`

---

## 7. FIXED REACT HOOKS / COMPONENTS

### Fix 1: Corrected Query Keys

**File:** `src/hooks/useMonitoredAppForAudit.ts`

```typescript
/**
 * useMonitoredAppForAudit Hook (Enterprise-Grade)
 *
 * CRITICAL FIXES:
 * 1. Query key includes organization_id for proper invalidation
 * 2. Only warns on CRITICAL partial failures (not acceptable ones)
 * 3. Properly handles edge function responses
 *
 * React Query patterns optimized for 10,000+ apps scale.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MonitoredAppWithAudit, SaveMonitoredAppResponse } from '@/modules/app-monitoring';

/**
 * Input for saving/monitoring an app
 */
export interface SaveMonitoredAppInput {
  app_id: string;
  platform: 'ios' | 'android';
  app_name: string;
  locale?: string;
  bundle_id?: string | null;
  app_icon_url?: string | null;
  developer_name?: string | null;
  category?: string | null;
  primary_country?: string;
  audit_enabled?: boolean;
  tags?: string[] | null;
  notes?: string | null;
}

/**
 * Hook to check if an app is monitored for audit
 *
 * CRITICAL FIX: Query key now includes organization_id as FIRST param
 * This ensures proper cache isolation and invalidation.
 */
export function useIsAppMonitored(
  app_id: string,
  platform: 'ios' | 'android',
  organizationId: string | undefined
) {
  return useQuery({
    queryKey: ['monitored-app', organizationId, app_id, platform], // ✅ FIXED: org_id first
    queryFn: async () => {
      if (!organizationId) return null;

      const { data, error } = await supabase
        .from('monitored_apps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('app_id', app_id)
        .eq('platform', platform)
        .eq('audit_enabled', true)
        .maybeSingle();

      if (error) {
        console.error('[useIsAppMonitored] Error:', error);
        throw error;
      }

      return data as MonitoredAppWithAudit | null;
    },
    enabled: Boolean(organizationId && app_id && platform),
    staleTime: 30_000, // 30 seconds - fresh enough for monitoring state
    gcTime: 5 * 60_000 // 5 minutes - cache for quick re-renders
  });
}

/**
 * Hook to save/monitor an app for audit
 *
 * CRITICAL FIXES:
 * 1. Only shows warnings for CRITICAL failures (acceptableFailure = false)
 * 2. Invalidates with correct query key (4 params, org_id first)
 * 3. Handles partial responses gracefully
 */
export function useSaveMonitoredApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveMonitoredAppInput) => {
      console.log('[useSaveMonitoredApp] Saving app:', input.app_id, input.platform);

      // Call save-monitored-app edge function
      const { data, error } = await supabase.functions.invoke('save-monitored-app', {
        body: input
      });

      if (error) {
        console.error('[useSaveMonitoredApp] Edge function error:', error);
        throw new Error(error.message || 'Failed to save monitored app');
      }

      const response = data as SaveMonitoredAppResponse;

      if (!response.success) {
        console.error('[useSaveMonitoredApp] Workflow failed:', response.error);
        throw new Error(response.error?.message || 'Failed to save monitored app');
      }

      // ✅ FIXED: Only warn on CRITICAL partial failures
      if (response.partial && response.partial.failureReason) {
        if (response.partial.acceptableFailure) {
          // Acceptable failure - log but don't warn user
          console.warn('[useSaveMonitoredApp] Acceptable partial failure:', response.partial.failureReason);
        } else {
          // Critical failure - warn user
          console.error('[useSaveMonitoredApp] Critical partial failure:', response.partial.failureReason);
          toast.warning(
            `App monitored, but: ${response.partial.failureReason}`,
            { duration: 5000 }
          );
        }
      }

      return response;
    },
    onSuccess: (response, variables) => {
      console.log('[useSaveMonitoredApp] Success:', response.data?.monitoredApp?.id);

      // Get organization_id from the returned monitored app
      const organizationId = response.data?.monitoredApp?.organization_id;

      toast.success('App successfully monitored for ASO audit tracking', {
        description: `Latest audit score: ${response.data?.monitoredApp?.latest_audit_score || 'Pending'}/100`
      });

      // ✅ FIXED: Invalidate with correct 4-param query key
      if (organizationId) {
        queryClient.invalidateQueries({
          queryKey: ['monitored-app', organizationId, variables.app_id, variables.platform]
        });
        queryClient.invalidateQueries({
          queryKey: ['monitored-apps-audit', organizationId]
        });
        queryClient.invalidateQueries({
          queryKey: ['audit-snapshots', organizationId, variables.app_id]
        });
      }
    },
    onError: (error) => {
      console.error('[useSaveMonitoredApp] Error:', error);
      toast.error('Failed to monitor app', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

/**
 * Hook to fetch all audit-enabled monitored apps for workspace
 */
export function useAuditEnabledApps(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['monitored-apps-audit', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('monitored_apps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('audit_enabled', true)
        .order('latest_audit_at', { ascending: false, nullsFirst: false })
        .limit(100);

      if (error) {
        console.error('[useAuditEnabledApps] Error:', error);
        throw error;
      }

      return (data || []) as MonitoredAppWithAudit[];
    },
    enabled: Boolean(organizationId),
    staleTime: 60_000, // 1 minute
    gcTime: 5 * 60_000 // 5 minutes
  });
}

/**
 * Hook to remove an app from audit monitoring
 */
export function useRemoveMonitoredApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      app_id,
      platform,
      organizationId
    }: {
      app_id: string;
      platform: 'ios' | 'android';
      organizationId: string;
    }) => {
      console.log('[useRemoveMonitoredApp] Removing app:', app_id, platform);

      const { error } = await supabase
        .from('monitored_apps')
        .delete()
        .eq('organization_id', organizationId)
        .eq('app_id', app_id)
        .eq('platform', platform);

      if (error) {
        console.error('[useRemoveMonitoredApp] Error:', error);
        throw error;
      }

      return { app_id, platform, organizationId };
    },
    onSuccess: (result) => {
      console.log('[useRemoveMonitoredApp] Success:', result.app_id);

      toast.success('App removed from audit monitoring');

      // ✅ FIXED: Invalidate with correct query key
      queryClient.invalidateQueries({
        queryKey: ['monitored-app', result.organizationId, result.app_id, result.platform]
      });
      queryClient.invalidateQueries({
        queryKey: ['monitored-apps-audit', result.organizationId]
      });
    },
    onError: (error) => {
      console.error('[useRemoveMonitoredApp] Error:', error);
      toast.error('Failed to remove app', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

/**
 * Hook to toggle audit enablement for a monitored app
 */
export function useToggleAudit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      app_id,
      platform,
      organizationId,
      enabled
    }: {
      app_id: string;
      platform: 'ios' | 'android';
      organizationId: string;
      enabled: boolean;
    }) => {
      console.log('[useToggleAudit] Toggling audit:', app_id, platform, enabled);

      const { data, error } = await supabase
        .from('monitored_apps')
        .update({ audit_enabled: enabled })
        .eq('organization_id', organizationId)
        .eq('app_id', app_id)
        .eq('platform', platform)
        .select()
        .single();

      if (error) {
        console.error('[useToggleAudit] Error:', error);
        throw error;
      }

      return data as MonitoredAppWithAudit;
    },
    onSuccess: (result, variables) => {
      console.log('[useToggleAudit] Success:', result.id);

      toast.success(
        variables.enabled ? 'Audit monitoring enabled' : 'Audit monitoring disabled'
      );

      // ✅ FIXED: Invalidate with correct query key
      queryClient.invalidateQueries({
        queryKey: ['monitored-app', variables.organizationId, variables.app_id, variables.platform]
      });
      queryClient.invalidateQueries({
        queryKey: ['monitored-apps-audit', variables.organizationId]
      });
    },
    onError: (error) => {
      console.error('[useToggleAudit] Error:', error);
      toast.error('Failed to toggle audit', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
```

### Fix 2: Add MonitorAppButton to AppAuditHub

**File:** `src/components/AppAudit/AppAuditHub.tsx` (PATCH)

```typescript
// Add this import at the top if not already present
import { MonitorAppButton } from './MonitorAppButton';

// Inside the component, after the metadata import section, add:

{/* Monitor App Button - ENTERPRISE FIX */}
{importedMetadata && (
  <div className="mb-4">
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-zinc-300">Continuous Monitoring</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Track this app for ongoing ASO audit analysis
            </p>
          </div>
          <MonitorAppButton
            app_id={importedMetadata.appId}
            platform="ios"
            app_name={importedMetadata.name}
            locale={importedMetadata.locale || 'us'}
            bundle_id={importedMetadata.bundleId}
            app_icon_url={importedMetadata.iconUrl}
            developer_name={importedMetadata.developer}
            category={importedMetadata.category}
            primary_country={importedMetadata.locale || 'us'}
          />
        </div>
      </CardContent>
    </Card>
  </div>
)}
```

**Exact Location:** Insert this right before the `<Tabs>` component that starts around line 150.

---

## 8. SANITY TESTS (SQL + UI)

### SQL Sanity Tests

**File:** `scripts/sanity-tests.sql`

```sql
-- =====================================================================
-- Enterprise Sanity Tests for Monitored Apps System
-- Run these tests to validate the complete system integrity
-- =====================================================================

-- Test 1: Verify unique constraint exists
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.monitored_apps'::regclass
  AND conname = 'monitored_apps_org_app_platform_unique';
-- Expected: 1 row with UNIQUE constraint

-- Test 2: Verify all columns exist in monitored_apps
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'monitored_apps'
  AND column_name IN (
    'app_id', 'platform', 'audit_enabled', 'latest_audit_score',
    'latest_audit_at', 'locale', 'metadata_last_refreshed_at'
  )
ORDER BY column_name;
-- Expected: 7 rows

-- Test 3: Verify foreign key constraints
SELECT
  conname AS fk_name,
  conrelid::regclass AS from_table,
  confrelid::regclass AS to_table
FROM pg_constraint
WHERE contype = 'f'
  AND (
    conrelid = 'public.app_metadata_cache'::regclass
    OR conrelid = 'public.audit_snapshots'::regclass
  );
-- Expected: 2 rows (one for each table → organizations)

-- Test 4: Verify indexes exist
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('monitored_apps', 'app_metadata_cache', 'audit_snapshots')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
-- Expected: 10+ indexes

-- Test 5: Test duplicate prevention (should fail)
DO $$
DECLARE
  test_org_id UUID := 'test-org-123';
  test_app_id TEXT := 'test-app-456';
BEGIN
  -- First insert (should succeed)
  INSERT INTO public.monitored_apps (
    organization_id, app_id, platform, app_name, primary_country
  ) VALUES (
    test_org_id, test_app_id, 'ios', 'Test App', 'us'
  );

  -- Second insert (should fail due to unique constraint)
  BEGIN
    INSERT INTO public.monitored_apps (
      organization_id, app_id, platform, app_name, primary_country
    ) VALUES (
      test_org_id, test_app_id, 'ios', 'Test App Duplicate', 'us'
    );
    RAISE EXCEPTION 'Duplicate insert succeeded - CONSTRAINT BROKEN!';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'Duplicate prevention working correctly';
  END;

  -- Cleanup
  DELETE FROM public.monitored_apps
  WHERE organization_id = test_org_id
    AND app_id = test_app_id;
END $$;
-- Expected: NOTICE "Duplicate prevention working correctly"

-- Test 6: Verify RLS policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('monitored_apps', 'app_metadata_cache', 'audit_snapshots')
ORDER BY tablename, policyname;
-- Expected: 10+ policies (SELECT, INSERT, UPDATE, DELETE for each table)

-- Test 7: Verify app_store_id is gone
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'monitored_apps'
  AND column_name = 'app_store_id';
-- Expected: 0 rows (column should not exist)

-- Test 8: Test idempotent upsert
DO $$
DECLARE
  test_org_id UUID := 'test-org-789';
  test_app_id TEXT := 'test-app-101';
  first_id UUID;
  second_id UUID;
BEGIN
  -- First upsert
  INSERT INTO public.monitored_apps (
    organization_id, app_id, platform, app_name, primary_country
  ) VALUES (
    test_org_id, test_app_id, 'ios', 'Test App First', 'us'
  )
  ON CONFLICT (organization_id, app_id, platform)
  DO UPDATE SET app_name = EXCLUDED.app_name
  RETURNING id INTO first_id;

  -- Second upsert (should update, not insert)
  INSERT INTO public.monitored_apps (
    organization_id, app_id, platform, app_name, primary_country
  ) VALUES (
    test_org_id, test_app_id, 'ios', 'Test App Updated', 'us'
  )
  ON CONFLICT (organization_id, app_id, platform)
  DO UPDATE SET app_name = EXCLUDED.app_name
  RETURNING id INTO second_id;

  -- Verify same ID (update, not insert)
  IF first_id = second_id THEN
    RAISE NOTICE 'Idempotent upsert working correctly';
  ELSE
    RAISE EXCEPTION 'Upsert created new row instead of updating!';
  END IF;

  -- Cleanup
  DELETE FROM public.monitored_apps
  WHERE organization_id = test_org_id;
END $$;
-- Expected: NOTICE "Idempotent upsert working correctly"
```

### UI Sanity Tests Checklist

**Manual Testing Checklist:**

```markdown
## UI Sanity Tests for Monitored Apps System

### Test Suite 1: Monitor App from AI Hub

- [ ] 1.1: Navigate to /aso-unified (ASO AI Hub)
- [ ] 1.2: Import an app (e.g., Instagram, app_id: 389801252)
- [ ] 1.3: Verify "Monitor App" button appears after import
- [ ] 1.4: Click "Monitor App"
- [ ] 1.5: Verify button changes to "Monitored" badge with score
- [ ] 1.6: Refresh page and verify badge persists
- [ ] 1.7: Open /workspace/apps and verify app appears in list

### Test Suite 2: Duplicate Prevention

- [ ] 2.1: Import same app again in AI Hub
- [ ] 2.2: Click "Monitor App" again
- [ ] 2.3: Verify no duplicate entries in /workspace/apps
- [ ] 2.4: Verify audit score updates (not creates new record)

### Test Suite 3: Workspace Apps Page

- [ ] 3.1: Navigate to /workspace/apps
- [ ] 3.2: Verify all monitored apps display
- [ ] 3.3: Verify audit scores show correctly
- [ ] 3.4: Verify "Last checked" timestamps display
- [ ] 3.5: Click "Refresh" on one app
- [ ] 3.6: Verify new audit snapshot created (timestamp updates)
- [ ] 3.7: Click "Remove" on one app
- [ ] 3.8: Verify app removed from list
- [ ] 3.9: Go back to AI Hub and verify "Monitor App" button reappears

### Test Suite 4: Partial Failure Handling

- [ ] 4.1: Simulate metadata fetch failure (disconnect internet briefly)
- [ ] 4.2: Try to monitor a NEW app (no cache)
- [ ] 4.3: Verify critical warning appears
- [ ] 4.4: Reconnect internet
- [ ] 4.5: Try to monitor an EXISTING app (with cache)
- [ ] 4.6: Verify no warning appears (acceptable failure)
- [ ] 4.7: Verify audit score from cache is used

### Test Suite 5: Cross-Platform Support

- [ ] 5.1: Monitor an iOS app (e.g., Instagram)
- [ ] 5.2: Monitor the same app on Android (if implemented)
- [ ] 5.3: Verify both entries appear separately in /workspace/apps
- [ ] 5.4: Verify both have different audit scores

### Test Suite 6: React Query Invalidation

- [ ] 6.1: Open /aso-unified in one tab
- [ ] 6.2: Open /workspace/apps in another tab
- [ ] 6.3: Monitor an app in tab 1
- [ ] 6.4: Switch to tab 2 and verify app appears immediately (within 1 second)
- [ ] 6.5: Remove app in tab 2
- [ ] 6.6: Switch to tab 1 and verify "Monitor App" button reappears

### Test Suite 7: Performance (10K Apps Scale)

- [ ] 7.1: Create 100 monitored apps via script
- [ ] 7.2: Navigate to /workspace/apps
- [ ] 7.3: Verify page loads in < 2 seconds
- [ ] 7.4: Scroll through list (verify smooth rendering)
- [ ] 7.5: Filter/search works in < 500ms

### Test Suite 8: Edge Cases

- [ ] 8.1: Monitor app with missing subtitle
- [ ] 8.2: Verify audit score calculated correctly
- [ ] 8.3: Monitor app with empty screenshots array
- [ ] 8.4: Verify no crashes, graceful handling
- [ ] 8.5: Monitor app with very long name (> 100 chars)
- [ ] 8.6: Verify truncation/display correct
```

---

## 9. ROLLBACK PLAN

### Immediate Rollback (< 5 minutes)

**If critical issues are detected after deployment:**

```bash
# Step 1: Revert edge function to previous version
git log supabase/functions/save-monitored-app/index.ts
git checkout <previous-commit-hash> supabase/functions/save-monitored-app/index.ts
supabase functions deploy save-monitored-app

# Step 2: Revert frontend hooks
git checkout <previous-commit-hash> src/hooks/useMonitoredAppForAudit.ts
npm run build

# Step 3: Monitor for errors
# Check Supabase logs for edge function errors
# Check Sentry for frontend errors
```

### Database Rollback (Use with extreme caution)

**WARNING:** Only rollback database if data corruption is detected.

```sql
-- Rollback Migration 20260122000006 (RLS policies)
-- Re-add UPDATE policies if needed

-- Rollback Migration 20260122000005 (schema reconciliation)
-- WARNING: This will drop the unique constraint
-- Only do this if duplicate prevention is causing issues

ALTER TABLE public.monitored_apps
  DROP CONSTRAINT IF EXISTS monitored_apps_org_app_platform_unique;

-- Re-add old constraint if it existed
ALTER TABLE public.monitored_apps
  ADD CONSTRAINT monitored_apps_organization_id_app_store_id_primary_country_key
    UNIQUE(organization_id, app_store_id, primary_country);
```

**Critical Note:** Database rollback should be AVOIDED unless absolutely necessary. The migrations are designed to be idempotent and safe.

---

## 10. FINAL READINESS CHECKLIST

### Pre-Deployment Checklist

**Database:**
- [ ] All migrations tested in staging environment
- [ ] Unique constraint verified working
- [ ] Foreign keys with CASCADE verified
- [ ] Indexes created and analyzed
- [ ] RLS policies tested with different user roles
- [ ] No duplicate monitored apps exist in production

**Backend:**
- [ ] Edge function tested with sample requests
- [ ] Partial failure handling verified
- [ ] CORS headers tested from all origins
- [ ] Idempotent upsert tested
- [ ] Metadata fetch timeout handling tested
- [ ] Error logging comprehensive and actionable

**Frontend:**
- [ ] React Query invalidation tested
- [ ] MonitorAppButton visible in AI Hub
- [ ] Toast notifications tested (success + errors)
- [ ] Loading states UX verified
- [ ] TypeScript compilation 0 errors
- [ ] Stale monitoring state bug fixed

**Testing:**
- [ ] All SQL sanity tests pass
- [ ] All UI sanity tests pass
- [ ] Performance test with 100 apps completed
- [ ] Cross-browser testing done (Chrome, Safari, Firefox)
- [ ] Mobile responsive testing done

**Documentation:**
- [ ] Migration files have comprehensive comments
- [ ] Edge function has enterprise-grade documentation
- [ ] TypeScript types have JSDoc comments
- [ ] README updated with new monitoring flow
- [ ] Changelog updated with breaking changes

### Post-Deployment Checklist

**Immediate (0-1 hour):**
- [ ] Monitor Supabase edge function logs for errors
- [ ] Monitor frontend Sentry for runtime errors
- [ ] Verify 0 duplicate monitored apps created
- [ ] Verify React Query cache invalidation working
- [ ] Check database query performance (< 100ms avg)

**Short-term (1-24 hours):**
- [ ] Monitor cache hit/miss rates
- [ ] Verify metadata refresh TTL working (24h)
- [ ] Check audit snapshot generation success rate (> 95%)
- [ ] Verify no orphaned cache/snapshot records
- [ ] Check RLS policy enforcement (no unauthorized access)

**Long-term (1-7 days):**
- [ ] Analyze user adoption of monitoring feature
- [ ] Review edge function timeout rates (< 1%)
- [ ] Check database storage growth rate
- [ ] Verify monitoring state stays consistent across sessions
- [ ] Collect user feedback on monitoring UX

### Success Metrics

**Technical Metrics:**
- Edge function success rate: > 99%
- Database query p95 latency: < 200ms
- React Query cache hit rate: > 80%
- Zero duplicate monitored apps created
- Zero stale monitoring state bugs reported

**Business Metrics:**
- Monitoring adoption rate: > 50% of AI Hub users
- Workspace Apps page engagement: > 2 visits/week per user
- Average monitored apps per org: 5-20
- Audit snapshot generation rate: > 100/day

---

## APPENDIX: Migration Execution Plan

### Development Environment

```bash
# 1. Pull latest from main
git pull origin main

# 2. Apply migrations locally
supabase db reset

# 3. Verify schema
psql -h localhost -p 54322 -U postgres -d postgres -f scripts/sanity-tests.sql

# 4. Deploy edge function locally
supabase functions serve save-monitored-app

# 5. Test UI locally
npm run dev
# Run through UI sanity tests checklist
```

### Staging Environment

```bash
# 1. Apply migrations to staging
supabase db push --linked --project-ref <staging-ref>

# 2. Deploy edge function to staging
supabase functions deploy save-monitored-app --project-ref <staging-ref>

# 3. Deploy frontend to staging
npm run build
# Deploy via CI/CD

# 4. Run automated E2E tests
npm run test:e2e:staging

# 5. Manual QA testing (full checklist)
```

### Production Environment

```bash
# 1. Create database backup
supabase db dump --linked > backup-$(date +%Y%m%d-%H%M%S).sql

# 2. Apply migrations (READ-ONLY mode recommended)
supabase db push --linked

# 3. Verify migrations applied
supabase migration list --linked

# 4. Deploy edge function
supabase functions deploy save-monitored-app

# 5. Deploy frontend (gradual rollout recommended)
# Use feature flag to enable for 10% → 50% → 100% of users

# 6. Monitor metrics dashboard for 1 hour
# Watch for spike in errors, latency, or complaints
```

---

**End of Enterprise Monitored Apps System Documentation**

**Total Files Modified:** 7
**Total Migrations:** 2
**Total Lines of Code:** ~2,500
**Estimated Implementation Time:** 8-12 hours
**Risk Level:** Low (idempotent migrations, backward compatible)
**ROI:** High (fixes critical UX bugs, enables scaling to 10K apps)
