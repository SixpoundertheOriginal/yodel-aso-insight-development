import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';

async function testBigQueryWithAuth() {
  console.log('🔍 Testing BigQuery Edge Function with Authentication\n');
  console.log('='.repeat(80));
  console.log('');

  // Step 1: Create an auth session for CLI user using admin API
  console.log('🔐 Step 1: Creating auth session for cli@yodelmobile.com');

  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Get CLI user
  const { data: userData, error: userError } = await adminClient.auth.admin.listUsers();

  if (userError) {
    console.log('❌ Error fetching users:', userError.message);
    return;
  }

  const cliUser = userData.users.find(u => u.email === 'cli@yodelmobile.com');

  if (!cliUser) {
    console.log('❌ CLI user not found');
    return;
  }

  console.log('✅ Found CLI user:', cliUser.id);
  console.log('');

  // Step 2: Generate a session token for this user
  console.log('🎫 Step 2: Generating session token');

  const { data: sessionData, error: sessionError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'cli@yodelmobile.com'
  });

  if (sessionError) {
    console.log('❌ Error generating session:', sessionError.message);
    return;
  }

  console.log('✅ Session link generated');
  console.log('');

  // Step 3: Create authenticated client
  console.log('🔑 Step 3: Creating authenticated client');

  // Extract the token from the magic link
  const urlParams = new URL(sessionData.properties.action_link).searchParams;
  const token = urlParams.get('token');
  const type = urlParams.get('type');

  console.log('   Token type:', type);
  console.log('');

  // Verify with the token
  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: verifyData, error: verifyError } = await authClient.auth.verifyOtp({
    token_hash: token,
    type: 'magiclink'
  });

  if (verifyError) {
    console.log('❌ Error verifying token:', verifyError.message);
    console.log('   Trying alternative approach...\n');

    // Alternative: Use service role to directly call the function
    await testWithServiceRole();
    return;
  }

  console.log('✅ Authenticated successfully');
  console.log('   User:', verifyData.user?.email);
  console.log('   Access Token:', verifyData.session?.access_token?.substring(0, 20) + '...');
  console.log('');

  // Step 4: Invoke BigQuery edge function
  console.log('🚀 Step 4: Invoking BigQuery edge function');
  console.log('');

  const requestBody = {
    organizationId: '7cccba3f-0a8f-446f-9dba-86e9cb68c92b',
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

  const { data: response, error: functionError } = await authClient.functions.invoke(
    'bigquery-aso-data',
    {
      body: requestBody
    }
  );

  console.log('='.repeat(80));
  console.log('📥 RESPONSE FROM BIGQUERY');
  console.log('='.repeat(80));
  console.log('');

  if (functionError) {
    console.log('❌ Function Error:');
    console.log(JSON.stringify(functionError, null, 2));
    return;
  }

  console.log('✅ Success:', response?.success);
  console.log('');

  if (response?.error) {
    console.log('❌ Error:', response.error);
    if (response.details) console.log('   Details:', response.details);
    if (response.hint) console.log('   Hint:', response.hint);
    console.log('');
  }

  if (response?.data) {
    console.log('📊 DATA ROWS:', response.data.length);
    console.log('');

    if (response.data.length > 0) {
      console.log('✅ FOUND BIGQUERY DATA!');
      console.log('');
      console.log('First 5 rows:');
      console.log('─'.repeat(80));
      response.data.slice(0, 5).forEach((row, i) => {
        console.log(`\nRow ${i + 1}:`);
        console.log('  Date:', row.date);
        console.log('  App ID:', row.app_id);
        console.log('  Traffic Source:', row.traffic_source);
        console.log('  Impressions:', row.impressions);
        console.log('  Product Page Views:', row.product_page_views);
        console.log('  Downloads:', row.downloads);
        console.log('  Conversion Rate:', row.conversion_rate);
      });
      console.log('');
      console.log('─'.repeat(80));
    } else {
      console.log('⚠️  NO DATA ROWS RETURNED');
      console.log('');
      console.log('This means BigQuery query executed but returned 0 rows.');
      console.log('');
      console.log('Possible reasons:');
      console.log('1. App IDs in database don\'t match BigQuery');
      console.log('2. Date range has no data');
      console.log('3. BigQuery table structure is different');
    }
  }

  if (response?.meta) {
    console.log('');
    console.log('🎯 TRAFFIC SOURCES:');
    const sources = response.meta.availableTrafficSources || response.meta.available_traffic_sources || [];
    console.log('   Count:', sources.length);
    if (sources.length > 0) {
      sources.forEach(s => console.log('   -', s));
    } else {
      console.log('   ⚠️  No traffic sources available');
    }
  } else {
    console.log('');
    console.log('❌ NO META FIELD in response');
    console.log('   This suggests the "No apps" path was hit');
  }

  if (response?.scope) {
    console.log('');
    console.log('📍 SCOPE:');
    console.log('   Organization ID:', response.scope.organization_id);
    console.log('   App IDs:', response.scope.app_ids?.length || 0);
    console.log('   Scope Source:', response.scope.scope_source);
    if (response.scope.app_ids && response.scope.app_ids.length > 0) {
      console.log('   Apps:', response.scope.app_ids.slice(0, 3).join(', '), '...');
    }
  }

  console.log('');
  console.log('='.repeat(80));
}

async function testWithServiceRole() {
  console.log('🔧 Alternative: Testing with service role (bypassing user auth)\n');

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  const requestBody = {
    organizationId: '7cccba3f-0a8f-446f-9dba-86e9cb68c92b',
    dateRange: {
      from: '2024-11-01',
      to: '2024-11-30'
    },
    selectedApps: [],
    trafficSources: []
  };

  console.log('📤 Request (with service role):');
  console.log(JSON.stringify(requestBody, null, 2));
  console.log('');

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/bigquery-aso-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    console.log('📥 Response Status:', response.status);
    console.log('');
    console.log('Response Body:');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.log('❌ Error:', err.message);
  }
}

testBigQueryWithAuth().catch(console.error);
