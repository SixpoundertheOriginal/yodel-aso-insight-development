import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBigQueryData() {
  console.log('🔍 Checking BigQuery Data Setup\n');
  console.log('='.repeat(80));
  console.log('');

  const cliUserId = '8920ac57-63da-4f8e-9970-719be1e2569c';
  const yodelOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  // Step 1: Get agency relationships
  console.log('🏢 Step 1: Get agency relationships');
  const { data: managedClients } = await supabase
    .from('agency_clients')
    .select('client_org_id')
    .eq('agency_org_id', yodelOrgId)
    .eq('is_active', true);

  const orgIds = [yodelOrgId];
  if (managedClients && managedClients.length > 0) {
    orgIds.push(...managedClients.map(c => c.client_org_id));
    console.log('   ✅ Agency mode: querying', orgIds.length, 'organizations');
  } else {
    console.log('   ⚠️  No agency relationships found');
  }
  console.log('');

  // Step 2: Get all accessible apps
  console.log('📱 Step 2: Get accessible apps from all organizations');
  const { data: accessData } = await supabase
    .from('org_app_access')
    .select('app_id')
    .in('organization_id', orgIds)
    .is('detached_at', null);

  const appIds = (accessData || []).map(a => a.app_id).filter(Boolean);
  console.log('   Found', appIds.length, 'apps:');
  appIds.forEach(id => console.log('   -', id));
  console.log('');

  // Step 3: Check if apps exist in apps table
  console.log('🔍 Step 3: Verify apps exist in apps table');
  const { data: apps } = await supabase
    .from('apps')
    .select('id, name, bundle_id')
    .in('id', appIds);

  console.log('   Found', apps?.length || 0, 'apps in apps table:');
  if (apps && apps.length > 0) {
    apps.forEach(app => {
      console.log(`   - ${app.name || 'Unnamed'} (${app.id})`);
      console.log(`     Bundle ID: ${app.bundle_id || 'N/A'}`);
    });
  }
  console.log('');

  // Step 4: Check BigQuery credentials
  console.log('🔑 Step 4: Check BigQuery credentials');
  const { data: settings } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', ['bigquery_credentials', 'bigquery_project_id'])
    .limit(10);

  const hasCreds = settings?.some(s => s.key === 'bigquery_credentials' && s.value);
  const hasProjectId = settings?.some(s => s.key === 'bigquery_project_id' && s.value);

  console.log('   BigQuery Credentials:', hasCreds ? '✅ Configured' : '❌ Missing');
  console.log('   BigQuery Project ID:', hasProjectId ? '✅ Configured' : '❌ Missing');

  if (hasProjectId) {
    const projectIdSetting = settings.find(s => s.key === 'bigquery_project_id');
    console.log('   Project ID:', projectIdSetting?.value || 'Unknown');
  }
  console.log('');

  // Step 5: Show what query would be sent to BigQuery
  console.log('📊 Step 5: BigQuery Query Preview');
  console.log('─'.repeat(80));
  console.log('Expected query to BigQuery:');
  console.log('');
  console.log('  SELECT date, app_id, traffic_source, impressions, ...');
  console.log('  FROM `PROJECT_ID.client_reports.aso_all_apple`');
  console.log('  WHERE COALESCE(app_id, client) IN UNNEST(@app_ids)');
  console.log('    AND date BETWEEN @start_date AND @end_date');
  console.log('');
  console.log('Parameters:');
  console.log('  @app_ids:', appIds.length > 0 ? appIds : 'EMPTY ARRAY ❌');
  console.log('  @start_date: (from user selection, e.g., 2024-11-26)');
  console.log('  @end_date: (from user selection, e.g., 2025-11-26)');
  console.log('─'.repeat(80));
  console.log('');

  // Final diagnosis
  console.log('='.repeat(80));
  console.log('📋 DIAGNOSIS:');
  console.log('='.repeat(80));
  console.log('');

  if (appIds.length === 0) {
    console.log('❌ No apps found - BigQuery query will return 0 rows');
    console.log('   Cause: org_app_access table has no apps for these organizations');
  } else if (!hasCreds || !hasProjectId) {
    console.log('❌ BigQuery credentials not configured');
    console.log('   Cause: Missing credentials or project ID in system_settings');
  } else {
    console.log('✅ Setup looks correct');
    console.log('');
    console.log('Possible reasons for 0 data:');
    console.log('1. App IDs in BigQuery might use different format (e.g., bundle_id instead of app.id)');
    console.log('2. Date range selected might not have data in BigQuery');
    console.log('3. BigQuery table name might be incorrect');
    console.log('4. Data in BigQuery is under different column names');
    console.log('');
    console.log('💡 Recommended: Check BigQuery console to verify:');
    console.log('   - Table name: client_reports.aso_all_apple exists');
    console.log('   - Data exists for these app IDs:', appIds.slice(0, 3).join(', '));
    console.log('   - Check what the app_id or client column contains');
  }
  console.log('');
}

checkBigQueryData().catch(console.error);
