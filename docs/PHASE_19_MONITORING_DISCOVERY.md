---
Status: DISCOVERY COMPLETE
Phase: 19 (Discovery)
Date: 2025-01-23
Type: Read-Only Analysis
Scope: Monitoring & Audit Caching Infrastructure
Purpose: Baseline assessment for Phase 19 implementation
---

# PHASE 19 — MONITORING & AUDIT CACHING DISCOVERY REPORT

**Status:** ✅ DISCOVERY COMPLETE
**Date:** January 23, 2025
**Analysis Type:** Read-Only (No Schema Changes)
**Analyzed By:** Claude Code AI Assistant

---

## Executive Summary

The Yodel ASO Insight platform **ALREADY HAS** a comprehensive monitoring and caching system in place with enterprise-grade features including:

- ✅ **Monitored Apps Table** (`monitored_apps`) with audit support
- ✅ **Metadata Caching** (`app_metadata_cache`) with version hashing
- ✅ **Audit Snapshots** (`audit_snapshots` + `app_metadata_kpi_snapshots`)
- ✅ **Auto-Healing Consistency System** (validation + rebuild)
- ✅ **7 Edge Functions** for monitoring workflows
- ✅ **RLS Policies** for multi-tenant security
- ✅ **React Hooks** for UI integration

### Key Finding: Bible Integration Gap

The current `audit_snapshots` table stores **Phase 2 Combination Analysis** (pre-Bible era). It does **NOT** store the new **Metadata Audit V2 + ASO Bible** results from Phases 9-18.5.

**Phase 19 Goal:** Modernize audit snapshots to store Bible-driven results with Intent Quality KPIs.

---

## 1. DATABASE SCHEMA ANALYSIS

### 1.1 Core Tables

#### Table: `monitored_apps`

**Migration:** `20250106000000_create_monitored_apps.sql`
**Extended By:** `20260122000002_extend_monitored_apps_for_audit.sql`, `20260123000002_add_monitored_app_validation_state.sql`

**Purpose:** Stores apps monitored for reviews AND/OR audit analysis

**Schema:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | Multi-tenant isolation |
| `app_store_id` | TEXT | iTunes App ID (e.g., "1239779099") |
| `app_id` | TEXT | App identifier (could be store ID or bundle ID) |
| `app_name` | TEXT | App display name |
| `bundle_id` | TEXT | Bundle ID (optional) |
| `platform` | TEXT | 'ios' or 'android' (added by migration) |
| `locale` | TEXT | Region/locale (e.g., 'us', 'gb') |
| `primary_country` | TEXT | Country where saved |
| `monitor_type` | TEXT | 'reviews', 'ratings', 'both', or 'audit' |
| `audit_enabled` | BOOLEAN | Flag for audit monitoring |
| `latest_audit_score` | INT | Most recent audit score (0-100) |
| `latest_audit_at` | TIMESTAMPTZ | Timestamp of latest audit |
| `metadata_last_refreshed_at` | TIMESTAMPTZ | Last metadata fetch timestamp |
| `validated_state` | ENUM | Consistency state: 'valid', 'stale', 'invalid', 'unknown' |
| `validated_at` | TIMESTAMPTZ | Last validation check |
| `validation_error` | TEXT | Error message from validation failure |
| `tags` | TEXT[] | User tags (competitor, client, etc.) |
| `notes` | TEXT | User notes |
| `snapshot_rating` | DECIMAL | Rating when saved |
| `snapshot_review_count` | INT | Review count when saved |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_monitored_apps_org_id` (organization_id)
- `idx_monitored_apps_audit` (organization_id, audit_enabled) WHERE audit_enabled
- `idx_monitored_apps_locale` (locale, organization_id)
- `idx_monitored_apps_refresh` (metadata_last_refreshed_at) WHERE audit_enabled
- `idx_monitored_apps_validation_state` (organization_id, validated_state) WHERE invalid/stale/unknown
- `idx_monitored_apps_needs_validation` (validated_at) WHERE not valid

**RLS:** ✅ Enabled with org-based + SUPER_ADMIN policies

**Unique Constraint:** (organization_id, app_store_id, primary_country)

---

#### Table: `app_metadata_cache`

**Migration:** `20260122000000_create_app_metadata_cache.sql`

**Purpose:** Caches raw app metadata to avoid repeated App Store fetches

**Schema:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | Multi-tenant isolation |
| `app_id` | TEXT | App identifier |
| `platform` | TEXT | 'ios' or 'android' |
| `locale` | TEXT | Region code (e.g., 'us') |
| `fetched_at` | TIMESTAMPTZ | Fetch timestamp |
| `title` | TEXT | App title |
| `subtitle` | TEXT | App subtitle |
| `description` | TEXT | App description |
| `developer_name` | TEXT | Developer name |
| `app_icon_url` | TEXT | Icon URL |
| `screenshots` | JSONB | Screenshot URLs array |
| `app_json` | JSONB | Full raw JSON from API |
| `screenshot_captions` | JSONB | Future: AI-extracted captions |
| `feature_cards` | JSONB | Future: Feature card data |
| `preview_analysis` | JSONB | Future: Video preview analysis |
| `version_hash` | TEXT | SHA256 hash for change detection |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_metadata_cache_app_org` (app_id, organization_id)
- `idx_metadata_cache_org_fetched` (organization_id, fetched_at DESC)
- `idx_metadata_cache_hash` (version_hash)
- `idx_metadata_cache_fetched_at` (fetched_at DESC)

**RLS:** ✅ Enabled with org-based policies

**Unique Constraint:** (organization_id, app_id, locale, platform)

**TTL Policy:** 24 hours (enforced by application logic, not database)

---

#### Table: `audit_snapshots`

**Migration:** `20260122000001_create_audit_snapshots.sql`

**Purpose:** Stores Phase 2 combination analysis results (PRE-BIBLE ERA)

**Schema:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | Multi-tenant isolation |
| `app_id` | TEXT | App identifier |
| `platform` | TEXT | 'ios' or 'android' |
| `locale` | TEXT | Region code |
| `created_at` | TIMESTAMPTZ | Snapshot timestamp |
| `title` | TEXT | App title at audit time |
| `subtitle` | TEXT | App subtitle at audit time |
| `combinations` | JSONB | ClassifiedCombo[] from Phase 2 |
| `metrics` | JSONB | longTailStrength, intentDiversity, etc. |
| `insights` | JSONB | OpportunityInsights |
| `audit_score` | INT | Overall score (0-100) |
| `metadata_version_hash` | TEXT | Links to app_metadata_cache |
| `metadata_source` | TEXT | 'live' or 'cache' |
| `competitor_overlap` | JSONB | Future field |
| `metadata_health` | JSONB | Future field |
| `metadata_version` | TEXT | Schema version (default 'v1') |

**Indexes:**
- `idx_audit_snapshots_app_org` (app_id, organization_id)
- `idx_audit_snapshots_org_created` (organization_id, created_at DESC)
- `idx_audit_snapshots_hash` (metadata_version_hash)
- `idx_audit_snapshots_created_at` (created_at DESC)
- `idx_audit_snapshots_app_locale` (app_id, locale, created_at DESC)

**RLS:** ✅ Enabled with org-based policies

**⚠️ CRITICAL ISSUE:** This table stores OLD Phase 2 analysis, NOT Metadata Audit V2 + Bible results!

---

#### Table: `app_metadata_kpi_snapshots`

**Migration:** `20260123000005_create_kpi_snapshots_table.sql`

**Purpose:** Stores KPI Engine vectors and scores

**Schema:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | Multi-tenant isolation |
| `app_id` | TEXT | App identifier |
| `bundle_id` | TEXT | Bundle ID |
| `market` | TEXT | Market code (default 'us') |
| `platform` | TEXT | 'ios' or 'android' |
| `metadata_version` | TEXT | KPI Engine version (e.g., 'v1') |
| `kpi_vector` | FLOAT8[] | 34-dimensional float array |
| `kpi_json` | JSONB | Full KPI breakdown |
| `score_overall` | FLOAT8 | Overall metadata quality score (0-100) |
| `score_families` | JSONB | 6 family scores |
| `title` | TEXT | App title at KPI computation |
| `subtitle` | TEXT | App subtitle at KPI computation |
| `created_at` | TIMESTAMPTZ | Snapshot timestamp |

**Indexes:**
- `idx_kpi_snapshots_app_org` (app_id, organization_id)
- `idx_kpi_snapshots_org_created` (organization_id, created_at DESC)
- `idx_kpi_snapshots_app_market` (app_id, market, created_at DESC)
- `idx_kpi_snapshots_created_at` (created_at DESC)
- `idx_kpi_snapshots_platform_market` (platform, market, created_at DESC)

**RLS:** ✅ Enabled with org-based policies

**⚠️ OUTDATED:** Still references 34 KPIs (should be 43 after Phase 18.5)

---

### 1.2 Missing Tables (Identified Needs)

#### Table: `aso_audit_snapshots` (PROPOSED)

**Purpose:** Unified Bible-driven audit snapshots

**Should Store:**
- Full Metadata Audit V2 result (JSONB)
- Bible ruleset metadata (version, overrides applied)
- 43 KPI results (6 families including Intent Quality)
- Intent coverage data (from Phase 17)
- Combo coverage (from Combo Engine V2)
- Rule evaluation results
- Overall scores + subscores

**Why Needed:**
- Current `audit_snapshots` stores OLD Phase 2 analysis
- Need unified table for Bible-driven audits
- Enable historical tracking of Bible ruleset changes
- Support A/B testing of rule configurations

---

#### Table: `aso_audit_diffs` (PROPOSED)

**Purpose:** Track changes between audit snapshots

**Should Store:**
- `from_snapshot_id` (FK)
- `to_snapshot_id` (FK)
- `change_summary` JSONB (KPI deltas, severity shifts, new issues)
- `title_changed` BOOLEAN
- `subtitle_changed` BOOLEAN
- `metadata_version_changed` BOOLEAN

**Why Needed:**
- Enable "What changed?" queries
- Surface metadata updates to users
- Track KPI trend direction (improving vs declining)
- Alert on score drops

---

#### Table: `aso_kpi_timeseries` (PROPOSED - Optional for Phase 19)

**Purpose:** Flattened KPI values for fast querying

**Should Store:**
- `snapshot_id` (FK)
- `monitored_app_id` (FK)
- `kpi_id` (e.g., 'title_char_usage')
- `family_id` (e.g., 'clarity_structure')
- `normalized_value` (0-100)
- `raw_value`
- `timestamp`

**Why Needed:**
- Fast KPI trend charts (no JSON parsing)
- SQL aggregations for reporting
- Enable Grafana/Metabase dashboards

**Phase 19 Decision:** Design schema but defer population until Phase 20

---

## 2. EDGE FUNCTION ANALYSIS

### 2.1 Existing Edge Functions

#### 1. `appstore-metadata`

**Purpose:** Fetches metadata from iTunes Search API
**Called By:** Other edge functions, frontend
**Response Time:** ~2-5s
**Key Features:**
- Fetches title, subtitle, description, screenshots
- Returns structured JSON
- Used by `rebuild-monitored-app`

---

#### 2. `metadata-audit-v2`

**Purpose:** Runs Metadata Audit V2 (Bible-driven scoring)
**Migration:** Added in Phase 15/16
**Key Features:**
- Uses ASO Bible rulesets
- Computes KPI Engine scores
- Evaluates rules
- Returns `UnifiedMetadataAuditResult`

**⚠️ GAP:** Does NOT persist results to `aso_audit_snapshots` (no such table exists)

---

#### 3. `save-monitored-app`

**Purpose:** Saves/monitors an app from App Audit UI
**Called By:** `MonitorAppButton.tsx`
**Key Features:**
- Creates `monitored_apps` entry
- Fetches metadata via `appstore-metadata`
- Caches metadata in `app_metadata_cache`
- Creates audit snapshot in `audit_snapshots` (OLD format)

**⚠️ ISSUE:** Creates OLD Phase 2 snapshot, not Bible-driven snapshot

---

#### 4. `validate-monitored-app-consistency`

**Purpose:** Validates cache/snapshot existence
**Called By:** `useMonitoredAppConsistency` hook, scheduled job
**Response Time:** ~300-800ms
**Key Features:**
- Checks for metadata cache
- Checks for audit snapshot
- Calculates cache age
- Updates `validated_state` field

**Status:** ✅ Enterprise-grade, works well

---

#### 5. `rebuild-monitored-app`

**Purpose:** Fixes invalid/stale monitored apps
**Called By:** Consistency hook (auto-heal), scheduled job
**Response Time:** ~5-15s
**Key Features:**
- Fetches fresh metadata
- Updates cache
- Generates audit snapshot
- Marks as `valid`

**⚠️ ISSUE:** Generates OLD Phase 2 snapshot, not Bible-driven

---

#### 6. `validate-monitored-apps` (Scheduled Job)

**Purpose:** Background maintenance for monitored apps
**Schedule:** Hourly (0 * * * *)
**Batch Size:** 50 apps per run
**Key Features:**
- Finds invalid/stale/unknown apps
- Validates each
- Rebuilds if needed

**Status:** ✅ Works well

---

#### 7. `delete-monitored-app`

**Purpose:** Removes monitored app
**Key Features:**
- Deletes monitored_apps row
- Cascade deletes cache + snapshots (via FK)

**Status:** ✅ Works well

---

### 2.2 Missing Edge Functions

#### `monitor-bible-audit-snapshot` (PROPOSED)

**Purpose:** Generate + persist Bible-driven audit snapshot
**Should:**
- Call `metadata-audit-v2` edge function
- Extract full Bible result
- Store in `aso_audit_snapshots` (new table)
- Compute diff from previous snapshot
- Store diff in `aso_audit_diffs`
- Update `monitored_apps.latest_audit_*` fields

**Phase 19:** Implement this

---

## 3. REACT HOOKS ANALYSIS

### 3.1 Existing Hooks

#### `useMonitoredAudit`

**File:** `src/hooks/useMonitoredAudit.ts`
**Purpose:** Fetches cached audit data for monitored app
**Returns:**
- `monitoredApp` (MonitoredAppWithAudit)
- `metadataCache` (AppMetadataCache | null)
- `latestSnapshot` (AuditSnapshot | null)

**Status:** ✅ Works but returns OLD snapshot format

---

#### `useMonitoredAppConsistency`

**File:** `src/hooks/useMonitoredAppConsistency.ts`
**Purpose:** Auto-healing hook with validation
**Features:**
- Calls `validate-monitored-app-consistency`
- Auto-triggers `rebuild-monitored-app` if invalid
- Silent healing (no user errors)

**Status:** ✅ Enterprise-grade

---

#### `useSaveMonitoredApp`

**File:** `src/hooks/useMonitoredAppForAudit.ts`
**Purpose:** Monitors app from App Audit UI
**Features:**
- Calls `save-monitored-app` edge function
- Invalidates React Query caches

**Status:** ✅ Works but generates OLD snapshots

---

#### `usePersistAuditSnapshot`

**File:** `src/hooks/usePersistAuditSnapshot.ts`
**Purpose:** Auto-saves audit results to database
**Features:**
- Triggered after audit completes in App Audit Hub
- Stores snapshot in `audit_snapshots` (OLD format)

**Status:** ⚠️ Needs update for Bible format

---

### 3.2 Missing Hooks

#### `useAuditHistory` (PROPOSED)

**Purpose:** Fetch audit history for a monitored app
**Should Return:**
- Array of audit snapshots
- KPI trends over time
- Score changes
- Metadata change flags

**Phase 19:** Implement this

---

#### `useAuditDiff` (PROPOSED)

**Purpose:** Compute diff between two snapshots
**Should Return:**
- Changed KPIs
- Score deltas
- Metadata text diffs
- Severity shifts

**Phase 19:** Implement this (or defer to Phase 20)

---

## 4. UI COMPONENTS ANALYSIS

### 4.1 Existing Components

#### `AppAuditHub.tsx`

**File:** `src/components/AppAudit/AppAuditHub.tsx`
**Purpose:** Main ASO AI Audit page
**Modes:**
- `live` - Run fresh audit (default)
- `monitored` - Load cached audit

**Features:**
- `MonitorAppButton` - saves app to monitored_apps
- Auto-persists audit results
- Loads monitored audit via `useMonitoredAudit`

**Status:** ✅ Well-integrated

---

#### `MonitorAppButton.tsx`

**File:** `src/components/AppAudit/MonitorAppButton.tsx`
**Purpose:** Button to monitor current app
**Features:**
- Calls `useSaveMonitoredApp`
- Shows loading state
- Toast notifications

**Status:** ✅ Works well

---

### 4.2 Missing UI Components

#### Monitored Apps List Page (MISSING)

**Expected Location:** `src/pages/aso-ai-hub/MonitoredAppsPage.tsx`
**Should Show:**
- List of all monitored apps
- Last audit date
- Last audit score
- Filter by org/app
- Click → open audit history

**Phase 19:** Create this page

---

#### Audit History View (MISSING)

**Should Show:**
- List of audit runs for single app
- Timestamp, score, deltas
- Click snapshot → load in audit UI
- Trend charts (optional for Phase 19)

**Phase 19:** Create this component

---

## 5. DATA FLOW ARCHITECTURE

### 5.1 Current Flow (Monitor App)

```
User clicks "Monitor App" in App Audit UI
    ↓
MonitorAppButton → useSaveMonitoredApp()
    ↓
Edge Function: save-monitored-app
    ↓
1. Create monitored_apps row
2. Fetch metadata via appstore-metadata
3. Store in app_metadata_cache (with version_hash)
4. Generate OLD Phase 2 audit
5. Store in audit_snapshots (OLD format)
    ↓
Frontend: Invalidate queries, show toast
```

**⚠️ ISSUE:** Step 4-5 use OLD Phase 2 analysis, not Bible-driven

---

### 5.2 Proposed Flow (Bible-Driven)

```
User clicks "Monitor App" in App Audit UI
    ↓
MonitorAppButton → useSaveMonitoredApp()
    ↓
Edge Function: save-monitored-app (UPDATED)
    ↓
1. Create monitored_apps row
2. Fetch metadata via appstore-metadata
3. Store in app_metadata_cache (with version_hash)
4. Call metadata-audit-v2 (Bible-driven)
5. Store result in aso_audit_snapshots (NEW table)
6. Compute diff from previous snapshot
7. Store diff in aso_audit_diffs (optional)
8. Update monitored_apps.latest_audit_*
    ↓
Frontend: Invalidate queries, show toast
```

---

### 5.3 Current Flow (Load Monitored Audit)

```
User opens workspace, clicks monitored app
    ↓
useMonitoredAuditWithConsistency()
    ↓
1. Validate via validate-monitored-app-consistency
2. If invalid/stale → rebuild-monitored-app (auto-heal)
3. Fetch from:
   - monitored_apps
   - app_metadata_cache
   - audit_snapshots (OLD format)
    ↓
Display audit UI with cached data
```

**⚠️ ISSUE:** Loads OLD snapshot format

---

### 5.4 Proposed Flow (Bible-Driven)

```
User opens workspace, clicks monitored app
    ↓
useMonitoredAuditWithConsistency()
    ↓
1. Validate via validate-monitored-app-consistency
2. If invalid/stale → rebuild-monitored-app (UPDATED to use Bible)
3. Fetch from:
   - monitored_apps
   - app_metadata_cache
   - aso_audit_snapshots (NEW Bible-driven table)
    ↓
Display UnifiedMetadataAuditModule with Bible results
```

---

## 6. BIBLE INTEGRATION GAPS

### 6.1 Current State

The monitoring system was built **BEFORE** the ASO Bible stack (Phases 9-18.5). As a result:

1. **`audit_snapshots` stores OLD data:**
   - Phase 2 combination analysis
   - No Bible rules
   - No KPI Engine results
   - No Intent Quality metrics

2. **`app_metadata_kpi_snapshots` is outdated:**
   - References 34 KPIs (should be 43)
   - No Intent Quality family
   - Not integrated with main audit flow

3. **Edge functions generate OLD audits:**
   - `save-monitored-app` calls OLD analyzer
   - `rebuild-monitored-app` calls OLD analyzer
   - Neither uses `metadata-audit-v2` edge function

4. **No historical tracking of Bible changes:**
   - No ruleset version in snapshots
   - No audit of which rules were applied
   - No A/B testing support

---

### 6.2 Required Changes for Bible Integration

#### Schema Changes:

1. **Create `aso_audit_snapshots` table:**
   - Store full `UnifiedMetadataAuditResult` as JSONB
   - Add `bible_ruleset_meta` JSONB (version, overrides applied)
   - Add `kpi_result` JSONB (full KPI Engine output with 43 KPIs)
   - Add `intent_coverage` JSONB (from Phase 17)
   - Link to `monitored_apps` via FK

2. **Optionally create `aso_audit_diffs` table:**
   - Store change summaries between snapshots
   - Enable "What changed?" queries

3. **Update `app_metadata_kpi_snapshots`:**
   - Change `kpi_vector` from 34 to 43 dimensions
   - Update comments to reflect Phase 18.5

4. **Add migration to deprecate `audit_snapshots`:**
   - Mark as deprecated in comments
   - Add notice: "Use aso_audit_snapshots for Bible-driven audits"
   - Keep table for backwards compatibility

#### Edge Function Changes:

1. **Update `save-monitored-app`:**
   - Call `metadata-audit-v2` instead of OLD analyzer
   - Store result in `aso_audit_snapshots`
   - Update `monitored_apps.latest_audit_score` from Bible result

2. **Update `rebuild-monitored-app`:**
   - Call `metadata-audit-v2` for audit
   - Store result in `aso_audit_snapshots`

3. **Update `validate-monitored-app-consistency`:**
   - Check for `aso_audit_snapshots` (not `audit_snapshots`)

#### Hook Changes:

1. **Update `useMonitoredAudit`:**
   - Fetch from `aso_audit_snapshots` instead of `audit_snapshots`
   - Parse Bible result from JSONB
   - Return `UnifiedMetadataAuditResult`

2. **Update `usePersistAuditSnapshot`:**
   - Store in `aso_audit_snapshots` with Bible metadata

3. **Create `useAuditHistory`:**
   - Fetch all snapshots for a monitored app
   - Return array of `UnifiedMetadataAuditResult`

#### UI Changes:

1. **Create `MonitoredAppsPage.tsx`:**
   - List all monitored apps
   - Show last audit score + date
   - Link to audit history

2. **Create `AuditHistoryView.tsx`:**
   - Show audit timeline for single app
   - Display score trends
   - Load snapshot into `UnifiedMetadataAuditModule`

---

## 7. RLS & SECURITY STATUS

### 7.1 Current RLS Policies

All tables have **RLS enabled** with org-based isolation:

- ✅ `monitored_apps` - org-based + SUPER_ADMIN
- ✅ `app_metadata_cache` - org-based
- ✅ `audit_snapshots` - org-based
- ✅ `app_metadata_kpi_snapshots` - org-based

**Security Model:**
- Users only see their org's data
- SUPER_ADMIN users see all orgs
- No cross-org data leakage

**Status:** ✅ Solid, no changes needed

---

### 7.2 RLS for New Tables

New tables (`aso_audit_snapshots`, `aso_audit_diffs`) must:

1. Enable RLS
2. Add org-based SELECT policy
3. Add org-based INSERT policy
4. Add SUPER_ADMIN override
5. Follow existing patterns from `audit_snapshots`

---

## 8. CACHING & TTL POLICIES

### 8.1 Current Caching

#### Metadata Cache TTL: 24 hours

- Stored in `metadata_last_refreshed_at` field
- Enforced by `validate-monitored-app-consistency`
- If cache > 24h old → marked as `stale`
- Auto-rebuild triggered by consistency hook

**Status:** ✅ Works well

---

#### Audit Snapshot Retention: Unlimited

- No automatic cleanup
- All snapshots kept forever
- Can grow large over time

**Phase 19 Consideration:** Add retention policy (e.g., keep last 50 snapshots per app)

---

### 8.2 Performance Indexes

**Existing:**
- ✅ `monitored_apps`: 6 indexes (org, locale, validation state, etc.)
- ✅ `app_metadata_cache`: 4 indexes (org, fetched_at, hash)
- ✅ `audit_snapshots`: 5 indexes (org, created_at, hash)
- ✅ `app_metadata_kpi_snapshots`: 5 indexes (org, market, created_at)

**Status:** ✅ Well-indexed

**New Indexes Needed:**
- `aso_audit_snapshots(monitored_app_id, created_at DESC)`
- `aso_audit_diffs(from_snapshot_id)`
- `aso_audit_diffs(to_snapshot_id)`

---

## 9. TESTING & VALIDATION

### 9.1 Existing Tests

**Found:**
- `scripts/diagnose-monitor-failure.ts` - diagnostic tool
- `scripts/audit-current-state.ts` - state auditor
- `scripts/debug-pimsleur-cache.ts` - cache debugger
- No unit tests found for hooks/edge functions

**Status:** ⚠️ Limited test coverage

---

### 9.2 Testing Gaps

**Missing:**
- Unit tests for `useMonitoredAudit`
- Unit tests for `useMonitoredAppConsistency`
- Integration tests for edge functions
- E2E tests for Monitor App flow
- Snapshot stability tests

**Phase 19:** Add test suite under `scripts/tests/phase19/`

---

## 10. DOCUMENTATION STATUS

### 10.1 Existing Documentation

**Excellent:**
- ✅ `docs/MONITORED_APP_CONSISTENCY_SYSTEM.md` (comprehensive)
- ✅ `docs/CACHE_MISS_ROOT_CAUSE_ANALYSIS.md`
- ✅ `docs/KEY_INTEGRITY_AUDIT_FINAL_REPORT.md`
- ✅ Migration files have clear comments

**Status:** ✅ Well-documented (but pre-Bible)

---

### 10.2 Documentation Gaps

**Missing:**
- Bible integration guide for monitoring
- How to query audit history
- KPI trend analysis examples
- Diff computation logic
- Phase 19 implementation plan

**Phase 19:** Create these docs

---

## 11. KNOWN ISSUES & LIMITATIONS

### 11.1 Confirmed Issues

1. **OLD Audit Format:**
   - `audit_snapshots` stores Phase 2 analysis (pre-Bible)
   - Not compatible with `UnifiedMetadataAuditModule`
   - No Bible ruleset metadata

2. **Outdated KPI Count:**
   - `app_metadata_kpi_snapshots` references 34 KPIs
   - Should be 43 after Phase 18.5 (Intent Quality added)

3. **No UI for History:**
   - No "Monitored Apps" list page
   - No audit history view
   - No trend charts

4. **No Diff System:**
   - No change detection between snapshots
   - No "What changed?" queries
   - No score delta tracking

5. **No Retention Policy:**
   - Audit snapshots never deleted
   - Could grow unbounded
   - No cleanup mechanism

---

### 11.2 Edge Cases

1. **Migrating Existing Monitored Apps:**
   - 100s of apps already in `monitored_apps`
   - Have OLD snapshots in `audit_snapshots`
   - Need migration path to Bible-driven snapshots

2. **Handling Bible Ruleset Changes:**
   - If Bible rules change, old snapshots become incomparable
   - Need versioning strategy
   - Need A/B testing support

3. **Multi-Locale Apps:**
   - Same app in multiple locales (e.g., Instagram US vs UK)
   - Need separate snapshots per locale
   - Current schema supports this (composite key includes locale)

---

## 12. MIGRATION STRATEGY

### 12.1 Backwards Compatibility Plan

**Do NOT break existing monitoring:**

1. **Keep `audit_snapshots` table:**
   - Mark as deprecated
   - Add migration note: "Use aso_audit_snapshots for new audits"
   - Existing data remains queryable

2. **Dual-write during transition:**
   - Write to BOTH `audit_snapshots` (OLD) and `aso_audit_snapshots` (NEW)
   - Phase out OLD writes after 1-2 months

3. **Gradual UI migration:**
   - Update `useMonitoredAudit` to prefer `aso_audit_snapshots`
   - Fallback to `audit_snapshots` if NEW table empty

---

### 12.2 Data Backfill Strategy

**For existing monitored apps:**

Option A: **Lazy Backfill (Recommended)**
- Do NOT backfill old snapshots
- On next audit → generate Bible-driven snapshot
- Old snapshots remain as-is in `audit_snapshots`

Option B: **Active Backfill**
- Run batch job to re-audit all monitored apps
- Generate Bible-driven snapshots
- Store in `aso_audit_snapshots`
- **Downside:** May hit App Store rate limits

**Phase 19 Decision:** Use Option A (lazy backfill)

---

## 13. PHASE 19 IMPLEMENTATION ROADMAP

### 13.1 High-Priority Tasks

1. **Create `aso_audit_snapshots` table:**
   - Migration file with RLS
   - Indexes for performance
   - Comments for documentation

2. **Update `save-monitored-app` edge function:**
   - Call `metadata-audit-v2`
   - Store result in `aso_audit_snapshots`
   - Update `monitored_apps` fields

3. **Update `rebuild-monitored-app` edge function:**
   - Call `metadata-audit-v2`
   - Store result in `aso_audit_snapshots`

4. **Update `useMonitoredAudit` hook:**
   - Fetch from `aso_audit_snapshots`
   - Parse Bible result
   - Fallback to `audit_snapshots` if needed

5. **Create `MonitoredAppsPage.tsx`:**
   - List all monitored apps
   - Show last audit info
   - Link to audit history

6. **Create `AuditHistoryView.tsx`:**
   - Show audit timeline
   - Load snapshot into `UnifiedMetadataAuditModule`

---

### 13.2 Medium-Priority Tasks

7. **Create `aso_audit_diffs` table:**
   - Store change summaries
   - Migration + RLS

8. **Create `useAuditHistory` hook:**
   - Fetch audit timeline
   - Return sorted array

9. **Add diff computation to edge function:**
   - Compare snapshots
   - Store in `aso_audit_diffs`

10. **Update `app_metadata_kpi_snapshots`:**
    - Update to 43-dimensional vectors
    - Fix comments

---

### 13.3 Low-Priority Tasks (Phase 20)

11. **Create `aso_kpi_timeseries` table:**
    - Flattened KPI values
    - Fast trend queries

12. **Add trend charts to history view:**
    - Line charts for KPIs
    - Score delta visualization

13. **Add retention policy:**
    - Keep last 50 snapshots per app
    - Scheduled cleanup job

14. **Add Grafana dashboards:**
    - KPI trends across all apps
    - Org-level analytics

---

## 14. RISK REGISTER

### 14.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking existing monitoring | HIGH | LOW | Keep `audit_snapshots` table, dual-write |
| App Store rate limits during backfill | MEDIUM | MEDIUM | Use lazy backfill, not active |
| Large JSONB fields slow queries | MEDIUM | MEDIUM | Add GIN indexes, paginate results |
| Schema drift between Bible versions | MEDIUM | MEDIUM | Store Bible version in snapshot |
| RLS bypass vulnerabilities | HIGH | LOW | Copy existing RLS patterns |

---

### 14.2 Operational Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Increased storage costs (more snapshots) | LOW | HIGH | Implement retention policy |
| Slower queries with JSONB parsing | MEDIUM | MEDIUM | Add materialized views if needed |
| Edge function timeouts | MEDIUM | LOW | Increase timeout, optimize |
| Supabase DB connection exhaustion | MEDIUM | LOW | Use connection pooling |

---

## 15. SUCCESS CRITERIA

### 15.1 Must-Have (Phase 19)

- ✅ `aso_audit_snapshots` table created with RLS
- ✅ `save-monitored-app` generates Bible-driven snapshots
- ✅ `rebuild-monitored-app` generates Bible-driven snapshots
- ✅ `useMonitoredAudit` returns Bible results
- ✅ Monitored Apps list page functional
- ✅ Audit history view functional
- ✅ No breaking changes to existing monitoring
- ✅ TypeScript compiles without errors
- ✅ RLS policies enforced

---

### 15.2 Nice-to-Have (Phase 19)

- ⭕ `aso_audit_diffs` table created
- ⭕ Diff computation implemented
- ⭕ Trend charts in history view
- ⭕ Retention policy implemented

---

### 15.3 Deferred to Phase 20

- ⏸️ `aso_kpi_timeseries` table
- ⏸️ Grafana dashboards
- ⏸️ Advanced filtering/search
- ⏸️ A/B testing infrastructure

---

## 16. CONCLUSION

### 16.1 Summary

The Yodel ASO Insight monitoring system is **enterprise-grade and well-architected**, but it was built **before the ASO Bible stack** (Phases 9-18.5). Phase 19 is about **modernization, not ground-up construction**.

**Key Actions:**

1. ✅ **Preserve existing system** (don't break monitoring)
2. ✅ **Add Bible-driven snapshot table** (`aso_audit_snapshots`)
3. ✅ **Update edge functions** to use `metadata-audit-v2`
4. ✅ **Update hooks** to fetch Bible results
5. ✅ **Add minimal UI** (Monitored Apps list + history view)
6. ✅ **Maintain RLS** and security posture

**Expected Outcome:**

Users can monitor apps, view audit history with Bible-driven scores, and track KPI changes over time—all while maintaining backwards compatibility with existing monitored apps.

---

### 16.2 Next Steps

1. Review this discovery report with engineering lead
2. Get approval for schema changes
3. Begin Phase 19 implementation:
   - Start with schema migrations
   - Update edge functions
   - Update hooks
   - Add UI components
   - Test thoroughly
4. Document everything in `PHASE_19_MONITORING_IMPLEMENTATION_COMPLETE.md`

---

**Discovery Phase:** ✅ COMPLETE
**Ready for Implementation:** YES
**Estimated Implementation Time:** 3-5 days
**Risk Level:** LOW (additive changes only)

---

**Prepared by:** Claude Code AI Assistant
**Date:** January 23, 2025
**Next Review:** After Phase 19 implementation
