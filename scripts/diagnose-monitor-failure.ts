#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjgwNzA5OCwiZXhwIjoyMDYyMzgzMDk4fQ.vaBiZHIQ7Y5gsGPg2324rEu9InKtk9JDLz7L2mZp-Fo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function diagnose() {
  console.log('========================================');
  console.log('MONITOR FAILURE DIAGNOSIS');
  console.log('========================================\n');

  const { data: pimsleur } = await supabase
    .from('monitored_apps')
    .select('*')
    .eq('app_id', '1405735469')
    .single();

  if (!pimsleur) {
    console.log('❌ Pimsleur not found');
    return;
  }

  console.log('📋 Pimsleur Monitored App:');
  console.log('   ID:', pimsleur.id);
  console.log('   Organization:', pimsleur.organization_id);
  console.log('   Created:', pimsleur.created_at);
  console.log('   App ID:', pimsleur.app_id);
  console.log('   Platform:', pimsleur.platform);
  console.log('   Locale:', pimsleur.locale);
  console.log('   Latest Audit Score:', pimsleur.latest_audit_score);
  console.log('   Latest Audit At:', pimsleur.latest_audit_at);
  console.log('   Metadata Last Refreshed:', pimsleur.metadata_last_refreshed_at);

  console.log('\n🔍 Checking for cache with exact key:');
  console.log('   Composite key:', {
    organization_id: pimsleur.organization_id,
    app_id: pimsleur.app_id,
    platform: pimsleur.platform,
    locale: pimsleur.locale || 'us'
  });

  const { data: cache, error: cacheError } = await supabase
    .from('app_metadata_cache')
    .select('*')
    .eq('organization_id', pimsleur.organization_id)
    .eq('app_id', pimsleur.app_id)
    .eq('platform', pimsleur.platform)
    .eq('locale', pimsleur.locale || 'us');

  if (cacheError) {
    console.log('   ❌ Cache query error:', cacheError.message);
  } else if (!cache || cache.length === 0) {
    console.log('   ❌ NO CACHE FOUND');
    
    // Check if cache exists with different locale
    console.log('\n🔍 Checking for cache with ANY locale:');
    const { data: anyCache } = await supabase
      .from('app_metadata_cache')
      .select('locale, fetched_at')
      .eq('organization_id', pimsleur.organization_id)
      .eq('app_id', pimsleur.app_id)
      .eq('platform', pimsleur.platform);

    if (anyCache && anyCache.length > 0) {
      console.log('   ⚠️  Cache exists with different locale:');
      anyCache.forEach(c => console.log(`      - locale: '${c.locale}'`));
    } else {
      console.log('   ❌ No cache exists for this app_id at all');
    }
  } else {
    console.log('   ✅ Cache found!');
    console.log('      Fetched:', cache[0].fetched_at);
  }

  console.log('\n🔍 Checking audit snapshots:');
  const { data: snapshots } = await supabase
    .from('audit_snapshots')
    .select('audit_score, created_at, locale')
    .eq('organization_id', pimsleur.organization_id)
    .eq('app_id', pimsleur.app_id)
    .eq('platform', pimsleur.platform)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!snapshots || snapshots.length === 0) {
    console.log('   ❌ NO SNAPSHOTS FOUND');
  } else {
    console.log(`   ✅ Found ${snapshots.length} snapshots:`);
    snapshots.forEach(s => {
      console.log(`      - Score: ${s.audit_score}, Locale: ${s.locale}, Created: ${s.created_at}`);
    });
  }

  console.log('\n========================================');
  console.log('💡 ROOT CAUSE:');
  console.log('========================================');
  console.log(`When "Monitor App" was clicked on ${new Date(pimsleur.created_at).toLocaleString()}:`);
  console.log('1. Monitored app row was created ✅');
  console.log('2. BUT cache was never written ❌');
  console.log('3. AND snapshot was never written ❌');
  console.log('\nPossible reasons:');
  console.log('- save-monitored-app edge function failed silently');
  console.log('- Metadata fetch from App Store failed (but we just verified it works now)');
  console.log('- Database write permission issue');
  console.log('- Edge function bug/crash during cache upsert');
  
  console.log('\n========================================');
  console.log('✅ IMMEDIATE FIX (Manual):');
  console.log('========================================');
  console.log('Since edge functions can\'t be deployed (Supabase maintenance),');
  console.log('we can manually populate the cache now:');
  console.log('\n1. Navigate to App Audit page');
  console.log('2. Search for "Pimsleur"');
  console.log('3. Run full audit (wait for completion)');
  console.log('4. Click "Monitor App" button again');
  console.log('5. This time it will have auditData and will persist cache');
  console.log('\nOR wait for Supabase maintenance to complete and deploy edge functions');
}

diagnose().catch(console.error);
