# ASO Bible Engine — Architecture Map (v1)

## 1. End-to-End Flow Overview

1. **Metadata ingestion** (scraped metadata + monitored app context) →
2. **Rule-set hydration** via `rulesetLoader.ts` (Base → Vertical → Market → Client → App) →
3. **Intent/semantic assets** load (intent patterns, stopwords, semantic rules, combo templates) →
4. **MetadataAuditEngine.evaluate()** orchestrates:
   - Element rule evaluation (title/subtitle/description)
   - Keyword + combo analysis
   - Intent coverage + discovery footprint
   - KPI computation and formula application
   - Recommendation generation
5. **Unified audit result** flows to UI + downstream consumers (competitor audits, exports, caches).
6. **Competitor workflow** reuses the same engine via `competitor-audit.service.ts`, feeding comparison services and dashboards.

---

## 2. Module Map

Each module lists **inputs → outputs → dependencies → KPI/Formula touchpoints**.

### 2.1 Metadata Core

#### `src/engine/metadata/metadataAuditEngine.ts`
- **Purpose:** Primary orchestrator generating `UnifiedMetadataAuditResult`.
- **Inputs:** `ScrapedMetadata` (title/subtitle/description, locale, org/app context), optional competitor data, locale override.
- **Process:**
  - Loads merged rule set (rule weights, token relevance overrides, KPI multipliers, recommendation templates).
  - Loads stopwords & semantic rules (category/benefit/CTA/time keywords).
  - Loads intent patterns → seeds combo intent classifier + token coverage engine.
  - Tokenizes metadata, runs element evaluators from registry.
  - Computes keyword coverage, combo coverage (calls `comboEngineV2` utilities) and filters low value combos.
  - Generates recommendations via `recommendationEngineV2`.
  - Computes search intent coverage via `computeCombinedSearchIntentCoverage`.
  - Runs `KpiEngine.evaluate()` for KPI families, merging into audit result.
- **Outputs:** `UnifiedMetadataAuditResult` (overall score, element scores, keyword/combo stats, intent diagnostics, KPI result, recommendation lists).
- **Dependencies:** `metadataScoringRegistry`, `tokenization`, `modules/metadata-scoring` utils, `rulesetLoader`, `intentEngine`, `searchIntentCoverageEngine`, `comboIntentClassifier`, `metadataFormulaRegistry`, `recommendationEngineV2`, `KpiEngine`, `BrandIntelligenceService`, `BenchmarkRegistryService`.
- **KPIs/Formulas:** Applies `METADATA_FORMULA_REGISTRY` weights (title/subtitle contributions), passes context to KPI engine (families + overrides).

#### `src/engine/metadata/metadataScoringRegistry.ts`
- **Purpose:** Declarative rule registry (element configs, rule evaluators, unified result schema).
- **Inputs:** Text per element, evaluation context (tokens, stopwords, active rule set, semantic rules).
- **Outputs:** `ElementScoringResult` per element plus `RuleEvaluationResult` array for transparency.
- **Dependencies:** `tokenization`, `modules/metadata-scoring/utils/ngram`, `metadataAuditEngine.getTokenRelevance`, `ruleConfigLoader` (DB overrides).
- **KPIs/Formulas:** Supplies element-level scores that feed the `metadata_overall_score` formula and KPI primitives.

#### `src/engine/metadata/tokenization.ts`
- **Purpose:** ASO-aware tokenizer, analyzer, syllable counter.
- **Inputs:** Raw strings (title/subtitle/description).
- **Outputs:** Token arrays, analysis metrics (stopword counts, readability stats).
- **Dependencies:** None beyond standard libs.
- **KPIs/Formulas:** Provides primitives for character usage KPIs, readability formulas, combo engines.

#### `src/engine/metadata/metadataFormulaRegistry.ts`
- **Purpose:** Global formula definitions (overall score, element weights, conversion score, KPI composites).
- **Inputs:** None at runtime (static definitions consumed by engine/admin UI).
- **Outputs:** Weighted sum/threshold definitions consumed by metadata engine + KPI tooling.
- **Dependencies:** N/A (config file consumed by metadata engine + admin interfaces).
- **KPIs/Formulas:** Defines `metadata_overall_score`, `title_element_score`, `subtitle_element_score`, `description_conversion_score`, and extended composites (intent quality, slot utilization, combo coverage metrics).

#### `src/engine/metadata/utils/recommendationEngineV2.ts`
- **Purpose:** Generate severity-ranked recommendations with vertical-aware templates.
- **Inputs:** `RecommendationSignals` (element scores, coverage stats, combo classifications, conversion signals, active rule set).
- **Outputs:** Ranked recommendation list (id/category/severity/message).
- **Dependencies:** `commonPatterns/recommendationTemplates`, brand intelligence flag, audit results.
- **KPIs/Formulas:** Consumes rule/coverage metrics (no direct KPI emission but messages reference KPI deficiencies).

### 2.2 KPI Stack

#### `src/engine/metadata/kpi/kpiEngine.ts`
- **Purpose:** Registry-driven KPI computation (families, normalization, overrides).
- **Inputs:** `KpiEngineInput` (title/subtitle text, platform, locale, pre-tokenized data, active rule set overrides, combo/intent signals if provided).
- **Outputs:** `KpiEngineResult` (vector of KPIs, family aggregate scores, normalized weights, version metadata).
- **Dependencies:** `tokenization`, `metadataAuditEngine.getTokenRelevance` for semantic weights, `kpi.registry.json`, `kpi.families.json`.
- **KPIs/Formulas:** Applies per-KPI formulas (e.g., character usage %, unique keyword density, intent alignment) and family weighting defined in registries; respects `kpiOverrides` from rule sets.

#### `src/engine/metadata/kpi/kpi.registry.json` & `kpi.families.json`
- **Purpose:** Data sources for KPI definitions (id, label, weight, formula metadata) and family grouping (intent quality, structure, discovery, etc.).
- **Inputs:** Loaded by KPI engine at runtime.
- **Outputs:** Provide metadata for UI + engine, consumed as read-only definitions.
- **Dependencies:** None beyond JSON parsing.

### 2.3 ASO Bible Rule Infrastructure

#### `src/engine/asoBible/rulesetLoader.ts`
- **Purpose:** Determine effective rule set per audit run.
- **Inputs:** App metadata (category, locale, org/app IDs), vertical/market detection hints.
- **Process:**
  - Use `verticalSignatureEngine`/`marketSignatureEngine` to infer profiles.
  - Fetch base and scoped overrides from Supabase caches via `rulesetEngine` components.
  - Merge overrides with `overrideMergeUtils`, run leak detection.
- **Outputs:** `MergedRuleSet` (token overrides, KPI multipliers, recommendation templates, intent overrides, leak warnings).
- **Dependencies:** `rulesetEngine/rulesetCache`, `rulesetMerger`, `rulesetNormalizer`, profile definitions, Supabase tables.
- **KPIs/Formulas:** Supplies overrides consumed by metadata engine + KPI engine (weights/multipliers, token relevance, intent templates).

#### `src/engine/asoBible/rulesetEngine/*`
- **Purpose:** Internal helpers for caching, merging, versioning rule sets.
- **Inputs:** Base configs + overrides by scope.
- **Outputs:** Normalized merged rule set cached per vertical/market/client/app.
- **Dependencies:** Supabase admin tables (`aso_rule_configs`, override tables).
- **KPIs/Formulas:** Provide multipliers + overrides used downstream.

#### `src/services/ruleConfigLoader.ts`
- **Purpose:** Load rule evaluator configs (weights, thresholds, severity) from Supabase with caching.
- **Inputs:** Vertical/market/org scope IDs.
- **Outputs:** Grouped configs for title/subtitle/description/coverage/intent/global families.
- **Dependencies:** Supabase RPC, `ruleset.types` for schema.
- **KPIs/Formulas:** Determines actual rule weights feeding element scores.

### 2.4 Intent & Coverage

#### `src/engine/asoBible/intentEngine.ts`
- **Purpose:** Intent classification engine w/ DB + fallback patterns.
- **Inputs:** Scope parameters (vertical, market, org, app) to fetch effective patterns; combos/tokens during classification.
- **Outputs:**
  - Pattern cache diagnostics (count, fallback mode, TTL).
  - Combo classification results (`classifyComboIntent`, distribution by intent).
  - Discovery footprint grouping (`groupByDiscoveryFootprint`).
- **Dependencies:** `services/admin/adminIntentService` (Supabase), fallback `commonPatterns/intentPatterns.ts`, override utilities.
- **KPIs/Formulas:** Drives intent coverage KPIs, discovery footprint, recommendations referencing intent mix.

#### `src/engine/asoBible/searchIntentCoverageEngine.ts`
- **Purpose:** Token-level search intent coverage analysis.
- **Inputs:** Title/subtitle tokens, intent patterns (shared with intent engine).
- **Outputs:** Coverage scores per element, combined coverage, distribution counts, fallback diagnostics.
- **Dependencies:** `intentEngine` pattern configs.
- **KPIs/Formulas:** Feeds Search Intent Coverage KPIs, informs recommendation severity.

#### `src/utils/comboIntentClassifier.ts`
- **Purpose:** Maps combos to `learning/outcome/brand/noise` classes using intent patterns.
- **Inputs:** Classified combos from metadata engine, loaded patterns via `setIntentPatterns`.
- **Outputs:** Intent class assignments consumed by discovery footprint charts + combo recommendations.
- **Dependencies:** `intentEngine.ts`, `commonPatterns`, metadata combos.
- **KPIs/Formulas:** Supports discovery footprint KPI and recommendations referencing intent diversity.

### 2.5 Combo & Keyword Utilities

#### `src/engine/combos/comboGenerationEngine.ts`
- **Purpose:** Generate all possible combos (2–4 word) and evaluate coverage.
- **Inputs:** Title/subtitle token lists, metadata text.
- **Outputs:** `ComboAnalysis` (all combos, existing vs missing, coverage stats, recommended additions with strategic value heuristics).
- **Dependencies:** None beyond standard libs + classified combo data.
- **KPIs/Formulas:** Coverage stats feed combo KPIs, opportunity insight surfaces recommendations.

#### `src/modules/metadata-scoring/utils/*`
- **Purpose:** Provide normalization, dedupe, impact scoring, n-gram analysis, semantic tagging for combos and keywords.
- **Inputs:** Token lists, existing combos, semantic keyword sets.
- **Outputs:** Cleaned combos, redundancy flags, semantic match results.
- **Dependencies:** Semantic rules from config loader.
- **KPIs/Formulas:** Underpin rule evaluators (e.g., unique keyword count, combo coverage) and formula components.

### 2.6 Intent Footprint & Discovery

#### `groupByDiscoveryFootprint` (intent engine) + `compareDiscoveryFootprint` (competitor comparison service)
- **Purpose:** Summarize combo intent mix for baseline + competitors.
- **Inputs:** Classified combos (`learning/outcome/brand/noise`), competitor audit results.
- **Outputs:** Discovery footprint categories + gaps.
- **Dependencies:** Combo intent classifier, competitor audits.
- **KPIs/Formulas:** Used in UI (Discovery Footprint Map) and competitor comparison KPIs.

### 2.7 Competitor Pipeline

#### `src/services/competitor-metadata.service.ts`
- **Purpose:** Fetch competitor metadata from Apple API.
- **Inputs:** App Store ID, country.
- **Outputs:** `CompetitorMetadataResult` (title/subtitle/description, rating, category, etc.).
- **Dependencies:** Apple iTunes API, Supabase logging.
- **KPIs/Formulas:** Provides raw data for competitor audits.

#### `src/services/competitor-audit.service.ts`
- **Purpose:** Run Metadata Audit Engine on competitor metadata, cache snapshots.
- **Inputs:** Competitor ID, target app ID, organization ID, optional rule config overrides, force refresh.
- **Outputs:** `AuditCompetitorResult` with `audit` payload, metadata snapshot, overall score, cache flag.
- **Dependencies:** `MetadataAuditEngine`, Supabase tables (`competitor_audit_snapshots`), `competitor-metadata.service.ts`.
- **KPIs/Formulas:** Produces same audit KPIs/metrics for competitor comparisons.

#### `src/services/competitor-comparison.service.ts`
- **Purpose:** Aggregate competitor audits for side-by-side insights.
- **Inputs:** Target audit, competitor audits, organization/rule config context.
- **Outputs:** `CompetitorComparisonResult` (KPI comparison, intent gap, combo gap, keyword opportunities, discovery footprint, character usage, brand strength, summary + recommendations).
- **Dependencies:** Metadata audit outputs, combo generation engine, intent engine (for footprint), Supabase caching (comparison cache RPCs).
- **KPIs/Formulas:** Reuses KPI vectors, computes deltas and aggregated statistics (averages, wins/losses).

#### `src/hooks/useCompetitorAnalysis.ts`
- **Purpose:** UI hook orchestrating competitor data lifecycle.
- **Inputs:** Target app/org IDs, target audit result, metadata context.
- **Outputs:** State containers (competitors, audits, comparison) + actions (load, audit, compare, refresh).
- **Dependencies:** Supabase client (`app_competitors`), `competitor-audit.service.ts`, `competitor-comparison.service.ts`.
- **KPIs/Formulas:** Pass-through for audit/KPI results, ensures UI receives validated data.

---

## 3. KPI & Formula Touchpoints Summary

| Stage | Consumes | Produces |
| --- | --- | --- |
| Rule-set hydration | Rule overrides (weights, multipliers) | Active rule set passed to metadata + KPI engines |
| Element scoring | `metadataScoringRegistry` configs | Element scores feeding `metadata_overall_score` formula |
| Combo/keyword analysis | Combo utilities, semantic rules | Coverage stats used in KPIs + recommendations |
| Intent coverage | Intent engine, search coverage engine | Intent KPIs, discovery footprint inputs |
| Recommendation engine | Element results, combo stats, conversion signals | Ranked recommendations tied to deficiencies |
| KPI engine | Text + token primitives, combos/intent signals, overrides | KPI vector + family aggregates appended to audit result |
| Competitor comparison | Target + competitor KPIs/combos/intents | Delta dashboards, discovery footprint comparisons |

---

## 4. Output Consumers

- **UnifiedMetadataAuditModule UI** — renders audit sections, combo workbench, KPI grids, intent diagnostics.
- **Competitor comparison components** — use normalized audit DTOs for summary/table visuals.
- **Supabase caches** — store `aso_audit_snapshots`, `competitor_audit_snapshots`, comparison cache RPC output.
- **Exports/BI** — access KPI vectors, recommendations, combo gaps via comparison/export services.
- **Admin tooling** — manipulates rule sets, formulas, KPIs, intent patterns through Supabase-backed services.

---

*Phase 2 complete — architecture map ready for review. Awaiting confirmation to proceed with Phase 3 (rule/KPI/formula extraction).* 
