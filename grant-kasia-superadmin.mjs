import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function grantSuperAdmin() {
  console.log('Granting super admin privileges to kasia@yodelmobile.com...\n');

  // First, verify Igor's super admin status for reference
  const { data: igor, error: igorError } = await supabase
    .from('profiles')
    .select('id, email, is_super_admin')
    .eq('email', 'igor@yodelmobile.com')
    .single();

  if (igor) {
    console.log('✅ Reference - Igor status:');
    console.log('  - Email:', igor.email);
    console.log('  - Is Super Admin:', igor.is_super_admin);
    console.log();
  }

  // Update Kasia's profile to be super admin
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ is_super_admin: true })
    .eq('email', 'kasia@yodelmobile.com')
    .select();

  if (updateError) {
    console.error('❌ Error granting super admin:', updateError);
    return;
  }

  if (updated && updated.length > 0) {
    console.log('✅ Super admin privileges granted successfully!');
    console.log('  - Email:', updated[0].email);
    console.log('  - Is Super Admin:', updated[0].is_super_admin);
    console.log('  - User ID:', updated[0].id);
  } else {
    console.log('⚠️ No rows updated - user may not exist');
  }

  // Verify the change
  const { data: verified, error: verifyError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'kasia@yodelmobile.com')
    .single();

  if (verified) {
    console.log('\n📋 Verification - Current status:');
    console.log(JSON.stringify(verified, null, 2));
  }
}

grantSuperAdmin().catch(console.error);
