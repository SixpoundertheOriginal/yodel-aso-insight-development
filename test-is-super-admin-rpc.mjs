import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 Testing is_super_admin RPC Function\n');
console.log('='.repeat(80));

async function test() {
  const cliUserId = '8920ac57-63da-4f8e-9970-719be1e2569c';

  // Test 1: Check if function exists
  console.log('\n✅ TEST 1: Check if is_super_admin() function exists');
  const { data: functions, error: fnError } = await supabase.rpc('pg_get_functiondef', {
    funcid: 'public.is_super_admin(uuid)'
  }).single();

  if (fnError) {
    console.log('   ❌ Error checking function:', fnError.message);
  } else {
    console.log('   ✅ Function exists');
  }

  // Test 2: Call RPC without parameters (should use auth.uid())
  console.log('\n✅ TEST 2: Call is_super_admin() without parameters');
  const { data: isSuperAdmin1, error: error1 } = await supabase.rpc('is_super_admin');

  if (error1) {
    console.log('   ❌ Error:', error1.message);
    console.log('   Code:', error1.code);
    console.log('   Details:', error1.details);
    console.log('   Hint:', error1.hint);
  } else {
    console.log('   ✅ Result:', isSuperAdmin1);
  }

  // Test 3: Call RPC with user ID parameter
  console.log('\n✅ TEST 3: Call is_super_admin(user_id) with parameter');
  const { data: isSuperAdmin2, error: error2 } = await supabase.rpc('is_super_admin', {
    check_user_id: cliUserId
  });

  if (error2) {
    console.log('   ❌ Error:', error2.message);
    console.log('   Code:', error2.code);
    console.log('   Details:', error2.details);
    console.log('   Hint:', error2.hint);
  } else {
    console.log('   ✅ Result:', isSuperAdmin2);
  }

  // Test 4: Check user role directly
  console.log('\n✅ TEST 4: Check user role directly in user_roles table');
  const { data: userRole, error: roleError } = await supabase
    .from('user_roles')
    .select('role, organization_id')
    .eq('user_id', cliUserId)
    .single();

  if (roleError) {
    console.log('   ❌ Error:', roleError.message);
  } else {
    console.log('   ✅ User role:', userRole.role);
    console.log('   ✅ Organization ID:', userRole.organization_id);
    console.log('   ✅ Is super admin?', userRole.role === 'SUPER_ADMIN' && userRole.organization_id === null);
  }

  // Test 5: Get function security setting
  console.log('\n✅ TEST 5: Check if function uses SECURITY DEFINER or INVOKER');
  console.log('   (This determines if function bypasses RLS)');
  console.log('   Note: Can only check via SQL, not JS client');

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 SUMMARY:');
  console.log('   User ID:', cliUserId);
  console.log('   Expected: VIEWER (not super admin)');
  console.log('   RPC Result:', isSuperAdmin2);
  console.log('   Direct Query:', userRole?.role);
  console.log('\n');
}

test().catch(console.error);
