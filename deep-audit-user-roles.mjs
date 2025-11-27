import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deepAuditUserRoles() {
  console.log('🔍 DEEP AUDIT: USER ROLES & PERMISSIONS\n');
  console.log('='.repeat(80));

  // Get all users with their roles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, organization_id, org_id')
    .order('email');

  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('*');

  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name');

  console.log('\n📋 COMPLETE USER BREAKDOWN\n');
  console.log('-'.repeat(80));

  for (const profile of profiles || []) {
    const orgId = profile.organization_id || profile.org_id;
    const org = organizations?.find(o => o.id === orgId);
    const roles = userRoles?.filter(r => r.user_id === profile.id);

    console.log(`👤 ${profile.email}`);
    console.log(`   Name: ${profile.first_name || 'N/A'} ${profile.last_name || 'N/A'}`);
    console.log(`   Profile Org: ${org?.name || 'None'} (${orgId?.substring(0, 8)}...)`);

    if (roles && roles.length > 0) {
      console.log(`   Roles (${roles.length}):`);
      roles.forEach(role => {
        const roleOrg = organizations?.find(o => o.id === role.organization_id);
        const orgLabel = role.organization_id
          ? `${roleOrg?.name || 'Unknown'} (${role.organization_id.substring(0, 8)}...)`
          : 'PLATFORM-WIDE';
        console.log(`      - ${role.role} in ${orgLabel}`);
      });
    } else {
      console.log(`   Roles: None`);
    }
    console.log('');
  }

  // Analysis
  console.log('='.repeat(80));
  console.log('📊 ANALYSIS\n');

  const yodelOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
  const demoOrgId = 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f';

  const yodelUsers = profiles?.filter(p => (p.organization_id || p.org_id) === yodelOrgId);
  const demoUsers = profiles?.filter(p => (p.organization_id || p.org_id) === demoOrgId);

  console.log(`🏢 Yodel Mobile Users: ${yodelUsers?.length || 0}`);
  yodelUsers?.forEach(u => console.log(`   - ${u.email}`));

  console.log(`\n🏢 Demo Analytics Organization Users: ${demoUsers?.length || 0}`);
  demoUsers?.forEach(u => console.log(`   - ${u.email}`));

  console.log('\n❓ QUESTIONS TO RESOLVE:');
  console.log('   1. Should Igor, Kasia, Igor be moved to Yodel Mobile org?');
  console.log('   2. Is "Demo Analytics Organization" a real client or test data?');
  console.log('   3. Do the 8 apps belong to "Demo Analytics Organization" as a client?');
  console.log('      OR should they belong directly to Yodel Mobile?');
  console.log('');
}

deepAuditUserRoles().catch(console.error);
