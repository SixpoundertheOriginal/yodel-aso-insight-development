#!/usr/bin/env node
/**
 * Debug script to check cache status for Pimsleur app (app_id: 1405735469)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjgwNzA5OCwiZXhwIjoyMDYyMzgzMDk4fQ.vaBiZHIQ7Y5gsGPg2324rEu9InKtk9JDLz7L2mZp-Fo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('========================================');
  console.log('CACHE DEBUG: Pimsleur (app_id: 1405735469)');
  console.log('========================================\n');

  // Step 1: Check monitored_apps
  console.log('1️⃣ MONITORED_APPS:');
  const { data: monitoredApps, error: monitoredError } = await supabase
    .from('monitored_apps')
    .select('id, app_id, platform, locale, app_name, audit_enabled, latest_audit_score, latest_audit_at, metadata_last_refreshed_at, created_at, organization_id')
    .eq('app_id', '1405735469')
    .order('created_at', { ascending: false });

  if (monitoredError) {
    console.error('❌ Error:', monitoredError);
  } else if (!monitoredApps || monitoredApps.length === 0) {
    console.log('❌ No monitored_apps entries found');
  } else {
    console.log(`✅ Found ${monitoredApps.length} monitored_apps entries:`);
    monitoredApps.forEach(app => {
      console.log(JSON.stringify({
        id: app.id,
        organization_id: app.organization_id,
        app_id: app.app_id,
        platform: app.platform,
        locale: app.locale,
        app_name: app.app_name,
        audit_enabled: app.audit_enabled,
        latest_audit_score: app.latest_audit_score,
        latest_audit_at: app.latest_audit_at,
        metadata_last_refreshed_at: app.metadata_last_refreshed_at,
        created_at: app.created_at
      }, null, 2));
    });
  }

  console.log('\n2️⃣ APP_METADATA_CACHE:');
  const { data: metadataCache, error: cacheError } = await supabase
    .from('app_metadata_cache')
    .select('id, app_id, platform, locale, title, fetched_at, version_hash, organization_id')
    .eq('app_id', '1405735469')
    .order('fetched_at', { ascending: false });

  if (cacheError) {
    console.error('❌ Error:', cacheError);
  } else if (!metadataCache || metadataCache.length === 0) {
    console.log('❌ No app_metadata_cache entries found');
  } else {
    console.log(`✅ Found ${metadataCache.length} app_metadata_cache entries:`);
    metadataCache.forEach(cache => {
      console.log(JSON.stringify({
        id: cache.id,
        organization_id: cache.organization_id,
        app_id: cache.app_id,
        platform: cache.platform,
        locale: cache.locale,
        title: cache.title,
        fetched_at: cache.fetched_at,
        version_hash: cache.version_hash
      }, null, 2));
    });
  }

  console.log('\n3️⃣ AUDIT_SNAPSHOTS:');
  const { data: auditSnapshots, error: snapshotError } = await supabase
    .from('audit_snapshots')
    .select('id, app_id, platform, locale, audit_score, metadata_version, created_at, organization_id')
    .eq('app_id', '1405735469')
    .order('created_at', { ascending: false });

  if (snapshotError) {
    console.error('❌ Error:', snapshotError);
  } else if (!auditSnapshots || auditSnapshots.length === 0) {
    console.log('❌ No audit_snapshots entries found');
  } else {
    console.log(`✅ Found ${auditSnapshots.length} audit_snapshots entries:`);
    auditSnapshots.forEach(snapshot => {
      console.log(JSON.stringify({
        id: snapshot.id,
        organization_id: snapshot.organization_id,
        app_id: snapshot.app_id,
        platform: snapshot.platform,
        locale: snapshot.locale,
        audit_score: snapshot.audit_score,
        metadata_version: snapshot.metadata_version,
        created_at: snapshot.created_at
      }, null, 2));
    });
  }

  console.log('\n========================================');
  console.log('ANALYSIS:');
  console.log('========================================');

  if (monitoredApps && monitoredApps.length > 0) {
    const app = monitoredApps[0];
    const expectedKey = {
      organization_id: app.organization_id,
      app_id: app.app_id,
      platform: app.platform,
      locale: app.locale || 'us' // Normalization
    };

    console.log('\n🔑 Expected composite key (after normalization):');
    console.log(JSON.stringify(expectedKey, null, 2));

    // Check if cache exists with this key
    const matchingCache = metadataCache?.find(c =>
      c.organization_id === expectedKey.organization_id &&
      c.app_id === expectedKey.app_id &&
      c.platform === expectedKey.platform &&
      c.locale === expectedKey.locale
    );

    const matchingSnapshot = auditSnapshots?.find(s =>
      s.organization_id === expectedKey.organization_id &&
      s.app_id === expectedKey.app_id &&
      s.platform === expectedKey.platform &&
      s.locale === expectedKey.locale
    );

    if (matchingCache) {
      console.log('✅ Matching cache found!');
    } else {
      console.log('❌ NO matching cache found!');
      if (metadataCache && metadataCache.length > 0) {
        console.log('⚠️  Cache exists but with different key:');
        metadataCache.forEach(c => {
          console.log(`   - locale: '${c.locale}' (expected: '${expectedKey.locale}')`);
          console.log(`   - platform: '${c.platform}' (expected: '${expectedKey.platform}')`);
          console.log(`   - organization_id: '${c.organization_id}' (expected: '${expectedKey.organization_id}')`);
        });
      } else {
        console.log('\n💡 ROOT CAUSE: Cache was NEVER written to database!');
        console.log('   Possible reasons:');
        console.log('   1. User clicked "Monitor App" but usePersistAuditSnapshot was never called');
        console.log('   2. MonitorAppButton was clicked without auditData prop');
        console.log('   3. save-monitored-app edge function failed to persist cache');
      }
    }

    if (matchingSnapshot) {
      console.log('✅ Matching snapshot found!');
    } else {
      console.log('❌ NO matching snapshot found!');
      if (auditSnapshots && auditSnapshots.length > 0) {
        console.log('⚠️  Snapshot exists but with different key:');
        auditSnapshots.forEach(s => {
          console.log(`   - locale: '${s.locale}' (expected: '${expectedKey.locale}')`);
          console.log(`   - platform: '${s.platform}' (expected: '${expectedKey.platform}')`);
        });
      } else {
        console.log('\n💡 ROOT CAUSE: Snapshot was NEVER written to database!');
      }
    }
  }
}

main().catch(console.error);
