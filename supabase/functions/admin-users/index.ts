import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Content-Type": "application/json",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });

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
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  });
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) return json({ error: "unauthorized" }, 401);
  const { data: isSA } = await supabase.rpc("is_super_admin");
  
  // Get user's primary role for audit logging
  const { data: userRoles } = await supabase.from("user_roles").select("role, organization_id").eq("user_id", uid).limit(1);
  const actorRole = isSA ? "SUPER_ADMIN" : (userRoles?.[0]?.role || "UNKNOWN");

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
      id,email,first_name,last_name,organization_id,created_at,email_confirmed_at,last_sign_in_at,
      user_roles(role, organization_id),
      organizations:organization_id(id,name,slug)
    `).order("created_at", { ascending: false });
    if (!isSA) q = q.in("organization_id", orgIds);
    const { data: rawData, error } = await q;
    if (error) return json({ error: error.message }, 500);
    
    // Transform data to match UI expectations
    const transformedData = (rawData || []).map((user: any) => ({
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
      role: user.user_roles?.[0]?.role || null, // Primary role for backward compatibility
      status: user.email_confirmed_at ? 'active' : 'pending',
      email_confirmed: !!user.email_confirmed_at,
      last_sign_in: user.last_sign_in_at,
      created_at: user.created_at
    }));
    
    return json({ success: true, data: transformedData });
  }

  // Back-compat body.action flow (invoke)
  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
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
        id,email,first_name,last_name,organization_id,created_at,email_confirmed_at,last_sign_in_at,
        user_roles(role, organization_id),
        organizations:organization_id(id,name,slug)
      `).order("created_at", { ascending: false });
      if (!isSA) q = q.in("organization_id", orgIds);
      const { data: rawData, error } = await q;
      if (error) return json({ error: error.message }, 500);
      
      // Transform data to match UI expectations
      const transformedData = (rawData || []).map((user: any) => ({
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
        status: user.email_confirmed_at ? 'active' : 'pending',
        email_confirmed: !!user.email_confirmed_at,
        last_sign_in: user.last_sign_in_at,
        created_at: user.created_at
      }));
      
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
    
    // Stub implementations for create/update/delete actions
    if (action === 'create') {
      return json({ error: 'not_implemented', details: 'User creation not yet implemented' }, 501);
    }
    
    if (action === 'update') {
      return json({ error: 'not_implemented', details: 'User update not yet implemented' }, 501);
    }
    
    if (action === 'delete') {
      return json({ error: 'not_implemented', details: 'User deletion not yet implemented' }, 501);
    }
    
    if (action === 'resetPassword') {
      return json({ error: 'not_implemented', details: 'Password reset not yet implemented' }, 501);
    }
    
    return json({ error: 'not_found' }, 404);
  }

  return json({ error: 'not_found' }, 404);
});
