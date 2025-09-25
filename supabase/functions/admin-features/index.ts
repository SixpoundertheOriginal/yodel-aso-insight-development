// Feature management API for super admins and org admins
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
};

const jsonResponse = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const success = (data: Record<string, unknown>, status = 200) =>
  jsonResponse(status, { success: true, data });

const failure = (status: number, code: string, message: string, details?: unknown) =>
  jsonResponse(status, {
    success: false,
    error: { code, message, details },
  });

const normalizeOrgFeatures = (
  features: any[] | null | undefined,
  entitlements: Record<string, boolean>,
) =>
  (features || []).map((feature) => ({
    ...feature,
    is_enabled: entitlements[feature.feature_key] ?? false,
  }));

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return failure(500, 'CONFIG_ERROR', 'Missing Supabase configuration');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Extract authenticated user from request token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return failure(401, 'UNAUTHORIZED', 'Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return failure(401, 'UNAUTHORIZED', 'Invalid token');
    }

    // Determine if caller is a super admin
    const { data: isSuperAdmin } = await supabaseAdmin.rpc('is_super_admin', {
      user_id: user.id,
    });

    const url = new URL(req.url);
    const path = url.pathname;

    let body: Record<string, unknown> = {};
    if (req.method !== 'GET') {
      try {
        body = await req.json();
      } catch (_err) {
        body = {};
      }
    }

    const action = typeof body.action === 'string' ? body.action : undefined;

    // Action-based invocation (called via supabase.functions.invoke)
    if (req.method === 'POST' && action === 'list_platform_features') {
      const { data: features, error } = await supabaseAdmin
        .from('platform_features')
        .select('*')
        .order('category', { ascending: true })
        .order('feature_name', { ascending: true });

      if (error) {
        console.error('Error fetching platform features:', error);
        return failure(500, 'FETCH_ERROR', 'Failed to fetch platform features');
      }

      return success({ features });
    }

    if (req.method === 'POST' && action === 'get_org_features') {
      const orgId = typeof body.organization_id === 'string' ? body.organization_id : undefined;

      if (!orgId) {
        return failure(400, 'INVALID_PARAMS', 'organization_id is required');
      }

      const [featuresResult, entitlementsResult] = await Promise.all([
        supabaseAdmin
          .from('platform_features')
          .select('*')
          .order('category', { ascending: true })
          .order('feature_name', { ascending: true }),
        supabaseAdmin
          .from('org_feature_entitlements')
          .select('feature_key, is_enabled')
          .eq('organization_id', orgId),
      ]);

      if (featuresResult.error) {
        console.error('Error fetching org features:', featuresResult.error);
        return failure(500, 'FETCH_ERROR', 'Failed to fetch organization features', featuresResult.error);
      }

      if (entitlementsResult.error) {
        console.error('Error fetching org entitlements:', entitlementsResult.error);
        return failure(500, 'FETCH_ERROR', 'Failed to fetch organization features', entitlementsResult.error);
      }

      const entitlementsMap = Object.fromEntries(
        (entitlementsResult.data || []).map((item) => [item.feature_key, item.is_enabled])
      );

      return success({
        organization_id: orgId,
        features: normalizeOrgFeatures(featuresResult.data, entitlementsMap),
      });
    }

    if (req.method === 'POST' && action === 'toggle_org_feature') {
      if (!isSuperAdmin) {
        return failure(403, 'FORBIDDEN', 'Only super admins can toggle organization features');
      }

      const togglePayload = body as FeatureToggleRequest;
      const { organization_id, feature_key, is_enabled } = togglePayload;

      if (!organization_id || !feature_key || typeof is_enabled !== 'boolean') {
        return failure(400, 'INVALID_PARAMS', 'Missing required parameters');
      }

      const { data: existingEntitlement, error: fetchError, status: fetchStatus } = await supabaseAdmin
        .from('org_feature_entitlements')
        .select('id, organization_id, feature_key')
        .eq('organization_id', organization_id)
        .eq('feature_key', feature_key)
        .maybeSingle();

      if (fetchError && fetchStatus !== 406) {
        console.error('Error fetching entitlement before toggle:', fetchError);
        return failure(500, 'FETCH_ERROR', 'Failed to read current entitlement', fetchError);
      }

      const now = new Date().toISOString();

      if (existingEntitlement) {
        const { error: updateError } = await supabaseAdmin
          .from('org_feature_entitlements')
          .update({
            is_enabled,
            granted_by: is_enabled ? user.id : null,
            granted_at: is_enabled ? now : null,
            updated_at: now,
          })
          .eq('id', existingEntitlement.id);

        if (updateError) {
          console.error('Error updating org feature entitlement:', updateError);
          return failure(500, 'UPDATE_ERROR', 'Failed to update feature access', updateError);
        }
      } else {
        const { error: insertError } = await supabaseAdmin
          .from('org_feature_entitlements')
          .insert({
            organization_id,
            feature_key,
            is_enabled,
            granted_by: user.id,
            granted_at: now,
          });

        if (insertError) {
          console.error('Error inserting org feature entitlement:', insertError);
          return failure(500, 'UPDATE_ERROR', 'Failed to update feature access', insertError);
        }
      }

      await supabaseAdmin.from('audit_logs').insert({
        user_id: user.id,
        organization_id,
        action: 'feature_toggle',
        resource_type: 'organization_feature',
        details: { feature_key, is_enabled, changed_by: user.id },
      });

      return success({ organization_id, feature_key, is_enabled });
    }

    // REST endpoints (backwards compatibility for existing clients)
    if (req.method === 'GET' && path.endsWith('/admin-features')) {
      const { data: features, error } = await supabaseAdmin
        .from('platform_features')
        .select('*')
        .order('category', { ascending: true })
        .order('feature_name', { ascending: true });

      if (error) {
        console.error('Error fetching platform features:', error);
        return failure(500, 'FETCH_ERROR', 'Failed to fetch platform features');
      }

      return success({
        features,
        scope: { user_id: user.id, is_super_admin: isSuperAdmin, timestamp: new Date().toISOString() },
      });
    }

    if (req.method === 'GET' && path.includes('/organization/')) {
      const orgId = path.split('/organization/')[1];

      if (!isSuperAdmin) {
        const { data: userProfile } = await supabaseAdmin
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!userProfile || userProfile.organization_id !== orgId) {
          return failure(403, 'FORBIDDEN', 'Access denied to organization features');
        }
      }

      const [featuresResult, entitlementsResult] = await Promise.all([
        supabaseAdmin
          .from('platform_features')
          .select('*')
          .order('category', { ascending: true })
          .order('feature_name', { ascending: true }),
        supabaseAdmin
          .from('org_feature_entitlements')
          .select('feature_key, is_enabled')
          .eq('organization_id', orgId),
      ]);

      if (featuresResult.error) {
        console.error('Error fetching org features:', featuresResult.error);
        return failure(500, 'FETCH_ERROR', 'Failed to fetch organization features', featuresResult.error);
      }

      if (entitlementsResult.error) {
        console.error('Error fetching org entitlements:', entitlementsResult.error);
        return failure(500, 'FETCH_ERROR', 'Failed to fetch organization features', entitlementsResult.error);
      }

      const entitlementsMap = Object.fromEntries(
        (entitlementsResult.data || []).map((item) => [item.feature_key, item.is_enabled])
      );

      return success({
        organization_id: orgId,
        features: normalizeOrgFeatures(featuresResult.data, entitlementsMap),
        scope: { user_id: user.id, organization_id: orgId, timestamp: new Date().toISOString() },
      });
    }

    if (req.method === 'POST' && path.includes('/organization')) {
      if (!isSuperAdmin) {
        return failure(403, 'FORBIDDEN', 'Only super admins can toggle organization features');
      }

      const { organization_id, feature_key, is_enabled } = body as FeatureToggleRequest;

      if (!organization_id || !feature_key || typeof is_enabled !== 'boolean') {
        return failure(400, 'INVALID_PARAMS', 'Missing required parameters');
      }

      const { error: upsertError } = await supabaseAdmin
        .from('org_feature_entitlements')
        .upsert({
          organization_id,
          feature_key,
          is_enabled,
          updated_at: new Date().toISOString(),
        });

      if (upsertError) {
        console.error('Error updating org feature access:', upsertError);
        return failure(500, 'UPDATE_ERROR', 'Failed to update feature access');
      }

      await supabaseAdmin.from('audit_logs').insert({
        user_id: user.id,
        organization_id,
        action: 'feature_toggle',
        resource_type: 'organization_feature',
        details: { feature_key, is_enabled, changed_by: user.id },
      });

      return success({
        organization_id,
        feature_key,
        is_enabled,
        scope: { user_id: user.id, organization_id, timestamp: new Date().toISOString() },
      });
    }

    if (req.method === 'POST' && path.includes('/user-override')) {
      const { user_id, organization_id, feature_key, is_enabled, reason, expires_at } =
        body as UserFeatureOverrideRequest;

      if (!user_id || !organization_id || !feature_key || typeof is_enabled !== 'boolean') {
        return failure(400, 'INVALID_PARAMS', 'Missing required parameters');
      }

      if (!isSuperAdmin) {
        const { data: userProfile } = await supabaseAdmin
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!userProfile || userProfile.organization_id !== organization_id) {
          return failure(403, 'FORBIDDEN', 'Access denied to set user overrides');
        }
      }

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
          updated_at: new Date().toISOString(),
        });

      if (upsertError) {
        console.error('Error updating user feature override:', upsertError);
        return failure(500, 'UPDATE_ERROR', 'Failed to update user feature override');
      }

      await supabaseAdmin.from('audit_logs').insert({
        user_id: user.id,
        organization_id,
        action: 'user_feature_override',
        resource_type: 'user_feature',
        details: { target_user_id: user_id, feature_key, is_enabled, reason, changed_by: user.id },
      });

      return success({
        user_id,
        organization_id,
        feature_key,
        is_enabled,
        reason,
        expires_at,
        scope: { user_id: user.id, organization_id, timestamp: new Date().toISOString() },
      });
    }

    if (req.method === 'GET' && path.includes('/user/')) {
      const targetUserId = path.split('/user/')[1];

      const { data: targetUserProfile } = await supabaseAdmin
        .from('profiles')
        .select('organization_id')
        .eq('id', targetUserId)
        .single();

      if (!targetUserProfile) {
        return failure(404, 'NOT_FOUND', 'User not found');
      }

      if (!isSuperAdmin) {
        const { data: userProfile } = await supabaseAdmin
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!userProfile || userProfile.organization_id !== targetUserProfile.organization_id) {
          return failure(403, 'FORBIDDEN', 'Access denied to user feature overrides');
        }
      }

      const { data: overrides, error } = await supabaseAdmin
        .from('user_feature_overrides')
        .select('*, platform_features(feature_name, category)')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user overrides:', error);
        return failure(500, 'FETCH_ERROR', 'Failed to fetch user overrides');
      }

      return success({
        user_id: targetUserId,
        organization_id: targetUserProfile.organization_id,
        overrides: overrides || [],
        scope: { user_id: user.id, timestamp: new Date().toISOString() },
      });
    }

    return failure(404, 'NOT_FOUND', 'Endpoint not found');
  } catch (error) {
    console.error('Unexpected error in admin-features:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return failure(500, 'INTERNAL_ERROR', message);
  }
});
