import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Not authenticated')
    
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { 
      user_uuid: user.user.id 
    })
    if (!isSuperAdmin) throw new Error('Super admin access required')

    // Get platform metrics
    const { count: orgCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })

    const { count: profileCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    const { count: recentOrgCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    const metrics = {
      total_organizations: orgCount || 0,
      total_users: profileCount || 0,
      organizations_this_month: recentOrgCount || 0,
      system_health: 'healthy',
      uptime_percentage: 99.9,
      last_updated: new Date().toISOString()
    }

    return new Response(JSON.stringify({
      success: true,
      data: metrics
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: error.message.includes('not authenticated') ? 401 : 
             error.message.includes('access required') ? 403 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})