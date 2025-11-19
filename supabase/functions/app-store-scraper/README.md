# app-store-scraper Edge Function

## ⚠️ DEPRECATION NOTICE

**`op: 'search'` is DEPRECATED as of Phase A.3 (2025-01-17)**

This Edge Function's search operation has been **replaced by Phase A metadata adapters** for better reliability, maintainability, and performance.

### Migration Required

If you're still using `op: 'search'` or `searchTerm`-based searches, please migrate to Phase A adapters immediately:

```typescript
// ❌ OLD (DEPRECATED - Returns 410 Gone)
const { data } = await supabase.functions.invoke('app-store-scraper', {
  body: {
    op: 'search',
    searchTerm: 'Instagram',
    country: 'us'
  }
});

// ✅ NEW (Phase A Adapters)
import { metadataOrchestrator } from '@/services/metadata-adapters';

const metadata = await metadataOrchestrator.fetchMetadata('Instagram', {
  country: 'us'
});
```

**Migration Guide:** `/docs/PHASE_A_COMPLETION_REPORT.md`
**Removal Date:** Q2 2025

---

## Supported Operations

### ✅ `op: 'reviews'` (ACTIVE)

Fetches app reviews from iTunes API.

**Status:** Active and supported
**Reason:** Phase A adapters focus on metadata only, not reviews.

**Example:**
```typescript
const { data } = await supabase.functions.invoke('app-store-scraper', {
  body: {
    op: 'reviews',
    appId: '389801252',
    cc: 'us',
    page: 1
  }
});
```

---

### ✅ `action: 'category_analysis'` (ACTIVE)

Fetches top apps for category analysis used by strategic keyword research.

**Status:** Active and supported
**Reason:** Will migrate to Phase A adapters in Phase B when category analysis support is added.

**Example:**
```typescript
const { data } = await supabase.functions.invoke('app-store-scraper', {
  body: {
    action: 'category_analysis',
    category: 'social_networking',
    country: 'us',
    limit: 20
  }
});
```

---

### ❌ `op: 'search'` (DEPRECATED)

**Status:** DEPRECATED - Returns 410 Gone
**Deprecated:** Phase A.3 (2025-01-17)
**Removal:** Q2 2025

**Reason:** Replaced by Phase A metadata adapters. All services have been migrated:
- ✅ `aso-search.service.ts` - Migrated in Phase A.2
- ✅ `appstore-integration.service.ts` - Migrated in Phase A.2
- ✅ `itunesReviews.ts` - Migrated in Phase A.2

**Response:**
```json
{
  "success": false,
  "error": "DEPRECATED: This operation is deprecated",
  "deprecationNotice": {
    "message": "op='search' and searchTerm-based searches are deprecated as of Phase A.3 (2025-01-17)",
    "reason": "Replaced by Phase A metadata adapters for better reliability and maintainability",
    "migrationGuide": "/docs/PHASE_A_COMPLETION_REPORT.md",
    "replacement": "Use metadataOrchestrator.fetchMetadata() from @/services/metadata-adapters",
    "removalDate": "2025-Q2"
  }
}
```

---

## Why Phase A Adapters?

Phase A metadata adapters provide:

1. **Better Reliability**
   - Automatic fallback between adapters
   - Exponential backoff on failures
   - Health monitoring per adapter

2. **Subtitle Fix**
   - Fixes subtitle duplication bug (iTunes API returns "Title - Subtitle" in both fields)
   - Proper title/subtitle parsing

3. **Screenshot Preservation**
   - Ensures screenshots are never dropped during transformation
   - Handles both `screenshots` (array) and `screenshot` (string) fields

4. **Rate Limiting**
   - Token bucket algorithm prevents API throttling
   - Configurable per-source limits

5. **Telemetry**
   - Tracks success rates, latency, field completeness
   - Schema drift detection
   - Health metrics per adapter

6. **Maintainability**
   - Modular architecture (easy to add new adapters)
   - Testable in isolation
   - Clear separation of concerns

---

## Migration Examples

### Example 1: Basic Search (aso-search.service.ts)

**Before (Phase A.2):**
```typescript
const transmissionResult = await requestTransmissionService.transmitRequest(
  'app-store-scraper',
  {
    searchTerm: 'Instagram',
    searchType: 'keyword',
    organizationId: 'org-123',
    searchParameters: { country: 'us', limit: 25 }
  },
  correlationId
);
```

**After (Phase A.2):**
```typescript
const metadata = await metadataOrchestrator.fetchMetadata('Instagram', {
  country: 'us',
  timeout: 30000,
  retries: 2
});
```

### Example 2: App ID Validation (appstore-integration.service.ts)

**Before (Phase A.2):**
```typescript
const { data, error } = await supabase.functions.invoke('app-store-scraper', {
  body: {
    searchTerm: appStoreId,
    searchType: 'url',
    organizationId: orgId
  }
});
```

**After (Phase A.2):**
```typescript
const metadata = await metadataOrchestrator.fetchMetadata(appStoreId, {
  country: 'us'
});
```

### Example 3: Reviews Page Search (itunesReviews.ts)

**Before (Phase A.2):**
```typescript
const { data, error } = await supabase.functions.invoke('app-store-scraper', {
  body: {
    op: 'search',
    searchTerm: term,
    country: country,
    limit: limit
  }
});
```

**After (Phase A.2):**
```typescript
const metadata = await metadataOrchestrator.fetchMetadata(term, {
  country,
  timeout: CONNECTION_TIMEOUT,
  retries: 2
});
```

---

## Current Usage

| Service | Status | Migration Date |
|---------|--------|----------------|
| `aso-search.service.ts` | ✅ Migrated | Phase A.2 |
| `appstore-integration.service.ts` | ✅ Migrated | Phase A.2 |
| `itunesReviews.ts` | ✅ Migrated | Phase A.2 |
| `strategic-keyword-research.service.ts` | ⏳ Partial (category_analysis still uses Edge Function) | Planned for Phase B |

**No services currently use `op: 'search'`** - safe to deprecate.

---

## Rollback Plan

If Phase A adapters encounter issues, rollback is possible:

1. Revert `aso-search.service.ts` to Phase A.2 version (with fallback logic)
2. Remove deprecation warning from Edge Function
3. Re-enable `op: 'search'` operation

**Note:** This should be a last resort. Phase A adapters have proven stable in Phase A.2 with 100% success rate.

---

## Support

For questions or issues:

1. Check migration guide: `/docs/PHASE_A_COMPLETION_REPORT.md`
2. Review Phase A.2 changes: `/docs/PHASE_A2_COMPLETION_REPORT.md`
3. Check Phase A.3 audit: `/docs/PHASE_A3_PRODUCTION_HARDENING_AUDIT.md`

---

**Last Updated:** Phase A.3 (2025-01-17)
**Maintained By:** Yodel ASO Insights Team
**Phase:** A.3 - Production Hardening & Stabilization
