import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper to get Google OAuth token
async function getGoogleOAuthToken(credentials) {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: credentials.private_key_id
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/bigquery.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedClaim = btoa(JSON.stringify(claim)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  // Import private key
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = credentials.private_key
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signatureInput}.${encodedSignature}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to get access token: ${await tokenResponse.text()}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function testBigQueryPipeline() {
  console.log('🔍 Testing BigQuery Pipeline Directly\n');
  console.log('='.repeat(80));
  console.log('');

  // Step 1: Get BigQuery credentials from secrets
  console.log('🔑 Step 1: Get BigQuery credentials from Supabase secrets');

  // We can't access edge function secrets directly from here, but we can test with the function
  console.log('   ⚠️  Cannot access edge function secrets from Node.js');
  console.log('   Need to invoke the edge function itself');
  console.log('');

  // Step 2: Get app IDs
  console.log('📱 Step 2: Get app IDs to query');
  const yodelOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  const { data: managedClients } = await supabase
    .from('agency_clients')
    .select('client_org_id')
    .eq('agency_org_id', yodelOrgId)
    .eq('is_active', true);

  const orgIds = [yodelOrgId];
  if (managedClients && managedClients.length > 0) {
    orgIds.push(...managedClients.map(c => c.client_org_id));
  }

  const { data: accessData } = await supabase
    .from('org_app_access')
    .select('app_id')
    .in('organization_id', orgIds)
    .is('detached_at', null);

  const appIds = (accessData || []).map(a => a.app_id).filter(Boolean);

  console.log('   Found', appIds.length, 'apps:', appIds.slice(0, 5));
  console.log('');

  // Step 3: Invoke the edge function with service role
  console.log('🚀 Step 3: Invoke BigQuery edge function');
  console.log('   Using service role to bypass RLS');
  console.log('');

  const requestBody = {
    organizationId: yodelOrgId,
    dateRange: {
      from: '2024-11-01',
      to: '2024-11-30'
    },
    selectedApps: [],
    trafficSources: []
  };

  console.log('📤 Request:');
  console.log(JSON.stringify(requestBody, null, 2));
  console.log('');

  try {
    const { data: response, error } = await supabase.functions.invoke(
      'bigquery-aso-data',
      {
        body: requestBody,
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`
        }
      }
    );

    console.log('─'.repeat(80));
    console.log('📥 RESPONSE:');
    console.log('─'.repeat(80));

    if (error) {
      console.log('❌ Error invoking function:');
      console.log(JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Success:', response?.success);
      console.log('📊 Data rows:', response?.data?.length || 0);
      console.log('');

      if (response?.error) {
        console.log('❌ Edge function returned error:');
        console.log('   Error:', response.error);
        if (response.details) console.log('   Details:', response.details);
        if (response.hint) console.log('   Hint:', response.hint);
      }

      if (response?.data && response.data.length > 0) {
        console.log('✅ FOUND DATA! First 3 rows:');
        response.data.slice(0, 3).forEach((row, i) => {
          console.log(`\n   Row ${i + 1}:`);
          console.log('   Date:', row.date);
          console.log('   App ID:', row.app_id);
          console.log('   Traffic Source:', row.traffic_source);
          console.log('   Impressions:', row.impressions);
          console.log('   Downloads:', row.downloads);
        });
      }

      if (response?.meta) {
        console.log('');
        console.log('🔍 Available Traffic Sources:');
        const sources = response.meta.availableTrafficSources || response.meta.available_traffic_sources || [];
        console.log('   Count:', sources.length);
        console.log('   Sources:', sources);
      }

      console.log('');
      console.log('📋 Full response:');
      console.log(JSON.stringify(response, null, 2).substring(0, 1000));
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
    console.log(err);
  }

  console.log('');
  console.log('='.repeat(80));
}

testBigQueryPipeline().catch(console.error);
