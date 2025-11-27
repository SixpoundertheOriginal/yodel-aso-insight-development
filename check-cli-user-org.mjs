import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCliUser() {
  console.log('🔍 Checking CLI user organization...\n');

  // Get CLI user
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'cli@yodelmobile.com')
    .single();

  console.log('👤 CLI User:');
  console.log('   Email:', profile.email);
  console.log('   User ID:', profile.id);
  console.log('   Organization ID:', profile.organization_id);
  console.log('');

  // Get organization details
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.organization_id)
    .single();

  console.log('🏢 Organization:');
  console.log('   Name:', org.name);
  console.log('   ID:', org.id);
  console.log('');

  // Get user roles
  const { data: roles } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', profile.id);

  console.log('🔑 Roles:');
  if (roles && roles.length > 0) {
    for (const role of roles) {
      const orgLabel = role.organization_id
        ? `in org ${role.organization_id.substring(0, 8)}...`
        : 'PLATFORM-WIDE';
      console.log(`   - ${role.role} ${orgLabel}`);
    }
  } else {
    console.log('   No roles found');
  }
  console.log('');

  // Check if user's org has apps directly
  const { data: directApps } = await supabase
    .from('org_app_access')
    .select('app_id')
    .eq('organization_id', profile.organization_id)
    .is('detached_at', null);

  console.log('📱 Direct Apps (in user\'s org):');
  console.log('   Count:', directApps?.length || 0);
  if (directApps && directApps.length > 0) {
    directApps.forEach(a => console.log('   -', a.app_id));
  }
  console.log('');

  // Check if user's org is an agency
  const { data: clientOrgs } = await supabase
    .from('agency_clients')
    .select('client_org_id')
    .eq('agency_org_id', profile.organization_id)
    .eq('is_active', true);

  console.log('🏢 Agency Relationships:');
  if (clientOrgs && clientOrgs.length > 0) {
    console.log('   User\'s org is an AGENCY managing', clientOrgs.length, 'client(s)');
    for (const client of clientOrgs) {
      // Get client org apps
      const { data: clientApps } = await supabase
        .from('org_app_access')
        .select('app_id')
        .eq('organization_id', client.client_org_id)
        .is('detached_at', null);

      const { data: clientOrg } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', client.client_org_id)
        .single();

      console.log(`   - ${clientOrg?.name} (${client.client_org_id.substring(0, 8)}...): ${clientApps?.length || 0} apps`);
    }
  } else {
    console.log('   User\'s org is NOT an agency');
  }
  console.log('');

  // Total accessible apps (direct + agency)
  const allOrgs = [profile.organization_id];
  if (clientOrgs && clientOrgs.length > 0) {
    allOrgs.push(...clientOrgs.map(c => c.client_org_id));
  }

  const { data: totalApps } = await supabase
    .from('org_app_access')
    .select('app_id')
    .in('organization_id', allOrgs)
    .is('detached_at', null);

  console.log('✅ TOTAL ACCESSIBLE APPS (via agency + direct):');
  console.log('   Count:', totalApps?.length || 0);
  if (totalApps && totalApps.length > 0) {
    totalApps.forEach(a => console.log('   -', a.app_id));
  }
  console.log('');
}

checkCliUser().catch(console.error);
