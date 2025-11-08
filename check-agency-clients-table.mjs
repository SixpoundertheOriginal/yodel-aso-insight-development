/**
 * Check agency_clients table - it exists!
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const yodelMobileOrgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

console.log('━'.repeat(80));
console.log('🔍 AGENCY_CLIENTS TABLE INSPECTION');
console.log('━'.repeat(80));

async function checkAgencyClients() {
  try {
    // Get all records
    console.log('\n📝 Query 1: All agency_clients records...');
    const { data: allRecords, error: allError } = await supabase
      .from('agency_clients')
      .select('*');

    if (allError) {
      console.error('❌ Error:', allError.message);
      return;
    }

    console.log(`✅ Found ${allRecords?.length || 0} records\n`);

    if (allRecords && allRecords.length > 0) {
      allRecords.forEach((r, i) => {
        console.log(`Record ${i + 1}:`);
        Object.entries(r).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
        console.log('');
      });
    }

    // Check if Yodel Mobile is listed as an agency
    console.log('\n📝 Query 2: Yodel Mobile as agency...');
    const { data: yodelAsAgency, error: agencyError } = await supabase
      .from('agency_clients')
      .select('*')
      .eq('agency_org_id', yodelMobileOrgId);

    if (agencyError) {
      console.error('❌ Error:', agencyError.message);
    } else {
      console.log(`✅ Yodel Mobile manages ${yodelAsAgency?.length || 0} client orgs`);
      yodelAsAgency?.forEach(r => {
        console.log(`   - Client Org ID: ${r.client_org_id}`);
      });
    }

    // Check if Yodel Mobile is listed as a client
    console.log('\n📝 Query 3: Yodel Mobile as client...');
    const { data: yodelAsClient, error: clientError } = await supabase
      .from('agency_clients')
      .select('*')
      .eq('client_org_id', yodelMobileOrgId);

    if (clientError) {
      console.error('❌ Error:', clientError.message);
    } else {
      console.log(`✅ Yodel Mobile is managed by ${yodelAsClient?.length || 0} agencies`);
      yodelAsClient?.forEach(r => {
        console.log(`   - Agency Org ID: ${r.agency_org_id}`);
      });
    }

    // Get org names for all related orgs
    if (allRecords && allRecords.length > 0) {
      console.log('\n📝 Query 4: Resolving organization names...');

      const orgIds = new Set();
      allRecords.forEach(r => {
        orgIds.add(r.agency_org_id);
        orgIds.add(r.client_org_id);
      });

      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .in('id', Array.from(orgIds));

      if (!orgsError && orgs) {
        console.log('\n   Organizations:');
        orgs.forEach(org => {
          console.log(`   - ${org.name} (${org.slug})`);
          console.log(`     ID: ${org.id}`);
        });

        console.log('\n   Relationships:');
        allRecords.forEach(r => {
          const agency = orgs.find(o => o.id === r.agency_org_id);
          const client = orgs.find(o => o.id === r.client_org_id);
          console.log(`   - ${agency?.name || r.agency_org_id} → ${client?.name || r.client_org_id}`);
        });
      }
    }

    console.log('\n━'.repeat(80));
    console.log('✅ INSPECTION COMPLETE');
    console.log('━'.repeat(80));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

checkAgencyClients();
