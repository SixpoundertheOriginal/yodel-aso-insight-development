import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCliAccess() {
  console.log('Checking CLI user access...\n');

  // Find CLI user
  const { data: cliProfile, error: cliError } = await supabase
    .from('profiles')
    .select('id, email, organization_id, first_name, last_name')
    .ilike('email', 'cli@yodelmobile.com')
    .single();

  if (!cliProfile) {
    console.error('❌ Could not find cli@yodelmobile.com');
    return;
  }

  console.log('✅ CLI User Profile:');
  console.log('  - Email:', cliProfile.email);
  console.log('  - Name:', cliProfile.first_name, cliProfile.last_name);
  console.log('  - User ID:', cliProfile.id);
  console.log('  - Organization ID:', cliProfile.organization_id);

  // Check organization details
  if (cliProfile.organization_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('id', cliProfile.organization_id)
      .single();

    if (org) {
      console.log('\n✅ Associated Organization:');
      console.log('  - Name:', org.name);
      console.log('  - Slug:', org.slug);
    }
  }

  // Check user_roles (super admin)
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', cliProfile.id);

  if (userRoles && userRoles.length > 0) {
    console.log('\n✅ User Roles (from user_roles table):');
    userRoles.forEach(role => {
      console.log(`  - ${role.role} (org: ${role.organization_id || 'platform-wide'})`);
    });
  }

  // Check organization_users
  const { data: orgUsers, error: orgError } = await supabase
    .from('organization_users')
    .select('*')
    .eq('user_id', cliProfile.id);

  if (orgUsers && orgUsers.length > 0) {
    console.log('\n✅ Organization Memberships (from organization_users table):');
    orgUsers.forEach(ou => {
      console.log(`  - Org: ${ou.organization_id}`);
      console.log(`    Role: ${ou.role || 'N/A'}`);
      console.log(`    Status: ${ou.status || 'N/A'}`);
      console.log(`    Created: ${ou.created_at}`);
    });
  } else {
    console.log('\n⚠️  No entries in organization_users table');
  }

  // Compare with Igor's access
  const { data: igorProfile } = await supabase
    .from('profiles')
    .select('id, email, organization_id')
    .eq('email', 'igor@yodelmobile.com')
    .single();

  if (igorProfile) {
    console.log('\n📋 Igor\'s Access (for comparison):');
    console.log('  - Organization ID:', igorProfile.organization_id);

    const { data: igorRoles } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', igorProfile.id);

    if (igorRoles) {
      console.log('  - User Roles:');
      igorRoles.forEach(role => {
        console.log(`    - ${role.role} (org: ${role.organization_id || 'platform-wide'})`);
      });
    }

    const { data: igorOrgUsers } = await supabase
      .from('organization_users')
      .select('*')
      .eq('user_id', igorProfile.id);

    if (igorOrgUsers && igorOrgUsers.length > 0) {
      console.log('  - Organization Memberships:');
      igorOrgUsers.forEach(ou => {
        console.log(`    - Org: ${ou.organization_id}, Role: ${ou.role}`);
      });
    }
  }

  console.log('\n✅ Summary:');
  console.log('CLI user has:');
  console.log('  - Organization ID set:', !!cliProfile.organization_id);
  console.log('  - Super admin role:', userRoles?.some(r => r.role === 'SUPER_ADMIN'));
  console.log('  - Organization membership:', orgUsers && orgUsers.length > 0);
}

checkCliAccess().catch(console.error);
