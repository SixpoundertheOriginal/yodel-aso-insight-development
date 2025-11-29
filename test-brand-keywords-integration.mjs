/**
 * Test: Brand Keywords Database Integration (Phase 2)
 *
 * Verifies that:
 * 1. Brand keywords can be saved to monitored_apps table
 * 2. Edge function fetches brand keywords from database
 * 3. Brand filtering works correctly in combo generation
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testBrandKeywordsIntegration() {
  console.log('='.repeat(80));
  console.log('TEST: Brand Keywords Database Integration (Phase 2)');
  console.log('='.repeat(80));

  // Step 1: Find a monitored app
  console.log('\n[1] Finding a monitored app...');
  const { data: monitoredApps, error: appsError } = await supabase
    .from('monitored_apps')
    .select('id, app_id, organization_id, app_name, brand_keywords')
    .eq('platform', 'ios')
    .limit(1);

  if (appsError || !monitoredApps || monitoredApps.length === 0) {
    console.error('❌ Failed to find monitored app:', appsError);
    return;
  }

  const monitoredApp = monitoredApps[0];
  console.log('✅ Found monitored app:', {
    id: monitoredApp.id,
    app_id: monitoredApp.app_id,
    app_name: monitoredApp.app_name,
    current_brand_keywords: monitoredApp.brand_keywords
  });

  // Step 2: Set brand keywords (simulating what the UI would do)
  console.log('\n[2] Setting brand keywords in database...');
  const testBrandKeywords = ['testbrand']; // Use a unique test brand to verify filtering

  const { error: updateError } = await supabase
    .from('monitored_apps')
    .update({ brand_keywords: testBrandKeywords })
    .eq('id', monitoredApp.id);

  if (updateError) {
    console.error('❌ Failed to update brand keywords:', updateError);
    return;
  }

  console.log('✅ Updated brand keywords to:', testBrandKeywords);

  // Step 3: Call metadata-audit-v2 edge function
  console.log('\n[3] Calling metadata-audit-v2 edge function...');

  const { data: result, error: invokeError } = await supabase.functions.invoke('metadata-audit-v2', {
    body: {
      monitored_app_id: monitoredApp.id,
      organization_id: monitoredApp.organization_id
    }
  });

  if (invokeError) {
    console.error('❌ Edge function invocation failed:', invokeError);
    return;
  }

  if (!result || !result.success) {
    console.error('❌ Audit failed:', result?.error || 'Unknown error');
    return;
  }

  console.log('✅ Audit completed successfully');
  console.log('\n[4] Analyzing combo coverage results...');

  const comboCoverage = result.data.comboCoverage;

  console.log('\nCombo Coverage:', {
    totalCombos: comboCoverage.totalCombos,
    titleCombos: comboCoverage.titleCombos,
    subtitleNewCombos: comboCoverage.subtitleNewCombos,
    twoWordCombos: comboCoverage.twoWordCombos,
    threeWordCombos: comboCoverage.threeWordCombos
  });

  if (comboCoverage.brandStats) {
    console.log('\nBrand Stats:', {
      total: comboCoverage.brandStats.total,
      brand: comboCoverage.brandStats.brand,
      competitorBrand: comboCoverage.brandStats.competitorBrand,
      generic: comboCoverage.brandStats.generic,
      brandRatio: comboCoverage.brandStats.brandRatio.toFixed(3),
      genericRatio: comboCoverage.brandStats.genericRatio.toFixed(3)
    });
  }

  // Check if any combos contain the test brand (they shouldn't - should be filtered)
  const allCombos = comboCoverage.allCombinedCombos || [];
  const brandedCombos = allCombos.filter(combo =>
    combo.toLowerCase().includes('testbrand')
  );

  console.log('\n[5] Verification:');
  console.log('Total combos returned:', allCombos.length);
  console.log('Combos containing "testbrand":', brandedCombos.length);

  if (brandedCombos.length > 0) {
    console.log('⚠️ WARNING: Found branded combos (should be filtered):');
    brandedCombos.forEach(combo => console.log('  -', combo));
  } else {
    console.log('✅ Brand filtering working correctly - no branded combos returned');
  }

  // Step 6: Clean up - restore original brand keywords
  console.log('\n[6] Cleaning up - restoring original brand keywords...');

  const { error: restoreError } = await supabase
    .from('monitored_apps')
    .update({ brand_keywords: monitoredApp.brand_keywords })
    .eq('id', monitoredApp.id);

  if (restoreError) {
    console.error('❌ Failed to restore brand keywords:', restoreError);
  } else {
    console.log('✅ Restored original brand keywords');
  }

  console.log('\n' + '='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
}

testBrandKeywordsIntegration().catch(console.error);
