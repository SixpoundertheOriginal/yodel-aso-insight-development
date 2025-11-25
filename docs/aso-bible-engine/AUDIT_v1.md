# ASO Bible Engine Audit — v1

## Module Inventory (Phase 1 Discovery)

### Core Metadata & KPI Stack

| Path | Module | Purpose | Key Dependencies |
| --- | --- | --- | --- |
| `src/engine/metadata/metadataAuditEngine.ts` | `MetadataAuditEngine` | Primary orchestrator: tokenizes metadata, loads rule sets, runs element evaluators, merges combo/intent analysis, produces `UnifiedMetadataAuditResult`. | `tokenization.ts`, `metadataScoringRegistry.ts`, `modules/metadata-scoring` utils, `metadataFormulaRegistry.ts`, `recommendationEngineV2.ts`, `rulesetLoader.ts`, `intentEngine.ts`, `comboIntentClassifier.ts`, `searchIntentCoverageEngine.ts`, `KpiEngine`, `BenchmarkRegistryService`, `BrandIntelligenceService`. |
| `src/engine/metadata/metadataScoringRegistry.ts` | `METADATA_SCORING_REGISTRY` | Central registry of rule definitions, evaluation context, and unified audit output types. Houses rule weights, evaluators, and evidence collection. | `tokenization.ts`, `modules/metadata-scoring/utils/ngram.ts`, `metadataAuditEngine.getTokenRelevance`, `services/ruleConfigLoader.ts`, `searchIntentCoverageEngine`. |
| `src/modules/metadata-scoring/registry/*.json` | Registry data (`metadata_scoring`, `semantic_rules`, `stopwords`) | Source-of-truth JSON configs for rule weights, semantic keyword sets, and stopword lists. | Loaded by `modules/metadata-scoring/services/configLoader.ts`, consumed by metadata engine + combo utilities. |
| `src/modules/metadata-scoring/services/configLoader.ts` | Config Loader | Fetches registry JSON + Supabase overrides, caches stopwords & semantic rules for the engine. | Supabase client, registry JSON payloads. |
| `src/modules/metadata-scoring/services/titleScoringService.ts`, `subtitleScoringService.ts`, `combinedMetadataScore.ts`, `analyzeEnhancedCombinations.ts` | Element scoring helpers | Legacy scoring helpers that calculate weighted contributions, combo coverage, and enhanced combination analysis. | `registry/*.json`, `utils/*`, `metadataScoringRegistry`. |
| `src/modules/metadata-scoring/services/comboOpportunityService.ts` | `identifyOpportunities` | Generates combo/semantic opportunity insights (missing clusters, urgency cues) for recommendations. | `utils/comboNormalizer.ts`, `utils/comboImpact.ts`, `metadata tokens`. |
| `src/modules/metadata-scoring/utils/*` | Combo/token utilities | Provide n-gram generation, combo classification/deduping, normalization, semantic analysis for scoring + opportunity engines. | Used by metadata engine + services above. |
| `src/engine/metadata/metadataFormulaRegistry.ts` | `METADATA_FORMULA_REGISTRY` | Bible-level formula definitions and weights (overall score, element weights, conversion score, advanced KPIs). | Referenced by metadata engine, admin tooling, KPI computations. |
| `src/engine/metadata/tokenization.ts` | Tokenization utilities | ASO-specific tokenizer + analyzers (stopword filtering, syllable counts). | Used by metadata engine, KPI engine, combo services. |
| `src/engine/metadata/utils/recommendationEngineV2.ts` | Recommendation Engine | Translates audit signals into severity-ranked recommendations with vertical-aware templates. | `metadataScoringRegistry` results, `commonPatterns/recommendationTemplates.ts`, Brand intelligence toggles. |
| `src/engine/metadata/kpi/kpiEngine.ts` | `KpiEngine` | Registry-driven KPI computation (families, normalization, overrides). Produces KPI vectors + family summaries for audits. | `tokenization.ts`, `metadataAuditEngine.getTokenRelevance`, `kpi.registry.json`, `kpi.families.json`, active rule set overrides. |
| `src/engine/metadata/kpi/kpi.registry.json` | KPI Registry | Declarative list of KPI IDs, formulas, weights, thresholds. | Parsed by `kpiEngine.ts`. |
| `src/engine/metadata/kpi/kpi.families.json` | KPI Family Registry | Defines KPI family groupings, contribution weights, and narratives. | Used by `kpiEngine.ts` to aggregate results. |
| `src/engine/metadata/kpi/kpi.types.ts` | KPI Types | Shared type definitions for KPI inputs/outputs exposed via `src/engine/metadata/index.ts`. | Consumed by KPI engine + downstream consumers. |

### ASO Bible Rule & Override Infrastructure

| Path | Module | Purpose | Key Dependencies |
| --- | --- | --- | --- |
| `src/engine/asoBible/rulesetLoader.ts` | `getActiveRuleSet` | Loads merged Base → Vertical → Market → Client → App rule set, attaches leak warnings. | `rulesetEngine/*`, `marketProfiles`, `verticalProfiles`, `marketSignatureEngine.ts`, `verticalSignatureEngine.ts`, Supabase overrides. |
| `src/engine/asoBible/ruleset.types.ts` | Rule Set Types | Defines merged rule-set schema (token overrides, KPI multipliers, recommendation templates). | Used throughout metadata engine + override services. |
| `src/engine/asoBible/rulesetEngine/rulesetCache.ts` | Rule set cache | In-memory cache with TTL + invalidation for rule sets by scope. | Used by `rulesetLoader`. |
| `src/engine/asoBible/rulesetEngine/rulesetMerger.ts` | Rule set merging | Applies layered overrides (vertical/market/client/app) with precedence and leak detection hooks. | Calls `overrideMergeUtils.ts`, receives base configs. |
| `src/engine/asoBible/rulesetEngine/rulesetNormalizer.ts` | Rule set normalization | Ensures merged rule set has consistent structure, fills defaults. | Invoked during load + merge. |
| `src/engine/asoBible/rulesetEngine/rulesetVersionManager.ts` | Version manager | Handles schema/version migrations for rule-set payloads. | Used by loader + admin tooling. |
| `src/engine/asoBible/overrideMergeUtils.ts` | Override helpers | Shared functions to merge numeric multipliers, token overrides, KPI weights from layered scopes. | Used by rule set merger + admin services. |
| `src/engine/asoBible/marketProfiles/*`, `src/engine/asoBible/verticalProfiles/*` | Profiles | Static Bible definitions for markets/verticals (localization, cultural heuristics, recommendation overrides). | Loaded by rule-set loader + signature engines. |
| `src/engine/asoBible/marketSignatureEngine.ts`, `verticalSignatureEngine.ts` | Signature detection | Determine best-fit market/vertical profile based on metadata traits to seed rule set selection. | Consumed by `rulesetLoader.ts`. |
| `src/engine/asoBible/leakDetection.ts` | Leak detection | Detects vertical contamination in merged rule sets (language-learning tokens in finance apps, etc.) and surfaces warnings. | Merged rule set + app metadata context. |
| `src/services/ruleConfigLoader.ts` | Rule config loader | Fetches per-scope rule evaluator definitions from Supabase, caches for metadata engine use. | Supabase RPCs, `ruleset.types`. |

### Intent, Patterns & Coverage

| Path | Module | Purpose | Key Dependencies |
| --- | --- | --- | --- |
| `src/engine/asoBible/intentEngine.ts` | Intent Engine | Loads DB-driven intent patterns (with fallback), classifies tokens/combos, exposes cache diagnostics + discovery footprint helpers. | `services/admin/adminIntentService.ts`, fallback `commonPatterns/intentPatterns.ts`, `overrideMergeUtils.ts`. |
| `src/engine/asoBible/searchIntentCoverageEngine.ts` | Search Intent Coverage Engine | Token-level classification + coverage scoring (title/subtitle) leveraging intent patterns. | Depends on `intentEngine` pattern config. |
| `src/engine/asoBible/commonPatterns/intentPatterns.ts` | Fallback patterns | Minimal hardcoded pattern set for informational/commercial/transactional/navigational intents when DB unavailable. | Consumed by `intentEngine`. |
| `src/engine/asoBible/commonPatterns/tokenOverrides.ts` | Token overrides | Bible-managed overrides for token relevance/intent used in fallback & QA scenarios. | Used by rule sets + metadata engine. |
| `src/engine/asoBible/commonPatterns/hookPatterns.ts` | Hook templates | Predefined hook/highlight phrases for conversion scoring + recommendation messaging. | Consumed by description scoring + recommendation engine. |
| `src/engine/asoBible/commonPatterns/recommendationTemplates.ts` | Recommendation templates | Vertical-aware recommendation copy + keyword example bank. | Used by `recommendationEngineV2`. |
| `src/services/admin/adminIntentService.ts` | Intent registry service | Supabase-backed CRUD service for Bible intent patterns + overrides (scope-aware). | Supplies patterns to `intentEngine`. |

### Combo, Discovery & Keyword Utilities

| Path | Module | Purpose | Key Dependencies |
| --- | --- | --- | --- |
| `src/engine/combos/comboGenerationEngine.ts` | Combo Generation Engine | Generates 2-4 word combos, tracks coverage, strategic value, and recommendations. | Metadata tokens, classification helpers. |
| `src/utils/comboIntentClassifier.ts` | Combo Intent Classifier | Maps combos to learning/outcome/brand/noise using Intent Engine patterns or fallback heuristics. | `intentEngine.ts`, metadata combo outputs. |
| `src/modules/metadata-scoring/utils/comboEngineV2.ts`, `comboClassifier.ts`, `comboDedupe.ts`, `comboNormalizer.ts`, `comboRedundancy.ts`, `comboImpact.ts` | Combo utilities | Provide normalized combo generation, deduplication, impact scoring, redundancy detection for coverage + opportunity analysis. | Used by metadata engine + combo services. |
| `src/modules/metadata-scoring/utils/ngram.ts` | N-gram analyzer | Generates token n-grams for scoring, keyword coverage, and combination tracking. | Called by metadata engine + scoring services. |
| `src/engine/asoBible/utils/hookClassifier.ts` | Hook classifier | Bible heuristics for categorizing hooks (problem/solution, outcomes, etc.) used in conversion analysis. | Used in metadata scoring + recommendation messaging. |
| `src/services/benchmark-registry.service.ts` | Benchmark service | Fetches KPI/score benchmarks for categories/verticals to contextualize audit insights. | Supabase data, consumed by metadata engine. |
| `src/services/brand-intelligence.service.ts` | Brand intelligence | Provides brand alias detection, canonicalization, and brand-strength signals for combos and recommendations. | Supabase data, metadata combos. |

### Pipeline, Intent Footprint & Competitor Services

| Path | Module | Purpose | Key Dependencies |
| --- | --- | --- | --- |
| `src/components/AppAudit/UnifiedMetadataAuditModule/UnifiedMetadataAuditModule.tsx` | Audit UI orchestrator | Front-end entry point that runs `MetadataAuditEngine`, surfaces KPIs/intents, and triggers competitor workflows. | `MetadataAuditEngine`, `KpiEngine`, `useCompetitorAnalysis`, various UI cards. |
| `src/hooks/useCompetitorAnalysis.ts` | Competitor workflow hook | Loads competitors, runs `auditAllCompetitorsForApp`, executes comparison service, caches results. | `competitor-audit.service.ts`, `competitor-comparison.service.ts`, Supabase client. |
| `src/services/competitor-metadata.service.ts` | Competitor metadata fetcher | Pulls App Store metadata for competitor apps prior to audit. | Apple iTunes API, Supabase logging. |
| `src/services/competitor-audit.service.ts` | Competitor audit service | Runs Metadata Audit Engine on competitor metadata, stores snapshots, handles caching and overrides. | `MetadataAuditEngine`, `competitor-metadata.service.ts`, Supabase RPCs. |
| `src/services/competitor-comparison.service.ts` | Competitor comparison engine | Aggregates competitor audits into KPI deltas, combo gaps, search intent gaps, discovery footprint comparisons, keyword opportunities. | `MetadataAuditEngine` outputs, `comboGenerationEngine.ts`, `intentEngine` discovery grouping. |
| `src/services/competitor-comparison-export.service.ts` | Comparison export | Serializes competitor comparison outputs for CSV/dashboards (metrics, deltas, intent summaries). | `competitor-comparison.service.ts`, Supabase storage. |
| `src/services/competitor-analysis.service.ts`, `competitor-keyword-analysis.service.ts`, `competitor-review-intelligence.service.ts`, `enhanced-competitor-intelligence.service.ts` | Extended competitor intelligence | CRUD + analytics around competitor lists (keyword overlap, sentiment, funnel metrics) layered on top of audit snapshots. | Supabase tables (`app_competitors`, caches), metadata audit artifacts. |
| `src/engine/asoBible/intentEngine.ts` (`groupByDiscoveryFootprint`) & `src/services/competitor-comparison.service.ts` (`compareDiscoveryFootprint`) | Discovery footprint logic | Categorize combos into learning/outcome/brand/noise buckets and surface across competitor comparisons + UI visuals. | Combo classifications, Intent Engine patterns. |

---

*Confirmed modules above form the baseline scope for the ASO Bible Engine audit. Awaiting approval to proceed to Phase 2 (engine mapping).*

---

## Rule / KPI / Formula Extraction (Phase 3)

### 1. Master Formula Registry Snapshot

| Formula ID | Description | Components (weight) | Notes / Thresholds |
| --- | --- | --- | --- |
| `metadata_overall_score` | Overall ASO ranking score | `title_score` (0.65) + `subtitle_score` (0.35) | Description excluded from ranking (conversion-only). |
| `title_element_score` | Weighted sum of title rules | Character usage (0.25), unique keywords (0.30), combo coverage (0.30), filler penalty (0.15) | Character usage target 70–100% of 30 chars; unique keywords reward ≥2 high-value tokens; filler penalty triggers when noise ratio >30%. |
| `subtitle_element_score` | Subtitle rule mix | Character usage (0.20), incremental value (0.40), combo coverage (0.25), complementarity (0.15) | Subtitle incremental value expects ≥2 new high-value keywords; complementarity penalizes >40% overlap with title relevance tokens. |
| `description_conversion_score` | Conversion quality | Hook strength (0.30), feature mentions (0.25), CTA strength (0.20), readability (0.25) | Non-ranking but surfaced for CVR; readability uses Flesch-Kincaid (score >=60 to pass). |
| `metadata_dimension_discovery` | Generic combo coverage | Thresholds: ≥5 combos → score 100; 3–4 → 75; 1–2 → 50; <1 → 20 | Drives visualization + Discovery Radar segment. |
| `metadata_dimension_brand_balance` | Brand vs generic mix | Custom formula `min(100, (generic/(branded+generic))*100 + 30)` | Bias toward generic discovery, clamps at 100. |

> **Override hooks:** All formulas can receive overrides via active rule sets (Phase 10 infrastructure) although only certain sliders (`title/subtitle` components, discovery thresholds, brand balance base) are editable in admin UI today.

### 2. Master KPI Table (condensed)

KPI definitions live in `src/engine/metadata/kpi/kpi.registry.json` with family grouping in `kpi.families.json`. Highlights:

| KPI ID | Category / Family | Weight (registry) | Core Metric / Thresholds |
| --- | --- | --- | --- |
| `title_char_usage` / `subtitle_char_usage` | Structure | 1.0 | Percentage of available character limit used (30/30 iOS, 50/80 Android). Scores plateau after 90% usage; penalty if > limit. |
| `title_unique_keyword_count`, `subtitle_high_value_incremental_keywords` | Discovery | 1.0 | Count unique high-value (relevance ≥2) keywords; subtitle KPI ignores tokens already present in title. |
| `title_noise_ratio`, `subtitle_noise_ratio` | Structure | 0.9 | Ratio of filler/stopwords; >30% noise triggers warnings, >50% heavy penalty. |
| `title_combo_count_generic`, `subtitle_combo_incremental_generic` | Combo coverage | 0.95–1.0 | Number of meaningful multi-word combos (2–4 terms), with subtitle variant focusing on combos not present in title. |
| `title_semantic_keyword_pairs` | Benefit/Action coverage | 0.85 | Counts pairs combining category + action verbs (e.g., “track workouts”). |
| `brand_presence_*`, `brand_combo_ratio`, `generic_discovery_combo_ratio`, `overbranding_indicator` | Brand balance family | 0.7–1.0 | Track brand density vs. generic combos; `overbranding_indicator` flips when brand combos exceed 70%. |
| `hook_strength_title`, `hook_strength_subtitle`, `specificity_score`, `benefit_density`, `social_proof_signal`, `urgency_signal` | Messaging family | 0.5–1.0 | Evaluate hooks, benefits, urgency & social proof tokens. |
| `total_unique_keyword_coverage`, `benefit_keyword_count`, `action_verb_density` | Discovery / Messaging crossovers | 0.8–0.9 | Totals across title + subtitle for discovery heuristics. |
| `informational/commercial/transactional intent coverage` | Intent Quality | 0.85–1.0 | Share of tokens mapped to each intent; expects balanced mix per vertical. |
| `intent_balance_score`, `intent_diversity_score`, `intent_gap_index`, `intent_alignment_score`, `intent_quality_score` | Intent Quality composite | 0.75–1.2 | Derived from token coverage distribution using entropy + vertical-specific expectations; `intent_quality_score` acts as summary KPI. |

> **Normalization:** `kpiEngine.ts` normalizes per-family weights after applying overrides from rule sets (bounded to 0.5x–2.0x multipliers). Character limits per platform (iOS title 30, subtitle 30; Android 50/80) drive many scoreboard KPIs.

### 3. Rule Registry Highlights

**Title (65% weight overall):**
- `title_character_usage` — Score tiers: <50% usage → 40, <70% → 60, <90% → 85, ≤100% → 100. Over-limit collapses to 0. Override thresholds via Bible config.
- `title_unique_keywords` — Base score `min(80, unique*20)` plus average relevance bonus (up to +30). Pass condition: ≥2 unique high-value tokens.
- `title_combo_coverage` — Score mapping: 0 combos=20, 1–2=50, 3–5=75, >5=90. Pass requires ≥2 combos.
- `title_filler_penalty` — Noise ratio >0.5 subtracts 30 points; >0.3 subtracts 15; evidence lists ignored tokens.

**Subtitle (35% weight):**
- `subtitle_character_usage` — Similar thresholds to title but stops at `maxChars=30` and fails if empty.
- `subtitle_incremental_value` — Counts high-value tokens not present in title; scoring tiers 0→20, 1→50, 2→75, ≥3→95. Primary subtitle KPI (weight 0.40).
- `subtitle_combo_coverage` — Looks at combos across title+subtitle and counts combos unique to subtitle context. Score mapping identical to title coverage.
- `subtitle_complementarity` — Computes overlap ratio of high-value tokens between title/subtitle; score = `(1 - overlapRatio) * 100`, pass if overlap <0.4.

**Description (Conversion only):**
- `description_hook_strength` — Combines hook categories (problem, outcome, social proof) with vertical multipliers; final score requires ≥60 to pass.
- `description_feature_mentions` — 15 points per detected “feature/benefit” keyword, target ≥3 mentions.
- `description_cta_strength` — 25 points per CTA verb, expects ≥2.
- `description_readability` — Flesch-Kincaid formula; pass at ≥60 (Easy); includes level labels.

**Magic Numbers & Heuristics:**
- Combo generation focuses on 2–4 word phrases, with coverage thresholds at 2+ combos per element.
- Generic discovery dimension deems 5+ combos “excellent” and 1 or fewer “poor”.
- Brand balance formula adds +30 bias to generic ratio ensuring even 50/50 mix scores ~80.
- Intent Engine fallback includes 13 default patterns; cache TTL 5 minutes (diagnostics consider ≤13 patterns as “fallback mode”).
- Discovery footprint categories (learning/outcome/brand/noise) drive competitor visuals; overbranding defined at >70% brand combos.
- Recommendation engine severity mapping: critical=90, strong=70, moderate=40, optional=20; thresholds tied to counts above (e.g., ≤1 high-value keyword triggers critical recommendation).

**Override Layers:**
- `getRuleConfig` pulls per-rule weight + threshold overrides from Supabase (scope-specific). If absent, defaults in code apply (e.g., threshold_low 70 for char usage).
- KPI weight multipliers bounded [0.5x, 2.0x] to avoid extreme adjustments.
- Intent overrides and token relevance overrides stored on merged rule set dictate classification emphasis (e.g., vertical-specific brand keywords).

These extracted values form the baseline for subsequent gap analysis.
