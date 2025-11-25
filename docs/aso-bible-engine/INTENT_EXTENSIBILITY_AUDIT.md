# Intent Extensibility Audit

## 1. Current Intent Data Flow

| Stage | Module | Description | Notes |
| --- | --- | --- | --- |
| Pattern source | `aso_intent_patterns` table (via `src/services/admin/adminIntentService.ts`) | Bible registry storing base + overrides scoped by vertical/market/client/app. | Single source of truth. |
| Engine cache | `src/engine/asoBible/intentEngine.ts` | `loadIntentPatterns()` fetches effective patterns, caches with TTL, exposes `getIntentPatternCacheDiagnostics()` returning `{ patternsLoaded, fallbackMode, cacheTtlRemaining }`. | Fallback patterns defined in `commonPatterns/intentPatterns.ts` (13 entries). |
| Combo classification | `src/engine/asoBible/intentEngine.ts` (`classifyComboIntent`, `groupByDiscoveryFootprint`) and `src/utils/comboIntentClassifier.ts` | Classifies combos into search intent categories, mapping to combo intent classes (learning/outcome/brand/noise). | Uses cached patterns; fallback heuristics only when cache empty. |
| Token coverage | `src/engine/asoBible/searchIntentCoverageEngine.ts` | `computeCombinedSearchIntentCoverage()` returns per-element coverage, distributions, and `patternsUsed`. Now also carries `fallbackMode`. | Same patterns shared with combo classifier. |
| Metadata audit output | `src/engine/metadata/metadataAuditEngine.ts` | Loads patterns, sets combo classifier, computes intent coverage via `computeCombinedSearchIntentCoverage`, attaches to `UnifiedMetadataAuditResult.intentCoverage`. Also includes `intentEngineDiagnostics` for dev panels. | Intent coverage flows through audit DTO to UI + competitor pipelines. |
| KPI engine | `src/engine/metadata/kpi/kpiEngine.ts` | Consumes `intentCoverage`, builds intent KPIs, and exposes primitives (coverage counts, `intentFallbackMode`). | No new DTOs; existing KPI definitions reused. |
| UI surfaces | `SearchIntentCoverageCard.tsx`, discovery footprint charts, metadata radar, competitor comparison summary/table | Read `audit.intentCoverage` + combo classifications; show coverage, dominant intent, discovery footprint. | All components receive data through `UnifiedMetadataAuditResult` or competitor audit DTO. |

## 2. File-by-File Findings

### `src/engine/asoBible/intentEngine.ts`
- **Surfaces:** `loadIntentPatterns`, `clearIntentPatternCache`, `getIntentPatternCacheDiagnostics`, `classifyComboIntent`, `groupByDiscoveryFootprint`.
- **Fallback diagnostics:** `getIntentPatternCacheDiagnostics` already reports `fallbackMode`. No other structure needed.
- **Injection point:** Intent diagnostics context should originate here, reusing `getIntentPatternCacheDiagnostics` output (no new helpers).
- **Single source confirmation:** All pattern loading ultimately comes from `adminIntentService` → Supabase; fallback only uses `commonPatterns/intentPatterns.ts`.

### `src/engine/asoBible/searchIntentCoverageEngine.ts`
- **Surfaces:** `SearchIntentCoverageResult`, `CombinedSearchIntentCoverage`, `computeSearchIntentCoverage`, `computeCombinedSearchIntentCoverage`.
- **Diagnostics today:** `patternsUsed` and `fallbackMode` (new) already exist. Additional diagnostics should extend these existing types—no new DTO.
- **Injection point:** Additional context (e.g., cache TTL) can be appended to `CombinedSearchIntentCoverage` if needed, but Workstream A2 expects an `IntentDiagnosticsContext` that references existing fields rather than new structures.

### `src/utils/comboIntentClassifier.ts`
- **Surfaces:** `setIntentPatterns`, `classifyIntent`, `mapSearchIntentToComboIntent`.
- **Diagnostics:** None today; classification relies on patterns previously loaded via `metadataAuditEngine`. Diagnostics should not alter mapping logic—only optionally log fallback state supplied by the engine.
- **Mapping confirmation:** Search intent → combo intent mapping is fixed via `mapSearchIntentToComboIntent`; no new categories allowed.

### `getIntentPatternCacheDiagnostics`
- Already returns `{ patternsLoaded, fallbackMode, cacheTtlRemaining }`.
- This object should be the source for any IntentDiagnosticsContext; no additional functions needed.

### `UnifiedMetadataAuditResult` (types + DTO)
- **Surfaces:** `intentCoverage` (combined coverage data), `intentEngineDiagnostics` (dev-only panel).
- **Diagnostics injection:** Additional diagnostic context should be attached here (e.g., `intentCoverage.diagnostics` or `intentDiagnostics` field) so existing consumers automatically receive it. Do not introduce parallel DTOs.

### `UnifiedMetadataAuditModule` wiring
- **Hook:** `useCompetitorAnalysis` receives `auditResult` containing `intentCoverage`.
- **UI components:** Search Intent Coverage card, metadata radar, discovery footprint card, competitor comparison summary/table—all read from `auditResult` or competitor audit objects.
- **Diagnostics path:** Add diagnostics to `auditResult.intentCoverage` and propagate unchanged; `competitorAnalysis` already spreads `audit` objects, so no new wiring required.

### `SearchIntentCoverageCard.tsx`
- **Props:** `bibleCoverage?: SearchIntentCoverageResult`.
- **Fallback messaging:** Already displays “Minimal Patterns” badge using `bibleCoverage.fallbackMode`.
- **Future diagnostics:** Additional messaging (cache TTL, pattern count) can be rendered within the existing component by reading new fields on `bibleCoverage`. No new component needed.

### Discovery Footprint components
- `DiscoveryFootprintMap.tsx` consumes classified combos from `auditResult.comboCoverage`.
- No direct use of `intentCoverage`, but future diagnostics (e.g., “footprint limited due to minimal patterns”) should be passed via props from `UnifiedMetadataAuditModule`, not by creating a new data source.

### Competitor intent flow
- **`competitor-audit.service.ts`:** Stores full `UnifiedMetadataAuditResult` for competitors (`audit` field). No special handling required.
- **`competitor-comparison.service.ts`:** Reads `auditData.intentCoverage` to compute intent gaps. Diagnostics should be read from the same field; no new DTO.
- **UI components:** `CompetitorComparisonSummary` and `CompetitorComparisonTable` use `audit.intentCoverage`. Extend these components to read diagnostics (e.g., display fallback warnings) rather than adding new props.

## 3. Diagnostics Injection Points

| Location | Existing Surface | Planned Injection |
| --- | --- | --- |
| Intent Engine | `getIntentPatternCacheDiagnostics()` | Populate `IntentDiagnosticsContext` from this function; no new loader. |
| Search Intent Coverage Engine | `CombinedSearchIntentCoverage` | Embed diagnostics (e.g., `fallbackMode`, `patternsLoaded`) directly here so consumers inherit data via existing field. |
| Metadata Audit Result | `intentCoverage` | Attach `diagnostics` or extend coverage result with `diagnostics` object to avoid new DTO. |
| KPI Engine | `primitives.intentFallbackMode` (already present) | Reuse this flag to adjust KPI normalization; optionally pass diagnostics through `kpiResult.meta`. |
| UI Components | Existing props (`bibleCoverage`, `audit.intentCoverage`) | Read new diagnostics fields under the same props (no new component). |
| Competitor flows | `competitorAudit.auditData.intentCoverage` | Propagate diagnostics through existing audit data; surface warnings in comparison UI by reading this field. |

## 4. Confirmation of Single Source & Mapping
- **Pattern Source:** Only `aso_intent_patterns` (via adminIntentService) plus fallback `commonPatterns/intentPatterns.ts`. No other registry involved.
- **Mapping:** Search intent classification uses Intent Engine patterns; combo intent classification maps search intents to `learning/outcome/brand/noise` via `mapSearchIntentToComboIntent`. No new mapping layer required.
- **DTO Chain:** `intentCoverage` → `UnifiedMetadataAuditResult` → UI + competitor audits. All diagnostics must piggyback on this chain.

## 5. Places Diagnostics Already Flow
- `intentEngineDiagnostics` (dev panel) already includes fallback info but is not user-facing.
- `CombinedSearchIntentCoverage` now carries `fallbackMode`.
- KPI primitives include `intentFallbackMode` for normalization.
- UI card already shows minimal-pattern warning based on `bibleCoverage.fallbackMode`.

## 6. Where to Add Fields Without New Interfaces
- Extend `CombinedSearchIntentCoverage` with a nested `diagnostics` object (e.g., `{ fallbackMode, patternsLoaded, cacheTtlRemaining }`) rather than adding parallel DTOs.
- If additional context needed beyond coverage, add a top-level `intentDiagnostics?: IntentDiagnosticsContext` on `UnifiedMetadataAuditResult` referencing existing types.
- UI components should destructure diagnostics from the existing props (e.g., `const diagnostics = bibleCoverage?.diagnostics`), avoiding new component props.

## 7. UI Components Accepting `audit`
- `UnifiedMetadataAuditModule`: passes `auditResult` to child cards and competitor flows.
- `CompetitorComparisonSummary` / `CompetitorComparisonTable`: receive `audit` objects; diagnostics can be read via `audit.intentCoverage?.diagnostics`.
- `DiscoveryFootprintMap`: receives `comboCoverage` and can read diagnostics through module-level context if needed, but no new props should be introduced beyond existing audit object structure.

This audit confirms the entire intent stack already exposes the necessary surfaces to extend diagnostics without duplicating logic or creating new systems.

## 8. Workstream A2 — Implementation Preview (No Code)

1. **Define IntentDiagnosticsContext**  
   - Location: `src/engine/asoBible/searchIntentCoverageEngine.ts` alongside `CombinedSearchIntentCoverage`.  
   - Structure: reuse data from `getIntentPatternCacheDiagnostics()` (`patternsLoaded`, `fallbackMode`, `cacheTtlRemaining`) plus coverage-specific flags (e.g., `titleTokensClassified`, `subtitleTokensClassified`).  
   - Attach as optional `diagnostics?: IntentDiagnosticsContext` field on `CombinedSearchIntentCoverage`.

2. **Populate context inside MetadataAuditEngine**  
   - After calling `getIntentPatternCacheDiagnostics()` and `computeCombinedSearchIntentCoverage`, compose `IntentDiagnosticsContext` (no new helpers) and assign to `intentCoverage.diagnostics`.  
   - Ensure `intentCoverage` remains the sole carrier of diagnostics through `UnifiedMetadataAuditResult`.

3. **Expose diagnostics on UnifiedMetadataAuditResult**  
   - Extend `UnifiedMetadataAuditResult` type to reflect `intentCoverage.diagnostics` (no new top-level DTO).  
   - Competitor audits automatically inherit diagnostics because they store the full audit object.

4. **Hook SearchIntentCoverageCard**  
   - Read `bibleCoverage?.diagnostics` and display additional messaging (pattern counts, TTL).  
   - No prop changes; simply destructure from the existing `bibleCoverage` object.

5. **Discovery Footprint components**  
   - When rendering `DiscoveryFootprintMap`, check `auditResult.intentCoverage?.diagnostics` to warn about fallback mode if necessary.  
   - Avoid new props—use the same `auditResult` object passed today.

6. **Competitor comparison surfaces**  
   - `competitor-comparison.service.ts` and UI components can read diagnostics via `audit.intentCoverage?.diagnostics` to annotate comparisons (e.g., “Competitor coverage limited due to fallback patterns”).  
   - No DTO or service changes beyond reading the new field.

7. **IntentDiagnosticsContext consumers**  
   - Use existing `intentEngineDiagnostics` for deep debugging; `IntentDiagnosticsContext` is purely for user-facing messaging within existing cards.

This preview satisfies the constraints: diagnostics originate from the existing Intent Engine, flow through `intentCoverage`, and render inside current UI components without duplicating logic or creating new structures.
