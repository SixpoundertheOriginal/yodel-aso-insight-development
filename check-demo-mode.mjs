/**
 * Check demo_mode status for Yodel Mobile organization
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  console.log('💡 Run: export SUPABASE_SERVICE_ROLE_KEY=your_key_here');
  process.exit(1);
}

console.log('━'.repeat(80));
console.log('🔍 CHECKING DEMO_MODE STATUS - Yodel Mobile');
console.log('━'.repeat(80));

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkDemoMode() {
  try {
    // Check Yodel Mobile organization
    const yodelMobileOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

    console.log('\n📝 Query 1: Checking organizations table...');
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug, demo_mode, settings, created_at')
      .eq('id', yodelMobileOrgId)
      .single();

    if (orgError) {
      console.error('❌ Error querying organizations:', orgError.message);
      console.log('   Full error:', orgError);
    } else if (!org) {
      console.error('❌ Organization not found');
    } else {
      console.log('✅ Organization found:');
      console.log('   ID:', org.id);
      console.log('   Name:', org.name);
      console.log('   Slug:', org.slug);
      console.log('   demo_mode:', org.demo_mode);
      console.log('   settings:', JSON.stringify(org.settings, null, 2));
      console.log('   created_at:', org.created_at);

      console.log('\n🎯 RESULT:');
      if (org.demo_mode === true) {
        console.log('   ⚠️  DEMO MODE IS ENABLED');
        console.log('   This explains why processed demo data is returned!');
      } else if (org.demo_mode === false) {
        console.log('   ✅ DEMO MODE IS DISABLED');
        console.log('   Should be returning real BigQuery data');
      } else {
        console.log('   ❓ DEMO MODE IS NULL/UNDEFINED');
        console.log('   Value:', org.demo_mode);
      }

      // Check settings.demo_mode as well
      if (org.settings && 'demo_mode' in org.settings) {
        console.log('\n   📋 settings.demo_mode:', org.settings.demo_mode);
      }
    }

    // Check all organizations for comparison
    console.log('\n📝 Query 2: Checking all organizations...');
    const { data: allOrgs, error: allError } = await supabase
      .from('organizations')
      .select('id, name, slug, demo_mode')
      .order('created_at', { ascending: false })
      .limit(10);

    if (allError) {
      console.error('❌ Error querying all orgs:', allError.message);
    } else {
      console.log('✅ All organizations:');
      console.log('');
      allOrgs.forEach(org => {
        const demoStatus = org.demo_mode === true ? '🎭 DEMO' : org.demo_mode === false ? '📊 REAL' : '❓ NULL';
        console.log(`   ${demoStatus} | ${org.name} (${org.slug || 'no-slug'})`);
      });
    }

    // Check for any app access
    console.log('\n📝 Query 3: Checking org_app_access for Yodel Mobile...');
    const { data: appAccess, error: accessError } = await supabase
      .from('org_app_access')
      .select('app_id, attached_at, detached_at')
      .eq('organization_id', yodelMobileOrgId)
      .is('detached_at', null);

    if (accessError) {
      console.error('❌ Error querying app access:', accessError.message);
    } else {
      console.log('✅ App access records:');
      console.log('   Active apps:', appAccess?.length || 0);
      if (appAccess && appAccess.length > 0) {
        appAccess.forEach(app => {
          console.log(`   - ${app.app_id} (attached: ${app.attached_at})`);
        });
      } else {
        console.log('   ⚠️  NO APPS ATTACHED');
        console.log('   This may trigger demo/empty data response!');
      }
    }

    console.log('\n━'.repeat(80));
    console.log('✅ CHECK COMPLETE');
    console.log('━'.repeat(80));

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error);
  }
}

checkDemoMode();
