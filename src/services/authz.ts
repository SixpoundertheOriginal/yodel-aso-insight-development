import { supabase } from '@/integrations/supabase/client';
import { authCache } from '@/utils/authCache';

export type WhoAmI = {
  user_id: string;
  email?: string;
  org_id: string | null;
  is_super_admin?: boolean;
  is_demo?: boolean;
  features?: string[];
  roles?: Array<{ role: string; organization_id: string | null }>;
};

// Cache for whoami results (5 min TTL)
let whoamiCache: { result: WhoAmI | null; expires: number } | null = null;
const WHOAMI_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchWhoAmI(): Promise<WhoAmI | null> {
  // Check cache first
  if (whoamiCache && whoamiCache.expires > Date.now()) {
    return whoamiCache.result;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    whoamiCache = null;
    return null;
  }

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-whoami`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    whoamiCache = null;
    return null;
  }

  const result = await res.json();

  // Cache the result
  whoamiCache = {
    result,
    expires: Date.now() + WHOAMI_CACHE_TTL
  };

  return result;
}

/**
 * Clear the whoami cache (call on logout)
 */
export function clearWhoamiCache(): void {
  whoamiCache = null;
}

export async function authorizePath(path: string, method: string = 'GET'): Promise<{ allow: boolean; reason?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { allow: false, reason: 'unauthorized' };

  const userId = session.user.id;

  // Check cache first (Phase 1.1: Performance Optimization)
  const cached = authCache.get(path, userId);
  if (cached !== null) {
    return { allow: cached, reason: cached ? 'cached_allow' : 'cached_deny' };
  }

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/authorize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path, method }),
  });

  if (!res.ok) return { allow: false, reason: 'network_error' };

  const result = await res.json();

  // Cache the result (30 min TTL for successful auth, 5 min for denials)
  const ttl = result.allow ? 30 * 60 * 1000 : 5 * 60 * 1000;
  authCache.set(path, userId, result.allow, result.reason || '', ttl);

  return result;
}

/**
 * Clear authorization cache for current user (call on logout or permission change)
 */
export async function clearAuthCache(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    authCache.clearUser(session.user.id);
  }
  clearWhoamiCache();
}

