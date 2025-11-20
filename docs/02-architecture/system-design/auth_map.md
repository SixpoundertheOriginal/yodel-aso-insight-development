---
Status: DEPRECATED
Version: v1.0
Last Updated: 2025-01-20
Archive Date: 2025-01-20
Reason: Describes deprecated authorization patterns (authorize Edge Function, profiles table)
Superseded By: docs/02-architecture/system-design/authorization-v1.md (V1 authorization canonical)
Audience: Historical reference only
---

> **⚠️ DEPRECATED:** This document describes deprecated authorization patterns that are no longer used in production.
>
> **For Current V1 Authorization:**
> - **Primary:** [authorization-v1.md](./authorization-v1.md) - Complete V1 authorization guide
> - **Overview:** [ARCHITECTURE_V1.md](../ARCHITECTURE_V1.md) - V1 production architecture
>
> **What Changed:**
> - ❌ **OLD:** `authorize` Edge Function (deprecated, not actively used)
> - ✅ **NEW:** `usePermissions()` hook (faster, direct database queries)
> - ❌ **OLD:** `profiles` table (deprecated)
> - ✅ **NEW:** `user_roles` table (single source of truth)
>
> **Do not implement patterns from this document.** See [authorization-v1.md](./authorization-v1.md) for current implementation.

---

# Auth/RBAC/Demo-Mode Map (Historical)

Auth provider → JWT → DB → RLS → API → Frontend

- Auth Provider: Supabase Auth (JWT in `Authorization: Bearer <token>`)
- Session/JWT claims: validated by Supabase Edge Functions with `supabase.auth.getUser()`
- DB schema (key tables):
  - `profiles(id, organization_id, ...)`
  - `user_roles(user_id, organization_id, role)`
  - `organizations(id, slug, settings jsonb)`; `settings.demo_mode` toggles demo
  - `organization_features(organization_id, feature_key, is_enabled)`
- RLS (expected): tenant scoping via `organization_id`; super admin via `is_super_admin()` RPC
- API handlers (Edge Functions):
  - `supabase/functions/admin-whoami/index.ts` (server-truth identity)
  - `supabase/functions/authorize/index.ts` (central policy engine)
  - Other admin functions: `admin-organizations`, `admin-users`, `admin-ui-permissions`
- Frontend guards:
  - App-level: `src/components/Auth/AppAuthGuard.tsx` (now calls `authorize`)
  - Contexts/Hooks: `src/context/ServerAuthContext.tsx`, `src/services/authz.ts`
  - Sidebar gating: `src/components/AppSidebar.tsx` (server-truth demo/feature gate)

Env flags of note:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (implied), UI feature flags (e.g., `VITE_NAV_PERMISSIONS_ENABLED`)

Summary (10–15 lines)
- Server-truth lives in Supabase Edge Functions. `admin-whoami` now returns `{ org_id, is_demo, features }` derived from DB (`organizations.settings.demo_mode` and `organization_features`).
- A new `authorize` function takes `{ path, method }` and evaluates org role + demo + feature rules, including ASO AI Audit (Demo) access for the “Next” demo org.
- Frontend fetches `whoami` once via `ServerAuthProvider` and authorizes each protected route through `/functions/v1/authorize` in `AppAuthGuard`.
- Sidebar visibility for ASO AI Audit is controlled by server truth: only visible if `is_demo=true` and `features` includes `aso_audit_demo`.
- RLS must enforce tenant isolation on all org-scoped tables and permit super-admin via RPC.
- Avoid all client-only heuristics for demo detection (e.g., slug checks) where possible; the source of truth is `admin-whoami`/`authorize`.

See also
- WhoAmI payload → `docs/whoami_contract.md`
- Authorize rules → `docs/authz_matrix.md`
