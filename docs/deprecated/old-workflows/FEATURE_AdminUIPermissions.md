# Admin UI Permissions — Org Defaults

Purpose
- Add organization-level UI permission defaults layered over role baselines.
- Keeps existing role matrix intact and backward compatible.

Enable Feature
- Set the following env vars in your frontend build:
  - `VITE_UI_PERMISSIONS_ORG_DEFAULTS_ENABLED=true`
  - `VITE_SUPABASE_FUNCTIONS_BASE=https://<PROJECT_REF>.supabase.co/functions/v1/admin-ui-permissions`
  - `VITE_SUPABASE_ANON_KEY=<your_anon_key>`

Deploy Edge Function
- Link and set secrets (if not set globally):
  - `supabase link --project-ref <PROJECT_REF>`
  - `supabase functions deploy admin-ui-permissions`
- The function exposes:
  - `GET  /api/admin/ui-permissions?org_id=<uuid>` → `{ org_id, user_id, roleBaseline, orgDefaults, resolved }`
  - `PUT  /api/admin/ui-permissions` with body `{ org_id, updates: { [permKey]: boolean } }`

UI Behavior (UIPermissionManager)
- Existing "UI Permission Management" role matrix remains unchanged.
- When `VITE_UI_PERMISSIONS_ORG_DEFAULTS_ENABLED=true` and the user has a current organization context:
  - An "Org Defaults (current org)" section appears with toggles for supported keys.
  - Toggling a value calls the edge function `PUT` endpoint and refreshes the data.
- Resolution order shown in code and responses:
  - `resolved = { ...roleBaseline, ...orgDefaults }`

Security & Auditing
- RLS + membership checks enforced server-side; client `org_id` is never trusted.
- Only `SUPER_ADMIN` or `ORG_ADMIN` can `PUT` updates for an org.
- Upserts into `org_navigation_permissions` trigger `permission_audit_logs` entries automatically.

Troubleshooting
- 403 on `PUT`: account lacks `ORG_ADMIN`/`SUPER_ADMIN` in the target org.
- Empty `orgDefaults`: no org-level overrides exist yet; defaults inherit from `roleBaseline`.
- Non-JSON errors: Edge function always returns `application/json`; check network for proxy errors if HTML is seen.

Related Files
- Function: `supabase/functions/admin-ui-permissions/index.ts`
- Service: `src/services/uiPermissions.ts`
- Hook: `src/hooks/useUIPermissions.ts`
- UI: `src/components/admin/ui/UIPermissionManager.tsx`
- Tables: `org_navigation_permissions`, `user_navigation_overrides`, `permission_audit_logs`

