#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testAuthorizeEdgeFunction() {
  console.log('\n=== Testing authorize Edge Function for Stephen ===\n');

  // Create client
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Get Stephen's auth session
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const stephen = authUsers?.users?.find(u => u.email === 'stephen@yodelmobile.com');

  if (!stephen) {
    console.log('❌ Stephen not found\n');
    return;
  }

  console.log(`✅ Found Stephen: ${stephen.email}`);
  console.log(`   User ID: ${stephen.id}\n`);

  // Create a session for Stephen (for testing)
  // Note: We can't actually create a session with service role, so we'll test the endpoint directly

  // Test: Call authorize Edge Function for /dashboard-v2
  try {
    console.log('Testing authorize Edge Function for /dashboard-v2...');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/authorize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: '/dashboard-v2',
        method: 'GET'
      })
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);

    const data = await response.json();
    console.log(`   Response:`, JSON.stringify(data, null, 2));

    if (response.ok && data.allow) {
      console.log('\n✅ authorize Edge Function working correctly\n');
    } else {
      console.log('\n⚠️  authorize Edge Function denied access\n');
    }
  } catch (error) {
    console.error('\n❌ Error calling authorize Edge Function:', error);
    console.error('   This might be why login is hanging!\n');
  }
}

testAuthorizeEdgeFunction();
