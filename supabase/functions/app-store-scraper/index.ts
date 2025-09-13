
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { DiscoveryService } from './services/discovery.service.ts';
import { MetadataExtractionService } from './services/metadata-extraction.service.ts';
import { ScreenshotAnalysisService } from './services/screenshot-analysis.service.ts';
import { CppAnalysisService } from './services/cpp-analysis.service.ts';
import { SecurityService } from './services/security.service.ts';
import { CacheManagerService } from './services/cache-manager.service.ts';
import { AnalyticsService } from './services/analytics.service.ts';
import { ReviewsService } from './services/reviews.service.ts';
import { ErrorHandler } from './utils/error-handler.ts';
import { ResponseBuilder } from './utils/response-builder.ts';

// Enhanced CORS with environment-based origins
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin');
  const allowedOrigins = (Deno.env.get('CORS_ALLOW_ORIGIN') || '*').split(',').map(o => o.trim());
  
  let allowOrigin = '*';
  if (origin && allowedOrigins.includes(origin)) {
    allowOrigin = origin;
  } else if (!allowedOrigins.includes('*')) {
    allowOrigin = allowedOrigins[0]; // Default to first allowed origin
  }
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-transmission-method, x-correlation-id',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`🔍 [${requestId}] ENHANCED REQUEST RECEIVED: {
  method: "${req.method}",
  url: "${req.url}",
  timestamp: "${new Date().toISOString()}",
  contentType: "${req.headers.get('content-type')}",
  contentLength: "${req.headers.get('content-length')}",
  transmissionMethod: "unknown",
  debugMode: false,
  payloadSize: "unknown",
  hasPayloadHeader: false
}`);

  try {
    // Initialize services with proper Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const discoveryService = new DiscoveryService();
    const metadataService = new MetadataExtractionService(supabase);
    const screenshotService = new ScreenshotAnalysisService();
    const cppService = new CppAnalysisService();
    const securityService = new SecurityService(supabase); // ✅ Pass Supabase client
    const cacheService = new CacheManagerService(supabase);
    const analyticsService = new AnalyticsService(supabase);
    const reviewsService = new ReviewsService(supabase);
    const errorHandler = new ErrorHandler();
    const responseBuilder = new ResponseBuilder(corsHeaders); // ✅ Pass CORS headers

    // Parse request data from multiple sources
    console.log(`📡 [${requestId}] PARSING REQUEST: {
  method: "${req.method}",
  contentType: "${req.headers.get('content-type')}",
  hasBody: ${req.method === 'POST'}
}`);
    
    let requestData: any = {};
    
    if (req.method === 'GET') {
      // Parse URL parameters
      const url = new URL(req.url);
      requestData = Object.fromEntries(url.searchParams.entries());
      console.log(`📡 [${requestId}] GET PARAMETERS PARSED: ${JSON.stringify(requestData)}`);
      
    } else if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') || '';
      
      try {
        if (contentType.includes('application/json')) {
          // Handle JSON body
          console.log(`📝 [${requestId}] Processing JSON body`);
          const rawBody = await req.text();
          
          if (!rawBody || rawBody.trim() === '') {
            console.log(`⚠️ [${requestId}] Empty JSON body received`);
            requestData = {};
          } else {
            requestData = JSON.parse(rawBody);
            console.log(`✅ [${requestId}] JSON parsed successfully`);
          }
          
        } else if (contentType.includes('multipart/form-data')) {
          // Handle form data
          console.log(`📝 [${requestId}] Processing multipart form data`);
          const formData = await req.formData();
          
          for (const [key, value] of formData.entries()) {
            requestData[key] = value.toString();
          }
          console.log(`✅ [${requestId}] Form data parsed successfully`);
          
        } else {
          // Fallback: try to parse as JSON
          console.log(`📝 [${requestId}] Unknown content type, attempting JSON parse`);
          const rawBody = await req.text();
          
          if (rawBody && rawBody.trim() !== '') {
            requestData = JSON.parse(rawBody);
          }
        }
        
        console.log(`✅ [${requestId}] REQUEST DATA PARSED: {
  hasSearchTerm: ${!!requestData.searchTerm},
  searchType: "${requestData.searchType}",
  organizationId: "${requestData.organizationId?.substring(0, 8)}...",
  parsedKeys: ${JSON.stringify(Object.keys(requestData))}
}`);
        
      } catch (error) {
        console.error(`❌ [${requestId}] Request parsing failed:`, error);
        return responseBuilder.error('Invalid request format', 400);
      }
    }
    
    // Early operation detection for public operations
    const operation = requestData.op || (requestData.searchTerm && !requestData.targetApp ? 'search' : null);
    console.log(`🎯 [${requestId}] OPERATION DETECTED: "${operation}"`);

    // Handle public search operation (no auth required)
    if (operation === 'search' || (requestData.searchTerm && !requestData.targetApp && !requestData.organizationId)) {
      console.log(`🔍 [${requestId}] ROUTING TO: Public App Search Handler`);
      
      if (!requestData.searchTerm) {
        console.error(`❌ [${requestId}] Missing searchTerm for search operation`);
        return responseBuilder.error('Missing required field: searchTerm', 400);
      }

      const searchType = requestData.searchType || 'keyword';
      const country = requestData.country || 'us';
      const limit = Math.min(parseInt(requestData.limit) || 15, 50);

      console.log(`🔍 [${requestId}] PUBLIC SEARCH PARAMS: { searchTerm: "${requestData.searchTerm}", country: "${country}", limit: ${limit}, searchType: "${searchType}" }`);

      try {
        // Build iTunes API URL
        let itunesUrl: string;
        if (searchType === 'url') {
          const appIdMatch = requestData.searchTerm.match(/id(\d+)/);
          if (appIdMatch) {
            itunesUrl = `https://itunes.apple.com/lookup?id=${appIdMatch[1]}&country=${country}`;
          } else {
            itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(requestData.searchTerm)}&country=${country}&media=software&limit=${limit}`;
          }
        } else {
          itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(requestData.searchTerm)}&country=${country}&media=software&limit=${limit}`;
        }

        console.log(`🚀 [${requestId}] CALLING ITUNES API: ${itunesUrl}`);
        const searchResponse = await fetch(itunesUrl);

        if (!searchResponse.ok) {
          throw new Error(`iTunes API error: ${searchResponse.status} ${searchResponse.statusText}`);
        }

        const searchData = await searchResponse.json();
        console.log(`📊 [${requestId}] ITUNES API RESPONSE: Found ${searchData.results?.length || 0} results`);

        // Transform results using metadata service
        const transformedResults = metadataService.transformSearchResults(searchData.results || []);
        
        console.log(`✅ [${requestId}] PUBLIC SEARCH SUCCESS: Transformed ${transformedResults.length} results`);
        return responseBuilder.success({ results: transformedResults });

      } catch (error: any) {
        console.error(`❌ [${requestId}] PUBLIC SEARCH ERROR:`, error);
        return responseBuilder.error(`Search failed: ${error.message}`, 500);
      }
    }

    // Handle iTunes reviews operation (POST and GET) - PUBLIC ACCESS
    if (operation === 'reviews' || requestData.op === 'reviews') {
      console.log(`📱 [${requestId}] ROUTING TO: iTunes Reviews Handler (PUBLIC)`);
      
      const cc = requestData.cc || 'us';
      const appId = requestData.appId;
      const page = Math.max(parseInt(requestData.page) || 1, 1);
      const pageSize = Math.min(Math.max(parseInt(requestData.pageSize) || 20, 1), 50);
      
      // Validate required parameters for reviews
      if (!appId) {
        console.error(`❌ [${requestId}] Missing required field: appId`);
        return responseBuilder.error('Missing required field: appId', 400);
      }
      
      // Validate cc format (ISO-3166 2-letter)
      if (!/^[a-z]{2}$/.test(cc)) {
        console.error(`❌ [${requestId}] Invalid country code: ${cc}`);
        return responseBuilder.error('Invalid country code', 400);
      }
      
      console.log(`📱 [${requestId}] REVIEWS PARAMS: { appId: "${appId}", cc: "${cc}", page: ${page}, pageSize: ${pageSize} }`);
      
      try {
        const startTime = Date.now();
        
        // Fetch reviews with enhanced parameters
        const reviewsResult = await reviewsService.fetchReviews({ 
          cc, 
          appId, 
          page,
          pageSize 
        });
        
        if (!reviewsResult.success) {
          console.log(`📊 [${requestId}] REVIEWS_FETCH_FAILED: ${reviewsResult.error}`);
          return responseBuilder.error(reviewsResult.error || 'Failed to fetch reviews', 502);
        }
        
        const processingTime = Date.now() - startTime;
        
        console.log(`📊 [${requestId}] REVIEWS_FETCH_SUCCEEDED: {
  appId: "${appId}",
  reviewsCount: ${reviewsResult.data?.length || 0},
  page: ${page},
  hasMore: ${reviewsResult.hasMore}
}`);
        
        // Transform to expected response format
        const responseData = {
          app_id: appId,
          country: cc,
          page: reviewsResult.currentPage,
          page_size: pageSize,
          has_next_page: reviewsResult.hasMore,
          total_estimate: null,
          reviews: reviewsResult.data || []
        };
        
        const response = {
          data: responseData,
          meta: {
            request_id: requestId,
            duration_ms: processingTime,
            upstream: { status: 200, content_type: 'application/json' }
          }
        };
        
        return responseBuilder.success(response);
        
      } catch (error: any) {
        console.error(`❌ [${requestId}] Reviews request failed:`, error);
        
        if (error.message?.includes('timeout')) {
          return responseBuilder.error('Upstream timeout', 504);
        }
        
        return responseBuilder.error('Internal error', 500, undefined, requestId);
      }
    }

    // All remaining operations require authentication and organization validation
    console.log(`🔒 [${requestId}] PROCEEDING TO PROTECTED OPERATIONS - Validation required`);
    
    // Validate required fields for protected operations
    if (!requestData.searchTerm || !requestData.organizationId) {
      console.error(`❌ [${requestId}] Missing required fields for protected operation: searchTerm=${!!requestData.searchTerm}, organizationId=${!!requestData.organizationId}`);
      return responseBuilder.error('Missing required fields: searchTerm, organizationId', 400);
    }

    // Enhanced search type detection and validation
    const searchType = requestData.searchType || 'keyword';
    const supportedSearchTypes = ['brand', 'url', 'keyword'];
    
    if (!supportedSearchTypes.includes(searchType)) {
      console.error(`❌ [${requestId}] Unsupported search type: ${searchType}`);
      return responseBuilder.error(`Unsupported search type: ${searchType}. Supported types: ${supportedSearchTypes.join(', ')}`, 400);
    }

    console.log(`🔀 [${requestId}] ROUTING DECISION: {
  searchTerm: "${requestData.searchTerm}",
  searchType: "${searchType}",
  organizationId: "${requestData.organizationId?.substring(0, 8)}...",
  hasKeywordDiscoveryFields: ${!!(requestData.targetApp || requestData.competitorApps || requestData.seedKeywords)},
  isAppSearch: ${!!requestData.searchTerm && !requestData.targetApp},
  isKeywordDiscovery: ${!!(requestData.targetApp || requestData.competitorApps || requestData.seedKeywords)}
}`);

    // Route to appropriate protected service  
    if (requestData.searchTerm && !requestData.targetApp) {
      // Protected App Search Route (requires auth)
      console.log(`📱 [${requestId}] ROUTING TO: Protected App Search (searchType: ${searchType})`);
      
      const startTime = Date.now();
      
      // Security validation
      const securityResult = await securityService.validateRequest({
        searchTerm: requestData.searchTerm,
        organizationId: requestData.organizationId,
        securityContext: requestData.securityContext,
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown'
      });

      if (!securityResult.success) {
        console.error(`❌ [${requestId}] Security validation failed:`, securityResult.error);
        return responseBuilder.error(securityResult.error || 'Security validation failed', 400);
      }

      console.log(`✅ [${requestId}] Security validation passed`);

      // Check cache
      const cacheKey = `search:${requestData.searchTerm}:${requestData.country || 'us'}:${searchType}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        console.log(`📦 [${requestId}] CACHE HIT for search`);
        return responseBuilder.success(cached);
      }

      // Process search based on type
      let itunesUrl: string;
      let term: string;

      if (searchType === 'url') {
        // Extract app ID from URL for direct lookup
        const appIdMatch = requestData.searchTerm.match(/id(\d+)/);
        if (appIdMatch) {
          term = appIdMatch[1];
          itunesUrl = `https://itunes.apple.com/lookup?id=${term}&country=${requestData.country || 'us'}`;
          console.log(`🔗 [${requestId}] URL-based lookup: appId=${term}`);
        } else {
          // Fallback to search if URL doesn't contain app ID
          term = requestData.searchTerm;
          itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${requestData.country || 'us'}&media=software&limit=${requestData.limit || 15}`;
          console.log(`🔍 [${requestId}] URL fallback to search: term=${term}`);
        }
      } else {
        // Standard search for brand/keyword
        term = requestData.searchTerm;
        itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${requestData.country || 'us'}&media=software&limit=${requestData.limit || 15}`;
        console.log(`🔍 [${requestId}] Standard search: term=${term}, type=${searchType}`);
      }

      console.log(`🚀 [${requestId}] CALLING ITUNES API: {
  url: "${itunesUrl}",
  searchType: "${searchType}",
  term: "${term}"
}`);

      const searchResponse = await fetch(itunesUrl);

      if (!searchResponse.ok) {
        throw new Error(`iTunes API error: ${searchResponse.status} ${searchResponse.statusText}`);
      }

      const searchData = await searchResponse.json();
      
      console.log(`📊 [${requestId}] ITUNES API RESPONSE: {
  resultCount: ${searchData.resultCount || 0},
  resultsLength: ${searchData.results?.length || 0}
}`);

      // Transform results
      const transformedResults = metadataService.transformSearchResults(searchData.results || []);
      
      console.log(`✅ [${requestId}] TRANSFORMED ${transformedResults.length} RESULTS`);

      // Process response based on results
      let responseData: any;
      let isAmbiguous = false;
      let ambiguityReason: string | undefined;

      if (transformedResults.length === 0) {
        responseData = {
          results: [],
          isAmbiguous: false,
          message: `No apps found for "${requestData.searchTerm}" (${searchType} search)`
        };
      } else if (transformedResults.length === 1) {
        console.log(`✅ [${requestId}] SINGLE RESULT FOUND: ${transformedResults[0].name}`);
        
        const selectedApp = transformedResults[0];
        
        // Enhanced analysis for single result
        let screenshotAnalysis: any[] = [];
        let cppAnalysis: any = null;
        
        if (requestData.includeScreenshotAnalysis !== false && selectedApp.screenshotUrls?.length > 0) {
          try {
            const analysisResult = await screenshotService.analyze({
              targetApp: selectedApp,
              competitors: [],
              analysisType: 'basic'
            });
            
            if (analysisResult.success) {
              screenshotAnalysis = analysisResult.data?.competitorAnalysis || [];
            }
          } catch (error) {
            console.warn(`⚠️ [${requestId}] Screenshot analysis failed:`, error);
          }
        }

        if (requestData.analyzeCpp && requestData.generateThemes !== false) {
          try {
            console.log(`🎨 [${requestId}] GENERATING CPP THEMES`);
            cppAnalysis = await cppService.generateCppThemes(selectedApp, screenshotAnalysis);
          } catch (error) {
            console.warn(`⚠️ [${requestId}] CPP analysis failed:`, error);
          }
        }

        responseData = {
          ...selectedApp,
          screenshotAnalysis,
          suggestedCppThemes: cppAnalysis?.suggestedThemes || [],
          competitorScreenshots: screenshotAnalysis,
          searchContext: {
            query: requestData.searchTerm,
            type: searchType,
            totalResults: 1,
            category: selectedApp.applicationCategory || 'Unknown',
            country: requestData.country || 'us'
          }
        };
      } else {
        // Multiple results - determine ambiguity
        const uniqueDevelopers = new Set(transformedResults.map(r => r.developer)).size;
        const uniqueCategories = new Set(transformedResults.map(r => r.applicationCategory)).size;
        
        if (searchType === 'brand' && (uniqueDevelopers > 1 || uniqueCategories > 1)) {
          isAmbiguous = true;
          ambiguityReason = `Multiple apps from different sources found for brand "${requestData.searchTerm}"`;
          console.log(`🎯 [${requestId}] BRAND SEARCH AMBIGUOUS - ${uniqueDevelopers} developers, ${uniqueCategories} categories`);
        }

        responseData = {
          results: transformedResults,
          isAmbiguous,
          ambiguityReason,
          searchContext: {
            query: requestData.searchTerm,
            type: searchType,
            totalResults: transformedResults.length,
            category: 'Multiple',
            country: requestData.country || 'us'
          }
        };
      }

      const processingTime = Date.now() - startTime;
      
      console.log(`✅ [${requestId}] APP SEARCH COMPLETED: {
  searchType: "${searchType}",
  resultsCount: ${Array.isArray(responseData.results) ? responseData.results.length : 1},
  isAmbiguous: ${isAmbiguous},
  processingTime: "${processingTime}ms"
}`);

      // Cache successful results
      await cacheService.set(cacheKey, responseData, 3600);

      // Track analytics
      await analyticsService.trackSearch({
        organizationId: requestData.organizationId,
        searchTerm: requestData.searchTerm,
        searchType,
        resultsCount: Array.isArray(responseData.results) ? responseData.results.length : 1,
        processingTime,
        cached: false
      });

      return responseBuilder.success(responseData);
      
    } else if (requestData.targetApp || requestData.competitorApps || requestData.seedKeywords) {
      // Keyword Discovery Route
      console.log(`🔍 [${requestId}] ROUTING TO: Keyword Discovery`);
      
      const discoveryResult = await discoveryService.discoverKeywords({
        targetApp: requestData.targetApp,
        competitorApps: requestData.competitorApps || [],
        seedKeywords: requestData.seedKeywords || [],
        organizationId: requestData.organizationId,
        maxKeywords: requestData.maxKeywords || 50
      });

      if (!discoveryResult.success) {
        return responseBuilder.error(discoveryResult.error, 500);
      }

      return responseBuilder.success(discoveryResult.data);
      
    } else {
      return responseBuilder.error('Invalid request: missing required parameters (searchTerm or keyword discovery fields)', 400);
    }

  } catch (error) {
    console.error(`❌ [${requestId}] REQUEST PROCESSING ERROR:`, error);
    // ✅ Use static method for error handling
    return ErrorHandler.handleError(error, corsHeaders, requestId);
  }
});
