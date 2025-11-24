# Intent Architecture - VALIDATED SPECIFICATION

**Date**: 2025-01-24
**Status**: Architecture Confirmed
**Based On**: Code analysis + schema review + existing implementation

---

## Architecture Decision: ONE Table with Mapping Layer ✅

After comprehensive code analysis, the current architecture is:

```
┌─────────────────────────────────────────────────────────────────┐
│                    TWO-LAYER INTENT SYSTEM                       │
└─────────────────────────────────────────────────────────────────┘

DATABASE (Layer 1 Storage):
┌──────────────────────────┐
│ aso_intent_patterns      │  ← 300 BASE PATTERNS (Phase 22)
│ ------------------------ │
│ pattern: "learn"         │
│ intent_type: "inform..."│  Layer 1: informational | commercial | transactional | navigational
│ scope: "base"            │
│ weight: 1.2              │
│ priority: 100            │
└──────────────────────────┘
          ↓
INTENT ENGINE (Pattern Matching):
┌──────────────────────────┐
│ intentEngine.ts          │
│ ------------------------ │
│ loadIntentPatterns()     │  ← Loads from DB (or fallback)
│ classifyToken()          │  ← Returns Layer 1 type
│ classifyComboIntent()    │  ← Returns Layer 1 distribution
└──────────────────────────┘
          ↓
MAPPING LAYER (Layer 1 → Layer 2):
┌──────────────────────────┐
│ intentTypeMapping.ts     │
│ ------------------------ │
│ informational → learning │
│ commercial → outcome     │
│ transactional → outcome  │
│ navigational → brand     │
└──────────────────────────┘
          ↓
COMBO CLASSIFIER (Layer 2 Output):
┌──────────────────────────┐
│ comboIntentClassifier.ts │
│ ------------------------ │
│ classifyIntent()         │  Layer 2: learning | outcome | brand | noise
│ Returns: ComboIntentType │
└──────────────────────────┘
          ↓
UI COMPONENTS:
┌──────────────────────────┐
│ DiscoveryFootprintMap    │  ← Uses Layer 2 (learning/outcome/brand)
│ SearchIntentCoverage     │  ← Uses Layer 1 (informational/commercial)
│ Metadata Scoring         │  ← Uses Layer 2 (learning/outcome/brand)
└──────────────────────────┘
```

---

## Layer Definitions

### Layer 1: Search Intent (Token-Level Classification)

**Purpose**: Classify individual keywords based on search behavior patterns

**Types** (stored in `aso_intent_patterns.intent_type`):
- `informational` - Learning, discovery, how-to queries
- `commercial` - Comparison, evaluation, research queries
- `transactional` - Download, purchase, action queries
- `navigational` - Brand, specific app, entity queries

**Used By**:
- SearchIntentCoverageCard (token-level analysis)
- Intent KPIs (informational_coverage, commercial_coverage, etc.)
- Pattern matching engine

**Weights**: 0.7-2.0 (conversion strength indicator)

---

### Layer 2: Metadata Semantic Intent (Combo-Level Classification)

**Purpose**: Classify keyword combinations for metadata strategy and discovery footprint

**Types** (from `ComboIntentType` in code):
- `learning` ← Maps from informational
- `outcome` ← Maps from commercial + transactional
- `brand` ← Maps from navigational
- `noise` ← Low-value combos (not intent-driven)

**Used By**:
- DiscoveryFootprintMap (combo distribution)
- Metadata scoring engine (combo quality)
- Combo workbench (combo filtering)

**Note on 9 Types**: User mentioned expanding to 9 types (learning, feature, persona, outcome, experience, category, mode, brand, noise). Current implementation has 4 types. Expansion would require:
1. TypeScript type definition changes in `intentTypeMapping.ts`
2. Mapping logic updates
3. UI component updates
4. Database field changes (combo_intent_class)

**Decision for Phase 22**: Keep 4 types (current implementation), defer 9-type expansion to Phase 24+.

---

## Three-Table System

### Table 1: `aso_intent_patterns` (THE BRAIN) 🧠

**Purpose**: Master pattern repository - single source of truth

**Schema**:
```sql
CREATE TABLE aso_intent_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern text NOT NULL,                    -- "learn", "best", "download"
  intent_type text NOT NULL,                -- Layer 1: informational | commercial | transactional | navigational
  scope text DEFAULT 'base',                -- 'base' | 'vertical' | 'market' | 'client' | 'app'
  vertical text,                            -- NULL for base, 'Education' for vertical-specific
  market text,                              -- NULL for base, 'us' for market-specific
  organization_id uuid,                     -- NULL for base patterns
  app_id text,                              -- NULL for base patterns
  weight numeric(4,2) DEFAULT 1.0,          -- 0.1-3.0 scoring multiplier
  priority integer DEFAULT 0,               -- 0-200 matching order (higher = first)
  is_regex boolean DEFAULT false,           -- Pattern is regex?
  case_sensitive boolean DEFAULT false,     -- Case-sensitive matching?
  word_boundary boolean DEFAULT true,       -- Require word boundaries?
  is_active boolean DEFAULT true,           -- Soft delete flag
  match_type text DEFAULT 'exact',          -- 'exact' | 'contains' | 'startsWith' | 'regex'
  example_usage text,                       -- "learn spanish", "best fitness app"
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE NULLS NOT DISTINCT (pattern, scope, vertical, market, organization_id, app_id)
);
```

**Phase 22 Action**: Insert 300 base patterns
```sql
INSERT INTO aso_intent_patterns (
  pattern, intent_type, weight, priority, scope, match_type, word_boundary, example_usage
) VALUES
('learn', 'informational', 1.2, 100, 'base', 'exact', true, 'learn spanish'),
('best', 'commercial', 1.5, 120, 'base', 'exact', true, 'best fitness app'),
('download', 'transactional', 2.0, 150, 'base', 'exact', true, 'download now'),
...
```

**Phase 23 Action**: Add vertical-specific patterns
```sql
INSERT INTO aso_intent_patterns (
  pattern, intent_type, weight, priority, scope, vertical, match_type, word_boundary, example_usage
) VALUES
('vocabulary', 'informational', 1.3, 105, 'vertical', 'Education', 'exact', true, 'vocabulary builder'),
('multiplayer', 'commercial', 1.4, 110, 'vertical', 'Games', 'exact', true, 'multiplayer games'),
('portfolio', 'commercial', 1.4, 110, 'vertical', 'Finance', 'exact', true, 'investment portfolio'),
...
```

---

### Table 2: `aso_intent_pattern_overrides` (EXCEPTIONS)

**Purpose**: Scope-specific overrides without duplicating base patterns

**Schema**:
```sql
CREATE TABLE aso_intent_pattern_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_pattern_id uuid REFERENCES aso_intent_patterns(id) ON DELETE CASCADE,
  scope text NOT NULL,                      -- 'vertical' | 'market' | 'client' | 'app'
  vertical text,
  market text,
  organization_id uuid,
  app_id text,
  weight_multiplier numeric(4,2) DEFAULT 1.0,  -- Multiply base weight (1.5 = +50%)
  priority_override integer,                   -- Override base priority
  is_active boolean DEFAULT true,
  reason text,                                 -- "Education apps prioritize 'learn'"
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (base_pattern_id, scope, vertical, market, organization_id, app_id)
);
```

**Phase 23 Action**: Add vertical overrides
```sql
-- Boost "learn" weight for Education vertical
INSERT INTO aso_intent_pattern_overrides (
  base_pattern_id,
  scope,
  vertical,
  weight_multiplier,
  reason
) VALUES
((SELECT id FROM aso_intent_patterns WHERE pattern = 'learn' AND scope = 'base'),
 'vertical',
 'Education',
 1.5,
 'Education apps emphasize learning keywords');
```

---

### Table 3: `search_intent_registry` (AUTOCOMPLETE CACHE) ⚠️

**Purpose**: Cache autocomplete API responses (NOT for pattern matching)

**Schema**:
```sql
CREATE TABLE search_intent_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,                    -- "learn spanish" (full keyword)
  platform text,                            -- 'ios' | 'android'
  region text,                              -- 'us', 'gb', etc.
  intent_type text,                         -- Cached classification result
  autocomplete_suggestions jsonb,           -- Raw API data
  autocomplete_volume_estimate integer,     -- Volume estimate
  last_checked timestamptz,
  is_active boolean DEFAULT true,
  UNIQUE NULLS NOT DISTINCT (keyword, platform, region)
);
```

**Phase 22 Action**: NONE - This table is for caching, not pattern storage

**Status**: Deprecated in Phase 17 (replaced by Intent Engine pattern matching)

**Clarification**: User mentioned "300 search-intent patterns → search_intent_registry" but this is incorrect based on code analysis. Patterns go into `aso_intent_patterns`, NOT `search_intent_registry`.

---

## Exact Insertion Rules

### Rule 1: Base Patterns (Phase 22)
```sql
-- All base patterns have:
scope = 'base'
vertical = NULL
market = NULL
organization_id = NULL
app_id = NULL
is_active = true

-- Example:
INSERT INTO aso_intent_patterns (
  pattern, intent_type, weight, priority, scope,
  vertical, market, organization_id, app_id,
  match_type, word_boundary, case_sensitive, example_usage
) VALUES
('learn', 'informational', 1.2, 100, 'base',
 NULL, NULL, NULL, NULL,
 'exact', true, false, 'learn spanish');
```

### Rule 2: Vertical Patterns (Phase 23)
```sql
-- Vertical patterns have:
scope = 'vertical'
vertical = 'Education' | 'Games' | 'Finance' | etc.
market = NULL
organization_id = NULL
app_id = NULL

-- Example:
INSERT INTO aso_intent_patterns (
  pattern, intent_type, weight, priority, scope,
  vertical, market, organization_id, app_id,
  match_type, word_boundary, case_sensitive, example_usage
) VALUES
('vocabulary', 'informational', 1.3, 105, 'vertical',
 'Education', NULL, NULL, NULL,
 'exact', true, false, 'vocabulary builder');
```

### Rule 3: Market Patterns (Phase 24)
```sql
-- Market patterns have:
scope = 'market'
vertical = NULL
market = 'us' | 'gb' | 'de' | etc.
organization_id = NULL
app_id = NULL

-- Example:
INSERT INTO aso_intent_patterns (
  pattern, intent_type, weight, priority, scope,
  vertical, market, organization_id, app_id,
  match_type, word_boundary, case_sensitive, example_usage
) VALUES
('colour', 'informational', 1.0, 100, 'market',
 NULL, 'gb', NULL, NULL,
 'exact', true, false, 'colour picker');
```

### Rule 4: Client Patterns (Phase 25+)
```sql
-- Client patterns have:
scope = 'client'
vertical = NULL (or inherited from org)
market = NULL (or inherited from org)
organization_id = <uuid>
app_id = NULL

-- Example: Client wants to boost "premium"
INSERT INTO aso_intent_patterns (
  pattern, intent_type, weight, priority, scope,
  vertical, market, organization_id, app_id,
  match_type, word_boundary, case_sensitive, example_usage
) VALUES
('premium', 'commercial', 1.8, 130, 'client',
 NULL, NULL, '123e4567-e89b-12d3-a456-426614174000', NULL,
 'exact', true, false, 'premium features');
```

### Rule 5: App Patterns (Phase 26+)
```sql
-- App-specific patterns have:
scope = 'app'
vertical = NULL
market = NULL
organization_id = <uuid>
app_id = '<app_id>'

-- Example: Duolingo-specific
INSERT INTO aso_intent_patterns (
  pattern, intent_type, weight, priority, scope,
  vertical, market, organization_id, app_id,
  match_type, word_boundary, case_sensitive, example_usage
) VALUES
('owl', 'navigational', 1.2, 55, 'app',
 NULL, NULL, '123e4567-e89b-12d3-a456-426614174000', 'duolingo-id',
 'exact', true, false, 'duolingo owl');
```

---

## Pattern Loading Priority

When `loadIntentPatterns()` is called, patterns are loaded in this order:

```typescript
// Priority: Most specific → Least specific
1. app-specific patterns      (scope='app', app_id=X)
2. client-specific patterns    (scope='client', organization_id=X)
3. market-specific patterns    (scope='market', market=X)
4. vertical-specific patterns  (scope='vertical', vertical=X)
5. base patterns               (scope='base')
```

**Higher priority patterns override lower priority patterns** for the same keyword.

Example:
```
Base:     "learn" → weight 1.2, priority 100
Vertical: "learn" → weight 1.5, priority 105 (Education)
Result:   Education apps use weight 1.5, others use 1.2
```

---

## Missing Infrastructure (Flagged)

### ✅ Exists and Working
- [x] `aso_intent_patterns` table schema
- [x] `aso_intent_pattern_overrides` table schema
- [x] Intent Engine (`intentEngine.ts`)
- [x] Mapping layer (`intentTypeMapping.ts`)
- [x] Combo classifier (`comboIntentClassifier.ts`)
- [x] Fallback patterns (14 patterns)

### ⚠️ Exists but Not Populated
- [ ] `aso_intent_patterns` - 0 rows (Phase 22 will fix)
- [ ] `aso_intent_pattern_overrides` - 0 rows (Phase 23+)
- [ ] `aso_audit_snapshots` - 0 rows (persistence not enabled)
- [ ] `app_metadata_cache` - 0 rows (persistence not enabled)

### ❌ Missing (Future Phases)
- [ ] Admin UI for pattern management (Phase 25+)
- [ ] Pattern testing/validation tools
- [ ] Bulk import/export CSV functionality
- [ ] Pattern usage analytics
- [ ] A/B testing framework for patterns
- [ ] Conflict resolution UI (when patterns overlap)

### 🔧 Needs Implementation
- [ ] Enable `usePersistAuditSnapshot` call in AppAuditHub (Phase 22)
- [ ] Add vertical-specific patterns (Phase 23)
- [ ] Add market/language patterns (Phase 24)

---

## System Exposure to Clients

### Through ASO AI Audit (Section 3: Discovery Footprint)

**What Users See**:
```
DISCOVERY FOOTPRINT MAP
├─ Learning Combos: 12     ← Layer 2 (mapped from informational)
├─ Outcome Combos: 8       ← Layer 2 (mapped from commercial + transactional)
├─ Brand Combos: 3         ← Layer 2 (mapped from navigational)
└─ Low-Value Combos: 5     ← noise
```

**Powered By**: `aso_intent_patterns` → Intent Engine → Mapping → Layer 2 classification

### Through Metadata Scoring

**What Users See**:
```
INTENT COVERAGE KPIs
├─ Informational Coverage: 65%   ← Layer 1 (direct from patterns)
├─ Commercial Coverage: 40%      ← Layer 1 (direct from patterns)
├─ Transactional Coverage: 30%   ← Layer 1 (direct from patterns)
└─ Overall Intent Score: 72/100  ← Weighted combination
```

**Powered By**: `aso_intent_patterns` → Intent Engine → Layer 1 classification

### Through Search Intent Coverage Card

**What Users See**:
```
SEARCH INTENT COVERAGE
Token-level breakdown:
- "learn" → Informational (weight: 1.2)
- "best" → Commercial (weight: 1.5)
- "free" → Transactional (weight: 1.8)
- "spanish" → Unclassified

Coverage: 3/4 tokens (75%)
Dominant Intent: Transactional
```

**Powered By**: `aso_intent_patterns` → Intent Engine → Token classification

---

## Validation Checklist

### Architecture Validation ✅
- [x] ONE table (`aso_intent_patterns`) for pattern storage
- [x] Mapping layer converts Layer 1 → Layer 2
- [x] Layer 1 types: informational, commercial, transactional, navigational
- [x] Layer 2 types: learning, outcome, brand, noise (4 types)
- [x] Scope system supports base/vertical/market/client/app
- [x] Priority system ensures specific patterns match first

### Code Validation ✅
- [x] Intent Engine loads from DB with fallback
- [x] Combo classifier uses mapped Layer 2 types
- [x] SearchIntentCoverageCard uses Layer 1 types
- [x] DiscoveryFootprintMap uses Layer 2 types
- [x] Metadata scoring uses Layer 2 types

### Schema Validation ✅
- [x] UNIQUE constraint prevents duplicate patterns
- [x] Scope field supports all 5 contexts
- [x] Foreign keys properly defined
- [x] Indexes on frequently queried fields
- [x] RLS policies enable multi-tenancy

---

## Phase 22 Readiness Status

### Prerequisites ✅
- [x] Database schema exists
- [x] Intent Engine implemented
- [x] Mapping layer implemented
- [x] Fallback patterns working
- [x] 300 patterns generated and reviewed

### Ready to Apply ✅
- [x] `20250124200002_seed_intent_patterns_REVIEW.sql` (300 patterns)
- [x] Migration tested locally
- [x] Pattern distribution validated
- [x] Weight/priority values confirmed

### Post-Application Testing
- [ ] Run audit on Education app (check learning combos)
- [ ] Run audit on Gaming app (check commercial patterns)
- [ ] Run audit on Finance app (check outcome classification)
- [ ] Verify coverage improvement (expect +40-50%)
- [ ] Check Intent Engine switches from fallback to DB

---

## Summary Decision Matrix

| Question | Decision | Rationale |
|----------|----------|-----------|
| **Table for patterns?** | `aso_intent_patterns` | Code analysis shows this is the pattern brain |
| **Table for cache?** | `search_intent_registry` | Autocomplete cache only, NOT for patterns |
| **Architecture model?** | ONE table + mapping | Current implementation confirmed |
| **Layer 1 types?** | 4 types (informational, commercial, transactional, navigational) | Matches code |
| **Layer 2 types?** | 4 types (learning, outcome, brand, noise) | Matches current code |
| **Expand to 9 types?** | Phase 24+ (future) | Requires code changes, defer for now |
| **Vertical strategy?** | `scope='vertical'` in same table | Schema supports, Phase 23 |
| **Pattern count?** | 300 base patterns | Phase 22 target |

---

## Next Actions

1. **Immediate (Phase 22)**:
   - Apply `20250124200002_seed_intent_patterns_REVIEW.sql` after user approval
   - Enable audit snapshot persistence
   - Test with 5-10 apps across verticals
   - Measure coverage improvement

2. **Short-term (Phase 23)**:
   - Add 20-30 vertical-specific patterns per vertical
   - Gaming: "multiplayer", "pvp", "fps", "rpg"
   - Finance: "invest", "portfolio", "stocks", "crypto"
   - Education: "vocabulary", "grammar", "fluency"

3. **Long-term (Phase 24+)**:
   - Expand Layer 2 to 9 types (if business need confirmed)
   - Add market/language patterns
   - Build admin UI for pattern management
   - Add pattern analytics and A/B testing

---

**Architecture Status**: VALIDATED ✅
**Ready for Phase 22 Seed**: YES ✅
**Awaiting**: User approval to apply migration
**Confidence Level**: HIGH (based on comprehensive code analysis)
