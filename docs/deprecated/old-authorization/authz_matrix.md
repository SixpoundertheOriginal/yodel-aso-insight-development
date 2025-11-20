---
Status: DEPRECATED
Version: v1.0
Last Updated: 2025-01-19
Archive Date: 2025-01-19
Reason: Documents unused 'authorize' Edge Function (not actively used)
Superseded By: docs/02-architecture/ARCHITECTURE_V1.md (current V1 authorization)
Audience: Historical reference only
---

> **⚠️ DEPRECATED:** This document describes the unused `authorize` Edge Function.
> See [ARCHITECTURE_V1.md](../../02-architecture/ARCHITECTURE_V1.md) for current V1 authorization (usePermissions() hook + RLS policies).

## /api/authorize Policy Matrix (Supabase Edge: authorize)

Path: `${SUPABASE_URL}/functions/v1/authorize`
Method: POST
Body: `{ "path": "/aso-ai-hub", "method": "GET" }`
Auth: Bearer JWT (Supabase)

Decision Inputs
- role (via `user_roles`), organization_id (via `profiles`), is_demo (via `organizations.settings.demo_mode`), features (via `organization_features`), path, method

Decision Output
```
{ "allow": true|false, "reason": "..." }
```

Rules
- ASO AI Audit (Demo): paths `/aso-ai-hub`, `/chatgpt-visibility-audit`, `/aso-unified`, `/demo/aso-ai-audit`
  - Allow if: `is_demo = true` AND `features['aso_audit_demo'] === true` AND role ∈ {viewer, analyst, admin, super_admin}
  - Deny otherwise with reason `feature_not_enabled_or_not_demo`
- Creative Review (Demo): path `/demo/creative-review`
  - Allow if: `is_demo = true` AND `features['creative_review_demo'] === true` AND role ∈ {viewer, analyst, admin, super_admin}
  - Deny: `feature_not_enabled_or_not_demo`
- Keyword Insights (Demo): path `/demo/keyword-insights`
  - Allow if: `is_demo = true` AND `features['keyword_insights_demo'] === true` AND role ∈ {viewer, analyst, admin, super_admin}
  - Deny: `feature_not_enabled_or_not_demo`
- Super admin: `allow=true` (reason `super_admin`)
- Default: allow (other routes retain existing guards)

Files
- `supabase/functions/authorize/index.ts`

Tests (pseudo)
- Next viewer → POST authorize `/aso-ai-hub` → `{ allow: true }`
- Non-demo viewer → POST authorize `/aso-ai-hub` → `{ allow: false }`
