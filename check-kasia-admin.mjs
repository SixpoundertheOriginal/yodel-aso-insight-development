import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkKasiaAdmin() {
  console.log('Checking if kasia@yodelmobile.com is super admin...\n');

  // Check in profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'kasia@yodelmobile.com')
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error('Error querying profiles:', profileError);
  }

  if (profile) {
    console.log('✅ User found in profiles table:');
    console.log('  - ID:', profile.id);
    console.log('  - Email:', profile.email);
    console.log('  - Is Super Admin:', profile.is_super_admin || false);
    console.log('  - Created:', profile.created_at);
    console.log('\nFull profile:', JSON.stringify(profile, null, 2));
  } else {
    console.log('❌ User not found in profiles table');
  }

  // Check organization memberships
  const { data: orgUsers, error: orgError } = await supabase
    .from('organization_users')
    .select('*, organizations(*)')
    .eq('user_id', profile?.id || '');

  if (!orgError && orgUsers && orgUsers.length > 0) {
    console.log('\n📋 Organization Memberships:');
    orgUsers.forEach(ou => {
      console.log(`  - ${ou.organizations?.name || 'Unknown'} (Role: ${ou.role})`);
    });
  }
}

checkKasiaAdmin().catch(console.error);
