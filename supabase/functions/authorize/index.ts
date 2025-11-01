import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Input = { path?: string; method?: string };

// Strict CORS for all responses (success or error)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req) => {
  console.log("[AUTHORIZE] --- FUNCTION VERSION 2025-09-11-DEBUG ---");
  try {
    const url = new URL(req.url);
    const authHeader = req.headers.get("Authorization") || "";
    console.log("[AUTHORIZE] Start:", {
      method: req.method,
      pathname: url.pathname,
      hasAuth: !!authHeader,
      authPreview: authHeader ? authHeader.slice(0, 20) + "..." : null,
      headers: Object.fromEntries(req.headers.entries()),
    });

    if (req.method === "OPTIONS") {
      console.log("[AUTHORIZE] Preflight");
      return new Response("ok", { status: 200, headers: corsHeaders });
    }
    if (req.method !== "POST") {
      console.log("[AUTHORIZE] Method not allowed:", req.method);
      return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: user, error: ue } = await supabase.auth.getUser();
    console.log("[AUTHORIZE] getUser:", { hasUser: !!user?.user, ue });
    if (ue || !user?.user) {
      console.log("[AUTHORIZE] Unauthorized: missing/invalid JWT");
      return new Response(JSON.stringify({ allow: false, reason: "unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const uid = user.user.id;

    const body = (await req.json().catch(() => ({}))) as Input;
    const path = (body.path || '').toLowerCase();
    const method = (body.method || 'GET').toUpperCase();
    console.log("[AUTHORIZE] Input:", { path, method, uid });

    // Super admin shortcut
    const { data: isSa, error: saError } = await supabase.rpc('is_super_admin');
    if (saError) {
      console.log("[AUTHORIZE] Super admin RPC error:", saError.message || saError);
      // Fallback to false on RPC error
    }
    console.log("[AUTHORIZE] Super admin:", { isSa, saError });
    if (isSa) {
      return new Response(JSON.stringify({ allow: true, reason: "super_admin" }), { status: 200, headers: corsHeaders });
    }

    // Resolve active organization from profile
    const { data: profile, error: pe } = await supabase
      .from('profiles').select('organization_id').eq('id', uid).single();
    console.log("[AUTHORIZE] Profile org:", { profile, pe });
    if (pe) {
      console.log("[AUTHORIZE] Profile query error:", pe.message || pe);
      return new Response(JSON.stringify({ allow: false, reason: 'profile_query_error' }), { status: 500, headers: corsHeaders });
    }
    const orgId = profile?.organization_id || null;
    if (!orgId) {
      console.log("[AUTHORIZE] Deny: no organization");
      return new Response(JSON.stringify({ allow: false, reason: 'no_organization' }), { status: 403, headers: corsHeaders });
    }

    // Verify membership and role
    const { data: roles, error: re } = await supabase
      .from('user_roles').select('role').eq('user_id', uid).eq('organization_id', orgId);
    console.log("[AUTHORIZE] Roles:", { roles, re });
    if (re) {
      console.log("[AUTHORIZE] Roles query error:", re.message || re);
      return new Response(JSON.stringify({ allow: false, reason: 'roles_query_error' }), { status: 500, headers: corsHeaders });
    }
    if (!roles || roles.length === 0) {
      console.log("[AUTHORIZE] Deny: no role in org");
      return new Response(JSON.stringify({ allow: false, reason: 'no_role' }), { status: 403, headers: corsHeaders });
    }
    const role = (roles[0].role || '').toLowerCase();

    // Organization demo flag + features
    const { data: orgRow, error: oe } = await supabase
      .from('organizations').select('id, slug, settings').eq('id', orgId).single();
    if (oe) {
      console.log("[AUTHORIZE] Organizations query error:", oe.message || oe);
      return new Response(JSON.stringify({ allow: false, reason: 'org_query_error' }), { status: 500, headers: corsHeaders });
    }
    const isDemo = Boolean(orgRow?.settings?.demo_mode) || (orgRow?.slug || '').toLowerCase() === 'next';
    console.log("[AUTHORIZE] Org:", { orgId, slug: orgRow?.slug, isDemo, oe });

    // Organization features table (keyed feature flags)
    const { data: featRows, error: fe } = await supabase
      .from('organization_features').select('feature_key, is_enabled').eq('organization_id', orgId);
    if (fe) {
      console.log("[AUTHORIZE] Features query error:", fe.message || fe);
      // Features query error is non-critical, continue with empty features
    }
    const features: Record<string, boolean> = {};
    (featRows || []).forEach(r => features[r.feature_key] = !!r.is_enabled);
    console.log("[AUTHORIZE] Features:", { count: (featRows || []).length, features, fe });

    // Central policy: Demo sections
    const demoPolicies: Array<{ match: (p: string) => boolean; feature: string; label: string }> = [
      { match: (p) => ['/aso-ai-hub', '/chatgpt-visibility-audit', '/aso-unified', '/demo/aso-ai-audit'].some(x => p.startsWith(x)), feature: 'aso_audit_demo', label: 'ASO Audit' },
      { match: (p) => ['/demo/creative-review'].some(x => p.startsWith(x)), feature: 'creative_review_demo', label: 'Creative Review' },
      { match: (p) => ['/demo/keyword-insights'].some(x => p.startsWith(x)), feature: 'keyword_insights_demo', label: 'Keyword Insights' },
    ];
    for (const pol of demoPolicies) {
      if (pol.match(path)) {
        const hasDemoFeature = features[pol.feature] === true;
        const allow = isDemo && hasDemoFeature;
        console.log("[AUTHORIZE] DEMO policy:", { path, feature: pol.feature, isDemo, hasDemoFeature, allow });
        if (allow) {
          return new Response(JSON.stringify({ allow: true, reason: 'demo_feature_enabled' }), { status: 200, headers: corsHeaders });
        }
        return new Response(JSON.stringify({ allow: false, reason: 'feature_not_enabled_or_not_demo' }), { status: 403, headers: corsHeaders });
      }
    }

    // Default allow other paths (existing app guards may still apply)
    console.log("[AUTHORIZE] Default allow", { path, method });
    return new Response(JSON.stringify({ allow: true, reason: 'default_allow' }), { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error("[FUNCTION AUTHORIZE] INTERNAL ERROR:", (e as any)?.stack || e);
    return new Response(
      JSON.stringify({ error: 'internal_error', message: (e as any)?.message || String(e) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
