import {
  DEFAULT_ORG_USER_ROUTES,
  ORG_ADMIN_ADDITIONAL_ROUTES,
  SUPER_ADMIN_ONLY_ROUTES,
  getAllowedRoutesForRole as getRoutesForRole,
  isRouteAllowed as checkRouteAllowed,
} from './defaultOrgRoutes';

// ============================================
// LEGACY DEMO ROUTES (for backward compatibility)
// ============================================
export const DEMO_REPORTING_ROUTES = [
  '/dashboard-v2',
  '/dashboard/executive',
  '/dashboard/analytics',
  '/dashboard/conversion-rate',
  // Allow Keywords Intelligence in demo mode
  '/growth-accelerators/keywords',
  // Allow Reviews in demo mode
  '/growth-accelerators/reviews'
] as const;

export type Role =
  | 'SUPER_ADMIN'
  | 'ORGANIZATION_ADMIN'
  | 'ORG_ADMIN'
  | 'MANAGER'
  | 'ANALYST'
  | 'VIEWER'
  | 'ASO_MANAGER'
  | 'CLIENT';

// Legacy full app routes (kept for backward compatibility)
const LEGACY_FULL_APP: string[] = [
  '/overview',
  '/dashboard',
  '/conversion-analysis',
  '/insights',
  '/aso-ai-hub',
  '/chatgpt-visibility-audit',
  '/aso-knowledge-engine',
  '/metadata-copilot',
  '/growth-gap-copilot',
  '/featuring-toolkit',
  '/creative-analysis',
  '/growth/web-rank-apps',
  '/growth-accelerators/reviews',
  '/growth-accelerators/keywords',
  '/app-discovery',
  '/apps',
  '/admin',
  '/profile',
  '/settings'
];

// PHASE 1: Quick fix - Organizations restricted to reporting-only access
// PHASE 2: Database-driven access level (preferred when available)
// NOTE: Yodel Mobile removed from this list to enable ORG_ADMIN access (2025-11-12)
const REPORTING_ONLY_ORGS: string[] = [
  // Empty - use database-driven access_level instead
];

export type OrgAccessLevel = 'full' | 'reporting_only' | 'custom';

/**
 * NEW ROUTE ACCESS MODEL (November 2025)
 *
 * This function implements the simplified enterprise route model:
 * - SUPER_ADMIN: Full access to all routes (developer testing, platform admin)
 * - ORG_ADMIN: Default org routes + user management (/admin/users)
 * - All other roles: Default org routes only
 *
 * Routes are defined in src/config/defaultOrgRoutes.ts for easy maintenance.
 */
export function getAllowedRoutes({
  isDemoOrg,
  role,
  organizationId,
  orgAccessLevel,
  isSuperAdmin = false,
}: {
  isDemoOrg: boolean;
  role: Role;
  organizationId?: string | null;
  orgAccessLevel?: OrgAccessLevel | null;
  isSuperAdmin?: boolean;
}): string[] {
  // ============================================
  // SPECIAL CASE: Demo Organizations
  // ============================================
  if (isDemoOrg) {
    return [...DEMO_REPORTING_ROUTES];
  }

  // ============================================
  // SPECIAL CASE: Database-driven access level override
  // ============================================
  if (orgAccessLevel === 'reporting_only') {
    return [...DEMO_REPORTING_ROUTES];
  }

  // PHASE 1: Fallback to hardcoded list if access_level not yet loaded
  if (organizationId && REPORTING_ONLY_ORGS.includes(organizationId) && !orgAccessLevel) {
    return [...DEMO_REPORTING_ROUTES];
  }

  // ============================================
  // NEW ENTERPRISE MODEL (November 2025)
  // ============================================

  // Normalize role name
  const normalizedRole = role.toUpperCase().replace('ORGANIZATION_', 'ORG_');

  // SUPER_ADMIN: Full platform access
  if (isSuperAdmin || normalizedRole === 'SUPER_ADMIN') {
    return [
      ...DEFAULT_ORG_USER_ROUTES,
      ...ORG_ADMIN_ADDITIONAL_ROUTES,
      ...SUPER_ADMIN_ONLY_ROUTES,
    ];
  }

  // ORG_ADMIN: Default routes + user management
  if (normalizedRole === 'ORG_ADMIN') {
    return [
      ...DEFAULT_ORG_USER_ROUTES,
      ...ORG_ADMIN_ADDITIONAL_ROUTES,
    ];
  }

  // All other roles (ASO_MANAGER, ANALYST, VIEWER, CLIENT): Default routes only
  return [...DEFAULT_ORG_USER_ROUTES];
}

/**
 * Check if a specific route is allowed for a user
 */
export function isRouteAllowed(
  route: string,
  role: Role,
  isSuperAdmin: boolean
): boolean {
  const normalizedRole = role.toUpperCase().replace('ORGANIZATION_', 'ORG_');
  return checkRouteAllowed(route, normalizedRole, isSuperAdmin);
}

/**
 * MIGRATION NOTES:
 *
 * The old system used a complex combination of:
 * - Role-based access (VIEWER/CLIENT get limited routes)
 * - Organization-level access (reporting_only orgs get limited routes)
 * - Demo mode (demo orgs get limited routes)
 *
 * The new system simplifies to:
 * - SUPER_ADMIN: Full access
 * - ORG_ADMIN: Limited + user management
 * - Everyone else: Limited access
 *
 * Demo mode and reporting_only overrides are preserved for backward compatibility.
 */
