/**
 * VERIFY SYNC WITH ADMIN CLIENT
 *
 * Uses service role to bypass RLS and see actual data
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
  console.log('🔍 VERIFYING SYNC (with admin access)\n');

  const { data: profiles } = await supabase.from('profiles').select('*');
  const { data: roles } = await supabase.from('user_roles').select('*');
  const { data: orgs } = await supabase.from('organizations').select('*');
  const { data: features } = await supabase.from('organization_features').select('*');

  console.log(`📊 Profiles: ${profiles?.length || 0}`);
  profiles?.forEach(p => console.log(`   ✅ ${p.email} (org_id: ${p.org_id ? 'YES' : 'NO'})`));

  console.log(`\n📊 User Roles: ${roles?.length || 0}`);
  roles?.forEach(r => console.log(`   ✅ Role: ${r.role}, Org: ${r.organization_id ? 'YES' : 'NO'}`));

  console.log(`\n📊 Organizations: ${orgs?.length || 0}`);
  orgs?.forEach(o => console.log(`   ✅ ${o.name} (${o.slug})`));

  console.log(`\n📊 Features: ${features?.length || 0}`);
  console.log('');
}

verify();
