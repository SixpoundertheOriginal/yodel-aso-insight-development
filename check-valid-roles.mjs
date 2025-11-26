import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkValidRoles() {
  console.log('Checking valid role values in the system...\n');

  // Query all unique roles from user_roles table
  const { data: allRoles, error } = await supabase
    .from('user_roles')
    .select('role')
    .limit(100);

  if (allRoles) {
    const uniqueRoles = [...new Set(allRoles.map(r => r.role))];
    console.log('📋 Roles found in user_roles table:');
    uniqueRoles.forEach(role => {
      console.log(`  - ${role}`);
    });
  }

  // Also check organization_users for different role column
  const { data: orgRoles, error: orgError } = await supabase
    .from('organization_users')
    .select('role')
    .limit(100);

  if (orgRoles) {
    const uniqueOrgRoles = [...new Set(orgRoles.map(r => r.role).filter(Boolean))];
    if (uniqueOrgRoles.length > 0) {
      console.log('\n📋 Roles found in organization_users table:');
      uniqueOrgRoles.forEach(role => {
        console.log(`  - ${role}`);
      });
    }
  }
}

checkValidRoles().catch(console.error);
