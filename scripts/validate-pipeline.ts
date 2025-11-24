/**
 * Validate subtitle propagation pipeline
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function validatePipeline() {
  console.log('🔍 Step 3: Pipeline Integrity Validation\n');

  // 1. Check most recent cache entry
  console.log('1️⃣  Checking app_metadata_cache...');
  const { data: cacheData, error: cacheError } = await supabase
    .from('app_metadata_cache')
    .select('app_id, title, subtitle, _metadata_source, fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(1);

  if (cacheError) {
    console.error('❌ Cache query error:', cacheError);
  } else if (!cacheData || cacheData.length === 0) {
    console.log('⚠️  No cache entries found');
  } else {
    const cache = cacheData[0];
    console.log('   App ID:', cache.app_id);
    console.log('   Title:', cache.title);
    console.log('   Subtitle:', cache.subtitle || '(NULL)');
    console.log('   Source:', cache._metadata_source || '(NULL)');
    console.log('   Fetched:', cache.fetched_at);
    console.log(cache.subtitle ? '   ✅ Subtitle present in cache' : '   ❌ Subtitle missing in cache');
  }

  // 2. Check most recent audit snapshot
  console.log('\n2️⃣  Checking aso_audit_snapshots...');
  const { data: snapshotData, error: snapshotError } = await supabase
    .from('aso_audit_snapshots')
    .select('app_id, title, subtitle, overall_score, created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (snapshotError) {
    console.error('❌ Snapshot query error:', snapshotError);
  } else if (!snapshotData || snapshotData.length === 0) {
    console.log('⚠️  No audit snapshots found');
  } else {
    const snapshot = snapshotData[0];
    console.log('   App ID:', snapshot.app_id);
    console.log('   Title:', snapshot.title);
    console.log('   Subtitle:', snapshot.subtitle || '(NULL)');
    console.log('   Overall Score:', snapshot.overall_score);
    console.log('   Created:', snapshot.created_at);
    console.log(snapshot.subtitle ? '   ✅ Subtitle present in snapshot' : '   ❌ Subtitle missing in snapshot');
    console.log(snapshot.overall_score > 0 ? '   ✅ Bible audit generated' : '   ❌ Bible audit failed or placeholder');
  }

  // 3. Check most recent monitored app
  console.log('\n3️⃣  Checking monitored_apps...');
  const { data: monitoredData, error: monitoredError } = await supabase
    .from('monitored_apps')
    .select('app_id, app_name, latest_audit_score, validated_state, created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (monitoredError) {
    console.error('❌ Monitored apps query error:', monitoredError);
  } else if (!monitoredData || monitoredData.length === 0) {
    console.log('⚠️  No monitored apps found');
  } else {
    const monitored = monitoredData[0];
    console.log('   App ID:', monitored.app_id);
    console.log('   App Name:', monitored.app_name);
    console.log('   Latest Audit Score:', monitored.latest_audit_score || '(NULL)');
    console.log('   Validated State:', monitored.validated_state);
    console.log('   Created:', monitored.created_at);
    console.log(monitored.latest_audit_score !== null ? '   ✅ Audit score recorded' : '   ❌ Audit score missing');
  }

  // 4. Cross-reference analysis
  console.log('\n4️⃣  Cross-Reference Analysis...');

  if (cacheData && cacheData.length > 0 && monitoredData && monitoredData.length > 0) {
    const cache = cacheData[0];
    const monitored = monitoredData[0];

    if (cache.app_id === monitored.app_id) {
      console.log(`   📌 Analyzing app: ${monitored.app_name} (${cache.app_id})`);

      // Check if snapshot exists for this app
      const { data: appSnapshot } = await supabase
        .from('aso_audit_snapshots')
        .select('app_id, title, subtitle, overall_score')
        .eq('app_id', cache.app_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      console.log('\n   Pipeline Flow:');
      console.log(`   1. Cache has subtitle: ${cache.subtitle ? '✅ YES' : '❌ NO'}`);
      console.log(`   2. Snapshot has subtitle: ${appSnapshot?.subtitle ? '✅ YES' : '❌ NO'}`);
      console.log(`   3. Snapshot has audit score: ${appSnapshot?.overall_score ? '✅ YES' : '❌ NO'}`);
      console.log(`   4. Monitored app has score: ${monitored.latest_audit_score !== null ? '✅ YES' : '❌ NO'}`);

      // Identify failures
      console.log('\n   🔴 Issues Detected:');
      let issuesFound = false;

      if (!cache.subtitle) {
        console.log('   • Subtitle missing from cache (UI → cache propagation failed)');
        issuesFound = true;
      }

      if (!appSnapshot?.subtitle && cache.subtitle) {
        console.log('   • Subtitle missing from snapshot but present in cache (cache → snapshot propagation failed)');
        issuesFound = true;
      }

      if (!appSnapshot?.overall_score || appSnapshot.overall_score === 0) {
        console.log('   • Bible audit not generated or returned 0 score');
        issuesFound = true;
      }

      if (monitored.latest_audit_score === null && appSnapshot?.overall_score) {
        console.log('   • Audit score in snapshot but not propagated to monitored_apps');
        issuesFound = true;
      }

      if (!issuesFound) {
        console.log('   ✅ No issues detected - pipeline is healthy!');
      }
    } else {
      console.log('   ⚠️  Most recent cache and monitored app are different apps');
      console.log(`   Cache: ${cache.app_id}`);
      console.log(`   Monitored: ${monitored.app_id}`);
    }
  }

  console.log('\n' + '='.repeat(60));
}

validatePipeline().catch(console.error);
