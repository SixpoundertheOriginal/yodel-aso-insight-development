import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 Checking is_super_admin() Function Configuration\n');
console.log('='.repeat(80));

async function check() {
  // Query function metadata
  console.log('\n📋 Querying function metadata...');

  const { data, error } = await supabase.rpc('pg_get_functiondef', {
    funcoid: 'public.is_super_admin(uuid)'
  });

  if (error) {
    console.log('   ❌ Error:', error.message);
    console.log('\n   Trying direct query...\n');

    // Try direct query
    const query = `
      SELECT
        p.proname as function_name,
        pg_get_functiondef(p.oid) as definition,
        CASE p.prosecdef
          WHEN true THEN 'SECURITY DEFINER'
          ELSE 'SECURITY INVOKER'
        END as security_type,
        p.provolatile as volatility
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'is_super_admin'
    `;

    const { data: funcData, error: funcError } = await supabase.rpc('execute_sql', { query });

    if (funcError) {
      console.log('   ❌ Direct query error:', funcError.message);
      console.log('\n   ⚠️  Cannot check function - trying RPC call test...\n');

      // Just test if the function works
      const { data: testResult, error: testError } = await supabase.rpc('is_super_admin');

      if (testError) {
        console.log('   ❌ RPC call failed:', testError.message);
        console.log('   Code:', testError.code);
        console.log('   Details:', testError.details);
        console.log('   Hint:', testError.hint);

        if (testError.message?.includes('stack depth limit exceeded')) {
          console.log('\n' + '='.repeat(80));
          console.log('❌ ❌ ❌  FOUND THE BUG!  ❌ ❌ ❌');
          console.log('='.repeat(80));
          console.log('\n🐛 CIRCULAR RLS DEPENDENCY DETECTED');
          console.log('\nThe is_super_admin() function has SECURITY INVOKER');
          console.log('which causes it to trigger RLS policies that call');
          console.log('is_super_admin() again, creating infinite recursion.');
          console.log('\n💡 FIX: Apply migration 20251126000013');
          console.log('   This changes the function to SECURITY DEFINER');
          console.log('   which bypasses RLS and breaks the circular dependency.');
          console.log('\n📋 TO APPLY:');
          console.log('   npx supabase db push');
          console.log('   OR');
          console.log('   Apply migration manually in Supabase dashboard');
        } else if (testError.message?.includes('permission denied')) {
          console.log('\n' + '='.repeat(80));
          console.log('❌ PERMISSION DENIED');
          console.log('='.repeat(80));
          console.log('\nThe function exists but RLS is blocking access.');
          console.log('Need to grant EXECUTE permission.');
        }
      } else {
        console.log('   ✅ RPC call works! Result:', testResult);
      }
      return;
    }

    console.log('   Function info:', funcData);
  } else {
    console.log('   ✅ Function definition:', data);
  }

  console.log('\n');
}

check().catch(err => {
  console.error('\n💥 ERROR:');
  console.error(err);
});
