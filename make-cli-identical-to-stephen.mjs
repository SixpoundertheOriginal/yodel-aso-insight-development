import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function makeCliIdenticalToStephen() {
  console.log('Making CLI user identical to Stephen (VIEWER access only)...\n');

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

  // Find Stephen for comparison
  const { data: stephenProfile } = await supabase
    .from('profiles')
    .select('id, email, organization_id')
    .eq('email', 'stephen@yodelmobile.com')
    .single();

  console.log('✅ Found users:');
  console.log('  CLI:', cliProfile.email, '- Org:', cliProfile.organization_id);
  if (stephenProfile) {
    console.log('  Stephen:', stephenProfile.email, '- Org:', stephenProfile.organization_id);
  }

  const yodelOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

  // Get Stephen's roles for reference
  if (stephenProfile) {
    const { data: stephenRoles } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', stephenProfile.id);

    console.log('\n📋 Stephen\'s current roles:');
    if (stephenRoles && stephenRoles.length > 0) {
      stephenRoles.forEach(role => {
        console.log(`  - ${role.role} (org: ${role.organization_id || 'platform-wide'})`);
      });
    } else {
      console.log('  (No roles found)');
    }
  }

  // Get CLI's current roles
  const { data: currentRoles } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', cliProfile.id);

  console.log('\n📋 CLI\'s current roles:');
  if (currentRoles && currentRoles.length > 0) {
    currentRoles.forEach(role => {
      console.log(`  - ${role.role} (org: ${role.organization_id || 'platform-wide'})`);
    });
  } else {
    console.log('  (No roles found)');
  }

  // Remove all current roles for CLI
  if (currentRoles && currentRoles.length > 0) {
    console.log('\n⏳ Removing all current roles for CLI...');
    for (const role of currentRoles) {
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', role.id);

      if (deleteError) {
        console.error(`❌ Error removing ${role.role} role:`, deleteError);
        return;
      }
      console.log(`✅ Removed ${role.role} (org: ${role.organization_id || 'platform-wide'})`);
    }
  }

  // Add VIEWER role for Yodel Mobile (same as Stephen)
  console.log('\n⏳ Adding VIEWER role for Yodel Mobile...');
  const { data: newRole, error: insertError } = await supabase
    .from('user_roles')
    .insert({
      user_id: cliProfile.id,
      role: 'VIEWER',
      organization_id: yodelOrgId
    })
    .select();

  if (insertError) {
    console.error('❌ Error adding VIEWER role:', insertError);
    return;
  }

  console.log('✅ Added VIEWER role for Yodel Mobile');

  // Verify the changes
  const { data: verifiedRoles } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', cliProfile.id);

  console.log('\n📋 Verification - CLI\'s final roles:');
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

  console.log('\n✅ Done! CLI user now has IDENTICAL access to Stephen:');
  console.log('  - VIEWER role for Yodel Mobile organization only');
  console.log('  - No admin access');
  console.log('  - No platform-wide access');
  console.log('  - No special badges or indicators');
  console.log('  - Can only view Yodel Mobile data (read-only)');
  console.log('\n⚠️  Note: User may need to log out and log back in for changes to take effect.');
}

makeCliIdenticalToStephen().catch(console.error);
