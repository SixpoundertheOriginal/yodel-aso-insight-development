import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('Checking profiles table schema and super admin implementation...\n');

  // Get a sample profile to see all columns
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (profiles && profiles.length > 0) {
    console.log('📋 Profiles table columns:');
    console.log(Object.keys(profiles[0]));
    console.log('\nSample profile:');
    console.log(JSON.stringify(profiles[0], null, 2));
  }

  // Check Igor's profile specifically
  const { data: igor, error: igorError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'igor@yodelmobile.com')
    .single();

  if (igor) {
    console.log('\n✅ Igor profile:');
    console.log(JSON.stringify(igor, null, 2));
  }

  // Check if there's a separate super_admins table or role system
  const { data: orgUsers, error: orgError } = await supabase
    .from('organization_users')
    .select('*')
    .eq('user_id', igor?.id || '')
    .limit(1);

  if (orgUsers && orgUsers.length > 0) {
    console.log('\n📋 Organization users structure:');
    console.log(JSON.stringify(orgUsers[0], null, 2));
  }
}

checkSchema().catch(console.error);
