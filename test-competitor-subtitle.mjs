/**
 * Test script to verify competitor subtitle extraction
 * Tests that analyze-competitors now gets subtitle from HTML scraping
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.log('Run: export SUPABASE_SERVICE_ROLE_KEY=your-key-here');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testCompetitorSubtitle() {
  console.log('🔍 Testing competitor subtitle extraction...\n');

  const request = {
    targetAppId: '6477780060', // Inspire
    competitorAppStoreIds: ['493145008'], // Headspace only (to keep test fast)
    organizationId: 'test-org-id',
    forceRefresh: true,
  };

  console.log('📋 Request:');
  console.log(`  Target: ${request.targetAppId} (Inspire)`);
  console.log(`  Competitors: ${request.competitorAppStoreIds.join(', ')} (Headspace)`);
  console.log('');

  try {
    const { data: result, error } = await supabase.functions.invoke('analyze-competitors', {
      body: request,
    });

    if (error) {
      throw new Error(`Function error: ${error.message}`);
    }

    if (!result) {
      throw new Error('No data returned');
    }

    if (!result.success) {
      throw new Error(result.error?.message || 'Unknown error');
    }

    console.log('✅ Analysis completed successfully!\n');

    // Check target app
    console.log('🎯 Target App:');
    console.log(`  Name: ${result.data.targetApp.name}`);
    console.log(`  Subtitle: ${result.data.targetApp.audit?.subtitle || 'NOT FOUND'}`);
    console.log(`  Keywords: ${result.data.targetApp.audit?.keywordCoverage?.totalUniqueKeywords || 0}`);
    console.log('');

    // Check competitor
    if (result.data.competitors.length > 0) {
      const competitor = result.data.competitors[0];
      console.log('🏆 Competitor (Headspace):');
      console.log(`  Name: ${competitor.name}`);
      console.log(`  Subtitle: ${competitor.subtitle || 'NOT FOUND ❌'}`);
      console.log(`  Keywords: ${competitor.audit?.keywordCoverage?.totalUniqueKeywords || 0}`);
      console.log('');

      // Verify subtitle
      if (competitor.subtitle) {
        console.log('✅ SUCCESS: Subtitle extracted!');
        console.log(`   Expected: "Relax, Mindfulness & Therapy" or similar`);
        console.log(`   Got: "${competitor.subtitle}"`);
      } else {
        console.log('❌ FAILED: No subtitle found!');
      }

      // Check keyword count
      const keywordCount = competitor.audit?.keywordCoverage?.totalUniqueKeywords || 0;
      const comboCount = competitor.audit?.comboCoverage?.totalCombos || 0;
      console.log('');
      console.log(`📊 Keyword Analysis:`);
      console.log(`   Keywords found: ${keywordCount}`);
      console.log(`   Combos found: ${comboCount}`);
      console.log(`   Title used in audit: "${competitor.audit?.title || 'N/A'}"`);
      console.log(`   Subtitle used in audit: "${competitor.audit?.subtitle || 'N/A'}"`);
      if (keywordCount >= 10) {
        console.log(`   ✅ Good! Should have 10+ keywords from title + subtitle`);
      } else {
        console.log(`   ⚠️  Low count - subtitle may not be included in analysis`);
      }
    } else {
      console.log('❌ No competitors analyzed!');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

testCompetitorSubtitle();
