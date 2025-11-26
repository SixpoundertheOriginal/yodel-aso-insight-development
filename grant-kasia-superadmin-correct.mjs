import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function grantSuperAdmin() {
  console.log('Granting super admin privileges to kasia@yodelmobile.com...\n');

  // Get Kasia's user ID
  const { data: kasiaProfile, error: kasiaError } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', 'kasia@yodelmobile.com')
    .single();

  if (kasiaError || !kasiaProfile) {
    console.error('❌ Could not find kasia@yodelmobile.com:', kasiaError);
    return;
  }

  console.log('✅ Found user:');
  console.log('  - Email:', kasiaProfile.email);
  console.log('  - User ID:', kasiaProfile.id);

  // Check if Kasia already has a super admin role
  const { data: existingRoles, error: checkError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', kasiaProfile.id);

  if (existingRoles && existingRoles.length > 0) {
    console.log('\n📋 Existing roles for Kasia:');
    existingRoles.forEach(role => {
      console.log(`  - ${role.role} (org: ${role.organization_id || 'platform-wide'})`);
    });
  }

  // Check Igor's super admin role for reference
  const { data: igorProfile, error: igorProfileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', 'igor@yodelmobile.com')
    .single();

  if (igorProfile) {
    const { data: igorRoles, error: igorRolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', igorProfile.id);

    if (igorRoles && igorRoles.length > 0) {
      console.log('\n📋 Igor\'s roles (for reference):');
      igorRoles.forEach(role => {
        console.log(`  - ${role.role} (org: ${role.organization_id || 'platform-wide'})`);
      });
    }
  }

  // Insert super admin role for Kasia
  // Using SUPER_ADMIN role with null organization_id (platform-wide)
  const { data: newRole, error: insertError } = await supabase
    .from('user_roles')
    .insert({
      user_id: kasiaProfile.id,
      role: 'SUPER_ADMIN',
      organization_id: null // null means platform-wide super admin
    })
    .select();

  if (insertError) {
    console.error('\n❌ Error granting super admin:', insertError);
    return;
  }

  if (newRole && newRole.length > 0) {
    console.log('\n✅ Super admin role granted successfully!');
    console.log(JSON.stringify(newRole[0], null, 2));
  }

  // Verify the change
  const { data: verifiedRoles, error: verifyError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', kasiaProfile.id);

  if (verifiedRoles) {
    console.log('\n📋 Verification - All roles for Kasia:');
    verifiedRoles.forEach(role => {
      console.log(`  - ${role.role} (org: ${role.organization_id || 'platform-wide'})`);
    });
  }

  console.log('\n✅ Done! Kasia now has super admin privileges.');
  console.log('⚠️  Note: Kasia may need to log out and log back in for changes to take effect.');
}

grantSuperAdmin().catch(console.error);
