// Feature management API for super admins and org admins
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FeatureToggleRequest {
  organization_id: string;
  feature_key: string;
  is_enabled: boolean;
}

interface UserFeatureOverrideRequest {
  user_id: string;
  organization_id: string;
  feature_key: string;
  is_enabled: boolean;
  reason?: string;
  expires_at?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' }
      }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(JSON.stringify({ 
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid token' }
      }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Check if user is super admin
    const { data: isSuperAdmin } = await supabaseAdmin.rpc('is_super_admin', { 
      user_id: user.id 
    });

    const url = new URL(req.url);
    const path = url.pathname;

    // GET /admin-features - List all platform features
    if (req.method === 'GET' && path.endsWith('/admin-features')) {
      const { data: features, error } = await supabaseAdmin
        .from('platform_features')
        .select('*')
        .order('category', { ascending: true })
        .order('feature_name', { ascending: true });

      if (error) {
        console.error('Error fetching platform features:', error);
        return new Response(JSON.stringify({ 
          success: false,
          error: { code: 'FETCH_ERROR', message: 'Failed to fetch platform features' }
        }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      return new Response(JSON.stringify({ 
        success: true,
        data: { features },
        scope: { user_id: user.id, is_super_admin: isSuperAdmin, timestamp: new Date().toISOString() }
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // GET /admin-features/organization/{org_id} - Get organization feature entitlements
    if (req.method === 'GET' && path.includes('/organization/')) {
      const orgId = path.split('/organization/')[1];
      
      if (!isSuperAdmin) {
        // Check if user is org admin for this organization
        const { data: userProfile } = await supabaseAdmin
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!userProfile || userProfile.organization_id !== orgId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: { code: 'FORBIDDEN', message: 'Access denied to organization features' }
          }), { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
      }

      // Get all platform features with org entitlements
      const { data: features, error: featuresError } = await supabaseAdmin
        .from('platform_features')
        .select(`
          *,
          org_feature_access!left(is_enabled)
        `)
        .eq('org_feature_access.organization_id', orgId)
        .order('category')
        .order('feature_name');

      if (featuresError) {
        console.error('Error fetching org features:', featuresError);
        return new Response(JSON.stringify({ 
          success: false,
          error: { code: 'FETCH_ERROR', message: 'Failed to fetch organization features' }
        }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      return new Response(JSON.stringify({ 
        success: true,
        data: { 
          organization_id: orgId,
          features: features?.map(feature => ({
            ...feature,
            is_enabled: feature.org_feature_access?.[0]?.is_enabled || false
          })) || []
        },
        scope: { user_id: user.id, organization_id: orgId, timestamp: new Date().toISOString() }
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // POST /admin-features/organization - Toggle organization feature
    if (req.method === 'POST' && path.includes('/organization')) {
      if (!isSuperAdmin) {
        return new Response(JSON.stringify({ 
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only super admins can toggle organization features' }
        }), { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      const body: FeatureToggleRequest = await req.json();
      const { organization_id, feature_key, is_enabled } = body;

      if (!organization_id || !feature_key || typeof is_enabled !== 'boolean') {
        return new Response(JSON.stringify({ 
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'Missing required parameters' }
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Upsert organization feature access
      const { error: upsertError } = await supabaseAdmin
        .from('org_feature_access')
        .upsert({
          organization_id,
          feature_key,
          is_enabled,
          updated_at: new Date().toISOString()
        });

      if (upsertError) {
        console.error('Error updating org feature access:', upsertError);
        return new Response(JSON.stringify({ 
          success: false,
          error: { code: 'UPDATE_ERROR', message: 'Failed to update feature access' }
        }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Log the change
      await supabaseAdmin.from('audit_logs').insert({
        user_id: user.id,
        organization_id,
        action: 'feature_toggle',
        resource_type: 'organization_feature',
        details: { feature_key, is_enabled, changed_by: user.id }
      });

      return new Response(JSON.stringify({ 
        success: true,
        data: { organization_id, feature_key, is_enabled },
        scope: { user_id: user.id, organization_id, timestamp: new Date().toISOString() }
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // POST /admin-features/user-override - Set user feature override
    if (req.method === 'POST' && path.includes('/user-override')) {
      const body: UserFeatureOverrideRequest = await req.json();
      const { user_id, organization_id, feature_key, is_enabled, reason, expires_at } = body;

      if (!user_id || !organization_id || !feature_key || typeof is_enabled !== 'boolean') {
        return new Response(JSON.stringify({ 
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'Missing required parameters' }
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Check permissions - super admin or org admin for this org
      if (!isSuperAdmin) {
        const { data: userProfile } = await supabaseAdmin
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!userProfile || userProfile.organization_id !== organization_id) {
          return new Response(JSON.stringify({ 
            success: false,
            error: { code: 'FORBIDDEN', message: 'Access denied to set user overrides' }
          }), { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
      }

      // Upsert user feature override
      const { error: upsertError } = await supabaseAdmin
        .from('user_feature_overrides')
        .upsert({
          user_id,
          organization_id,
          feature_key,
          is_enabled,
          granted_by: user.id,
          reason,
          expires_at,
          updated_at: new Date().toISOString()
        });

      if (upsertError) {
        console.error('Error updating user feature override:', upsertError);
        return new Response(JSON.stringify({ 
          success: false,
          error: { code: 'UPDATE_ERROR', message: 'Failed to update user feature override' }
        }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Log the change
      await supabaseAdmin.from('audit_logs').insert({
        user_id: user.id,
        organization_id,
        action: 'user_feature_override',
        resource_type: 'user_feature',
        details: { target_user_id: user_id, feature_key, is_enabled, reason, changed_by: user.id }
      });

      return new Response(JSON.stringify({ 
        success: true,
        data: { user_id, organization_id, feature_key, is_enabled },
        scope: { user_id: user.id, organization_id, timestamp: new Date().toISOString() }
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // GET /admin-features/user/{user_id} - Get user feature overrides  
    if (req.method === 'GET' && path.includes('/user/')) {
      const targetUserId = path.split('/user/')[1];
      
      // Get user's org to check permissions
      const { data: targetUserProfile } = await supabaseAdmin
        .from('profiles')
        .select('organization_id')
        .eq('id', targetUserId)
        .single();

      if (!targetUserProfile) {
        return new Response(JSON.stringify({ 
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' }
        }), { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Check permissions
      if (!isSuperAdmin) {
        const { data: userProfile } = await supabaseAdmin
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!userProfile || userProfile.organization_id !== targetUserProfile.organization_id) {
          return new Response(JSON.stringify({ 
            success: false,
            error: { code: 'FORBIDDEN', message: 'Access denied to user feature overrides' }
          }), { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
      }

      // Get user feature overrides
      const { data: overrides, error } = await supabaseAdmin
        .from('user_feature_overrides')
        .select('*, platform_features(feature_name, category)')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user overrides:', error);
        return new Response(JSON.stringify({ 
          success: false,
          error: { code: 'FETCH_ERROR', message: 'Failed to fetch user overrides' }
        }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      return new Response(JSON.stringify({ 
        success: true,
        data: { 
          user_id: targetUserId,
          organization_id: targetUserProfile.organization_id,
          overrides: overrides || []
        },
        scope: { user_id: user.id, timestamp: new Date().toISOString() }
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify({ 
      success: false,
      error: { code: 'NOT_FOUND', message: 'Endpoint not found' }
    }), { 
      status: 404, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Unexpected error in admin-features:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});