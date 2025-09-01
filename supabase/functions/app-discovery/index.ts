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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

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

      // Discovery query to find all unique clients in BigQuery
      const discoveryQuery = `
        SELECT 
          client as app_identifier,
          COUNT(*) as record_count,
          MIN(date) as first_seen,
          MAX(date) as last_seen,
          COUNT(DISTINCT date) as days_with_data
        FROM \`${projectId}.client_reports.aso_all_apple\`
        WHERE client IS NOT NULL AND client != ''
        GROUP BY client 
        HAVING COUNT(*) > 100
        ORDER BY record_count DESC
        LIMIT 50
      `;

      console.log('🔍 [App Discovery] Executing BigQuery discovery query');

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
        throw new Error(`BigQuery discovery failed: ${bigQueryResponse.status} - ${errorText}`);
      }

      const queryResult = await bigQueryResponse.json();
      const discoveredApps = [];

      if (queryResult.rows) {
        for (const row of queryResult.rows) {
          const fields = row.f;
          const appData = {
            app_identifier: fields[0]?.v,
            record_count: parseInt(fields[1]?.v || '0'),
            first_seen: fields[2]?.v,
            last_seen: fields[3]?.v,
            days_with_data: parseInt(fields[4]?.v || '0')
          };

          // Clean the app name for better readability
          const cleanedAppName = cleanAppName(appData.app_identifier);

          // Insert or update in organization_apps table with forced updates
          const { error: upsertError } = await supabaseClient
            .from('organization_apps')
            .upsert({
              organization_id: body.organizationId,
              app_identifier: appData.app_identifier,
              app_name: cleanedAppName,
              data_source: 'bigquery',
              approval_status: 'pending',
              app_metadata: {
                record_count: appData.record_count,
                first_seen: appData.first_seen,
                last_seen: appData.last_seen,
                days_with_data: appData.days_with_data,
                cleaned_name: cleanedAppName
              }
            }, {
              onConflict: 'organization_id,app_identifier,data_source',
              ignoreDuplicates: false
            });

          if (!upsertError) {
            discoveredApps.push({
              ...appData,
              cleaned_name: cleanedAppName
            });
          } else {
            console.error(`❌ [App Discovery] Failed to upsert ${appData.app_identifier}:`, upsertError);
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
