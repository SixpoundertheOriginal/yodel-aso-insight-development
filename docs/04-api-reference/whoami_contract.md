---
Status: ACTIVE
Implementation Status: V1 PRODUCTION (SECONDARY authorization method)
Version: v1.0
Last Updated: 2025-01-20
Purpose: admin-whoami Edge Function API contract
⚠️ Important: This is a SECONDARY authorization method. PRIMARY method is usePermissions() hook.
See Also: docs/02-architecture/ARCHITECTURE_V1.md (Primary: usePermissions() hook)
See Also: docs/02-architecture/system-design/authorization-v1.md (V1 authorization guide)
Audience: Developers
---

> **ℹ️ V1 PRODUCTION (SECONDARY METHOD)**
>
> This Edge Function is in V1 production, but is **SECONDARY** to the primary authorization method.
>
> **V1 Authorization Methods (in order of priority):**
> 1. **PRIMARY:** `usePermissions()` hook (src/hooks/usePermissions.ts)
>    - Queries `user_permissions_unified` view directly
>    - Used by most components (Dashboard, AppSidebar, etc.)
>    - Faster (no Edge Function roundtrip)
>    - Recommended for new features
>
> 2. **SECONDARY:** `admin-whoami` Edge Function (this endpoint)
>    - Used by: ServerAuthContext, debug panels
>    - Provides: org_id, is_demo, features (planned V2), roles
>    - Legacy support for existing components
>    - Consider migrating to usePermissions() for better performance
>
> 3. **ROUTE-SPECIFIC:** `authorize` Edge Function (authorizePath)
>    - Used by: AppAuthGuard, ProtectedRoute
>    - Path-based authorization checks
>    - Complements usePermissions() for route protection
>
> **When to Use Each:**
> - **New components:** Use `usePermissions()` hook
> - **Server-side validation:** Use `admin-whoami` or `authorize` Edge Function
> - **Route protection:** Use `authorizePath()` from authz.ts

---

## /api/whoami Contract (Supabase Edge: admin-whoami)

**Path:** `${SUPABASE_URL}/functions/v1/admin-whoami`
**Method:** GET
**Auth:** Bearer JWT (Supabase)
**Status:** V1 Production (Secondary method)

Example response
```
{
  "user_id": "...",
  "email": "user@example.com",
  "org_id": "org_123" | null,
  "is_super_admin": false,
  "is_demo": true,
  "features": ["aso_audit_demo", "analytics"],
  "roles": [{ "role": "VIEWER", "organization_id": "org_123" }],
  "organization": { "id": "org_123", "name": "Next", "slug": "next", "settings": { "demo_mode": true } },
  "organizations": [ ... ]
}
```

Notes
- `org_id`: active/primary organization inferred from user roles; super-admin may have `null`.
- `is_demo`: true if `organizations.settings.demo_mode` is true or slug is `next` (server truth; no client heuristics).
- `features`: derived from `organization_features` rows where `is_enabled=true`.
- No direct references to auth schema internals (e.g., `auth.users`) are exposed.
- Extend as needed but keep frontend relying on this single source for org/demo/features.

Key handler location
- `supabase/functions/admin-whoami/index.ts` (includes org settings + features aggregation)

Tests (pseudo)
- Authenticated user with seeded Next org → `is_demo=true`, `features` includes `aso_audit_demo`.
- Non-demo org → `is_demo=false`, feature list as seeded.

