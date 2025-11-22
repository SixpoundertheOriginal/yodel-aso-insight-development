# KPI Engine Phase 2: Supabase Persistence Layer

**Status:** ✅ Complete
**Version:** v1
**Date:** November 22, 2025
**Related:** [KPI Engine Phase 1 Overview](./KPI_ENGINE_PHASE1_OVERVIEW.md)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Service Layer API](#service-layer-api)
5. [React Query Hooks](#react-query-hooks)
6. [Examples](#examples)
7. [Testing](#testing)
8. [Limitations](#limitations)
9. [Next Steps](#next-steps)

---

## 🎯 Overview

Phase 2 adds **Supabase persistence** for KPI Engine snapshots, enabling:

- **Historical tracking** - Store KPI vectors over time
- **Trend analysis** - Compare metadata versions and track improvements
- **Competitor comparison** - Benchmark against competitor KPI vectors
- **ML readiness** - 34-dimensional vectors ready for similarity analysis

### Key Features

✅ **Multi-tenant safe** - Organization-scoped RLS policies
✅ **Type-safe** - Full TypeScript coverage with strict types
✅ **Null-safe** - No throws, all errors returned as values
✅ **Additive only** - Zero modifications to existing systems
✅ **React Query ready** - Stale-while-revalidate caching built-in

### What This Phase Does NOT Do

❌ No UI integration (Phase 3)
❌ No MetadataOrchestrator changes
❌ No audit pipeline modifications
❌ No auto-scoring on metadata changes

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    KPI Engine Phase 2                        │
│                  (Persistence Layer)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
         ┌────────────────────┴────────────────────┐
         │                                         │
         ▼                                         ▼
┌─────────────────────┐                  ┌─────────────────────┐
│   Supabase Table    │                  │   Service Layer     │
│                     │                  │                     │
│ app_metadata_kpi_   │◄─────────────────│ KpiPersistence      │
│ snapshots           │                  │ Service             │
│                     │                  │                     │
│ - id                │                  │ Methods:            │
│ - organization_id   │                  │ - saveKpiSnapshot   │
│ - app_id            │                  │ - getKpiSnapshots   │
│ - kpi_vector[34]    │                  │ - getLatestSnapshot │
│ - kpi_json          │                  │ - compareSnapshots  │
│ - score_overall     │                  └──────────┬──────────┘
│ - score_families    │                             │
│ - created_at        │                             │
└─────────────────────┘                             ▼
                                          ┌─────────────────────┐
                                          │  React Query Hooks  │
                                          │                     │
                                          │ - useKpiHistory     │
                                          │ - useKpiLatest      │
                                          │ - useKpiSnapshots   │
                                          │   ForApps           │
                                          └─────────────────────┘
```

### Data Flow

1. **KPI Engine** (Phase 1) computes KPI vector → `KpiEngineResult`
2. **Service Layer** persists to Supabase → `SaveKpiSnapshotResult`
3. **React Query** fetches snapshots → cached, stale-while-revalidate
4. **UI** (Phase 3) renders trends, comparisons, insights

---

## 🗄️ Database Schema

### Table: `app_metadata_kpi_snapshots`

**Migration:** `supabase/migrations/20260123000005_create_kpi_snapshots_table.sql`

```sql
CREATE TABLE public.app_metadata_kpi_snapshots (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  app_id             TEXT NOT NULL,
  bundle_id          TEXT,
  market             TEXT NOT NULL DEFAULT 'us',
  platform           TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  metadata_version   TEXT NOT NULL,
  kpi_vector         FLOAT8[] NOT NULL,
  kpi_json           JSONB NOT NULL,
  score_overall      FLOAT8 NOT NULL,
  score_families     JSONB NOT NULL,
  title              TEXT,
  subtitle           TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Column Details

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | Multi-tenant isolation (RLS) |
| `app_id` | TEXT | App identifier (e.g., '310633997' for iOS) |
| `bundle_id` | TEXT | Bundle ID (optional, e.g., 'com.pimsleur.app') |
| `market` | TEXT | Market/locale (e.g., 'us', 'gb') |
| `platform` | TEXT | 'ios' \| 'android' |
| `metadata_version` | TEXT | KPI Engine version (e.g., 'v1') |
| `kpi_vector` | FLOAT8[] | 34-dimensional array (normalized 0-100) |
| `kpi_json` | JSONB | Full KPI breakdown with raw + normalized values |
| `score_overall` | FLOAT8 | Overall score (0-100) |
| `score_families` | JSONB | 6 family scores with weights |
| `title` | TEXT | Title at time of snapshot |
| `subtitle` | TEXT | Subtitle at time of snapshot |
| `created_at` | TIMESTAMPTZ | Snapshot timestamp |

### Indexes

```sql
CREATE INDEX idx_kpi_snapshots_app_org ON app_metadata_kpi_snapshots(app_id, organization_id);
CREATE INDEX idx_kpi_snapshots_org_created ON app_metadata_kpi_snapshots(organization_id, created_at DESC);
CREATE INDEX idx_kpi_snapshots_app_market ON app_metadata_kpi_snapshots(app_id, market, created_at DESC);
CREATE INDEX idx_kpi_snapshots_created_at ON app_metadata_kpi_snapshots(created_at DESC);
CREATE INDEX idx_kpi_snapshots_platform_market ON app_metadata_kpi_snapshots(platform, market, created_at DESC);
```

### Row-Level Security (RLS)

All operations (SELECT, INSERT, UPDATE, DELETE) are scoped to user's organization via:

```sql
CREATE POLICY "Users can read KPI snapshots for their organization"
  ON app_metadata_kpi_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.organization_id = app_metadata_kpi_snapshots.organization_id
    )
  );
```

---

## 📦 Service Layer API

**File:** `src/services/kpi/kpi-persistence.service.ts`

### Class: `KpiPersistenceService`

Static service class with 5 core methods.

---

### Method: `saveKpiSnapshot`

Save a KPI snapshot to Supabase.

**Signature:**
```typescript
static async saveKpiSnapshot(
  params: SaveKpiSnapshotParams
): Promise<SaveKpiSnapshotResult>
```

**Parameters:**
```typescript
interface SaveKpiSnapshotParams {
  organizationId: string;
  appId: string;
  bundleId?: string;
  market: string;
  platform: 'ios' | 'android';
  metadataVersion: string;
  kpiResult: KpiEngineResult;
  title?: string;
  subtitle?: string;
}
```

**Returns:**
```typescript
interface SaveKpiSnapshotResult {
  success: boolean;
  snapshotId?: string;
  error?: string;
}
```

**Example:**
```typescript
const kpiResult = KpiEngine.evaluate({ title: 'My App', ... });

const result = await KpiPersistenceService.saveKpiSnapshot({
  organizationId: 'org-123',
  appId: '310633997',
  market: 'us',
  platform: 'ios',
  metadataVersion: kpiResult.version,
  kpiResult,
  title: 'My App',
  subtitle: 'Best App Ever',
});

if (result.success) {
  console.log('Saved:', result.snapshotId);
} else {
  console.error('Error:', result.error);
}
```

**Validations:**
- ✅ Required fields present
- ✅ Vector length = 34
- ✅ No throws - returns error message

---

### Method: `getKpiSnapshots`

Fetch KPI snapshot history for an app.

**Signature:**
```typescript
static async getKpiSnapshots(
  organizationId: string,
  appId: string,
  limit: number = 50
): Promise<KpiSnapshot[]>
```

**Returns:**
```typescript
interface KpiSnapshot {
  id: string;
  organization_id: string;
  app_id: string;
  bundle_id: string | null;
  market: string;
  platform: 'ios' | 'android';
  metadata_version: string;
  kpi_vector: number[];
  kpi_json: Record<string, unknown>;
  score_overall: number;
  score_families: Record<string, unknown>;
  title: string | null;
  subtitle: string | null;
  created_at: string;
}
```

**Example:**
```typescript
const history = await KpiPersistenceService.getKpiSnapshots(
  'org-123',
  '310633997',
  50
);

console.log(`Found ${history.length} snapshots`);
history.forEach(snapshot => {
  console.log(`Score: ${snapshot.score_overall}, Date: ${snapshot.created_at}`);
});
```

---

### Method: `getLatestSnapshot`

Fetch the most recent KPI snapshot for an app.

**Signature:**
```typescript
static async getLatestSnapshot(
  organizationId: string,
  appId: string
): Promise<KpiSnapshot | null>
```

**Returns:** Latest snapshot or `null` if none exists.

**Example:**
```typescript
const latest = await KpiPersistenceService.getLatestSnapshot('org-123', 'app-id');

if (latest) {
  console.log('Latest score:', latest.score_overall);
} else {
  console.log('No snapshots yet');
}
```

---

### Method: `compareSnapshots`

Calculate deltas between two snapshots.

**Signature:**
```typescript
static compareSnapshots(
  previous: KpiSnapshot,
  current: KpiSnapshot
): KpiComparisonResult
```

**Returns:**
```typescript
interface KpiComparisonResult {
  previous: KpiSnapshot;
  current: KpiSnapshot;
  overallScoreDelta: number;
  familyDeltas: Record<string, number>;
  kpiDeltas: KpiDelta[];
  timeElapsedMs: number;
}

interface KpiDelta {
  kpiId: string;
  prevValue: number;
  currentValue: number;
  delta: number;
  percentChange: number | null;
}
```

**Example:**
```typescript
const history = await KpiPersistenceService.getKpiSnapshots('org-123', 'app-id', 2);

if (history.length >= 2) {
  const comparison = KpiPersistenceService.compareSnapshots(history[1], history[0]);

  console.log('Overall change:', comparison.overallScoreDelta);
  console.log('Family changes:', comparison.familyDeltas);

  // Top 5 improvements
  const topImprovements = comparison.kpiDeltas
    .filter(d => d.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5);
}
```

---

### Method: `getKpiSnapshotsForApps`

Fetch snapshots for multiple apps (competitor comparison).

**Signature:**
```typescript
static async getKpiSnapshotsForApps(
  organizationId: string,
  appIds: string[],
  limit: number = 10
): Promise<Map<string, KpiSnapshot[]>>
```

**Returns:** Map of `appId` → `snapshots[]`

**Example:**
```typescript
const competitors = await KpiPersistenceService.getKpiSnapshotsForApps(
  'org-123',
  ['app-1', 'app-2', 'app-3'],
  10
);

competitors.forEach((snapshots, appId) => {
  console.log(`${appId}: ${snapshots.length} snapshots`);
});
```

---

## 🪝 React Query Hooks

**File:** `src/hooks/useKpiSnapshots.ts`

Three hooks for frontend integration (Phase 3).

### Hook: `useKpiHistory`

**Signature:**
```typescript
function useKpiHistory(params: UseKpiHistoryParams): UseKpiHistoryResult
```

**Parameters:**
```typescript
interface UseKpiHistoryParams {
  organizationId: string;
  appId: string;
  limit?: number;
  enabled?: boolean;
}
```

**Returns:**
```typescript
interface UseKpiHistoryResult {
  snapshots: KpiSnapshot[];
  isLoading: boolean;
  error: Error | null;
  isSuccess: boolean;
  isFetching: boolean;
  queryResult: UseQueryResult<KpiSnapshot[], Error>;
}
```

**Example:**
```tsx
const { snapshots, isLoading } = useKpiHistory({
  organizationId: 'org-123',
  appId: '310633997',
  limit: 50,
  enabled: true,
});

if (isLoading) return <Spinner />;

return (
  <div>
    <h3>History: {snapshots.length} snapshots</h3>
    {snapshots.map(s => <SnapshotCard key={s.id} snapshot={s} />)}
  </div>
);
```

---

### Hook: `useKpiLatest`

**Signature:**
```typescript
function useKpiLatest(params: UseKpiLatestParams): UseKpiLatestResult
```

**Parameters:**
```typescript
interface UseKpiLatestParams {
  organizationId: string;
  appId: string;
  enabled?: boolean;
}
```

**Returns:**
```typescript
interface UseKpiLatestResult {
  snapshot: KpiSnapshot | null;
  isLoading: boolean;
  error: Error | null;
  isSuccess: boolean;
  isFetching: boolean;
  queryResult: UseQueryResult<KpiSnapshot | null, Error>;
}
```

**Example:**
```tsx
const { snapshot, isLoading } = useKpiLatest({
  organizationId: 'org-123',
  appId: '310633997',
});

if (!snapshot) return <div>No snapshots yet</div>;

return <ScoreCard score={snapshot.score_overall} />;
```

---

### Hook: `useKpiSnapshotsForApps`

**Signature:**
```typescript
function useKpiSnapshotsForApps(
  params: UseKpiSnapshotsForAppsParams
): UseKpiSnapshotsForAppsResult
```

**Parameters:**
```typescript
interface UseKpiSnapshotsForAppsParams {
  organizationId: string;
  appIds: string[];
  limit?: number;
  enabled?: boolean;
}
```

**Returns:**
```typescript
interface UseKpiSnapshotsForAppsResult {
  snapshotsByApp: Map<string, KpiSnapshot[]>;
  isLoading: boolean;
  error: Error | null;
  isSuccess: boolean;
  isFetching: boolean;
  queryResult: UseQueryResult<Map<string, KpiSnapshot[]>, Error>;
}
```

**Example:**
```tsx
const { snapshotsByApp, isLoading } = useKpiSnapshotsForApps({
  organizationId: 'org-123',
  appIds: ['app-1', 'app-2', 'app-3'],
  limit: 10,
});

return (
  <div>
    {Array.from(snapshotsByApp.entries()).map(([appId, snapshots]) => (
      <CompetitorCard key={appId} appId={appId} snapshots={snapshots} />
    ))}
  </div>
);
```

---

## 📚 Examples

### Example 1: Save First Snapshot

```typescript
import { KpiEngine } from '@/engine/metadata/kpi/kpiEngine';
import { KpiPersistenceService } from '@/services/kpi/kpi-persistence.service';

// 1. Compute KPI vector
const kpiResult = KpiEngine.evaluate({
  title: 'Pimsleur Language Learning',
  subtitle: 'Speak Spanish Fluently Fast',
  locale: 'us',
  platform: 'ios',
});

// 2. Save to Supabase
const result = await KpiPersistenceService.saveKpiSnapshot({
  organizationId: userOrgId,
  appId: '310633997',
  bundleId: 'com.pimsleur.app',
  market: 'us',
  platform: 'ios',
  metadataVersion: kpiResult.version,
  kpiResult,
  title: 'Pimsleur Language Learning',
  subtitle: 'Speak Spanish Fluently Fast',
});

console.log(result.success ? 'Saved!' : `Error: ${result.error}`);
```

---

### Example 2: Track Improvements Over Time

```typescript
// Fetch last 10 snapshots
const history = await KpiPersistenceService.getKpiSnapshots(orgId, appId, 10);

// Calculate trend
const scores = history.map(s => s.score_overall);
const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
const trend = scores[0] > scores[scores.length - 1] ? '📈' : '📉';

console.log(`Average score: ${avgScore.toFixed(2)} ${trend}`);
```

---

### Example 3: Compare Before/After Metadata Change

```typescript
const history = await KpiPersistenceService.getKpiSnapshots(orgId, appId, 2);

if (history.length >= 2) {
  const comparison = KpiPersistenceService.compareSnapshots(history[1], history[0]);

  console.log(`Overall: ${comparison.overallScoreDelta > 0 ? '+' : ''}${comparison.overallScoreDelta.toFixed(2)}`);

  // Show which families improved
  Object.entries(comparison.familyDeltas).forEach(([family, delta]) => {
    if (delta > 0) {
      console.log(`✅ ${family}: +${delta.toFixed(2)}`);
    }
  });
}
```

---

### Example 4: Competitor Benchmarking

```typescript
const competitorIds = ['spotify-app-id', 'duolingo-app-id', 'my-app-id'];

const snapshots = await KpiPersistenceService.getKpiSnapshotsForApps(
  orgId,
  competitorIds,
  1 // latest only
);

const scores = Array.from(snapshots.entries()).map(([appId, snaps]) => ({
  appId,
  score: snaps[0]?.score_overall || 0,
}));

scores.sort((a, b) => b.score - a.score);

console.log('Ranking:');
scores.forEach((s, i) => console.log(`${i + 1}. ${s.appId}: ${s.score.toFixed(2)}`));
```

---

## 🧪 Testing

### CLI Test Script

**File:** `scripts/test-kpi-persistence.ts`

**Run:**
```bash
npx tsx scripts/test-kpi-persistence.ts
```

**Tests:**
1. ✅ Table exists and is accessible
2. ✅ Save KPI snapshot succeeds
3. ✅ Save another snapshot (different metadata)
4. ✅ Fetch latest snapshot works
5. ✅ Fetch history works
6. ✅ Compare snapshots returns correct deltas
7. ✅ Null-safety (missing required fields)
8. ✅ Fetch snapshots for multiple apps
9. ✅ Verify vector format (34-dim, all finite, 0-100 range)
10. ✅ Verify JSONB format (34 KPIs, 6 families)

**Expected Output:**
```
🧪 Testing KPI Persistence Service (Phase 2)
============================================================

Test 1: Table Exists and Is Accessible
------------------------------------------------------------
✅ Table exists
   Table is accessible via Supabase client

Test 2: Save KPI Snapshot Succeeds
------------------------------------------------------------
KPI Engine result: v1, score=67.42
✅ Save snapshot (version 1)
   Snapshot ID: 12345678-abcd-...

...

📊 Test Summary
------------------------------------------------------------
Total tests: 10
✅ Passed: 10
❌ Failed: 0

🎉 All tests passed!
✅ Phase 2 (Supabase Persistence Layer) is working correctly.
```

---

## ⚠️ Limitations

### Current Limitations

1. **No automatic snapshots** - Must manually call `saveKpiSnapshot`
2. **No UI** - Phase 3 will add trend charts, comparison views
3. **No ML models** - Vector similarity, clustering, recommendations deferred
4. **No competitor auto-fetch** - Must manually provide competitor app IDs
5. **No deduplication** - Same metadata can create multiple snapshots

### Not Supported

- ❌ Auto-snapshot on metadata save
- ❌ Scheduled snapshots (cron)
- ❌ Snapshot diffing in UI
- ❌ Export to CSV/JSON
- ❌ Bulk delete/archive

---

## 🚀 Next Steps

### Phase 3: UI Integration

**Goal:** Render KPI trends, comparisons, and insights in Audit V2.

**Deliverables:**
1. **KPI Trend Chart** - Line chart showing score over time
2. **KPI Comparison View** - Before/after diff with highlighted changes
3. **Competitor Benchmarking** - Radar chart comparing KPI families
4. **Snapshot Manager** - List, view, delete snapshots
5. **Auto-snapshot Toggle** - Enable/disable auto-save on metadata changes

**Files:**
- `src/components/AppAudit/KpiTrendChart.tsx`
- `src/components/AppAudit/KpiComparisonView.tsx`
- `src/components/AppAudit/CompetitorBenchmark.tsx`

---

### Phase 4: ML & Intelligence

**Goal:** Use KPI vectors for smart recommendations.

**Features:**
- **Similarity search** - Find apps with similar KPI profiles
- **Clustering** - Group apps by KPI patterns
- **Anomaly detection** - Flag unusual KPI changes
- **Predictive scoring** - Estimate impact of metadata changes

**Tech Stack:**
- PostgreSQL pgvector extension for vector similarity
- Supabase Edge Functions for ML inference
- KPI vectors as embeddings

---

## 📝 Changelog

### v1 (November 22, 2025)

**Added:**
- ✅ Supabase table `app_metadata_kpi_snapshots`
- ✅ Service layer `KpiPersistenceService`
- ✅ React Query hooks `useKpiHistory`, `useKpiLatest`, `useKpiSnapshotsForApps`
- ✅ CLI test script with 10 comprehensive tests
- ✅ Full TypeScript types and documentation

**Testing:**
- ✅ All 10 tests passing
- ✅ TypeScript compilation 0 errors
- ✅ RLS policies verified

---

## 🔗 Related Documentation

- [KPI Engine Phase 1 Overview](./KPI_ENGINE_PHASE1_OVERVIEW.md)
- [Metadata Audit Engine V2](./METADATA_AUDIT_ENGINE_V2.md)
- [Autocomplete Intelligence](./AUTOCOMPLETE_INTELLIGENCE_PHASE4_COMPLETE.md)
- [Brand Intelligence](./AUTOCOMPLETE_INTELLIGENCE_PHASE5_COMPLETE.md)

---

**Phase 2 Status:** ✅ Complete and Production-Ready
**Next Phase:** Phase 3 - UI Integration (TBD)
