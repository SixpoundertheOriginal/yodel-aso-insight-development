/**
 * Test Description Extraction
 *
 * Validates that the description extraction fix works correctly
 * across multiple App Store apps.
 *
 * Tests:
 * - Instagram (389801252) - Social app
 * - Duolingo (570060128) - Education app
 * - Pimsleur (1405735469) - Education app
 *
 * Expected: All apps should have non-empty descriptions extracted from JSON-LD
 *
 * Usage:
 *   npx tsx scripts/test-description-extraction.ts
 */

interface TestApp {
  id: string;
  name: string;
  category: string;
}

interface HtmlFetchResponse {
  ok: boolean;
  appId: string;
  country: string;
  finalUrl: string;
  status: number;
  html: string;
  htmlLength: number;
  snapshot: string;
  subtitle: string | null;
  description: string | null;
  latencyMs: number;
  uaUsed: string;
  errors: string[];
  error?: string;
}

const TEST_APPS: TestApp[] = [
  { id: '389801252', name: 'Instagram', category: 'Social' },
  { id: '570060128', name: 'Duolingo', category: 'Education' },
  { id: '1405735469', name: 'Pimsleur', category: 'Education' },
];

async function testDescriptionExtraction(app: TestApp): Promise<boolean> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials in environment');
    return false;
  }

  const url = `${supabaseUrl}/functions/v1/appstore-html-fetch`;

  console.log(`\n🔍 Testing: ${app.name} (${app.category})`);
  console.log(`   App ID: ${app.id}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        appId: app.id,
        country: 'us',
      }),
    });

    if (!response.ok) {
      console.error(`   ❌ HTTP ${response.status}: ${response.statusText}`);
      return false;
    }

    const data: HtmlFetchResponse = await response.json();

    if (!data.ok) {
      console.error(`   ❌ Edge function failed: ${data.error || 'Unknown error'}`);
      return false;
    }

    // Validate description extraction
    const hasDescription = data.description && data.description.length > 0;
    const descriptionLength = data.description?.length || 0;
    const descriptionPreview = data.description
      ? data.description.substring(0, 80) + (data.description.length > 80 ? '...' : '')
      : '(none)';

    console.log(`   Subtitle: ${data.subtitle || '(none)'}`);
    console.log(`   Description: ${hasDescription ? '✅' : '❌'} (${descriptionLength} chars)`);
    console.log(`   Preview: "${descriptionPreview}"`);
    console.log(`   Latency: ${data.latencyMs}ms`);

    if (!hasDescription) {
      console.error(`   ❌ FAIL: No description extracted`);
      return false;
    }

    if (descriptionLength < 50) {
      console.error(`   ❌ FAIL: Description too short (${descriptionLength} chars)`);
      return false;
    }

    console.log(`   ✅ PASS: Description extracted successfully`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  DESCRIPTION EXTRACTION TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  console.log('Testing description extraction across multiple apps...\n');

  const results: boolean[] = [];

  for (const app of TEST_APPS) {
    const passed = await testDescriptionExtraction(app);
    results.push(passed);

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const passCount = results.filter(r => r).length;
  const failCount = results.length - passCount;

  console.log(`Total Tests:  ${results.length}`);
  console.log(`Passed:       ${passCount} ✅`);
  console.log(`Failed:       ${failCount} ❌`);
  console.log(`Success Rate: ${((passCount / results.length) * 100).toFixed(1)}%\n`);

  if (failCount === 0) {
    console.log('✅ All tests passed! Description extraction is working correctly.\n');
    process.exit(0);
  } else {
    console.log(`❌ ${failCount} test(s) failed. Please review the output above.\n`);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
