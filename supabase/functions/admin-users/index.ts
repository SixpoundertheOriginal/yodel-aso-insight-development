import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Content-Type": "application/json",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });

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

  // GET list users (scoped)
  if (req.method === "GET") {
    const orgParam = url.searchParams.get("org_id");
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
    const { data, error } = await q;
    if (error) return json({ error: error.message }, 500);
    return json({ success: true, data });
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
        id,email,first_name,last_name,organization_id,created_at,
        user_roles(role, organization_id),
        organizations:organization_id(id,name,slug)
      `).order("created_at", { ascending: false });
      if (!isSA) q = q.in("organization_id", orgIds);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, data });
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
      await supabase.from('audit_logs').insert({
        organization_id,
        user_id: uid,
        action: 'USER_INVITE_CREATED',
        resource_type: 'user_invite',
        resource_id: email,
        details: { email, role }
      });
      return json({ success: true, data: { invited: true } }, 201);
    }
    return json({ error: 'not_found' }, 404);
  }

  return json({ error: 'not_found' }, 404);
});
