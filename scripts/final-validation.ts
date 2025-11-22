/**
 * Final Validation Script
 * Confirms all fixes are in place and system is operational
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';

async function runValidation() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   APP MONITORING SYSTEM - FINAL VALIDATION REPORT          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const checks = [];

  // Check 1: monitored_apps critical columns
  console.log('📋 Checking monitored_apps table...');
  const criticalColumns = ['app_id', 'platform', 'audit_enabled', 'latest_audit_score', 'latest_audit_at', 'locale', 'metadata_last_refreshed_at'];

  for (const col of criticalColumns) {
    const { error } = await supabase
      .from('monitored_apps')
      .select(col)
      .limit(0);

    if (error) {
      console.log(`   ❌ ${col}: ${error.message}`);
      checks.push({ name: `monitored_apps.${col}`, status: 'FAIL', error: error.message });
    } else {
      console.log(`   ✓ ${col}`);
      checks.push({ name: `monitored_apps.${col}`, status: 'PASS' });
    }
  }

  // Check 2: app_metadata_cache structure
  console.log('\n📋 Checking app_metadata_cache table...');
  const { error: cacheError } = await supabase
    .from('app_metadata_cache')
    .select('id, organization_id, app_id, platform, locale, version_hash, title, subtitle')
    .limit(0);

  if (cacheError) {
    console.log(`   ❌ Table access failed: ${cacheError.message}`);
    checks.push({ name: 'app_metadata_cache', status: 'FAIL', error: cacheError.message });
  } else {
    console.log('   ✓ Table accessible with expected columns');
    checks.push({ name: 'app_metadata_cache', status: 'PASS' });
  }

  // Check 3: audit_snapshots structure
  console.log('\n📋 Checking audit_snapshots table...');
  const { error: snapshotError } = await supabase
    .from('audit_snapshots')
    .select('id, organization_id, app_id, platform, locale, audit_score, metadata_version_hash, metadata_source')
    .limit(0);

  if (snapshotError) {
    console.log(`   ❌ Table access failed: ${snapshotError.message}`);
    checks.push({ name: 'audit_snapshots', status: 'FAIL', error: snapshotError.message });
  } else {
    console.log('   ✓ Table accessible with expected columns');
    checks.push({ name: 'audit_snapshots', status: 'PASS' });
  }

  // Check 4: Edge function health
  console.log('\n📋 Checking save-monitored-app edge function...');
  const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/save-monitored-app`;

  try {
    const response = await fetch(edgeFunctionUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:8083'
      }
    });

    const corsHeaders = {
      origin: response.headers.get('access-control-allow-origin'),
      methods: response.headers.get('access-control-allow-methods'),
      headers: response.headers.get('access-control-allow-headers')
    };

    if (corsHeaders.origin && corsHeaders.methods && corsHeaders.headers) {
      console.log('   ✓ Edge function deployed and responding');
      console.log('   ✓ CORS headers present:');
      console.log(`     - Origin: ${corsHeaders.origin}`);
      console.log(`     - Methods: ${corsHeaders.methods}`);
      console.log(`     - Headers: ${corsHeaders.headers}`);
      checks.push({ name: 'edge-function-cors', status: 'PASS' });
    } else {
      console.log('   ⚠ Edge function responding but CORS headers incomplete');
      checks.push({ name: 'edge-function-cors', status: 'WARN', note: 'CORS headers incomplete' });
    }
  } catch (err: any) {
    console.log(`   ❌ Edge function not accessible: ${err.message}`);
    checks.push({ name: 'edge-function-health', status: 'FAIL', error: err.message });
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      VALIDATION SUMMARY                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const passed = checks.filter(c => c.status === 'PASS').length;
  const failed = checks.filter(c => c.status === 'FAIL').length;
  const warned = checks.filter(c => c.status === 'WARN').length;

  console.log(`Total Checks: ${checks.length}`);
  console.log(`✓ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠ Warnings: ${warned}\n`);

  if (failed > 0) {
    console.log('❌ VALIDATION FAILED\n');
    console.log('Failed checks:');
    checks.filter(c => c.status === 'FAIL').forEach(c => {
      console.log(`  - ${c.name}: ${c.error}`);
    });
    console.log('\n');
  } else {
    console.log('✅ ALL CRITICAL VALIDATIONS PASSED\n');
    console.log('The App Monitoring & Metadata Caching system is operational.\n');
    console.log('Next steps:');
    console.log('  1. Test "Monitor App" functionality in the UI');
    console.log('  2. Verify Workspace Apps page displays monitored apps');
    console.log('  3. Test refresh and remove operations');
    console.log('  4. Monitor edge function logs for any errors\n');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
}

runValidation();
