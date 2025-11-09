# Dashboard V2 Root Cause Analysis - Deep Dive

## Executive Summary
The previous fix (commit 466f2c0) **failed** because it made incorrect assumptions about the response structure. A comprehensive analysis reveals a **critical mismatch** between what the Edge Function code shows and what's actually being returned at runtime.

---

## The Error (What Actually Happens)

### Error Logs Show:
```
useEnterpriseAnalytics.ts:183 🔍 [ENTERPRISE-ANALYTICS] Detected wrapped response format, unwrapping...
useEnterpriseAnalytics.ts:184   Wrapped structure: {success: true, data: {…}, meta: {…}}
useEnterpriseAnalytics.ts:194  ❌ [ENTERPRISE-ANALYTICS] Cannot unwrap - data.data is not an array:
{summary: {…}, timeseries: Array(0), traffic_sources: Array(0), meta: {…}}
```

### Actual Response Structure Received:
```json
{
  "success": true,
  "data": {
    "summary": {
      "impressions": { "value": 0, "delta": 0 },
      "downloads": { "value": 0, "delta": 0 },
      "product_page_views": { "value": 0, "delta": 0 },
      "cvr": { "value": 0, "delta": 0 }
    },
    "timeseries": [],
    "traffic_sources": [],
    "meta": {
      "total_apps": 0,
      "date_range": {...},
      "available_traffic_sources": [],
      "granularity": "daily"
    }
  },
  "meta": {
    ...
  }
}
```

---

## What the Code Expects

### Hook Expected Format (useEnterpriseAnalytics.ts):
```typescript
interface EnterpriseAnalyticsResponse {
  rawData: BigQueryDataPoint[];  // ← Should be an ARRAY
  processedData: ProcessedData;  // ← Should be in response.processed
  meta: {...};
}
```

### Hook Expects ONE of These Formats:

**Format A (Direct):**
```json
{
  "data": [...],  // Raw BigQuery rows (array)
  "scope": {...},
  "meta": {...}
}
```

**Format B (Wrapped - what my fix assumed):**
```json
{
  "success": true,
  "data": {
    "data": [...],  // Raw rows nested here (array)
    "scope": {...},
    "meta": {...}
  },
  "meta": {...}
}
```

---

## What the Edge Function Code Shows

### Current bigquery-aso-data/index.ts (lines 451-472):
```typescript
const responsePayload = {
  data: rows,  // ← Array of BigQuery rows
  scope: {
    organization_id: resolvedOrgId,
    org_id: resolvedOrgId,
    app_ids: appIdsForQuery,
    date_range: { start: startDate, end: endDate },
    scope_source: scopeSource,
    metrics: metrics || null,
    traffic_sources: trafficSources || null,
  },
  meta: {
    timestamp: new Date().toISOString(),
    row_count: rows.length,
    query_duration_ms: Math.round(performance.now() - startTime),
  },
};

return new Response(
  JSON.stringify(responsePayload),
  { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
);
```

**Returns:** `{data: [], scope: {}, meta: {}}`
**Where data is:** Array of raw BigQuery rows

---

## The Critical Mismatch

| Aspect | Edge Function Code Shows | Runtime Actually Returns |
|--------|-------------------------|-------------------------|
| Top-level `success` field | ❌ NOT present | ✅ Present: `success: true` |
| `data` field type | 📊 Array of raw rows | 📈 Object with processed data |
| `data` contents | `[{date, app_id, impressions, ...}]` | `{summary, timeseries, traffic_sources, meta}` |
| Processing | None (raw rows) | Fully processed & aggregated |
| `processed` field | ❌ NOT present | ❌ NOT present |
| `scope` field | ✅ Present | ❓ Unknown (may be in top-level meta) |

---

## Why My Previous Fix Failed

### The Fix I Made (commit 466f2c0):
```typescript
// Check if this is a wrapped response (data.data exists and is an array)
if (!Array.isArray(actualData) && actualData && typeof actualData === 'object') {
  if (Array.isArray(actualData.data)) {  // ← Looking for response.data.data to be an array
    // Unwrap...
  } else {
    throw new Error('Invalid response structure - cannot find data array');
  }
}
```

### Why It Failed:
1. **Assumed wrong nesting**: I assumed `response.data.data` would be an array of raw rows
2. **Reality**: `response.data` is an object with `{summary, timeseries, traffic_sources, meta}`
3. **There is NO `response.data.data` field** - it doesn't exist in the actual response
4. **The processed format is at the wrong level** - it's in `response.data`, not `response.processed`

---

## Deployment Status Investigation

### Deployed Version:
- **Function:** `bigquery-aso-data`
- **Last Deployed:** Nov 5, 2025 at 12:30:24 UTC
- **Version:** 439

### Code Version:
- **Current Local Code:** Returns raw rows (commit 82bc53a+)
- **Expected by Hook:** Raw rows + processed data

### Critical Questions:
1. ❓ **Is the deployed version different from local code?**
   - Deployed version may be from an older commit that returns processed data
   - Or there's a build/processing step not visible in source

2. ❓ **Is there middleware processing responses?**
   - Supabase may have added response processing
   - Or there's a service worker transforming responses

3. ❓ **Is there demo mode active?**
   - Old commits show `generateSecureDemoResponse()` function
   - This function returns processed data format
   - May be triggered for Yodel Mobile org

---

## Historical Context

### Commit 2cf52dc (Sept 8, 2025) - "Fallback to demo on BigQuery errors":
```typescript
// Old code returned processed demo data:
{
  success: true,
  data: generateSecureDemoResponse(orgId, requestBody),
  meta: {...}
}
```

This matches the current error! The response structure with `{summary, timeseries, traffic_sources}` comes from the DEMO response generator, not the BigQuery path.

### Theory:
The **demo mode path is being triggered** for Yodel Mobile users, returning processed demo data instead of raw BigQuery data.

---

## Root Cause Hypothesis

### Most Likely Cause:
**The deployed Edge Function is serving demo/processed data, not raw BigQuery rows.**

### Evidence:
1. ✅ Response has `success: true` field (added by demo path)
2. ✅ Response has processed format `{summary, timeseries, traffic_sources}`
3. ✅ Historical code shows demo generator returns this exact format
4. ✅ Response has empty arrays (`timeseries: [], traffic_sources: []`) - typical of no-data demo
5. ❌ Response does NOT match current Edge Function code

### Why This Happens:
Either:
- A. **Deployed version is old** - Contains demo response logic from commit 2cf52dc
- B. **Demo mode triggered** - Organization or user settings trigger demo path
- C. **No BigQuery data** - Falls back to demo when no data available

---

## The Real Fix Needed

### Current Hook Code (WRONG):
```typescript
// Line 220: Looking for response.processed (doesn't exist)
processedData: response.processed || {default...}

// Line 219: Treating response.data as raw array (it's not)
rawData: actualData,
```

### What It Should Do:

**Option 1: If Edge Function Returns Raw Rows (as code shows)**
```typescript
rawData: response.data,  // Array of rows
processedData: response.processed,  // Processed aggregations
meta: response.meta
```

**Option 2: If Edge Function Returns Processed Data (as runtime shows)**
```typescript
// response.data already contains processed format
processedData: response.data,  // {summary, timeseries, traffic_sources, meta}
rawData: [],  // No raw data available
meta: response.meta
```

**Option 3: Handle BOTH Formats**
```typescript
if (Array.isArray(response.data)) {
  // Format A: Raw rows
  rawData = response.data;
  processedData = response.processed || calculateProcessedData(rawData);
} else if (response.data && typeof response.data === 'object' && 'summary' in response.data) {
  // Format B: Already processed
  processedData = response.data;
  rawData = [];
} else {
  throw new Error('Unknown response format');
}
```

---

## Action Items

### Immediate Investigation Needed:
1. **Check what's actually deployed:**
   ```bash
   # Fetch the deployed function code
   supabase functions download bigquery-aso-data
   ```

2. **Check if demo mode is active for Yodel Mobile:**
   ```sql
   SELECT id, name, demo_mode
   FROM organizations
   WHERE id = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
   ```

3. **Test with raw Edge Function call:**
   ```bash
   curl -X POST https://[project].supabase.co/functions/v1/bigquery-aso-data \
     -H "Authorization: Bearer [token]" \
     -d '{"org_id": "...", "date_range": {...}}'
   ```

### Fix Strategy:
1. **Determine actual deployed behavior** (raw vs processed)
2. **Update hook to handle actual format** (not assumed format)
3. **Consider re-deploying Edge Function** if version mismatch
4. **Add response format validation** with clear error messages

---

## Lessons Learned

1. ❌ **Don't assume response format** - Always test with actual deployed version
2. ❌ **Don't guess at data structures** - Inspect live responses first
3. ✅ **Check deployment status** before assuming local code matches production
4. ✅ **Historical commits matter** - Old code paths may still be deployed
5. ✅ **Demo modes complicate** - Test with real data vs demo data separately

---

## Status

**Current State:** ❌ BROKEN
**Previous Fix:** ❌ FAILED (wrong assumptions)
**Root Cause:** ✅ IDENTIFIED (format mismatch)
**Next Step:** 🔍 INVESTIGATE actual deployed Edge Function
**Proper Fix:** ⏳ PENDING investigation results

---

## Recommendation

**DO NOT make code changes yet.** First:
1. Inspect actual deployed Edge Function
2. Test actual runtime responses
3. Determine if demo mode is active
4. Then implement fix based on ACTUAL behavior, not assumed behavior
