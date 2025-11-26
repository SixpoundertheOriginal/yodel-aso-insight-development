import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function grantSuperAdmin() {
  console.log('Granting super admin privileges to Cli@yodelmobile.com...\n');

  // Get Cli's user ID
  const { data: cliProfile, error: cliError } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name')
    .eq('email', 'Cli@yodelmobile.com')
    .single();

  if (cliError || !cliProfile) {
    console.error('❌ Could not find Cli@yodelmobile.com:', cliError);
    console.log('\nTrying case-insensitive search...');

    // Try case-insensitive search
    const { data: cliProfileAlt, error: cliErrorAlt } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .ilike('email', 'cli@yodelmobile.com')
      .single();

    if (cliErrorAlt || !cliProfileAlt) {
      console.error('❌ Still could not find user:', cliErrorAlt);
      return;
    }

    console.log('✅ Found user (case-insensitive):');
    console.log('  - Email:', cliProfileAlt.email);
    console.log('  - Name:', cliProfileAlt.first_name, cliProfileAlt.last_name);
    console.log('  - User ID:', cliProfileAlt.id);

    await grantRole(cliProfileAlt);
    return;
  }

  console.log('✅ Found user:');
  console.log('  - Email:', cliProfile.email);
  console.log('  - Name:', cliProfile.first_name, cliProfile.last_name);
  console.log('  - User ID:', cliProfile.id);

  await grantRole(cliProfile);
}

async function grantRole(userProfile) {
  // Check existing roles
  const { data: existingRoles, error: checkError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', userProfile.id);

  if (existingRoles && existingRoles.length > 0) {
    console.log('\n📋 Existing roles:');
    existingRoles.forEach(role => {
      console.log(`  - ${role.role} (org: ${role.organization_id || 'platform-wide'})`);
    });

    // Check if already has SUPER_ADMIN
    const hasSuperAdmin = existingRoles.some(r => r.role === 'SUPER_ADMIN' && !r.organization_id);
    if (hasSuperAdmin) {
      console.log('\n✅ User already has platform-wide SUPER_ADMIN role!');
      return;
    }
  } else {
    console.log('\n📋 No existing roles found.');
  }

  // Insert super admin role
  console.log('\n⏳ Granting SUPER_ADMIN role...');
  const { data: newRole, error: insertError } = await supabase
    .from('user_roles')
    .insert({
      user_id: userProfile.id,
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
    .eq('user_id', userProfile.id);

  if (verifiedRoles) {
    console.log('\n📋 Verification - All roles:');
    verifiedRoles.forEach(role => {
      console.log(`  - ${role.role} (org: ${role.organization_id || 'platform-wide'})`);
    });
  }

  console.log('\n✅ Done! User now has super admin privileges.');
  console.log('⚠️  Note: User may need to log out and log back in for changes to take effect.');
}

grantSuperAdmin().catch(console.error);
