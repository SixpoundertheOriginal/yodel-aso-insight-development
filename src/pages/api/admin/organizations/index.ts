/* eslint-disable */
// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createRouteHandlerClient({ cookies });

  // Verify super admin access
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: superAdminRole, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'super_admin')
    .single();

  if (roleError || !superAdminRole) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    if (req.method === 'GET') {
      // GET all organizations with user counts
      const { data: organizations, error } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          slug,
          domain,
          subscription_tier,
          app_limit,
          app_limit_enforced,
          settings,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user counts for each organization
      const orgsWithCounts = await Promise.all(
        organizations.map(async (org) => {
          const { count: userCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          const { count: activeUserCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id)
            .gte('last_login', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

          const { count: appCount } = await supabase
            .from('organization_apps')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id)
            .eq('approval_status', 'approved');

          return {
            ...org,
            user_count: userCount || 0,
            active_users_30d: activeUserCount || 0,
            app_count: appCount || 0,
            last_activity: new Date().toISOString() // TODO: Calculate from actual activity
          };
        })
      );

      res.status(200).json(orgsWithCounts);

    } else if (req.method === 'POST') {
      // CREATE new organization
      const { name, slug, domain, subscription_tier = 'professional', settings = {} } = req.body;

      // Validate required fields
      if (!name || !slug) {
        return res.status(400).json({
          error: 'Missing required fields: name, slug'
        });
      }

      // Check if slug already exists
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .single();

      if (existingOrg) {
        return res.status(400).json({ error: 'Organization slug already exists' });
      }

      // Create organization
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name,
          slug,
          domain,
          subscription_tier,
          settings,
          app_limit: subscription_tier === 'enterprise' ? 1000 : subscription_tier === 'professional' ? 50 : 10,
          app_limit_enforced: subscription_tier !== 'enterprise'
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Log the creation
      await supabase
        .from('audit_logs')
        .insert({
          organization_id: newOrg.id,
          user_id: user.id,
          action: 'ORGANIZATION_CREATED',
          resource_type: 'organization',
          resource_id: newOrg.id,
          details: {
            organization_name: name,
            subscription_tier,
            created_by: user.email
          }
        });

      res.status(201).json({
        organization: newOrg,
        message: 'Organization created successfully'
      });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Organization management error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
