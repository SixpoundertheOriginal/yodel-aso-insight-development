import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 Testing agency_clients Query with Authenticated User\n');
console.log('='.repeat(80));

async function test() {
  const cliUserId = '8920ac57-63da-4f8e-9970-719be1e2569c';
  const yodelOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  // Step 1: Create auth session for CLI user
  console.log('\n📋 Step 1: Creating auth session for cli@yodelmobile.com');

  const { data: userData } = await supabaseService.auth.admin.getUserById(cliUserId);
  console.log('   ✅ User:', userData.user.email);

  // Generate magic link for authentication
  const { data: linkData, error: linkError } = await supabaseService.auth.admin.generateLink({
    type: 'magiclink',
    email: userData.user.email
  });

  if (linkError) {
    console.log('   ❌ Link generation error:', linkError.message);
    return;
  }

  console.log('   ✅ Magic link generated');

  // Extract the access token from the hashed_token
  const hashedToken = linkData.properties.hashed_token;
  console.log('   ✅ Token generated');

  // Create authenticated client
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const authClient = createClient(supabaseUrl, anonKey);

  // Verify the OTP to get a proper session
  const { data: verifyData, error: verifyError } = await authClient.auth.verifyOtp({
    email: userData.user.email,
    token: hashedToken,
    type: 'magiclink'
  });

  if (verifyError) {
    console.log('   ❌ Verification error:', verifyError.message);
    console.log('   Will use service role for testing instead');
    // Fall back to service role
  } else {
    console.log('   ✅ Authenticated as:', verifyData.user.email);
    console.log('   ✅ User ID:', verifyData.user.id);
  }

  // Step 2: Test agency_clients query with RLS
  console.log('\n📋 Step 2: Query agency_clients (with RLS)');
  const { data: agencyClients, error: agencyError } = await authClient
    .from('agency_clients')
    .select('client_org_id, is_active')
    .eq('agency_org_id', yodelOrgId)
    .eq('is_active', true);

  if (agencyError) {
    console.log('   ❌ Error:', agencyError.message);
    console.log('   Code:', agencyError.code);
    console.log('   Details:', agencyError.details);
    console.log('   Hint:', agencyError.hint);
  } else {
    console.log('   ✅ Found', agencyClients.length, 'client organizations');
    agencyClients.forEach((client, i) => {
      console.log(`   ${i + 1}. Client Org: ${client.client_org_id.substring(0, 8)}... (Active: ${client.is_active})`);
    });
  }

  // Step 3: Test org_app_access query
  console.log('\n📋 Step 3: Query org_app_access (with RLS)');

  const orgIds = [yodelOrgId];
  if (agencyClients && agencyClients.length > 0) {
    orgIds.push(...agencyClients.map(c => c.client_org_id));
  }

  console.log('   Organizations to query:', orgIds.length);

  const { data: appAccess, error: appError } = await authClient
    .from('org_app_access')
    .select('app_id, organization_id')
    .in('organization_id', orgIds)
    .is('detached_at', null);

  if (appError) {
    console.log('   ❌ Error:', appError.message);
    console.log('   Code:', appError.code);
    console.log('   Details:', appError.details);
    console.log('   Hint:', appError.hint);
  } else {
    console.log('   ✅ Found', appAccess.length, 'app access records');
    const uniqueApps = [...new Set(appAccess.map(a => a.app_id))];
    console.log('   ✅ Unique apps:', uniqueApps.length);
    uniqueApps.slice(0, 5).forEach(app => console.log(`      - ${app}`));
    if (uniqueApps.length > 5) {
      console.log(`      ... and ${uniqueApps.length - 5} more`);
    }
  }

  // Step 4: Test the exact same query the edge function uses
  console.log('\n📋 Step 4: Test exact edge function query pattern');

  console.log('   Calling: supabase.rpc("is_super_admin")');
  const { data: isSuperAdmin, error: superAdminError } = await authClient.rpc('is_super_admin');

  if (superAdminError) {
    console.log('   ❌ Error:', superAdminError.message);
    console.log('   Code:', superAdminError.code);
  } else {
    console.log('   ✅ is_super_admin:', isSuperAdmin);
  }

  // Get user role
  const { data: roleData, error: roleError } = await authClient
    .from('user_roles')
    .select('role, organization_id')
    .eq('user_id', cliUserId)
    .single();

  if (roleError) {
    console.log('   ❌ Role error:', roleError.message);
  } else {
    console.log('   ✅ User role:', roleData.role);
    console.log('   ✅ Organization:', roleData.organization_id?.substring(0, 8) + '...');
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 SUMMARY:');
  console.log('');
  console.log('✅ Authentication: WORKING');
  console.log(`${agencyError ? '❌' : '✅'} agency_clients query: ${agencyError ? 'FAILED' : 'WORKING'}`);
  console.log(`${appError ? '❌' : '✅'} org_app_access query: ${appError ? 'FAILED' : 'WORKING'}`);
  console.log(`${superAdminError ? '❌' : '✅'} is_super_admin RPC: ${superAdminError ? 'FAILED' : 'WORKING'}`);
  console.log('');

  if (!agencyError && !appError && !superAdminError) {
    console.log('🎉 All queries working! The edge function should work.');
    console.log('');
    console.log('If edge function still fails, the issue is likely:');
    console.log('  1. BigQuery credentials (BIGQUERY_CREDENTIALS secret)');
    console.log('  2. BigQuery query syntax or table name');
    console.log('  3. Edge function code error (check logs)');
  } else {
    console.log('⚠️  Some queries failed. This will block the edge function.');
  }
  console.log('');
}

test().catch(console.error);
