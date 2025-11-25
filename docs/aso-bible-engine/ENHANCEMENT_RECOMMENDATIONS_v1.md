# ASO Bible Engine — Enhancement Recommendations (Phase 4)

## 1. Summary of Findings

The current engine is robust but shows several inconsistencies and legacy remnants. Core gaps fall into five buckets: **intent coverage resiliency**, **combo/keyword redundancy**, **override coherence**, **competitor data safety**, and **visualization fidelity**.

## 2. Detailed Recommendations

### 2.1 Intent Patterns & Coverage
1. **Align KPI intent weighting with pattern availability.** When fallback patterns (≤13) are active, intent KPIs still expect full coverage. Introduce fallback-aware normalization or explicitly label “degraded intent coverage” so scores do not unfairly penalize users. Tie into cache diagnostics from `intentEngine.ts`.
2. **Differentiate combo vs token intent scoring.** Search Intent Coverage (token-level) and discovery footprint (combo-level) use the same patterns but share none of the diagnostics. Introduce shared logging and ensure vertical overrides apply consistently to both engines.
3. **Leverage override scopes for intent gaps.** `intent_alignment_score` references vertical expectations, yet there is no central map of expected distributions. Define per-vertical intent targets (e.g., productivity expects stronger transactional mix) so KPI is actionable.

### 2.2 Combo Coverage & Discovery
1. **Harmonize combo coverage metrics.** Metadata formulas and KPIs rely on simple count/coverage thresholds, whereas `competitor-comparison.service.ts` uses `comboCoverage.stats`. Standardize the underlying `comboCoverage` object so both surfaces leverage the same coverage percent + meaningful vs low-value delineations.
2. **Improve redundancy detection.** Rule evaluators penalize `subtitle_complementarity` via token overlap but do not consider multi-word redundancies (same combos repeated). Extend combo dedupe utilities to feed the rule evaluators.
3. **Expose coverage saturation.** Dimension formulas treat ≥5 generic combos as “excellent”, but many verticals (e.g., finance) realistically need 8–10 combos. Use vertical overrides or market profiles to adjust discovery thresholds.

### 2.3 KPI & Formula Consistency
1. **Eliminate double counting of brand ratios.** Both KPI registry and `metadata_dimension_brand_balance` compute brand/generic ratios with slightly different thresholds. Consolidate logic (single helper) to avoid drift.
2. **Clarify noise penalties.** Title/subtitle rules penalize >30% noise; KPI `title_noise_ratio` also accounts for noise but scales differently. Document or align these heuristics so severity messaging matches KPI results.
3. **Calibrate urgency/social proof weights.** Current KPI weights (0.5–0.6) allow low-impact words to swing KPI totals. Reduce weight or apply diminishing returns (log scale) so a single “now” does not over-inflate messaging KPIs.

### 2.4 Override & Scope Hygiene
1. **Ensure rule config overrides propagate to formulas.** `getRuleConfig` adjusts rule weights/thresholds, but formulas (e.g., `title_element_score` component weights) remain static. Provide vertical-specific component overrides in the merged rule set so formulas reflect the same emphasis as rule configs.
2. **Audit leak detection coverage.** `leakDetection.ts` checks for specific vertical contamination (language learning, rewards, finance) but does not monitor newly added profiles (e.g., health, productivity). Expand detection to cover every vertical profile and log warnings in audit diagnostics.
3. **Expose override ancestry in audit output.** Users and internal reviewers cannot see whether a rule weight came from base, vertical, or client override. Include override metadata (scope, source) in `UnifiedMetadataAuditResult` for transparency.

### 2.5 Competitor Workflow Safeguards
1. **Guard missing audit metrics.** Competitor comparison now skips entries with undefined `audit`, but `competitor-comparison.service.ts` still assumes fields like `comboCoverage.stats`. Add defensive defaults or validators before computing deltas to prevent silent NaNs.
2. **Cache invalidation clarity.** Pattern cache TTL (5 min) and competitor audit cache (24h) operate independently; when one is stale and the other is not, comparisons can reflect mixed regimes. Surface cache timestamps in UI so analysts know when reruns are needed.
3. **Discovery footprint sampling.** `groupByDiscoveryFootprint` logs combos for debugging but does not aggregate by vertical or platform. Build aggregated metrics (e.g., average brand vs generic footprint by category) to contextualize competitor comparisons.

## 3. Legacy Features Needing Action
- **Placeholder keyword field assumption:** Subtitle weight still references future keyword field reduction (“will be 20% when keyword field is added at 15%”). Remove or implement actual keyword field logic to avoid confusion.
- **Intent Engine fallback heuristics:** Legacy heuristics in `comboIntentClassifier` default to “learning” for most combos when patterns missing. Provide multi-intent fallback (learning vs outcome vs brand) to avoid skewed discovery footprint.
- **Formula override infrastructure (Phase 11 TODO):** `metadataFormulaRegistry` mentions override support but no implementation. Clarify roadmap or remove dead code to prevent misunderstanding.

These recommendations set the stage for Phase 1.5 refinements.
