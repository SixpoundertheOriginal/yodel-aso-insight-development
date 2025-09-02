import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ASO Platform Admin API',
    version: '1.0.0'
  }

  return new Response(JSON.stringify(healthData), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})