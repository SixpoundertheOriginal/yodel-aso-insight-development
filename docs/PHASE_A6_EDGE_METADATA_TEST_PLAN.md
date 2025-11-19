# Phase A.6: App Store Edge Metadata - Test Plan

**Date:** 2025-01-18
**Author:** Claude Code
**Status:** Ready for Testing

---

## Overview

This test plan covers the new server-side App Store metadata scraping system implemented via Supabase Edge Function. The system bypasses CORS restrictions and provides accurate metadata extraction (title, subtitle, description, screenshots, ratings).

**Key Components:**
- `/supabase/functions/appstore-metadata/index.ts` - Edge Function (Deno runtime)
- `/src/services/metadata-adapters/appstore-edge.adapter.ts` - Browser adapter
- `/src/services/metadata-adapters/orchestrator.ts` - Priority-based routing

**Priority Chain:**
1. AppStoreEdge (priority 5) - Server-side scraping
2. AppStoreWeb (priority 10) - Browser scraping (CORS-blocked)
3. ItunesSearch (priority 10) - Search API
4. ItunesLookup (priority 20) - Lookup API

---

## 1. Edge Function Unit Tests

### 1.1 Input Validation Tests

**Test Case: Valid appId**
```typescript
// Request: GET /functions/v1/appstore-metadata?appId=389101562&country=us
// Expected: 200 OK with metadata
{
  success: true,
  appId: "389101562",
  title: "Pimsleur: Learn Languages Fast",
  subtitle: "Speak fluently in 30 Days!", // ✓ Accurate subtitle
  developer: "Simon & Schuster",
  // ...
}
```

**Test Case: Invalid appId (too short)**
```typescript
// Request: GET ?appId=12345
// Expected: 400 Bad Request
{ success: false, error: "Invalid appId: must be 6-12 digits" }
```

**Test Case: Invalid appId (non-numeric)**
```typescript
// Request: GET ?appId=abc123
// Expected: 400 Bad Request
{ success: false, error: "Invalid appId: must be 6-12 digits" }
```

**Test Case: Invalid country code**
```typescript
// Request: GET ?appId=389101562&country=usa
// Expected: 400 Bad Request
{ success: false, error: "Invalid country: must be 2-letter ISO code" }
```

**Test Case: Missing appId**
```typescript
// Request: GET ?country=us
// Expected: 400 Bad Request
{ success: false, error: "Missing appId parameter" }
```

### 1.2 SSRF Protection Tests

**Test Case: Non-Apple domain blocked**
```typescript
// Malicious URL: https://evil.com/app/id123456789
// Expected: 500 Internal Server Error
{ success: false, error: "SSRF protection: Only apps.apple.com is allowed" }
```

**Test Case: HTTP downgrade blocked**
```typescript
// URL: http://apps.apple.com/us/app/id389101562
// Expected: 500 Internal Server Error
{ success: false, error: "Only HTTPS URLs are allowed" }
```

### 1.3 Rate Limiting Tests

**Test Case: Normal usage (under limit)**
```typescript
// Send 9 requests from same IP within 1 minute
// Expected: All return 200 OK
```

**Test Case: Rate limit exceeded**
```typescript
// Send 11 requests from same IP within 1 minute
// Expected: 11th request returns 500 Internal Server Error
{ success: false, error: "Rate limit exceeded: 10 requests per minute" }
```

**Test Case: Rate limit resets after window**
```typescript
// Send 10 requests, wait 61 seconds, send 1 more
// Expected: 11th request returns 200 OK (new window)
```

### 1.4 Timeout and Size Limits

**Test Case: Fetch timeout (5 seconds)**
```typescript
// Simulate slow App Store response (>5s)
// Expected: AbortError caught, returns 500 with timeout message
```

**Test Case: Response too large (>2 MB)**
```typescript
// Simulate HTML response >2 MB
// Expected: 500 Internal Server Error
{ success: false, error: "Response too large (max 2 MB)" }
```

### 1.5 Metadata Extraction Tests

**Test Case: Extract JSON-LD data (ratings, description)**
```typescript
// App: Pimsleur (389101562)
// Expected:
{
  rating: 4.8, // from aggregateRating.ratingValue
  ratingCount: 12345, // from aggregateRating.reviewCount
  description: "Learn languages the Pimsleur way..." // from SoftwareApplication schema
}
```

**Test Case: Extract DOM selectors (title, subtitle, developer)**
```typescript
// App: Pimsleur (389101562)
// Expected:
{
  title: "Pimsleur: Learn Languages Fast", // from h1.product-header__title
  subtitle: "Speak fluently in 30 Days!", // from .product-header__subtitle
  developer: "Simon & Schuster", // from .product-header__identity a
}
```

**Test Case: Extract screenshots**
```typescript
// App: Pimsleur (389101562)
// Expected: screenshots.length >= 5
// Each screenshot URL: https://is1-ssl.mzstatic.com/image/...
```

**Test Case: Extract icon**
```typescript
// App: Pimsleur (389101562)
// Expected: icon starts with "https://" and contains "mzstatic.com"
```

**Test Case: Sanitize description (XSS protection)**
```typescript
// Malicious input: <script>alert('xss')</script>
// Expected: All HTML tags stripped by DOMPurify
```

---

## 2. Adapter Integration Tests

### 2.1 AppStoreEdgeAdapter Tests

**Test Case: Adapter initialization (valid config)**
```typescript
// .env contains VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
const adapter = new AppStoreEdgeAdapter();
expect(adapter.enabled).toBe(true);
expect(adapter.priority).toBe(5);
```

**Test Case: Adapter disabled (missing config)**
```typescript
// .env missing VITE_SUPABASE_URL
const adapter = new AppStoreEdgeAdapter();
expect(adapter.enabled).toBe(false);
// Console: "[appstore-edge] VITE_SUPABASE_URL not set - adapter will be disabled"
```

**Test Case: Fetch metadata via Edge Function**
```typescript
const adapter = new AppStoreEdgeAdapter();
const raw = await adapter.fetch('389101562', { country: 'us' });

expect(raw.source).toBe('appstore-edge');
expect(raw.statusCode).toBe(200);
expect(raw.data.success).toBe(true);
expect(raw.data.appId).toBe('389101562');
```

**Test Case: Validate raw metadata**
```typescript
const raw = { source: 'appstore-edge', data: { success: true, appId: '389101562', title: 'Pimsleur' }};
expect(adapter.validate(raw)).toBe(true);
```

**Test Case: Validate fails (missing required fields)**
```typescript
const raw = { source: 'appstore-edge', data: { success: true }};
expect(adapter.validate(raw)).toBe(false);
// Console: "[appstore-edge] Invalid data: missing required fields"
```

**Test Case: Transform to ScrapedMetadata**
```typescript
const raw = {
  source: 'appstore-edge',
  data: {
    success: true,
    appId: '389101562',
    country: 'us',
    title: 'Pimsleur: Learn Languages Fast',
    subtitle: 'Speak fluently in 30 Days!',
    developer: 'Simon & Schuster',
    description: 'Learn languages...',
    rating: 4.8,
    ratingCount: 12345,
    screenshots: ['https://...', 'https://...'],
    icon: 'https://...',
  },
};

const metadata = adapter.transform(raw);

expect(metadata.appId).toBe('389101562');
expect(metadata.name).toBe('Pimsleur: Learn Languages Fast');
expect(metadata.title).toBe('Pimsleur: Learn Languages Fast');
expect(metadata.subtitle).toBe('Speak fluently in 30 Days!'); // ✓ Critical field
expect(metadata.developer).toBe('Simon & Schuster');
expect(metadata.description).toBeTruthy();
expect(metadata.rating).toBe(4.8);
expect(metadata.reviews).toBe(12345);
expect(metadata.screenshots.length).toBeGreaterThan(0);
expect(metadata._source).toBe('appstore-edge');
```

### 2.2 Health Metrics Tests

**Test Case: Track success metrics**
```typescript
const adapter = new AppStoreEdgeAdapter();
await adapter.fetch('389101562', { country: 'us' }); // Success

const health = adapter.getHealth();
expect(health.status).toBe('healthy');
expect(health.lastSuccess).toBeTruthy();
expect(health.successRate).toBe(1.0);
expect(health.requestCount).toBe(1);
expect(health.errorCount).toBe(0);
expect(health.avgLatency).toBeGreaterThan(0);
```

**Test Case: Track failure metrics**
```typescript
const adapter = new AppStoreEdgeAdapter();
try {
  await adapter.fetch('invalid', { country: 'us' }); // Failure
} catch (e) {}

const health = adapter.getHealth();
expect(health.status).toBe('degraded'); // or 'down' if successRate < 0.5
expect(health.lastFailure).toBeTruthy();
expect(health.errorCount).toBe(1);
expect(health.successRate).toBe(0);
```

---

## 3. Orchestrator Integration Tests

### 3.1 Priority-Based Routing

**Test Case: Edge adapter used first (priority 5)**
```typescript
const metadata = await metadataOrchestrator.fetchMetadata('389101562', { country: 'us' });

// Console logs should show:
// "[DEBUG-FETCH-START] fetchMetadata called with:"
// "  activeAdapters: [{ name: 'appstore-edge', priority: 5 }, { name: 'appstore-web', priority: 10 }, ...]"
// "[appstore-edge] Fetching metadata"
// "[appstore-edge] Success"
// "[DEBUG-FETCH-RESULT] Metadata fetch complete: { adapterUsed: 'appstore-edge' }"

expect(metadata._source).toBe('appstore-edge');
expect(metadata.subtitle).toBe('Speak fluently in 30 Days!'); // ✓ Accurate
```

**Test Case: Fallback when Edge adapter disabled**
```typescript
// Temporarily disable Edge adapter by clearing env vars
// Expected fallback order: Web (10) → Search (10) → Lookup (20)

const metadata = await metadataOrchestrator.fetchMetadata('389101562', { country: 'us' });

// Console logs should show:
// "[ORCHESTRATOR] Edge adapter disabled - missing Supabase config"
// "[appstore-web] Fetching metadata" (or next available adapter)

expect(metadata._source).not.toBe('appstore-edge');
```

### 3.2 Search vs. Fetch Separation

**Test Case: searchApps() returns lightweight metadata**
```typescript
const results = await metadataOrchestrator.searchApps('Pimsleur', { country: 'us' });

expect(results.length).toBeGreaterThan(0);
expect(results[0].appId).toBe('389101562');
expect(results[0].name).toBe('Pimsleur: Learn Languages Fast');
expect(results[0].developer).toBe('Simon & Schuster');
expect(results[0].icon).toBeTruthy();

// ✓ Lightweight fields only (no subtitle, description, screenshots)
expect(results[0].subtitle).toBe('');
expect(results[0].description).toBe('');
expect(results[0].screenshots).toEqual([]);
```

**Test Case: fetchMetadata() returns full metadata**
```typescript
const metadata = await metadataOrchestrator.fetchMetadata('389101562', { country: 'us' });

// ✓ Full metadata (including subtitle, description, screenshots)
expect(metadata.subtitle).toBe('Speak fluently in 30 Days!');
expect(metadata.description.length).toBeGreaterThan(100);
expect(metadata.screenshots.length).toBeGreaterThan(0);
```

---

## 4. Regression Tests

### 4.1 Pimsleur Subtitle Bug (Critical)

**Bug:** Importing Pimsleur app returned wrong subtitle "Language Learning" instead of "Speak fluently in 30 Days!"

**Root Cause:** CORS blocked Web Adapter, fallback to iTunes Search which treats appId as search term, returns wrong app (VirtuNum).

**Test Case: Verify correct app imported**
```typescript
// User searches: "Pimsleur"
const results = await asoSearchService.searchApps('Pimsleur', 'US');

// User selects first result (Pimsleur)
const selectedApp = results[0];
expect(selectedApp.appId).toBe('389101562');

// AppSelectionModal calls handleSelectWithMetadata()
const fullMetadata = await metadataOrchestrator.fetchMetadata(selectedApp.appId, { country: 'us' });

// ✓ Verify correct app imported
expect(fullMetadata.appId).toBe('389101562');
expect(fullMetadata.name).toBe('Pimsleur: Learn Languages Fast');
expect(fullMetadata.subtitle).toBe('Speak fluently in 30 Days!'); // ✓ CRITICAL
expect(fullMetadata.developer).toBe('Simon & Schuster');

// ✓ Verify NOT VirtuNum
expect(fullMetadata.appId).not.toBe('1608844830'); // VirtuNum appId
expect(fullMetadata.name).not.toContain('VirtuNum');
expect(fullMetadata.subtitle).not.toBe('Language Learning'); // Wrong subtitle
```

**Test Case: Verify Edge adapter prevents fallback to iTunes Search**
```typescript
// Console logs during fetchMetadata('389101562')
// Expected:
// "[DEBUG-FETCH-START] activeAdapters: [{ name: 'appstore-edge', priority: 5 }, ...]"
// "[appstore-edge] Fetching metadata"
// "[appstore-edge] Success: { appId: '389101562', title: 'Pimsleur: Learn Languages Fast', subtitle: 'Speak fluently in 30 Days!' }"
// "[DEBUG-FETCH-RESULT] adapterUsed: 'appstore-edge'"

// NOT expected:
// "[itunes-search] Fetching metadata" ❌
```

### 4.2 Query Type Classification

**Test Case: Name search shows picker (even for 1 result)**
```typescript
// User searches: "Pimsleur"
const input = 'Pimsleur';
const queryType = classifyQueryType(input);

expect(queryType).toBe('name');

// Expected behavior: AmbiguousSearchError thrown → picker shown
try {
  await executeDirectApiSearch(input, 'US');
  fail('Should throw AmbiguousSearchError');
} catch (e) {
  expect(e).toBeInstanceOf(AmbiguousSearchError);
  expect(e.candidates.length).toBeGreaterThan(0);
}
```

**Test Case: URL search auto-imports (skip picker)**
```typescript
// User searches: "https://apps.apple.com/us/app/id389101562"
const input = 'https://apps.apple.com/us/app/id389101562';
const queryType = classifyQueryType(input);

expect(queryType).toBe('url');

// Expected behavior: Auto-import (no picker)
const metadata = await executeDirectApiSearch(input, 'US');
expect(metadata.appId).toBe('389101562');
expect(metadata.subtitle).toBe('Speak fluently in 30 Days!');
```

**Test Case: appId search auto-imports (skip picker)**
```typescript
// User searches: "389101562"
const input = '389101562';
const queryType = classifyQueryType(input);

expect(queryType).toBe('appId');

// Expected behavior: Auto-import (no picker)
const metadata = await executeDirectApiSearch(input, 'US');
expect(metadata.appId).toBe('389101562');
```

---

## 5. Performance Tests

### 5.1 Latency Requirements

**Test Case: Edge Function p50 latency < 500ms**
```typescript
const latencies = [];
for (let i = 0; i < 100; i++) {
  const start = Date.now();
  await metadataOrchestrator.fetchMetadata('389101562', { country: 'us' });
  latencies.push(Date.now() - start);
}

latencies.sort((a, b) => a - b);
const p50 = latencies[49];
expect(p50).toBeLessThan(500);
```

**Test Case: Edge Function p95 latency < 800ms**
```typescript
const p95 = latencies[94];
expect(p95).toBeLessThan(800);
```

**Test Case: Edge Function p99 latency < 1200ms**
```typescript
const p99 = latencies[98];
expect(p99).toBeLessThan(1200);
```

### 5.2 Concurrent Requests

**Test Case: Handle 5 concurrent requests**
```typescript
const promises = [
  metadataOrchestrator.fetchMetadata('389101562', { country: 'us' }), // Pimsleur
  metadataOrchestrator.fetchMetadata('544007664', { country: 'us' }), // YouTube
  metadataOrchestrator.fetchMetadata('310633997', { country: 'us' }), // WhatsApp
  metadataOrchestrator.fetchMetadata('284882215', { country: 'us' }), // Facebook
  metadataOrchestrator.fetchMetadata('389801252', { country: 'us' }), // Instagram
];

const results = await Promise.all(promises);

expect(results.length).toBe(5);
expect(results[0].appId).toBe('389101562');
expect(results[0].subtitle).toBe('Speak fluently in 30 Days!');
```

### 5.3 Cache Performance

**Test Case: Second fetch uses cache (if implemented)**
```typescript
// First fetch (cold)
const start1 = Date.now();
const metadata1 = await metadataOrchestrator.fetchMetadata('389101562', { country: 'us' });
const latency1 = Date.now() - start1;

// Second fetch (warm cache)
const start2 = Date.now();
const metadata2 = await metadataOrchestrator.fetchMetadata('389101562', { country: 'us' });
const latency2 = Date.now() - start2;

// If caching implemented:
// expect(latency2).toBeLessThan(latency1 / 2); // At least 2x faster
```

---

## 6. Security Tests

### 6.1 CORS Bypass Verification

**Test Case: Browser-based fetch fails (CORS blocked)**
```typescript
// Direct fetch from browser (should fail)
try {
  const response = await fetch('https://apps.apple.com/us/app/id389101562');
  fail('Should fail due to CORS');
} catch (e) {
  expect(e.message).toContain('CORS'); // or network error
}
```

**Test Case: Edge Function succeeds (CORS-free)**
```typescript
// Edge Function fetch (should succeed)
const metadata = await metadataOrchestrator.fetchMetadata('389101562', { country: 'us' });
expect(metadata.appId).toBe('389101562');
expect(metadata._source).toBe('appstore-edge');
```

### 6.2 XSS Protection

**Test Case: DOMPurify strips malicious scripts**
```typescript
// If App Store page contains malicious content (unlikely but test)
// Expected: DOMPurify sanitizes description field
const metadata = await metadataOrchestrator.fetchMetadata('389101562', { country: 'us' });
expect(metadata.description).not.toContain('<script>');
expect(metadata.description).not.toContain('javascript:');
```

### 6.3 Input Sanitization

**Test Case: SQL injection attempt blocked**
```typescript
// Malicious appId: "'; DROP TABLE apps; --"
try {
  await metadataOrchestrator.fetchMetadata("'; DROP TABLE apps; --", { country: 'us' });
  fail('Should throw validation error');
} catch (e) {
  expect(e.message).toContain('Invalid appId');
}
```

---

## 7. Error Handling Tests

### 7.1 Network Errors

**Test Case: Edge Function unreachable**
```typescript
// Simulate network failure (disconnect from internet)
try {
  await metadataOrchestrator.fetchMetadata('389101562', { country: 'us' });
  fail('Should throw network error');
} catch (e) {
  expect(e.message).toContain('fetch failed');
}
```

**Test Case: Fallback after Edge Function fails**
```typescript
// Simulate Edge Function failure (500 error)
// Expected: Orchestrator tries next adapter (Web, Search, Lookup)

const metadata = await metadataOrchestrator.fetchMetadata('389101562', { country: 'us' });

// Console logs should show:
// "[appstore-edge] Fetch failed: HTTP 500"
// "[appstore-web] Fetching metadata" (or next adapter)

expect(metadata._source).not.toBe('appstore-edge');
expect(metadata.appId).toBe('389101562'); // Still succeeds via fallback
```

### 7.2 Invalid Responses

**Test Case: Edge Function returns invalid JSON**
```typescript
// Simulate Edge Function returning malformed JSON
try {
  await metadataOrchestrator.fetchMetadata('389101562', { country: 'us' });
  fail('Should throw parse error');
} catch (e) {
  expect(e.message).toContain('Unexpected token');
}
```

**Test Case: Edge Function returns success: false**
```typescript
// Simulate Edge Function returning { success: false, error: "App not found" }
try {
  await metadataOrchestrator.fetchMetadata('999999999', { country: 'us' }); // Non-existent app
  fail('Should throw error');
} catch (e) {
  expect(e.message).toContain('App not found');
}
```

---

## 8. UI Integration Tests

### 8.1 AppSelectionModal Tests

**Test Case: handleSelectWithMetadata fetches full metadata**
```typescript
// User searches "Pimsleur" → picker shows
// User clicks "Select" on first result

const selectedApp = {
  appId: '389101562',
  name: 'Pimsleur: Learn Languages Fast',
  developer: 'Simon & Schuster',
  icon: 'https://...',
  subtitle: '', // Lightweight search result
  description: '',
  screenshots: [],
};

// handleSelectWithMetadata() calls fetchMetadata()
const fullMetadata = await metadataOrchestrator.fetchMetadata(selectedApp.appId, { country: 'us' });

// Verify full metadata fetched
expect(fullMetadata.subtitle).toBe('Speak fluently in 30 Days!'); // ✓ Not empty
expect(fullMetadata.description.length).toBeGreaterThan(100);
expect(fullMetadata.screenshots.length).toBeGreaterThan(0);

// Verify onSelect called with full metadata
expect(onSelectSpy).toHaveBeenCalledWith(fullMetadata);
```

**Test Case: Fallback to lightweight data on metadata fetch failure**
```typescript
// Simulate metadata fetch failure
metadataOrchestrator.fetchMetadata = jest.fn().mockRejectedValue(new Error('Network error'));

// User selects app
await handleSelectWithMetadata(selectedApp);

// Expected: onSelect called with lightweight data as fallback
expect(onSelectSpy).toHaveBeenCalledWith(selectedApp);

// Console warning:
// "[APP-SELECTION-MODAL] ⚠️ IMPORT → Using lightweight data as fallback"
```

---

## 9. End-to-End Test Scenarios

### 9.1 Happy Path: Search → Select → Import

**Scenario:** User searches "Pimsleur", selects app, verifies correct metadata imported

```typescript
// 1. User types "Pimsleur" in search bar
const searchInput = 'Pimsleur';

// 2. searchApps() returns lightweight results
const results = await asoSearchService.searchApps(searchInput, 'US');
expect(results.length).toBeGreaterThan(0);
expect(results[0].appId).toBe('389101562');
expect(results[0].subtitle).toBe(''); // Lightweight

// 3. Picker shown (query type = 'name')
const queryType = classifyQueryType(searchInput);
expect(queryType).toBe('name');
// AmbiguousSearchError thrown → picker opens

// 4. User clicks "Select" on Pimsleur
const selectedApp = results[0];

// 5. handleSelectWithMetadata() fetches full metadata via Edge Function
const fullMetadata = await metadataOrchestrator.fetchMetadata(selectedApp.appId, { country: 'us' });

// 6. Verify correct metadata
expect(fullMetadata.appId).toBe('389101562');
expect(fullMetadata.name).toBe('Pimsleur: Learn Languages Fast');
expect(fullMetadata.subtitle).toBe('Speak fluently in 30 Days!'); // ✓ CRITICAL
expect(fullMetadata.developer).toBe('Simon & Schuster');
expect(fullMetadata.description).toBeTruthy();
expect(fullMetadata.screenshots.length).toBeGreaterThan(0);
expect(fullMetadata._source).toBe('appstore-edge'); // ✓ Edge Function used

// 7. App imported into audit/workspace
expect(onSelect).toHaveBeenCalledWith(fullMetadata);
```

### 9.2 Edge Case: URL Search Auto-Import

**Scenario:** User pastes App Store URL, app auto-imported without picker

```typescript
// 1. User pastes URL
const input = 'https://apps.apple.com/us/app/pimsleur-learn-languages-fast/id389101562';

// 2. Query type detected as 'url'
const queryType = classifyQueryType(input);
expect(queryType).toBe('url');

// 3. Auto-import (no picker)
const metadata = await executeDirectApiSearch(input, 'US');

// 4. Verify correct metadata
expect(metadata.appId).toBe('389101562');
expect(metadata.subtitle).toBe('Speak fluently in 30 Days!');
expect(metadata._source).toBe('appstore-edge');
```

### 9.3 Edge Case: Multi-Country Support

**Scenario:** User searches for app in different country (e.g., France)

```typescript
// Search in France
const metadata = await metadataOrchestrator.fetchMetadata('389101562', { country: 'fr' });

// Verify country-specific metadata
expect(metadata.country).toBe('fr');
expect(metadata.url).toContain('/fr/app/');

// Subtitle may differ by locale (French subtitle)
expect(metadata.subtitle).toBeTruthy();
```

---

## 10. Monitoring and Observability

### 10.1 Debug Logging Verification

**Test Case: DEBUG-FETCH-START logs adapter list**
```typescript
// Console should show:
// "[DEBUG-FETCH-START] fetchMetadata called with: {
//   appId: '389101562',
//   activeAdapters: [
//     { name: 'appstore-edge', priority: 5, enabled: true },
//     { name: 'appstore-web', priority: 10, enabled: true },
//     { name: 'itunes-search', priority: 10, enabled: true },
//     { name: 'itunes-lookup', priority: 20, enabled: true },
//   ],
//   country: 'us',
// }"
```

**Test Case: DEBUG-FETCH-RESULT logs raw and normalized metadata**
```typescript
// Console should show:
// "[DEBUG-FETCH-RESULT] Metadata fetch complete: {
//   appId: '389101562',
//   adapterUsed: 'appstore-edge',
//   normalizationRan: true,
//   rawOutputFromAdapter: {
//     appId: '389101562',
//     title: 'Pimsleur: Learn Languages Fast',
//     subtitle: 'Speak fluently in 30 Days!',
//     ...
//   },
//   normalizedOutput: {
//     appId: '389101562',
//     title: 'Pimsleur: Learn Languages Fast',
//     subtitle: 'Speak fluently in 30 Days!',
//     ...
//   },
// }"
```

### 10.2 Health Metrics Tracking

**Test Case: Adapter health status updates**
```typescript
const adapter = new AppStoreEdgeAdapter();

// Initial state
let health = adapter.getHealth();
expect(health.status).toBe('healthy');
expect(health.requestCount).toBe(0);

// After successful request
await adapter.fetch('389101562', { country: 'us' });
health = adapter.getHealth();
expect(health.status).toBe('healthy');
expect(health.requestCount).toBe(1);
expect(health.successRate).toBe(1.0);

// After failed request
try { await adapter.fetch('invalid', { country: 'us' }); } catch (e) {}
health = adapter.getHealth();
expect(health.errorCount).toBe(1);
expect(health.successRate).toBe(0.5); // 1 success, 1 failure
```

---

## 11. Deployment Checklist

### Pre-Deployment Verification

- [ ] Build passes with 0 TypeScript errors (`npm run build`)
- [ ] Edge Function deployed to Supabase (`supabase functions deploy appstore-metadata`)
- [ ] Environment variables configured:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_PUBLISHABLE_KEY`
  - [ ] `VITE_EDGE_METADATA_ENDPOINT=/functions/v1/appstore-metadata`
  - [ ] `CORS_ALLOW_ORIGIN` (production domains)
- [ ] Edge Function accessible via browser (test in production)
- [ ] Adapter priority verified in orchestrator (Edge = 5, Web = 10, Search = 10, Lookup = 20)

### Post-Deployment Verification

- [ ] Search "Pimsleur" → Select → Verify subtitle = "Speak fluently in 30 Days!" ✓
- [ ] Search by URL → Auto-import works ✓
- [ ] Search by appId → Auto-import works ✓
- [ ] Multi-country support (test FR, DE, JP) ✓
- [ ] Concurrent requests (5 simultaneous) ✓
- [ ] Rate limiting works (11th request blocked) ✓
- [ ] Latency p95 < 800ms ✓
- [ ] Edge Function health metrics logged ✓
- [ ] Fallback to iTunes APIs when Edge Function disabled ✓

### Rollback Plan

If issues detected:
1. Set `VITE_SUPABASE_URL=""` to disable Edge adapter
2. System automatically falls back to Web/iTunes adapters
3. Investigate logs via Supabase Edge Functions dashboard
4. Fix and redeploy Edge Function
5. Re-enable by restoring `VITE_SUPABASE_URL`

---

## 12. Known Limitations

1. **Rate Limiting:** 10 requests/minute per IP (Edge Function)
   - **Mitigation:** Increase limit in production if needed

2. **Timeout:** 5 second max per request
   - **Mitigation:** Slow responses fall back to next adapter

3. **Response Size:** 2 MB max HTML size
   - **Mitigation:** Sufficient for App Store pages (typically <500 KB)

4. **Subtitle Extraction:** Relies on DOM selectors (`.product-header__subtitle`)
   - **Risk:** Apple may change HTML structure
   - **Mitigation:** Multiple fallback selectors, JSON-LD extraction

5. **CORS Dependency:** Edge adapter required for accurate metadata in browser
   - **Mitigation:** Fallback chain ensures system works even if Edge Function down

---

## 13. Success Criteria

**Primary Goals:**
- ✅ **No more wrong app imports** (Pimsleur ≠ VirtuNum)
- ✅ **Accurate subtitle extraction** ("Speak fluently in 30 Days!" not "Language Learning")
- ✅ **CORS bypass** (server-side scraping)
- ✅ **Priority 5** (Edge adapter tried first)
- ✅ **Fallback resilience** (iTunes APIs as backup)

**Performance Goals:**
- ✅ **p50 latency** < 500ms
- ✅ **p95 latency** < 800ms
- ✅ **p99 latency** < 1200ms

**Security Goals:**
- ✅ **SSRF protection** (only apps.apple.com)
- ✅ **Rate limiting** (10 req/min)
- ✅ **XSS protection** (DOMPurify sanitization)
- ✅ **Input validation** (appId, country)

**User Experience:**
- ✅ **Name search** → Always show picker
- ✅ **URL/ID search** → Auto-import
- ✅ **Lightweight search** → Fast results
- ✅ **On-demand metadata** → Full data on selection

---

## Appendix: Test Commands

### Run Edge Function Locally
```bash
supabase functions serve appstore-metadata --env-file .env
```

### Test Edge Function Locally
```bash
curl "http://localhost:54321/functions/v1/appstore-metadata?appId=389101562&country=us" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}"
```

### Deploy Edge Function
```bash
supabase functions deploy appstore-metadata
```

### Run Frontend Build
```bash
npm run build
```

### Run Frontend Dev Server
```bash
npm run dev
```

### Monitor Edge Function Logs
```bash
supabase functions logs appstore-metadata --project-ref bkbcqocpjahewqjmlgvf
```
