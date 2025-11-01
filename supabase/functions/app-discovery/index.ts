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

interface AppDiscoveryRequest {
  organizationId: string;
  action: 'discover' | 'approve' | 'reject';
  appId?: string;
  status?: string;
}

function cleanAppName(appId: string): string {
  return appId
    .replace(/^com\./, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const log = (m: string, extra?: unknown) =>
    console.log(`[App Discovery][${requestId}] ${m}`, extra ?? "");

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { pathname } = new URL(req.url)
  if (pathname === '/ping') {
    const envAudit = {
      BIGQUERY_PROJECT_ID: !!Deno.env.get('BIGQUERY_PROJECT_ID'),
      GOOGLE_CLOUD_PROJECT: !!Deno.env.get('GOOGLE_CLOUD_PROJECT'),
      PROJECT_ID: !!Deno.env.get('PROJECT_ID'),
      BIGQUERY_CREDENTIALS: !!Deno.env.get('BIGQUERY_CREDENTIALS'),
      SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
      SUPABASE_ANON_KEY: !!Deno.env.get('SUPABASE_ANON_KEY'),
    };
    let resolvedProjectId = Deno.env.get('BIGQUERY_PROJECT_ID')
      || Deno.env.get('GOOGLE_CLOUD_PROJECT')
      || Deno.env.get('PROJECT_ID')
      || null;
    if (!resolvedProjectId) {
      try {
        const cred = Deno.env.get('BIGQUERY_CREDENTIALS');
        if (cred) {
          const parsed = JSON.parse(cred);
          resolvedProjectId = parsed.project_id || null;
        }
      } catch (_) {}
    }
    return new Response(
      JSON.stringify({
        status: 'ok',
        projectIdResolved: !!resolvedProjectId,
        projectId: resolvedProjectId,
        envAudit
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const contentType = req.headers.get('content-type') || '';
  if (contentType !== 'application/json') {
    return new Response(
      JSON.stringify({
        requestId,
        error: 'INVALID_CONTENT_TYPE',
        details: 'Content-Type must be application/json'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      supabaseServiceRoleKey
    );

    console.log('[App Discovery][DEBUG] Supabase client initialized with service role key:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

    const authHeader = req.headers.get('Authorization') || '';
    const internalKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!internalKey || authHeader !== `Bearer ${internalKey}`) {
      console.error('[Auth] Invalid or missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let body: AppDiscoveryRequest;
    try {
      body = await req.json();
    } catch (err: any) {
      return new Response(
        JSON.stringify({
          requestId,
          error: 'INVALID_JSON',
          details: err.message
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log('request received', body);

    const validationErrors: string[] = [];
    if (!body.organizationId || typeof body.organizationId !== 'string') {
      validationErrors.push('organizationId');
    }
    if (!body.action || typeof body.action !== 'string') {
      validationErrors.push('action');
    }
    if (validationErrors.length) {
      return new Response(
        JSON.stringify({
          requestId,
          error: 'INVALID_REQUEST',
          details: validationErrors
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['discover', 'approve', 'reject'].includes(body.action)) {
      return new Response(
        JSON.stringify({
          requestId,
          error: 'UNKNOWN_ACTION',
          details: body.action
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if ((body.action === 'approve' || body.action === 'reject') && (!body.appId || typeof body.appId !== 'string')) {
      return new Response(
        JSON.stringify({
          requestId,
          error: 'INVALID_REQUEST',
          details: 'appId is required for approval actions'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle approval/rejection actions
    if (body.action === 'approve' || body.action === 'reject') {
      const { data, error } = await supabaseClient.rpc('update_app_approval_status', {
        p_app_id: body.appId,
        p_status: body.action === 'approve' ? 'approved' : 'rejected'
      });

      if (error) {
        throw new Error(`Failed to ${body.action} app: ${error.message}`);
      }

      // Log the action
      await supabaseClient.from('audit_logs').insert({
        organization_id: body.organizationId,
        action: `app_${body.action}`,
        resource_type: 'organization_app',
        resource_id: body.appId,
        details: { app_id: body.appId, status: body.action }
      });

      return new Response(
        JSON.stringify({ success: true, action: body.action }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle discovery action
    if (body.action === 'discover') {
      const credentialString = Deno.env.get('BIGQUERY_CREDENTIALS');
      const envProjectIdPrimary = Deno.env.get('BIGQUERY_PROJECT_ID');
      const envProjectIdGcp = Deno.env.get('GOOGLE_CLOUD_PROJECT');
      const envProjectIdGeneric = Deno.env.get('PROJECT_ID');

      let credentials: BigQueryCredentials;
      try {
        credentials = JSON.parse(credentialString || '');
      } catch (err: any) {
        log('credentials parse failed', err.message);
        return new Response(
          JSON.stringify({ success: false, error: 'INVALID_BIGQUERY_CREDENTIALS' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Resolve project id with fallbacks, preferring env then credentials
      const projectId = envProjectIdPrimary || envProjectIdGcp || envProjectIdGeneric || credentials.project_id || '';

      const envState = {
        hasCredentials: !!credentialString,
        sources: {
          BIGQUERY_PROJECT_ID: !!envProjectIdPrimary,
          GOOGLE_CLOUD_PROJECT: !!envProjectIdGcp,
          PROJECT_ID: !!envProjectIdGeneric,
          CREDS_PROJECT_ID: !!credentials?.project_id,
        },
        resolvedProjectId: projectId || null,
      };
      log('env', envState);

      if (!projectId) {
        return new Response(
          JSON.stringify({ success: false, error: 'PROJECT_ID_UNRESOLVED' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get OAuth token
      let accessToken: string;
      try {
        const tokenResponse = await getGoogleOAuthToken(credentials);
        accessToken = tokenResponse.access_token;
      } catch (error: any) {
        log('OAuth token retrieval failed', error.stack || error);
        return new Response(
          JSON.stringify({ requestId, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: accessRows, error: accessError } = await supabaseClient
        .from('org_app_access')
        .select('app_id, organization_id, attached_at, detached_at')
        .eq('organization_id', body.organizationId)
        .is('detached_at', null);

      if (accessError) {
        console.error(`[App Discovery][${requestId}] Failed to load org_app_access:`, accessError);
      }

      const appAccessMap = new Map<string, string>(
        (accessRows ?? []).map((row: { app_id: string; organization_id: string }) => [row.app_id, row.organization_id])
      );

      console.log('[App Discovery][DEBUG] Loaded org_app_access entries:', appAccessMap.size);
      console.log('[LOOKUP DEBUG]', {
        org_id: body.organizationId,
        lookup_size: appAccessMap.size,
        sample_keys: Array.from(appAccessMap.keys()).slice(0, 5),
      });

      // Discovery query to find all unique apps in BigQuery
      // client = organization, app_id = individual app
      const discoveryQuery = `
        SELECT
          app_id as app_identifier,
          client as organization_name,
          COUNT(*) as record_count,
          MIN(date) as first_seen,
          MAX(date) as last_seen,
          COUNT(DISTINCT date) as days_with_data
        FROM \`aso-reporting-1.client_reports.aso_all_apple\`
        WHERE app_id IS NOT NULL AND app_id != ''
        GROUP BY app_id, client
      ` +
      // Temporarily lowered threshold to 1 for debugging
      // This will include any client with at least 1 record
      `HAVING COUNT(*) > 1
        ORDER BY record_count DESC
        LIMIT 50
      `;

      console.log('🔍 [App Discovery] Executing BigQuery discovery query');
      console.log('Query:', discoveryQuery);

      let bigQueryResponse: Response;
      try {
        bigQueryResponse = await fetch(
          `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: discoveryQuery,
              useLegacySql: false,
              timeoutMs: 30000,
              maxResults: 50
            })
          }
        );
      } catch (error: any) {
        console.error('❌ [App Discovery] BigQuery fetch failed:', error.stack || error);
        return new Response(
          JSON.stringify({ requestId, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!bigQueryResponse.ok) {
        const errorText = await bigQueryResponse.text();
        console.error('BigQuery error response:', errorText);
        throw new Error(`BigQuery discovery failed: ${bigQueryResponse.status} - ${errorText}`);
      }

      const queryResult = await bigQueryResponse.json();
      const rows = queryResult.rows ?? [];
      console.log("[App Discovery][DEBUG] BigQuery rows:", rows.length);
      console.log('[DEBUG][BQ SAMPLE] rows length:', rows?.length);
      if (rows?.length) {
        const first = rows[0];
        console.log('[DEBUG][BQ SAMPLE] first row keys:', Object.keys(first));
        console.log('[DEBUG][BQ SAMPLE] app_id field:', first.app_id ?? first.appid ?? null);
        console.log('[DEBUG][BQ SAMPLE] bundle_id field:', first.bundle_id ?? null);
        console.log('[DEBUG][BQ SAMPLE] raw row (stringified):', JSON.stringify(first, null, 2).slice(0, 500));
      }
      const discoveredApps = [];

      if (rows.length) {
        for (const row of rows) {
          const fields = row.f;
          const appData = {
            app_identifier: fields[0]?.v,
            organization_name: fields[1]?.v,
            record_count: parseInt(fields[2]?.v || '0'),
            first_seen: fields[3]?.v,
            last_seen: fields[4]?.v,
            days_with_data: parseInt(fields[5]?.v || '0')
          };

          // Clean the app name for better readability
          const cleanedAppName = cleanAppName(appData.app_identifier);

          console.log('[JOIN DEBUG]', {
            bq_app_id: appData.app_identifier,
            bq_app_id_type: typeof appData.app_identifier,
            bq_organization: appData.organization_name,
            supabase_has_app_id: appAccessMap.has(String(appData.app_identifier)),
          });

          if (!appData.app_identifier || !appAccessMap.has(appData.app_identifier)) {
            console.warn(`[App Discovery][${requestId}] Skipping ${appData.app_identifier}: no org_app_access entry`);
            continue;
          }

          const resolvedOrganizationId = appAccessMap.get(appData.app_identifier);
          if (!resolvedOrganizationId) {
            continue;
          }

          console.log("[App Discovery][DEBUG] Prepared upsert payload:", {
            organization_id: resolvedOrganizationId,
            app_identifier: appData.app_identifier,
            app_name: cleanedAppName
          });

          const { data: existingApp, error: fetchExistingError } = await supabaseClient
            .from('apps')
            .select('id, created_at')
            .eq('organization_id', resolvedOrganizationId)
            .eq('bundle_id', appData.app_identifier)
            .eq('platform', 'ios')
            .maybeSingle();

          if (fetchExistingError && fetchExistingError.code !== 'PGRST116') {
            console.error("[App Discovery][DEBUG] Existing app fetch failed:", fetchExistingError);
            continue;
          }

          const nowIso = new Date().toISOString();
          const preservedCreatedAt = existingApp?.created_at ?? nowIso;

          // Persist discovery metadata. Stored under intelligence_metadata, mapped to app_metadata on the frontend.
          const { error: upsertError } = await supabaseClient
            .from('apps')
            .upsert({
              organization_id: resolvedOrganizationId,
              app_name: cleanedAppName,
              platform: 'ios',
              bundle_id: appData.app_identifier,
              is_active: true,
              intelligence_metadata: {
                record_count: appData.record_count,
                first_seen: appData.first_seen,
                last_seen: appData.last_seen,
                days_with_data: appData.days_with_data,
                discovered_via: 'bigquery'
              },
              created_at: preservedCreatedAt
            }, {
              onConflict: 'organization_id,bundle_id,platform',
              ignoreDuplicates: false
            });

          if (!upsertError) {
            console.log(`✅ [App Discovery][DEBUG] Upsert succeeded for ${appData.app_identifier}`, {
              created_at: preservedCreatedAt,
              organization_id: resolvedOrganizationId
            });
            discoveredApps.push({
              ...appData,
              cleaned_name: cleanedAppName,
              organization_id: resolvedOrganizationId
            });
          } else {
            console.error(`❌ [App Discovery][DEBUG] Upsert failed for ${appData.app_identifier}:`, upsertError);
            console.error("❌ [App Discovery][DEBUG] Upsert error details:", upsertError);
          }
        }
      }

      console.log(`✅ [App Discovery] Discovered ${discoveredApps.length} apps with cleaned names`);

      return new Response(
        JSON.stringify({
          success: true,
          discoveredApps: discoveredApps.length,
          apps: discoveredApps
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        requestId,
        error: 'UNKNOWN_ACTION',
        details: body.action
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ [App Discovery] Error:', error.message, error.stack);

    return new Response(
      JSON.stringify({
        requestId,
        error: error.message
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

  const jwt = await createJWT(header, payload, credentials.private_key);

  const tokenResponse = await fetch(credentials.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
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
