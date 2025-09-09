/* eslint-disable */
// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
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
      // GET single organization with detailed metrics
      const { data: organization, error } = await supabase
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
      updated_at,
      deleted_at
    `)
        .eq('id', id)
        .is('deleted_at', null) // Only active organizations
        .single();

      if (error) throw error;

      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Get detailed counts for this organization
      const [userCount, appCount, activeUserCount] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('organization_id', id),
        supabase.from('organization_apps').select('*', { count: 'exact', head: true }).eq('organization_id', id),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', id)
          .gte('last_login', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      const enrichedOrganization = {
        ...organization,
        user_count: userCount.count || 0,
        app_count: appCount.count || 0,
        active_users_30d: activeUserCount.count || 0,
        last_activity: new Date().toISOString() // TODO: Calculate real last activity
      };

      res.status(200).json(enrichedOrganization);

    } else if (req.method === 'PUT') {
      // UPDATE organization
      const { name, slug, domain, subscription_tier, settings } = req.body;

      const { data: updatedOrg, error } = await supabase
        .from('organizations')
        .update({
          name,
          slug,
          domain,
          subscription_tier,
          settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log the update
      await supabase
        .from('audit_logs')
        .insert({
          organization_id: id as string,
          user_id: user.id,
          action: 'ORGANIZATION_UPDATED',
          resource_type: 'organization',
          resource_id: id as string,
          details: {
            changes: { name, slug, domain, subscription_tier, settings },
            updated_by: user.email
          }
        });

      res.status(200).json(updatedOrg);

    } else if (req.method === 'DELETE') {
      // SOFT DELETE organization (with safeguards)
      const { data: orgToDelete } = await supabase
        .from('organizations')
        .select('name, slug, deleted_at')
        .eq('id', id)
        .single();

      if (!orgToDelete) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      if (orgToDelete.deleted_at) {
        return res.status(400).json({ error: 'Organization already deleted' });
      }

      // Check if organization has users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', id);

      if (userCount && userCount > 0) {
        return res.status(400).json({
          error: 'Cannot delete organization with existing users. Transfer or remove users first.',
          user_count: userCount
        });
      }

      // Soft delete organization by setting deleted_at
      const { data: deletedOrg, error: deleteError } = await supabase
        .from('organizations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();

      if (deleteError) throw deleteError;

      // Log the deletion
      await supabase
        .from('audit_logs')
        .insert({
          organization_id: id as string,
          user_id: user.id,
          action: 'ORGANIZATION_DELETED',
          resource_type: 'organization',
          resource_id: id as string,
          details: {
            deleted_organization_name: orgToDelete?.name,
            deleted_organization_slug: orgToDelete?.slug,
            deleted_by: user.email,
            soft_delete: true
          }
        });

      res.status(200).json({ 
        message: 'Organization deleted successfully',
        deleted_at: deletedOrg.deleted_at 
      });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Organization management error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
}
