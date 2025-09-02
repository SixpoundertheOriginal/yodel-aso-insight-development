/* eslint-disable */
// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    // Get user email
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('email, organization_id')
      .eq('id', id)
      .single();

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Send password reset email via Supabase Auth
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(targetUser.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`
    });

    if (resetError) {
      console.error('Password reset error:', resetError);
      return res.status(500).json({ error: 'Failed to send password reset email' });
    }

    // Log the password reset request
    await supabase
      .from('audit_logs')
      .insert({
        organization_id: targetUser.organization_id,
        user_id: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        resource_type: 'user',
        resource_id: id as string,
        details: {
          target_user_email: targetUser.email,
          requested_by: user.email
        }
      });

    res.status(200).json({ 
      message: 'Password reset email sent successfully',
      email: targetUser.email 
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
