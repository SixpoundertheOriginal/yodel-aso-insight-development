/**
 * Diagnostic Test: Adapter Priority Logic
 *
 * Purpose: Verify that getActiveAdapters() respects ENABLE_WEB_ADAPTER_PRIORITY
 * and correctly overrides preferredSource when subtitle extraction mode is enabled.
 *
 * Test Cases:
 * 1. FLAG OFF + preferredSource='appstore-edge' → edge runs first
 * 2. FLAG ON + no preferredSource → web runs first
 * 3. FLAG ON + preferredSource='appstore-edge' → web still runs first (override)
 * 4. FLAG ON + preferredSource='appstore-web' → web runs first (no conflict)
 *
 * Usage: npx tsx scripts/test-adapter-priority.ts
 */

import { metadataOrchestrator } from '../src/services/metadata-adapters';

// Test app (use Instagram as reference)
const TEST_APP_ID = '389801252';

interface TestCase {
  name: string;
  description: string;
  flagEnabled: boolean;
  preferredSource?: string;
  expectedFirst: string;
  expectedSecond?: string;
}

const TEST_CASES: TestCase[] = [
  {
    name: 'Test 1',
    description: 'ENABLE_WEB_ADAPTER_PRIORITY=false, preferredSource="appstore-edge"',
    flagEnabled: false,
    preferredSource: 'appstore-edge',
    expectedFirst: 'appstore-edge',
    expectedSecond: 'appstore-web',
  },
  {
    name: 'Test 2',
    description: 'ENABLE_WEB_ADAPTER_PRIORITY=true, no preferredSource',
    flagEnabled: true,
    preferredSource: undefined,
    expectedFirst: 'appstore-web',
    expectedSecond: 'appstore-edge',
  },
  {
    name: 'Test 3',
    description: 'ENABLE_WEB_ADAPTER_PRIORITY=true, preferredSource="appstore-edge" (should be overridden)',
    flagEnabled: true,
    preferredSource: 'appstore-edge',
    expectedFirst: 'appstore-web',
    expectedSecond: 'appstore-edge',
  },
  {
    name: 'Test 4',
    description: 'ENABLE_WEB_ADAPTER_PRIORITY=true, preferredSource="appstore-web"',
    flagEnabled: true,
    preferredSource: 'appstore-web',
    expectedFirst: 'appstore-web',
    expectedSecond: 'appstore-edge',
  },
];

async function runTest(testCase: TestCase): Promise<boolean> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${testCase.name}: ${testCase.description}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    // Note: We can't dynamically change the ENABLE_WEB_ADAPTER_PRIORITY flag
    // in this test because it's a compile-time constant imported from feature flags.
    // This test is mainly for manual verification with the flag toggled in the source.

    const currentFlagState = (await import('../src/config/metadataFeatureFlags')).ENABLE_WEB_ADAPTER_PRIORITY;

    if (currentFlagState !== testCase.flagEnabled) {
      console.log(`⚠️  SKIP: Test expects ENABLE_WEB_ADAPTER_PRIORITY=${testCase.flagEnabled}`);
      console.log(`         but current flag state is ${currentFlagState}`);
      console.log(`         Please update metadataFeatureFlags.ts and re-run\n`);
      return false; // Skip
    }

    console.log(`✓ ENABLE_WEB_ADAPTER_PRIORITY = ${currentFlagState}`);
    console.log(`✓ preferredSource = ${testCase.preferredSource || 'undefined'}\n`);

    // Capture console output to detect which adapter runs first
    const originalLog = console.log;
    let firstAdapterTried: string | null = null;
    let secondAdapterTried: string | null = null;
    let adapterChainLog: string | null = null;
    let attemptCount = 0;

    console.log = (...args: any[]) => {
      const message = args.join(' ');

      // Capture adapter chain log
      if (message.includes('[ORCHESTRATOR] 📋 Adapter chain:')) {
        adapterChainLog = message;
      }

      // Capture first adapter tried
      if (message.includes('[ORCHESTRATOR] ⏳ Trying')) {
        attemptCount++;
        const match = message.match(/Trying (\S+)/);
        if (match && attemptCount === 1) {
          firstAdapterTried = match[1];
        }
        if (match && attemptCount === 2) {
          secondAdapterTried = match[1];
        }
      }

      originalLog(...args);
    };

    // Fetch metadata (will try adapters in priority order)
    console.log = originalLog; // Restore immediately
    console.log('📡 Fetching metadata...\n');
    console.log = (...args: any[]) => {
      const message = args.join(' ');

      // Capture adapter chain log
      if (message.includes('[ORCHESTRATOR] 📋 Adapter chain:')) {
        adapterChainLog = message;
      }

      // Capture first adapter tried
      if (message.includes('[ORCHESTRATOR] ⏳ Trying')) {
        attemptCount++;
        const match = message.match(/Trying (\S+)/);
        if (match && attemptCount === 1) {
          firstAdapterTried = match[1];
        }
        if (match && attemptCount === 2) {
          secondAdapterTried = match[1];
        }
      }

      originalLog(...args);
    };

    await metadataOrchestrator.fetchMetadata(TEST_APP_ID, {
      country: 'us',
      preferredSource: testCase.preferredSource as any,
    });

    console.log = originalLog; // Restore

    console.log('\n📊 Results:');
    console.log(`   Adapter chain: ${adapterChainLog || 'NOT CAPTURED'}`);
    console.log(`   First adapter tried: ${firstAdapterTried}`);
    console.log(`   Second adapter tried: ${secondAdapterTried || 'N/A'}\n`);

    // Validate results
    const firstMatch = firstAdapterTried === testCase.expectedFirst;
    const secondMatch = !testCase.expectedSecond || secondAdapterTried === testCase.expectedSecond;

    if (firstMatch && secondMatch) {
      console.log(`✅ PASS: ${testCase.name}`);
      console.log(`   Expected first: ${testCase.expectedFirst} ✓`);
      if (testCase.expectedSecond) {
        console.log(`   Expected second: ${testCase.expectedSecond} ✓`);
      }
      return true;
    } else {
      console.log(`❌ FAIL: ${testCase.name}`);
      console.log(`   Expected first: ${testCase.expectedFirst}, Got: ${firstAdapterTried} ${firstMatch ? '✓' : '✗'}`);
      if (testCase.expectedSecond) {
        console.log(`   Expected second: ${testCase.expectedSecond}, Got: ${secondAdapterTried} ${secondMatch ? '✓' : '✗'}`);
      }
      return false;
    }

  } catch (error) {
    console.error(`❌ ERROR in ${testCase.name}:`, error);
    return false;
  }
}

async function main() {
  console.log('\n🧪 ===== ADAPTER PRIORITY DIAGNOSTIC TEST =====\n');
  console.log('This script verifies that getActiveAdapters() correctly prioritizes');
  console.log('the web adapter when ENABLE_WEB_ADAPTER_PRIORITY is enabled.\n');

  const currentFlagState = (await import('../src/config/metadataFeatureFlags')).ENABLE_WEB_ADAPTER_PRIORITY;
  console.log(`📌 Current ENABLE_WEB_ADAPTER_PRIORITY: ${currentFlagState}\n`);

  if (currentFlagState) {
    console.log('🎯 Running tests for FLAG ENABLED (subtitle extraction mode)\n');
  } else {
    console.log('⚠️  Running tests for FLAG DISABLED (legacy behavior)\n');
  }

  const results: boolean[] = [];

  for (const testCase of TEST_CASES) {
    const passed = await runTest(testCase);
    results.push(passed);
    await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause between tests
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('📋 TEST SUMMARY');
  console.log(`${'='.repeat(80)}\n`);

  const passed = results.filter(r => r === true).length;
  const skipped = results.filter(r => r === false).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Skipped/Failed: ${skipped}\n`);

  if (passed === total) {
    console.log('✅ All tests passed!\n');
    process.exit(0);
  } else if (skipped === total) {
    console.log('⚠️  All tests skipped (flag state mismatch)\n');
    console.log('To run all tests:');
    console.log('1. Set ENABLE_WEB_ADAPTER_PRIORITY=false in metadataFeatureFlags.ts');
    console.log('2. Run: npx tsx scripts/test-adapter-priority.ts');
    console.log('3. Set ENABLE_WEB_ADAPTER_PRIORITY=true in metadataFeatureFlags.ts');
    console.log('4. Run: npx tsx scripts/test-adapter-priority.ts\n');
    process.exit(1);
  } else {
    console.log(`❌ Some tests failed or were skipped\n`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
