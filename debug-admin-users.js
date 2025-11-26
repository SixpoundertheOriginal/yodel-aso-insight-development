#!/usr/bin/env node

/**
 * Debug script for admin-users Edge Function
 * Tests user creation flow with proper authentication
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';

async function testAdminUsersFunction() {
  console.log('=== Testing admin-users Edge Function ===\n');

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('Step 1: Getting current session...');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    console.error('❌ No active session found. Please login first.');
    console.error('Error:', sessionError?.message);
    process.exit(1);
  }

  console.log('✓ Session found for user:', session.user.email);
  console.log('  User ID:', session.user.id);
  console.log('  Access token (first 20 chars):', session.access_token.slice(0, 20) + '...\n');

  // Check if user is super admin
  console.log('Step 2: Checking super admin status...');
  const { data: isSuperAdmin, error: adminError } = await supabase.rpc('is_super_admin');

  if (adminError) {
    console.error('❌ Error checking super admin status:', adminError.message);
  } else {
    console.log('✓ Super admin status:', isSuperAdmin ? 'YES' : 'NO\n');
  }

  // Get user's organizations
  console.log('Step 3: Getting user organizations...');
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select('role, organization_id, organizations(id, name, slug)')
    .eq('user_id', session.user.id);

  if (rolesError) {
    console.error('❌ Error fetching user roles:', rolesError.message);
  } else {
    console.log('✓ User has', userRoles?.length || 0, 'role(s):');
    userRoles?.forEach(r => {
      console.log('  -', r.role, 'in org:', r.organizations?.name || r.organization_id);
    });
    console.log('');
  }

  // Test: List users
  console.log('Step 4: Testing LIST users action...');
  try {
    const { data: listData, error: listError } = await supabase.functions.invoke('admin-users', {
      body: { action: 'list' }
    });

    if (listError) {
      console.error('❌ LIST failed:', listError);
      console.error('  Error message:', listError.message);

      // Try to get response body
      if (listError.context) {
        try {
          const text = await listError.context.text?.();
          console.error('  Response body:', text);
        } catch (e) {
          console.error('  Could not read response body');
        }
      }
    } else {
      console.log('✓ LIST succeeded');
      console.log('  Users count:', listData?.data?.length || 0);
      if (listData?.data?.length > 0) {
        console.log('  First user:', listData.data[0].email);
      }
    }
  } catch (err) {
    console.error('❌ Unexpected error during LIST:', err.message);
  }
  console.log('');

  // Test: Create user (with Yodel Mobile org)
  console.log('Step 5: Testing CREATE user action...');

  // Get Yodel Mobile organization ID
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', 'yodel-mobile')
    .maybeSingle();

  if (orgError || !orgs) {
    console.error('❌ Could not find Yodel Mobile organization');
    console.error('  Error:', orgError?.message || 'Not found');
  } else {
    console.log('✓ Found organization:', orgs.name, '(', orgs.id, ')');

    const testUserData = {
      action: 'create',
      email: `test.user.${Date.now()}@example.com`,
      first_name: 'Test',
      last_name: 'User',
      organization_id: orgs.id,
      roles: ['VIEWER'],
      password: 'TestPassword123!'
    };

    console.log('\n  Creating user with payload:');
    console.log('    Email:', testUserData.email);
    console.log('    Name:', testUserData.first_name, testUserData.last_name);
    console.log('    Org ID:', testUserData.organization_id);
    console.log('    Roles:', testUserData.roles);
    console.log('    Has password:', !!testUserData.password);
    console.log('');

    try {
      const { data: createData, error: createError } = await supabase.functions.invoke('admin-users', {
        body: testUserData
      });

      if (createError) {
        console.error('❌ CREATE failed');
        console.error('  Error name:', createError.name);
        console.error('  Error message:', createError.message);

        // Try to get detailed error info
        if (createError.context) {
          console.error('  HTTP status:', createError.context.status);
          console.error('  Status text:', createError.context.statusText);

          try {
            const responseBody = await createError.context.text?.();
            console.error('  Response body:', responseBody);

            // Try to parse as JSON
            try {
              const parsed = JSON.parse(responseBody);
              console.error('  Parsed error:', JSON.stringify(parsed, null, 2));
            } catch (e) {
              // Not JSON
            }
          } catch (e) {
            console.error('  Could not read response body');
          }
        }
      } else {
        console.log('✓ CREATE succeeded');
        console.log('  Created user:', JSON.stringify(createData, null, 2));
      }
    } catch (err) {
      console.error('❌ Unexpected error during CREATE:', err.message);
      console.error('  Stack:', err.stack);
    }
  }

  console.log('\n=== Test Complete ===');
}

testAdminUsersFunction().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
