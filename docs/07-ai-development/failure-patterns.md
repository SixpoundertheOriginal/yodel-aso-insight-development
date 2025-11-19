## Anti-Pattern: Permission Logic Fragmentation

### Description
Multiple components compute the same permission/detection state independently (e.g., demo org detection, route allowlists, feature flags). This creates inconsistent results and race conditions across the app.

### Real Example From Our System
- `src/components/AppSidebar.tsx` computes navigation visibility using several inputs: `useDemoOrgDetection`, `getAllowedRoutes`, `useFeatureAccess`, `useUIPermissions`; it derives multiple filtered lists and uses an `allPermissionsLoaded` gate.
- `src/components/Auth/ProtectedRoute.tsx` separately computes `allowed` routes using `getAllowedRoutes({ isDemoOrg, role })` and redirects unauthorised users.
- `src/hooks/useAsoDataWithFallback.ts` uses `useDemoOrgDetection` again to branch data source behavior (skip BigQuery for demo orgs) and sets its own `isDemoOrg` flags in data payloads.
- `src/components/GlobalDemoIndicator.tsx` adds a fourth consumer of demo state.

Files involved:
- `src/components/AppSidebar.tsx` (lines around demo detection and filtering)
- `src/components/Auth/ProtectedRoute.tsx`
- `src/hooks/useAsoDataWithFallback.ts`
- `src/utils/navigation.ts` (filtering logic receives `isDemoOrg` + features)

### Why This Fails
- Resolution order differs: each consumer has separate async dependencies and loading states.
- Slightly different input data (e.g., when `profile` or `organization` hasn’t loaded) leads to divergent intermediate results.
- A change in one location (e.g., route allowlist) does not automatically fix other locations.

### Symptoms
- Partial functionality (sidebar section visible, but items or routes don’t match expectations).
- Inconsistent behavior across refreshes due to timing differences.
- Conflicting logs in different components for the same user/session.

### Correct Pattern
- Centralize permission and demo detection (single hook/provider) and consume that state everywhere.
- Ensure the router and the sidebar rely on the same derived source of truth for “allowed routes”.
- Treat the sidebar as a pure projection of the central permission state.

### Code Patterns (Fragmented → Centralized)
- Fragmented: each component calls `getAllowedRoutes(...)` and re‑checks features.
- Centralized: a single context/hook composes `isDemoOrg`, `role`, `featureFlags`, `uiPermissions`, and exposes `allowedRoutes` + `can(feature)` in a stable value.

---

## Anti-Pattern: Feature Flags Overriding Explicit Permissions

### Description
Feature flags and permission checks are applied in multiple layers, sometimes as logical AND with explicit route permissions. This can override intended access for demo/testing scenarios.

### Real Example From Our System
- `src/utils/navigation.ts` applies feature gating for non‑demo orgs: an item must be in allowed routes AND pass `hasFeature(item.featureKey)`.
- `src/components/AppSidebar.tsx` defines items with `featureKey` (e.g., Growth Accelerators), then filters via `filterNavigationByRoutes(...)` using both route allowlist and features.
- `src/components/Auth/ProtectedRoute.tsx` separately validates access via allowed routes, independent of features.

Resulting issue pattern we hit:
- Routes were permitted for demos, but a second feature layer still blocked the items in navigation, leading to visible sections with empty menus.

### Why This Fails
- No single precedence model (route vs feature vs UI permission).
- Multiple filters act as AND conditions when demos needed route allowance to suffice.

### Symptoms
- Users can manually navigate to a route but don’t see a corresponding sidebar item.
- Section headers show up but are empty.

### Correct Pattern
- Define precedence and stick to it. Examples:
  - For demo orgs: allowed routes bypass feature flags (already done in `filterNavigationByRoutes`).
  - For non‑demo orgs: route allowlist AND features may both apply, but keep that logic in one place so UI and routing agree.
- Keep feature flags additive; avoid them silently blocking explicitly allowed navigation when demos/testing is intended.

---

## Anti-Pattern: Frontend Logic Depending on Missing Database Fields

### Description
Components rely on fields that queries don’t select, causing undefined values and silent permission failures.

### Real Example From Our System (historical)
- Demo detection logic requires `organization.slug` and `organization.settings.demo_mode`.
- Earlier versions of the profile/org queries did not select these fields, resulting in `undefined`, which made `isDemoOrg` evaluate incorrectly.
- Current code selects them (see `src/hooks/useUserProfile.ts`):
  ```ts
  organizations(name, subscription_tier, slug, settings)
  ```

### Why This Fails
- Logic “works on paper” but the data isn’t present at runtime.
- Type definitions often allow `undefined`, so there’s no type‑level error.

### Symptoms
- Permission checks always false in certain environments.
- Flaky behavior depending on which component accessed data first (and whether it fetched the right fields).

### Correct Pattern
- Document and centralize required fields per feature (e.g., demo detection requires `slug` + `settings.demo_mode`).
- Enforce query fragments/utilities so the same field set is reused (and typed) by all consumers.
- Validate critical fields before computing permissions; surface explicit errors if missing.

---

## Anti-Pattern: Implementing Based on Assumptions vs System Reality

### Description
Applying “obvious” code fixes without validating actual system state (e.g., data presence, route config, timing) leads to repeated failures.

### Real Example From Our System
- Multiple attempts to tweak navigation logic (feature filters, route lists) failed because the root cause was missing/late data (e.g., org fields unavailable yet).
- Another case: adjusting sidebar logic when the router’s allowed routes were the actual blocker.

### Why This Fails
- Static code inspection doesn’t expose runtime timing/data issues.
- Complex systems with several providers (auth, org, features, UI permissions) produce emergent behavior.

### Symptoms
- “Fixes” that look correct but don’t change user‑visible behavior.
- Regressions as changes fight other layers.

### Correct Pattern
- Audit real state first: console.log key inputs (role, isDemoOrg, allowedRoutes, features) together in one place.
- Verify data flow (queries include required fields; providers hydrated) before changing logic.
- Prefer root‑cause corrections (query fields, provider sequencing, centralization) over local patches.

---

## Pattern Impact Analysis

For each pattern, capture the following to quantify impact and guide prioritization.

### Development Time Lost
- Fragmentation: Debugging across multiple components commonly adds 2–6 hours per incident.
- Feature override conflicts: 1–3 hours to locate AND/precedence issues.
- Missing fields: 2–4 hours including DB/TypeScript cross‑checks.
- Assumption‑based fixes: Multi‑day risk when chasing symptoms.

### Business Impact
- Demo failures and prospect confusion when navigation doesn’t match intended access.
- Partial functionality undermines user trust during evaluations.

### Technical Debt
- Accumulated if fixes are applied in multiple places rather than at the source.
- Entropy increases when permission models are duplicated.

### Recovery Cost
- High, when multiple layers (router, sidebar, features, data providers) require synchronized changes.

---

## Prevention Strategies

### Early Warning Signs
- Divergent logs: different components reporting different `isDemoOrg` or route allowlists.
- Empty sidebar sections with known‑good routes.
- Permission checks relying on optional/possibly missing fields.

### Validation Steps
- Add a single consolidated debug log frame (behind `NODE_ENV === 'development'`) showing:
  - `role`, `isDemoOrg`, `allowedRoutes.length`, first N `allowedRoutes`
  - `featuresEnabled` sample and `hasFeature` checks for a few keys
  - Data readiness flags from providers (auth/org/features/uiPerms)
- Verify query fragments include all required fields before changing permission logic.

### Alternative Approaches (Correct Patterns)
- Centralize: a `PermissionsProvider` that composes
  - `isDemoOrg` (from `useDemoOrgDetection`),
  - `role` (auth),
  - `allowedRoutes` (router policy),
  - `features` (feature access),
  - `uiPermissions` (UI‑level permissions),
  and exposes a single, typed interface for consumers.
- Single filter function controlling both router and sidebar inputs.
- Shared query fragments/utilities for organization/profile fields used in permissions.

### Recovery Procedures
- If navigation items are missing:
  1) Confirm target route is in `src/config/allowedRoutes.ts` for the current role/org.
  2) Check `isDemoOrg` and confirm demo precedence (bypass features) is in effect (`filterNavigationByRoutes`).
  3) Verify data availability: `organization.slug` and `organization.settings.demo_mode` are selected and hydrated.
  4) Ensure no component re‑implements filtering differently; consume centralized state.

---

## Success Criteria Checklist

- [ ] All major patterns captured with concrete file references.
- [ ] Root causes identified (data presence, precedence/order, duplication).
- [ ] Business impact articulated (demo reliability, user trust).
- [ ] Preventive steps actionable (centralize, validate inputs, define precedence).
- [ ] Recovery playbook documented for on‑call and devs.

