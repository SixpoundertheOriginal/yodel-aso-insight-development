# Intent Extensibility Constraints

## 1. Non-Negotiable Boundaries
- **No new storage:** Do not create additional tables, RPCs, or Supabase schemas. All intent data must originate from `aso_intent_patterns` (and existing override tables) via `adminIntentService`.
- **No new registries:** Any enhancements must reuse `intentEngine`, `searchIntentCoverageEngine`, and `comboIntentClassifier`. No parallel pattern stores or JSON registries.
- **No new intent enums:** Continue using existing intent types (`informational`, `commercial`, `transactional`, `navigational`) and combo intents (`learning`, `outcome`, `brand`, `noise`). Mapping logic must remain unchanged.
- **No new DTO hierarchies:** The only acceptable place to add intent diagnostics is within `UnifiedMetadataAuditResult` (e.g., augment `intentCoverage` or add a dedicated diagnostics field). Do not create alternate payloads.
- **No new UI components:** Extend existing cards (Search Intent Coverage card, Discovery Footprint map, competitor comparison panels). Additional messaging must be rendered within those components.
- **No duplicate logic:** All diagnostics must flow through the same pipeline (Intent Engine → search coverage → audit result → UI). Avoid duplicating classification code or re-running pattern matching in the UI.

## 2. Allowed Extension Patterns
- **Extend existing interfaces:** Add optional fields (e.g., `diagnostics`) to `CombinedSearchIntentCoverage`, `UnifiedMetadataAuditResult`, or existing KPI meta objects.
- **Reuse existing functions:** If additional context is required, add helper functions inside `intentEngine.ts` or `searchIntentCoverageEngine.ts` rather than creating new modules.
- **Propagate through existing wiring:** Forward diagnostics via current audit DTOs, `useCompetitorAnalysis`, and UI props without introducing new hooks or contexts.
- **Enhance existing UI:** Add conditional blocks/badges/messages within current components to surface diagnostics; keep prop signatures compatible.
- **Leverage existing diagnostics:** Build any IntentDiagnosticsContext data by composing outputs from `getIntentPatternCacheDiagnostics`, `computeCombinedSearchIntentCoverage`, and KPI primitives—no new telemetry sources.

Following these constraints ensures the intent architecture remains single-sourced, maintainable, and compliant with Phase 1.5 scope.
