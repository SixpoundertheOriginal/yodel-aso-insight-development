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
    // Regular client for authentication checks
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Admin client with service key for user operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Not authenticated')
    
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { 
      user_id: user.user.id 
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
      const { email, roles, organization_id, first_name, last_name, password } = body
      
      if (!email || !roles || !organization_id) {
        throw new Error('Missing required fields: email, roles, organization_id')
      }

      try {
        // Create auth user first using admin client
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: password || `temp_${Date.now()}`,
          email_confirm: true,
          user_metadata: {
            first_name,
            last_name,
            organization_id
          }
        })

        if (authError) throw authError

        // Create profile with auth user ID
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authUser.user.id,
            email,
            first_name,
            last_name,
            organization_id
          })
          .select()
          .single()

        if (profileError) {
          // Rollback: delete auth user if profile creation fails
          await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
          throw profileError
        }

        // Assign roles
        const roleInserts = roles.map((role: string) => ({
          user_id: authUser.user.id,
          role,
          organization_id,
          is_active: true
        }))

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert(roleInserts)

        if (roleError) {
          // Rollback: delete auth user and profile if role assignment fails
          await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
          await supabase.from('profiles').delete().eq('id', authUser.user.id)
          throw roleError
        }

        return new Response(JSON.stringify({
          success: true,
          data: { ...newProfile, roles },
          message: 'User created successfully'
        }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } catch (error) {
        throw new Error(`User creation failed: ${error.message}`)
      }

    } else if (action === 'update') {
      // Update user
      const { id, payload } = body
      if (!id || !payload) {
        throw new Error('Missing required fields: id, payload for update')
      }

      try {
        // Update auth user metadata if provided
        if (payload.email || payload.first_name || payload.last_name) {
          const updateData: any = {}
          if (payload.email) updateData.email = payload.email
          if (payload.first_name || payload.last_name) {
            updateData.user_metadata = {
              first_name: payload.first_name,
              last_name: payload.last_name
            }
          }
          
          const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, updateData)
          if (authError) throw authError
        }

        // Update profile
        const { data: updatedProfile, error: profileError } = await supabase
          .from('profiles')
          .update({
            first_name: payload.first_name,
            last_name: payload.last_name,
            organization_id: payload.organization_id,
            email: payload.email
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
          data: { ...updatedProfile, roles: payload.roles },
          message: 'User updated successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } catch (error) {
        throw new Error(`User update failed: ${error.message}`)
      }

    } else if (action === 'delete') {
      // Delete user
      const { id } = body
      if (!id) {
        throw new Error('Missing required field: id for delete')
      }

      try {
        // Get user details before deletion for logging
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('id', id)
          .single()

        // Delete auth user (this will cascade to profile due to foreign key constraint)
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)
        if (authError) throw authError

        return new Response(JSON.stringify({
          success: true,
          message: `User ${profile?.email || id} deleted successfully`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } catch (error) {
        throw new Error(`User deletion failed: ${error.message}`)
      }

    } else if (action === 'resetPassword') {
      // Reset password
      const { id, password } = body
      if (!id) {
        throw new Error('Missing required field: id for password reset')
      }

      try {
        // Get user email for response
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', id)
          .single()

        if (profileError) throw profileError

        // Reset password using admin client
        if (password) {
          const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(id, {
            password: password
          })
          if (passwordError) throw passwordError
        } else {
          // Send password reset email
          const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: profile.email
          })
          if (resetError) throw resetError
        }

        return new Response(JSON.stringify({
          success: true,
          data: { email: profile.email },
          message: password ? 'Password updated successfully' : 'Password reset email sent'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } catch (error) {
        throw new Error(`Password reset failed: ${error.message}`)
      }

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