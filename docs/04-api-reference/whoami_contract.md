## /api/whoami Contract (Supabase Edge: admin-whoami)

Path: `${SUPABASE_URL}/functions/v1/admin-whoami`
Method: GET
Auth: Bearer JWT (Supabase)

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

