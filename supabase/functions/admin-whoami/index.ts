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

    // ===== DEBUG LOGGING - ROOT CAUSE ANALYSIS =====
    const authHeader = req.headers.get('Authorization');
    console.log('[DEBUG/WHOAMI] Authorization header present:', !!authHeader);
    if (authHeader) {
      // Log first 50 chars of JWT for debugging (safe for logs)
      console.log('[DEBUG/WHOAMI] JWT preview:', authHeader.substring(0, 50) + '...');
    }

    const userResult = await supabase.auth.getUser();
    console.log('[DEBUG/WHOAMI] JWT user:', JSON.stringify(userResult.data.user));
    const jwtUserId = userResult.data.user?.id;
    console.log('[DEBUG/WHOAMI] Using user_id for query:', jwtUserId);

    if (!userResult.data.user) throw new Error('Not authenticated')

    // Direct user_roles query with minimal select to isolate RLS issues
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role, organization_id')
      .eq('user_id', jwtUserId);

    console.log('[DEBUG/WHOAMI] userRoles query result:', JSON.stringify(userRoles), rolesError);

    if (!userRoles || userRoles.length === 0) {
      console.error('[DEBUG/WHOAMI] user_roles is EMPTY for', jwtUserId);
      
      // Control test with service role to check if data exists with full privileges
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      const { data: adminRoles, error: adminError } = await supabaseAdmin
        .from('user_roles')
        .select('role, organization_id, is_active, expires_at')
        .eq('user_id', jwtUserId);
      
      console.log('[DEBUG/WHOAMI] CONTROL - Service role query result:', JSON.stringify(adminRoles), adminError);
    }
    // ===== END DEBUG LOGGING =====

    console.log('[ADMIN-WHOAMI] Getting user roles for user:', jwtUserId);

    // Get user roles using the user_roles system with organization data and org settings
    const { data: extendedUserRoles, error: extendedRolesError } = await supabase
      .from('user_roles')
      .select(`
        role,
        organization_id,
        organizations:organization_id ( id, name, slug, settings )
      `)
      .eq('user_id', jwtUserId)

    console.log('[ADMIN-WHOAMI] Extended user roles query result:', { extendedUserRoles, error: extendedRolesError });

    const { data: isSuperAdmin, error: saError } = await supabase.rpc('is_super_admin', { 
      user_id: jwtUserId 
    })

    console.log('[ADMIN-WHOAMI] Super admin check:', { isSuperAdmin, error: saError });

    // Use the basic userRoles from debug section if extended query failed, otherwise use extended
    const finalUserRoles = extendedUserRoles || userRoles || [];

    // Extract organizations from roles
    const organizations = finalUserRoles 
      ? finalUserRoles
          .map(ur => ur.organizations)
          .filter(org => org !== null)
          .reduce((acc, org) => {
            if (org && !acc.find(o => o.id === org.id)) {
              acc.push(org);
            }
            return acc;
          }, [] as any[])
      : [];

    console.log('[ADMIN-WHOAMI] Extracted organizations:', organizations);

    // Resolve active organization as first available (or null)
    const activeOrg = organizations.length > 0 ? organizations[0] : null;
    let features: string[] = [];
    if (activeOrg?.id) {
      // features from organization_features table
      const { data: featRows } = await supabase
        .from('organization_features')
        .select('feature_key, is_enabled')
        .eq('organization_id', activeOrg.id);
      features = (featRows || []).filter(r => r.is_enabled).map(r => r.feature_key);
    }

    const whoamiData = {
      user_id: jwtUserId,
      email: userResult.data.user.email,
      roles: finalUserRoles || [],
      is_super_admin: isSuperAdmin,
      organization_access: isSuperAdmin ? 'all' : 'limited',
      organization: activeOrg,
      org_id: activeOrg?.id || null,
      features,
      
      // All organizations for super admin or multi-org users
      organizations: organizations,
      
      authenticated_at: new Date().toISOString()
    }

    console.log('[ADMIN-WHOAMI] Final whoami response:', JSON.stringify(whoamiData, null, 2));

    return new Response(JSON.stringify(whoamiData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
