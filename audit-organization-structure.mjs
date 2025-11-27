import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function auditOrganizationStructure() {
  console.log('🔍 AUDITING ORGANIZATION STRUCTURE\n');
  console.log('=' .repeat(80));

  // 1. Get ALL organizations
  console.log('\n📋 Step 1: ALL ORGANIZATIONS IN DATABASE');
  console.log('-'.repeat(80));

  const { data: allOrgs, error: orgsError } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: true });

  if (orgsError) {
    console.error('❌ Error:', orgsError);
  } else {
    console.log(`Found ${allOrgs?.length || 0} total organizations:\n`);
    allOrgs?.forEach((org, i) => {
      console.log(`${i + 1}. ${org.name || 'Unnamed'}`);
      console.log(`   ID: ${org.id}`);
      console.log(`   Created: ${org.created_at}`);
      console.log(`   Type: ${org.type || 'N/A'}`);
      console.log('');
    });
  }

  // 2. Get agency relationships
  console.log('\n📋 Step 2: AGENCY-CLIENT RELATIONSHIPS');
  console.log('-'.repeat(80));

  const { data: agencies, error: agencyError } = await supabase
    .from('agency_clients')
    .select('*');

  if (agencyError) {
    console.error('❌ Error:', agencyError);
  } else {
    console.log(`Found ${agencies?.length || 0} agency relationships:\n`);

    if (agencies && agencies.length > 0) {
      // Group by agency
      const byAgency = {};
      agencies.forEach(rel => {
        if (!byAgency[rel.agency_org_id]) {
          byAgency[rel.agency_org_id] = [];
        }
        byAgency[rel.agency_org_id].push(rel.client_org_id);
      });

      for (const [agencyId, clients] of Object.entries(byAgency)) {
        const agencyOrg = allOrgs?.find(o => o.id === agencyId);
        console.log(`🏢 AGENCY: ${agencyOrg?.name || 'Unknown'} (${agencyId.substring(0, 8)}...)`);
        console.log(`   Managing ${clients.length} client(s):`);

        clients.forEach((clientId, i) => {
          const clientOrg = allOrgs?.find(o => o.id === clientId);
          console.log(`   ${i + 1}. ${clientOrg?.name || 'Unknown'} (${clientId.substring(0, 8)}...)`);
        });
        console.log('');
      }
    } else {
      console.log('⚠️  No agency relationships found');
    }
  }

  // 3. Check app ownership
  console.log('\n📋 Step 3: APP OWNERSHIP (org_app_access)');
  console.log('-'.repeat(80));

  const { data: appAccess, error: accessError } = await supabase
    .from('org_app_access')
    .select('organization_id, app_id')
    .is('detached_at', null);

  if (accessError) {
    console.error('❌ Error:', accessError);
  } else {
    // Group apps by organization
    const appsByOrg = {};
    appAccess?.forEach(record => {
      if (!appsByOrg[record.organization_id]) {
        appsByOrg[record.organization_id] = [];
      }
      appsByOrg[record.organization_id].push(record.app_id);
    });

    console.log(`Found ${appAccess?.length || 0} app access records across ${Object.keys(appsByOrg).length} organizations:\n`);

    for (const [orgId, apps] of Object.entries(appsByOrg)) {
      const org = allOrgs?.find(o => o.id === orgId);
      console.log(`📱 ${org?.name || 'Unknown Organization'} (${orgId.substring(0, 8)}...)`);
      console.log(`   Apps: ${apps.length}`);
      apps.forEach((appId, i) => {
        console.log(`   ${i + 1}. ${appId}`);
      });
      console.log('');
    }
  }

  // 4. Check users
  console.log('\n📋 Step 4: USERS BY ORGANIZATION');
  console.log('-'.repeat(80));

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('email, organization_id, org_id');

  if (profilesError) {
    console.error('❌ Error:', profilesError);
  } else {
    const usersByOrg = {};
    profiles?.forEach(profile => {
      const orgId = profile.organization_id || profile.org_id;
      if (orgId) {
        if (!usersByOrg[orgId]) {
          usersByOrg[orgId] = [];
        }
        usersByOrg[orgId].push(profile.email);
      }
    });

    console.log(`Found ${profiles?.length || 0} users across ${Object.keys(usersByOrg).length} organizations:\n`);

    for (const [orgId, users] of Object.entries(usersByOrg)) {
      const org = allOrgs?.find(o => o.id === orgId);
      console.log(`👥 ${org?.name || 'Unknown'} (${orgId.substring(0, 8)}...)`);
      console.log(`   Users: ${users.length}`);
      users.forEach(email => {
        console.log(`   - ${email}`);
      });
      console.log('');
    }
  }

  // 5. Summary analysis
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY ANALYSIS');
  console.log('='.repeat(80));

  const yodelOrg = allOrgs?.find(o => o.id === '7cccba3f-0a8f-446f-9dba-86e9cb68c92b');

  console.log('\n🎯 YODEL MOBILE ORGANIZATION:');
  console.log(`   Name: ${yodelOrg?.name || 'Unknown'}`);
  console.log(`   ID: 7cccba3f-0a8f-446f-9dba-86e9cb68c92b`);

  const yodelDirectApps = appAccess?.filter(a => a.organization_id === '7cccba3f-0a8f-446f-9dba-86e9cb68c92b');
  console.log(`   Direct Apps: ${yodelDirectApps?.length || 0}`);

  const yodelClients = agencies?.filter(a => a.agency_org_id === '7cccba3f-0a8f-446f-9dba-86e9cb68c92b');
  console.log(`   Client Organizations: ${yodelClients?.length || 0}`);

  if (yodelClients && yodelClients.length > 0) {
    console.log('\n   CLIENT APPS:');
    yodelClients.forEach(client => {
      const clientOrg = allOrgs?.find(o => o.id === client.client_org_id);
      const clientApps = appAccess?.filter(a => a.organization_id === client.client_org_id);
      console.log(`   - ${clientOrg?.name || 'Unknown'}: ${clientApps?.length || 0} apps`);
    });
  }

  console.log('\n💡 ARCHITECTURE ASSESSMENT:');
  console.log(`   Total Organizations: ${allOrgs?.length || 0}`);
  console.log(`   Agency Relationships: ${agencies?.length || 0}`);
  console.log(`   Total Apps: ${appAccess?.length || 0}`);
  console.log(`   Users: ${profiles?.length || 0}`);

  console.log('\n❓ QUESTIONS TO ANSWER:');
  console.log('   1. Are the "client organizations" real separate entities?');
  console.log('   2. Or are they just containers created for data organization?');
  console.log('   3. Do these clients have their own users/logins?');
  console.log('   4. Or are they only managed by Yodel Mobile team?');
  console.log('');
}

auditOrganizationStructure().catch(console.error);
