/**
 * DEFAULT ORGANIZATION ROUTES CONFIGURATION
 *
 * This file defines the default pages accessible to organization users.
 * Easy to add/remove routes - just edit the arrays below.
 *
 * Route Access Model:
 * - SUPER_ADMIN: Full access to all routes (developer testing, multi-org management)
 * - ORG_ADMIN: Default routes + user management (/admin/users)
 * - All other roles (ASO_MANAGER, ANALYST, VIEWER, CLIENT): Default routes only
 */

// ============================================
// DEFAULT ROUTES FOR ALL ORGANIZATION USERS
// ============================================

/**
 * These routes are accessible to ALL organization users
 * (ORG_ADMIN, ASO_MANAGER, ANALYST, VIEWER, CLIENT)
 */
export const DEFAULT_ORG_USER_ROUTES = [
  // Performance Intelligence
  '/dashboard-v2',                          // Performance Dashboard (primary)
  '/dashboard/executive',                   // Executive Dashboard
  '/dashboard/analytics',                   // Analytics Dashboard
  '/dashboard/conversion-rate',             // Conversion Rate Analysis

  // Growth Accelerators
  '/growth-accelerators/keywords',          // Keyword Intelligence
  '/growth-accelerators/reviews',           // Reviews Management
  '/growth-accelerators/reviews/:appId',    // Review Details (dynamic)
  '/growth-accelerators/competitor-overview', // Competitor Overview

  // AI Command Center (feature-gated per organization)
  '/aso-ai-hub',                            // Strategic Audit Engine (requires aso_ai_hub feature)
  '/metadata-copilot',                      // Metadata Optimizer (requires metadata_generator feature)

  // Account Management
  '/profile',                               // User Profile

  // Legacy/Additional Dashboards
  '/dashboard',                             // Legacy Dashboard (if still needed)
] as const;

/**
 * Additional routes accessible to ORG_ADMIN only
 * (in addition to DEFAULT_ORG_USER_ROUTES)
 */
export const ORG_ADMIN_ADDITIONAL_ROUTES = [
  '/admin/users',                           // User Management (create/manage org users)
  '/admin/placeholder',                     // Admin placeholder page
] as const;

/**
 * Routes accessible to SUPER_ADMIN only
 * (full platform access for developers and platform administrators)
 */
export const SUPER_ADMIN_ONLY_ROUTES = [
  '/admin',                                 // Admin Dashboard
  '/admin/organizations',                   // Organization Management
  '/admin/features',                        // Feature Management
  '/admin/testing-lab',                     // Feature Testing Lab
  '/admin/security',                        // Security Monitoring
  '/settings',                              // Platform Settings
  '/apps',                                  // App Management (full access)
  '/app-discovery',                         // App Discovery
  '/chatgpt-visibility-audit',              // AI Visibility Optimizer
  '/aso-knowledge-engine',                  // Strategy Brain
  '/growth-gap-copilot',                    // Opportunity Scanner
  '/featuring-toolkit',                     // Feature Maximizer
  '/creative-analysis',                     // Creative Analysis
  '/growth/web-rank-apps',                  // Web Rank Apps
  '/aso-unified',                           // ASO Unified
  '/smoke-test',                            // Smoke Test Page
] as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get allowed routes for a specific role
 */
export function getAllowedRoutesForRole(role: string, isSuperAdmin: boolean): string[] {
  // SUPER_ADMIN: Full access to everything
  if (isSuperAdmin) {
    return [
      ...DEFAULT_ORG_USER_ROUTES,
      ...ORG_ADMIN_ADDITIONAL_ROUTES,
      ...SUPER_ADMIN_ONLY_ROUTES,
    ];
  }

  // ORG_ADMIN: Default routes + user management
  if (role === 'ORG_ADMIN' || role === 'org_admin') {
    return [
      ...DEFAULT_ORG_USER_ROUTES,
      ...ORG_ADMIN_ADDITIONAL_ROUTES,
    ];
  }

  // All other roles: Default routes only
  return [...DEFAULT_ORG_USER_ROUTES];
}

/**
 * Check if a specific route is allowed for a role
 * Supports dynamic routes (e.g., /reviews/:appId)
 */
export function isRouteAllowed(route: string, role: string, isSuperAdmin: boolean): boolean {
  const allowedRoutes = getAllowedRoutesForRole(role, isSuperAdmin);

  // Exact match
  if (allowedRoutes.includes(route)) {
    return true;
  }

  // Check for dynamic route matches (e.g., /reviews/123 matches /reviews/:appId)
  return allowedRoutes.some(allowedRoute => {
    if (allowedRoute.includes(':')) {
      // Convert dynamic route pattern to regex
      const pattern = allowedRoute.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(route);
    }
    return false;
  });
}

/**
 * Check if user can access admin panel
 */
export function canAccessAdminPanel(role: string, isSuperAdmin: boolean): boolean {
  // SUPER_ADMIN: Full admin access
  if (isSuperAdmin) {
    return true;
  }

  // ORG_ADMIN: Limited admin access (only /admin/users)
  if (role === 'ORG_ADMIN' || role === 'org_admin') {
    return true;
  }

  // All other roles: No admin access
  return false;
}

/**
 * Get specific admin routes accessible to a role
 */
export function getAllowedAdminRoutes(role: string, isSuperAdmin: boolean): string[] {
  // SUPER_ADMIN: All admin routes
  if (isSuperAdmin) {
    return [
      '/admin',
      '/admin/users',
      '/admin/organizations',
      '/admin/features',
      '/admin/testing-lab',
      '/admin/security',
      '/admin/placeholder',
    ];
  }

  // ORG_ADMIN: User management only
  if (role === 'ORG_ADMIN' || role === 'org_admin') {
    return [
      '/admin/users',
      '/admin/placeholder',
    ];
  }

  // All other roles: No admin access
  return [];
}

// ============================================
// DOCUMENTATION & EXAMPLES
// ============================================

/**
 * USAGE EXAMPLES:
 *
 * 1. Check if user can access a route:
 *    const canAccess = isRouteAllowed('/dashboard-v2', 'ORG_ADMIN', false);
 *
 * 2. Get all allowed routes for a user:
 *    const routes = getAllowedRoutesForRole('ORG_ADMIN', false);
 *
 * 3. Check if user can access admin panel:
 *    const canAccessAdmin = canAccessAdminPanel('ORG_ADMIN', false);
 *
 * 4. Get specific admin routes:
 *    const adminRoutes = getAllowedAdminRoutes('ORG_ADMIN', false);
 */

/**
 * HOW TO ADD NEW ROUTES:
 *
 * 1. For all organization users:
 *    Add to DEFAULT_ORG_USER_ROUTES array
 *
 * 2. For ORG_ADMIN only:
 *    Add to ORG_ADMIN_ADDITIONAL_ROUTES array
 *
 * 3. For SUPER_ADMIN only:
 *    Add to SUPER_ADMIN_ONLY_ROUTES array
 *
 * No database migrations or code changes needed!
 */

/**
 * ROLE HIERARCHY:
 *
 * SUPER_ADMIN (Platform Level)
 *   └─ Full access to all routes
 *   └─ Can manage all organizations
 *   └─ Developer testing and platform administration
 *
 * ORG_ADMIN (Organization Level)
 *   └─ Default org user routes
 *   └─ User management for their organization
 *   └─ Cannot access other organizations
 *
 * ASO_MANAGER, ANALYST, VIEWER, CLIENT
 *   └─ Default org user routes only
 *   └─ No admin access
 *   └─ No user management
 */
