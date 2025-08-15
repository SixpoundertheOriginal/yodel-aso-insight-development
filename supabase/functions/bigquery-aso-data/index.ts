
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BigQueryCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

interface BigQueryRequest {
  organizationId: string; // ✅ FIXED: Use organizationId instead of client
  dateRange?: {
    from: string;
    to: string;
  };
  selectedApps?: string[];
  trafficSources?: string[];
  limit?: number;
}

const isDevelopment = () => {
  const environment = Deno.env.get('ENVIRONMENT') || 'development';
  return environment === 'development' || environment === 'preview';
};

// Known BigQuery clients for emergency bypass
const KNOWN_BIGQUERY_CLIENTS = ['AppSeven', 'AppTwo', 'AppFour', 'AppOne', 'AppSix', 'AppThree', 'AppFive'];

// Traffic source mapping between display names and BigQuery values
const TRAFFIC_SOURCE_MAPPING: Record<string, string> = {
  'App Referrer': 'App_Referrer',
  'App Store Browse': 'App_Store_Browse',
  'App Store Search': 'App_Store_Search',
  'Apple Search Ads': 'Apple_Search_Ads',
  'Event Notification': 'Event_Notification',
  'Institutional Purchase': 'Institutional_Purchase',
  'Other': 'Unavailable',
  'Web Referrer': 'Web_Referrer'
};

const BIGQUERY_TO_DISPLAY_MAPPING: Record<string, string> = Object.fromEntries(
  Object.entries(TRAFFIC_SOURCE_MAPPING).map(([display, bigQuery]) => [bigQuery, display])
);

function mapBigQueryToDisplay(bigQueryName: string): string {
  return BIGQUERY_TO_DISPLAY_MAPPING[bigQueryName] || bigQueryName;
}

function mapTrafficSourceToBigQuery(displayName: string): string {
  const mapped = TRAFFIC_SOURCE_MAPPING[displayName];
  if (!mapped) {
    console.error(
      `[Edge Function] Unknown traffic source: "${displayName}". Available sources:`,
      Object.keys(TRAFFIC_SOURCE_MAPPING)
    );
    return displayName;
  }
  return mapped;
}

// Phase 3.2: verification helper
function verifyTrafficSourceMapping(requestedSources: string[], availableSources: string[]) {
  const normalizedAvailable = availableSources.map(s => s.toLowerCase());
  const mappingResults = requestedSources.map(source => {
    const bigQueryName = mapTrafficSourceToBigQuery(source);
    const exists = normalizedAvailable.includes(bigQueryName.toLowerCase());
    return {
      displayName: source,
      bigQueryName,
      existsInData: exists
    };
  });

  console.log('🔍 [Edge Function] Traffic source mapping verification:', {
    requestedCount: requestedSources.length,
    availableCount: availableSources.length,
    mappingResults,
    validMappings: mappingResults.filter(r => r.existsInData).length,
    invalidMappings: mappingResults.filter(r => !r.existsInData)
  });

  return mappingResults;
}

// Defensive array normalization helper
function normalizeTrafficSourcesArray(trafficSources: any): string[] {
  console.log('🔧 [BigQuery] Raw trafficSources input:', trafficSources, typeof trafficSources);
  
  // Handle null/undefined
  if (!trafficSources) {
    console.log('📝 [BigQuery] No traffic sources provided, returning empty array');
    return [];
  }
  
  // Handle already an array
  if (Array.isArray(trafficSources)) {
    const filtered = trafficSources.filter(source => typeof source === 'string' && source.trim().length > 0);
    console.log('📝 [BigQuery] Normalized array:', filtered);
    return filtered;
  }
  
  // Handle single string value
  if (typeof trafficSources === 'string' && trafficSources.trim().length > 0) {
    console.log('📝 [BigQuery] Converting single string to array:', [trafficSources]);
    return [trafficSources];
  }
  
  // Fallback for any other type
  console.log('📝 [BigQuery] Unexpected type, returning empty array');
  return [];
}

// Calculate previous period given current date range
function calculatePreviousPeriod(from: string, to: string): { from: string; to: string } | null {
  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()) || fromDate > toDate) {
    return null;
  }
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((toDate.getTime() - fromDate.getTime()) / dayMs) + 1;

  const prevFrom = new Date(fromDate.getTime() - diffDays * dayMs);
  const prevTo = new Date(toDate.getTime() - diffDays * dayMs);

  return {
    from: prevFrom.toISOString().split('T')[0],
    to: prevTo.toISOString().split('T')[0]
  }
}

interface PeriodTotals {
  impressions: number
  downloads: number
  product_page_views: number
  hasData: boolean
}

interface BigQueryDataPoint {
  traffic_source: string
  impressions: number
  downloads: number
  product_page_views: number
}

interface SourceMetrics {
  impressions: number
  downloads: number
  product_page_views: number
}

// Execute aggregation query for a specific period
async function executePeriodQuery(
  projectId: string,
  accessToken: string,
  clientsFilterUpper: string,
  dateFrom: string,
  dateTo: string,
  trafficSourceFilter: string,
  bigQueryTrafficSources: string[]
): Promise<PeriodTotals> {
  const params: any[] = [
    {
      name: 'dateFrom',
      parameterType: { type: 'DATE' },
      parameterValue: { value: dateFrom }
    },
    {
      name: 'dateTo',
      parameterType: { type: 'DATE' },
      parameterValue: { value: dateTo }
    }
  ];

  if (trafficSourceFilter) {
    params.push({
      name: 'trafficSourcesArray',
      parameterType: {
        type: 'ARRAY',
        arrayType: { type: 'STRING' }
      },
      parameterValue: {
        arrayValues: bigQueryTrafficSources.map(src => ({ value: src }))
      }
    });
  }

  const query = `
      SELECT
        SUM(impressions) AS impressions,
        SUM(downloads) AS downloads,
        SUM(product_page_views) AS product_page_views
      FROM \`${projectId}.client_reports.aso_all_apple\`
      WHERE UPPER(client) IN (${clientsFilterUpper})
      AND date BETWEEN @dateFrom AND @dateTo
      ${trafficSourceFilter}
    `

  const requestBody = {
    query,
    parameterMode: 'NAMED',
    queryParameters: params,
    useLegacySql: false
  };

  const response = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`BigQuery period query error: ${response.status} - ${errorText}`);
  }
  const result = await response.json();
  const row = result.rows && result.rows[0] ? result.rows[0].f : [];

  return {
    impressions: row[0]?.v ? Number(row[0].v) : 0,
    downloads: row[1]?.v ? Number(row[1].v) : 0,
    product_page_views: row[2]?.v ? Number(row[2].v) : 0,
    hasData: result.totalRows ? Number(result.totalRows) > 0 : false
  };
}

async function executeSourcePeriodQuery(
  projectId: string,
  accessToken: string,
  clientsFilterUpper: string,
  dateFrom: string,
  dateTo: string,
  trafficSourceFilter: string,
  bigQueryTrafficSources: string[]
): Promise<BigQueryDataPoint[]> {
  const params: any[] = [
    {
      name: 'dateFrom',
      parameterType: { type: 'DATE' },
      parameterValue: { value: dateFrom }
    },
    {
      name: 'dateTo',
      parameterType: { type: 'DATE' },
      parameterValue: { value: dateTo }
    }
  ];

  if (trafficSourceFilter) {
    params.push({
      name: 'trafficSourcesArray',
      parameterType: {
        type: 'ARRAY',
        arrayType: { type: 'STRING' }
      },
      parameterValue: {
        arrayValues: bigQueryTrafficSources.map(src => ({ value: src }))
      }
    });
  }

  const query = `
      SELECT
        traffic_source,
        SUM(impressions) AS impressions,
        SUM(downloads) AS downloads,
        SUM(product_page_views) AS product_page_views
      FROM \`${projectId}.client_reports.aso_all_apple\`
      WHERE UPPER(client) IN (${clientsFilterUpper})
      AND date BETWEEN @dateFrom AND @dateTo
      ${trafficSourceFilter}
      GROUP BY traffic_source
    `;

  const requestBody = {
    query,
    parameterMode: 'NAMED',
    queryParameters: params,
    useLegacySql: false
  };

  const response = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`BigQuery traffic source query error: ${response.status} - ${errorText}`);
  }
  const result = await response.json();
  const rows = result.rows || [];

  return rows.map((row: any) => ({
    traffic_source: mapBigQueryToDisplay(row.f[0]?.v || 'Unknown'),
    impressions: row.f[1]?.v ? Number(row.f[1].v) : 0,
    downloads: row.f[2]?.v ? Number(row.f[2].v) : 0,
    product_page_views: row.f[3]?.v ? Number(row.f[3].v) : 0
  }));
}

function groupByTrafficSource(data: BigQueryDataPoint[]): Record<string, SourceMetrics> {
  return data.reduce((acc, record) => {
    const source = record.traffic_source;
    if (!acc[source]) {
      acc[source] = { impressions: 0, downloads: 0, product_page_views: 0 };
    }
    acc[source].impressions += record.impressions;
    acc[source].downloads += record.downloads;
    acc[source].product_page_views += record.product_page_views;
    return acc;
  }, {} as Record<string, SourceMetrics>);
}

function calculateRealDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 999 : 0;
  return ((current - previous) / previous) * 100;
}

// Auto-discover apps from BigQuery and sync to Supabase
async function discoverAndSyncApps(
  organizationId: string,
  projectId: string,
  accessToken: string
) {
  const discoveryQuery = `
    SELECT DISTINCT
      client as app_identifier,
      client as app_name,
      'ios' as platform,
      MIN(date) as first_seen,
      MAX(date) as last_seen,
      COUNT(*) as record_count
    FROM \`${projectId}.client_reports.aso_all_apple\`
    WHERE client IS NOT NULL
    GROUP BY client
  `;

  const response = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: discoveryQuery })
    }
  );

  if (!response.ok) {
    console.error('🚨 [BigQuery] App discovery failed:', await response.text());
    return;
  }

  const result = await response.json();
  const rows = result.rows || [];

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  for (const row of rows) {
    const appIdentifier = row.f[0]?.v || '';
    const appName = row.f[1]?.v || appIdentifier;
    const platform = row.f[2]?.v || 'ios';
    const firstSeen = row.f[3]?.v || null;
    const lastSeen = row.f[4]?.v || null;

    await supabaseAdmin.from('apps').upsert(
      {
        organization_id: organizationId,
        app_identifier: appIdentifier,
        app_name: appName,
        platform,
        bigquery_client_name: appIdentifier,
        auto_discovered: true,
        status: 'active',
        first_seen: firstSeen,
        last_seen: lastSeen
      },
      { onConflict: 'organization_id,app_identifier,platform' }
    );
  }
}

serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 [BigQuery] ASO Data request received');
    console.log('🔍 [HTTP] Request received:', {
      method: req.method,
      contentType: req.headers.get('content-type'),
      contentLength: req.headers.get('content-length'),
      authorization: req.headers.get('authorization') ? 'PRESENT' : 'MISSING',
      userAgent: req.headers.get('user-agent')
    });

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const credentialString = Deno.env.get('BIGQUERY_CREDENTIALS');
    const projectId = Deno.env.get('BIGQUERY_PROJECT_ID');
    
    if (!projectId || !credentialString) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing BigQuery configuration',
          meta: {
            hasProjectId: !!projectId,
            hasCredentials: !!credentialString,
            executionTimeMs: Date.now() - startTime
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    let body: BigQueryRequest;
    if (req.method === 'GET') {
      body = { organizationId: "84728f94-91db-4f9c-b025-5221fbed4065" };
    } else {
      try {
        const rawBody = await req.text();
        console.log('📥 [HTTP] Raw body received:', {
          length: rawBody.length,
          preview: rawBody.substring(0, 200),
          isEmpty: rawBody.length === 0,
          startsWithBrace: rawBody.trim().startsWith('{')
        });
        body = JSON.parse(rawBody);
        console.log('✅ [HTTP] JSON parse successful:', {
          hasOrganizationId: !!(body as any).organizationId,
          hasDateRange: !!(body as any).dateRange,
          keys: Object.keys(body as any)
        });
        // Phase 1.1: request reception logging
        console.log('📥 [Edge Function] Request received:', {
          organizationId: (body as any).organizationId,
          trafficSources: (body as any).trafficSources,
          trafficSourcesType: typeof (body as any).trafficSources,
          trafficSourcesLength: (body as any).trafficSources?.length || 0,
          trafficSourcesActual: (body as any).trafficSources,
          dateRange: (body as any).dateRange,
          timestamp: new Date().toISOString()
        });
      } catch (parseError) {
        console.error('❌ [HTTP] JSON parse failed:', (parseError as any).message);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Invalid JSON in request body: ${(parseError as any).message}`,
            meta: { executionTimeMs: Date.now() - startTime, parseError: (parseError as any).message }
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // ✅ FIXED: Use organizationId parameter correctly
    const organizationId = body.organizationId;
    if (!organizationId) {
      throw new Error('organizationId parameter is required');
    }

    console.log(`📋 [BigQuery] Processing request for organization: ${organizationId}`);
    
    if (isDevelopment()) {
      console.log('🔍 [BigQuery] Request parameters:', {
        organizationId,
        hasDateRange: !!body.dateRange,
        trafficSourcesCount: body.trafficSources?.length || 0,
        selectedAppsCount: body.selectedApps?.length || 0,
        limit: body.limit
      });
    }

    // ✅ FIXED: Get approved apps for organization using organizationId
    const { data: approvedApps, error: approvedAppsError } = await supabaseClient
      .rpc('get_approved_apps', { p_organization_id: organizationId });

    if (approvedAppsError) {
      console.error('❌ [BigQuery] Failed to get approved apps:', approvedAppsError);
    }

    const approvedAppIdentifiers = approvedApps?.map((app: any) => app.app_identifier) || [];
    
    if (isDevelopment()) {
      console.log('🔍 [BigQuery] Approved apps retrieved:', {
        organizationId,
        approvedAppsCount: approvedAppIdentifiers.length,
        approvedApps: approvedAppIdentifiers
      });
    }

    // Determine clients to query
    let clientsToQuery = approvedAppIdentifiers;
    let shouldAutoApprove = false;

    if (approvedAppIdentifiers.length === 0) {
      console.log('🚨 [BigQuery] No approved apps found, using emergency bypass');
      clientsToQuery = KNOWN_BIGQUERY_CLIENTS;
      shouldAutoApprove = true;
    }

    // ✅ FIXED: Apply selectedApps filtering if provided
    if (body.selectedApps && body.selectedApps.length > 0) {
      console.log('🔍 [BigQuery] Filtering by selectedApps:', body.selectedApps);
      const filteredClients = clientsToQuery.filter(client => 
        body.selectedApps!.includes(client)
      );
      
      if (filteredClients.length > 0) {
        clientsToQuery = filteredClients;
        console.log('✅ [BigQuery] Filtered clients:', filteredClients);
      } else {
        console.log('⚠️ [BigQuery] No matching clients found in selectedApps, using all approved apps');
      }
    }

    console.log('🎯 [BigQuery] Final clients to query:', clientsToQuery);

    // Get BigQuery OAuth token
    const credentials: BigQueryCredentials = JSON.parse(credentialString);
    const tokenResponse = await getGoogleOAuthToken(credentials);
    const accessToken = tokenResponse.access_token;

    // Auto-discover and sync apps for this organization
    await discoverAndSyncApps(organizationId, projectId!, accessToken);

    const limit = body.limit || 1000;
    
    // Build query components
    const clientsFilter = clientsToQuery.map(app => `'${app}'`).join(', ');
    const clientsFilterUpper = clientsToQuery.map(app => `UPPER('${app}')`).join(', ');

    const normalizedTrafficSources = normalizeTrafficSourcesArray(body.trafficSources);
    console.log('[BigQuery] Final trafficSources used in query:', normalizedTrafficSources);

    console.log('🔄 [Edge Function] Traffic source normalization:', {
      originalTrafficSources: body.trafficSources,
      normalizedTrafficSources,
      normalizedLength: normalizedTrafficSources.length,
      willApplyFilter: normalizedTrafficSources.length > 0,
      filterDecision: normalizedTrafficSources.length > 0 ? 'APPLY_SPECIFIC_FILTER' : 'NO_FILTER_ALL_SOURCES'
    });

    // **PHASE 1 IMPLEMENTATION: Two-Pass Data Architecture**
    
    // STEP 1: Get ALL available traffic sources (discovery query)
    console.log('🔍 [Phase 1] Step 1: Discovering all available traffic sources...');
    
    const discoveryQuery = `
      SELECT DISTINCT traffic_source
      FROM \`${projectId}.client_reports.aso_all_apple\`
      WHERE UPPER(client) IN (${clientsFilterUpper})
      ${body.dateRange ? 'AND date BETWEEN @dateFrom AND @dateTo' : 'AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)'}
      ORDER BY traffic_source
    `;

    const discoveryParams: any[] = [];
    if (body.dateRange) {
      discoveryParams.push(
        {
          name: 'dateFrom',
          parameterType: { type: 'DATE' },
          parameterValue: { value: body.dateRange.from }
        },
        {
          name: 'dateTo',
          parameterType: { type: 'DATE' },
          parameterValue: { value: body.dateRange.to }
        }
      );
    }

    const discoveryRequestBody = {
      query: discoveryQuery,
      parameterMode: 'NAMED',
      queryParameters: discoveryParams,
      useLegacySql: false,
      maxResults: 50
    };

    if (isDevelopment()) {
      console.log('🔍 [Phase 1] Discovery Query:', discoveryQuery.replace(/\s+/g, ' ').trim());
    }

    // Execute discovery query
    const discoveryResponse = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(discoveryRequestBody)
      }
    );

    if (!discoveryResponse.ok) {
      const errorText = await discoveryResponse.text();
      console.error('❌ [BigQuery] Discovery query error:', errorText);
      throw new Error(`BigQuery discovery API error: ${discoveryResponse.status} - ${errorText}`);
    }

    const discoveryResult = await discoveryResponse.json();
    const discoveredSources = (discoveryResult.rows || [])
      .map((row: any) => row.f[0]?.v || 'Unknown')
      .filter(Boolean);
    const availableTrafficSources = discoveredSources
      .map((src: string) => mapBigQueryToDisplay(src))
      .filter(Boolean)
      .sort();

    console.log('✅ [Phase 1] Step 1 Complete - Available traffic sources:', availableTrafficSources);

    console.log('🔍 [Edge Function] Discovery query results:', {
      discoveredSources,
      sourceCount: discoveredSources.length,
      matchesRequested: normalizedTrafficSources.length > 0 ?
        normalizedTrafficSources.filter(source => discoveredSources.includes(mapTrafficSourceToBigQuery(source))) :
        'ALL_SOURCES_REQUESTED'
    });

    if (normalizedTrafficSources.length > 0) {
      verifyTrafficSourceMapping(normalizedTrafficSources, discoveredSources);
    }

    // STEP 2: Get filtered data (main query with optional traffic source filtering)
    console.log('🔍 [Phase 1] Step 2: Fetching filtered data...');
    
    let trafficSourceFilter = '';
    const queryParams: any[] = [];
    let bigQueryTrafficSources: string[] = [];

    if (normalizedTrafficSources.length > 0) {
      // Map display names to BigQuery format
      bigQueryTrafficSources = normalizedTrafficSources.map(source =>
        mapTrafficSourceToBigQuery(source)
      );

      console.log('🔍 [Edge Function] Traffic source mapping verification:', {
        originalSources: normalizedTrafficSources,
        mappedSources: normalizedTrafficSources.map(source => ({
          display: source,
          bigQuery: mapTrafficSourceToBigQuery(source),
          correctFormat: !mapTrafficSourceToBigQuery(source).includes('UPPER')
        }))
      });

      console.log('🔍 [Edge Function] BigQuery parameter construction:', {
        displayNames: normalizedTrafficSources,
        bigQueryNames: bigQueryTrafficSources,
        parameterValue: bigQueryTrafficSources.map(source => ({ value: source })),
        expectedMatches: 'Will verify in database'
      });

      console.log('🔄 [BigQuery] Traffic source mapping applied:', {
        displaySources: normalizedTrafficSources,
        bigQuerySources: bigQueryTrafficSources,
        filterWillBeApplied: true
      });

      // Apply traffic source filter
      trafficSourceFilter = 'AND traffic_source IN UNNEST(@trafficSourcesArray)';

      queryParams.push({
        name: 'trafficSourcesArray',
        parameterType: {
          type: 'ARRAY',
          arrayType: { type: 'STRING' }
        },
        parameterValue: {
          arrayValues: bigQueryTrafficSources.map(source => ({ value: source }))
        }
      });
    } else {
      console.log('✅ [Edge Function] No traffic source filter - returning ALL sources');
    }
    
    // Add date range parameters if provided
    if (body.dateRange) {
      queryParams.push(
        {
          name: 'dateFrom',
          parameterType: { type: 'DATE' },
          parameterValue: { value: body.dateRange.from }
        },
        {
          name: 'dateTo',
          parameterType: { type: 'DATE' },
          parameterValue: { value: body.dateRange.to }
        }
      );
    }
    
    // Build final query - only apply traffic source filter if we have sources
    const query = `
      SELECT 
        date,
        client as organization_id,
        traffic_source,
        impressions,
        downloads, 
        product_page_views
      FROM \`${projectId}.client_reports.aso_all_apple\`
      WHERE UPPER(client) IN (${clientsFilterUpper})
      ${body.dateRange ? 'AND date BETWEEN @dateFrom AND @dateTo' : 'AND date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)'}
      ${trafficSourceFilter}
      ORDER BY date DESC
      LIMIT ${limit}
    `;

    const requestBody = {
      query,
      parameterMode: 'NAMED',
      queryParameters: queryParams,
      useLegacySql: false,
      maxResults: limit
    };

    console.log('🗃️ [Edge Function] BigQuery query construction:', {
      trafficSourceFilter: trafficSourceFilter || 'NO_FILTER',
      queryParams: queryParams.map(p => ({ name: p.name, type: p.parameterType.type, value: p.parameterValue })),
      queryPreview: query.substring(0, 200) + '...',
      willFilterTrafficSources: !!trafficSourceFilter
    });

    if (isDevelopment()) {
      console.log('🔍 [BigQuery] Final Query Built:', query.replace(/\s+/g, ' ').trim());
      console.log('📊 [BigQuery] Query Parameters:', JSON.stringify(queryParams, null, 2));
      console.log('✅ [BigQuery] Query validation passed - executing...');
    }

    // Execute BigQuery request
    const bigQueryResponse = await fetch(
      `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!bigQueryResponse.ok) {
      const errorText = await bigQueryResponse.text();
      console.error('❌ [BigQuery] API error:', errorText);
      throw new Error(`BigQuery API error: ${bigQueryResponse.status} - ${errorText}`);
    }

    const queryResult = await bigQueryResponse.json();
    const executionTimeMs = Date.now() - startTime;

    console.log(`✅ [BigQuery] Query completed: ${queryResult.totalRows || 0} rows in ${executionTimeMs}ms`);

    console.log('📤 [Edge Function] BigQuery response analysis:', {
      success: !!queryResult,
      rowCount: (queryResult.rows || []).length,
      uniqueTrafficSources: [...new Set((queryResult.rows || []).map((row: any) => row.f[2]?.v))],
      sampleRows: (queryResult.rows || []).slice(0, 3).map((row: any) => ({
        date: row.f[0]?.v,
        traffic_source: row.f[2]?.v,
        impressions: row.f[3]?.v,
        downloads: row.f[4]?.v
      })),
      queryExecutionTime: executionTimeMs + 'ms'
    });

    // Transform BigQuery response with proper NULL handling
    const rows = queryResult.rows || [];
    const transformedData = rows.map((row: any, index: number) => {
      const fields = row.f;
      
      // Enhanced field debugging - log raw field structure for first few rows
      if (isDevelopment() && index < 3) {
        console.log(`🔍 [BigQuery] Raw field sample (row ${index}):`, 
          fields.map((f: any, i: number) => `fields[${i}] = "${f?.v}" (${typeof f?.v})`)
        );
      }
      
      // Current field mapping based on SELECT order:
      // 0: date, 1: organization_id, 2: traffic_source, 3: impressions, 4: downloads, 5: product_page_views
      const date = fields[0]?.v || null;
      const orgId = fields[1]?.v || organizationId;
      const originalTrafficSource = fields[2]?.v || 'organic';
      const impressions = parseInt(fields[3]?.v || '0');
      const downloads = parseInt(fields[4]?.v || '0');
      
      // **FIX: Preserve NULL values instead of converting to 0**
      // Check if the value is actually null/undefined from BigQuery
      const rawProductPageViews = fields[5]?.v;
      const productPageViews = (rawProductPageViews === null || rawProductPageViews === undefined) 
        ? null  // Preserve NULL for aggregation logic
        : parseInt(rawProductPageViews || '0');
      
      // Debug logging for field mapping verification
      if (isDevelopment() && index < 3) {
        console.log(`🔧 [BigQuery] Field mapping debug (row ${index}):`, {
          date,
          orgId,
          originalTrafficSource,
          impressions,
          downloads,
          rawProductPageViews,
          productPageViews,
          isNull: rawProductPageViews === null,
          fieldValues: {
            'fields[0]': fields[0]?.v,
            'fields[1]': fields[1]?.v,
            'fields[2]': fields[2]?.v,
            'fields[3]': fields[3]?.v,
            'fields[4]': fields[4]?.v,
            'fields[5]': fields[5]?.v
          }
        });
      }
      
      // Calculate conversion rate only when product_page_views is not null
      const conversionRate = (productPageViews !== null && productPageViews > 0) ? 
        (downloads / productPageViews * 100) : 0;
      
      return {
        date,
        organization_id: orgId,
        traffic_source: mapBigQueryToDisplay(originalTrafficSource),
        traffic_source_raw: originalTrafficSource,
        impressions,
        downloads,
        product_page_views: productPageViews, // This can now be null
        conversion_rate: conversionRate,
        revenue: 0,
        country: 'US',
        data_source: 'bigquery'
      };
    });

    // Auto-approval logic
    if (shouldAutoApprove && transformedData.length > 0) {
      const discoveredClients = [...new Set(transformedData.map(row => row.organization_id))];
      
      try {
        for (const client of discoveredClients) {
          const { error: upsertError } = await supabaseClient
            .from('organization_apps')
            .upsert({
              organization_id: organizationId,
              app_identifier: client,
              app_name: client,
              data_source: 'bigquery',
              approval_status: 'approved',
              approved_date: new Date().toISOString(),
              approved_by: null,
              app_metadata: {
                auto_approved: true,
                first_discovered: new Date().toISOString(),
                data_available: true
              }
            }, {
              onConflict: 'organization_id,app_identifier,data_source',
              ignoreDuplicates: false
            });

          if (upsertError) {
            console.error(`❌ [BigQuery] Auto-approval failed for ${client}:`, upsertError);
          }
        }
        console.log(`✅ [BigQuery] Auto-approved ${discoveredClients.length} clients`);
      } catch (autoApprovalError) {
        console.error('❌ [BigQuery] Auto-approval process failed:', autoApprovalError);
      }
    }

    if (isDevelopment() && transformedData.length > 0) {
      console.log('📊 [BigQuery] Sample transformed data:', transformedData[0]);
      
      // **ENHANCED: Better statistics for debugging NULL handling**
      const nonNullPageViews = transformedData.filter(d => d.product_page_views !== null);
      const nullPageViews = transformedData.filter(d => d.product_page_views === null);
      
      console.log('📊 [BigQuery] Product page views summary:', {
        totalRows: transformedData.length,
        rowsWithNonNullPageViews: nonNullPageViews.length,
        rowsWithNullPageViews: nullPageViews.length,
        maxPageViews: nonNullPageViews.length > 0 ? Math.max(...nonNullPageViews.map(d => d.product_page_views)) : 0,
        avgPageViews: nonNullPageViews.length > 0 ? 
          nonNullPageViews.reduce((sum, d) => sum + d.product_page_views, 0) / nonNullPageViews.length : 0,
        nullHandling: 'NULLs preserved for proper aggregation'
      });
    }

    // Aggregate current and previous period totals
    let periodComparison: any = null;
    try {
      const today = new Date();
      const defaultTo = today.toISOString().split('T')[0];
      const defaultFrom = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const currentRange = body.dateRange || { from: defaultFrom, to: defaultTo };
      const previousRange = calculatePreviousPeriod(currentRange.from, currentRange.to);

      const [currentTotals, previousTotals, currentSources, previousSources] = await Promise.all([
        executePeriodQuery(projectId, accessToken, clientsFilterUpper, currentRange.from, currentRange.to, trafficSourceFilter, bigQueryTrafficSources),
        previousRange
          ? executePeriodQuery(projectId, accessToken, clientsFilterUpper, previousRange.from, previousRange.to, trafficSourceFilter, bigQueryTrafficSources)
          : Promise.resolve({ impressions: 0, downloads: 0, product_page_views: 0, hasData: false }),
        executeSourcePeriodQuery(projectId, accessToken, clientsFilterUpper, currentRange.from, currentRange.to, trafficSourceFilter, bigQueryTrafficSources),
        previousRange
          ? executeSourcePeriodQuery(projectId, accessToken, clientsFilterUpper, previousRange.from, previousRange.to, trafficSourceFilter, bigQueryTrafficSources)
          : Promise.resolve([])
      ]);

      const currentBySource = groupByTrafficSource(currentSources);
      const previousBySource = groupByTrafficSource(previousSources);
      const trafficSourceDeltas = Object.keys(currentBySource).map(source => ({
        name: source,
        current: currentBySource[source],
        previous: previousBySource[source] || { impressions: 0, downloads: 0, product_page_views: 0 },
        delta: calculateRealDelta(
          currentBySource[source].downloads,
          previousBySource[source]?.downloads || 0
        )
      }));

      periodComparison = {
        current: { ...currentTotals, from: currentRange.from, to: currentRange.to },
        previous: previousRange && previousTotals.hasData
          ? { ...previousTotals, from: previousRange.from, to: previousRange.to }
          : null,
        delta: previousRange && previousTotals.hasData
          ? {
              impressions: currentTotals.impressions - previousTotals.impressions,
              downloads: currentTotals.downloads - previousTotals.downloads,
              product_page_views: currentTotals.product_page_views - previousTotals.product_page_views
            }
          : null,
        trafficSources: trafficSourceDeltas
      };
    } catch (periodError) {
      console.error('❌ [BigQuery] Period comparison failed:', periodError);
    }

    // **PHASE 1 CRITICAL: Build response metadata with ALL available traffic sources**
    console.log('✅ [Phase 1] Step 3: Building enhanced metadata with all available traffic sources');

    const responsePayload = {
      success: true,
      data: transformedData,
      meta: {
        rowCount: transformedData.length,
        totalRows: parseInt(queryResult.totalRows || '0'),
        executionTimeMs,
        queryParams: {
          organizationId,
          dateRange: body.dateRange || null,
          selectedApps: body.selectedApps || null,
          trafficSources: normalizedTrafficSources || null,
          limit
        },
        // **PHASE 1 KEY CHANGE: Always return all discovered traffic sources**
        availableTrafficSources, // This now comes from discovery query, not filtered data
        filteredBySelection: !!(body.selectedApps && body.selectedApps.length > 0),
        filteredByTrafficSource: normalizedTrafficSources.length > 0,
        projectId,
        timestamp: new Date().toISOString(),
        approvedApps: approvedAppIdentifiers,
        queriedClients: clientsToQuery,
        emergencyBypass: shouldAutoApprove,
        autoApprovalTriggered: shouldAutoApprove && transformedData.length > 0,
        periodComparison,
        // **PHASE 1 ARCHITECTURE INFO**
        dataArchitecture: {
          phase: 'Phase 1 - Two-Pass Discovery',
          discoveryQuery: {
            executed: true,
            sourcesFound: availableTrafficSources.length,
            sources: availableTrafficSources
          },
          mainQuery: {
            executed: true,
            filtered: normalizedTrafficSources.length > 0,
            rowsReturned: transformedData.length
          }
        },
        ...(isDevelopment() && {
          debug: {
            queryPreview: query.replace(/\s+/g, ' ').trim(),
            discoveryQueryPreview: discoveryQuery.replace(/\s+/g, ' ').trim(),
            parameterCount: queryParams.length,
            jobComplete: !!queryResult.jobComplete,
            trafficSourceMapping: { ...TRAFFIC_SOURCE_MAPPING },
            filteringDecision: {
              originalRequest: body.trafficSources,
              normalizedSources: normalizedTrafficSources,
              filterApplied: normalizedTrafficSources.length > 0,
              queryClause: trafficSourceFilter || 'NO_FILTER'
            }
          }
        })
      }
    };

    try {
      const body = JSON.stringify(responsePayload);
      console.log('✅ [BigQuery] JSON serialization succeeded');
      return new Response(body, {
        // ✅ Required to ensure Supabase Edge returns valid response
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (jsonError: any) {
      console.error('💥 [BigQuery] JSON serialization failed:', jsonError);
      return new Response(
        JSON.stringify({ success: false, error: jsonError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error: any) {
    const executionTimeMs = Date.now() - startTime;
    console.error('💥 [BigQuery] Function error:', error.message);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        meta: {
          executionTimeMs,
          timestamp: new Date().toISOString(),
          requestMethod: req.method,
          errorType: error.constructor.name
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function getGoogleOAuthToken(credentials: BigQueryCredentials): Promise<any> {
  const scope = 'https://www.googleapis.com/auth/bigquery.readonly';
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: credentials.client_email,
    scope,
    aud: credentials.token_uri,
    iat,
    exp
  };

  const privateKey = credentials.private_key.replace(/\\n/g, '\n');
  
  const tokenResponse = await fetch(credentials.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await createJWT(header, payload, privateKey)
    })
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`OAuth token error: ${tokenResponse.status} - ${errorText}`);
  }

  return await tokenResponse.json();
}

async function createJWT(header: any, payload: any, privateKey: string): Promise<string> {
  const keyData = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signingInput = `${headerB64}.${payloadB64}`;
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signingInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signingInput}.${signatureB64}`;
}
