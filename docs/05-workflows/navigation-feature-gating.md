# Navigation Feature Gating

Navigation visibility is determined before rendering using the `filterNavigationByRoutes` utility.

The function applies three checks:

- **Route allowance** – only routes returned by `getAllowedRoutes` are considered.
- **Demo organisation bypass** – demo organisations ignore feature flags but still respect route allowance.
- **Feature access for non-demo organisations** – items require both an allowed route and a granted feature key.

Super administrators with the `ui.admin.platform_settings` permission bypass all checks.
