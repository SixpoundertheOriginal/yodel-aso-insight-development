/**
 * Check what apps exist for Yodel Mobile
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const yodelMobileOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

console.log('━'.repeat(80));
console.log('🔍 CHECKING YODEL MOBILE APPS');
console.log('━'.repeat(80));

async function checkApps() {
  try {
    // Check apps table
    console.log('\n📝 Query 1: Checking apps table...');
    const { data: apps, error: appsError } = await supabase
      .from('apps')
      .select('*')
      .eq('organization_id', yodelMobileOrgId);

    if (appsError) {
      console.error('❌ Error:', appsError.message);
    } else {
      console.log(`✅ Found ${apps?.length || 0} apps`);
      if (apps && apps.length > 0) {
        apps.forEach(app => {
          console.log(`\n   App: ${app.name || app.id}`);
          console.log(`   ID: ${app.id}`);
          console.log(`   Apple ID: ${app.apple_id || 'N/A'}`);
          console.log(`   Bundle ID: ${app.bundle_id || 'N/A'}`);
        });
      }
    }

    // Check organization_apps table
    console.log('\n📝 Query 2: Checking organization_apps table...');
    const { data: orgApps, error: orgAppsError } = await supabase
      .from('organization_apps')
      .select('*')
      .eq('organization_id', yodelMobileOrgId);

    if (orgAppsError) {
      console.error('❌ Error:', orgAppsError.message);
    } else {
      console.log(`✅ Found ${orgApps?.length || 0} organization_apps entries`);
      if (orgApps && orgApps.length > 0) {
        orgApps.forEach(oa => {
          console.log(`   - App ID: ${oa.app_id}`);
        });
      }
    }

    // Check org_app_access (we know it's empty, but double check)
    console.log('\n📝 Query 3: Checking org_app_access table...');
    const { data: access, error: accessError } = await supabase
      .from('org_app_access')
      .select('*')
      .eq('organization_id', yodelMobileOrgId);

    if (accessError) {
      console.error('❌ Error:', accessError.message);
    } else {
      console.log(`✅ Found ${access?.length || 0} org_app_access entries`);
      if (access && access.length > 0) {
        access.forEach(a => {
          console.log(`   - App ID: ${a.app_id} (active: ${!a.detached_at})`);
        });
      }
    }

    // Check ALL org_app_access entries to see what exists
    console.log('\n📝 Query 4: Checking ALL org_app_access entries...');
    const { data: allAccess, error: allAccessError } = await supabase
      .from('org_app_access')
      .select('app_id, organization_id, organizations(name)')
      .is('detached_at', null)
      .limit(20);

    if (allAccessError) {
      console.error('❌ Error:', allAccessError.message);
    } else {
      console.log(`✅ Found ${allAccess?.length || 0} total active access entries`);
      if (allAccess && allAccess.length > 0) {
        console.log('\n   Active app access by organization:');
        allAccess.forEach(a => {
          console.log(`   - ${a.app_id} → ${a.organizations?.name || a.organization_id}`);
        });
      }
    }

    console.log('\n━'.repeat(80));
    console.log('✅ CHECK COMPLETE');
    console.log('━'.repeat(80));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

checkApps();
