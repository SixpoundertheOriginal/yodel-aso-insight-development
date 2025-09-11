## Minimal Test Plan

Unit
- Authorize policy
  - Next viewer → POST `/functions/v1/authorize` with `{ path: "/aso-ai-hub", method: "GET" }` → `{ allow: true }`
  - Non-demo viewer → same → `{ allow: false }`

Integration
- `/functions/v1/admin-whoami` returns `org_id`, `is_demo`, `features` for seeded Next user

E2E (Playwright)
- Login as Next viewer
- Sidebar contains “ASO AI Audit (Demo)”
- Visiting `/aso-ai-hub` loads without redirect to `/no-access`

Commands (sketch)
```
pnpm test:unit
pnpm test:e2e
```

Note: Use `data-testid="dashboard-stat-card"` to assert card counts where needed.

