/**
 * Diagnostic script to check monitored apps data
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnose() {
  console.log('🔍 Diagnosing Monitored Apps Issues\n');

  // Check monitored_apps table
  console.log('1. Checking monitored_apps table:');
  const { data: monitoredApps, error: monitoredError } = await supabase
    .from('monitored_apps')
    .select('id, app_id, app_name, latest_audit_score, latest_audit_at, validated_state')
    .order('created_at', { ascending: false })
    .limit(5);

  if (monitoredError) {
    console.error('Error:', monitoredError);
  } else {
    console.table(monitoredApps);
  }

  // Check aso_audit_snapshots table
  console.log('\n2. Checking aso_audit_snapshots table:');
  const { data: snapshots, error: snapshotError } = await supabase
    .from('aso_audit_snapshots')
    .select('id, monitored_app_id, app_id, overall_score, title, subtitle, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (snapshotError) {
    console.error('Error:', snapshotError);
  } else {
    console.table(snapshots);
  }

  // Check app_metadata_cache table
  console.log('\n3. Checking app_metadata_cache table:');
  const { data: caches, error: cacheError } = await supabase
    .from('app_metadata_cache')
    .select('id, app_id, app_name, title, subtitle, fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(5);

  if (cacheError) {
    console.error('Error:', cacheError);
  } else {
    console.table(caches);
  }

  // Detailed analysis of first monitored app
  if (monitoredApps && monitoredApps.length > 0) {
    const firstApp = monitoredApps[0];
    console.log('\n4. Detailed analysis of:', firstApp.app_name);
    console.log('   Monitored App ID:', firstApp.id);
    console.log('   Latest Audit Score:', firstApp.latest_audit_score);
    console.log('   Latest Audit At:', firstApp.latest_audit_at);
    console.log('   Validated State:', firstApp.validated_state);

    // Check if snapshot exists
    const { data: appSnapshot } = await supabase
      .from('aso_audit_snapshots')
      .select('*')
      .eq('monitored_app_id', firstApp.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (appSnapshot) {
      console.log('\n   ✅ Bible Snapshot exists:');
      console.log('      Overall Score:', appSnapshot.overall_score);
      console.log('      Title:', appSnapshot.title);
      console.log('      Subtitle:', appSnapshot.subtitle || '(null)');
      console.log('      Created:', appSnapshot.created_at);
    } else {
      console.log('\n   ❌ No Bible Snapshot found');
    }

    // Check if cache exists
    const { data: appCache } = await supabase
      .from('app_metadata_cache')
      .select('*')
      .eq('app_id', firstApp.app_id)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (appCache) {
      console.log('\n   ✅ Metadata Cache exists:');
      console.log('      Title:', appCache.title);
      console.log('      Subtitle:', appCache.subtitle || '(null)');
      console.log('      Fetched:', appCache.fetched_at);
    } else {
      console.log('\n   ❌ No Metadata Cache found');
    }
  }
}

diagnose().catch(console.error);
