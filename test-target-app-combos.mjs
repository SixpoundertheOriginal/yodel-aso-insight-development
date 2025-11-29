/**
 * Test to investigate target app combo discrepancy
 * Main audit shows 112 combos, competitive analysis shows 18
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testTargetAppCombos() {
  console.log('🔍 Testing Target App Combo Count Discrepancy\n');
  console.log('═══════════════════════════════════════════════════════\n');

  const targetAppId = '6477780060'; // Inspire

  // Test 1: Main Metadata Audit
  console.log('📊 TEST 1: Main Metadata Audit (metadata-audit-v2)\n');

  const { data: auditResult, error: auditError } = await supabase.functions.invoke('metadata-audit-v2', {
    body: {
      app_id: targetAppId,
      platform: 'ios',
      locale: 'us',
    },
  });

  if (auditError || !auditResult?.success) {
    console.error('❌ Main audit failed:', auditError || auditResult?.error);
  } else {
    const audit = auditResult.data;
    console.log('  Target App: Inspire');
    console.log(`  Keywords: ${audit.keywordCoverage?.totalUniqueKeywords || 0}`);
    console.log(`  Total Combos: ${audit.comboCoverage?.totalCombos || 0}`);
    console.log(`  Title Combos: ${audit.comboCoverage?.titleCombos || 0}`);
    console.log(`  Subtitle Combos: ${audit.comboCoverage?.subtitleCombos || 0}`);
    console.log(`  2-word: ${audit.comboCoverage?.twoWordCombos || 0}`);
    console.log(`  3-word: ${audit.comboCoverage?.threeWordCombos || 0}`);
    console.log(`  4+ word: ${audit.comboCoverage?.fourPlusCombos || 0}`);
    console.log(`  Overall Score: ${audit.overallScore || 0}`);
    console.log(`  Title: "${audit.elements?.title?.text || 'N/A'}"`);
    console.log(`  Subtitle: "${audit.elements?.subtitle?.text || 'N/A'}"`);
  }

  console.log('\n═══════════════════════════════════════════════════════\n');

  // Test 2: Competitive Analysis
  console.log('📊 TEST 2: Competitive Analysis (analyze-competitors)\n');

  const { data: compResult, error: compError } = await supabase.functions.invoke('analyze-competitors', {
    body: {
      targetAppId: targetAppId,
      competitorAppStoreIds: ['493145008'], // Just Headspace for speed
      organizationId: 'test-org',
      forceRefresh: true,
    },
  });

  if (compError || !compResult?.success) {
    console.error('❌ Competitive analysis failed:', compError || compResult?.error);
  } else {
    const targetApp = compResult.data.targetApp;
    console.log('  Target App: ' + targetApp.name);
    console.log(`  Keywords: ${targetApp.audit.keywordCoverage?.totalUniqueKeywords || 0}`);
    console.log(`  Total Combos: ${targetApp.audit.comboCoverage?.totalCombos || 0}`);
    console.log(`  Title Combos: ${targetApp.audit.comboCoverage?.titleCombos || 0}`);
    console.log(`  Subtitle Combos: ${targetApp.audit.comboCoverage?.subtitleCombos || 0}`);
    console.log(`  2-word: ${targetApp.audit.comboCoverage?.twoWordCombos || 0}`);
    console.log(`  3-word: ${targetApp.audit.comboCoverage?.threeWordCombos || 0}`);
    console.log(`  4+ word: ${targetApp.audit.comboCoverage?.fourPlusCombos || 0}`);
    console.log(`  Overall Score: ${targetApp.audit.overallScore || 0}`);
    console.log(`  Title: "${targetApp.audit.elements?.title?.text || 'N/A'}"`);
    console.log(`  Subtitle: "${targetApp.audit.elements?.subtitle?.text || 'N/A'}"`);

    // Check if subtitle field exists in targetApp object
    console.log(`\n  🔍 Subtitle in targetApp object: ${targetApp.subtitle || 'NOT PRESENT'}`);
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
  console.log('🔬 ANALYSIS:\n');

  if (auditResult?.success && compResult?.success) {
    const mainCombos = auditResult.data.comboCoverage?.totalCombos || 0;
    const compCombos = compResult.data.targetApp.audit.comboCoverage?.totalCombos || 0;

    if (mainCombos !== compCombos) {
      console.log(`❌ DISCREPANCY FOUND:`);
      console.log(`   Main Audit: ${mainCombos} combos`);
      console.log(`   Competitive Analysis: ${compCombos} combos`);
      console.log(`   Difference: ${mainCombos - compCombos} combos missing\n`);

      console.log('Possible causes:');
      console.log('  1. Different metadata fetched (cache vs fresh HTML)');
      console.log('  2. Different subtitle or description content');
      console.log('  3. Bug in analyze-competitors audit logic');
    } else {
      console.log(`✅ NO DISCREPANCY: Both show ${mainCombos} combos`);
    }
  }
}

testTargetAppCombos().catch(console.error);
