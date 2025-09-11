# ASO Platform Architecture (Updates)

## API Design: Authentication Flows
Server‑truth flow: the UI fetches whoami once to resolve `{ org_id, is_demo, features[] }`, and preflights protected routes via `POST /functions/v1/authorize { path, method }`. Edge Functions enforce RLS and return JSON only.

See:
- Overview → `docs/auth_map.md`
- WhoAmI payload → `docs/whoami_contract.md`
- Authorize rules → `docs/authz_matrix.md`

### Demo endpoints
- `GET /functions/v1/demo-creative-review-summary`
- `GET /functions/v1/demo-keyword-insights-summary`

Read‑only; org_id derived server‑side from JWT; JSON‑only.
Details and authorize rules → `docs/demo_sections.md` (§Endpoints, §Authorize Rules)

## Tenancy vs Demo-Mode
- Tenant isolation (RLS): all tenant tables enforce `organization_id = auth.jwt()->>'organization_id'` (or secure RPC equivalent).
- Demo-mode feature flags: per-organization feature keys (e.g., `aso_audit_demo`, `creative_review_demo`, `keyword_insights_demo`) returned in whoami.features.
- Authorize rule combines both: viewer+ allowed if `is_demo===true` and feature present; otherwise deny with structured reason.
