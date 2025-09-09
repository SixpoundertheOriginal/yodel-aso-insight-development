import { supabase } from '@/integrations/supabase/client';

export interface UIPermissions {
  [key: string]: boolean;
}

export interface CachedPermissions {
  permissions: UIPermissions;
  expiresAt: number;
}

// Permission cache with TTL
class PermissionCache {
  private static cache = new Map<string, CachedPermissions>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static async getPermissions(userId: string): Promise<UIPermissions> {
    const cacheKey = `ui_permissions:${userId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }

    // Fetch from server
    const permissions = await this.fetchFromServer(userId);
    this.cache.set(cacheKey, {
      permissions,
      expiresAt: Date.now() + this.CACHE_TTL
    });
    
    return permissions;
  }

  private static async fetchFromServer(userId: string): Promise<UIPermissions> {
    try {
      const { data, error } = await supabase.rpc('get_user_ui_permissions', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error fetching UI permissions:', error);
        return {}; // Fail closed
      }

      // Convert to object format
      const permissions: UIPermissions = {};
      data?.forEach((item: { permission_key: string; is_granted: boolean }) => {
        permissions[item.permission_key] = item.is_granted;
      });

      return permissions;
    } catch (error) {
      console.error('Failed to fetch UI permissions:', error);
      return {}; // Fail closed
    }
  }

  static invalidateUser(userId: string) {
    this.cache.delete(`ui_permissions:${userId}`);
  }

  static clearAll() {
    this.cache.clear();
  }
}

export class UIPermissionService {
  async getUserPermissions(userId: string): Promise<UIPermissions> {
    return PermissionCache.getPermissions(userId);
  }

  async getOrgPermissions(orgId: string): Promise<{ roleBaseline: UIPermissions; orgDefaults: UIPermissions; resolved: UIPermissions; }>{
    const base = (import.meta as any).env?.VITE_SUPABASE_FUNCTIONS_BASE || '/admin-ui-permissions';
    const url = `${base}?org_id=${encodeURIComponent(orgId)}`;
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (url.includes('.supabase.co/functions/v1') && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) {
      h['Authorization'] = `Bearer ${(import.meta as any).env.VITE_SUPABASE_ANON_KEY}`;
    }
    const r = await fetch(url, { headers: h });
    if (!r.ok) throw new Error(`GET org perms failed: ${r.status}`);
    const j = await r.json();
    return { roleBaseline: j.roleBaseline || {}, orgDefaults: j.orgDefaults || {}, resolved: j.resolved || {} };
  }

  async updateOrgPermissions(orgId: string, updates: UIPermissions): Promise<{ orgDefaults: UIPermissions; resolved: UIPermissions; }>{
    const base = (import.meta as any).env?.VITE_SUPABASE_FUNCTIONS_BASE || '/admin-ui-permissions';
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    const url = base;
    if (url.includes('.supabase.co/functions/v1') && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) {
      h['Authorization'] = `Bearer ${(import.meta as any).env.VITE_SUPABASE_ANON_KEY}`;
    }
    const r = await fetch(url, { method: 'PUT', headers: h, body: JSON.stringify({ org_id: orgId, updates }) });
    if (!r.ok) throw new Error(`PUT org perms failed: ${r.status}`);
    const j = await r.json();
    return { orgDefaults: j.orgDefaults || {}, resolved: j.resolved || {} };
  }

  async logUIAccess(
    userId: string,
    organizationId: string | null,
    permissionKey: string,
    accessGranted: boolean,
    context?: any
  ): Promise<void> {
    try {
      await supabase.from('ui_access_logs').insert({
        user_id: userId,
        organization_id: organizationId,
        permission_key: permissionKey,
        access_granted: accessGranted,
        context: context || {},
        user_agent: navigator.userAgent,
        ip_address: null // IP will be populated server-side if needed
      });
    } catch (error) {
      console.error('Failed to log UI access:', error);
      // Don't throw - logging failures shouldn't break the app
    }
  }

  invalidateUserCache(userId: string) {
    PermissionCache.invalidateUser(userId);
  }

  clearAllCache() {
    PermissionCache.clearAll();
  }
}

export const uiPermissionService = new UIPermissionService();
