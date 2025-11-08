/**
 * Check if master organization tables still exist
 * From commit 5395c51 - "Implement Master Organization Structure"
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

console.log('━'.repeat(80));
console.log('🔍 CHECKING MASTER ORGANIZATION TABLES');
console.log('━'.repeat(80));

async function checkTables() {
  try {
    // Check for organization_client_access table (from commit 5395c51)
    console.log('\n📝 Query 1: organization_client_access table...');
    const { data: clientAccess, error: clientAccessError } = await supabase
      .from('organization_client_access')
      .select('*')
      .limit(5);

    if (clientAccessError) {
      console.error('❌ Table NOT found or error:', clientAccessError.message);
    } else {
      console.log(`✅ Table EXISTS with ${clientAccess?.length || 0} records`);
      if (clientAccess && clientAccess.length > 0) {
        console.log('\n   Sample records:');
        clientAccess.forEach(r => {
          console.log(`   - Org: ${r.organization_id}, Client: ${r.bigquery_client_name}, Access: ${r.access_level}`);
        });
      }
    }

    // Check for organization_apps table (from commit 5395c51)
    console.log('\n📝 Query 2: organization_apps table...');
    const { data: orgApps, error: orgAppsError } = await supabase
      .from('organization_apps')
      .select('*')
      .limit(5);

    if (orgAppsError) {
      console.error('❌ Table NOT found or error:', orgAppsError.message);
    } else {
      console.log(`✅ Table EXISTS with ${orgApps?.length || 0} records`);
      if (orgApps && orgApps.length > 0) {
        console.log('\n   Sample records:');
        orgApps.forEach(r => {
          console.log(`   - ${r.app_name} (${r.app_identifier})`);
          console.log(`     Org: ${r.organization_id}`);
          console.log(`     Status: ${r.approval_status}`);
        });
      }
    }

    // Check for agency_clients table (proposed solution)
    console.log('\n📝 Query 3: agency_clients table...');
    const { data: agencyClients, error: agencyError } = await supabase
      .from('agency_clients')
      .select('*')
      .limit(5);

    if (agencyError) {
      console.error('❌ Table NOT found or error:', agencyError.message);
      console.log('   (This table was proposed but may not exist yet)');
    } else {
      console.log(`✅ Table EXISTS with ${agencyClients?.length || 0} records`);
    }

    // List ALL tables to see what exists
    console.log('\n📝 Query 4: All tables in public schema...');
    const { data: allTables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      console.error('❌ Error listing tables:', tablesError.message);
    } else {
      const relevantTables = allTables?.filter(t =>
        t.table_name.includes('org') ||
        t.table_name.includes('app') ||
        t.table_name.includes('client') ||
        t.table_name.includes('access')
      );

      console.log(`✅ Found ${relevantTables?.length || 0} relevant tables:`);
      relevantTables?.forEach(t => {
        console.log(`   - ${t.table_name}`);
      });
    }

    console.log('\n━'.repeat(80));
    console.log('📊 ANALYSIS');
    console.log('━'.repeat(80));

    console.log('\n🎯 Master Organization Implementation (Aug 15, 2025):');
    console.log('   Commit: 5395c51');
    console.log('   Created: organization_client_access');
    console.log('   Created: organization_apps');
    console.log('   Purpose: YodelMobile master organization with multi-client access');

    console.log('\n❓ Status:');
    if (!clientAccessError && !orgAppsError) {
      console.log('   ✅ Master organization tables EXIST');
      console.log('   ✅ Architecture was implemented');
      console.log('   ⚠️  May need data migration');
    } else {
      console.log('   ❌ Master organization tables MISSING');
      console.log('   ❌ Implementation was removed or never deployed');
      console.log('   ⚠️  Need to recreate architecture');
    }

    console.log('\n━'.repeat(80));
    console.log('✅ CHECK COMPLETE');
    console.log('━'.repeat(80));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

checkTables();
