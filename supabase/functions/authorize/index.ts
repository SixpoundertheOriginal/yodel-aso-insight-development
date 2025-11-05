import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  resolveAuthContext, 
  hasFeatureAccess, 
  corsHeaders,
  createErrorResponse,
  createSuccessResponse
} from '../_shared/auth-utils.ts';

type Input = { path?: string; method?: string; org_id?: string };

serve(async (req) => {
  console.log("[AUTHORIZE] --- UPDATED NEW FEATURE MODEL VERSION 2025-11-04 ---");
  try {
    const url = new URL(req.url);
    const authHeader = req.headers.get("Authorization") || "";
    console.log("[AUTHORIZE] Start:", {
      method: req.method,
      pathname: url.pathname,
      hasAuth: !!authHeader,
    });

    if (req.method === "OPTIONS") {
      console.log("[AUTHORIZE] Preflight");
      return new Response("ok", { status: 200, headers: corsHeaders });
    }
    if (req.method !== "POST") {
      console.log("[AUTHORIZE] Method not allowed:", req.method);
      return createErrorResponse("method_not_allowed", 405);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const body = (await req.json().catch(() => ({}))) as Input;
    const path = (body.path || '').toLowerCase();
    const method = (body.method || 'GET').toUpperCase();
    const requestedOrgId = body.org_id;
    
    console.log("[AUTHORIZE] Input:", { path, method, requestedOrgId });

    // Resolve complete authentication context using unified system
    console.log("[AUTHORIZE] Calling resolveAuthContext with requestedOrgId:", requestedOrgId);
    const authContext = await resolveAuthContext(supabase, requestedOrgId);
    console.log("[AUTHORIZE] AuthContext result:", authContext ? 'found' : 'null');
    
    if (!authContext) {
      console.log("[AUTHORIZE] Unauthorized: no auth context");
      return createErrorResponse("unauthorized", 401);
    }

    console.log("[AUTHORIZE] Auth context resolved:", {
      userId: authContext.user.id,
      orgId: authContext.permissions.org_id,
      role: authContext.permissions.effective_role,
      isSuperAdmin: authContext.permissions.is_super_admin,
      isOrgAdmin: authContext.permissions.is_org_admin,
      hasOrgAccess: authContext.hasOrgAccess
    });

    // Super admin bypass
    if (authContext.permissions.is_super_admin) {
      console.log("[AUTHORIZE] Super admin access granted");
      return createSuccessResponse({ allow: true, reason: "super_admin" });
    }

    // Organization access check - require either org membership or super admin
    if (!authContext.hasOrgAccess) {
      console.log("[AUTHORIZE] Deny: no organization access");
      return createErrorResponse("no_organization_access", 403);
    }

    const orgId = authContext.permissions.org_id;
    const role = authContext.permissions.normalized_role;
    const isDemo = authContext.isDemo;
    const features = authContext.features;

    console.log("[AUTHORIZE] Organization context:", { 
      orgId, 
      role, 
      isDemo, 
      featureCount: Object.keys(features).length 
    });

    // Step 1: Platform Admin Routes (reserved for super admin only)
    const platformAdminPolicies: Array<{ match: (p: string) => boolean; label: string }> = [
      { match: (p) => ['/admin/platform', '/admin/organizations', '/admin/billing'].some(x => p.startsWith(x)), label: 'Platform Admin' },
    ];
    
    for (const pol of platformAdminPolicies) {
      if (pol.match(path)) {
        console.log("[AUTHORIZE] PLATFORM ADMIN policy:", { path, isSuperAdmin: authContext.permissions.is_super_admin, role });
        if (authContext.permissions.is_super_admin) {
          return createSuccessResponse({ allow: true, reason: 'platform_admin_access' });
        }
        return createErrorResponse('platform_admin_required', 403);
      }
    }

    // Step 2: Base App Access Check (core application entry)
    const coreAppPolicies: Array<{ match: (p: string) => boolean; label: string }> = [
      { match: (p) => ['/', '/dashboard', '/dashboard/'].some(x => p === x || p.startsWith(x)), label: 'Core App' },
    ];
    
    for (const pol of coreAppPolicies) {
      if (pol.match(path)) {
        const hasBaseAccess = hasFeatureAccess(authContext, 'app_core_access');
        console.log("[AUTHORIZE] CORE APP policy:", { path, hasBaseAccess, role });
        if (hasBaseAccess) {
          return createSuccessResponse({ allow: true, reason: 'core_app_access' });
        }
        return createErrorResponse('core_app_access_disabled', 403);
      }
    }

    // Step 3: Feature-Specific Routes (require specific features)
    const featureSpecificPolicies: Array<{ match: (p: string) => boolean; feature: string; label: string }> = [
      { match: (p) => ['/analytics', '/analytics/'].some(x => p.startsWith(x)), feature: 'analytics_access', label: 'Analytics' },
      { match: (p) => ['/conversion-analysis', '/conversion', '/cvr'].some(x => p.startsWith(x)), feature: 'analytics_access', label: 'Conversion Analysis' },
      { match: (p) => ['/admin', '/admin/'].some(x => p.startsWith(x) && !p.startsWith('/admin/platform') && !p.startsWith('/admin/organizations')), feature: 'org_admin_access', label: 'Organization Admin' },
    ];
    
    for (const pol of featureSpecificPolicies) {
      if (pol.match(path)) {
        const hasFeature = hasFeatureAccess(authContext, pol.feature);
        console.log("[AUTHORIZE] FEATURE policy:", { path, feature: pol.feature, hasFeature, role });
        if (hasFeature) {
          return createSuccessResponse({ allow: true, reason: 'feature_enabled' });
        }
        return createErrorResponse('feature_disabled', 403);
      }
    }

    // Central policy: Demo sections
    const demoPolicies: Array<{ match: (p: string) => boolean; feature: string; label: string }> = [
      { match: (p) => ['/aso-ai-hub', '/chatgpt-visibility-audit', '/aso-unified', '/demo/aso-ai-audit'].some(x => p.startsWith(x)), feature: 'aso_audit_demo', label: 'ASO Audit' },
      { match: (p) => ['/demo/creative-review'].some(x => p.startsWith(x)), feature: 'creative_review_demo', label: 'Creative Review' },
      { match: (p) => ['/demo/keyword-insights'].some(x => p.startsWith(x)), feature: 'keyword_insights_demo', label: 'Keyword Insights' },
    ];
    
    for (const pol of demoPolicies) {
      if (pol.match(path)) {
        const hasDemoFeature = hasFeatureAccess(authContext, pol.feature);
        const allow = isDemo && hasDemoFeature;
        console.log("[AUTHORIZE] DEMO policy:", { path, feature: pol.feature, isDemo, hasDemoFeature, allow });
        if (allow) {
          return createSuccessResponse({ allow: true, reason: 'demo_feature_enabled' });
        }
        return createErrorResponse('feature_not_enabled_or_not_demo', 403);
      }
    }

    // Default allow other paths (existing app guards may still apply)
    console.log("[AUTHORIZE] Default allow", { path, method });
    return createSuccessResponse({ allow: true, reason: 'default_allow' });
  } catch (e) {
    console.error("[FUNCTION AUTHORIZE] INTERNAL ERROR:", (e as any)?.stack || e);
    return createErrorResponse('internal_error', 500, (e as any)?.message || String(e));
  }
});
