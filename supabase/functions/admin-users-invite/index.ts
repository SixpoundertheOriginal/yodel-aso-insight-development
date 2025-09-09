import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: cors });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== 'POST') return json({ error: 'not_found' }, 404);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  });
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes?.user?.id;
  if (!uid) return json({ error: 'unauthorized' }, 401);
  const { data: isSA } = await supabase.rpc('is_super_admin');

  const body = await req.json().catch(() => ({}));
  const { email, org_id, role } = body || {};
  if (!email || !org_id || !role) return json({ error: 'invalid_request', details: 'email, org_id, role required' }, 400);

  // Check org admin membership
  let allowed = !!isSA;
  if (!allowed) {
    const { data: rows } = await supabase.from('user_roles').select('role').eq('user_id', uid).eq('organization_id', org_id);
    allowed = (rows||[]).some((r:any)=>['ORG_ADMIN','SUPER_ADMIN'].includes(r.role));
  }
  if (!allowed) return json({ error: 'forbidden' }, 403);

  // Check if user already exists and is a member
  const { data: prof } = await supabase.from('profiles').select('id, email').eq('email', email).maybeSingle();
  if (prof) {
    const { data: member } = await supabase.from('user_roles').select('role').eq('user_id', prof.id).eq('organization_id', org_id).maybeSingle();
    if (member) return json({ error: 'conflict', details: 'user already in organization' }, 409);
  }

  // Check for existing pending invite (idempotency)
  const { data: existingInvite } = await supabase
    .from('audit_logs')
    .select('id, created_at, details')
    .eq('organization_id', org_id)
    .eq('action', 'USER_INVITE_CREATED')
    .eq('resource_type', 'user_invite')
    .eq('resource_id', email)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Within last 7 days
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingInvite) {
    // Return existing invite (idempotent)
    return json({ 
      success: true, 
      data: { 
        invited: true, 
        invite_id: existingInvite.id,
        existing: true,
        created_at: existingInvite.created_at,
        role: existingInvite.details?.role || role
      } 
    }, 200);
  }

  // Create new invite record via audit log
  const { data: auditEntry } = await supabase.from('audit_logs').insert({
    organization_id: org_id,
    user_id: uid,
    action: 'USER_INVITE_CREATED',
    resource_type: 'user_invite',
    resource_id: email,
    details: { email, role, invited_by: uid }
  }).select('id, created_at').single();

  // Stub: sending email would be here; return invited:true
  return json({ 
    success: true, 
    data: { 
      invited: true, 
      invite_id: auditEntry?.id,
      existing: false,
      created_at: auditEntry?.created_at,
      role
    } 
  }, 201);
});

