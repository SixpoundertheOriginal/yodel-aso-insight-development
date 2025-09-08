import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// SECURE Demo Data Service - prevents real client data exposure
class SecureDemoDataService {
  private static readonly DEMO_APPS = [
    {
      name: 'DemoApp_ProductivitySuite',
      category: 'productivity',
      baseImpressions: 125000,
      baseDownloads: 6250,
      conversionRate: 5.0,
      growth: 0.15
    },
    {
      name: 'DemoApp_FitnessTracker',
      category: 'health',
      baseImpressions: 89000,
      baseDownloads: 3560,
      conversionRate: 4.0,
      growth: 0.12
    },
    {
      name: 'DemoApp_SocialNetwork',
      category: 'social',
      baseImpressions: 156000,
      baseDownloads: 4680,
      conversionRate: 3.0,
      growth: 0.18
    }
  ];

  private static readonly TRAFFIC_SOURCES = [
    { name: 'Apple Search Ads', weight: 0.35, raw: 'Apple_Search_Ads' },
    { name: 'App Store Search', weight: 0.25, raw: 'App_Store_Search' },
    { name: 'App Store Browse', weight: 0.20, raw: 'App_Store_Browse' },
    { name: 'App Referrer', weight: 0.10, raw: 'App_Referrer' },
    { name: 'Web Referrer', weight: 0.06, raw: 'Web_Referrer' },
    { name: 'Event Notification', weight: 0.04, raw: 'Event_Notification' }
  ];

  private static readonly COUNTRIES = [
    { code: 'US', weight: 0.45 },
    { code: 'GB', weight: 0.15 },
    { code: 'DE', weight: 0.12 },
    { code: 'FR', weight: 0.10 },
    { code: 'CA', weight: 0.08 },
    { code: 'AU', weight: 0.06 },
    { code: 'JP', weight: 0.04 }
  ];

  static generateSecureDemoData(
    organizationId: string,
    dateRange: { from: string; to: string },
    trafficSources?: string[],
    countries?: string[]
  ): any[] {
    console.log('🎭 [DEMO] Generating secure demo data for organization:', organizationId);
    
    const startDate = new Date(dateRange.from);
    const endDate = new Date(dateRange.to);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const demoData: any[] = [];
    
    // Filter sources and countries if specified
    const activeSources = trafficSources && trafficSources.length > 0 
      ? this.TRAFFIC_SOURCES.filter(s => trafficSources.includes(s.name))
      : this.TRAFFIC_SOURCES;
      
    const activeCountries = countries && countries.length > 0
      ? this.COUNTRIES.filter(c => countries.includes(c.code))
      : this.COUNTRIES;

    // Generate data for each day
    for (let day = 0; day < Math.min(days, 90); day++) { // Limit to 90 days max
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + day);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Weekend effect (reduce traffic 20% on weekends)
      const dayOfWeek = currentDate.getDay();
      const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.8 : 1.0;
      
      // Growth trend over time
      const growthMultiplier = 1 + (day / days) * 0.15; // 15% growth over period
      
      // Generate data for each app, traffic source, and country combination
      this.DEMO_APPS.forEach(app => {
        activeSources.forEach(source => {
          activeCountries.forEach(country => {
            
            // Calculate base metrics with realistic variation
            const dailyVariation = 0.8 + (Math.random() * 0.4); // ±20% daily variation
            const impressions = Math.round(
              app.baseImpressions * 
              source.weight * 
              country.weight * 
              weekendMultiplier * 
              growthMultiplier * 
              dailyVariation
            );
            
            const downloads = Math.round(impressions * (app.conversionRate / 100));
            const productPageViews = Math.round(downloads * (1.2 + Math.random() * 0.3)); // 120-150% of downloads
            const conversionRate = productPageViews > 0 ? (downloads / productPageViews) * 100 : 0;
            const revenue = downloads * (2.99 + Math.random() * 7.01); // $2.99-$10.00 per download
            
            // Only include if impressions > 100 to avoid noise
            if (impressions > 100) {
              demoData.push({
                date: dateStr,
                organization_id: app.name, // Use app name as organization_id for demo
                traffic_source: source.name,
                traffic_source_raw: source.raw,
                impressions,
                downloads,
                product_page_views: productPageViews,
                conversion_rate: Math.round(conversionRate * 100) / 100,
                revenue: Math.round(revenue * 100) / 100,
                sessions: Math.round(downloads * 1.1), // Slightly more sessions than downloads
                country: country.code,
                data_source: 'demo'
              });
            }
          });
        });
      });
    }
    
    console.log(`🎭 [DEMO] Generated ${demoData.length} demo records`);
    
    // Sort by date descending (most recent first)
    return demoData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  static getAvailableTrafficSources(): string[] {
    return this.TRAFFIC_SOURCES.map(s => s.name);
  }

  static getAvailableCountries(): string[] {
    return this.COUNTRIES.map(c => c.code);
  }
}

// SECURITY: Organization ownership validation
async function validateOrganizationAccess(
  supabaseClient: any,
  userId: string,
  organizationId: string
): Promise<boolean> {
  try {
    // Check if user is super admin (can access any organization)
    const { data: superAdminCheck } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'SUPER_ADMIN')
      .is('organization_id', null)
      .single();

    if (superAdminCheck) {
      console.log('✅ [SECURITY] Super admin access granted');
      return true;
    }

    // Check if user belongs to the requested organization
    const { data: userOrgs } = await supabaseClient
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', userId);

    if (!userOrgs) {
      console.log('🚨 [SECURITY] No organization roles found for user');
      return false;
    }

    const hasAccess = userOrgs.some((role: any) => role.organization_id === organizationId);
    
    if (!hasAccess) {
      console.log('🚨 [SECURITY] User does not belong to requested organization');
      return false;
    }

    console.log('✅ [SECURITY] Organization access validated');
    return true;
  } catch (error) {
    console.error('🚨 [SECURITY] Organization validation error:', error);
    return false;
  }
}

// SECURITY: Get approved apps for organization with validation
async function getApprovedApps(
  supabaseClient: any,
  organizationId: string
): Promise<string[]> {
  try {
    const { data: approvedApps, error } = await supabaseClient
      .from('organization_apps')
      .select('app_identifier')
      .eq('organization_id', organizationId)
      .eq('approval_status', 'approved');

    if (error) {
      console.error('🚨 [SECURITY] Error fetching approved apps:', error);
      return [];
    }

    const appIds = approvedApps?.map((app: any) => app.app_identifier) || [];
    console.log(`🔐 [SECURITY] Found ${appIds.length} approved apps for organization`);
    
    return appIds;
  } catch (error) {
    console.error('🚨 [SECURITY] Error in getApprovedApps:', error);
    return [];
  }
}

// SECURITY: Generate safe demo response
function generateSecureDemoResponse(
  organizationId: string,
  requestBody: any
): Response {
  console.log('🎭 [DEMO] Generating secure demo response for zero approved apps');
  
  const dateRange = requestBody.dateRange || {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  };
  
  const demoData = SecureDemoDataService.generateSecureDemoData(
    organizationId,
    dateRange,
    requestBody.trafficSources,
    requestBody.countries
  );
  
  const responseData = {
    success: true,
    data: demoData,
    meta: {
      rowCount: demoData.length,
      totalRows: demoData.length,
      executionTimeMs: 150, // Simulated execution time
      queryParams: {
        organizationId,
        dateRange,
        selectedApps: [],
        trafficSources: requestBody.trafficSources || [],
        limit: 1000
      },
      availableTrafficSources: SecureDemoDataService.getAvailableTrafficSources(),
      projectId: 'demo-environment',
      timestamp: new Date().toISOString(),
      isDemo: true, // CRITICAL: Demo mode flag
      demoMessage: 'Synthetic demo data for platform evaluation - no client data exposed',
      dataArchitecture: {
        phase: 'demo_data_generation',
        discoveryQuery: {
          executed: false,
          sourcesFound: SecureDemoDataService.getAvailableTrafficSources().length,
          sources: SecureDemoDataService.getAvailableTrafficSources()
        },
        mainQuery: {
          executed: true,
          filtered: (requestBody.trafficSources && requestBody.trafficSources.length > 0),
          rowsReturned: demoData.length
        }
      },
      debug: {
        queryPreview: 'SELECT demo_data FROM secure_demo_generator WHERE safe=true',
        parameterCount: 4,
        jobComplete: true,
        trafficSourceMapping: {}
      }
    }
  };

  return new Response(JSON.stringify(responseData), {
    headers: { 
      'Content-Type': 'application/json',
      ...corsHeaders 
    }
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const requestBody = await req.json();
    const { organizationId, dateRange, selectedApps, trafficSources } = requestBody;

    console.log(`📥 [SECURITY] BigQuery request for organization: ${organizationId}`);

    // SECURITY: Validate required parameters
    if (!organizationId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required parameter: organizationId'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.log('🚨 [SECURITY] Authentication failed');
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // SECURITY: Validate organization access
    const hasAccess = await validateOrganizationAccess(supabaseClient, user.id, organizationId);
    if (!hasAccess) {
      console.log('🚨 [SECURITY] Unauthorized organization access attempt');
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized: Access denied to requested organization'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // SECURITY: Get approved apps for organization
    const approvedApps = await getApprovedApps(supabaseClient, organizationId);

    console.log('🔍 DEMO AUDIT [EDGE-1]: Organization ID:', organizationId);
    console.log('🔍 DEMO AUDIT [EDGE-1]: Approved apps count:', approvedApps.length);
    console.log('🔍 DEMO AUDIT [EDGE-1]: Demo path triggered:', approvedApps.length === 0);

    console.log('🔍 DEMO AUDIT [EDGE-2]: Building response...');
    console.log('🔍 DEMO AUDIT [EDGE-2]: Response type:', approvedApps.length === 0 ? 'DEMO' : 'REAL');

    let response: Response;

    // CRITICAL SECURITY FIX: If no approved apps, return demo data ONLY
    if (approvedApps.length === 0) {
      console.log('🎭 [DEMO] Zero approved apps - serving secure demo data');

      // Log demo data access for audit
      try {
        await supabaseClient
          .from('audit_logs')
          .insert({
            organization_id: organizationId,
            user_id: user.id,
            action: 'demo_data_access',
            resource_type: 'bigquery_data',
            details: {
              reason: 'no_approved_apps',
              demo_mode: true,
              date_range: dateRange
            }
          });
      } catch (auditError) {
        console.error('⚠️ [AUDIT] Failed to log demo access:', auditError);
      }

      response = generateSecureDemoResponse(organizationId, requestBody);
    } else {
      // If we have approved apps, we would query real BigQuery here
      // For now, return a message indicating real data would be queried
      console.log(`🔐 [REAL-DATA] Would query real BigQuery for ${approvedApps.length} approved apps`);

      response = new Response(JSON.stringify({
        success: true,
        data: [],
        meta: {
          rowCount: 0,
          totalRows: 0,
          executionTimeMs: 100,
          queryParams: {
            organizationId,
            dateRange: dateRange || {},
            selectedApps: approvedApps,
            trafficSources: trafficSources || [],
            limit: 1000
          },
          availableTrafficSources: [],
          projectId: 'aso-reporting-1',
          timestamp: new Date().toISOString(),
          isDemo: false,
          message: `Real BigQuery integration not yet implemented. Would query ${approvedApps.length} approved apps.`
        }
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const responseJson = await response.clone().json();
    console.log('🔍 DEMO AUDIT [EDGE-3]: Final response meta keys:', Object.keys(responseJson.meta || {}));
    console.log('🔍 DEMO AUDIT [EDGE-3]: Demo flag in response:', responseJson.meta?.isDemo || responseJson.meta?.isDemoData);
    console.log('🔍 DEMO AUDIT [EDGE-3]: Response success:', responseJson.success);

    return response;

  } catch (error) {
    console.error('🚨 [ERROR] BigQuery function error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
})