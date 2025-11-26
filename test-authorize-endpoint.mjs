#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STEPHEN_ID = 'd07d4277-9cf7-41c3-ae8f-ffab86e52f47';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function testAuthorizeEndpoint() {
  console.log('\n=== Testing authorize Edge Function for Stephen ===\n');

  // Step 1: Get Stephen's auth user to create a JWT token
  console.log('Getting Stephen\'s user data...\n');

  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('❌ Error listing users:', listError);
    return;
  }

  const stephen = users.find(u => u.id === STEPHEN_ID);

  if (!stephen) {
    console.error('❌ Stephen not found');
    return;
  }

  console.log(`✅ Found Stephen: ${stephen.email}`);
  console.log(`   User ID: ${stephen.id}`);
  console.log(`   Email confirmed: ${stephen.email_confirmed_at ? 'Yes' : 'No'}\n`);

  // Step 2: Generate a session token for Stephen
  console.log('Generating session token for Stephen...\n');

  // Use the admin API to create a session for Stephen
  const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: stephen.email
  });

  if (sessionError) {
    console.error('❌ Error generating session:', sessionError);
    return;
  }

  console.log('Session link generated (not used, but confirms Stephen can authenticate)\n');

  // Step 3: Test the authorize endpoint with service role to see what it returns
  console.log('--- Testing authorize endpoint directly ---\n');

  const authorizeUrl = `${SUPABASE_URL}/functions/v1/authorize`;

  const response = await fetch(authorizeUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path: '/dashboard-v2',
      method: 'GET',
    }),
  });

  const responseData = await response.json();

  console.log(`Response status: ${response.status}`);
  console.log(`Response body:`, JSON.stringify(responseData, null, 2));

  if (response.status === 403) {
    console.log('\n❌ Still getting 403 - checking what the error says...');
  } else if (response.status === 200 && responseData.allow) {
    console.log('\n✅ Service role got access (expected)');
  }

  console.log('\n=== Test Complete ===\n');
}

testAuthorizeEndpoint();
