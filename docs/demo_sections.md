# Demo Sections (Org-Scoped, Server-Truth)

Feature Keys (per organization)
- `aso_audit_demo`
- `creative_review_demo`
- `keyword_insights_demo`

Endpoints (Supabase Edge Functions)
- `GET /functions/v1/demo-creative-review-summary`
- `GET /functions/v1/demo-keyword-insights-summary`

Contract
- JSON only; includes `meta.org_id`, summary, findings, recommendations.
- Derives `org_id` from JWT (via `profiles`), never from client input.

Authorize Rules
- Centralized in `supabase/functions/authorize/index.ts`:
  - Allow for viewer+ if `whoami.is_demo === true` and feature enabled for route.
  - Super admin always allowed.
  - Deny others: `{ allow:false, reason:'feature_not_enabled_or_not_demo' }`.

UI Wiring
- Sidebar items appear only if `whoami.features` includes the key.
- Routes are `ProtectedRoute`; guard calls `/functions/v1/authorize` pre-mount.
- Pages fetch summaries with fetch Content-Type checks.

RLS & Storage
- If backed by tables: enforce RLS `organization_id = auth.uid() org` via policy or secure RPC.
- Static JSON is acceptable for demo as long as auth is validated and org is resolved from server.

