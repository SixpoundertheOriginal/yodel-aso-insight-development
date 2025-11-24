/**
 * End-to-End Test: Subtitle Propagation Pipeline
 *
 * Tests: UI → Edge Function → Cache → Snapshot → Monitored App UI
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface TestResult {
  step: string;
  passed: boolean;
  details: string;
  data?: any;
}

const results: TestResult[] = [];

async function testSubtitlePipeline() {
  console.log('🧪 End-to-End Test: Subtitle Propagation Pipeline\n');
  console.log('='.repeat(70));

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('❌ Authentication failed. Please ensure you are logged in.');
    return;
  }

  // Get user's organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  const organizationId = profile?.organization_id;

  if (!organizationId) {
    console.error('❌ No organization found for user.');
    return;
  }

  console.log(`✅ Authenticated as user: ${user.email}`);
  console.log(`✅ Organization ID: ${organizationId}\n`);
  console.log('='.repeat(70));

  // Test app metadata (Duolingo iOS as example)
  const testMetadata = {
    app_id: '375380948',
    platform: 'ios',
    app_name: 'Duolingo - Language Lessons',
    locale: 'us',
    bundle_id: 'com.duolingo.DuolingoMobile',
    app_icon_url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/f7/8f/78/f78f78f7-1fbe-7b36-0d8c-b43e97e0d4f5/AppIcon-0-0-1x_U007emarketing-0-7-0-85-220.png/512x512bb.jpg',
    developer_name: 'Duolingo, Inc.',
    category: 'Education',
    primary_country: 'us',
    // Critical: Include subtitle
    metadata: {
      title: 'Duolingo - Language Lessons',
      subtitle: 'Learn Spanish, French, English',  // This MUST propagate through the entire pipeline
      description: 'Learn a new language with the world\'s most-downloaded education app!',
      developerName: 'Duolingo, Inc.',
      bundleId: 'com.duolingo.DuolingoMobile',
      appIcon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/f7/8f/78/f78f78f7-1fbe-7b36-0d8c-b43e97e0d4f5/AppIcon-0-0-1x_U007emarketing-0-7-0-85-220.png/512x512bb.jpg',
      screenshots: []
    }
  };

  console.log('\n📦 Test Metadata:');
  console.log(`   App: ${testMetadata.app_name}`);
  console.log(`   Subtitle: "${testMetadata.metadata.subtitle}"`);
  console.log(`   Platform: ${testMetadata.platform}`);
  console.log(`   Locale: ${testMetadata.locale}\n`);
  console.log('='.repeat(70));

  // STEP 1: Call save-monitored-app edge function
  console.log('\n1️⃣  Calling save-monitored-app edge function...');

  const { data: saveResponse, error: saveError } = await supabase.functions.invoke(
    'save-monitored-app',
    {
      body: {
        organizationId,
        app_id: testMetadata.app_id,
        platform: testMetadata.platform,
        app_name: testMetadata.app_name,
        locale: testMetadata.locale,
        bundle_id: testMetadata.bundle_id,
        app_icon_url: testMetadata.app_icon_url,
        developer_name: testMetadata.developer_name,
        category: testMetadata.category,
        primary_country: testMetadata.primary_country,
        audit_enabled: true,
        metadata: testMetadata.metadata,
      }
    }
  );

  if (saveError) {
    console.error('❌ Edge function call failed:', saveError);
    results.push({
      step: 'Edge Function Invocation',
      passed: false,
      details: `Error: ${saveError.message}`,
    });
    printResults();
    return;
  }

  console.log('✅ Edge function responded');
  console.log('   Response:', JSON.stringify(saveResponse, null, 2));

  const metadataCached = saveResponse?.metadataCached ?? false;
  const auditCreated = saveResponse?.auditCreated ?? false;

  results.push({
    step: 'Edge Function Invocation',
    passed: true,
    details: `metadataCached: ${metadataCached}, auditCreated: ${auditCreated}`,
    data: saveResponse,
  });

  // STEP 2: Verify cache entry
  console.log('\n2️⃣  Verifying app_metadata_cache...');

  const { data: cacheData, error: cacheError } = await supabase
    .from('app_metadata_cache')
    .select('*')
    .eq('app_id', testMetadata.app_id)
    .eq('organization_id', organizationId)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cacheError) {
    console.error('❌ Cache query failed:', cacheError);
    results.push({
      step: 'Cache Verification',
      passed: false,
      details: `Error: ${cacheError.message}`,
    });
  } else if (!cacheData) {
    console.log('❌ No cache entry found');
    results.push({
      step: 'Cache Verification',
      passed: false,
      details: 'No cache entry found for app',
    });
  } else {
    console.log('✅ Cache entry found');
    console.log(`   Title: ${cacheData.title}`);
    console.log(`   Subtitle: ${cacheData.subtitle || '(NULL)'}`);
    console.log(`   Source: ${cacheData._metadata_source || '(NULL)'}`);

    const subtitleMatch = cacheData.subtitle === testMetadata.metadata.subtitle;

    results.push({
      step: 'Cache Verification',
      passed: !!cacheData.subtitle && subtitleMatch,
      details: subtitleMatch
        ? `Subtitle correctly saved: "${cacheData.subtitle}"`
        : `Subtitle mismatch or missing. Expected: "${testMetadata.metadata.subtitle}", Got: "${cacheData.subtitle || 'NULL'}"`,
      data: cacheData,
    });

    if (!subtitleMatch) {
      console.log(`❌ Subtitle mismatch!`);
      console.log(`   Expected: "${testMetadata.metadata.subtitle}"`);
      console.log(`   Got: "${cacheData.subtitle || 'NULL'}"`);
    }
  }

  // STEP 3: Verify audit snapshot
  console.log('\n3️⃣  Verifying aso_audit_snapshots...');

  // Wait a moment for snapshot creation
  await new Promise(resolve => setTimeout(resolve, 2000));

  const { data: snapshotData, error: snapshotError } = await supabase
    .from('aso_audit_snapshots')
    .select('*')
    .eq('app_id', testMetadata.app_id)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snapshotError) {
    console.error('❌ Snapshot query failed:', snapshotError);
    results.push({
      step: 'Snapshot Verification',
      passed: false,
      details: `Error: ${snapshotError.message}`,
    });
  } else if (!snapshotData) {
    console.log('❌ No audit snapshot found');
    results.push({
      step: 'Snapshot Verification',
      passed: false,
      details: 'No audit snapshot found for app',
    });
  } else {
    console.log('✅ Audit snapshot found');
    console.log(`   Title: ${snapshotData.title}`);
    console.log(`   Subtitle: ${snapshotData.subtitle || '(NULL)'}`);
    console.log(`   Overall Score: ${snapshotData.overall_score}`);

    const subtitleMatch = snapshotData.subtitle === testMetadata.metadata.subtitle;
    const hasScore = snapshotData.overall_score > 0;

    results.push({
      step: 'Snapshot Verification',
      passed: !!snapshotData.subtitle && subtitleMatch && hasScore,
      details: `Subtitle: ${subtitleMatch ? '✅' : '❌'}, Score: ${hasScore ? '✅' : '❌'} (${snapshotData.overall_score})`,
      data: snapshotData,
    });

    if (!subtitleMatch) {
      console.log(`❌ Subtitle mismatch!`);
      console.log(`   Expected: "${testMetadata.metadata.subtitle}"`);
      console.log(`   Got: "${snapshotData.subtitle || 'NULL'}"`);
    }
  }

  // STEP 4: Verify monitored_apps
  console.log('\n4️⃣  Verifying monitored_apps...');

  const { data: monitoredData, error: monitoredError } = await supabase
    .from('monitored_apps')
    .select('*')
    .eq('app_id', testMetadata.app_id)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (monitoredError) {
    console.error('❌ Monitored app query failed:', monitoredError);
    results.push({
      step: 'Monitored App Verification',
      passed: false,
      details: `Error: ${monitoredError.message}`,
    });
  } else if (!monitoredData) {
    console.log('❌ No monitored app entry found');
    results.push({
      step: 'Monitored App Verification',
      passed: false,
      details: 'No monitored app entry found',
    });
  } else {
    console.log('✅ Monitored app entry found');
    console.log(`   App Name: ${monitoredData.app_name}`);
    console.log(`   Latest Audit Score: ${monitoredData.latest_audit_score || '(NULL)'}`);
    console.log(`   Validated State: ${monitoredData.validated_state}`);

    const hasScore = monitoredData.latest_audit_score !== null && monitoredData.latest_audit_score > 0;

    results.push({
      step: 'Monitored App Verification',
      passed: hasScore,
      details: hasScore
        ? `Audit score recorded: ${monitoredData.latest_audit_score}`
        : 'Audit score missing or zero',
      data: monitoredData,
    });
  }

  // Print final results
  printResults();
}

function printResults() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(70));

  let allPassed = true;

  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`\n${index + 1}. ${icon} ${result.step}`);
    console.log(`   ${result.details}`);
    allPassed = allPassed && result.passed;
  });

  console.log('\n' + '='.repeat(70));
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED - Subtitle pipeline is working correctly!');
  } else {
    console.log('🚨 SOME TESTS FAILED - See details above');
  }
  console.log('='.repeat(70) + '\n');
}

testSubtitlePipeline().catch(console.error);
