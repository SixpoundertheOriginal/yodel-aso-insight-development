import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function grantCliYodelAdmin() {
  console.log('Granting CLI user SUPER_ADMIN for Yodel Mobile organization...\n');

  // Find CLI user
  const { data: cliProfile, error: cliError } = await supabase
    .from('profiles')
    .select('id, email, organization_id')
    .ilike('email', 'cli@yodelmobile.com')
    .single();

  if (!cliProfile) {
    console.error('❌ Could not find cli@yodelmobile.com');
    return;
  }

  console.log('✅ Found CLI user:');
  console.log('  - Email:', cliProfile.email);
  console.log('  - User ID:', cliProfile.id);

  // Find Yodel Mobile org
  const yodelOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  // Check existing roles
  const { data: existingRoles } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', cliProfile.id);

  console.log('\n📋 Current roles:');
  if (existingRoles) {
    existingRoles.forEach(role => {
      console.log(`  - ${role.role} (org: ${role.organization_id || 'platform-wide'})`);
    });
  }

  // Check if already has SUPER_ADMIN for Yodel Mobile
  const hasSuperAdminForYodel = existingRoles?.some(
    r => r.role === 'SUPER_ADMIN' && r.organization_id === yodelOrgId
  );

  if (hasSuperAdminForYodel) {
    console.log('\n✅ CLI user already has SUPER_ADMIN role for Yodel Mobile!');
    return;
  }

  // Remove VIEWER role if it exists
  const viewerRole = existingRoles?.find(
    r => r.role === 'VIEWER' && r.organization_id === yodelOrgId
  );

  if (viewerRole) {
    console.log('\n⏳ Removing VIEWER role...');
    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', viewerRole.id);

    if (deleteError) {
      console.error('❌ Error removing VIEWER role:', deleteError);
    } else {
      console.log('✅ Removed VIEWER role');
    }
  }

  // Insert SUPER_ADMIN role for Yodel Mobile
  console.log('\n⏳ Granting SUPER_ADMIN role for Yodel Mobile organization...');
  const { data: newRole, error: insertError } = await supabase
    .from('user_roles')
    .insert({
      user_id: cliProfile.id,
      role: 'SUPER_ADMIN',
      organization_id: yodelOrgId
    })
    .select();

  if (insertError) {
    console.error('\n❌ Error granting SUPER_ADMIN:', insertError);
    return;
  }

  console.log('✅ Granted SUPER_ADMIN role for Yodel Mobile!');

  // Verify
  const { data: verifiedRoles } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', cliProfile.id);

  console.log('\n📋 Verification - All roles:');
  if (verifiedRoles) {
    verifiedRoles.forEach(role => {
      console.log(`  - ${role.role} (org: ${role.organization_id || 'platform-wide'})`);
    });
  }

  console.log('\n✅ Done! CLI user now has:');
  console.log('  1. Platform-wide SUPER_ADMIN access (all organizations)');
  console.log('  2. Organization-specific SUPER_ADMIN for Yodel Mobile');
  console.log('  3. Default organization: Yodel Mobile');
  console.log('\n⚠️  Note: User may need to log out and log back in for changes to take effect.');
}

grantCliYodelAdmin().catch(console.error);
