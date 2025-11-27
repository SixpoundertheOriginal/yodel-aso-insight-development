import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testBigQueryDirect() {
  console.log('🔍 Testing BigQuery Edge Function (Direct Call)...\n');
  console.log('=' .repeat(80));

  const requestBody = {
    organizationId: '7cccba3f-0a8f-446f-9dba-86e9cb68c92b',
    dateRange: {
      from: '2025-10-27',
      to: '2025-11-26'
    },
    selectedApps: [],
    trafficSources: []
  };

  console.log('📤 Request Body:');
  console.log(JSON.stringify(requestBody, null, 2));
  console.log('');

  const startTime = Date.now();

  // Using service role key to bypass auth
  const { data: response, error: functionError } = await supabase.functions.invoke(
    'bigquery-aso-data',
    {
      body: requestBody
    }
  );

  const duration = Date.now() - startTime;

  console.log('━'.repeat(80));
  console.log('📥 RESPONSE RECEIVED');
  console.log('━'.repeat(80));
  console.log(`⏱️  Duration: ${duration}ms\n`);

  if (functionError) {
    console.error('❌ Edge Function Error:');
    console.error(functionError);
    return;
  }

  console.log('✅ Success:', response.success);

  if (response.error) {
    console.log('❌ Error:', response.error);
    if (response.details) {
      console.log('   Details:', response.details);
    }
    if (response.hint) {
      console.log('   Hint:', response.hint);
    }
  }

  console.log('📊 Data rows:', response.data?.length || 0);
  console.log('');

  if (response.meta) {
    console.log('🔍 META OBJECT FOUND:');
    console.log('  Keys:', Object.keys(response.meta).join(', '));
    console.log('');

    // Check for traffic sources (both naming conventions)
    if (response.meta.available_traffic_sources) {
      console.log('✅ available_traffic_sources (snake_case):');
      console.log('   Count:', response.meta.available_traffic_sources.length);
      console.log('   Values:', response.meta.available_traffic_sources);
    } else if (response.meta.availableTrafficSources) {
      console.log('✅ availableTrafficSources (camelCase):');
      console.log('   Count:', response.meta.availableTrafficSources.length);
      console.log('   Values:', response.meta.availableTrafficSources);
    } else {
      console.log('❌ NO traffic sources field found in meta');
      console.log('   Available fields:', Object.keys(response.meta).join(', '));
    }

    console.log('');
    console.log('📋 Full meta object:');
    console.log(JSON.stringify(response.meta, null, 2));
  } else {
    console.log('❌ NO META FIELD in response!');
  }

  if (response.scope) {
    console.log('');
    console.log('📍 SCOPE:');
    console.log(JSON.stringify(response.scope, null, 2));
  }

  console.log('');
  console.log('━'.repeat(80));
  console.log('📄 FULL RESPONSE (first 2000 chars):');
  console.log('━'.repeat(80));
  const fullResponse = JSON.stringify(response, null, 2);
  console.log(fullResponse.substring(0, 2000));
  if (fullResponse.length > 2000) {
    console.log('...[truncated]');
  }
  console.log('');
}

testBigQueryDirect().catch(console.error);
