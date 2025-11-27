import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testPolicyLogic() {
  console.log('🔍 Testing RLS Policy Logic\n');
  console.log('='.repeat(80));
  console.log('');

  const cliUserId = '8920ac57-63da-4f8e-9970-719be1e2569c';
  const yodelOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  console.log('📋 Test Subject:');
  console.log('   CLI User ID:', cliUserId);
  console.log('   Yodel Org ID:', yodelOrgId);
  console.log('');

  // Step 1: Check if user has a role in Yodel Mobile
  console.log('🧪 Step 1: Check user_roles for CLI user');
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', cliUserId);

  if (rolesError) {
    console.log('❌ Error:', rolesError.message);
    return;
  }

  console.log('   Found', userRoles?.length || 0, 'roles:');
  if (userRoles && userRoles.length > 0) {
    userRoles.forEach(r => {
      const orgLabel = r.organization_id
        ? `in org ${r.organization_id.substring(0, 8)}...`
        : 'PLATFORM-WIDE';
      console.log(`   - ${r.role} ${orgLabel}`);
      if (r.organization_id === yodelOrgId) {
        console.log('     ✅ This matches Yodel Mobile!');
      }
    });
  }
  console.log('');

  // Step 2: Simulate the RLS policy condition
  console.log('🧪 Step 2: Simulate RLS policy SELECT condition');
  console.log('   Policy condition: agency_org_id IN (');
  console.log('     SELECT organization_id FROM user_roles WHERE user_id = auth.uid()');
  console.log('   )');
  console.log('');

  const { data: orgsFromRoles, error: orgsError } = await supabase
    .from('user_roles')
    .select('organization_id')
    .eq('user_id', cliUserId);

  if (orgsError) {
    console.log('❌ Error:', orgsError.message);
    return;
  }

  const orgIds = (orgsFromRoles || [])
    .map(r => r.organization_id)
    .filter(id => id !== null);

  console.log('   Organizations from user_roles:', orgIds.length);
  orgIds.forEach(id => {
    console.log(`   - ${id?.substring(0, 8)}...`);
  });
  console.log('');

  // Step 3: Check if Yodel Mobile is in that list
  console.log('🧪 Step 3: Check if Yodel Mobile is in the list');
  const yodelInList = orgIds.includes(yodelOrgId);
  if (yodelInList) {
    console.log('   ✅ YES! Yodel Mobile IS in the list');
    console.log('   The RLS policy SHOULD allow access');
  } else {
    console.log('   ❌ NO! Yodel Mobile is NOT in the list');
    console.log('   The RLS policy would block access');
  }
  console.log('');

  // Step 4: Check agency_clients records
  console.log('🧪 Step 4: Check agency_clients records (service role, no RLS)');
  const { data: agencyRecords, error: agencyError } = await supabase
    .from('agency_clients')
    .select('*')
    .eq('agency_org_id', yodelOrgId)
    .eq('is_active', true);

  if (agencyError) {
    console.log('❌ Error:', agencyError.message);
    return;
  }

  console.log('   Found', agencyRecords?.length || 0, 'active agency relationships');
  if (agencyRecords && agencyRecords.length > 0) {
    agencyRecords.forEach(r => {
      console.log(`   - Client org: ${r.client_org_id.substring(0, 8)}...`);
    });
  }
  console.log('');

  // Final diagnosis
  console.log('='.repeat(80));
  console.log('📊 DIAGNOSIS:');
  console.log('='.repeat(80));
  console.log('');

  if (yodelInList && agencyRecords && agencyRecords.length > 0) {
    console.log('✅ Policy condition matches: User has role in Yodel Mobile');
    console.log('✅ Agency relationships exist: ' + agencyRecords.length + ' record(s)');
    console.log('');
    console.log('🟢 EXPECTED BEHAVIOR: RLS should allow access');
    console.log('');
    console.log('If edge function still returns 0 results, possible causes:');
    console.log('1. RLS policies were not applied to remote database');
    console.log('2. Policy syntax error in the migration');
    console.log('3. auth.uid() not matching user_id in edge function context');
  } else {
    console.log('❌ Something is wrong with the setup');
    if (!yodelInList) {
      console.log('   - User does NOT have a role in Yodel Mobile');
    }
    if (!agencyRecords || agencyRecords.length === 0) {
      console.log('   - No agency relationships found');
    }
  }
  console.log('');
}

testPolicyLogic().catch(console.error);
