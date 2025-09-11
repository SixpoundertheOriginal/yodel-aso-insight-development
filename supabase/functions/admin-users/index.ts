import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Content-Type": "application/json",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });

// Helper function for canonical field handling
function extractUserId(body: any): string | null {
  console.log('[ADMIN-USERS] Extracting user_id from body:', { 
    user_id: body?.user_id || 'missing',
    id: body?.id || 'missing',
    has_user_id: !!body?.user_id,
    has_id: !!body?.id
  });

  // Canonical: prefer user_id
  if (body?.user_id) {
    return body.user_id;
  }
  
  // Migration support: fallback to id with deprecation warning
  if (body?.id) {
    console.warn('[ADMIN-USERS] DEPRECATED: Using "id" field instead of "user_id". Please update to use "user_id". Body:', JSON.stringify(body));
    return body.id;
  }
  
  return null;
}

// Helper function to create canonical response
function createUserResponse(userData: any): any {
  console.log('[ADMIN-USERS] Creating canonical response for user:', userData?.id);
  
  return {
    // Canonical fields
    user_id: userData.id,
    organization_id: userData.organization_id,
    
    // Backward compatibility
    id: userData.id,
    
    // User data
    email: userData.email,
    first_name: userData.first_name,
    last_name: userData.last_name,
    
    // Organization data (if available)
    organization: userData.organizations || null,
    roles: userData.user_roles || [],
    role: userData.user_roles?.[0]?.role || null,
    
    // Status fields  
    status: userData.status || 'active',
    email_confirmed: userData.email_confirmed || false,
    last_sign_in: userData.last_sign_in,
    created_at: userData.created_at,
    updated_at: userData.updated_at || new Date().toISOString()
  };
}

// Helper function for structured error responses
function createErrorResponse(error: string, details: string, code: string, status: number, extra: any = {}): Response {
  console.error(`[ADMIN-USERS] Error ${status} - ${code}: ${details}`, extra);
  
  return json({
    error,
    details,
    code,
    ...extra
  }, status);
}

// Helper function for audit logging
async function auditLog(
  supabase: any,
  {
    actor_id,
    actor_role,
    organization_id,
    action,
    resource_type,
    resource_id,
    old_values = null,
    new_values = null,
    details = {}
  }: {
    actor_id: string;
    actor_role?: string;
    organization_id?: string;
    action: string;
    resource_type: string;
    resource_id: string;
    old_values?: any;
    new_values?: any;
    details?: any;
  }
) {
  const diff = old_values && new_values ? {
    old: old_values,
    new: new_values,
    changed_fields: Object.keys(new_values).filter(key => 
      JSON.stringify(old_values[key]) !== JSON.stringify(new_values[key])
    )
  } : null;

  await supabase.from('audit_logs').insert({
    organization_id,
    user_id: actor_id,
    action,
    resource_type,
    resource_id,
    details: {
      ...details,
      actor_role,
      diff,
      timestamp: new Date().toISOString()
    }
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  
  // DEBUG: Log request details
  console.log("=== ADMIN-USERS DEBUG START ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", Object.fromEntries(req.headers.entries()));
  console.log("Authorization header present:", !!req.headers.get("Authorization"));
  
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  });
  
  // Service role client for admin operations
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  
  const { data: userRes, error: authError } = await supabase.auth.getUser();
  console.log("Auth getUser result:", { user: userRes?.user?.id, error: authError });
  
  const uid = userRes?.user?.id;
  if (!uid) {
    console.log("No user ID found, returning 401");
    return json({ error: "unauthorized" }, 401);
  }
  
  const { data: isSA, error: saError } = await supabase.rpc("is_super_admin");
  console.log("Super admin check:", { isSA, error: saError });
  
  // Get user's primary role for audit logging
  const { data: userRoles, error: rolesError } = await supabase.from("user_roles").select("role, organization_id").eq("user_id", uid).limit(1);
  console.log("User roles query:", { userRoles, error: rolesError });
  const actorRole = isSA ? "SUPER_ADMIN" : (userRoles?.[0]?.role || "UNKNOWN");
  console.log("Final actor role:", actorRole);

  // GET list users (scoped)
  if (req.method === "GET") {
    const orgParam = url.searchParams.get("org_id") || req.headers.get("X-Org-Id");
    let orgIds: string[] = [];
    if (isSA && orgParam) orgIds = [orgParam];
    else if (isSA) {
      orgIds = [];
    } else {
      const { data: rows } = await supabase.from("user_roles").select("organization_id").eq("user_id", uid);
      orgIds = (rows || []).map((r: any) => r.organization_id);
      if (orgIds.length === 0) return json({ success: true, data: [] });
    }
    let q = supabase.from("profiles").select(`
      id,email,first_name,last_name,organization_id,created_at,
      user_roles(role, organization_id),
      organizations:organization_id(id,name,slug)
    `).order("created_at", { ascending: false });
    if (!isSA) q = q.in("organization_id", orgIds);
    const { data: rawData, error } = await q;
    if (error) return json({ error: error.message }, 500);
    
    // Get auth.users data for email confirmation status
    console.log("Attempting supabaseAdmin.auth.admin.listUsers()...");
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    console.log("Admin listUsers result:", { usersCount: authUsers?.users?.length, error: authError });
    if (authError) {
      console.log("Admin listUsers FAILED - returning 500:", authError.message);
      return json({ error: authError.message }, 500);
    }
    
    // Transform data using canonical response format
    const transformedData = (rawData || []).map((user: any) => {
      const authUser = authUsers.users.find(au => au.id === user.id);
      
      // Prepare user data with auth status
      const userWithAuthStatus = {
        ...user,
        status: authUser?.email_confirmed_at ? 'active' : 'pending',
        email_confirmed: !!authUser?.email_confirmed_at,
        last_sign_in: authUser?.last_sign_in_at
      };
      
      // Use canonical response helper
      return createUserResponse(userWithAuthStatus);
    });
    
    return json({ success: true, data: transformedData });
  }

  // Back-compat body.action flow (invoke)
  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    console.log('[ADMIN-USERS] POST request - Incoming JSON body:', JSON.stringify(body));
    const action = body?.action;
    if (action === 'list') {
      // mimic GET list scope
      let orgIds: string[] = [];
      if (!isSA) {
        const { data: rows } = await supabase.from("user_roles").select("organization_id").eq("user_id", uid);
        orgIds = (rows || []).map((r: any) => r.organization_id);
        if (orgIds.length === 0) return json({ success: true, data: [] });
      }
      let q = supabase.from("profiles").select(`
        id,email,first_name,last_name,organization_id,created_at,
        user_roles(role, organization_id),
        organizations:organization_id(id,name,slug)
      `).order("created_at", { ascending: false });
      if (!isSA) q = q.in("organization_id", orgIds);
      const { data: rawData, error } = await q;
      if (error) return json({ error: error.message }, 500);
      
      // Get auth.users data for email confirmation status
      console.log("Attempting supabaseAdmin.auth.admin.listUsers() (POST action=list)...");
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      console.log("Admin listUsers result (POST):", { usersCount: authUsers?.users?.length, error: authError });
      if (authError) {
        console.log("Admin listUsers FAILED (POST) - returning 500:", authError.message);
        return json({ error: authError.message }, 500);
      }
      
      // Transform data to match UI expectations
      const transformedData = (rawData || []).map((user: any) => {
        const authUser = authUsers.users.find(au => au.id === user.id);
        return {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          organization: user.organizations ? {
            id: user.organizations.id,
            name: user.organizations.name,
            slug: user.organizations.slug
          } : null,
          organization_id: user.organization_id,
          roles: user.user_roles || [],
          role: user.user_roles?.[0]?.role || null,
          status: authUser?.email_confirmed_at ? 'active' : 'pending',
          email_confirmed: !!authUser?.email_confirmed_at,
          last_sign_in: authUser?.last_sign_in_at,
          created_at: user.created_at
        };
      });
      
      return json({ success: true, data: transformedData });
    }
    if (action === 'invite') {
      const { email, organization_id, roles } = body || {};
      const role = Array.isArray(roles) ? roles[0] : roles;
      if (!email || !organization_id || !role) return json({ error: 'invalid_request', details: 'email, organization_id, roles required' }, 400);
      // Check admin
      let allowed = !!isSA;
      if (!allowed) {
        const { data: rows } = await supabase.from('user_roles').select('role').eq('user_id', uid).eq('organization_id', organization_id);
        allowed = (rows||[]).some((r:any)=>['ORG_ADMIN','SUPER_ADMIN'].includes(r.role));
      }
      if (!allowed) return json({ error: 'forbidden' }, 403);
      // Conflict if already in org
      const { data: prof } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
      if (prof) {
        const { data: member } = await supabase.from('user_roles').select('role').eq('user_id', prof.id).eq('organization_id', organization_id).maybeSingle();
        if (member) return json({ error: 'conflict', details: 'user already in organization' }, 409);
      }
      await auditLog(supabase, {
        actor_id: uid,
        actor_role: actorRole,
        organization_id,
        action: 'USER_INVITE_CREATED',
        resource_type: 'user_invite',
        resource_id: email,
        details: { email, role, invited_by: uid }
      });
      return json({ success: true, data: { invited: true } }, 201);
    }
    
    // Create new user with organization assignment
    if (action === 'create') {
      console.log('[ADMIN-USERS] POST action=create - Processing user creation');
      const { email, password, first_name, last_name, organization_id, role = 'VIEWER' } = body || {};
      
      console.log('[ADMIN-USERS] POST action=create - Extracted fields:', {
        email: email || 'MISSING',
        organization_id: organization_id || 'MISSING',
        role,
        has_password: !!password,
        first_name,
        last_name
      });
      
      // Validate required fields
      if (!email || !organization_id) {
        console.error('[ADMIN-USERS] POST action=create - Validation failure: missing required fields', {
          email: !!email,
          organization_id: !!organization_id,
          body: JSON.stringify(body)
        });
        return json({ error: 'invalid_request', details: 'email and organization_id required' }, 400);
      }
      
      // Check authorization - only super admin or org admin can create users
      console.log('[ADMIN-USERS] POST action=create - Checking authorization for user:', uid, 'isSuperAdmin:', !!isSA);
      let allowed = !!isSA;
      if (!allowed) {
        console.log('[ADMIN-USERS] POST action=create - Not super admin, checking org admin rights for org:', organization_id);
        const { data: rows } = await supabase.from('user_roles').select('role').eq('user_id', uid).eq('organization_id', organization_id);
        console.log('[ADMIN-USERS] POST action=create - User roles in target org:', JSON.stringify(rows));
        allowed = (rows||[]).some((r:any)=>['ORG_ADMIN','SUPER_ADMIN'].includes(r.role));
      }
      console.log('[ADMIN-USERS] POST action=create - Authorization result:', allowed);
      if (!allowed) {
        console.error('[ADMIN-USERS] POST action=create - Authorization failure: insufficient permissions', {
          user_id: uid,
          organization_id,
          is_super_admin: !!isSA,
          body: JSON.stringify(body)
        });
        return json({ error: 'forbidden', details: 'Only super admin or org admin can create users' }, 403);
      }
      
      // Verify organization exists and caller has access
      console.log('[ADMIN-USERS] POST action=create - Verifying organization exists:', organization_id);
      const { data: orgCheck, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', organization_id)
        .single();
      
      console.log('[ADMIN-USERS] POST action=create - Organization check result:', { 
        found: !!orgCheck, 
        error: orgError?.message || null 
      });
      
      if (orgError || !orgCheck) {
        console.error('[ADMIN-USERS] POST action=create - Organization validation failure:', {
          organization_id,
          error: orgError?.message || 'not found',
          body: JSON.stringify(body)
        });
        return json({ error: 'invalid_request', details: 'Invalid organization_id' }, 400);
      }
      
      try {
        console.log('[ADMIN-USERS] POST action=create - Starting user creation process');
        // Create auth user
        const authPayload = {
          email,
          password: password || `temp_${Date.now()}`, // Generate temp password if not provided
          email_confirm: true, // Auto-confirm for admin-created users
          user_metadata: {
            first_name,
            last_name,
            created_by_admin: true,
            created_by: uid,
            organization_id
          }
        };
        console.log('[ADMIN-USERS] POST action=create - Creating auth user with payload:', {
          email,
          has_custom_password: !!password,
          email_confirm: true,
          user_metadata: authPayload.user_metadata
        });
        
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser(authPayload);
        
        if (authError) {
          console.error('[ADMIN-USERS] POST action=create - Auth user creation failed:', {
            error: authError.message,
            email,
            body: JSON.stringify(body)
          });
          return json({ error: 'auth_error', details: authError.message }, 400);
        }
        
        const newUserId = authData.user.id;
        console.log('[ADMIN-USERS] POST action=create - Auth user created successfully, ID:', newUserId);
        
        // Create profile
        const profileData = {
          id: newUserId,
          email,
          first_name,
          last_name,
          organization_id
        };
        console.log('[ADMIN-USERS] POST action=create - Creating profile:', profileData);
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();
        
        if (profileError) {
          console.error('[ADMIN-USERS] POST action=create - Profile creation failed, cleaning up auth user:', {
            error: profileError.message,
            newUserId,
            profileData,
            body: JSON.stringify(body)
          });
          // Cleanup auth user if profile creation fails
          await supabaseAdmin.auth.admin.deleteUser(newUserId);
          return json({ error: 'profile_error', details: profileError.message }, 500);
        }
        
        console.log('[ADMIN-USERS] POST action=create - Profile created successfully');
        
        // Assign role to user
        const roleData = {
          user_id: newUserId,
          organization_id,
          role: role.toUpperCase()
        };
        console.log('[ADMIN-USERS] POST action=create - Assigning role:', roleData);
        
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert(roleData);
        
        if (roleError) {
          console.error('[ADMIN-USERS] POST action=create - Role assignment failed, cleaning up user:', {
            error: roleError.message,
            newUserId,
            roleData,
            body: JSON.stringify(body)
          });
          // Cleanup on role assignment failure
          await supabaseAdmin.auth.admin.deleteUser(newUserId);
          return json({ error: 'role_error', details: roleError.message }, 500);
        }
        
        console.log('[ADMIN-USERS] POST action=create - Role assigned successfully');
        
        // Audit log
        console.log('[ADMIN-USERS] POST action=create - Creating audit log');
        await auditLog(supabase, {
          actor_id: uid,
          actor_role: actorRole,
          organization_id,
          action: 'USER_CREATED',
          resource_type: 'user',
          resource_id: newUserId,
          new_values: { email, first_name, last_name, organization_id, role },
          details: { created_by_admin: true, auto_confirmed: true }
        });
        
        // Get full user data for canonical response
        const { data: createdUserData } = await supabase
          .from('profiles')
          .select(`
            id, email, first_name, last_name, organization_id,
            user_roles(role, organization_id),
            organizations:organization_id(id, name, slug)
          `)
          .eq('id', newUserId)
          .single();
        
        console.log('[ADMIN-USERS] POST action=create - SUCCESS! User created:', createdUserData);
        
        return json({ 
          success: true, 
          data: createUserResponse(createdUserData)
        }, 201);
        
      } catch (error) {
        console.error('[ADMIN-USERS] POST action=create - Unexpected error in creation process:', {
          error: error.message || error,
          stack: error.stack,
          body: JSON.stringify(body)
        });
        return json({ error: 'server_error', details: 'Failed to create user' }, 500);
      }
    }
    
    // Update existing user (organization assignment, profile updates)
    if (action === 'update') {
      console.log('[ADMIN-USERS] POST action=update - Processing user update');
      
      // Use canonical field extraction
      const targetUserId = extractUserId(body?.payload || body);
      if (!targetUserId) {
        console.error('[ADMIN-USERS] POST action=update - Validation failure: missing user_id', {
          body: JSON.stringify(body)
        });
        return createErrorResponse('invalid_request', 'user_id is required', 'MISSING_USER_ID', 400, { field: 'user_id' });
      }
      
      const { organization_id, role, first_name, last_name, ...otherFields } = body?.payload || body || {};
      
      console.log('[ADMIN-USERS] POST action=update - Extracted fields:', {
        user_id: targetUserId,
        organization_id,
        role,
        first_name,
        last_name,
        otherFields
      });
      
      // Get current user data for validation and audit
      const { data: currentUser, error: userError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, organization_id, user_roles(role, organization_id)')
        .eq('id', targetUserId)
        .single();
      
      if (userError || !currentUser) {
        return createErrorResponse('not_found', 'User not found', 'USER_NOT_FOUND', 404, { user_id: targetUserId });
      }
      
      // Authorization check - can only update users in your orgs (or super admin)
      let allowed = !!isSA;
      if (!allowed && currentUser.organization_id) {
        const { data: rows } = await supabase.from('user_roles').select('role')
          .eq('user_id', uid).eq('organization_id', currentUser.organization_id);
        allowed = (rows||[]).some((r:any)=>['ORG_ADMIN','SUPER_ADMIN'].includes(r.role));
      }
      
      // If changing organization, check admin rights on target org too
      if (organization_id && organization_id !== currentUser.organization_id) {
        if (!isSA) {
          const { data: targetOrgRoles } = await supabase.from('user_roles').select('role')
            .eq('user_id', uid).eq('organization_id', organization_id);
          const hasTargetOrgAccess = (targetOrgRoles||[]).some((r:any)=>['ORG_ADMIN','SUPER_ADMIN'].includes(r.role));
          if (!hasTargetOrgAccess) {
            return createErrorResponse('forbidden', 'No admin access to target organization', 'INSUFFICIENT_PERMISSIONS', 403, { required_role: 'ORG_ADMIN' });
          }
        }
        
        // Verify target organization exists
        const { data: orgCheck } = await supabase
          .from('organizations')
          .select('id')
          .eq('id', organization_id)
          .single();
        
        if (!orgCheck) {
          return createErrorResponse('not_found', 'Target organization not found', 'ORGANIZATION_NOT_FOUND', 404, { organization_id });
        }
      }
      
      if (!allowed) {
        return createErrorResponse('forbidden', 'Insufficient permissions to update user', 'INSUFFICIENT_PERMISSIONS', 403, { required_role: 'ORG_ADMIN' });
      }
      
      try {
        const updates: any = {};
        const oldValues = {
          first_name: currentUser.first_name,
          last_name: currentUser.last_name,
          organization_id: currentUser.organization_id
        };
        
        // Profile updates
        if (first_name !== undefined) updates.first_name = first_name;
        if (last_name !== undefined) updates.last_name = last_name;
        if (organization_id !== undefined) updates.organization_id = organization_id;
        
        // Update profile if there are changes
        if (Object.keys(updates).length > 0) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', targetUserId);
          
          if (profileError) {
            return createErrorResponse('server_error', profileError.message, 'PROFILE_UPDATE_ERROR', 500);
          }
        }
        
        // Handle role/organization changes
        if (role || organization_id) {
          const targetOrgId = organization_id || currentUser.organization_id;
          
          // Remove existing roles for this org
          await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', targetUserId)
            .eq('organization_id', targetOrgId);
          
          // Add new role
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: targetUserId,
              organization_id: targetOrgId,
              role: (role || 'VIEWER').toUpperCase()
            });
          
          if (roleError) {
            return createErrorResponse('server_error', roleError.message, 'ROLE_UPDATE_ERROR', 500);
          }
        }
        
        // Audit log
        await auditLog(supabase, {
          actor_id: uid,
          actor_role: actorRole,
          organization_id: organization_id || currentUser.organization_id,
          action: 'USER_UPDATED',
          resource_type: 'user',
          resource_id: targetUserId,
          old_values: oldValues,
          new_values: updates,
          details: { 
            role_changed: !!role,
            org_changed: organization_id && organization_id !== currentUser.organization_id
          }
        });
        
        // Get updated user data
        const { data: updatedUser } = await supabase
          .from('profiles')
          .select(`
            id, email, first_name, last_name, organization_id,
            user_roles(role, organization_id),
            organizations:organization_id(id, name, slug)
          `)
          .eq('id', targetUserId)
          .single();
        
        // Return canonical response
        return json({ success: true, data: createUserResponse(updatedUser) });
        
      } catch (error) {
        console.error('[ADMIN-USERS] POST action=update - Unexpected error:', error);
        return createErrorResponse('server_error', 'Failed to update user', 'SERVER_ERROR', 500);
      }
    }
    
    if (action === 'delete') {
      return json({ error: 'not_implemented', details: 'User deletion not yet implemented' }, 501);
    }
    
    if (action === 'resetPassword') {
      return json({ error: 'not_implemented', details: 'Password reset not yet implemented' }, 501);
    }
    
    // Direct POST for user creation (without action parameter)
    console.log('[ADMIN-USERS] POST direct - No action parameter, checking for direct creation');
    const { email, password, first_name, last_name, organization_id, role = 'VIEWER' } = body || {};
    
    console.log('[ADMIN-USERS] POST direct - Fields check:', {
      email: email || 'missing',
      organization_id: organization_id || 'missing',
      has_both_required: !!(email && organization_id)
    });
    
    if (email && organization_id) {
      console.log('[ADMIN-USERS] POST direct - Starting direct user creation');
      // Direct user creation - same logic as action=create
      
      // Check authorization - only super admin or org admin can create users
      let allowed = !!isSA;
      if (!allowed) {
        const { data: rows } = await supabase.from('user_roles').select('role').eq('user_id', uid).eq('organization_id', organization_id);
        allowed = (rows||[]).some((r:any)=>['ORG_ADMIN','SUPER_ADMIN'].includes(r.role));
      }
      if (!allowed) return json({ error: 'forbidden', details: 'Only super admin or org admin can create users' }, 403);
      
      // Verify organization exists and caller has access
      const { data: orgCheck, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', organization_id)
        .single();
      
      if (orgError || !orgCheck) {
        return json({ error: 'invalid_request', details: 'Invalid organization_id' }, 400);
      }
      
      try {
        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: password || `temp_${Date.now()}`, // Generate temp password if not provided
          email_confirm: true, // Auto-confirm for admin-created users
          user_metadata: {
            first_name,
            last_name,
            created_by_admin: true,
            created_by: uid,
            organization_id
          }
        });
        
        if (authError) {
          return json({ error: 'auth_error', details: authError.message }, 400);
        }
        
        const newUserId = authData.user.id;
        
        // Create profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: newUserId,
            email,
            first_name,
            last_name,
            organization_id
          })
          .select()
          .single();
        
        if (profileError) {
          // Cleanup auth user if profile creation fails
          await supabaseAdmin.auth.admin.deleteUser(newUserId);
          return json({ error: 'profile_error', details: profileError.message }, 500);
        }
        
        // Assign role to user
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: newUserId,
            organization_id,
            role: role.toUpperCase()
          });
        
        if (roleError) {
          // Cleanup on role assignment failure
          await supabaseAdmin.auth.admin.deleteUser(newUserId);
          return json({ error: 'role_error', details: roleError.message }, 500);
        }
        
        // Audit log
        await auditLog(supabase, {
          actor_id: uid,
          actor_role: actorRole,
          organization_id,
          action: 'USER_CREATED',
          resource_type: 'user',
          resource_id: newUserId,
          new_values: { email, first_name, last_name, organization_id, role },
          details: { created_by_admin: true, auto_confirmed: true, method: 'POST_direct' }
        });
        
        // Get full user data for canonical response
        const { data: createdUserData } = await supabase
          .from('profiles')
          .select(`
            id, email, first_name, last_name, organization_id,
            user_roles(role, organization_id),
            organizations:organization_id(id, name, slug)
          `)
          .eq('id', newUserId)
          .single();
        
        return json({ 
          success: true, 
          data: createUserResponse(createdUserData)
        }, 201);
        
      } catch (error) {
        console.error('User creation error:', error);
        return json({ error: 'server_error', details: 'Failed to create user' }, 500);
      }
    }
    
    return json({ error: 'not_found' }, 404);
  }

  // PATCH method - same as POST action=update for RESTful API compliance
  if (req.method === "PATCH") {
    const body = await req.json().catch(() => ({}));
    console.log('[ADMIN-USERS] PATCH request - Incoming JSON body:', JSON.stringify(body));
    
    // Use canonical field extraction
    const targetUserId = extractUserId(body);
    if (!targetUserId) {
      console.error('[ADMIN-USERS] PATCH - Validation failure: missing user_id', {
        body: JSON.stringify(body)
      });
      return createErrorResponse('invalid_request', 'user_id is required', 'MISSING_USER_ID', 400, { field: 'user_id' });
    }
    
    const { organization_id, role, first_name, last_name, ...otherFields } = body || {};
    
    console.log('[ADMIN-USERS] PATCH - Extracted fields:', {
      user_id: targetUserId,
      organization_id,
      role,
      first_name,
      last_name,
      otherFields
    });
    
    // Get current user data for validation and audit
    const { data: currentUser, error: userError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, organization_id, user_roles(role, organization_id)')
      .eq('id', targetUserId)
      .single();
    
    if (userError || !currentUser) {
      return createErrorResponse('not_found', 'User not found', 'USER_NOT_FOUND', 404, { user_id: targetUserId });
    }
    
    // Authorization check - can only update users in your orgs (or super admin)
    let allowed = !!isSA;
    if (!allowed && currentUser.organization_id) {
      const { data: rows } = await supabase.from('user_roles').select('role')
        .eq('user_id', uid).eq('organization_id', currentUser.organization_id);
      allowed = (rows||[]).some((r:any)=>['ORG_ADMIN','SUPER_ADMIN'].includes(r.role));
    }
    
    // If changing organization, check admin rights on target org too
    if (organization_id && organization_id !== currentUser.organization_id) {
      if (!isSA) {
        const { data: targetOrgRoles } = await supabase.from('user_roles').select('role')
          .eq('user_id', uid).eq('organization_id', organization_id);
        const hasTargetOrgAccess = (targetOrgRoles||[]).some((r:any)=>['ORG_ADMIN','SUPER_ADMIN'].includes(r.role));
        if (!hasTargetOrgAccess) {
          return createErrorResponse('forbidden', 'No admin access to target organization', 'INSUFFICIENT_PERMISSIONS', 403, { required_role: 'ORG_ADMIN' });
        }
      }
      
      // Verify target organization exists
      const { data: orgCheck } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', organization_id)
        .single();
      
      if (!orgCheck) {
        return createErrorResponse('not_found', 'Target organization not found', 'ORGANIZATION_NOT_FOUND', 404, { organization_id });
      }
    }
    
    if (!allowed) {
      return createErrorResponse('forbidden', 'Insufficient permissions to update user', 'INSUFFICIENT_PERMISSIONS', 403, { required_role: 'ORG_ADMIN' });
    }
    
    try {
      const updates: any = {};
      const oldValues = {
        first_name: currentUser.first_name,
        last_name: currentUser.last_name,
        organization_id: currentUser.organization_id
      };
      
      // Profile updates
      if (first_name !== undefined) updates.first_name = first_name;
      if (last_name !== undefined) updates.last_name = last_name;
      if (organization_id !== undefined) updates.organization_id = organization_id;
      
      // Update profile if there are changes
      if (Object.keys(updates).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', targetUserId);
        
        if (profileError) {
          return createErrorResponse('server_error', profileError.message, 'PROFILE_UPDATE_ERROR', 500);
        }
      }
      
      // Handle role/organization changes
      if (role || organization_id) {
        const targetOrgId = organization_id || currentUser.organization_id;
        
        // Remove existing roles for this org
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', targetUserId)
          .eq('organization_id', targetOrgId);
        
        // Add new role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: targetUserId,
            organization_id: targetOrgId,
            role: (role || 'VIEWER').toUpperCase()
          });
        
        if (roleError) {
          return createErrorResponse('server_error', roleError.message, 'ROLE_UPDATE_ERROR', 500);
        }
      }
      
      // Audit log
      await auditLog(supabase, {
        actor_id: uid,
        actor_role: actorRole,
        organization_id: organization_id || currentUser.organization_id,
        action: 'USER_UPDATED',
        resource_type: 'user',
        resource_id: targetUserId,
        old_values: oldValues,
        new_values: updates,
        details: { 
          role_changed: !!role,
          org_changed: organization_id && organization_id !== currentUser.organization_id,
          method: 'PATCH'
        }
      });
      
      // Get updated user data
      const { data: updatedUser } = await supabase
        .from('profiles')
        .select(`
          id, email, first_name, last_name, organization_id,
          user_roles(role, organization_id),
          organizations:organization_id(id, name, slug)
        `)
        .eq('id', targetUserId)
        .single();
      
      // Return canonical response
      return json({ success: true, data: createUserResponse(updatedUser) });
      
    } catch (error) {
      console.error('[ADMIN-USERS] PATCH - Unexpected error:', error);
      return createErrorResponse('server_error', 'Failed to update user', 'SERVER_ERROR', 500);
    }
  }

  // 405 Method Not Allowed for unsupported HTTP methods
  return json({ error: 'method_not_allowed', details: 'Supported methods: GET, POST, PATCH, OPTIONS' }, 405);
});
