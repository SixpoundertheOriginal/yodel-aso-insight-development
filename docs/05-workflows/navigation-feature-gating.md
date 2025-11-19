---
Status: ACTIVE
Version: v1.0
Last Updated: 2025-01-19
Purpose: Navigation visibility and feature gating overview
⚠️ Note: INCOMPLETE - Only 12 lines, needs major expansion
See Also: docs/02-architecture/ARCHITECTURE_V1.md (role-based access control)
Audience: Developers
---

# Navigation Feature Gating

Navigation visibility is determined before rendering using the `filterNavigationByRoutes` utility.

The function applies three checks:

- **Route allowance** – only routes returned by `getAllowedRoutes` are considered.
- **Demo organisation bypass** – demo organisations ignore feature flags but still respect route allowance.
- **Feature access for non-demo organisations** – items require both an allowed route and a granted feature key.

Super administrators with the `ui.admin.platform_settings` permission bypass all checks.
