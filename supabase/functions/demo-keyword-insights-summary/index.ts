import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: cors });
    if (req.method !== 'GET') return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: cors });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } }
    );

    const { data: user, error: ue } = await supabase.auth.getUser();
    if (ue || !user?.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: cors });
    const uid = user.user.id;

    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', uid).single();
    const org_id = profile?.organization_id || null;
    if (!org_id) return new Response(JSON.stringify({ error: 'no_organization' }), { status: 403, headers: cors });

    const now = new Date().toISOString();
    const body = {
      meta: { org_id, generated_at: now, source: 'demo_cache_v1' },
      summary: { coverage_score: 72, priority_terms: 5 },
      findings: [{ id: 'KW-01', term: 'read along', gap: 'low rank' }],
      recommendations: [{ id: 'REC-KW-01', steps: ['Subtitle tweak', 'CPT test'] }],
    };
    return new Response(JSON.stringify(body), { status: 200, headers: cors });
  } catch (e) {
    console.error('[DEMO keyword-insights] INTERNAL ERROR:', (e as any)?.stack || e);
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500, headers: cors });
  }
});

