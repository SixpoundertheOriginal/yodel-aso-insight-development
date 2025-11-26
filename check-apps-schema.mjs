import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAppsSchema() {
  console.log('Checking apps table schema...\n');

  // Get a sample app record
  const { data: apps, error } = await supabase
    .from('apps')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (apps && apps.length > 0) {
    console.log('📋 Sample app record:');
    console.log(JSON.stringify(apps[0], null, 2));
    console.log('\n📋 Available columns:');
    Object.keys(apps[0]).forEach(key => {
      console.log(`  - ${key}`);
    });
  } else {
    console.log('⚠️  No apps found in table');
  }

  // Also check org_app_access for the client that has 8 apps
  console.log('\n\n📋 Checking org_app_access for client with 8 apps:');
  const clientOrgId = 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f';

  const { data: clientApps, error: clientError } = await supabase
    .from('org_app_access')
    .select('*')
    .eq('organization_id', clientOrgId)
    .is('detached_at', null)
    .limit(3);

  if (clientError) {
    console.error('❌ Error:', clientError);
  } else if (clientApps && clientApps.length > 0) {
    console.log(`✅ Found ${clientApps.length} app access records (showing first 3):`);
    console.log(JSON.stringify(clientApps, null, 2));
  } else {
    console.log('⚠️  No records found');
  }
}

checkAppsSchema().catch(console.error);
