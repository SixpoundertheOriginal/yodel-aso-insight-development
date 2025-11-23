---
Status: IMPLEMENTATION GUIDE
Phase: 19 (Edge Function Updates)
Date: 2025-01-23
Purpose: Update edge functions to use Bible-driven audits
---

# PHASE 19 — EDGE FUNCTION UPDATE GUIDE

**Status:** Implementation Guide
**Date:** January 23, 2025
**Target:** Update edge functions to use `aso_audit_snapshots` (Bible-driven)

---

## Overview

Both `save-monitored-app` and `rebuild-monitored-app` currently:
- ❌ Generate OLD Phase 2 placeholder audits
- ❌ Store in deprecated `audit_snapshots` table
- ❌ Do NOT use `metadata-audit-v2` edge function

We need to update them to:
- ✅ Call `metadata-audit-v2` for Bible-driven audits
- ✅ Store in new `aso_audit_snapshots` table
- ✅ Extract KPI results + Bible metadata
- ✅ Maintain backwards compatibility

---

## Update 1: `save-monitored-app` Edge Function

**File:** `supabase/functions/save-monitored-app/index.ts`

### Key Changes Required

#### 1. Replace `generateAuditSnapshot()` function

**Current (Lines 165-207):**
```typescript
async function generateAuditSnapshot(
  title: string | null,
  subtitle: string | null
): Promise<any> {
  // Simple placeholder scoring
  const audit_score = Math.min(100, ...);

  return {
    combinations: [],
    metrics: { longTailStrength: 0, ... },
    insights: { missingClusters: [], ... },
    audit_score
  };
}
```

**Replace with:**
```typescript
/**
 * Calls metadata-audit-v2 to get Bible-driven audit
 */
async function callMetadataAuditV2(
  appId: string,
  platform: 'ios' | 'android',
  locale: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<any | null> {
  console.log('[save-monitored-app] Calling metadata-audit-v2:', appId, platform, locale);

  const auditUrl = `${supabaseUrl}/functions/v1/metadata-audit-v2`;

  try {
    const response = await fetch(auditUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        app_id: appId,
        platform,
        locale
      })
    });

    if (!response.ok) {
      console.error('[save-monitored-app] Audit V2 call failed:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.success) {
      console.error('[save-monitored-app] Audit V2 returned error:', data.error);
      return null;
    }

    console.log('[save-monitored-app] ✓ Audit V2 complete');
    return data;
  } catch (error) {
    console.error('[save-monitored-app] Audit V2 call exception:', error);
    return null;
  }
}

/**
 * Extracts KPI result from audit response
 */
function extractKpiResult(auditResult: any): any | null {
  // Check if KPI Engine was run (Phase 18)
  if (auditResult.kpiResult || auditResult.kpi_result) {
    return auditResult.kpiResult || auditResult.kpi_result;
  }
  return null;
}

/**
 * Extracts family scores from KPI result
 */
function extractFamilyScores(kpiResult: any): Record<string, number> | null {
  if (!kpiResult || !kpiResult.families) return null;

  const scores: Record<string, number> = {};
  for (const [familyId, familyData] of Object.entries(kpiResult.families)) {
    scores[familyId] = (familyData as any).score || 0;
  }

  return scores;
}

/**
 * Computes audit hash for change detection
 */
async function computeAuditHash(auditResult: any): Promise<string> {
  const auditStr = JSON.stringify(auditResult);
  const encoder = new TextEncoder();
  const data = encoder.encode(auditStr);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
```

#### 2. Update audit snapshot creation (Lines ~500-565)

**Current:**
```typescript
// STEP 5: Generate or use pre-computed audit snapshot
try {
  let auditData: any;

  if (requestBody.auditSnapshot) {
    // Use UI-provided audit
    auditData = {
      combinations: requestBody.auditSnapshot.combinations || [],
      metrics: requestBody.auditSnapshot.metrics || {},
      insights: requestBody.auditSnapshot.insights || {},
      audit_score: requestBody.auditSnapshot.audit_score
    };
  } else {
    // Generate placeholder
    auditData = await generateAuditSnapshot(title, subtitle);
  }

  const snapshotPayload = {
    organization_id,
    app_id,
    platform,
    locale,
    title,
    subtitle,
    combinations: auditData.combinations,
    metrics: auditData.metrics,
    insights: auditData.insights,
    audit_score: auditData.audit_score,
    metadata_version_hash: version_hash,
    metadata_source: 'live',
    competitor_overlap: {},
    metadata_health: {},
    metadata_version: 'v1'
  };

  const { data: snapshotData, error: snapshotError } = await supabase
    .from('audit_snapshots') // OLD TABLE
    .insert(snapshotPayload)
    .select()
    .single();
```

**Replace with:**
```typescript
// STEP 5: Generate Bible-driven audit snapshot (Phase 19)
try {
  // Call metadata-audit-v2 for Bible-driven audit
  const auditV2Response = await callMetadataAuditV2(
    app_id,
    platform,
    locale,
    supabaseUrl,
    supabaseKey
  );

  if (!auditV2Response || !auditV2Response.success) {
    console.warn('[save-monitored-app] Audit V2 failed, skipping snapshot');
    failureReason = 'Bible-driven audit failed';
    acceptableFailure = true;
  } else {
    const auditResult = auditV2Response.data;
    const kpiResult = extractKpiResult(auditResult);
    const familyScores = kpiResult ? extractFamilyScores(kpiResult) : null;
    const auditHash = await computeAuditHash(auditResult);

    const snapshotPayload = {
      monitored_app_id: monitoredApp.id,
      organization_id,
      app_id,
      platform,
      locale,
      title,
      subtitle,
      description,
      audit_result: auditResult, // Full UnifiedMetadataAuditResult
      overall_score: auditResult.overallScore,
      kpi_result: kpiResult,
      kpi_overall_score: kpiResult?.overallScore || null,
      kpi_family_scores: familyScores,
      bible_metadata: {
        version: 'v2',
        source: 'metadata-audit-v2',
        timestamp: new Date().toISOString()
      },
      audit_version: 'v2',
      kpi_version: kpiResult ? 'v1' : null,
      metadata_version_hash: version_hash,
      audit_hash: auditHash,
      source: 'cache'
    };

    const { data: snapshotData, error: snapshotError } = await supabase
      .from('aso_audit_snapshots') // NEW TABLE
      .insert(snapshotPayload)
      .select()
      .single();

    if (snapshotError) {
      console.error('[save-monitored-app] Failed to create Bible audit snapshot:', snapshotError);
      failureReason = 'Failed to create audit snapshot';
      acceptableFailure = true;
    } else {
      auditSnapshot = snapshotData;
      auditCreated = true;
      console.log('[save-monitored-app] ✓ Bible audit snapshot created:', snapshotData.id);

      // Update monitored_apps with audit results
      await supabase
        .from('monitored_apps')
        .update({
          latest_audit_score: auditResult.overallScore,
          latest_audit_at: new Date().toISOString(),
          metadata_last_refreshed_at: new Date().toISOString(),
          validated_state: 'valid',
          validated_at: new Date().toISOString(),
          validation_error: null
        })
        .eq('id', monitoredApp.id);
    }
  }
```

#### 3. Update second audit creation block (Lines ~576-639)

**Similar update needed for the case where we use existing cache.**

Replace the audit generation section with the same Bible-driven approach using `callMetadataAuditV2()`.

---

## Update 2: `rebuild-monitored-app` Edge Function

**File:** `supabase/functions/rebuild-monitored-app/index.ts`

### Key Changes Required

#### 1. Add helper functions

Add the same helper functions from `save-monitored-app`:
- `callMetadataAuditV2()`
- `extractKpiResult()`
- `extractFamilyScores()`
- `computeAuditHash()`

#### 2. Replace `generateSimpleAudit()` function (Lines 113-149)

**Remove this function entirely** — we'll use `callMetadataAuditV2()` instead.

#### 3. Update audit snapshot creation (Lines 340-372)

**Current:**
```typescript
// STEP 4: Generate and insert audit snapshot
const auditData = generateSimpleAudit(title, subtitle);

const snapshotPayload = {
  organization_id,
  app_id,
  platform,
  locale: locale || 'us',
  title,
  subtitle,
  combinations: auditData.combinations,
  metrics: auditData.metrics,
  insights: auditData.insights,
  audit_score: auditData.audit_score,
  metadata_version_hash: version_hash,
  metadata_source: 'rebuild',
  competitor_overlap: {},
  metadata_health: {},
  metadata_version: 'v1-rebuild'
};

const { error: snapshotError } = await supabase
  .from('audit_snapshots') // OLD TABLE
  .insert(snapshotPayload);
```

**Replace with:**
```typescript
// STEP 4: Generate Bible-driven audit snapshot (Phase 19)
const auditV2Response = await callMetadataAuditV2(
  app_id,
  platform,
  locale || 'us',
  supabaseUrl,
  supabaseKey
);

let auditScore = 0;
let snapshotCreated = false;

if (!auditV2Response || !auditV2Response.success) {
  console.error('[rebuild-monitored-app] Audit V2 failed');

  // Mark as invalid and return error
  await supabase
    .from('monitored_apps')
    .update({
      validated_state: 'invalid',
      validated_at: new Date().toISOString(),
      validation_error: 'Bible-driven audit generation failed'
    })
    .eq('id', monitored_app_id);

  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'AUDIT_GENERATION_FAILED',
        message: 'Failed to generate Bible-driven audit',
        details: auditV2Response?.error
      }
    }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Extract audit data
const auditResult = auditV2Response.data;
const kpiResult = extractKpiResult(auditResult);
const familyScores = kpiResult ? extractFamilyScores(kpiResult) : null;
const auditHash = await computeAuditHash(auditResult);
auditScore = auditResult.overallScore;

const snapshotPayload = {
  monitored_app_id,
  organization_id,
  app_id,
  platform,
  locale: locale || 'us',
  title,
  subtitle,
  description,
  audit_result: auditResult, // Full UnifiedMetadataAuditResult
  overall_score: auditResult.overallScore,
  kpi_result: kpiResult,
  kpi_overall_score: kpiResult?.overallScore || null,
  kpi_family_scores: familyScores,
  bible_metadata: {
    version: 'v2',
    source: 'rebuild',
    timestamp: new Date().toISOString()
  },
  audit_version: 'v2',
  kpi_version: kpiResult ? 'v1' : null,
  metadata_version_hash: version_hash,
  audit_hash: auditHash,
  source: 'cache'
};

const { error: snapshotError } = await supabase
  .from('aso_audit_snapshots') // NEW TABLE
  .insert(snapshotPayload);

if (snapshotError) {
  console.error('[rebuild-monitored-app] Snapshot insert failed:', snapshotError);
  throw new Error(`Snapshot insert failed: ${snapshotError.message}`);
}

snapshotCreated = true;
console.log('[rebuild-monitored-app] ✓ Bible audit snapshot created');
```

#### 4. Update monitored_apps update (Lines 377-387)

**Current:**
```typescript
await supabase
  .from('monitored_apps')
  .update({
    validated_state: 'valid',
    validated_at: new Date().toISOString(),
    validation_error: null,
    latest_audit_score: auditData.audit_score,
    latest_audit_at: new Date().toISOString(),
    metadata_last_refreshed_at: new Date().toISOString()
  })
  .eq('id', monitored_app_id);
```

**Replace with:**
```typescript
await supabase
  .from('monitored_apps')
  .update({
    validated_state: 'valid',
    validated_at: new Date().toISOString(),
    validation_error: null,
    latest_audit_score: auditScore, // From Bible audit
    latest_audit_at: new Date().toISOString(),
    metadata_last_refreshed_at: new Date().toISOString()
  })
  .eq('id', monitored_app_id);
```

#### 5. Update response data (Lines 391-401)

**Current:**
```typescript
return new Response(
  JSON.stringify({
    success: true,
    data: {
      validated_state: 'valid',
      metadata_cached: true,
      audit_created: true,
      audit_score: auditData.audit_score
    }
  } as RebuildResponse),
  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

**Replace with:**
```typescript
return new Response(
  JSON.stringify({
    success: true,
    data: {
      validated_state: 'valid',
      metadata_cached: true,
      audit_created: snapshotCreated,
      audit_score: auditScore // From Bible audit
    }
  } as RebuildResponse),
  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

---

## Update 3: `validate-monitored-app-consistency` Edge Function

**File:** `supabase/functions/validate-monitored-app-consistency/index.ts`

### Key Changes Required

#### Update snapshot check query

**Find the section that checks for audit snapshots (likely around line 80-100):**

**Current:**
```typescript
const { data: snapshot } = await supabase
  .from('audit_snapshots') // OLD TABLE
  .select('*')
  .eq('organization_id', monitoredApp.organization_id)
  .eq('app_id', monitoredApp.app_id)
  .eq('platform', monitoredApp.platform)
  .eq('locale', monitoredApp.locale)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();
```

**Replace with:**
```typescript
// Check for Bible-driven snapshot first (Phase 19)
const { data: bibleSnapshot } = await supabase
  .from('aso_audit_snapshots') // NEW TABLE
  .select('*')
  .eq('monitored_app_id', monitoredApp.id)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

// Fallback to old snapshot for backwards compatibility
const { data: oldSnapshot } = !bibleSnapshot ? await supabase
  .from('audit_snapshots')
  .eq('organization_id', monitoredApp.organization_id)
  .eq('app_id', monitoredApp.app_id)
  .eq('platform', monitoredApp.platform)
  .eq('locale', monitoredApp.locale)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle() : { data: null };

const snapshot = bibleSnapshot || oldSnapshot;
```

---

## Testing Checklist

After applying all updates:

### 1. Test `save-monitored-app`

```bash
# Call edge function
curl -X POST 'https://<PROJECT_ID>.supabase.co/functions/v1/save-monitored-app' \
  -H 'Authorization: Bearer <USER_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{
    "app_id": "389801252",
    "platform": "ios",
    "app_name": "Instagram",
    "locale": "us"
  }'

# Expected:
# - Calls metadata-audit-v2
# - Stores in aso_audit_snapshots
# - Updates monitored_apps.latest_audit_score
```

### 2. Test `rebuild-monitored-app`

```bash
curl -X POST 'https://<PROJECT_ID>.supabase.co/functions/v1/rebuild-monitored-app' \
  -H 'Authorization: Bearer <USER_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{
    "monitored_app_id": "<UUID>"
  }'

# Expected:
# - Fetches metadata
# - Calls metadata-audit-v2
# - Stores in aso_audit_snapshots
# - Marks as 'valid'
```

### 3. Verify database

```sql
-- Check new snapshots
SELECT COUNT(*) FROM aso_audit_snapshots;
SELECT * FROM aso_audit_snapshots ORDER BY created_at DESC LIMIT 1;

-- Verify structure
SELECT
  id,
  monitored_app_id,
  overall_score,
  kpi_overall_score,
  audit_version,
  created_at
FROM aso_audit_snapshots
ORDER BY created_at DESC
LIMIT 5;

-- Check monitored_apps updated
SELECT
  id,
  app_name,
  latest_audit_score,
  latest_audit_at,
  validated_state
FROM monitored_apps
WHERE audit_enabled = true
ORDER BY updated_at DESC
LIMIT 5;
```

---

## Rollback Plan

If issues arise:

1. **Revert edge functions:**
   ```bash
   git checkout HEAD~1 -- supabase/functions/save-monitored-app/
   git checkout HEAD~1 -- supabase/functions/rebuild-monitored-app/
   supabase functions deploy save-monitored-app
   supabase functions deploy rebuild-monitored-app
   ```

2. **Old snapshots still work:**
   - `audit_snapshots` table remains functional
   - `useMonitoredAudit` hook can fallback
   - No data loss

---

## Common Issues & Fixes

### Issue 1: `metadata-audit-v2` returns 500

**Cause:** Edge function timeout or Bible engine error

**Fix:**
- Check Supabase Edge Functions logs
- Verify Bible rulesets are loaded
- Increase function timeout if needed

### Issue 2: Missing KPI results in snapshot

**Cause:** KPI Engine not run by `metadata-audit-v2`

**Fix:**
- KPI Engine is optional (Phase 18)
- Snapshots work without KPI results
- Set `kpi_result` to `null`

### Issue 3: Duplicate snapshots created

**Cause:** Multiple calls to edge function

**Fix:**
- Snapshots are append-only by design
- Duplicates are acceptable
- Add deduplication logic if needed (check `audit_hash`)

---

## Next Steps After Edge Functions Updated

1. **Update React hooks** (`useMonitoredAudit`, `usePersistAuditSnapshot`)
2. **Create Monitored Apps list page**
3. **Create Audit History view**
4. **Test end-to-end workflow**
5. **Document completion**

---

**Prepared by:** Claude Code AI Assistant
**Date:** January 23, 2025
**Estimated Time to Implement:** 2-3 hours
**Risk Level:** MEDIUM (changes core monitoring logic)
**Testing Required:** YES (comprehensive)
