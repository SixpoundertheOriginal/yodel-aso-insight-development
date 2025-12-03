# Dashboard V2 Optimization - Safe Rollback Plan

**Date Created:** December 3, 2025
**Status:** PRE-IMPLEMENTATION SAFETY PLAN
**Purpose:** Ensure we can safely revert any changes if issues arise

---

## Table of Contents

1. [Pre-Implementation Checklist](#1-pre-implementation-checklist)
2. [Baseline Documentation](#2-baseline-documentation)
3. [Git Backup Strategy](#3-git-backup-strategy)
4. [Edge Function Versioning](#4-edge-function-versioning)
5. [Rollback Procedures](#5-rollback-procedures)
6. [Testing & Validation](#6-testing--validation)
7. [Monitoring & Alerts](#7-monitoring--alerts)
8. [Emergency Procedures](#8-emergency-procedures)

---

## 1. Pre-Implementation Checklist

### ✅ Before Making ANY Changes

- [ ] **Document current performance baseline** (see Section 2)
- [ ] **Create git backup tag** (`git tag dashboard-v2-baseline-2025-12-03`)
- [ ] **Deploy current Edge Function version** to staging
- [ ] **Test current functionality** (record baseline metrics)
- [ ] **Backup BigQuery queries** (save current SQL in separate file)
- [ ] **Screenshot current dashboard** (visual baseline)
- [ ] **Export current React Query cache settings** (document in code comments)
- [ ] **Verify rollback procedures work** (test git revert on feature branch)

### ✅ Communication Checklist

- [ ] **Notify team** of planned changes
- [ ] **Schedule deployment window** (low-traffic time)
- [ ] **Prepare rollback message** (pre-write announcement)
- [ ] **Assign rollback decision maker** (who can call rollback)

---

## 2. Baseline Documentation

### Current Performance Metrics (RECORD BEFORE CHANGES)

**Test Environment:**
- Browser: _____________
- Network: _____________
- Date: December 3, 2025
- Time: _____________

**Performance Baseline:**

| Metric | Current Value | Target Value | Measurement Method |
|--------|--------------|--------------|-------------------|
| Initial Load Time (cold) | _____ ms | < 1600ms | Chrome DevTools Performance tab |
| Initial Load Time (warm cache) | _____ ms | < 800ms | After React Query cache |
| Filter Change Time | _____ ms | < 100ms | App filter toggle |
| Date Range Change Time | _____ ms | < 1500ms | 7 days → 30 days |
| Period Comparison Load | _____ ms | < 1000ms | Enable comparison toggle |
| Payload Size (main query) | _____ KB | < 300KB | Network tab |
| BigQuery Query Time | _____ ms | < 800ms | Edge Function logs |
| Client Aggregation Time | _____ ms | < 100ms | Console.time() |

**Record Baseline Script:**

```bash
# Run this in browser console on Dashboard V2 page
console.time('Initial Load');
// Refresh page
console.timeEnd('Initial Load');

console.time('Filter Change');
// Click app filter
console.timeEnd('Filter Change');

console.time('Date Range Change');
// Change date range
console.timeEnd('Date Range Change');

// Check payload size in Network tab
// Filter by 'bigquery-aso-data'
// Record 'Size' column value
```

### Current File Checksums (RECORD BEFORE CHANGES)

```bash
# Run this in terminal to record file state
md5sum supabase/functions/bigquery-aso-data/index.ts
md5sum src/hooks/useEnterpriseAnalytics.ts
md5sum src/hooks/usePeriodComparison.ts
md5sum src/pages/ReportingDashboardV2.tsx

# Output:
# abc123... supabase/functions/bigquery-aso-data/index.ts
# def456... src/hooks/useEnterpriseAnalytics.ts
# ghi789... src/hooks/usePeriodComparison.ts
# jkl012... src/pages/ReportingDashboardV2.tsx
```

**Record Output Here:**
```
_____________________________________________
_____________________________________________
_____________________________________________
_____________________________________________
```

### Current BigQuery Query (BACKUP)

**File:** `supabase/functions/bigquery-aso-data/index.ts` (lines 582-595)

**Current Query (SAVE THIS):**
```sql
-- BASELINE QUERY (DO NOT MODIFY - ROLLBACK REFERENCE)
SELECT
  date,
  COALESCE(app_id, client) AS app_id,
  traffic_source,
  impressions,
  product_page_views,
  downloads,
  SAFE_DIVIDE(downloads, NULLIF(product_page_views, 0)) as conversion_rate
FROM `${projectId}.client_reports.aso_all_apple`
WHERE COALESCE(app_id, client) IN UNNEST(@app_ids)
  AND date BETWEEN @start_date AND @end_date
ORDER BY date DESC
```

---

## 3. Git Backup Strategy

### Step 1: Create Baseline Tag

```bash
# Tag current stable state
git add .
git commit -m "chore: baseline before Dashboard V2 optimization"
git tag -a dashboard-v2-baseline-2025-12-03 -m "Baseline before performance optimization"
git push origin dashboard-v2-baseline-2025-12-03

# Verify tag exists
git tag -l "dashboard-v2-*"
```

### Step 2: Create Feature Branch

```bash
# Create feature branch for optimization work
git checkout -b feature/dashboard-v2-optimization
git push -u origin feature/dashboard-v2-optimization

# Verify branch
git branch -a
```

### Step 3: Commit Strategy (Incremental Rollback Points)

**Make SMALL commits for each change:**

```bash
# Commit 1: Add summary aggregation to BigQuery query
git add supabase/functions/bigquery-aso-data/index.ts
git commit -m "feat(bigquery): add pre-aggregated summary CTE"

# Commit 2: Update Edge Function response structure
git commit -m "feat(bigquery): return summary + rawData in response"

# Commit 3: Update client to use pre-aggregated summary
git add src/hooks/useEnterpriseAnalytics.ts
git commit -m "feat(client): use pre-aggregated summary from Edge Function"

# Commit 4: Add skeleton loading UI
git add src/pages/ReportingDashboardV2.tsx
git commit -m "feat(ui): add skeleton loading placeholders"

# Each commit is a rollback point!
```

### Step 4: Push Frequently

```bash
# Push after each commit (backup to remote)
git push origin feature/dashboard-v2-optimization
```

---

## 4. Edge Function Versioning

### Strategy: Side-by-Side Deployment

**Option A: Version Suffix (Recommended)**

Deploy new Edge Function with version suffix, test, then swap:

```bash
# Current Edge Function
supabase/functions/bigquery-aso-data/index.ts

# New Optimized Edge Function (parallel deployment)
supabase/functions/bigquery-aso-data-v2/index.ts

# Deploy BOTH
supabase functions deploy bigquery-aso-data    # Keep current (rollback target)
supabase functions deploy bigquery-aso-data-v2 # New optimized version

# Client calls new version for testing
supabase.functions.invoke('bigquery-aso-data-v2', {...})

# If successful, swap names later
# If failure, delete bigquery-aso-data-v2
```

**Option B: Feature Flag (Best for Gradual Rollout)**

Keep same Edge Function, add feature flag:

```typescript
// supabase/functions/bigquery-aso-data/index.ts

// Add at top of handler
const USE_OPTIMIZED_QUERY = Deno.env.get('ENABLE_OPTIMIZED_AGGREGATION') === 'true';

if (USE_OPTIMIZED_QUERY) {
  // New optimized query with summary aggregation
  const query = `WITH summary AS (...) SELECT ...`;
} else {
  // Original query (ROLLBACK TARGET)
  const query = `SELECT date, app_id, ... FROM aso_all_apple`;
}
```

**Rollback:** Set environment variable `ENABLE_OPTIMIZED_AGGREGATION=false`

---

## 5. Rollback Procedures

### 🔴 EMERGENCY ROLLBACK (Critical Issues - DO THIS FIRST)

**When to use:**
- Dashboard completely broken (white screen, crash)
- 500 errors on Edge Function
- Data integrity issues (wrong numbers)

**Immediate Action (< 5 minutes):**

```bash
# 1. Revert to baseline tag
git checkout dashboard-v2-baseline-2025-12-03

# 2. Redeploy Edge Function
cd supabase/functions
supabase functions deploy bigquery-aso-data

# 3. Redeploy frontend
npm run build
# Deploy build to hosting (Vercel/Netlify/etc.)

# 4. Verify dashboard works
# Open https://yourdomain.com/dashboard-v2
# Test: Load dashboard, change filters, check data

# 5. Notify team
# Post in Slack: "Dashboard V2 rolled back to baseline due to [issue]. Investigating."
```

**Verification Checklist:**
- [ ] Dashboard loads without errors
- [ ] Data matches baseline (spot check 3-5 metrics)
- [ ] Filters work (app filter, traffic source filter)
- [ ] Date range changes work
- [ ] Period comparison works (if enabled)
- [ ] No console errors

---

### 🟡 PARTIAL ROLLBACK (Specific Feature Issues)

**When to use:**
- One feature broken, others work fine
- Performance worse than baseline
- Minor data discrepancies

**Option A: Revert Specific Commits**

```bash
# Find the commit that introduced the issue
git log --oneline

# Revert specific commit (keeps history)
git revert <commit-hash>

# Example: Revert summary aggregation commit
git revert abc123

# Push revert commit
git push origin feature/dashboard-v2-optimization
```

**Option B: Revert Specific Files**

```bash
# Revert single file to baseline
git checkout dashboard-v2-baseline-2025-12-03 -- supabase/functions/bigquery-aso-data/index.ts

# Commit the revert
git commit -m "revert: rollback BigQuery aggregation changes"

# Redeploy Edge Function
supabase functions deploy bigquery-aso-data
```

**Option C: Disable Feature Flag**

```bash
# If using feature flag approach
supabase secrets set ENABLE_OPTIMIZED_AGGREGATION=false

# Restart Edge Function (automatic on Supabase)
# Verify feature is disabled
```

---

### 🟢 INCREMENTAL ROLLBACK (Gradual Revert)

**When to use:**
- Issues found in testing/staging
- Want to keep some optimizations, revert others

**Strategy: Cherry-pick Good Changes**

```bash
# Create new branch from baseline
git checkout dashboard-v2-baseline-2025-12-03
git checkout -b feature/dashboard-v2-optimization-v2

# Cherry-pick commits that worked well
git cherry-pick abc123  # Skeleton UI (worked great)
git cherry-pick def456  # Remove console logs (no issues)
# Skip commits that caused issues

# Push new branch
git push -u origin feature/dashboard-v2-optimization-v2
```

---

## 6. Testing & Validation

### Pre-Deployment Testing Checklist

**Test in Staging Environment First:**

- [ ] **Smoke Test** (5 minutes)
  - [ ] Dashboard loads
  - [ ] KPI cards display numbers
  - [ ] Chart renders
  - [ ] No console errors

- [ ] **Functional Tests** (15 minutes)
  - [ ] Change date range (7 days → 30 days → custom)
  - [ ] Apply app filter (select 1 app, select multiple apps)
  - [ ] Apply traffic source filter (Search only, Browse only, All)
  - [ ] Enable period comparison
  - [ ] Verify delta percentages make sense
  - [ ] Export data (if feature exists)

- [ ] **Performance Tests** (10 minutes)
  - [ ] Measure initial load time (use Performance tab)
  - [ ] Measure filter change time
  - [ ] Measure date range change time
  - [ ] Check payload size (Network tab)
  - [ ] Compare to baseline (should be faster)

- [ ] **Data Integrity Tests** (20 minutes)
  - [ ] Record 5 key metrics (impressions, downloads, CVR, etc.)
  - [ ] Deploy new version
  - [ ] Re-record same 5 metrics
  - [ ] Compare: Should match within 1% (rounding differences OK)
  - [ ] If >5% difference: INVESTIGATE BEFORE PRODUCTION

- [ ] **Edge Cases** (10 minutes)
  - [ ] Single app selected
  - [ ] All apps selected
  - [ ] No apps selected (if allowed)
  - [ ] Very short date range (1 day)
  - [ ] Very long date range (365 days)
  - [ ] Date range with no data
  - [ ] Old date range (2+ years ago)

- [ ] **Browser Compatibility** (10 minutes)
  - [ ] Chrome (primary)
  - [ ] Firefox
  - [ ] Safari
  - [ ] Edge

- [ ] **Mobile Testing** (5 minutes)
  - [ ] iOS Safari
  - [ ] Android Chrome

### Data Integrity Validation Script

**Run this in browser console BEFORE and AFTER deployment:**

```javascript
// Record baseline metrics
const baseline = {
  date: new Date().toISOString(),
  dateRange: { start: '2024-11-01', end: '2024-11-30' },
  metrics: {
    impressions: document.querySelector('[data-metric="impressions"]')?.textContent,
    downloads: document.querySelector('[data-metric="downloads"]')?.textContent,
    cvr: document.querySelector('[data-metric="cvr"]')?.textContent,
    // Add more selectors based on your dashboard
  }
};

console.log('BASELINE:', JSON.stringify(baseline, null, 2));

// Save to clipboard
copy(JSON.stringify(baseline, null, 2));

// After deployment, run same script and compare values
```

---

## 7. Monitoring & Alerts

### Key Metrics to Monitor

**Add monitoring for:**

1. **Edge Function Errors**
   ```bash
   # Monitor Supabase Edge Function logs
   supabase functions logs bigquery-aso-data

   # Look for:
   # - 500 errors
   # - Timeout errors
   # - BigQuery authentication failures
   ```

2. **Client-Side Errors**
   ```typescript
   // Add error boundary to Dashboard V2
   <ErrorBoundary
     onError={(error, errorInfo) => {
       console.error('Dashboard V2 Error:', error, errorInfo);
       // Send to error tracking (Sentry, LogRocket, etc.)
     }}
   >
     <ReportingDashboardV2 />
   </ErrorBoundary>
   ```

3. **Performance Degradation**
   ```typescript
   // Add performance tracking
   const startTime = performance.now();

   // After data loads
   const loadTime = performance.now() - startTime;
   console.log('[PERF] Dashboard load time:', loadTime, 'ms');

   // Alert if > 3 seconds (worse than baseline)
   if (loadTime > 3000) {
     console.warn('[PERF] Load time exceeded threshold!');
   }
   ```

4. **Data Discrepancies**
   ```typescript
   // Add data validation
   if (Math.abs(newMetrics.impressions - cachedMetrics.impressions) > 0.05) {
     console.warn('[DATA] Impressions differ by >5%:', {
       old: cachedMetrics.impressions,
       new: newMetrics.impressions
     });
   }
   ```

### Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Error Rate | > 1% | > 5% | Rollback |
| Load Time | > 2.5s | > 4s | Investigate |
| Edge Function Timeout | > 5% | > 20% | Rollback |
| Data Difference | > 5% | > 10% | Rollback |
| User Reports | 3+ complaints | 10+ complaints | Rollback |

---

## 8. Emergency Procedures

### Emergency Contacts

**Rollback Decision Maker:** _______________ (Name, Phone)
**Technical Lead:** _______________ (Name, Phone)
**Database Admin:** _______________ (Name, Phone)
**On-Call Engineer:** _______________ (Name, Phone)

### Decision Tree

```
Issue Detected
    ↓
Is it critical? (Dashboard broken, data wrong, 500 errors)
    ↓ YES → EMERGENCY ROLLBACK (Section 5, 🔴)
    ↓ NO
    ↓
Is it affecting users? (Performance slow, minor errors)
    ↓ YES → PARTIAL ROLLBACK (Section 5, 🟡)
    ↓ NO
    ↓
Is it found in testing? (Staging only, no user impact)
    ↓ YES → INCREMENTAL ROLLBACK (Section 5, 🟢)
```

### Communication Templates

**Emergency Rollback Announcement:**
```
🔴 ROLLBACK NOTICE

Dashboard V2 has been rolled back to baseline version due to [issue].

Impact: [describe what users experienced]
Resolution: Reverted to stable version
Current Status: Dashboard is operational
Next Steps: Investigating root cause

ETA for fix: [timeframe]
Contact: [your name/email]
```

**Partial Rollback Announcement:**
```
🟡 FEATURE DISABLED

Dashboard V2 optimization feature temporarily disabled due to [issue].

Impact: Dashboard may load slightly slower than expected
Resolution: Disabled [specific feature], dashboard fully functional
Current Status: All features working, performance slightly reduced

Next Steps: Re-testing optimization in staging
Contact: [your name/email]
```

### Post-Incident Checklist

After any rollback:

- [ ] Document what went wrong (root cause analysis)
- [ ] Document what worked (keep these changes)
- [ ] Update rollback plan with lessons learned
- [ ] Test fix in staging before re-deploying
- [ ] Schedule post-mortem meeting
- [ ] Update team on resolution and next steps

---

## 9. Deployment Checklist

### Pre-Deployment (DO THIS FIRST)

- [ ] Complete Section 1: Pre-Implementation Checklist
- [ ] Complete Section 2: Baseline Documentation
- [ ] Complete Section 3: Git Backup Strategy
- [ ] Test rollback procedure on feature branch (verify it works!)
- [ ] Deploy to staging environment first
- [ ] Run all tests in Section 6
- [ ] Get approval from stakeholder

### Deployment Day

- [ ] Deploy during low-traffic hours (e.g., 2 AM)
- [ ] Have rollback decision maker available
- [ ] Monitor logs for 30 minutes post-deployment
- [ ] Run smoke tests immediately after deployment
- [ ] Monitor for 24 hours for issues

### Post-Deployment (VERIFICATION)

- [ ] Compare performance metrics to baseline (should be better)
- [ ] Compare data integrity (spot check 5-10 metrics)
- [ ] Monitor error rates (should be 0%)
- [ ] Collect user feedback (any complaints?)
- [ ] Document actual performance improvement

---

## 10. File Backup Manifest

### Critical Files (BACKUP BEFORE CHANGING)

Create backup copies with `.baseline` suffix:

```bash
# Create backups
cp supabase/functions/bigquery-aso-data/index.ts supabase/functions/bigquery-aso-data/index.ts.baseline
cp src/hooks/useEnterpriseAnalytics.ts src/hooks/useEnterpriseAnalytics.ts.baseline
cp src/hooks/usePeriodComparison.ts src/hooks/usePeriodComparison.ts.baseline
cp src/pages/ReportingDashboardV2.tsx src/pages/ReportingDashboardV2.tsx.baseline

# Verify backups exist
ls -la supabase/functions/bigquery-aso-data/*.baseline
ls -la src/hooks/*.baseline
ls -la src/pages/*.baseline

# To restore from backup (if needed)
cp supabase/functions/bigquery-aso-data/index.ts.baseline supabase/functions/bigquery-aso-data/index.ts
```

### Backup Archive (FULL SNAPSHOT)

```bash
# Create full backup archive
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf ~/backups/dashboard-v2-baseline-$DATE.tar.gz \
  supabase/functions/bigquery-aso-data/ \
  src/hooks/useEnterpriseAnalytics.ts \
  src/hooks/usePeriodComparison.ts \
  src/pages/ReportingDashboardV2.tsx

# Verify archive
tar -tzf ~/backups/dashboard-v2-baseline-$DATE.tar.gz

# To restore (if needed)
cd /Users/igorblinov/yodel-aso-insight
tar -xzf ~/backups/dashboard-v2-baseline-$DATE.tar.gz
```

---

## 11. Success Criteria

### How to Know if Optimization is Successful

**After 24 hours of production deployment:**

- [ ] **Zero critical errors** (no 500s, no crashes, no white screens)
- [ ] **Performance improved** (initial load time reduced by ≥30%)
- [ ] **Data integrity maintained** (all metrics match within 1%)
- [ ] **No user complaints** (zero negative feedback about dashboard)
- [ ] **Edge Function stable** (< 1% error rate)
- [ ] **Client performance improved** (< 100ms filter changes)

**If all criteria met:** Mark optimization as successful, remove rollback plan from active status

**If any criteria failed:** Execute appropriate rollback (Emergency/Partial/Incremental)

---

## 12. Quick Reference Card

**Print this and keep nearby during deployment:**

```
═══════════════════════════════════════════════════════════
          DASHBOARD V2 ROLLBACK QUICK REFERENCE
═══════════════════════════════════════════════════════════

🔴 EMERGENCY ROLLBACK (Dashboard Broken):
   1. git checkout dashboard-v2-baseline-2025-12-03
   2. supabase functions deploy bigquery-aso-data
   3. npm run build && [deploy frontend]
   4. Verify dashboard works
   5. Notify team

🟡 PARTIAL ROLLBACK (One Feature Broken):
   1. git revert <commit-hash>
   2. supabase functions deploy bigquery-aso-data
   3. Test specific feature
   4. Notify team

📊 CHECK METRICS:
   - Edge Function logs: supabase functions logs bigquery-aso-data
   - Performance: Chrome DevTools → Performance tab
   - Errors: Browser console + Supabase logs
   - Data: Compare 5 key metrics to baseline

📞 EMERGENCY CONTACTS:
   - Rollback Decision Maker: _______________
   - Technical Lead: _______________
   - On-Call Engineer: _______________

✅ BASELINE TAG: dashboard-v2-baseline-2025-12-03

═══════════════════════════════════════════════════════════
```

---

**END OF ROLLBACK PLAN**

*This plan ensures safe, reversible deployment of Dashboard V2 optimizations.*

---

## Next Steps

1. ✅ **Complete Pre-Implementation Checklist** (Section 1)
2. ✅ **Record Baseline Metrics** (Section 2)
3. ✅ **Create Git Backups** (Section 3)
4. ✅ **Test Rollback Procedure** (practice on feature branch)
5. ➡️ **Proceed with Phase 1 Implementation** (only after above complete)

