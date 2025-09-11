# Project Instructions (Updated)

## Tenancy & Auth
- Server‑truth only (no client heuristics).
- Feature flags per org (returned in `whoami.features[]`): `aso_audit_demo`, `creative_review_demo`, `keyword_insights_demo`.
- Identity: `GET /functions/v1/admin-whoami` → see `docs/auth_map.md` and `docs/whoami_contract.md`.
- Central gate: `POST /functions/v1/authorize` → see `docs/authz_matrix.md`.

## Demo Sections (Next org)
- Read-only endpoints (JSON-only):
  - `GET /functions/v1/demo-creative-review-summary`
  - `GET /functions/v1/demo-keyword-insights-summary`
- Scoping: org_id derived from JWT on the server; RLS enforced; never accept org_id from client.

## UI Gating Acceptance
- Sidebar and routes gated by server‑truth authorize responses.
- Demo items render only if whoami.is_demo === true and whoami.features includes the feature key.

## JSON‑Only Invariant
- All API responses return `Content-Type: application/json`.
- Frontend must guard before `res.json()` (see `docs/routing_fixes.md`).
