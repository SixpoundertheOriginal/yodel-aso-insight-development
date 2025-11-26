import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyStephenCliRoles() {
  console.log('🔍 Verifying Stephen and CLI user_roles records...\n');

  const yodelOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  // Find Stephen
  const { data: stephenProfile } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', 'stephen@yodelmobile.com')
    .single();

  // Find CLI
  const { data: cliProfile } = await supabase
    .from('profiles')
    .select('id, email')
    .ilike('email', 'cli@yodelmobile.com')
    .single();

  console.log('📋 User IDs:');
  console.log('  Stephen:', stephenProfile?.id);
  console.log('  CLI:', cliProfile?.id);
  console.log('');

  // Check Stephen's user_roles
  if (stephenProfile) {
    const { data: stephenRoles } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', stephenProfile.id);

    console.log('📋 Stephen\'s user_roles:');
    if (stephenRoles && stephenRoles.length > 0) {
      stephenRoles.forEach(role => {
        const orgMatch = role.organization_id === yodelOrgId ? '✅ MATCHES' : '❌ DIFFERENT';
        console.log(`  - Role: ${role.role}`);
        console.log(`    Org ID: ${role.organization_id}`);
        console.log(`    ${orgMatch} Yodel Mobile org`);
      });
    } else {
      console.log('  ❌ NO ROLES FOUND');
    }
    console.log('');
  }

  // Check CLI's user_roles
  if (cliProfile) {
    const { data: cliRoles } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', cliProfile.id);

    console.log('📋 CLI\'s user_roles:');
    if (cliRoles && cliRoles.length > 0) {
      cliRoles.forEach(role => {
        const orgMatch = role.organization_id === yodelOrgId ? '✅ MATCHES' : '❌ DIFFERENT';
        console.log(`  - Role: ${role.role}`);
        console.log(`    Org ID: ${role.organization_id}`);
        console.log(`    ${orgMatch} Yodel Mobile org`);
      });
    } else {
      console.log('  ❌ NO ROLES FOUND');
    }
    console.log('');
  }

  // Test the RLS policy logic manually
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RLS POLICY SIMULATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Policy: agency_org_id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())');
  console.log('');
  console.log('Agency record:');
  console.log('  agency_org_id: 7cccba3f-0a8f-446f-9dba-86e9cb68c92b');
  console.log('');

  if (stephenProfile) {
    const { data: stephenOrgIds } = await supabase
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', stephenProfile.id);

    const orgIds = (stephenOrgIds || []).map(r => r.organization_id);
    const hasYodelOrg = orgIds.includes(yodelOrgId);

    console.log('Stephen simulation:');
    console.log(`  SELECT organization_id FROM user_roles WHERE user_id = '${stephenProfile.id}'`);
    console.log(`  Result: [${orgIds.join(', ')}]`);
    console.log(`  Does '7cccba3f...' appear in result? ${hasYodelOrg ? '✅ YES' : '❌ NO'}`);
    console.log(`  RLS Policy would: ${hasYodelOrg ? '✅ ALLOW' : '❌ DENY'} SELECT on agency_clients`);
    console.log('');
  }

  if (cliProfile) {
    const { data: cliOrgIds } = await supabase
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', cliProfile.id);

    const orgIds = (cliOrgIds || []).map(r => r.organization_id);
    const hasYodelOrg = orgIds.includes(yodelOrgId);

    console.log('CLI simulation:');
    console.log(`  SELECT organization_id FROM user_roles WHERE user_id = '${cliProfile.id}'`);
    console.log(`  Result: [${orgIds.join(', ')}]`);
    console.log(`  Does '7cccba3f...' appear in result? ${hasYodelOrg ? '✅ YES' : '❌ NO'}`);
    console.log(`  RLS Policy would: ${hasYodelOrg ? '✅ ALLOW' : '❌ DENY'} SELECT on agency_clients`);
    console.log('');
  }
}

verifyStephenCliRoles().catch(console.error);
