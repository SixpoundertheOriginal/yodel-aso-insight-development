/**
 * Inspect actual monitored_apps table schema
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';

async function inspectSchema() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('Testing column access on monitored_apps table:\n');

  const testColumns = [
    'id',
    'organization_id',
    'app_id',
    'app_store_id',
    'platform',
    'app_name',
    'bundle_id',
    'audit_enabled',
    'latest_audit_score',
    'latest_audit_at',
    'locale',
    'metadata_last_refreshed_at'
  ];

  for (const col of testColumns) {
    const { data, error } = await supabase
      .from('monitored_apps')
      .select(col)
      .limit(0);

    if (error) {
      console.log(`❌ ${col}: ${error.message}`);
    } else {
      console.log(`✓ ${col}: exists`);
    }
  }

  console.log('\n\nAttempting to insert a test row to see exact error:\n');

  const { data, error } = await supabase
    .from('monitored_apps')
    .insert({
      organization_id: '00000000-0000-0000-0000-000000000000',
      app_id: 'test123',
      platform: 'ios',
      app_name: 'Test App',
      primary_country: 'us',
      monitor_type: 'audit',
      audit_enabled: true
    })
    .select();

  if (error) {
    console.log('Insert error (expected):');
    console.log('  Message:', error.message);
    console.log('  Code:', error.code);
    console.log('  Details:', JSON.stringify(error.details, null, 2));
  } else {
    console.log('Insert succeeded (unexpected - cleaning up)');
    if (data && data.length > 0) {
      await supabase.from('monitored_apps').delete().eq('id', data[0].id);
    }
  }
}

inspectSchema();
