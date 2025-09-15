export const DEMO_REPORTING_ROUTES = [
  '/dashboard/executive',
  '/dashboard/analytics',
  '/dashboard/conversion-rate',
  // Allow Keywords Intelligence in demo mode
  '/growth-accelerators/keywords',
  // Allow Reviews in demo mode
  '/growth-accelerators/reviews',
  // Competitor overview in demo mode
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
  '/growth-accelerators/review-management-v2',
  '/growth-accelerators/keywords',
  '/app-discovery',
  '/apps',
  '/admin',
  '/profile',
  '/settings'
]; // TODO: extend with additional routes as needed

export function getAllowedRoutes({
  isDemoOrg,
  role
}: {
  isDemoOrg: boolean;
  role: Role;
}): string[] {
  if (isDemoOrg) return [...DEMO_REPORTING_ROUTES];
  if (role === 'VIEWER' || role === 'CLIENT') return [...DEMO_REPORTING_ROUTES];
  return [...DEMO_REPORTING_ROUTES, ...FULL_APP];
}
