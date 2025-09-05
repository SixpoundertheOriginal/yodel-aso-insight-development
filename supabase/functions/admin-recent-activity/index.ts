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
      user_id: user.user.id 
    })
    if (!isSuperAdmin) throw new Error('Super admin access required')

    // Get recent organizations
    const { data: recentOrgs } = await supabase
      .from('organizations')
      .select('name, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    // Get recent users
    const { data: recentUsers } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    // Format as activity feed
    const activities = []
    
    recentOrgs?.forEach(org => {
      activities.push({
        id: `org-${org.name}-${Date.now()}`,
        type: 'organization_created',
        title: 'New Organization Created',
        description: `Organization "${org.name}" was created`,
        timestamp: org.created_at,
        icon: 'building'
      })
    })

    recentUsers?.forEach(user => {
      activities.push({
        id: `user-${user.email}-${Date.now()}`,
        type: 'user_registered',
        title: 'New User Registered',
        description: `${user.first_name || ''} ${user.last_name || ''} (${user.email}) joined`,
        timestamp: user.created_at,
        icon: 'user'
      })
    })

    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return new Response(JSON.stringify({
      success: true,
      data: activities.slice(0, 10) // Latest 10 activities
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