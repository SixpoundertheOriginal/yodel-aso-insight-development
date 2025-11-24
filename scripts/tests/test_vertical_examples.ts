/**
 * Test Script: Vertical-Specific Keyword Examples
 *
 * Verifies that vertical-specific examples are loaded correctly from the database.
 * Run with: npx tsx scripts/tests/test_vertical_examples.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testVerticalExamples() {
  console.log('🧪 Testing Vertical-Specific Keyword Examples\n');

  const verticals = ['Education', 'Games', 'Finance', 'Health', 'Productivity'];

  for (const vertical of verticals) {
    console.log(`\n📦 Testing vertical: ${vertical}`);
    console.log('─'.repeat(60));

    // Fetch informational examples
    const { data: informationalData, error: infoError } = await supabase
      .from('aso_intent_keyword_examples')
      .select('example_phrase, display_order')
      .eq('vertical', vertical)
      .eq('intent_type', 'informational')
      .eq('is_active', true)
      .is('market', null)
      .order('display_order', { ascending: true })
      .limit(3);

    if (infoError) {
      console.error(`❌ Error fetching informational examples:`, infoError);
      continue;
    }

    console.log(`  🔍 Informational (${informationalData?.length || 0} examples):`);
    informationalData?.forEach((row) => {
      console.log(`     ${row.display_order}. ${row.example_phrase}`);
    });

    // Fetch commercial examples
    const { data: commercialData, error: commError } = await supabase
      .from('aso_intent_keyword_examples')
      .select('example_phrase, display_order')
      .eq('vertical', vertical)
      .eq('intent_type', 'commercial')
      .eq('is_active', true)
      .is('market', null)
      .order('display_order', { ascending: true })
      .limit(3);

    if (commError) {
      console.error(`❌ Error fetching commercial examples:`, commError);
      continue;
    }

    console.log(`  💰 Commercial (${commercialData?.length || 0} examples):`);
    commercialData?.forEach((row) => {
      console.log(`     ${row.display_order}. ${row.example_phrase}`);
    });

    // Fetch transactional examples
    const { data: transactionalData, error: transError } = await supabase
      .from('aso_intent_keyword_examples')
      .select('example_phrase, display_order')
      .eq('vertical', vertical)
      .eq('intent_type', 'transactional')
      .eq('is_active', true)
      .is('market', null)
      .order('display_order', { ascending: true })
      .limit(3);

    if (transError) {
      console.error(`❌ Error fetching transactional examples:`, transError);
      continue;
    }

    console.log(`  🛒 Transactional (${transactionalData?.length || 0} examples):`);
    transactionalData?.forEach((row) => {
      console.log(`     ${row.display_order}. ${row.example_phrase}`);
    });
  }

  console.log('\n\n✅ Test complete!\n');
}

// Run test
testVerticalExamples().catch(console.error);
