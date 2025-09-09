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
  const path = url.pathname; // .../functions/v1/admin-organizations[/...]

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

  // Helpers
  const isOrgAdmin = async (orgId: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid).eq("organization_id", orgId);
    return (data || []).some((r: any) => ["ORG_ADMIN", "SUPER_ADMIN"].includes(r.role));
  };

  // GET list
  if (req.method === "GET") {
    const q = url.searchParams.get("q") || "";
    const orgFilter = url.searchParams.get("org_id") || req.headers.get("X-Org-Id");
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50)));
    let query = supabase.from("organizations").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(limit);
    if (q) query = query.ilike("name", `%${q}%`);
    
    if (!isSA) {
      // restrict to caller orgs
      const { data: orgs } = await supabase.from("user_roles").select("organization_id").eq("user_id", uid);
      const ids = (orgs || []).map((r: any) => r.organization_id);
      if (ids.length === 0) return json({ success: true, data: [] });
      query = query.in("id", ids);
    } else if (orgFilter) {
      // Super admin filtering by specific org
      query = query.eq("id", orgFilter);
    }
    const { data, error } = await query;
    if (error) return json({ error: error.message }, 500);
    return json({ success: true, data });
  }

  // POST create or legacy actions
  if (req.method === "POST" && path.endsWith("admin-organizations")) {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    if (!action) {
      if (!isSA) return json({ error: "forbidden" }, 403);
      const { name, slug, domain, tier, subscription_tier } = body || {};
      if (!name || !slug) return json({ error: "invalid_request", details: "name and slug required" }, 400);
      const { data: exists } = await supabase.from("organizations").select("id").eq("slug", slug).is("deleted_at", null).maybeSingle();
      if (exists) return json({ error: "conflict", details: "slug already exists" }, 409);
      const { data, error } = await supabase.from("organizations").insert({ name, slug, domain, subscription_tier: tier || subscription_tier || null }).select("*").single();
      if (error) return json({ error: error.message }, 500);
      
      // Audit log the creation
      await auditLog(supabase, {
        actor_id: uid,
        actor_role: actorRole,
        organization_id: data.id,
        action: 'ORGANIZATION_CREATED',
        resource_type: 'organization',
        resource_id: data.id,
        new_values: data,
        details: { created_by_super_admin: isSA }
      });
      
      return json({ success: true, data }, 201);
    }
    if (action === 'update') {
      const id = body?.id as string;
      if (!id) return json({ error: 'invalid_request' }, 400);
      const admin = isSA || (await isOrgAdmin(id));
      if (!admin) return json({ error: 'forbidden' }, 403);
      
      // Get old values for audit
      const { data: oldData } = await supabase.from('organizations').select('*').eq('id', id).single();
      
      const updates = body?.payload || {};
      const allowed = (({ name, domain, tier, subscription_tier, settings }) => ({ name, domain, subscription_tier: tier || subscription_tier, settings }))(updates);
      const { data, error } = await supabase.from('organizations').update(allowed).eq('id', id).select('*').single();
      if (error) return json({ error: error.message }, 500);
      
      // Audit log the update
      await auditLog(supabase, {
        actor_id: uid,
        actor_role: actorRole,
        organization_id: id,
        action: 'ORGANIZATION_UPDATED',
        resource_type: 'organization',
        resource_id: id,
        old_values: oldData,
        new_values: data,
        details: { updated_by_super_admin: isSA }
      });
      
      return json({ success: true, data });
    }
    if (action === 'delete') {
      if (!isSA) return json({ error: 'forbidden' }, 403);
      const id = body?.id as string;
      if (!id) return json({ error: 'invalid_request' }, 400);
      
      // Get old values for audit
      const { data: oldData } = await supabase.from('organizations').select('*').eq('id', id).single();
      
      // Soft delete by setting deleted_at timestamp
      const { data, error } = await supabase.from('organizations').update({ deleted_at: new Date().toISOString() }).eq('id', id).select('*').single();
      if (error) return json({ error: error.message }, 500);
      
      // Audit log the deletion
      await auditLog(supabase, {
        actor_id: uid,
        actor_role: actorRole,
        organization_id: id,
        action: 'ORGANIZATION_DELETED',
        resource_type: 'organization',
        resource_id: id,
        old_values: oldData,
        new_values: data,
        details: { soft_delete: true, deleted_by_super_admin: true }
      });
      
      return json({ success: true, data });
    }
    if (action === 'list') {
      // compatibility listing
      const limit = 50;
        let query = supabase.from('organizations').select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(limit);
      if (!isSA) {
        const { data: orgs } = await supabase.from('user_roles').select('organization_id').eq('user_id', uid);
        const ids = (orgs || []).map((r: any) => r.organization_id);
        if (ids.length === 0) return json({ success: true, data: [] });
        query = query.in('id', ids);
      }
      const { data, error } = await query;
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, data });
    }
    return json({ error: 'not_found' }, 404);
  }

  // PUT /:id (SUPER_ADMIN or ORG_ADMIN on org)
  if (req.method === "PUT") {
    const seg = path.split("/").filter(Boolean);
    const id = seg[seg.length - 1];
    if (!id) return json({ error: "invalid_request" }, 400);
    const admin = isSA || (await isOrgAdmin(id));
    if (!admin) return json({ error: "forbidden" }, 403);
    
    // Get old values for audit
    const { data: oldData } = await supabase.from("organizations").select("*").eq("id", id).single();
    
    const body = await req.json().catch(() => ({}));
    const allowed = (({ name, domain, tier, subscription_tier, settings }) => ({ name, domain, subscription_tier: tier || subscription_tier, settings }))(body || {});
    const { data, error } = await supabase.from("organizations").update(allowed).eq("id", id).select("*").single();
    if (error) return json({ error: error.message }, 500);
    
    // Audit log the update
    await auditLog(supabase, {
      actor_id: uid,
      actor_role: actorRole,
      organization_id: id,
      action: 'ORGANIZATION_UPDATED',
      resource_type: 'organization',
      resource_id: id,
      old_values: oldData,
      new_values: data,
      details: { method: 'PUT', updated_by_super_admin: isSA }
    });
    
    return json({ success: true, data });
  }

  // DELETE /:id (soft delete, SUPER_ADMIN)
  if (req.method === "DELETE") {
    if (!isSA) return json({ error: "forbidden" }, 403);
    const seg = path.split("/").filter(Boolean);
    const id = seg[seg.length - 1];
    if (!id) return json({ error: "invalid_request" }, 400);
    
    // Get old values for audit
    const { data: oldData } = await supabase.from("organizations").select("*").eq("id", id).single();
    
    // Soft delete by setting deleted_at timestamp
    const { data, error } = await supabase.from("organizations").update({ deleted_at: new Date().toISOString() }).eq("id", id).select("*").single();
    if (error) return json({ error: error.message }, 500);
    
    // Audit log the deletion
    await auditLog(supabase, {
      actor_id: uid,
      actor_role: actorRole,
      organization_id: id,
      action: 'ORGANIZATION_DELETED',
      resource_type: 'organization',
      resource_id: id,
      old_values: oldData,
      new_values: data,
      details: { method: 'DELETE', soft_delete: true, deleted_by_super_admin: true }
    });
    
    return json({ success: true, data });
  }

  return json({ error: "not_found" }, 404);
});
