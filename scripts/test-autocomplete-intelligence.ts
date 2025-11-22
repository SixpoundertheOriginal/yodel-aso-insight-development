/**
 * Test script for autocomplete-intelligence Edge Function
 *
 * Tests the full workflow:
 * 1. Calls Edge Function with a test keyword
 * 2. Verifies response format
 * 3. Checks database for cached results
 * 4. Calls again to test cache hit
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface AutocompleteResponse {
  ok: boolean;
  keyword: string;
  platform: string;
  region: string;
  suggestions: Array<{ text: string; rank: number }>;
  suggestionsCount: number;
  intent: {
    intent_type: string;
    confidence: number;
    reasoning: string;
  } | null;
  fromCache: boolean;
  cachedAt?: string;
  latencyMs: number;
  errors: string[];
  error?: string;
}

async function testAutocompleteIntelligence() {
  console.log('🧪 Testing autocomplete-intelligence Edge Function\n');

  // Test 1: Informational query (first call - cache miss)
  console.log('Test 1: Informational query - "learn spanish"');
  const test1Start = Date.now();
  const { data: test1Data, error: test1Error } = await supabase.functions.invoke(
    'autocomplete-intelligence',
    {
      body: {
        keyword: 'learn spanish',
        platform: 'ios',
        region: 'us',
      },
    }
  );
  const test1Latency = Date.now() - test1Start;

  if (test1Error) {
    console.error('❌ Test 1 failed:', test1Error);
  } else {
    const response = test1Data as AutocompleteResponse;
    console.log(`✓ Response OK: ${response.ok}`);
    console.log(`✓ Keyword: ${response.keyword}`);
    console.log(`✓ Platform: ${response.platform}`);
    console.log(`✓ Suggestions count: ${response.suggestionsCount}`);
    console.log(`✓ Intent: ${response.intent?.intent_type} (${response.intent?.confidence}% confidence)`);
    console.log(`✓ From cache: ${response.fromCache}`);
    console.log(`✓ Edge Function latency: ${response.latencyMs}ms`);
    console.log(`✓ Total latency: ${test1Latency}ms`);

    if (response.suggestions.length > 0) {
      console.log('✓ Sample suggestions:');
      response.suggestions.slice(0, 3).forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.text}`);
      });
    }
  }

  console.log('\n---\n');

  // Wait 2 seconds before next test
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Test 2: Same query (should hit cache)
  console.log('Test 2: Cache hit - "learn spanish" (same query)');
  const test2Start = Date.now();
  const { data: test2Data, error: test2Error } = await supabase.functions.invoke(
    'autocomplete-intelligence',
    {
      body: {
        keyword: 'learn spanish',
        platform: 'ios',
        region: 'us',
      },
    }
  );
  const test2Latency = Date.now() - test2Start;

  if (test2Error) {
    console.error('❌ Test 2 failed:', test2Error);
  } else {
    const response = test2Data as AutocompleteResponse;
    console.log(`✓ Response OK: ${response.ok}`);
    console.log(`✓ From cache: ${response.fromCache} ${response.fromCache ? '✅ CACHE HIT' : '⚠️ CACHE MISS'}`);
    console.log(`✓ Edge Function latency: ${response.latencyMs}ms`);
    console.log(`✓ Total latency: ${test2Latency}ms (should be much faster!)`);

    if (response.fromCache && response.cachedAt) {
      console.log(`✓ Cached at: ${response.cachedAt}`);
    }
  }

  console.log('\n---\n');

  // Wait 2 seconds before next test
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Test 3: Navigational query
  console.log('Test 3: Navigational query - "spotify"');
  const test3Start = Date.now();
  const { data: test3Data, error: test3Error } = await supabase.functions.invoke(
    'autocomplete-intelligence',
    {
      body: {
        keyword: 'spotify',
        platform: 'ios',
        region: 'us',
      },
    }
  );
  const test3Latency = Date.now() - test3Start;

  if (test3Error) {
    console.error('❌ Test 3 failed:', test3Error);
  } else {
    const response = test3Data as AutocompleteResponse;
    console.log(`✓ Response OK: ${response.ok}`);
    console.log(`✓ Intent: ${response.intent?.intent_type} (${response.intent?.confidence}% confidence)`);
    console.log(`✓ Reasoning: ${response.intent?.reasoning}`);
    console.log(`✓ Suggestions count: ${response.suggestionsCount}`);
    console.log(`✓ Edge Function latency: ${response.latencyMs}ms`);
    console.log(`✓ Total latency: ${test3Latency}ms`);
  }

  console.log('\n---\n');

  // Wait 2 seconds before next test
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Test 4: Commercial query
  console.log('Test 4: Commercial query - "best fitness tracker"');
  const test4Start = Date.now();
  const { data: test4Data, error: test4Error } = await supabase.functions.invoke(
    'autocomplete-intelligence',
    {
      body: {
        keyword: 'best fitness tracker',
        platform: 'ios',
        region: 'us',
      },
    }
  );
  const test4Latency = Date.now() - test4Start;

  if (test4Error) {
    console.error('❌ Test 4 failed:', test4Error);
  } else {
    const response = test4Data as AutocompleteResponse;
    console.log(`✓ Response OK: ${response.ok}`);
    console.log(`✓ Intent: ${response.intent?.intent_type} (${response.intent?.confidence}% confidence)`);
    console.log(`✓ Reasoning: ${response.intent?.reasoning}`);
    console.log(`✓ Suggestions count: ${response.suggestionsCount}`);
    console.log(`✓ Edge Function latency: ${response.latencyMs}ms`);
    console.log(`✓ Total latency: ${test4Latency}ms`);
  }

  console.log('\n---\n');

  // Check database tables
  console.log('Checking database tables...\n');

  // Check search_intent_registry
  const { data: intentData, error: intentError } = await supabase
    .from('search_intent_registry')
    .select('keyword, intent_type, intent_confidence, autocomplete_rank')
    .in('keyword', ['learn spanish', 'spotify', 'best fitness tracker']);

  if (intentError) {
    console.error('❌ Failed to fetch intent registry:', intentError);
  } else {
    console.log('✓ Search Intent Registry:');
    intentData?.forEach((row) => {
      console.log(`  - "${row.keyword}": ${row.intent_type} (${row.intent_confidence}% confidence, rank: ${row.autocomplete_rank || 'N/A'})`);
    });
  }

  console.log('');

  // Check autocomplete_intelligence_cache
  const { data: cacheData, error: cacheError } = await supabase
    .from('autocomplete_intelligence_cache')
    .select('query, suggestions_count, cached_at, expires_at, api_status')
    .in('query', ['learn spanish', 'spotify', 'best fitness tracker']);

  if (cacheError) {
    console.error('❌ Failed to fetch autocomplete cache:', cacheError);
  } else {
    console.log('✓ Autocomplete Intelligence Cache:');
    cacheData?.forEach((row) => {
      const expiresIn = Math.floor((new Date(row.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      console.log(`  - "${row.query}": ${row.suggestions_count} suggestions, cached ${new Date(row.cached_at).toLocaleString()}, expires in ${expiresIn} days`);
    });
  }

  console.log('\n✅ All tests completed!');
}

testAutocompleteIntelligence().catch(console.error);
