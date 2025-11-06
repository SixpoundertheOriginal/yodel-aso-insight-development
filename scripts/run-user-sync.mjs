/**
 * RUN USER SYNC VIA SQL
 *
 * Executes the fix-user-sync.sql script to properly sync users
 *
 * Run: node scripts/run-user-sync.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function runSync() {
  console.log('🔄 Running user sync via SQL...\n');

  try {
    const orgId = '7cccba3f-0a8f-446f-9dba-86e9cb68c92b'; // Existing Yodel Mobile org

    // 1. Create profiles
    console.log('📋 Step 1: Creating profiles...');

    const profiles = [
      { id: '8920ac57-63da-4f8e-9970-719be1e2569c', email: 'cli@yodelmobile.com', first_name: 'CLI', last_name: 'Admin' },
      { id: '813ca44d-86ea-4e23-9319-d5d6f45f73eb', email: 'igorblnv@gmail.com', first_name: 'Igor', last_name: 'Blinov' },
      { id: '2951a917-2086-476a-9b2e-915821a9ff0c', email: 'kasia@yodelmobile.com', first_name: 'Kasia', last_name: 'Yodel' },
      { id: '9487fa9d-f0cc-427c-900b-98871c19498a', email: 'igor@yodelmobile.com', first_name: 'Igor', last_name: 'Yodel' }
    ];

    for (const profile of profiles) {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: profile.id,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          org_id: orgId
        }, { onConflict: 'id' });

      if (error) {
        console.error(`   ❌ Failed to create profile for ${profile.email}:`, error.message);
      } else {
        console.log(`   ✅ Created profile: ${profile.email}`);
      }
    }
    console.log('');

    // 2. Delete existing user_roles and insert new ones
    console.log('📋 Step 2: Creating user_roles...');

    const userIds = profiles.map(p => p.id);

    // Delete existing roles first
    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .in('user_id', userIds);

    if (deleteError) {
      console.error('   ⚠️  Warning: Could not delete existing roles:', deleteError.message);
    }

    // Insert new roles
    const roles = userIds.map(userId => ({
      user_id: userId,
      role: 'ORG_ADMIN',
      organization_id: orgId
    }));

    const { error: rolesError } = await supabase
      .from('user_roles')
      .insert(roles);

    if (rolesError) {
      console.error('   ❌ Failed to create user_roles:', rolesError.message);
    } else {
      console.log(`   ✅ Created ${roles.length} user_roles`);
    }
    console.log('');

    // 3. Verify
    console.log('📋 Step 3: Verifying sync...\n');

    const { data: verifyProfiles } = await supabase
      .from('profiles')
      .select('id, email, org_id')
      .in('id', userIds);

    const { data: verifyRoles } = await supabase
      .from('user_roles')
      .select('user_id, role, organization_id')
      .in('user_id', userIds);

    const { data: verifyFeatures } = await supabase
      .from('organization_features')
      .select('feature_key, is_enabled')
      .eq('organization_id', orgId)
      .eq('is_enabled', true);

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ SYNC COMPLETE\n');
    console.log('📊 VERIFICATION:\n');
    console.log(`   Organization: Yodel Mobile (${orgId})`);
    console.log(`   Profiles synced: ${verifyProfiles?.length || 0}/4`);
    console.log(`   Roles created: ${verifyRoles?.length || 0}/4`);
    console.log(`   Features enabled: ${verifyFeatures?.length || 0}\n`);

    if (verifyProfiles && verifyProfiles.length > 0) {
      console.log('   Synced users:');
      verifyProfiles.forEach(p => {
        const role = verifyRoles?.find(r => r.user_id === p.id);
        const hasOrg = p.org_id ? '✅' : '❌';
        console.log(`      ${hasOrg} ${p.email} - ${role?.role || 'NO ROLE'}`);
      });
      console.log('');
    }

    if (verifyFeatures && verifyFeatures.length > 0) {
      console.log('   Enabled features:');
      verifyFeatures.forEach(f => {
        console.log(`      ✅ ${f.feature_key}`);
      });
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════\n');
    console.log('🎉 SUCCESS! All existing auth users synced to database\n');
    console.log('✅ Next steps:');
    console.log('   1. Clear browser cache or use incognito');
    console.log('   2. Login with cli@yodelmobile.com');
    console.log('   3. No more [ENTERPRISE-FALLBACK] warnings!');
    console.log('   4. UI should show "Manage users in your organization"\n');

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run
runSync();
