import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Content-Type": "application/json",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const orgId = url.searchParams.get("org_id") || (await req.json().catch(() => ({ org_id: undefined }))).org_id;
  if (!orgId) return json({ error: "org_id required" }, 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  });

  const { data: user, error: ue } = await supabase.auth.getUser();
  if (ue || !user?.user) return json({ error: "unauthorized" }, 401);
  const uid = user.user.id;

  // membership or super-admin
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .eq("organization_id", orgId);
  const isMember = (roles || []).length > 0;
  const { data: sa } = await supabase.rpc("is_super_admin");
  if (!isMember && !sa) return json({ error: "forbidden" }, 403);

  // role baseline via RPC (existing contract)
  const { data: baseRows } = await supabase.rpc("get_user_ui_permissions", { p_user_id: uid });
  const roleBaseline: Record<string, boolean> = {};
  (baseRows || []).forEach((r: any) => (roleBaseline[r.permission_key || r.permission || r["permission_key"]] = true));

  if (req.method === "GET") {
    // org defaults from org_navigation_permissions (route used as key)
    const { data: orgRows } = await supabase
      .from("org_navigation_permissions")
      .select("route, allowed")
      .eq("organization_id", orgId);
    const orgDefaults: Record<string, boolean> = {};
    (orgRows || []).forEach((r: any) => (orgDefaults[r.route] = !!r.allowed));
    const resolved = { ...roleBaseline, ...orgDefaults };
    return json({ org_id: orgId, user_id: uid, roleBaseline, orgDefaults, resolved });
  }

  if (req.method === "PUT") {
    // verify admin
    const isAdmin = sa || (roles || []).some((r: any) => ["ORG_ADMIN", "SUPER_ADMIN"].includes(r.role));
    if (!isAdmin) return json({ error: "forbidden" }, 403);
    const body = await req.json().catch(() => ({}));
    const updates = body.updates || {};
    const rows = Object.entries(updates).map(([k, v]) => ({ organization_id: orgId, route: k, allowed: !!v, updated_by: uid }));
    if (rows.length) {
      const { error } = await supabase.from("org_navigation_permissions").upsert(rows);
      if (error) return json({ error: error.message }, 400);
    }
    const { data: orgRows } = await supabase
      .from("org_navigation_permissions")
      .select("route, allowed")
      .eq("organization_id", orgId);
    const orgDefaults: Record<string, boolean> = {};
    (orgRows || []).forEach((r: any) => (orgDefaults[r.route] = !!r.allowed));
    const resolved = { ...roleBaseline, ...orgDefaults };
    return json({ org_id: orgId, user_id: uid, orgDefaults, resolved });
  }

  return json({ error: "not_found" }, 404);
});

