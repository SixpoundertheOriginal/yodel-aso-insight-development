#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const STEPHEN_ID = 'd07d4277-9cf7-41c3-ae8f-ffab86e52f47';
const YODEL_ORG_ID = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b';

console.log('\n=== Fixing Stephen\'s Profile ===\n');

// Check current profile
const { data: currentProfile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', STEPHEN_ID)
  .single();

console.log('1️⃣  Current profile:', JSON.stringify(currentProfile, null, 2));

// Update organization_id field
console.log('\n2️⃣  Updating organization_id field...');
const { data: updated, error } = await supabase
  .from('profiles')
  .update({ organization_id: YODEL_ORG_ID })
  .eq('id', STEPHEN_ID)
  .select()
  .single();

if (error) {
  console.error('   ❌ Error:', error);
} else {
  console.log('   ✅ Profile updated');
  console.log('   New organization_id:', updated.organization_id);
}

// Verify final state
const { data: finalProfile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', STEPHEN_ID)
  .single();

console.log('\n3️⃣  Final profile:', JSON.stringify(finalProfile, null, 2));

console.log('\n=== Profile Fixed ===');
console.log('Stephen\'s profile now has:');
console.log('  • organization_id:', finalProfile?.organization_id);
console.log('  • org_id:', finalProfile?.org_id);
console.log('\nThe ASO AI Hub page should now work!\n');
