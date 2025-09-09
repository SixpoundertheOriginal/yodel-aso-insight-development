export const navPermissionMap: Record<string, string> = {
  // Performance analytics
  "/dashboard/analytics": "ui.debug.show_performance_metrics",
  // Admin
  "/admin/users": "ui.admin.show_user_management",
  "/admin": "ui.admin.platform_settings",
};

export function resolvePermForPath(pathname: string): string | undefined {
  const entries = Object.entries(navPermissionMap);
  // longest prefix match for stability
  entries.sort((a, b) => b[0].length - a[0].length);
  const hit = entries.find(([prefix]) => pathname.startsWith(prefix));
  return hit?.[1];
}

