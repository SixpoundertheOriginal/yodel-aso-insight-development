/**
 * Debug Script: Subtitle Flow Tracer
 *
 * Purpose: Trace subtitle field through the entire metadata pipeline
 * - Adapter extraction
 * - Orchestrator coordination
 * - Normalizer processing
 * - Frontend service transformation
 * - Component rendering
 *
 * Usage: npx tsx scripts/debug-subtitle-flow.ts <app-url-or-id>
 * Example: npx tsx scripts/debug-subtitle-flow.ts https://apps.apple.com/us/app/instagram/id389801252
 */

import { metadataOrchestrator } from '../src/services/metadata-adapters';

const TEST_APP_URL = process.argv[2] || 'https://apps.apple.com/us/app/instagram/id389801252';

async function debugSubtitleFlow() {
  console.log('\n🔍 ===== SUBTITLE FLOW DEBUG TRACER =====\n');
  console.log(`📱 Test App: ${TEST_APP_URL}\n`);

  try {
    // Step 1: Fetch metadata through orchestrator
    console.log('📡 [STEP 1] Fetching metadata via MetadataOrchestrator...\n');

    const metadata = await metadataOrchestrator.fetchMetadata(TEST_APP_URL, {
      country: 'us',
      timeout: 30000,
      retries: 2
    });

    console.log('✅ [STEP 1] Metadata fetched successfully\n');

    // Step 2: Inspect subtitle at orchestrator level
    console.log('🔎 [STEP 2] Inspecting subtitle at ORCHESTRATOR LEVEL:');
    console.log({
      'metadata.name': metadata.name,
      'metadata.title': metadata.title,
      'metadata.subtitle': metadata.subtitle,
      'metadata.subtitleSource': (metadata as any).subtitleSource,
      'metadata._source': metadata._source,
      'metadata._normalized': metadata._normalized
    });
    console.log('\n');

    // Step 3: Simulate frontend service transformation (from aso-search.service.ts)
    console.log('🔄 [STEP 3] Simulating frontend service transformation...\n');

    const searchResult = {
      targetApp: {
        ...metadata,
        // Ensure all required ScrapedMetadata fields are present
        name: metadata.name,
        appId: metadata.appId,
        title: metadata.title,
        subtitle: metadata.subtitle || '',
        description: metadata.description || '',
        url: metadata.url || '',
        icon: metadata.icon || '',
        rating: metadata.rating || 0,
        reviews: metadata.reviews || 0,
        developer: metadata.developer || '',
        applicationCategory: metadata.applicationCategory || 'Unknown',
        locale: metadata.locale,
        screenshots: metadata.screenshots || []
      }
    };

    console.log('🔎 [STEP 3] Inspecting subtitle AFTER transformation:');
    console.log({
      'searchResult.targetApp.name': searchResult.targetApp.name,
      'searchResult.targetApp.title': searchResult.targetApp.title,
      'searchResult.targetApp.subtitle': searchResult.targetApp.subtitle,
      'searchResult.targetApp.subtitleSource': (searchResult.targetApp as any).subtitleSource,
      'Has subtitleSource key?': 'subtitleSource' in searchResult.targetApp,
      'All targetApp keys': Object.keys(searchResult.targetApp).filter(k => k.includes('subtitle') || k.includes('title') || k.includes('name'))
    });
    console.log('\n');

    // Step 4: Final diagnosis
    console.log('📊 [STEP 4] DIAGNOSIS SUMMARY:\n');

    const diagnosis = {
      'Subtitle extracted?': !!metadata.subtitle,
      'SubtitleSource tracked?': !!(metadata as any).subtitleSource,
      'Subtitle survived transformation?': !!searchResult.targetApp.subtitle,
      'SubtitleSource survived transformation?': !!(searchResult.targetApp as any).subtitleSource,
      'Subtitle value': metadata.subtitle,
      'SubtitleSource value': (metadata as any).subtitleSource
    };

    console.log(diagnosis);
    console.log('\n');

    // Step 5: Check for dropped fields
    console.log('⚠️  [STEP 5] FIELD DROP ANALYSIS:\n');

    const metadataKeys = Object.keys(metadata);
    const targetAppKeys = Object.keys(searchResult.targetApp);

    const droppedKeys = metadataKeys.filter(key => !targetAppKeys.includes(key));

    if (droppedKeys.length > 0) {
      console.log('🚨 WARNING: The following fields were DROPPED during transformation:');
      console.log(droppedKeys);
      console.log('\nDropped subtitle-related fields:');
      console.log(droppedKeys.filter(k => k.toLowerCase().includes('subtitle')));
    } else {
      console.log('✅ All fields preserved during transformation');
    }
    console.log('\n');

    // Step 6: Root cause identification
    console.log('🎯 [STEP 6] ROOT CAUSE IDENTIFICATION:\n');

    if (!metadata.subtitle) {
      console.log('❌ PROBLEM: Subtitle NOT extracted at adapter level');
      console.log('   Location: src/services/metadata-adapters/appstore-web.adapter.ts');
      console.log('   Action: Check DOM extraction and cheerio selectors');
    } else if (!searchResult.targetApp.subtitle) {
      console.log('❌ PROBLEM: Subtitle DROPPED during frontend transformation');
      console.log('   Location: src/services/aso-search.service.ts (executeEnhancedEdgeFunctionSearch)');
      console.log('   Action: Check targetApp field mapping (lines 400-425)');
    } else if (!(metadata as any).subtitleSource) {
      console.log('⚠️  ISSUE: subtitleSource NOT included in orchestrator response');
      console.log('   Location: src/services/metadata-adapters/orchestrator.ts');
      console.log('   Action: Add subtitleSource to NormalizedMetadata return object');
    } else if (!(searchResult.targetApp as any).subtitleSource) {
      console.log('⚠️  ISSUE: subtitleSource DROPPED during frontend transformation');
      console.log('   Location: src/services/aso-search.service.ts (executeEnhancedEdgeFunctionSearch)');
      console.log('   Action: Add subtitleSource to targetApp field mapping (line ~416)');
    } else {
      console.log('✅ All subtitle fields present throughout pipeline');
    }

    console.log('\n🏁 ===== DEBUG TRACE COMPLETE =====\n');

  } catch (error) {
    console.error('\n❌ ERROR during subtitle flow debug:', error);
    process.exit(1);
  }
}

// Run the debug script
debugSubtitleFlow().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
