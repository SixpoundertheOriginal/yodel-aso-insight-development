import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const CLI_USER_ID = '8920ac57-63da-4f8e-9970-719be1e2569c';
const YODEL_MOBILE_ORG_ID = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

console.log('🔍 Checking organizationId null issue for cli@yodelmobile.com...\n');

// 1. Check user_roles table
console.log('1️⃣ Checking user_roles table:');
const { data: userRoles, error: userRolesError } = await supabase
  .from('user_roles')
  .select('user_id, organization_id, role, created_at')
  .eq('user_id', CLI_USER_ID);

if (userRolesError) {
  console.error('❌ Error querying user_roles:', userRolesError);
} else {
  console.log('✅ user_roles data:', JSON.stringify(userRoles, null, 2));
}

// 2. Check user_permissions_unified view
console.log('\n2️⃣ Checking user_permissions_unified view:');
const { data: permissions, error: permissionsError } = await supabase
  .from('user_permissions_unified')
  .select('user_id, org_id, effective_role, is_org_scoped_role, is_super_admin')
  .eq('user_id', CLI_USER_ID);

if (permissionsError) {
  console.error('❌ Error querying user_permissions_unified:', permissionsError);
} else {
  console.log('✅ user_permissions_unified data:', JSON.stringify(permissions, null, 2));
}

// 3. Check organization_features
console.log('\n3️⃣ Checking organization_features:');
const { data: features, error: featuresError } = await supabase
  .from('organization_features')
  .select('feature_key, is_enabled')
  .eq('organization_id', YODEL_MOBILE_ORG_ID)
  .in('feature_key', ['keyword_intelligence', 'keyword_rank_tracking']);

if (featuresError) {
  console.error('❌ Error querying organization_features:', featuresError);
} else {
  console.log('✅ organization_features:', JSON.stringify(features, null, 2));
}

// 4. Check RLS policies on user_roles
console.log('\n4️⃣ Checking RLS policies on user_roles table:');
const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
  sql: `
    SELECT
      policyname,
      permissive,
      roles::text,
      cmd,
      qual
    FROM pg_policies
    WHERE tablename = 'user_roles'
    ORDER BY policyname;
  `
});

if (policiesError) {
  console.log('⚠️  Could not query policies directly (expected if RPC not available)');
  console.log('   Error:', policiesError.message);
} else {
  console.log('✅ RLS Policies:', JSON.stringify(policies, null, 2));
}

console.log('\n✅ Database check complete');
