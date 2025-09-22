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

  // DEPRECATION NOTICE: This function is deprecated
  console.warn("🚨 DEPRECATED: admin-users-invite is deprecated. Use admin-users with action='invite' instead.");
  
  // Redirect to main admin-users function with proper payload transformation
  const body = await req.json().catch(() => ({}));
  const { email, org_id, role, first_name, last_name } = body || {};
  
  // Transform payload to new format and redirect
  const transformedPayload = {
    action: 'invite',
    email,
    organization_id: org_id, // Transform field name
    roles: role ? [role] : ['VIEWER'], // Transform to array format
    first_name,
    last_name
  };
  
  console.log("🔄 Redirecting deprecated invite call to admin-users:", transformedPayload);
  
  // Forward to main admin-users function
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
  });
  
  try {
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: transformedPayload
    });
    
    if (error) {
      return json({ error: error.message }, 400);
    }
    
    return json(data);
  } catch (error: any) {
    console.error("Redirect to admin-users failed:", error);
    return json({ error: 'redirect_failed', details: error.message }, 500);
  }
});

