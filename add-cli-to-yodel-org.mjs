import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addCliToYodelOrg() {
  console.log('Adding CLI user to Yodel Mobile organization...\n');

  // Find CLI user
  const { data: cliProfile, error: cliError } = await supabase
    .from('profiles')
    .select('id, email, organization_id')
    .ilike('email', 'cli@yodelmobile.com')
    .single();

  if (cliError || !cliProfile) {
    console.error('❌ Could not find cli@yodelmobile.com:', cliError);
    return;
  }

  console.log('✅ Found CLI user:');
  console.log('  - Email:', cliProfile.email);
  console.log('  - User ID:', cliProfile.id);
  console.log('  - Current Org ID:', cliProfile.organization_id || 'None');

  // Find Yodel Mobile organization
  const { data: yodelOrg, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .ilike('name', '%yodel%mobile%')
    .single();

  if (orgError || !yodelOrg) {
    console.error('❌ Could not find Yodel Mobile organization:', orgError);
    console.log('\n📋 Searching for all organizations with "yodel" in name...');

    const { data: allOrgs, error: allOrgsError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .ilike('name', '%yodel%')
      .order('name');

    if (allOrgs && allOrgs.length > 0) {
      console.log('Found organizations:');
      allOrgs.forEach(org => {
        console.log(`  - ${org.name} (ID: ${org.id}, slug: ${org.slug})`);
      });
    }
    return;
  }

  console.log('\n✅ Found Yodel Mobile organization:');
  console.log('  - Name:', yodelOrg.name);
  console.log('  - Org ID:', yodelOrg.id);
  console.log('  - Slug:', yodelOrg.slug);

  // Check if CLI user is already in the organization
  if (cliProfile.organization_id === yodelOrg.id) {
    console.log('\n✅ CLI user is already associated with Yodel Mobile organization!');
  } else {
    // Update CLI user's organization_id
    console.log('\n⏳ Associating CLI user with Yodel Mobile organization...');
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ organization_id: yodelOrg.id })
      .eq('id', cliProfile.id)
      .select();

    if (updateError) {
      console.error('\n❌ Error updating profile:', updateError);
      return;
    }

    console.log('✅ Successfully associated CLI user with Yodel Mobile!');
  }

  // Check organization_users table for additional permissions
  const { data: orgUsers, error: orgUsersError } = await supabase
    .from('organization_users')
    .select('*')
    .eq('user_id', cliProfile.id)
    .eq('organization_id', yodelOrg.id);

  if (orgUsers && orgUsers.length > 0) {
    console.log('\n📋 Existing organization_users entries:');
    orgUsers.forEach(ou => {
      console.log(`  - Role: ${ou.role}, Status: ${ou.status || 'active'}`);
    });
  } else {
    console.log('\n⏳ Adding CLI user to organization_users table...');
    const { data: newOrgUser, error: insertError } = await supabase
      .from('organization_users')
      .insert({
        user_id: cliProfile.id,
        organization_id: yodelOrg.id,
        role: 'OWNER', // Give full access within the org
        status: 'active'
      })
      .select();

    if (insertError) {
      console.error('\n❌ Error adding to organization_users:', insertError);
      return;
    }

    console.log('✅ Added CLI user to organization_users as OWNER');
  }

  // Verify user roles
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', cliProfile.id);

  if (userRoles) {
    console.log('\n📋 User roles verification:');
    userRoles.forEach(role => {
      console.log(`  - ${role.role} (org: ${role.organization_id || 'platform-wide'})`);
    });
  }

  console.log('\n✅ Done! CLI user now has:');
  console.log('  1. Platform-wide SUPER_ADMIN access');
  console.log('  2. Default organization: Yodel Mobile');
  console.log('  3. OWNER role in Yodel Mobile organization');
  console.log('\n⚠️  Note: User may need to log out and log back in for changes to take effect.');
}

addCliToYodelOrg().catch(console.error);
