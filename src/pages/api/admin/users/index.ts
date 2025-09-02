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
    return res.status(403).json({ error: 'Forbidden - Super admin required' });
  }

  try {
    if (req.method === 'GET') {
      // GET all users across all organizations
      const { data: users, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          organization_id,
          last_login,
          created_at,
          user_roles(role, organization_id),
          organizations:organization_id (
            id,
            name,
            slug
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get auth.users data for email confirmation status
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      // Merge profile and auth data
      const enrichedUsers = users?.map(user => {
        const authUser = authUsers.users.find(au => au.id === user.id);
        return {
          ...user,
          roles: user.user_roles || [],
          email_confirmed: authUser?.email_confirmed_at ? true : false,
          last_sign_in: authUser?.last_sign_in_at,
          auth_provider: authUser?.app_metadata?.provider || 'email'
        };
      });

      res.status(200).json(enrichedUsers);

    } else if (req.method === 'POST') {
      // CREATE new user (invitation)
      const { email, role, organization_id, first_name, last_name } = req.body;

      // Validate required fields
      if (!email || !role || !organization_id) {
        return res.status(400).json({ 
          error: 'Missing required fields: email, role, organization_id' 
        });
      }

      // Validate role
      const validRoles = ['super_admin', 'org_admin', 'aso_manager', 'analyst', 'viewer', 'client'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Create user invitation via Supabase Auth Admin
      const { data: authUser, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          first_name,
          last_name,
          role,
          organization_id
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      });

      if (inviteError) {
        console.error('Invite error:', inviteError);
        return res.status(500).json({ error: 'Failed to send invitation' });
      }

      // Create profile record
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.user.id,
          email,
          first_name,
          last_name,
          organization_id
        })
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Clean up auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authUser.user.id);
        return res.status(500).json({ error: 'Failed to create user profile' });
      }

      // Assign role in user_roles table
      const { error: roleAssignError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authUser.user.id,
          organization_id,
          role,
          granted_by: user.id
        });

      if (roleAssignError) {
        console.error('Role assignment error:', roleAssignError);
        // Clean up created records if role assignment fails
        await supabase.from('profiles').delete().eq('id', authUser.user.id);
        await supabase.auth.admin.deleteUser(authUser.user.id);
        return res.status(500).json({ error: 'Failed to assign user role' });
      }

      // Log the invitation
      await supabase
        .from('audit_logs')
        .insert({
          organization_id,
          user_id: user.id,
          action: 'USER_INVITED',
          resource_type: 'user',
          resource_id: profile.id,
          details: {
            invited_email: email,
            assigned_role: role,
            invited_by: user.email
          }
        });

      res.status(201).json({
        user: {
          ...profile,
          roles: [{ role, organization_id }]
        },
        invitation_sent: true,
        message: 'User invited successfully'
      });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('User management error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
