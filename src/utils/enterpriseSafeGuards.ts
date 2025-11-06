/**
 * ENTERPRISE SAFE GUARDS
 * Defensive utility functions for safe permission and feature handling
 * Prevents UI crashes when permissions/features are unavailable
 */

/**
 * SafePermissions Type
 * Complete permissions object with all required fields
 */
export interface SafePermissions {
  userId?: string;
  organizationId: string | null;
  roles: string[];
  organizationRoles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
  isOrganizationAdmin: boolean;
  canManageApps: boolean;
  canApproveApps: boolean;
  effectiveRole: string;
  isOrgScopedRole: boolean;
  allPermissions: any[];
  availableOrgs: Array<{ id: string; name: string; slug: string | null }>;
  isLoading: boolean;
}

/**
 * Enterprise Core Features
 * Baseline features available to all organizations as fallback
 */
export const ENTERPRISE_CORE_FEATURES = {
  app_core_access: true,
  profile_management: true,
  preferences: true,
  analytics: true,
  app_intelligence: true,
} as const;

/**
 * Safely wrap permissions object with complete defaults
 * Ensures all required fields exist to prevent undefined access errors
 */
export function withSafePermissions(
  permissions: Partial<SafePermissions> | null | undefined
): SafePermissions {
  const defaults: SafePermissions = {
    userId: undefined,
    organizationId: null,
    roles: [],
    organizationRoles: [],
    permissions: [],
    isSuperAdmin: false,
    isOrganizationAdmin: false,
    canManageApps: false,
    canApproveApps: false,
    effectiveRole: 'viewer',
    isOrgScopedRole: false,
    allPermissions: [],
    availableOrgs: [],
    isLoading: false,
  };

  if (!permissions) {
    return defaults;
  }

  return {
    ...defaults,
    ...permissions,
    // Ensure arrays are always arrays (not null/undefined)
    roles: safeArray(permissions.roles),
    organizationRoles: safeArray(permissions.organizationRoles),
    permissions: safeArray(permissions.permissions),
    allPermissions: safeArray(permissions.allPermissions),
    availableOrgs: safeArray(permissions.availableOrgs),
  };
}

/**
 * Safely wrap array to ensure it's always an array
 * Prevents null/undefined array access errors
 */
export function safeArray<T>(value: T[] | null | undefined): T[] {
  if (Array.isArray(value)) {
    return value;
  }
  return [];
}

/**
 * Apply enterprise defaults to any object
 * Generic utility for adding fallback values
 */
export function withEnterpriseDefaults<T extends Record<string, any>>(
  data: T | null | undefined,
  defaults: Partial<T>
): T {
  if (!data) {
    return defaults as T;
  }
  return { ...defaults, ...data } as T;
}

/**
 * Safely check if a feature is enabled with fallback
 * Prevents errors when feature object is malformed
 */
export function hasFeatureSafe(
  features: Record<string, boolean> | null | undefined,
  featureKey: string,
  defaultValue: boolean = false
): boolean {
  if (!features || typeof features !== 'object') {
    return defaultValue;
  }

  // Check if feature exists and is enabled
  if (featureKey in features) {
    return Boolean(features[featureKey]);
  }

  // Check if it's a core enterprise feature (always available)
  if (featureKey in ENTERPRISE_CORE_FEATURES) {
    return true;
  }

  return defaultValue;
}
