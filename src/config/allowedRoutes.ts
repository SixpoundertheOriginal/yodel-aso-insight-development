export const DEMO_REPORTING_ROUTES = [
  '/dashboard-v2',
  '/dashboard/executive',
  '/dashboard/analytics',
  '/dashboard/conversion-rate',
  // Allow Keywords Intelligence in demo mode
  '/growth-accelerators/keywords',
  // Allow Reviews in demo mode
  '/growth-accelerators/reviews',
  // Re-enable Competitor Overview in demo mode
  '/growth-accelerators/competitor-overview'
] as const;

export type Role =
  | 'SUPER_ADMIN'
  | 'ORGANIZATION_ADMIN'
  | 'MANAGER'
  | 'ANALYST'
  | 'VIEWER'
  | 'ASO_MANAGER'
  | 'CLIENT';

const FULL_APP: string[] = [
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
]; // TODO: extend with additional routes as needed

// PHASE 1: Quick fix - Organizations restricted to reporting-only access
// PHASE 2: Database-driven access level (preferred when available)
const REPORTING_ONLY_ORGS = [
  '7cccba3f-0a8f-446f-9dba-86e9cb68c92b', // Yodel Mobile (fallback if access_level not loaded)
];

export type OrgAccessLevel = 'full' | 'reporting_only' | 'custom';

export function getAllowedRoutes({
  isDemoOrg,
  role,
  organizationId,
  orgAccessLevel
}: {
  isDemoOrg: boolean;
  role: Role;
  organizationId?: string | null;
  orgAccessLevel?: OrgAccessLevel | null;
}): string[] {
  // PHASE 2: Database-driven organization-level restriction (preferred)
  if (orgAccessLevel === 'reporting_only') {
    return [...DEMO_REPORTING_ROUTES];
  }

  // PHASE 1: Fallback to hardcoded list if access_level not yet loaded
  if (organizationId && REPORTING_ONLY_ORGS.includes(organizationId) && !orgAccessLevel) {
    return [...DEMO_REPORTING_ROUTES];
  }

  // Demo organizations get reporting routes only
  if (isDemoOrg) return [...DEMO_REPORTING_ROUTES];

  // VIEWER and CLIENT roles get reporting routes only
  if (role === 'VIEWER' || role === 'CLIENT') return [...DEMO_REPORTING_ROUTES];

  // All other cases: full app access
  return [...DEMO_REPORTING_ROUTES, ...FULL_APP];
}
