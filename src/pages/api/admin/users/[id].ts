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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    if (req.method === 'PUT') {
      // UPDATE user
      const { role, organization_id, first_name, last_name } = req.body;

      const { data: updatedUser, error } = await supabase
        .from('profiles')
        .update({
          role,
          organization_id,
          first_name,
          last_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log the change
      await supabase
        .from('audit_logs')
        .insert({
          organization_id: updatedUser.organization_id,
          user_id: user.id,
          action: 'USER_UPDATED',
          resource_type: 'user',
          resource_id: id as string,
          details: {
            changes: { role, organization_id, first_name, last_name },
            updated_by: user.email
          }
        });

      res.status(200).json(updatedUser);

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
