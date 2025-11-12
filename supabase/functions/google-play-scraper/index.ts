import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GooglePlayReviewsService } from './services/reviews.service.ts';
import { GooglePlayAppsService } from './services/apps.service.ts';

// CORS headers
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin');
  const allowedOrigins = (Deno.env.get('CORS_ALLOW_ORIGIN') || '*').split(',').map(o => o.trim());

  let allowOrigin = '*';
  if (origin && allowedOrigins.includes(origin)) {
    allowOrigin = origin;
  } else if (!allowedOrigins.includes('*')) {
    allowOrigin = allowedOrigins[0];
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`🤖 [${requestId}] Google Play Scraper Request Received`);

  try {
    // Parse request
    const requestData = req.method === 'POST'
      ? await req.json()
      : Object.fromEntries(new URL(req.url).searchParams.entries());

    const operation = requestData.op || 'reviews';

    // Initialize services
    const reviewsService = new GooglePlayReviewsService();
    const appsService = new GooglePlayAppsService();

    // Route operations
    switch (operation) {
      case 'reviews': {
        // Fetch reviews
        const packageId = requestData.packageId || requestData.appId;
        const country = requestData.country || requestData.cc || 'us';
        const lang = requestData.lang || 'en';
        const pageSize = Math.min(parseInt(requestData.pageSize) || 100, 200);
        const sort = requestData.sort || 'newest';
        const maxReviews = requestData.maxReviews ? Math.min(parseInt(requestData.maxReviews), 1000) : undefined;

        if (!packageId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing required field: packageId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        let result;
        if (maxReviews) {
          result = await reviewsService.fetchReviewsWithLimit(packageId, country, lang, maxReviews);
        } else {
          result = await reviewsService.fetchReviews({
            packageId,
            country,
            lang,
            page: 1,
            pageSize,
            sort,
            paginationToken: requestData.paginationToken
          });
        }

        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'search': {
        // Search for apps
        const query = requestData.query || requestData.searchTerm;
        const country = requestData.country || 'us';
        const limit = Math.min(parseInt(requestData.limit) || 10, 50);

        if (!query) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing required field: query' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const results = await appsService.search(query, country, limit);

        return new Response(
          JSON.stringify({ success: true, results }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'app': {
        // Get app details
        const packageId = requestData.packageId || requestData.appId;
        const country = requestData.country || 'us';

        if (!packageId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing required field: packageId' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const app = await appsService.getAppDetails(packageId, country);

        return new Response(
          JSON.stringify({ success: true, app }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'health': {
        // Health check
        return new Response(
          JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            service: 'google-play-scraper'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default: {
        return new Response(
          JSON.stringify({ success: false, error: `Unknown operation: ${operation}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

  } catch (error: any) {
    console.error(`❌ [${requestId}] Error:`, error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
