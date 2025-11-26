import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkYodelUsers() {
  console.log('Checking Yodel Mobile users...\n');

  // Find Yodel Mobile organization
  const yodelOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  // Get all users with @yodelmobile.com email
  const { data: yodelUsers, error: usersError } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, organization_id')
    .ilike('email', '%@yodelmobile.com')
    .order('email');

  if (!yodelUsers) {
    console.error('❌ Could not find Yodel Mobile users');
    return;
  }

  console.log(`Found ${yodelUsers.length} users with @yodelmobile.com email:\n`);

  for (const user of yodelUsers) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👤 ${user.email}`);
    console.log(`   Name: ${user.first_name} ${user.last_name}`);
    console.log(`   Org ID: ${user.organization_id}`);

    // Get user roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id);

    if (roles && roles.length > 0) {
      console.log('   Roles:');
      roles.forEach(role => {
        const orgLabel = role.organization_id === yodelOrgId
          ? 'Yodel Mobile'
          : role.organization_id
            ? role.organization_id.substring(0, 8) + '...'
            : 'platform-wide';
        console.log(`     • ${role.role} (${orgLabel})`);
      });
    } else {
      console.log('   Roles: None');
    }

    // Get organization_users memberships
    const { data: orgUsers } = await supabase
      .from('organization_users')
      .select('organization_id, role, status')
      .eq('user_id', user.id);

    if (orgUsers && orgUsers.length > 0) {
      console.log('   Org Memberships:');
      orgUsers.forEach(ou => {
        const orgLabel = ou.organization_id === yodelOrgId
          ? 'Yodel Mobile'
          : ou.organization_id.substring(0, 8) + '...';
        console.log(`     • ${orgLabel}: ${ou.role} (${ou.status || 'active'})`);
      });
    }
    console.log('');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📊 Summary:');

  const superAdmins = yodelUsers.filter(async (user) => {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .eq('role', 'SUPER_ADMIN')
      .is('organization_id', null);
    return roles && roles.length > 0;
  });

  console.log(`Total @yodelmobile.com users: ${yodelUsers.length}`);
  console.log('\nRecommendation for CLI user:');
  console.log('If CLI should be a regular Yodel Mobile admin (not platform super admin),');
  console.log('we should remove the platform-wide SUPER_ADMIN role and keep only the');
  console.log('organization-specific admin role for Yodel Mobile.');
}

checkYodelUsers().catch(console.error);
