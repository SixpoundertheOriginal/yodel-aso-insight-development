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

    // Get user roles using the user_roles system
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role, organization_id')
      .eq('user_id', user.user.id)

    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { 
      user_uuid: user.user.id 
    })

    const whoamiData = {
      user_id: user.user.id,
      email: user.user.email,
      roles: userRoles || [],
      is_super_admin: isSuperAdmin,
      organization_access: isSuperAdmin ? 'all' : 'limited',
      authenticated_at: new Date().toISOString()
    }

    return new Response(JSON.stringify(whoamiData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})