import { supabase } from '@/integrations/supabase/client';

export type WhoAmI = {
  user_id: string;
  email?: string;
  org_id: string | null;
  is_super_admin?: boolean;
  is_demo?: boolean;
  features?: string[];
  roles?: Array<{ role: string; organization_id: string | null }>;
};

export async function fetchWhoAmI(): Promise<WhoAmI | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-whoami`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function authorizePath(path: string, method: string = 'GET'): Promise<{ allow: boolean; reason?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { allow: false, reason: 'unauthorized' };
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/authorize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path, method }),
  });
  if (!res.ok) return { allow: false, reason: 'network_error' };
  return res.json();
}

