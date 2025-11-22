#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjgwNzA5OCwiZXhwIjoyMDYyMzgzMDk4fQ.vaBiZHIQ7Y5gsGPg2324rEu9InKtk9JDLz7L2mZp-Fo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function auditSystem() {
  console.log('========================================');
  console.log('CURRENT STATE AUDIT');
  console.log('========================================\n');

  // 1. Check if validated_state column exists
  console.log('1️⃣ Database Schema Check:');
  try {
    const { data: monitoredApps } = await supabase
      .from('monitored_apps')
      .select('id, validated_state, validated_at')
      .limit(1);
    
    if (monitoredApps && monitoredApps.length > 0) {
      console.log('✅ validated_state column EXISTS');
      console.log('   Sample:', monitoredApps[0]);
    } else {
      console.log('⚠️  No monitored apps found');
    }
  } catch (error: any) {
    console.log('❌ validated_state column MISSING');
    console.log('   Error:', error.message);
  }

  // 2. Check problematic apps
  console.log('\n2️⃣ Problematic Apps Check:');
  const problematicApps = [
    { name: 'Pimsleur', app_id: '1405735469', platform: 'ios' },
    { name: 'Apple Fitness', app_id: '1208224953', platform: 'ios' }
  ];

  for (const app of problematicApps) {
    console.log(`\n   ${app.name} (${app.app_id}):`);
    
    // Check monitored_apps
    const { data: monitoredApp } = await supabase
      .from('monitored_apps')
      .select('*')
      .eq('app_id', app.app_id)
      .eq('platform', app.platform)
      .maybeSingle();

    if (monitoredApp) {
      console.log('   ✓ Monitored app exists');
      console.log('     - locale:', monitoredApp.locale || 'NULL');
      console.log('     - latest_audit_score:', monitoredApp.latest_audit_score);
      console.log('     - latest_audit_at:', monitoredApp.latest_audit_at);
      
      // Check cache
      const { data: cache } = await supabase
        .from('app_metadata_cache')
        .select('id, fetched_at')
        .eq('organization_id', monitoredApp.organization_id)
        .eq('app_id', app.app_id)
        .eq('platform', app.platform)
        .eq('locale', monitoredApp.locale || 'us')
        .maybeSingle();

      if (cache) {
        console.log('   ✓ Cache exists (fetched:', cache.fetched_at, ')');
      } else {
        console.log('   ❌ NO CACHE FOUND');
      }

      // Check snapshot
      const { data: snapshot } = await supabase
        .from('audit_snapshots')
        .select('id, audit_score, created_at')
        .eq('organization_id', monitoredApp.organization_id)
        .eq('app_id', app.app_id)
        .eq('platform', app.platform)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (snapshot) {
        console.log('   ✓ Snapshot exists (score:', snapshot.audit_score, ')');
      } else {
        console.log('   ❌ NO SNAPSHOT FOUND');
      }
    } else {
      console.log('   ❌ App NOT monitored');
    }
  }

  // 3. Check edge functions deployed
  console.log('\n3️⃣ Edge Functions Check:');
  const functions = [
    'rebuild-monitored-app',
    'validate-monitored-app-consistency',
    'validate-monitored-apps'
  ];

  for (const funcName of functions) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/${funcName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: true })
      });

      if (response.status === 400 || response.status === 401 || response.status === 200) {
        console.log(`   ✅ ${funcName} is DEPLOYED`);
      } else {
        console.log(`   ❌ ${funcName} NOT deployed (status: ${response.status})`);
      }
    } catch (error) {
      console.log(`   ❌ ${funcName} NOT deployed (error)`);
    }
  }

  // 4. Check frontend hook usage
  console.log('\n4️⃣ Frontend Hook Usage:');
  console.log('   (Check browser console for which hook is being called)');

  console.log('\n========================================');
  console.log('ROOT CAUSE ANALYSIS:');
  console.log('========================================');
}

auditSystem().catch(console.error);
