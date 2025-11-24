/**
 * Validate _metadata_source migration
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function validateMigration() {
  console.log('🔍 Step 1: Migration Validation\n');

  // Check if _metadata_source column exists
  const { data, error } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'app_metadata_cache'
          AND column_name = '_metadata_source';
      `
    });

  if (error) {
    console.error('❌ Error checking column:', error);
    console.log('\n⚠️  Trying alternative approach...\n');

    // Try to query the table directly to see if column exists
    const { data: testData, error: testError } = await supabase
      .from('app_metadata_cache')
      .select('_metadata_source')
      .limit(1);

    if (testError) {
      if (testError.message.includes('column') || testError.code === 'PGRST204') {
        console.error('❌ MIGRATION NOT APPLIED: _metadata_source column does NOT exist');
        console.log('\n📋 Required Migration:');
        console.log('   File: supabase/migrations/20260125000000_add_metadata_source_to_cache.sql');
        console.log('   Action: Run `supabase db push` to apply migration\n');
        return false;
      } else {
        console.error('❌ Unexpected error:', testError);
        return false;
      }
    } else {
      console.log('✅ _metadata_source column EXISTS (verified via SELECT query)');
      return true;
    }
  } else {
    if (data && data.length > 0) {
      console.log('✅ _metadata_source column EXISTS');
      console.table(data);
      return true;
    } else {
      console.error('❌ _metadata_source column NOT FOUND');
      console.log('\n📋 Required Migration:');
      console.log('   File: supabase/migrations/20260125000000_add_metadata_source_to_cache.sql');
      console.log('   Action: Run `supabase db push` to apply migration\n');
      return false;
    }
  }
}

validateMigration().catch(console.error);
