import type { LucideIcon } from "lucide-react";

export interface NavigationItem {
  title: string;
  url: string;
  icon: LucideIcon;
  status?: "active" | "coming_soon" | "under_development" | "beta";
  statusLabel?: string;
  featureKey?: string;
}

export interface FilterOptions {
  routes: string[];
  isDemoOrg: boolean;
  isSuperAdmin: boolean;
  hasFeature: (featureKey: string) => boolean;
}

export const filterNavigationByRoutes = (
  items: NavigationItem[],
  { routes, isDemoOrg, isSuperAdmin, hasFeature }: FilterOptions
): NavigationItem[] => {
  return items.filter(item => {
    // Super admin bypass - can see everything
    if (isSuperAdmin) {
      return true;
    }

    // Check if item URL is in allowed routes
    const isRouteAllowed = routes.some(route =>
      item.url === route || item.url.startsWith(route + '/')
    );

    // Check feature access
    const hasFeatureAccess = !item.featureKey || hasFeature(item.featureKey);

    // Demo orgs bypass feature gating but still require route allowance
    if (isDemoOrg) {
      return isRouteAllowed;
    }

    // Non-demo orgs require both route and feature access
    return isRouteAllowed && hasFeatureAccess;
  });
};
