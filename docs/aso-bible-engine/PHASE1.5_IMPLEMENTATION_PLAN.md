# Phase 1.5 Implementation Plan — ASO Bible Engine

## 1. Objectives
- Increase intent coverage resilience when running in fallback pattern mode.
- Normalize combo coverage, brand balance, and noise heuristics across KPIs, formulas, and competitor tooling.
- Strengthen override transparency and leak detection coverage.
- Harden competitor audit comparisons with consistent DTO validation.

## 2. Workstreams & Tasks

### Workstream A — Intent Coverage & Diagnostics
1. **Fallback-aware KPIs**
   - Add a `intentCoverage` status flag (e.g., `intentCoverage.fallbackMode`) to `UnifiedMetadataAuditResult` using `getIntentPatternCacheDiagnostics`.
   - Modify Search Intent Coverage KPIs to down-weight penalties or display “informational only” messaging when fallback mode is active.
2. **Shared diagnostics**
   - Create a shared `IntentDiagnosticsContext` used by both `searchIntentCoverageEngine.ts` and combo discovery footprint logic so logs + fallback statuses are consistent.
3. **Vertical intent targets**
   - Define per-vertical intent distribution targets within `verticalProfiles/*`, surface them in rule sets, and feed them into `intent_alignment_score` so recommendations can call out specific deficiencies.

### Workstream B — Combo & Discovery Harmony
1. **Unified combo coverage schema**
   - Standardize `comboCoverage` in audit result to always include `stats` (total/existing/missing/coverage) and use it inside metadata formulas, KPIs, and `competitor-comparison.service.ts`.
   - Update metadata formulas (`metadata_dimension_discovery`) to rely on this unified schema instead of its own count thresholds.
2. **Redundancy-aware complementarity**
   - Extend `subtitle_complementarity` rule to include combo-level overlap (using `comboDedupe` utilities) so repeating phrases trigger penalties.
3. **Vertical discovery thresholds**
   - Expose discovery threshold overrides via rule set profiles. Example: Finance vertical sets `Excellent` threshold at 8 combos, Gaming at 6.

### Workstream C — KPI & Formula Alignment
1. **Brand ratio helper**
   - Implement a shared helper (e.g., `computeBrandRatioStats`) to produce brand/generic/low-value counts. Use it in both KPI registry (brand presence KPIs) and dimension formula to avoid drift.
2. **Noise penalty unification**
   - Introduce a `noiseSeverity` helper consumed by both title/subtitle rules and KPIs, ensuring identical thresholds (e.g., >30% warning, >50% critical).
3. **Messaging KPI damping**
   - Adjust urgency/social proof KPI formulas to apply diminishing returns (log scale or capped weight) and document rationale in `kpi.registry.json`.

### Workstream D — Override & Transparency Enhancements
1. **Formula component overrides**
   - Extend `MergedRuleSet` to include `formulaOverrides` (per formula component weight). Update `metadataFormulaRegistry` consumers to apply overrides (bounded multipliers) before evaluation.
2. **Leak detection coverage**
   - Expand `leakDetection.ts` to iterate over every profile under `verticalProfiles/` and run pattern/token heuristics specific to each vertical.
3. **Override ancestry in audit output**
   - Attach metadata (scope + source) to each rule result and major metric within `UnifiedMetadataAuditResult` so UI/admin tools can display “Weight inherited from Client override” etc.

### Workstream E — Competitor Audit Hardening
1. **DTO validator**
   - Introduce a shared validator (in `competitor-audit.service.ts` or a utility) ensuring every competitor audit contains `comboCoverage.stats`, `intentCoverage`, and `kpis`. Skip + log entries that fail validation before comparison logic runs.
2. **Cache telemetry**
   - Surface timestamp + TTL for both intent pattern cache and competitor audit cache within the competitor UI (e.g., `useCompetitorAnalysis` exposes `patternCacheTTL`, `auditSnapshotAge`).
3. **Discovery footprint aggregation**
   - Build aggregated metrics (per vertical/platform) inside comparison service so discovery footprint gaps can reference normative baselines.

## 3. Dependencies & Coordination
- Requires coordination with Supabase schema owners for any new override metadata (formulaOverrides, vertical intent targets) but does **not** alter existing schema — store new overrides in JSON fields or admin tables already in use.
- UI team involvement for displaying fallback intent states and override ancestry.
- Competitor UX needs updates to show cache telemetry and gracefully handle skipped audits.

## 4. Validation Strategy
- Extend unit tests around `KpiEngine`, `metadataAuditEngine`, and `competitor-comparison.service.ts` to cover fallback intent scenarios and normalized combo stats.
- Add regression tests verifying new helpers (brand ratio, noise severity) remain consistent across KPIs and formulas.
- Introduce CDC-style sanity checks for override propagation (snapshot tests confirming formula weights shift when overrides are applied).

## 5. Deliverables
- Updated engine modules (intent coverage, combo coverage, KPI helper, formula overrides, leak detection, competitor validator).
- Documentation updates to `AUDIT_v1.md` (appendix describing override ancestry + fallback behavior) and internal runbooks.
- UI/UX tweaks for audit + competitor dashboards reflecting new telemetry and warning states.

*This plan completes Phase 1.5 without touching Phase 22 seed or database schemas.*
