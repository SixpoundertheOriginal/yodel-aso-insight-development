#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n=== Testing org_feature_entitlements Query ===\n');

// Test 1: Query as service role (bypasses RLS)
console.log('1️⃣  Query as SERVICE ROLE (no RLS):');
const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const { data: serviceData, error: serviceError } = await serviceClient
  .from('org_feature_entitlements')
  .select('feature_key, is_enabled, organization_id')
  .eq('organization_id', '7cccba3f-0a8f-446f-9dba-86e9cb68c92b')
  .limit(5);

if (serviceError) {
  console.error('   ❌ Error:', serviceError);
} else {
  console.log('   ✅ Success! Retrieved', serviceData?.length, 'features');
  console.log('   Sample:', JSON.stringify(serviceData?.[0], null, 2));
}

// Test 2: Query as Stephen (authenticated user, subject to RLS)
console.log('\n2️⃣  Query as STEPHEN (with RLS):');

// First, sign in as Stephen
const anonClient = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek');

const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
  email: 'stephen@yodelmobile.com',
  password: 'testpassword123'  // Note: Replace with actual password if needed
});

if (authError) {
  console.error('   ❌ Auth Error:', authError.message);
  console.log('   Skipping RLS test (could not authenticate)');
} else {
  console.log('   ✅ Authenticated as:', authData.user.email);
  
  // Now query with Stephen's session
  const { data: userData, error: userError } = await anonClient
    .from('org_feature_entitlements')
    .select('feature_key, is_enabled, organization_id')
    .eq('organization_id', '7cccba3f-0a8f-446f-9dba-86e9cb68c92b')
    .limit(5);

  if (userError) {
    console.error('   ❌ Query Error:', userError);
    console.error('   Code:', userError.code);
    console.error('   Message:', userError.message);
    
    if (userError.code === '54001') {
      console.log('\n   🔥 CIRCULAR RLS DETECTED!');
      console.log('   The RLS policy is querying user_roles, creating infinite recursion');
    }
  } else {
    console.log('   ✅ Success! Retrieved', userData?.length, 'features');
    console.log('   Sample:', JSON.stringify(userData?.[0], null, 2));
  }
}

console.log('\n');
