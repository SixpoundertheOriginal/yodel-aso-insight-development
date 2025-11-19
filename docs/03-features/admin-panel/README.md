# Admin Panel Overview (Updates)

## Backend Connectivity
- Status: Organization + User CRUD is connected (Edge Functions + Postgres).
- Identity/authorization: whoami + authorize are the sources of truth.
- Contracts: see `docs/ADMIN_USERS_API.md` and `docs/USER_ORGANIZATION_API_CONTRACT.md`.

## Navigation (New Demo Sections)
- Demo sections (visible only when whoami.is_demo and feature enabled):
  - Creative Review (Demo)
  - Keyword Insights (Demo)
  - Details → `docs/demo_sections.md`

## Rollout Roadmap (Backend-First)
- Seed demo feature flags for the “Next” org:
  - `aso_audit_demo`, `creative_review_demo`, `keyword_insights_demo`.
- Add read-only demo endpoints (`/functions/v1/demo-*`) with server-derived org_id and RLS.
- UI consumes server-truth; no client heuristics.
