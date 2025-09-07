import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeUserFields(payload: any) {
  return {
    ...payload,
    first_name: payload.first_name || payload.firstName,
    last_name: payload.last_name || payload.lastName,
    organization_id: payload.organization_id || payload.organizationId,
    roles: payload.roles || (payload.role ? [payload.role] : undefined)
  }
}

// Map frontend role names to database enum values
function mapRoleToDBEnum(role: string): string {
  const roleMapping: Record<string, string> = {
    'super_admin': 'SUPER_ADMIN',
    'org_admin': 'ORGANIZATION_ADMIN', 
    'aso_manager': 'ASO_MANAGER',
    'analyst': 'ANALYST',
    'viewer': 'VIEWER',
    'client': 'CLIENT',
    'manager': 'MANAGER'
  }
  return roleMapping[role] || role.toUpperCase()
}

serve(async (req) => {
  const startTime = Date.now();
  
  // Comprehensive request logging
  console.log('=== ADMIN-USERS FUNCTION START ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));
  console.log('Content-Type:', req.headers.get('content-type'));
  console.log('Authorization Present:', !!req.headers.get('authorization'));
  console.log('User-Agent:', req.headers.get('user-agent'));

  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers');
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Enhanced JSON parsing with error handling
    let requestBody;
    try {
      const rawBody = await req.text();
      console.log('Raw Body Length:', rawBody.length);
      console.log('Raw Body Preview:', rawBody.substring(0, 200));
      
      requestBody = JSON.parse(rawBody);
      console.log('Parsed Body:', JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      console.log('JSON Parse Error:', parseError.message);
      console.log('Parse Error Details:', parseError);
      
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON payload',
        details: parseError.message,
        timestamp: new Date().toISOString()
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action } = requestBody;
    console.log('Action requested:', action);

    if (action === 'env_check') {
      console.log('Environment check requested');
      const envStatus = {
        has_service_key: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
        has_anon_key: !!Deno.env.get('SUPABASE_ANON_KEY'),
        supabase_url: Deno.env.get('SUPABASE_URL') ?? null,
      };
      console.log('Environment status:', envStatus);
      
      return new Response(
        JSON.stringify(envStatus),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Authentication setup with logging
    console.log('=== AUTHENTICATION SETUP ===');
    console.log('SUPABASE_URL:', Deno.env.get('SUPABASE_URL'));
    console.log('Service key available:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    console.log('Anon key available:', !!Deno.env.get('SUPABASE_ANON_KEY'));

    // Regular client for authentication checks
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Admin client with service key for user operations
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!serviceRoleKey) {
      console.log('ERROR: Service role key missing');
      return new Response(JSON.stringify({
        error: 'Service role key missing',
        timestamp: new Date().toISOString()
      }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey,
    )

    // Authentication validation with logging
    console.log('=== AUTHENTICATION VALIDATION ===');
    console.log('Auth Header Format:', req.headers.get('authorization')?.substring(0, 20) + '...');

    try {
      const { data: user, error: userError } = await supabase.auth.getUser()
      console.log('User retrieval error:', userError);
      console.log('User data:', user?.user ? { id: user.user.id, email: user.user.email } : 'No user');
      
      if (userError || !user.user) {
        console.log('Authentication failed:', userError?.message || 'No user found');
        throw new Error('Not authenticated')
      }
      
      const { data: isSuperAdmin, error: superAdminError } = await supabase.rpc('is_super_admin', { 
        user_id: user.user.id 
      })
      console.log('Super admin check result:', isSuperAdmin);
      console.log('Super admin check error:', superAdminError);
      
      if (!isSuperAdmin) {
        console.log('User is not super admin');
        throw new Error('Super admin access required')
      }
      
      console.log('Authentication successful - user is super admin');
    } catch (authError) {
      console.log('Authentication Error:', authError.message);
      console.log('Auth Error Details:', authError);
      
      return new Response(JSON.stringify({
        error: 'Authentication failed',
        details: authError.message,
        timestamp: new Date().toISOString()
      }), {
        status: authError.message.includes('not authenticated') ? 401 : 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'list') {
      console.log('=== LIST USERS ACTION ===');
      
      try {
        // List all users across all organizations
        const { data: users, error } = await supabase
          .from('profiles')
          .select(`
            *,
            user_roles(role, organization_id),
            organizations(id, name, slug)
          `)
          .order('created_at', { ascending: false })

        console.log('Database query error:', error);
        console.log('Users found:', users?.length || 0);

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

        console.log('=== LIST SUCCESS ===');
        console.log('Formatted users count:', formattedUsers.length);

        return new Response(JSON.stringify({
          success: true,
          data: formattedUsers
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } catch (listError) {
        console.log('List users error:', listError.message);
        console.log('List error details:', listError);
        throw listError;
      }

    } else if (action === 'create' || action === 'invite') {
      console.log('=== USER CREATION/INVITATION ACTION ===');
      console.log('Action type:', action);
      
      // Create/invite new user
      const normalizedBody = normalizeUserFields(requestBody)
      console.log('Normalized body:', JSON.stringify(normalizedBody, null, 2));
      
      const { email, roles, organization_id, first_name, last_name, password } = normalizedBody
      
      console.log('Extracted fields:');
      console.log('- Email:', email);
      console.log('- Roles:', roles);
      console.log('- Organization ID:', organization_id);
      console.log('- First name:', first_name);
      console.log('- Last name:', last_name);
      console.log('- Password provided:', !!password);
      
      if (!email || !roles || !organization_id) {
        console.log('Missing required fields validation failed');
        console.log('- Email missing:', !email);
        console.log('- Roles missing:', !roles);
        console.log('- Organization ID missing:', !organization_id);
        throw new Error('Missing required fields: email, roles, organization_id')
      }

      try {
        console.log('=== DATABASE OPERATION START ===');
        console.log('Operation Type:', 'user_creation');
        console.log('Organization ID:', organization_id);
        console.log('User Email:', email);
        console.log('User Roles:', roles);

        // Create auth user first using admin client
        console.log('Step 1: Creating auth user');
        const authUserData = {
          email,
          password: password || `temp_${Date.now()}`,
          email_confirm: true,
          user_metadata: {
            first_name,
            last_name,
            organization_id
          }
        };
        console.log('Auth user data:', JSON.stringify(authUserData, null, 2));

        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser(authUserData)

        console.log('Auth user creation result:');
        console.log('- Success:', !!authUser);
        console.log('- Error:', authError);
        console.log('- User ID:', authUser?.user?.id);

        if (authError) {
          console.log('Auth user creation failed:', authError.message);
          throw authError;
        }

        // Create profile with auth user ID
        console.log('Step 2: Creating profile');
        const profileData = {
          id: authUser.user.id,
          email,
          first_name,
          last_name,
          organization_id
        };
        console.log('Profile data:', JSON.stringify(profileData, null, 2));

        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single()

        console.log('Profile creation result:');
        console.log('- Success:', !!newProfile);
        console.log('- Error:', profileError);

        if (profileError) {
          console.log('Profile creation failed, rolling back auth user');
          // Rollback: delete auth user if profile creation fails
          await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
          throw profileError
        }

        // Assign roles
        console.log('Step 3: Assigning roles');
        const roleInserts = roles.map((role: string) => {
          const mappedRole = mapRoleToDBEnum(role);
          console.log(`Mapping role: ${role} -> ${mappedRole}`);
          return {
            user_id: authUser.user.id,
            role: mappedRole,
            organization_id
          };
        });
        console.log('Role inserts:', JSON.stringify(roleInserts, null, 2));

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert(roleInserts)

        console.log('Role assignment result:');
        console.log('- Error:', roleError);

        if (roleError) {
          console.log('Role assignment failed, rolling back user and profile');
          // Rollback: delete auth user and profile if role assignment fails
          await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
          await supabase.from('profiles').delete().eq('id', authUser.user.id)
          throw roleError
        }

        console.log('=== USER CREATION SUCCESS ===');
        console.log('User created successfully:', authUser.user.id);
        console.log('Execution Time:', Date.now() - startTime, 'ms');

        const responseData = {
          success: true,
          data: { ...newProfile, roles },
          message: 'User created successfully'
        };

        return new Response(JSON.stringify(responseData), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } catch (createError) {
        console.log('=== USER CREATION ERROR ===');
        console.log('Create Error:', createError.message);
        console.log('Create Error Details:', createError);
        console.log('Create Error Stack:', createError.stack);
        throw new Error(`User creation failed: ${createError.message}`)
      }

    } else if (action === 'update') {
      // Update user
      const normalizedBody = normalizeUserFields(body)
      const { id, payload } = normalizedBody
      if (!id || !payload) {
        throw new Error('Missing required fields: id, payload for update')
      }

      const normalizedPayload = normalizeUserFields(payload)

      try {
        // Update auth user metadata if provided
        if (normalizedPayload.email || normalizedPayload.first_name || normalizedPayload.last_name) {
          const updateData: Record<string, unknown> = {}
          if (normalizedPayload.email) updateData.email = normalizedPayload.email
          if (normalizedPayload.first_name || normalizedPayload.last_name) {
            updateData.user_metadata = {
              first_name: normalizedPayload.first_name,
              last_name: normalizedPayload.last_name
            }
          }

          const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, updateData)
          if (authError) throw authError
        }

        // Update profile
        const { data: updatedProfile, error: profileError } = await supabase
          .from('profiles')
          .update({
            first_name: normalizedPayload.first_name,
            last_name: normalizedPayload.last_name,
            organization_id: normalizedPayload.organization_id,
            email: normalizedPayload.email
          })
          .eq('id', id)
          .select()
          .single()

        if (profileError) throw profileError

        // Update roles if provided
        if (normalizedPayload.roles) {
          // Remove existing roles
          await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', id)

          // Add new roles
          const roleInserts = normalizedPayload.roles.map((role: string) => ({
            user_id: id,
            role: mapRoleToDBEnum(role),
            organization_id: normalizedPayload.organization_id
          }))

          const { error: roleError } = await supabase
            .from('user_roles')
            .insert(roleInserts)

          if (roleError) throw roleError
        }

        return new Response(JSON.stringify({
          success: true,
          data: { ...updatedProfile, roles: normalizedPayload.roles },
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

  } catch (globalError) {
    console.log('=== GLOBAL ERROR HANDLER ===');
    console.log('Global Error:', globalError.message);
    console.log('Global Error Stack:', globalError.stack);
    console.log('Execution Time:', Date.now() - startTime, 'ms');
    
    return new Response(JSON.stringify({
      error: globalError.message || 'Internal server error',
      details: globalError.message,
      timestamp: new Date().toISOString(),
      executionTime: Date.now() - startTime
    }), {
      status: globalError.message.includes('not authenticated') ? 401 : 
             globalError.message.includes('access required') ? 403 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})