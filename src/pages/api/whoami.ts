import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface OrganizationAccess {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabase = createRouteHandlerClient({ cookies });

  // Try to get the user from cookies
  let {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  // Fallback to Authorization header if no user from cookies
  if (!user && req.headers.authorization?.startsWith('Bearer ')) {
    const token = req.headers.authorization.substring('Bearer '.length);
    ({ data: { user }, error: authError } = await supabase.auth.getUser(token));
  }

  if (authError || !user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { data: roleData, error: rolesError } = await supabase
    .from('user_roles')
    .select('role, organization_id, organizations:organization_id (id, name, slug)')
    .eq('user_id', user.id);

  if (rolesError) {
    res.status(500).json({ error: 'Failed to load user roles' });
    return;
  }

  const roles = roleData?.map((r) => r.role) ?? [];
  const organizations: OrganizationAccess[] =
    roleData
      ?.map((r) =>
        r.organizations
          ? {
              id: r.organizations.id,
              name: r.organizations.name,
              slug: r.organizations.slug,
              role: r.role
            }
          : null
      )
      .filter((o): o is OrganizationAccess => o !== null) ?? [];

  res.status(200).json({
    id: user.id,
    email: user.email,
    roles,
    organizations
  });
}

