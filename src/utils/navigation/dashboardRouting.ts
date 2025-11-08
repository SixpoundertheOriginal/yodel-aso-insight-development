/**
 * DASHBOARD ROUTING LOGIC
 * Hybrid Feature+Role Based Routing for Enterprise Security
 *
 * This module implements the decision logic for which dashboard
 * a user should see upon login, using a hybrid approach:
 * - Role-based guardrails (security layer)
 * - Feature-based entitlements (commercial flexibility)
 *
 * Part of Enterprise Security Architecture:
 * @see ORGANIZATION_ROLES_SYSTEM_DOCUMENTATION.md
 * @see ENTERPRISE_READINESS_ASSESSMENT.md
 */

import { PLATFORM_FEATURES_ENHANCED } from '@/constants/features';

export type UserRole =
  | 'super_admin'
  | 'org_admin'
  | 'aso_manager'
  | 'analyst'
  | 'viewer'
  | 'client';

export interface DashboardRoutingContext {
  role: UserRole | string;
  isSuperAdmin: boolean;
  hasExecutiveDashboard: boolean;
  hasReportingV2: boolean;
}

/**
 * Dashboard Route Constants
 */
export const DASHBOARD_ROUTES = {
  EXECUTIVE: '/dashboard/executive',  // v2 - Performance Overview
  ANALYTICS: '/dashboard',             // legacy - Store Performance
  OVERVIEW: '/overview',               // v2 alias
} as const;

/**
 * Determine which dashboard a user should see based on role and features
 *
 * Decision Logic (Hybrid Approach):
 * 1. Super Admins → Always v2 (executive dashboard)
 * 2. Feature-enabled roles → v2 if feature flag is on
 * 3. Default fallback → legacy analytics
 *
 * @param context - User's role and feature access
 * @returns Dashboard route path
 *
 * @example
 * ```typescript
 * const route = shouldUseV2Dashboard({
 *   role: 'org_admin',
 *   isSuperAdmin: false,
 *   hasExecutiveDashboard: true,
 *   hasReportingV2: true
 * });
 * // Returns: '/dashboard/executive'
 * ```
 */
export function shouldUseV2Dashboard(context: DashboardRoutingContext): string {
  const { role, isSuperAdmin, hasExecutiveDashboard, hasReportingV2 } = context;

  // Rule 1: Super Admins always get v2 (platform access)
  if (isSuperAdmin) {
    console.log('[ROUTING] Super Admin → Executive Dashboard (v2)');
    return DASHBOARD_ROUTES.EXECUTIVE;
  }

  // Rule 2: Feature-enabled roles get v2
  // Check both feature flags for flexibility during rollout
  const hasV2Access = hasExecutiveDashboard || hasReportingV2;

  if (hasV2Access) {
    // Role-based guardrails: Only certain roles can access v2
    const v2EligibleRoles: UserRole[] = ['org_admin', 'aso_manager', 'analyst'];

    if (v2EligibleRoles.includes(role as UserRole)) {
      console.log(`[ROUTING] ${role} + v2 feature enabled → Executive Dashboard (v2)`);
      return DASHBOARD_ROUTES.EXECUTIVE;
    }

    // User has feature but role doesn't qualify
    console.log(`[ROUTING] ${role} has v2 feature but role not eligible → Legacy Analytics`);
    return DASHBOARD_ROUTES.ANALYTICS;
  }

  // Rule 3: Default fallback to legacy
  console.log(`[ROUTING] ${role} without v2 features → Legacy Analytics`);
  return DASHBOARD_ROUTES.ANALYTICS;
}

/**
 * Check if user has access to v2 dashboard features
 *
 * @param features - Array of feature keys the user has access to
 * @returns true if user has either executive_dashboard or reporting_v2 feature
 */
export function hasV2DashboardAccess(features: string[]): {
  hasExecutiveDashboard: boolean;
  hasReportingV2: boolean;
  hasAnyV2Access: boolean;
} {
  const hasExecutiveDashboard = features.includes(
    PLATFORM_FEATURES_ENHANCED.EXECUTIVE_DASHBOARD
  );
  const hasReportingV2 = features.includes('reporting_v2');

  return {
    hasExecutiveDashboard,
    hasReportingV2,
    hasAnyV2Access: hasExecutiveDashboard || hasReportingV2,
  };
}

/**
 * Get human-readable dashboard name for logging/UI
 */
export function getDashboardName(route: string): string {
  switch (route) {
    case DASHBOARD_ROUTES.EXECUTIVE:
    case DASHBOARD_ROUTES.OVERVIEW:
      return 'Executive Dashboard (v2)';
    case DASHBOARD_ROUTES.ANALYTICS:
      return 'Analytics Dashboard (legacy)';
    default:
      return 'Unknown Dashboard';
  }
}

/**
 * Audit log helper for dashboard routing decisions
 * Useful for compliance and debugging
 */
export function logDashboardRouting(
  userEmail: string,
  context: DashboardRoutingContext,
  route: string
): void {
  const timestamp = new Date().toISOString();
  const dashboardName = getDashboardName(route);

  console.log('[DASHBOARD-ROUTING-AUDIT]', {
    timestamp,
    userEmail,
    route,
    dashboardName,
    decision: {
      role: context.role,
      isSuperAdmin: context.isSuperAdmin,
      hasExecutiveDashboard: context.hasExecutiveDashboard,
      hasReportingV2: context.hasReportingV2,
    },
  });
}
