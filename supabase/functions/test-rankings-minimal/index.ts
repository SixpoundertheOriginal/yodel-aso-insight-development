import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

console.log('🔵 [MODULE-TEST] test-rankings-minimal module loading...');
console.log('🔵 [MODULE-TEST] About to call serve()...');

serve(async (req) => {
  console.log('✅ MINIMAL TEST FUNCTION INVOKED');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('Method:', req.method);

  try {
    const body = await req.json();
    console.log('Body:', body);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test function works!',
        received: body,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error:', err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
