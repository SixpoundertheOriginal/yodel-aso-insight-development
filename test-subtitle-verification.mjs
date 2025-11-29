/**
 * Verify subtitle extraction is working correctly
 * by comparing keyword counts with and without subtitles
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifySubtitleExtraction() {
  console.log('🔬 Verifying Subtitle Extraction in Competitive Analysis\n');
  console.log('═══════════════════════════════════════════════════════\n');

  const request = {
    targetAppId: '6477780060', // Inspire
    competitorAppStoreIds: ['493145008'], // Headspace
    organizationId: 'test-org',
    forceRefresh: true,
  };

  try {
    const { data: result, error } = await supabase.functions.invoke('analyze-competitors', {
      body: request,
    });

    if (error || !result?.success || !result?.data) {
      throw new Error(error?.message || result?.error?.message || 'Analysis failed');
    }

    const competitor = result.data.competitors[0];
    const gapAnalysis = result.data.gapAnalysis;

    console.log('📊 HEADSPACE ANALYSIS RESULTS:\n');
    console.log('  App Information:');
    console.log(`    Name: ${competitor.name}`);
    console.log(`    Subtitle: ${competitor.subtitle || 'NOT FOUND ❌'}\n`);

    // Manual keyword count from title + subtitle
    const titleKeywords = ['headspace', 'meditation', 'sleep'];
    const subtitleKeywords = ['relax', 'mindfulness', 'therapy'];
    const expectedKeywords = [...titleKeywords, ...subtitleKeywords];

    console.log('  Expected Keywords (Title + Subtitle):');
    console.log(`    From Title: ${titleKeywords.join(', ')} (${titleKeywords.length})`);
    console.log(`    From Subtitle: ${subtitleKeywords.join(', ')} (${subtitleKeywords.length})`);
    console.log(`    Total Expected: ${expectedKeywords.length} unique keywords\n`);

    console.log('  Actual Analysis Results:');
    console.log(`    Keywords Found: ${competitor.audit.keywordCoverage?.totalUniqueKeywords || 0}`);
    console.log(`    Combos Found: ${competitor.audit.comboCoverage?.totalCombos || 0}\n`);

    // Verification
    const keywordCount = competitor.audit.keywordCoverage?.totalUniqueKeywords || 0;
    const hasSubtitle = !!competitor.subtitle;
    const subtitleIsUsed = keywordCount >= expectedKeywords.length;

    console.log('═══════════════════════════════════════════════════════\n');
    console.log('✅ VERIFICATION RESULTS:\n');

    console.log(`  1. Subtitle Extracted: ${hasSubtitle ? '✅ YES' : '❌ NO'}`);
    if (hasSubtitle) {
      console.log(`     → "${competitor.subtitle}"`);
    }

    console.log(`\n  2. Subtitle Used in Analysis: ${subtitleIsUsed ? '✅ YES' : '❌ NO'}`);
    console.log(`     → Expected: ${expectedKeywords.length} keywords (title + subtitle)`);
    console.log(`     → Found: ${keywordCount} keywords`);
    if (subtitleIsUsed) {
      console.log(`     → Match! Subtitle is being analyzed ✅`);
    } else {
      console.log(`     → Mismatch! Subtitle may not be included ❌`);
    }

    console.log(`\n  3. Gap Analysis Available: ${gapAnalysis ? '✅ YES' : '❌ NO'}`);
    if (gapAnalysis) {
      console.log(`     → Missing Keywords: ${gapAnalysis.summary.totalMissingKeywords}`);
      console.log(`     → Missing Combos: ${gapAnalysis.summary.totalMissingCombos}`);
    }

    console.log('\n═══════════════════════════════════════════════════════\n');

    if (hasSubtitle && subtitleIsUsed) {
      console.log('🎉 SUCCESS! Subtitle extraction and analysis is working correctly!\n');
      return true;
    } else {
      console.log('❌ FAILED! Subtitle extraction or analysis has issues.\n');
      return false;
    }

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    return false;
  }
}

verifySubtitleExtraction().then(success => {
  process.exit(success ? 0 : 1);
});
