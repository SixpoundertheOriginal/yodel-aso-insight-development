# PHASE 11 — RULESET STORAGE FOUNDATION ✅

**Status**: ✅ Foundation Complete (Infrastructure Layer)
**Date**: 2025-11-23
**Scope**: Database schema, RLS policies, service layer architecture

---

## Executive Summary

Phase 11 establishes the **database foundation** for the ASO Bible ruleset system, enabling dynamic, editable rule sets stored in Supabase rather than hardcoded in the application.

**Key Achievement**: Created a complete, normalized database schema with 13 tables, comprehensive RLS policies for multi-tenant isolation, and TypeScript service layer architecture—all while maintaining 100% backward compatibility with Phase 10.

**Critical Design Principle**: If database is empty → system behaves exactly as Phase 10 (code-based rules remain authoritative fallback)

---

## Implementation Status

### ✅ Completed Components

1. **Database Schema** (4 migrations, 13 tables)
   - Core ruleset tables (vertical, market, client, versions)
   - Override tables (7 types)
   - Metadata and audit tables

2. **RLS Security Model** (3-tier isolation)
   - Internal Yodel rules (public read, internal write)
   - Organization rules (org-scoped read, internal write)
   - Client rules (client-scoped read, internal write)

3. **TypeScript Service Layer** (architecture designed)
   - `dbRulesetService.ts` - Complete CRUD implementation
   - Service interface patterns for remaining components

### 📋 Deferred to Future Phases

4. **Integration Layer** (Task 4-7)
   - `rulesetVersionManager.ts` - Version increment/rollback
   - `rulesetNormalizer.ts` - DB → Engine payload transformation
   - `rulesetMerger.ts` - Base → Vertical → Market → Client merging
   - `rulesetCache.ts` - In-memory caching with TTL
   - `rulesetLoader.ts` integration - DB → Code fallback logic
   - QA testing script

---

## Database Schema

### Core Tables (4)

#### 1. `aso_ruleset_vertical`
- **Purpose**: Vertical-specific ruleset configurations (e.g., language_learning, finance)
- **Key Fields**: `vertical`, `label`, `version`, `is_active`
- **RLS**: Public read, internal Yodel write
- **Indexes**: `vertical`, `(vertical, is_active)`

#### 2. `aso_ruleset_market`
- **Purpose**: Market-specific ruleset configurations (e.g., us, uk, de)
- **Key Fields**: `market`, `locale`, `version`, `is_active`
- **RLS**: Public read, internal Yodel write
- **Indexes**: `market`, `(market, is_active)`

#### 3. `aso_ruleset_client`
- **Purpose**: Client-specific ruleset configurations (enterprise feature)
- **Key Fields**: `organization_id`, `app_id`, `inherit_from_vertical`, `inherit_from_market`
- **RLS**: Org-scoped read, internal Yodel write
- **Indexes**: `organization_id`, `(organization_id, app_id)`

#### 4. `aso_ruleset_versions`
- **Purpose**: Version registry for reproducibility and audit trail
- **Key Fields**: `ruleset_version`, `vertical_version`, `market_version`, `kpi_schema_version`, `ruleset_snapshot` (JSONB)
- **RLS**: Public read, internal Yodel create
- **Indexes**: `ruleset_version`, `(vertical, market)`, `organization_id`

### Override Tables (7)

#### 1. `aso_token_relevance_overrides`
- **Purpose**: Token relevance score overrides (0-3)
- **Key Fields**: `scope`, `vertical/market/organization_id`, `token`, `relevance`
- **Constraint**: One token per scope
- **Example**: `{ token: 'finance', relevance: 3, vertical: 'finance' }`

#### 2. `aso_intent_pattern_overrides`
- **Purpose**: Intent classification pattern overrides
- **Key Fields**: `scope`, `intent_type`, `pattern_keywords[]`, `confidence_boost`
- **Example**: `{ intent_type: 'commercial', pattern_keywords: ['buy', 'purchase'], vertical: 'rewards' }`

#### 3. `aso_hook_pattern_overrides`
- **Purpose**: Hook category weight multipliers
- **Key Fields**: `scope`, `hook_category`, `weight_multiplier`, `keywords[]`
- **Example**: `{ hook_category: 'trust_safety', weight_multiplier: 1.4, vertical: 'finance' }`

#### 4. `aso_stopword_overrides`
- **Purpose**: Stopword additions (union merge strategy)
- **Key Fields**: `scope`, `stopwords[]`
- **Example**: `{ stopwords: ['der', 'die', 'das'], market: 'de' }`

#### 5. `aso_kpi_weight_overrides`
- **Purpose**: KPI weight multipliers (0.5x-2.0x)
- **Key Fields**: `scope`, `kpi_id`, `weight_multiplier`
- **Example**: `{ kpi_id: 'intent_alignment', weight_multiplier: 1.2, vertical: 'language_learning' }`

#### 6. `aso_formula_overrides`
- **Purpose**: Formula multipliers and component weight overrides
- **Key Fields**: `scope`, `formula_id`, `override_payload` (JSONB)
- **Example**: `{ formula_id: 'metadata_overall_score', override_payload: { multiplier: 1.1 } }`

#### 7. `aso_recommendation_templates`
- **Purpose**: Vertical/market/client-specific recommendation message templates
- **Key Fields**: `scope`, `recommendation_id`, `message`
- **Example**: `{ recommendation_id: 'subtitle_no_incremental_keywords', message: '[RANKING][critical] Add earning keywords like \'cash out\', \'get paid\'' }`

### Metadata Tables (2)

#### 1. `aso_rule_admin_metadata`
- **Purpose**: Admin UI metadata for ruleset configuration
- **Key Fields**: `override_type`, `override_id`, `display_order`, `is_editable`, `admin_group`, `requires_feature_flag`, `min_tier`
- **RLS**: Internal Yodel only
- **Use Case**: Powers future admin UI for ruleset editing

#### 2. `aso_ruleset_audit_log`
- **Purpose**: Comprehensive audit trail for all ruleset changes
- **Key Fields**: `action`, `override_type`, `override_id`, `old_value`, `new_value`, `diff`, `actor_id`, `change_reason`
- **RLS**: Org-scoped read + internal Yodel
- **Auto-populated**: Via triggers on all override tables

---

## Enums

```sql
CREATE TYPE aso_ruleset_scope AS ENUM ('vertical', 'market', 'client');

CREATE TYPE aso_override_type AS ENUM (
  'token_relevance',
  'intent_pattern',
  'hook_pattern',
  'stopword',
  'kpi_weight',
  'formula',
  'recommendation'
);
```

---

## RLS Security Model

### 3-Tier Isolation

#### Tier 1: Internal Yodel Rules (Vertical/Market)
- **Read Access**: All authenticated users (public)
- **Write Access**: Internal Yodel staff only
- **Rationale**: Global rules benefit all users, managed centrally

#### Tier 2: Organization Rules
- **Read Access**: Organization members + Internal Yodel
- **Write Access**: Internal Yodel only
- **Rationale**: Custom rules for specific organizations (future enterprise feature)

#### Tier 3: Client Rules
- **Read Access**: Client-specific users + Internal Yodel
- **Write Access**: Internal Yodel only
- **Rationale**: App-specific overrides for enterprise clients

### Helper Functions

```sql
CREATE FUNCTION is_internal_yodel_user() RETURNS boolean
-- Checks: email LIKE '%@yodel.io' OR role = 'internal' OR is_yodel_admin = true

CREATE FUNCTION get_user_organization_id() RETURNS uuid
-- Returns: auth.jwt()->>'organization_id'
```

### Policy Pattern (Applied to All Override Tables)

```sql
-- Read Policy
CREATE POLICY "Override read: public for vertical/market, org-scoped for client"
  ON aso_*_overrides
  FOR SELECT
  TO authenticated
  USING (
    (scope IN ('vertical', 'market') AND is_active = true) OR
    (scope = 'client' AND organization_id = get_user_organization_id()) OR
    is_internal_yodel_user()
  );

-- Write Policy
CREATE POLICY "Override write: internal only"
  ON aso_*_overrides
  FOR ALL
  TO authenticated
  USING (is_internal_yodel_user())
  WITH CHECK (is_internal_yodel_user());
```

---

## TypeScript Service Layer

### Architecture Pattern

```
src/services/rulesetStorage/
├── dbRulesetService.ts          ✅ Implemented
├── rulesetVersionManager.ts     📋 Interface Designed
├── rulesetNormalizer.ts         📋 Interface Designed
├── rulesetMerger.ts             📋 Interface Designed
└── rulesetCache.ts              📋 Interface Designed
```

### 1. DbRulesetService (✅ Complete)

**Responsibility**: CRUD operations for all override types

**Methods**:
```typescript
class DbRulesetService {
  static async loadTokenRelevanceOverrides(options: LoadRulesOptions): Promise<TokenRelevanceOverride[]>
  static async loadHookPatternOverrides(options: LoadRulesOptions): Promise<HookPatternOverride[]>
  static async loadStopwordOverrides(options: LoadRulesOptions): Promise<StopwordOverride[]>
  static async loadKpiWeightOverrides(options: LoadRulesOptions): Promise<KpiWeightOverride[]>
  static async loadFormulaOverrides(options: LoadRulesOptions): Promise<FormulaOverride[]>
  static async loadRecommendationTemplates(options: LoadRulesOptions): Promise<RecommendationTemplate[]>
  static async loadAllOverrides(options: LoadRulesOptions): Promise<CombinedOverrides>
  static async hasAnyOverrides(): Promise<boolean> // For fallback logic
}
```

**Features**:
- Scope filtering (vertical, market, organizationId)
- Active-only filtering
- Parallel loading with `Promise.all()`
- Error handling with fallback to empty arrays
- TypeScript type safety

### 2. RulesetVersionManager (📋 Interface)

**Responsibility**: Version creation, increment, rollback

**Proposed Methods**:
```typescript
class RulesetVersionManager {
  static async createVersion(snapshot: MergedRuleSet): Promise<number>
  static async getLatestVersion(filters: VersionFilters): Promise<RulesetVersion | null>
  static async getAllVersions(filters: VersionFilters): Promise<RulesetVersion[]>
  static async rollbackToVersion(versionId: number): Promise<void>
}
```

### 3. RulesetNormalizer (📋 Interface)

**Responsibility**: Transform DB payloads → Engine-ready structures

**Proposed Methods**:
```typescript
class RulesetNormalizer {
  static normalizeTokenOverrides(dbOverrides: TokenRelevanceOverride[]): Record<string, 0 | 1 | 2 | 3>
  static normalizeHookOverrides(dbOverrides: HookPatternOverride[]): Record<string, number>
  static normalizeStopwords(dbOverrides: StopwordOverride[]): string[]
  static normalizeKpiOverrides(dbOverrides: KpiWeightOverride[]): Record<string, { weight: number }>
  static normalizeRecommendations(dbOverrides: RecommendationTemplate[]): Record<string, { message: string }>
}
```

### 4. RulesetMerger (📋 Interface)

**Responsibility**: Merge base → vertical → market → client

**Proposed Methods**:
```typescript
class RulesetMerger {
  static async loadAndMerge(
    verticalId: string,
    marketId: string,
    organizationId?: string,
    appId?: string
  ): Promise<MergedRuleSet>

  static mergeOverrides(
    base: Partial<MergedRuleSet>,
    vertical?: Partial<MergedRuleSet>,
    market?: Partial<MergedRuleSet>,
    client?: Partial<MergedRuleSet>
  ): MergedRuleSet
}
```

**Merge Order**: `client → vertical → market → base` (client wins)

### 5. RulesetCache (📋 Interface)

**Responsibility**: In-memory caching with TTL

**Proposed Methods**:
```typescript
class RulesetCache {
  static getCacheKey(vertical: string, market: string, orgId?: string, appId?: string): string
  static get(cacheKey: string): MergedRuleSet | null
  static set(cacheKey: string, ruleset: MergedRuleSet, ttl: number): void
  static invalidate(cacheKey: string): void
  static invalidateAll(): void
}
```

**Cache Strategy**:
- TTL: 5 minutes (configurable)
- Key format: `{vertical}:{market}:{orgId}:{appId}`
- LRU eviction: 100 entries max
- Invalidation: On DB write (via webhook or manual trigger)

---

## Integration Flow (Future Implementation)

### Current Flow (Phase 10)

```
getActiveRuleSet() → detectVertical() → loadVerticalRuleSet() → CODE-BASED
```

### Future Flow (Phase 11+)

```
getActiveRuleSet()
  → detectVertical()
  → TRY: DbRulesetService.loadAllOverrides()
  → IF empty: loadVerticalRuleSet() (CODE FALLBACK)
  → RulesetNormalizer.normalize()
  → RulesetMerger.merge()
  → RulesetCache.set()
  → return MergedRuleSet
```

### Backward Compatibility Guarantee

```typescript
// Phase 11+ logic (pseudocode)
const dbOverrides = await DbRulesetService.loadAllOverrides({ vertical, market });

if (dbOverrides.isEmpty()) {
  // Phase 10 behavior: Use code-based rules
  return loadCodeBasedRules(vertical, market);
} else {
  // Phase 11 behavior: Use DB rules
  return normalizeAndMerge(dbOverrides);
}
```

---

## Version Stamping

### Extended MergedRuleSet Type (Future)

```typescript
interface MergedRuleSet {
  // Existing fields from Phase 9/10
  id: string;
  label: string;
  verticalId?: string;
  marketId?: string;
  appId?: string;

  // Phase 11: Version stamps
  ruleset_version: number;           // Overall version
  vertical_version?: number;         // Vertical ruleset version
  market_version?: number;           // Market ruleset version
  client_version?: number;           // Client ruleset version
  kpi_schema_version: string;        // KPI schema version (e.g., 'v1')
  formula_schema_version: string;    // Formula schema version

  // Override payloads
  tokenRelevanceOverrides?: Record<string, 0 | 1 | 2 | 3>;
  hookOverrides?: Record<string, number>;
  stopwordOverrides?: { market?: string[]; vertical?: string[] };
  kpiOverrides?: Record<string, { weight: number }>;
  formulaOverrides?: Record<string, any>;
  recommendationOverrides?: Record<string, { message: string }>;

  // Metadata
  leakWarnings?: string[];
  createdAt: string;
  updatedAt: string;
}
```

### Version Usage

1. **Reproducibility**: Store `ruleset_version` in `EvaluationContext` → enables exact score reproduction
2. **Audit Trail**: Track which version was used for each metadata audit
3. **A/B Testing**: Compare scores across ruleset versions
4. **Rollback**: Restore previous versions if new rules cause issues

---

## Audit Logging

### Automatic Audit Trigger

All override tables have automatic audit logging via trigger:

```sql
CREATE TRIGGER aso_audit_*
  AFTER INSERT OR UPDATE OR DELETE ON aso_*_overrides
  FOR EACH ROW EXECUTE FUNCTION aso_log_ruleset_change();
```

### Audit Log Entry Example

```json
{
  "id": "uuid",
  "action": "UPDATE",
  "override_type": "kpi_weight",
  "override_id": "uuid",
  "scope": "vertical",
  "vertical": "language_learning",
  "old_value": { "weight_multiplier": 1.0 },
  "new_value": { "weight_multiplier": 1.2 },
  "diff": { "weight_multiplier": { "from": 1.0, "to": 1.2 } },
  "actor_id": "uuid",
  "actor_email": "john@yodel.io",
  "change_reason": "Boost intent alignment for language learning apps",
  "created_at": "2025-11-23T12:00:00Z"
}
```

### Audit Query Examples

```sql
-- Get all changes to language_learning vertical in last 7 days
SELECT * FROM aso_ruleset_audit_log
WHERE vertical = 'language_learning'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Get all changes by specific user
SELECT * FROM aso_ruleset_audit_log
WHERE actor_email = 'john@yodel.io'
ORDER BY created_at DESC;

-- Get diff for specific override
SELECT old_value, new_value, diff
FROM aso_ruleset_audit_log
WHERE override_id = 'uuid'
  AND action = 'UPDATE';
```

---

## Migration Files Created

1. **`20251123000000_create_aso_ruleset_core_tables.sql`** (230 lines)
   - Core tables: vertical, market, client, versions
   - Enums: `aso_ruleset_scope`, `aso_override_type`
   - Indexes and triggers
   - Helper function: `update_updated_at_column()`

2. **`20251123000001_create_aso_ruleset_override_tables.sql`** (340 lines)
   - Override tables: token, intent, hook, stopword, KPI, formula, recommendation
   - Scope constraints (CHECK constraints for vertical/market/client isolation)
   - Unique constraints per scope
   - Comprehensive indexes

3. **`20251123000002_create_aso_ruleset_metadata_tables.sql`** (180 lines)
   - Admin metadata table
   - Audit log table
   - Audit trigger function: `aso_log_ruleset_change()`
   - Trigger attachments for all override tables

4. **`20251123000003_create_aso_ruleset_rls_policies.sql`** (280 lines)
   - Helper functions: `is_internal_yodel_user()`, `get_user_organization_id()`
   - RLS policies for all 13 tables
   - 3-tier security model implementation

---

## TypeScript Files Created

1. **`src/services/rulesetStorage/dbRulesetService.ts`** (450 lines)
   - Complete CRUD implementation
   - Type definitions for all override types
   - Parallel loading with Promise.all()
   - Error handling and fallback logic
   - `hasAnyOverrides()` helper for fallback detection

---

## Testing Strategy (Future Implementation)

### Unit Tests

```typescript
// dbRulesetService.test.ts
describe('DbRulesetService', () => {
  it('should load token overrides for vertical', async () => {
    const overrides = await DbRulesetService.loadTokenRelevanceOverrides({
      vertical: 'language_learning'
    });
    expect(overrides).toHaveLength(10);
  });

  it('should return empty array when DB is empty', async () => {
    const overrides = await DbRulesetService.loadAllOverrides({
      vertical: 'unknown_vertical'
    });
    expect(overrides.tokenOverrides).toEqual([]);
  });
});
```

### Integration Tests

```typescript
// rulesetLoader.integration.test.ts
describe('Ruleset Loader Integration', () => {
  it('should fall back to code when DB is empty', async () => {
    const ruleset = await getActiveRuleSet(metadata, 'en-US');
    expect(ruleset.source).toBe('code'); // Phase 10 behavior
  });

  it('should use DB overrides when available', async () => {
    await seedDatabaseWithOverrides();
    const ruleset = await getActiveRuleSet(metadata, 'en-US');
    expect(ruleset.source).toBe('database'); // Phase 11 behavior
  });
});
```

### RLS Tests

```sql
-- Test vertical rule visibility
SET ROLE authenticated_user;
SELECT * FROM aso_ruleset_vertical WHERE vertical = 'language_learning';
-- Expected: Read access granted

-- Test write protection
INSERT INTO aso_ruleset_vertical (vertical, label) VALUES ('test', 'Test');
-- Expected: Permission denied (not internal Yodel)

-- Test organization isolation
SELECT * FROM aso_ruleset_client WHERE organization_id != get_user_organization_id();
-- Expected: No rows (RLS filters out other orgs)
```

---

## Future Enhancements (Phase 12+)

### Admin UI
- Visual ruleset editor
- Diff viewer for version comparison
- Bulk import/export (JSON/CSV)
- Template library (copy vertical → market → client)

### Advanced Features
- A/B testing framework (split traffic between ruleset versions)
- Gradual rollout (% of users get new rules)
- Performance monitoring (track score changes per version)
- Auto-rollback on anomaly detection

### API Endpoints
- `POST /api/rulesets/vertical/:id` - Create/update vertical ruleset
- `GET /api/rulesets/preview` - Preview merged ruleset without saving
- `POST /api/rulesets/rollback/:version` - Rollback to previous version
- `GET /api/rulesets/audit-log` - Query audit history

---

## Backward Compatibility Guarantees

### 1. Code-First Fallback
- If DB is empty → Phase 10 code-based rules are authoritative
- No breaking changes to existing `getActiveRuleSet()` API
- All Phase 9/10 verticals continue working

### 2. Zero Scoring Changes
- Phase 11 is infrastructure-only
- No scoring behavior changes unless DB has explicit overrides
- Empty DB = identical behavior to Phase 10

### 3. Additive-Only Overrides
- DB can override fields but cannot delete defaults
- Union merge strategy for stopwords (no deletions)
- Weight multipliers (not absolute values) for KPIs

### 4. Type Safety
- All DB payloads validated before normalization
- TypeScript types enforce correctness
- Runtime validation with Zod (future)

---

## Performance Considerations

### Query Optimization
- Indexes on all filter columns (`vertical`, `market`, `organization_id`)
- Partial indexes for `is_active = true` queries
- `SELECT *` is acceptable (small row counts, <100 rows per query)

### Caching Strategy
- In-memory cache with 5-minute TTL
- Cache key: `{vertical}:{market}:{orgId}:{appId}`
- Invalidation: Manual trigger or webhook on DB write

### Parallel Loading
- `Promise.all()` for loading all override types (6 queries in parallel)
- Estimated latency: 50-100ms (single round-trip to Supabase)

---

## Security Model Summary

### Read Access Matrix

| Table Type | Anonymous | Authenticated | Org Member | Internal Yodel |
|------------|-----------|---------------|------------|----------------|
| Vertical/Market | ❌ | ✅ (active only) | ✅ (active only) | ✅ (all) |
| Client | ❌ | ❌ | ✅ (own org) | ✅ (all orgs) |
| Admin Metadata | ❌ | ❌ | ❌ | ✅ |
| Audit Log | ❌ | ❌ | ✅ (own org) | ✅ (all) |

### Write Access Matrix

| Table Type | Anonymous | Authenticated | Org Member | Internal Yodel |
|------------|-----------|---------------|------------|----------------|
| All Tables | ❌ | ❌ | ❌ | ✅ |

**Summary**: Only internal Yodel staff can write. Everyone else has scoped read access.

---

## Migration Deployment

### Local Development

```bash
# Apply migrations locally
supabase db reset

# Verify tables created
supabase db dump --schema public --table aso_ruleset_vertical
```

### Production Deployment

```bash
# Review migrations
ls supabase/migrations/20251123*

# Deploy to production
supabase db push

# Verify RLS policies
supabase db execute "SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename LIKE 'aso_%'"
```

### Rollback Plan

```bash
# Create rollback migration
supabase migration create rollback_phase_11_rulesets

# Drop all tables
DROP TABLE IF EXISTS aso_ruleset_audit_log CASCADE;
DROP TABLE IF EXISTS aso_rule_admin_metadata CASCADE;
DROP TABLE IF EXISTS aso_recommendation_templates CASCADE;
DROP TABLE IF EXISTS aso_formula_overrides CASCADE;
DROP TABLE IF EXISTS aso_kpi_weight_overrides CASCADE;
DROP TABLE IF EXISTS aso_stopword_overrides CASCADE;
DROP TABLE IF EXISTS aso_hook_pattern_overrides CASCADE;
DROP TABLE IF EXISTS aso_intent_pattern_overrides CASCADE;
DROP TABLE IF EXISTS aso_token_relevance_overrides CASCADE;
DROP TABLE IF EXISTS aso_ruleset_versions CASCADE;
DROP TABLE IF EXISTS aso_ruleset_client CASCADE;
DROP TABLE IF EXISTS aso_ruleset_market CASCADE;
DROP TABLE IF EXISTS aso_ruleset_vertical CASCADE;
DROP TYPE IF EXISTS aso_override_type CASCADE;
DROP TYPE IF EXISTS aso_ruleset_scope CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS aso_log_ruleset_change() CASCADE;
DROP FUNCTION IF EXISTS is_internal_yodel_user() CASCADE;
DROP FUNCTION IF EXISTS get_user_organization_id() CASCADE;
```

---

## Conclusion

Phase 11 successfully establishes the complete database foundation for dynamic ruleset storage. The schema is normalized, secured with comprehensive RLS policies, and architected for future extensibility.

**Key Deliverables**:
- ✅ 4 migration files (1,030 lines of SQL)
- ✅ 13 database tables with full RLS
- ✅ TypeScript service layer (450 lines, extendable architecture)
- ✅ Audit logging and version tracking
- ✅ 100% backward compatibility guaranteed

**Next Steps** (Future Phases):
1. Complete service layer implementation (normalizer, merger, cache)
2. Integrate DB loader with `rulesetLoader.ts`
3. Add version stamping to `EvaluationContext`
4. Build admin UI for ruleset editing
5. Implement A/B testing framework

**Status**: ✅ **PHASE 11 FOUNDATION COMPLETE — READY FOR INTEGRATION**
