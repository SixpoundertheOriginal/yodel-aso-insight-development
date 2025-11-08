/**
 * Direct test of deployed bigquery-aso-data Edge Function
 * This bypasses the frontend hook to see actual response format
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';

console.log('━'.repeat(80));
console.log('🧪 DIRECT EDGE FUNCTION TEST - bigquery-aso-data');
console.log('━'.repeat(80));

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEdgeFunction() {
  try {
    // Step 1: Authenticate
    console.log('\n📝 STEP 1: Authenticating as cli@yodelmobile.com...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'cli@yodelmobile.com',
      password: 'testpassword123'
    });

    if (authError) {
      console.error('❌ Auth failed:', authError.message);
      console.log('\n💡 TIP: Update password in script if needed');
      return;
    }

    console.log('✅ Authenticated');
    console.log('   User ID:', authData.user.id);
    console.log('   Email:', authData.user.email);

    // Step 2: Get organization info
    console.log('\n📝 STEP 2: Getting user organization...');
    const { data: permissions, error: permError } = await supabase
      .from('user_permissions_unified')
      .select('*')
      .eq('user_id', authData.user.id)
      .limit(1);

    if (permError || !permissions || permissions.length === 0) {
      console.error('❌ Failed to get permissions:', permError?.message || 'No permissions found');
      return;
    }

    const orgId = permissions[0].org_id;
    const orgName = permissions[0].org_name;

    console.log('✅ Organization found');
    console.log('   Org ID:', orgId);
    console.log('   Org Name:', orgName);

    // Step 3: Check demo_mode setting
    console.log('\n📝 STEP 3: Checking organization demo_mode...');
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, demo_mode, settings')
      .eq('id', orgId)
      .single();

    if (orgError) {
      console.error('❌ Failed to get org settings:', orgError.message);
    } else {
      console.log('✅ Organization settings:');
      console.log('   demo_mode:', orgData.demo_mode);
      console.log('   settings:', JSON.stringify(orgData.settings, null, 2));
    }

    // Step 4: Call Edge Function
    console.log('\n📝 STEP 4: Calling bigquery-aso-data Edge Function...');

    const requestBody = {
      org_id: orgId,
      date_range: {
        start: '2024-10-01',
        end: '2024-11-04'
      },
      metrics: ['impressions', 'installs', 'cvr'],
      granularity: 'daily'
    };

    console.log('   Request body:', JSON.stringify(requestBody, null, 2));
    console.log('   Calling function...');

    const startTime = Date.now();
    const { data: response, error: fnError } = await supabase.functions.invoke(
      'bigquery-aso-data',
      { body: requestBody }
    );
    const duration = Date.now() - startTime;

    console.log(`   Response time: ${duration}ms`);

    if (fnError) {
      console.error('❌ Edge Function error:', fnError);
      return;
    }

    // Step 5: Analyze Response Structure
    console.log('\n📝 STEP 5: Response Structure Analysis');
    console.log('━'.repeat(80));

    console.log('\n🔍 TOP-LEVEL KEYS:');
    console.log('   Keys:', Object.keys(response).join(', '));

    console.log('\n🔍 TOP-LEVEL FIELDS:');
    for (const [key, value] of Object.entries(response)) {
      const type = Array.isArray(value) ? 'Array' : typeof value;
      const info = Array.isArray(value)
        ? `Array(${value.length})`
        : type === 'object' && value !== null
          ? `Object with keys: ${Object.keys(value).join(', ')}`
          : String(value);
      console.log(`   ${key}: ${type} - ${info}`);
    }

    if (response.data) {
      console.log('\n🔍 response.data STRUCTURE:');
      console.log('   Type:', Array.isArray(response.data) ? 'Array' : typeof response.data);

      if (Array.isArray(response.data)) {
        console.log('   Length:', response.data.length);
        console.log('   First item:', response.data[0] ? JSON.stringify(response.data[0], null, 2) : 'N/A');
      } else if (typeof response.data === 'object') {
        console.log('   Keys:', Object.keys(response.data).join(', '));
        for (const [key, value] of Object.entries(response.data)) {
          const type = Array.isArray(value) ? `Array(${value.length})` : typeof value;
          console.log(`   data.${key}: ${type}`);
        }
      }
    }

    if (response.meta) {
      console.log('\n🔍 response.meta STRUCTURE:');
      console.log('   Keys:', Object.keys(response.meta).join(', '));
      console.log('   Full meta:', JSON.stringify(response.meta, null, 2));
    }

    if (response.scope) {
      console.log('\n🔍 response.scope STRUCTURE:');
      console.log('   Keys:', Object.keys(response.scope).join(', '));
      console.log('   Full scope:', JSON.stringify(response.scope, null, 2));
    }

    console.log('\n📋 FULL RESPONSE:');
    console.log(JSON.stringify(response, null, 2));

    // Step 6: Format Determination
    console.log('\n📝 STEP 6: Format Determination');
    console.log('━'.repeat(80));

    const hasSuccessField = 'success' in response;
    const dataIsArray = Array.isArray(response.data);
    const dataHasSummary = response.data && typeof response.data === 'object' && 'summary' in response.data;
    const dataHasTimeseries = response.data && typeof response.data === 'object' && 'timeseries' in response.data;
    const hasProcessedField = 'processed' in response;

    console.log('✅ Format Analysis:');
    console.log(`   Has 'success' field: ${hasSuccessField ? '✅ YES' : '❌ NO'}`);
    console.log(`   response.data is Array: ${dataIsArray ? '✅ YES (raw rows)' : '❌ NO'}`);
    console.log(`   response.data has 'summary': ${dataHasSummary ? '✅ YES (processed)' : '❌ NO'}`);
    console.log(`   response.data has 'timeseries': ${dataHasTimeseries ? '✅ YES (processed)' : '❌ NO'}`);
    console.log(`   Has 'processed' field: ${hasProcessedField ? '✅ YES' : '❌ NO'}`);

    console.log('\n🎯 CONCLUSION:');
    if (dataIsArray) {
      console.log('   Format: RAW BIGQUERY ROWS (as per local Edge Function code)');
    } else if (dataHasSummary && dataHasTimeseries) {
      console.log('   Format: PROCESSED/DEMO DATA (aggregated format)');
    } else {
      console.log('   Format: UNKNOWN - neither raw nor processed');
    }

    console.log('\n━'.repeat(80));
    console.log('✅ TEST COMPLETE');
    console.log('━'.repeat(80));

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error);
  } finally {
    await supabase.auth.signOut();
  }
}

testEdgeFunction();
