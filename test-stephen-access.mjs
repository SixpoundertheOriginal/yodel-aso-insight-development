#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const STEPHEN_ID = 'd07d4277-9cf7-41c3-ae8f-ffab86e52f47';

console.log('\n=== Testing Stephen\'s Access ===\n');

// Get Stephen's effective permissions
const { data: permissions } = await supabase
  .from('user_role_permissions')
  .select('feature_key')
  .eq('user_id', STEPHEN_ID);

console.log('✅ Stephen\'s Effective Permissions:');
console.log('   ', permissions?.map(p => p.feature_key));

// Test routes
const routesToTest = [
  { path: '/aso-ai-hub', expectedAccess: true, feature: 'aso_ai_hub' },
  { path: '/aso-ai-hub/audit', expectedAccess: true, feature: 'aso_ai_hub' },
  { path: '/dashboard', expectedAccess: false, feature: 'app_core_access' },
  { path: '/dashboard-v2', expectedAccess: false, feature: 'analytics_access' },
  { path: '/analytics', expectedAccess: false, feature: 'analytics_access' },
  { path: '/admin', expectedAccess: false, feature: 'org_admin_access' },
  { path: '/profile', expectedAccess: true, feature: 'profile_management' }
];

console.log('\n📊 Expected Access:');
for (const route of routesToTest) {
  const hasFeature = permissions?.find(p => p.feature_key === route.feature);
  const status = route.expectedAccess ? '✅ ALLOW' : '❌ DENY';
  const actual = hasFeature ? '(has permission)' : '(no permission)';
  console.log(`   ${status} ${route.path} - requires ${route.feature} ${actual}`);
}

console.log('\n');
