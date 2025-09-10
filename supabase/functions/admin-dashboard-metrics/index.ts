import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Mock dashboard metrics for now
    const metrics = {
      success: true,
      data: {
        totalUsers: 42,
        totalOrganizations: 8,
        activeApps: 156,
        apiCalls: 2847,
        systemHealth: 'healthy'
      }
    }

    return new Response(JSON.stringify(metrics), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    })
  } catch (error) {
    console.error('Dashboard metrics error:', error)
    
    const errorResponse = {
      success: false,
      error: 'Failed to fetch dashboard metrics',
      timestamp: new Date().toISOString()
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    })
  }
})