#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

console.log('\n=== AUTHENTICATION SYSTEM VERIFICATION ===\n');

async function verifyTables() {
  console.log('📊 1. CHECKING DATABASE TABLES\n');

  const expectedTables = [
    'user_roles',
    'organizations',
    'organization_features',
    'org_feature_entitlements',
    'platform_features',
    'role_feature_permissions',
    'user_feature_overrides',
    'profiles',
    'org_users_deprecated',
    'org_app_access'
  ];

  // Try to get tables using RPC (may not exist)
  let tables = null;
  let rpcError = null;
  try {
    const result = await supabase.rpc('exec_sql', {
      sql: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`
    });
    tables = result.data;
    rpcError = result.error;
  } catch (e) {
    // RPC function doesn't exist, use fallback
  }

  // Fallback: Try direct query
  let tablesList = [];
  for (const table of expectedTables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (!error || error.code !== '42P01') { // 42P01 = table does not exist
      tablesList.push({ tablename: table, exists: !error });
    }
  }

  console.log('   Tables Status:');
  for (const table of expectedTables) {
    const exists = tablesList.find(t => t.tablename === table);
    const status = exists ? '✅' : '❌';
    console.log(`   ${status} ${table}`);
  }
  console.log('');

  return tablesList;
}

async function verifyViews() {
  console.log('🔍 2. CHECKING DATABASE VIEWS\n');

  const expectedViews = [
    'user_permissions_unified',
    'user_role_permissions'
  ];

  console.log('   Views Status:');
  for (const view of expectedViews) {
    const { error } = await supabase.from(view).select('*').limit(1);
    const status = !error ? '✅' : '❌';
    const msg = error ? ` (${error.message})` : '';
    console.log(`   ${status} ${view}${msg}`);
  }
  console.log('');
}

async function verifyRPCFunctions() {
  console.log('⚙️  3. CHECKING RPC FUNCTIONS\n');

  // Test is_super_admin
  try {
    const { data, error } = await supabase.rpc('is_super_admin', {
      check_user_id: '00000000-0000-0000-0000-000000000000' // Dummy ID
    });
    console.log(`   ${!error ? '✅' : '❌'} is_super_admin(check_user_id)`);
  } catch (error) {
    console.log(`   ❌ is_super_admin(check_user_id) - ${error.message}`);
  }

  // Test user_has_role_permission
  try {
    const { data, error } = await supabase.rpc('user_has_role_permission', {
      check_user_id: '00000000-0000-0000-0000-000000000000',
      check_feature_key: 'analytics'
    });
    console.log(`   ${!error ? '✅' : '❌'} user_has_role_permission(user_id, feature_key)`);
  } catch (error) {
    console.log(`   ❌ user_has_role_permission - ${error.message}`);
  }

  console.log('');
}

async function verifyStephenAccess() {
  console.log('👤 4. TESTING STEPHEN\'S ACCESS\n');

  // Get Stephen
  let stephen = null;
  let stephenError = null;
  try {
    const result = await supabase
      .from('profiles')
      .select('id, email, org_id')
      .eq('email', 'stephen@yodelmobile.com')
      .single();
    stephen = result.data;
    stephenError = result.error;
  } catch (e) {
    // profiles table may not exist
  }

  if (!stephen) {
    // Try user_roles if profiles doesn't exist
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const stephenAuth = authUsers?.users?.find(u => u.email === 'stephen@yodelmobile.com');

    if (stephenAuth) {
      const { data: stephenRole } = await supabase
        .from('user_roles')
        .select('user_id, role, organization_id')
        .eq('user_id', stephenAuth.id)
        .single();

      console.log(`   ✅ Stephen found via user_roles`);
      console.log(`      Email: stephen@yodelmobile.com`);
      console.log(`      Role: ${stephenRole?.role}`);
      console.log(`      Org ID: ${stephenRole?.organization_id}\n`);
      return stephenRole;
    } else {
      console.log(`   ❌ Stephen not found\n`);
      return null;
    }
  }

  // Get Stephen's role
  const { data: role } = await supabase
    .from('user_roles')
    .select('role, organization_id')
    .eq('user_id', stephen.id)
    .single();

  console.log(`   ✅ Stephen found`);
  console.log(`      Email: ${stephen.email}`);
  console.log(`      Role: ${role?.role}`);
  console.log(`      Org ID: ${stephen.org_id}\n`);

  return { ...stephen, ...role };
}

async function verifyOrgFeatures(orgId) {
  console.log('📦 5. CHECKING ORGANIZATION FEATURES\n');

  // Try organization_features first
  const { data: orgFeatures, error: orgError } = await supabase
    .from('organization_features')
    .select('feature_key, is_enabled')
    .eq('organization_id', orgId)
    .eq('is_enabled', true);

  if (!orgError && orgFeatures) {
    console.log(`   ✅ organization_features table exists (${orgFeatures.length} features enabled)`);
    console.log(`      Features: ${orgFeatures.slice(0, 5).map(f => f.feature_key).join(', ')}...`);
  }

  // Try org_feature_entitlements
  const { data: entitlements, error: entError } = await supabase
    .from('org_feature_entitlements')
    .select('feature_key, is_enabled')
    .eq('organization_id', orgId)
    .eq('is_enabled', true);

  if (!entError && entitlements) {
    console.log(`   ✅ org_feature_entitlements table exists (${entitlements.length} features enabled)`);
    console.log(`      Features: ${entitlements.slice(0, 5).map(f => f.feature_key).join(', ')}...`);
  }

  // Try platform_features
  const { data: platformFeatures, error: platformError } = await supabase
    .from('platform_features')
    .select('feature_key, feature_name')
    .limit(5);

  if (!platformError && platformFeatures) {
    console.log(`   ✅ platform_features table exists (${platformFeatures.length}+ features defined)`);
  } else {
    console.log(`   ❌ platform_features table missing`);
  }

  console.log('');
}

async function verifyRolePermissions() {
  console.log('🔑 6. CHECKING ROLE PERMISSIONS\n');

  const { data: permissions, error } = await supabase
    .from('role_feature_permissions')
    .select('role, feature_key')
    .limit(5);

  if (!error && permissions) {
    console.log(`   ✅ role_feature_permissions table exists`);

    // Count by role
    const { data: counts } = await supabase
      .from('role_feature_permissions')
      .select('role')
      .eq('is_allowed', true);

    const roleCount = counts?.reduce((acc, p) => {
      acc[p.role] = (acc[p.role] || 0) + 1;
      return acc;
    }, {});

    if (roleCount) {
      console.log('   Permission counts by role:');
      Object.entries(roleCount).forEach(([role, count]) => {
        console.log(`      ${role}: ${count} features`);
      });
    }
  } else {
    console.log(`   ❌ role_feature_permissions table issue: ${error?.message}`);
  }

  console.log('');
}

async function verifyEdgeFunctions() {
  console.log('🌐 7. CHECKING EDGE FUNCTIONS\n');

  // Test admin-whoami
  try {
    const session = await supabase.auth.getSession();
    // Can't test without real session, just note it exists
    console.log('   ℹ️  admin-whoami - requires auth session to test');
  } catch (error) {
    console.log('   ℹ️  admin-whoami - cannot test without session');
  }

  // Test authorize
  console.log('   ℹ️  authorize - requires auth session to test');

  // Test admin-features
  console.log('   ℹ️  admin-features - requires auth session to test');

  console.log('');
}

async function summarize() {
  console.log('📋 SUMMARY\n');

  // Critical checks
  const checks = {
    user_roles: false,
    organizations: false,
    features_table: false,
    role_permissions: false,
    views: false,
    rpc_functions: false
  };

  // Check user_roles
  const { error: userRolesError } = await supabase.from('user_roles').select('id').limit(1);
  checks.user_roles = !userRolesError;

  // Check organizations
  const { error: orgsError } = await supabase.from('organizations').select('id').limit(1);
  checks.organizations = !orgsError;

  // Check features (either table)
  const { error: orgFeaturesError } = await supabase.from('organization_features').select('id').limit(1);
  const { error: entitlementsError } = await supabase.from('org_feature_entitlements').select('id').limit(1);
  checks.features_table = !orgFeaturesError || !entitlementsError;

  // Check role permissions
  const { error: rolePermError } = await supabase.from('role_feature_permissions').select('id').limit(1);
  checks.role_permissions = !rolePermError;

  // Check views
  const { error: viewError } = await supabase.from('user_permissions_unified').select('*').limit(1);
  checks.views = !viewError;

  // Check RPC
  try {
    await supabase.rpc('is_super_admin', { check_user_id: '00000000-0000-0000-0000-000000000000' });
    checks.rpc_functions = true;
  } catch {
    checks.rpc_functions = false;
  }

  console.log('   Core Components:');
  Object.entries(checks).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    const name = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    console.log(`   ${status} ${name}`);
  });

  const allPass = Object.values(checks).every(v => v);
  console.log('');
  if (allPass) {
    console.log('   ✅ ALL CRITICAL COMPONENTS WORKING\n');
  } else {
    console.log('   ⚠️  SOME COMPONENTS MISSING OR BROKEN\n');
  }
}

async function main() {
  try {
    await verifyTables();
    await verifyViews();
    await verifyRPCFunctions();
    const stephen = await verifyStephenAccess();
    if (stephen) {
      await verifyOrgFeatures(stephen.organization_id || stephen.org_id);
    }
    await verifyRolePermissions();
    await verifyEdgeFunctions();
    await summarize();

    console.log('=== VERIFICATION COMPLETE ===\n');
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error(error);
  }
}

main();
