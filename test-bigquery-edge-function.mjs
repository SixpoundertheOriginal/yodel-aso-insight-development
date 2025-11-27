import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testBigQueryEdgeFunction() {
  console.log('🔍 Testing BigQuery Edge Function...\n');
  console.log('=' .repeat(80));

  // First, get CLI user's auth
  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById('cli@yodelmobile.com');

  if (userError) {
    console.error('❌ Could not get CLI user:', userError);
    return;
  }

  console.log('📋 Found user:', user?.email);

  // Make request to edge function
  const requestBody = {
    organizationId: '7cccba3f-0a8f-446f-9dba-86e9cb68c92b',
    dateRange: {
      from: '2025-10-27',
      to: '2025-11-26'
    },
    selectedApps: [],
    trafficSources: []
  };

  console.log('\n📤 Request Body:');
  console.log(JSON.stringify(requestBody, null, 2));
  console.log('');

  const startTime = Date.now();

  const { data: response, error: functionError } = await supabase.functions.invoke(
    'bigquery-aso-data',
    {
      body: requestBody
    }
  );

  const duration = Date.now() - startTime;

  if (functionError) {
    console.error('❌ Edge Function Error:', functionError);
    return;
  }

  console.log('━'.repeat(80));
  console.log('📥 RESPONSE RECEIVED');
  console.log('━'.repeat(80));
  console.log(`⏱️  Duration: ${duration}ms\n`);

  console.log('✅ Success:', response.success);
  console.log('📊 Data rows:', response.data?.length || 0);
  console.log('');

  if (response.meta) {
    console.log('🔍 META OBJECT:');
    console.log('  Keys:', Object.keys(response.meta).join(', '));
    console.log('');

    // Check for traffic sources (both naming conventions)
    if (response.meta.available_traffic_sources) {
      console.log('✅ available_traffic_sources (snake_case):', response.meta.available_traffic_sources);
    } else if (response.meta.availableTrafficSources) {
      console.log('✅ availableTrafficSources (camelCase):', response.meta.availableTrafficSources);
    } else {
      console.log('❌ NO traffic sources field found in meta');
    }

    console.log('');
    console.log('📋 Full meta object:');
    console.log(JSON.stringify(response.meta, null, 2));
  } else {
    console.log('❌ NO META FIELD in response!');
  }

  console.log('');
  console.log('━'.repeat(80));
  console.log('📄 FULL RESPONSE:');
  console.log('━'.repeat(80));
  console.log(JSON.stringify(response, null, 2));
  console.log('');
}

testBigQueryEdgeFunction().catch(console.error);
