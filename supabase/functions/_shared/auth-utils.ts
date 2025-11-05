/**
 * Shared Authentication Utilities for Edge Functions
 * 
 * Provides centralized, consistent role resolution using the unified
 * user_permissions_unified view across all Edge Functions.
 */

import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2';

export interface UserPermissions {
  user_id: string;
  org_id: string | null;
  effective_role: string;
  role_source: 'platform' | 'organization';
  is_platform_role: boolean;
  is_super_admin: boolean;
  is_org_admin: boolean;
  is_org_scoped_role: boolean;
  normalized_role: string;
  org_name?: string;
  org_slug?: string;
  resolved_at: string;
}

export interface AuthContext {
  user: User;
  permissions: UserPermissions;
  requestedOrgId?: string;
  hasOrgAccess: boolean;
  features: Record<string, boolean>;
  isDemo: boolean;
}

/**
 * Resolve user permissions for a specific organization or get highest privilege
 */
export async function resolveUserPermissions(
  supabase: SupabaseClient,
  user_id: string,
  requested_org_id?: string
): Promise<UserPermissions | null> {
  console.log('[AUTH-UTILS] Resolving permissions for user:', user_id, 'org:', requested_org_id);

  const { data: allPermissions, error } = await supabase
    .from('user_permissions_unified')
    .select('*')
    .eq('user_id', user_id);

  if (error) {
    console.error('[AUTH-UTILS] Failed to resolve permissions:', error);
    return null;
  }

  if (!allPermissions?.length) {
    console.log('[AUTH-UTILS] No permissions found for user');
    return null;
  }

  console.log('[AUTH-UTILS] Found permissions:', allPermissions);

  // If specific org requested, find that permission set
  if (requested_org_id) {
    const orgPermission = allPermissions.find(p => p.org_id === requested_org_id);
    if (orgPermission) {
      console.log('[AUTH-UTILS] Found org-specific permission:', orgPermission);
      return orgPermission;
    }
    
    // Check if user is platform super admin (can access any org)
    const platformSuperAdminPermission = allPermissions.find(p => 
      p.is_super_admin && p.is_platform_role
    );
    if (platformSuperAdminPermission) {
      console.log('[AUTH-UTILS] Platform super admin accessing org:', requested_org_id);
      return {
        ...platformSuperAdminPermission,
        org_id: requested_org_id, // Override for context
        hasImplicitAccess: true
      } as UserPermissions;
    }
    
    console.log('[AUTH-UTILS] No access to requested org:', requested_org_id);
    return null; // No access to requested org
  }

  // Return permission with proper precedence: platform super_admin > org roles
  const sortedPermissions = allPermissions.sort((a, b) => {
    // HIGHEST PRIORITY: Platform super admin (organization_id IS NULL)
    if (a.is_super_admin && a.is_platform_role) return -1;
    if (b.is_super_admin && b.is_platform_role) return 1;
    
    // SECOND PRIORITY: Organization-scoped roles (org_users table)
    if (a.role_source !== b.role_source) {
      return a.role_source === 'organization' ? -1 : 1; // organization source wins over platform for non-super-admin
    }
    
    // THIRD PRIORITY: Within same source, prefer higher privilege  
    if (a.is_org_admin !== b.is_org_admin) return b.is_org_admin ? 1 : -1;
    return 0;
  });

  console.log('[AUTH-UTILS] Using permission with precedence (platform super_admin > org roles > platform roles):', sortedPermissions[0]);
  return sortedPermissions[0];
}

/**
 * Get organization features for a specific org
 */
export async function getOrganizationFeatures(
  supabase: SupabaseClient,
  org_id: string
): Promise<Record<string, boolean>> {
  const { data: features, error } = await supabase
    .from('organization_features')
    .select('feature_key, is_enabled')
    .eq('organization_id', org_id);
  
  if (error) {
    console.error('[AUTH-UTILS] Failed to get org features:', error);
    return {};
  }
  
  const featureMap: Record<string, boolean> = {};
  (features || []).forEach(f => featureMap[f.feature_key] = f.is_enabled);
  return featureMap;
}

/**
 * Check if organization is in demo mode
 */
export async function isDemoOrganization(
  supabase: SupabaseClient,
  org_id: string
): Promise<boolean> {
  const { data: org } = await supabase
    .from('organizations')
    .select('slug, settings')
    .eq('id', org_id)
    .single();
  
  if (!org) return false;
  
  // Demo mode via settings or slug
  return Boolean(org.settings?.demo_mode) || 
         (org.slug || '').toLowerCase() === 'next';
}

/**
 * Expand organization access via agency relationships
 * Returns all orgs the user can access (direct + agency clients)
 */
export async function expandAgencyAccess(
  supabase: SupabaseClient,
  permissions: UserPermissions[]
): Promise<string[]> {
  const directOrgIds = permissions
    .filter(p => p.org_id)
    .map(p => p.org_id!);

  if (!directOrgIds.length) return [];

  // Get agency client relationships
  const { data: agencyClients } = await supabase
    .from('agency_clients')
    .select('client_org_id')
    .in('agency_org_id', directOrgIds);

  const clientOrgIds = (agencyClients || []).map(ac => ac.client_org_id);
  
  // Return unique combination of direct + client orgs
  return Array.from(new Set([...directOrgIds, ...clientOrgIds]));
}

/**
 * Complete authentication context resolution for Edge Functions
 */
export async function resolveAuthContext(
  supabase: SupabaseClient,
  requested_org_id?: string
): Promise<AuthContext | null> {
  // Get authenticated user
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult.user) {
    console.log('[AUTH-UTILS] No authenticated user:', userError);
    return null;
  }

  // Resolve permissions
  const permissions = await resolveUserPermissions(
    supabase, 
    userResult.user.id, 
    requested_org_id
  );
  
  if (!permissions) {
    console.log('[AUTH-UTILS] No permissions resolved');
    return null;
  }

  // Check organization access
  const hasOrgAccess = requested_org_id ? 
    (permissions.org_id === requested_org_id || permissions.is_super_admin) : 
    true;

  // Get organization features and demo status
  let features: Record<string, boolean> = {};
  let isDemo = false;
  
  if (permissions.org_id) {
    features = await getOrganizationFeatures(supabase, permissions.org_id);
    isDemo = await isDemoOrganization(supabase, permissions.org_id);
  }

  return {
    user: userResult.user,
    permissions,
    requestedOrgId: requested_org_id,
    hasOrgAccess,
    features,
    isDemo
  };
}

/**
 * Standard authorization check for Edge Functions
 */
export function requireOrgAccess(
  authContext: AuthContext, 
  requiredRoles?: string[]
): boolean {
  if (!authContext.hasOrgAccess) {
    console.log('[AUTH-UTILS] No org access');
    return false;
  }
  
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRole = requiredRoles.includes(authContext.permissions.normalized_role) ||
                   authContext.permissions.is_super_admin;
    
    if (!hasRole) {
      console.log('[AUTH-UTILS] Missing required role. Has:', 
        authContext.permissions.normalized_role, 'Required:', requiredRoles);
      return false;
    }
  }
  
  return true;
}

/**
 * Check if user has access to a specific feature
 */
export function hasFeatureAccess(
  authContext: AuthContext,
  feature_key: string
): boolean {
  // Super admin has access to all features
  if (authContext.permissions.is_super_admin) return true;
  
  // Check organization feature flags
  return authContext.features[feature_key] === true;
}

/**
 * Standard CORS headers for Edge Functions
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Content-Type": "application/json",
};

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string, 
  status: number = 400, 
  details?: any
): Response {
  return new Response(
    JSON.stringify({ 
      error, 
      details,
      timestamp: new Date().toISOString()
    }), 
    { status, headers: corsHeaders }
  );
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse(data: any): Response {
  return new Response(
    JSON.stringify(data), 
    { status: 200, headers: corsHeaders }
  );
}