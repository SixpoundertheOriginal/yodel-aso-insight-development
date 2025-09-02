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
    if (req.method === 'PUT') {
      // UPDATE user
      const { roles, organization_id, first_name, last_name } = req.body;

      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .update({
          organization_id,
          first_name,
          last_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (profileError) throw profileError;

      // Replace existing roles for user
      if (roles) {
        await supabase.from('user_roles').delete().eq('user_id', id);
        if (Array.isArray(roles) && roles.length > 0) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert(
              roles.map((role: string) => ({
                user_id: id as string,
                organization_id,
                role,
                granted_by: user.id
              }))
            );

          if (roleError) throw roleError;
        }
      }

      // Log the change
      await supabase
        .from('audit_logs')
        .insert({
          organization_id: organization_id,
          user_id: user.id,
          action: 'USER_UPDATED',
          resource_type: 'user',
          resource_id: id as string,
            details: {
              changes: { roles, organization_id, first_name, last_name },
              updated_by: user.email
            }
          });

      res.status(200).json({
        ...updatedProfile,
        roles: Array.isArray(roles) ? roles.map((r: string) => ({ role: r, organization_id })) : []
      });

    } else if (req.method === 'DELETE') {
      // DELETE user
      const { data: userToDelete } = await supabase
        .from('profiles')
        .select('email, organization_id')
        .eq('id', id)
        .single();

      // Delete from auth.users (cascades to profiles via trigger)
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(id as string);
      if (authDeleteError) throw authDeleteError;

      // Log the deletion
      await supabase
        .from('audit_logs')
        .insert({
          organization_id: userToDelete?.organization_id,
          user_id: user.id,
          action: 'USER_DELETED',
          resource_type: 'user',
          resource_id: id as string,
          details: {
            deleted_user_email: userToDelete?.email,
            deleted_by: user.email
          }
        });

      res.status(200).json({ message: 'User deleted successfully' });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('User management error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
