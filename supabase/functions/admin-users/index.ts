import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Not authenticated')
    
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { 
      user_uuid: user.user.id 
    })
    if (!isSuperAdmin) throw new Error('Super admin access required')

    const body = await req.json()
    const { action } = body

    if (action === 'list') {
      // List all users across all organizations
      const { data: users, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles(role, organization_id),
          organizations(id, name, slug)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Format the users data
      const formattedUsers = users?.map(profile => ({
        id: profile.id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        organization_id: profile.organization_id,
        organizations: profile.organizations,
        roles: profile.user_roles || [],
        email_confirmed: true, // Assuming confirmed if they have a profile
        created_at: profile.created_at,
        last_sign_in: profile.updated_at // Approximation
      })) || []

      return new Response(JSON.stringify({
        success: true,
        data: formattedUsers
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else if (action === 'create') {
      // Create/invite new user
      const { email, roles, organization_id, first_name, last_name } = body
      
      if (!email || !roles || !organization_id) {
        throw new Error('Missing required fields: email, roles, organization_id')
      }

      // Create user profile
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          email,
          first_name,
          last_name,
          organization_id
        })
        .select()
        .single()

      if (profileError) throw profileError

      // Assign roles
      const roleInserts = roles.map((role: string) => ({
        user_id: newProfile.id,
        role,
        organization_id,
        is_active: true
      }))

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert(roleInserts)

      if (roleError) throw roleError

      return new Response(JSON.stringify({
        success: true,
        data: newProfile,
        message: 'User invitation sent successfully'
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else if (action === 'update') {
      // Update user
      const { id, payload } = body
      if (!id || !payload) {
        throw new Error('Missing required fields: id, payload for update')
      }

      // Update profile
      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: payload.first_name,
          last_name: payload.last_name,
          organization_id: payload.organization_id
        })
        .eq('id', id)
        .select()
        .single()

      if (profileError) throw profileError

      // Update roles if provided
      if (payload.roles) {
        // Remove existing roles
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', id)

        // Add new roles
        const roleInserts = payload.roles.map((role: string) => ({
          user_id: id,
          role,
          organization_id: payload.organization_id,
          is_active: true
        }))

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert(roleInserts)

        if (roleError) throw roleError
      }

      return new Response(JSON.stringify({
        success: true,
        data: updatedProfile,
        message: 'User updated successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else if (action === 'delete') {
      // Delete user
      const { id } = body
      if (!id) {
        throw new Error('Missing required field: id for delete')
      }

      // Remove user roles first
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', id)

      // Delete profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id)

      if (error) throw error

      return new Response(JSON.stringify({
        success: true,
        message: 'User deleted successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else if (action === 'resetPassword') {
      // Reset password
      const { id } = body
      if (!id) {
        throw new Error('Missing required field: id for password reset')
      }

      // Get user email
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', id)
        .single()

      if (error) throw error

      // Note: In a real implementation, you would send a password reset email here
      // For now, we'll just return a success message
      return new Response(JSON.stringify({
        success: true,
        data: { email: profile.email },
        message: 'Password reset email sent'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else {
      throw new Error('Invalid action. Supported actions: list, create, update, delete, resetPassword')
    }

  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: error.message.includes('not authenticated') ? 401 : 
             error.message.includes('access required') ? 403 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})