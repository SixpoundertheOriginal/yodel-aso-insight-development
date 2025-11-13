#!/bin/bash
# ============================================================
# ROLLBACK SCRIPT - Remove Super Admin Role
# ============================================================
# Created: 2025-01-13
# Purpose: Remove SUPER_ADMIN role from igor@yodelmobile.com
# Usage: ./ROLLBACK_SUPER_ADMIN.sh
# ============================================================

set -e

IGOR_USER_ID="9487fa9d-f0cc-427c-900b-98871c19498a"

echo "🔄 ROLLBACK: Removing SUPER_ADMIN role from igor@yodelmobile.com"
echo ""

# Execute rollback using Node.js with Supabase client
node -e "
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const serviceKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1];
const url = envContent.match(/VITE_SUPABASE_URL=\"(.+)\"/)[1];

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const userId = '$IGOR_USER_ID';

// Delete the SUPER_ADMIN role (organization_id IS NULL)
const { data, error } = await supabase
  .from('user_roles')
  .delete()
  .eq('user_id', userId)
  .is('organization_id', null)
  .eq('role', 'SUPER_ADMIN')
  .select();

if (error) {
  console.log('❌ Error removing role:', error.message);
  process.exit(1);
}

if (data.length === 0) {
  console.log('⚠️  No SUPER_ADMIN role found to remove');
  console.log('   (Maybe it was already removed?)');
} else {
  console.log('✅ SUPER_ADMIN role successfully removed');
  console.log('   Deleted record ID:', data[0].id);
}

console.log('');
console.log('📋 Remaining roles for igor@yodelmobile.com:');

// Show remaining roles
const { data: roles } = await supabase
  .from('user_roles')
  .select('role, organization_id')
  .eq('user_id', userId);

if (roles.length === 0) {
  console.log('   ⚠️  NO ROLES REMAINING');
} else {
  roles.forEach((role, idx) => {
    console.log(\`   \${idx + 1}. \${role.role} - Org: \${role.organization_id || 'Platform-level'}\`);
  });
}

console.log('');
console.log('✅ Rollback complete!');
"

echo ""
echo "============================================================"
echo "Rollback completed successfully"
echo "============================================================"
