
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { DiscoveryService } from './services/discovery.service.ts';
import { MetadataExtractionService } from './services/metadata-extraction.service.ts';
import { ScreenshotAnalysisService } from './services/screenshot-analysis.service.ts';
import { CppAnalysisService } from './services/cpp-analysis.service.ts';
import { SecurityService } from './services/security.service.ts';
import { CacheManagerService } from './services/cache-manager.service.ts';
import { AnalyticsService } from './services/analytics.service.ts';
import { ErrorHandler } from './utils/error-handler.ts';
import { ResponseBuilder } from './utils/response-builder.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
    // Initialize services
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const discoveryService = new DiscoveryService();
    const metadataService = new MetadataExtractionService();
    const screenshotService = new ScreenshotAnalysisService();
    const cppService = new CppAnalysisService();
    const securityService = new SecurityService();
    const cacheService = new CacheManagerService(supabase);
    const analyticsService = new AnalyticsService(supabase);
    const errorHandler = new ErrorHandler();
    const responseBuilder = new ResponseBuilder();

    // Parse request body
    console.log(`📡 [${requestId}] ENHANCED PARSING REQUEST (Method: unknown)`);
    
    let body: any = {};
    if (req.method === 'POST') {
      try {
        console.log(`📝 [${requestId}] Processing ENHANCED JSON body`);
        const rawBody = await req.text();
        
        console.log(`📝 [${requestId}] RAW BODY READ ATTEMPT: {
  bodyExists: ${!!rawBody},
  bodyLength: ${rawBody.length},
  bodyIsEmpty: ${rawBody.length === 0},
  firstChars: "${rawBody.substring(0, 100)}",
  lastChars: "${rawBody.substring(Math.max(0, rawBody.length - 50))}",
  contentType: "${req.headers.get('content-type')}",
  expectedSize: "unknown"
}`);

        body = JSON.parse(rawBody);
        
        console.log(`✅ [${requestId}] ENHANCED JSON PARSED SUCCESSFULLY: {
  hasSearchTerm: ${!!body.searchTerm},
  hasTargetApp: ${!!body.targetApp},
  hasCompetitorApps: ${!!body.competitorApps},
  hasSeedKeywords: ${!!body.seedKeywords},
  includeCompetitorAnalysis: ${body.includeCompetitorAnalysis},
  organizationId: "${body.organizationId?.substring(0, 8)}...",
  parsedKeys: ${JSON.stringify(Object.keys(body))}
}`);
      } catch (error) {
        console.error(`❌ [${requestId}] JSON parsing failed:`, error);
        return responseBuilder.error('Invalid JSON in request body', 400, corsHeaders);
      }
    }

    // Enhanced routing decision
    console.log(`🔀 [${requestId}] ENHANCED ROUTING DECISION: {
  transmissionMethod: "unknown",
  hasSearchTerm: ${!!body.searchTerm},
  hasOrganizationId: ${!!body.organizationId},
  hasKeywordDiscoveryFields: ${!!(body.targetApp || body.competitorApps || body.seedKeywords)},
  isAppSearch: ${!!body.searchTerm && !body.targetApp},
  isKeywordDiscovery: ${!!(body.targetApp || body.competitorApps || body.seedKeywords)},
  searchTerm: "${body.searchTerm}",
  includeCompetitorAnalysis: ${body.includeCompetitorAnalysis}
}`);

    // Route to appropriate service
    if (body.searchTerm && !body.targetApp) {
      // App Search Route
      console.log(`📱 [${requestId}] ROUTING TO: App Search (via unknown)`);
      
      const searchType = body.searchType || (body.searchTerm.includes('http') ? 'url' : 'keyword');
      
      console.log(`🚀 [${requestId}] STARTING APP STORE SEARCH WITH ENHANCED AMBIGUITY DETECTION: {
  searchTerm: "${body.searchTerm}",
  searchType: "${searchType}",
  country: "${body.country || 'us'}",
  limit: ${body.limit || 15},
  includeCompetitors: ${body.includeCompetitorAnalysis}
}`);

      const startTime = Date.now();
      
      // Security validation
      const securityResult = securityService.validateRequest({
        searchTerm: body.searchTerm,
        organizationId: body.organizationId,
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown'
      });

      if (!securityResult.success) {
        return responseBuilder.error(securityResult.error, 400, corsHeaders);
      }

      // Check cache
      const cacheKey = `search:${body.searchTerm}:${body.country || 'us'}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        console.log(`📦 [${requestId}] CACHE HIT for search`);
        return responseBuilder.success(cached, corsHeaders);
      }

      // Perform search
      const term = searchType === 'url' ? 
        body.searchTerm.match(/id(\d+)/)?.[1] || body.searchTerm :
        body.searchTerm;

      console.log(`🔍 [${requestId}] CALLING ITUNES SEARCH API: { term: "${term}", country: "${body.country || 'us'}", limit: ${body.limit || 15} }`);

      const searchResponse = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${body.country || 'us'}&media=software&limit=${body.limit || 15}`
      );

      if (!searchResponse.ok) {
        throw new Error(`iTunes API error: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      
      console.log(`📊 [${requestId}] ITUNES API RESPONSE: { resultCount: ${searchData.resultCount}, resultsLength: ${searchData.results?.length} }`);

      // Transform results
      const transformedResults = metadataService.transformSearchResults(searchData.results);
      
      console.log(`✅ [${requestId}] TRANSFORMED ${transformedResults.length} RESULTS`);

      // Enhanced ambiguity detection
      let responseData: any;
      let isAmbiguous = false;
      let ambiguityReason: string | undefined;

      if (transformedResults.length === 0) {
        responseData = {
          results: [],
          isAmbiguous: false,
          message: 'No apps found for the search term'
        };
      } else if (transformedResults.length === 1) {
        console.log(`✅ [${requestId}] AUTO-SELECTED SINGLE CLEAR RESULT: ${transformedResults[0].name}`);
        
        // Single result - perform enhanced analysis
        const selectedApp = transformedResults[0];
        
        // Enhanced screenshot analysis if requested
        let screenshotAnalysis: any[] = [];
        let cppAnalysis: any = null;
        
        if (body.includeScreenshotAnalysis !== false && selectedApp.screenshotUrls?.length > 0) {
          const analysisResult = await screenshotService.analyze({
            targetApp: selectedApp,
            competitors: [],
            analysisType: 'basic'
          });
          
          if (analysisResult.success) {
            screenshotAnalysis = analysisResult.data?.competitorAnalysis || [];
          }
        }

        // CPP Analysis if requested
        if (body.analyzeCpp && body.generateThemes !== false) {
          console.log(`🎨 [${requestId}] GENERATING CPP THEMES`);
          cppAnalysis = await cppService.generateCppThemes(selectedApp, screenshotAnalysis);
        }

        // Enhanced metadata with CPP data
        const enhancedMetadata = {
          ...selectedApp,
          screenshotAnalysis,
          suggestedCppThemes: cppAnalysis?.suggestedThemes || [],
          competitorScreenshots: screenshotAnalysis,
          searchContext: {
            query: body.searchTerm,
            type: searchType,
            totalResults: 1,
            category: selectedApp.applicationCategory || 'Unknown',
            country: body.country || 'us'
          }
        };

        responseData = enhancedMetadata;
      } else {
        // Multiple results - check for ambiguity
        const uniqueDevelopers = new Set(transformedResults.map(r => r.developer)).size;
        const uniqueCategories = new Set(transformedResults.map(r => r.applicationCategory)).size;
        
        if (uniqueDevelopers > 1 || uniqueCategories > 1) {
          isAmbiguous = true;
          ambiguityReason = `Multiple apps from different developers found for "${body.searchTerm}"`;
          console.log(`🎯 [${requestId}] AMBIGUOUS SEARCH DETECTED - Returning multiple candidates`);
        }

        responseData = {
          results: transformedResults,
          isAmbiguous,
          ambiguityReason,
          searchContext: {
            query: body.searchTerm,
            type: searchType,
            totalResults: transformedResults.length,
            category: 'Multiple',
            country: body.country || 'us'
          }
        };
      }

      const processingTime = Date.now() - startTime;
      
      console.log(`✅ [${requestId}] APP SEARCH COMPLETED: {
  resultsCount: ${Array.isArray(responseData.results) ? responseData.results.length : 1},
  isAmbiguous: ${isAmbiguous},
  ambiguityReason: ${ambiguityReason ? `'${ambiguityReason}'` : 'undefined'},
  processingTime: "${processingTime}ms"
}`);

      // Cache successful results
      await cacheService.set(cacheKey, responseData, 3600); // 1 hour cache

      // Track analytics
      await analyticsService.trackSearch({
        organizationId: body.organizationId,
        searchTerm: body.searchTerm,
        searchType,
        resultsCount: Array.isArray(responseData.results) ? responseData.results.length : 1,
        processingTime,
        cached: false
      });

      return responseBuilder.success(responseData, corsHeaders);
      
    } else if (body.targetApp || body.competitorApps || body.seedKeywords) {
      // Keyword Discovery Route
      console.log(`🔍 [${requestId}] ROUTING TO: Keyword Discovery (via unknown)`);
      
      const discoveryResult = await discoveryService.discoverKeywords({
        targetApp: body.targetApp,
        competitorApps: body.competitorApps || [],
        seedKeywords: body.seedKeywords || [],
        organizationId: body.organizationId,
        maxKeywords: body.maxKeywords || 50
      });

      if (!discoveryResult.success) {
        return responseBuilder.error(discoveryResult.error, 500, corsHeaders);
      }

      return responseBuilder.success(discoveryResult.data, corsHeaders);
      
    } else {
      return responseBuilder.error('Invalid request: missing required parameters', 400, corsHeaders);
    }

  } catch (error) {
    console.error(`❌ [${requestId}] REQUEST PROCESSING ERROR:`, error);
    return ErrorHandler.handleError(error, corsHeaders);
  }
});
