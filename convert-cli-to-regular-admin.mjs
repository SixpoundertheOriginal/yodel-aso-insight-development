import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function convertCliToRegularAdmin() {
  console.log('Converting CLI user to regular Yodel Mobile admin...\n');

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
  console.log('  - Organization:', cliProfile.organization_id);

  const yodelOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  // Get current roles
  const { data: currentRoles } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', cliProfile.id);

  console.log('\n📋 Current roles:');
  if (currentRoles) {
    currentRoles.forEach(role => {
      console.log(`  - ${role.role} (org: ${role.organization_id || 'platform-wide'})`);
    });
  }

  // Remove platform-wide SUPER_ADMIN
  const platformSuperAdmin = currentRoles?.find(
    r => r.role === 'SUPER_ADMIN' && r.organization_id === null
  );

  if (platformSuperAdmin) {
    console.log('\n⏳ Removing platform-wide SUPER_ADMIN role...');
    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', platformSuperAdmin.id);

    if (deleteError) {
      console.error('❌ Error removing platform SUPER_ADMIN:', deleteError);
      return;
    }
    console.log('✅ Removed platform-wide SUPER_ADMIN');
  }

  // Remove Yodel Mobile SUPER_ADMIN
  const yodelSuperAdmin = currentRoles?.find(
    r => r.role === 'SUPER_ADMIN' && r.organization_id === yodelOrgId
  );

  if (yodelSuperAdmin) {
    console.log('\n⏳ Removing Yodel Mobile SUPER_ADMIN role...');
    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', yodelSuperAdmin.id);

    if (deleteError) {
      console.error('❌ Error removing Yodel Mobile SUPER_ADMIN:', deleteError);
      return;
    }
    console.log('✅ Removed Yodel Mobile SUPER_ADMIN');
  }

  // Add ADMIN role for Yodel Mobile organization
  console.log('\n⏳ Adding ADMIN role for Yodel Mobile...');
  const { data: newRole, error: insertError } = await supabase
    .from('user_roles')
    .insert({
      user_id: cliProfile.id,
      role: 'ADMIN',
      organization_id: yodelOrgId
    })
    .select();

  if (insertError) {
    console.error('❌ Error adding ADMIN role:', insertError);
    return;
  }

  console.log('✅ Added ADMIN role for Yodel Mobile');

  // Verify the changes
  const { data: verifiedRoles } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', cliProfile.id);

  console.log('\n📋 Verification - New roles:');
  if (verifiedRoles && verifiedRoles.length > 0) {
    verifiedRoles.forEach(role => {
      const orgLabel = role.organization_id === yodelOrgId
        ? 'Yodel Mobile'
        : role.organization_id
          ? role.organization_id.substring(0, 8) + '...'
          : 'platform-wide';
      console.log(`  - ${role.role} (${orgLabel})`);
    });
  } else {
    console.log('  (No roles found)');
  }

  console.log('\n✅ Done! CLI user now has:');
  console.log('  - ADMIN role for Yodel Mobile organization only');
  console.log('  - No platform-wide super admin access');
  console.log('  - No "Platform Admin" badge');
  console.log('  - Can only access Yodel Mobile data');
  console.log('\n⚠️  Note: User may need to log out and log back in for changes to take effect.');
}

convertCliToRegularAdmin().catch(console.error);
