import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    exp,
  };

  const privateKey = credentials.private_key.replace(/\\n/g, '\n');

  const tokenResponse = await fetch(credentials.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await createJWT(header, payload, privateKey),
    }),
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
    ['sign'],
  );

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signingInput = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, encoder.encode(signingInput));

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signingInput}.${signatureB64}`;
}

async function discoverAndSyncApps(
  organizationId: string,
  projectId: string,
  accessToken: string,
  supabaseAdmin: ReturnType<typeof createClient>,
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

  const response = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: discoveryQuery }),
  });

  if (!response.ok) {
    console.error('🚨 [BigQuery] App discovery failed:', await response.text());
    return;
  }

  const result = await response.json();
  const rows = result.rows || [];

  for (const row of rows) {
    const appIdentifier = row.f[0]?.v || '';
    const appName = row.f[1]?.v || appIdentifier;
    const firstSeen = row.f[3]?.v || null;
    const lastSeen = row.f[4]?.v || null;

    await supabaseAdmin.from('apps').upsert(
      {
        organization_id: organizationId,
        app_identifier: appIdentifier,
        app_name: appName,
        platform: 'ios',
        bigquery_client_name: appIdentifier,
        auto_discovered: true,
        status: 'active',
        first_seen: firstSeen,
        last_seen: lastSeen,
      },
      { onConflict: 'organization_id,app_identifier,platform' },
    );
  }
}

serve(async () => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: organizations } = await supabaseAdmin.from('organizations').select('id');

  const credentialString = Deno.env.get('BIGQUERY_CREDENTIALS');
  const projectId = Deno.env.get('BIGQUERY_PROJECT_ID');

  if (!projectId || !credentialString) {
    return new Response(
      JSON.stringify({ success: false, error: 'BigQuery configuration missing' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const credentials: BigQueryCredentials = JSON.parse(credentialString);
  const tokenResponse = await getGoogleOAuthToken(credentials);
  const accessToken = tokenResponse.access_token;

  for (const org of organizations ?? []) {
    await discoverAndSyncApps(org.id, projectId, accessToken, supabaseAdmin);
  }

  return new Response(
    JSON.stringify({ success: true, synced: organizations?.length ?? 0 }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
