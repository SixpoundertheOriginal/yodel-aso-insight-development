/**
 * Check agency-client relationship for Yodel Mobile
 * Yodel Mobile is an agency org that manages apps for client orgs
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

const yodelMobileAgencyOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';
const otherOrgId = 'dbdb0cc5-9cfa-4bf1-bb97-7ccf2d1f783f'; // From migration

console.log('━'.repeat(80));
console.log('🔍 AGENCY-CLIENT RELATIONSHIP AUDIT');
console.log('━'.repeat(80));

async function auditAgencyClient() {
  try {
    // Check both organizations
    console.log('\n📝 Query 1: Checking both organizations...');
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .in('id', [yodelMobileAgencyOrgId, otherOrgId]);

    if (orgsError) {
      console.error('❌ Error:', orgsError.message);
    } else {
      console.log(`✅ Found ${orgs?.length || 0} organizations`);
      orgs?.forEach(org => {
        console.log(`\n   ${org.id === yodelMobileAgencyOrgId ? '🎯 [YODEL MOBILE AGENCY]' : '📦 [OTHER ORG]'}`);
        console.log(`   ID: ${org.id}`);
        console.log(`   Name: ${org.name}`);
        console.log(`   Slug: ${org.slug || 'N/A'}`);
      });
    }

    // Check client_org_map table
    console.log('\n📝 Query 2: Checking client_org_map table...');
    const { data: clientMap, error: clientMapError } = await supabase
      .from('client_org_map')
      .select('*');

    if (clientMapError) {
      console.error('❌ Error:', clientMapError.message);
    } else {
      console.log(`✅ Found ${clientMap?.length || 0} client mappings`);

      const yodelMobileClients = clientMap?.filter(m => m.organization_id === yodelMobileAgencyOrgId);
      const otherOrgClients = clientMap?.filter(m => m.organization_id === otherOrgId);

      console.log(`\n   🎯 Yodel Mobile Agency clients: ${yodelMobileClients?.length || 0}`);
      yodelMobileClients?.forEach(c => {
        console.log(`      - ${c.client}`);
      });

      console.log(`\n   📦 Other org clients: ${otherOrgClients?.length || 0}`);
      otherOrgClients?.forEach(c => {
        console.log(`      - ${c.client}`);
      });
    }

    // Check org_app_access for BOTH orgs
    console.log('\n📝 Query 3: Checking org_app_access for both orgs...');
    const { data: appAccess, error: accessError } = await supabase
      .from('org_app_access')
      .select('*')
      .in('organization_id', [yodelMobileAgencyOrgId, otherOrgId]);

    if (accessError) {
      console.error('❌ Error:', accessError.message);
    } else {
      console.log(`✅ Found ${appAccess?.length || 0} app access records`);

      const yodelMobileAccess = appAccess?.filter(a => a.organization_id === yodelMobileAgencyOrgId && !a.detached_at);
      const otherOrgAccess = appAccess?.filter(a => a.organization_id === otherOrgId && !a.detached_at);

      console.log(`\n   🎯 Yodel Mobile Agency app access: ${yodelMobileAccess?.length || 0}`);
      yodelMobileAccess?.forEach(a => {
        console.log(`      - ${a.app_id}`);
      });

      console.log(`\n   📦 Other org app access: ${otherOrgAccess?.length || 0}`);
      otherOrgAccess?.forEach(a => {
        console.log(`      - ${a.app_id}`);
      });
    }

    // Check if there's an agency relationship table
    console.log('\n📝 Query 4: Checking for agency relationship table...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%agency%');

    if (!tableError && tableCheck) {
      console.log(`✅ Found ${tableCheck.length} agency-related tables:`);
      tableCheck.forEach(t => {
        console.log(`   - ${t.table_name}`);
      });
    }

    // Analysis
    console.log('\n━'.repeat(80));
    console.log('📊 ANALYSIS');
    console.log('━'.repeat(80));

    console.log('\n🔍 Issue Identified:');
    console.log('   1. client_org_map maps BigQuery clients to organizations');
    console.log('   2. BUT apps are assigned via org_app_access table');
    console.log('   3. Yodel Mobile (agency) should access client apps');
    console.log('   4. Current: No direct relationship between agency and client apps');

    console.log('\n🎯 Expected Flow (Agency Model):');
    console.log('   1. Yodel Mobile = Agency org');
    console.log('   2. Client orgs = Managed by Yodel Mobile');
    console.log('   3. Apps belong to client orgs');
    console.log('   4. Yodel Mobile should see ALL client org apps');

    console.log('\n❓ Questions:');
    console.log('   1. Is there an agency_clients table?');
    console.log('   2. Should Edge Function check agency relationships?');
    console.log('   3. Should org_app_access be inherited through agency?');

    console.log('\n━'.repeat(80));
    console.log('✅ AUDIT COMPLETE');
    console.log('━'.repeat(80));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

auditAgencyClient();
