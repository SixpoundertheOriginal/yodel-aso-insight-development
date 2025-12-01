import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  console.log('🧪 Testing iTunes API from edge function...');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const testUrl = 'https://itunes.apple.com/search?term=wellness&country=us&entity=software&limit=10';
    console.log('📡 Calling iTunes API:', testUrl);

    const response = await fetch(testUrl, {
      headers: {
        'User-Agent': 'Yodel-ASO-Platform/1.0',
      },
    });

    console.log('📊 iTunes API response status:', response.status);

    const data = await response.json();
    console.log('✅ iTunes API returned data:', {
      resultCount: data.resultCount,
      resultsLength: data.results?.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        itunesWorks: true,
        status: response.status,
        resultCount: data.resultCount,
        resultsLength: data.results?.length,
        firstResult: data.results?.[0]?.trackName,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('❌ iTunes API test failed:', err.message);
    console.error('Stack:', err.stack);

    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
        stack: err.stack,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
