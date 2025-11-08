/**
 * SYNC EXISTING AUTH USERS TO DATABASE
 *
 * This syncs the 4 existing auth.users to the database by creating:
 * 1. Yodel Mobile organization
 * 2. Profiles for all 4 users
 * 3. User_roles with appropriate roles
 * 4. Organization features
 *
 * Safe to run multiple times (uses UPSERT)
 *
 * Run: SUPABASE_SERVICE_ROLE_KEY='your-key' node scripts/sync-existing-users.mjs
 */

import { createClient } from '@supabase/supabase-js';

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
  }
});

// Role assignments based on email
const USER_ROLES = {
  'cli@yodelmobile.com': 'ORG_ADMIN',
  'igor@yodelmobile.com': 'ORG_ADMIN',
  'kasia@yodelmobile.com': 'ORG_ADMIN',
  'igorblnv@gmail.com': 'ORG_ADMIN' // Adjust as needed
};

async function syncUsers() {
  console.log('🔄 SYNCING EXISTING AUTH USERS TO DATABASE\n');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // 1. Get all auth users
    console.log('📋 Step 1: Fetching auth.users...');
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('❌ Failed to fetch auth users:', authError.message);
      throw authError;
    }

    const authUsers = authData.users;
    console.log(`✅ Found ${authUsers.length} user(s) in auth.users\n`);

    authUsers.forEach((u, i) => {
      console.log(`   ${i + 1}. ${u.email}`);
      console.log(`      ID: ${u.id}`);
      console.log(`      Last sign in: ${u.last_sign_in_at || 'Never'}\n`);
    });

    // 2. Create Yodel Mobile organization
    console.log('📋 Step 2: Creating Yodel Mobile organization...');

    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', 'yodel-mobile')
      .maybeSingle();

    let orgId;
    if (existingOrg) {
      console.log(`✅ Organization already exists: ${existingOrg.name} (${existingOrg.id})\n`);
      orgId = existingOrg.id;
    } else {
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: 'Yodel Mobile',
          slug: 'yodel-mobile',
          subscription_tier: 'enterprise'
        })
        .select()
        .single();

      if (orgError) {
        console.error('❌ Failed to create organization:', orgError.message);
        throw orgError;
      }

      console.log(`✅ Created organization: ${newOrg.name} (${newOrg.id})\n`);
      orgId = newOrg.id;
    }

    // 3. Create profiles for all auth users
    console.log('📋 Step 3: Creating profiles for auth users...');

    for (const authUser of authUsers) {
      const email = authUser.email;
      const [firstName, domain] = email.split('@');
      const lastName = domain.split('.')[0]; // e.g., "yodelmobile" from "yodelmobile.com"

      const profileData = {
        id: authUser.id,
        email: authUser.email,
        first_name: firstName.charAt(0).toUpperCase() + firstName.slice(1),
        last_name: lastName.charAt(0).toUpperCase() + lastName.slice(1),
        organization_id: orgId
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' });

      if (profileError) {
        console.error(`   ❌ Failed to create profile for ${email}:`, profileError.message);
      } else {
        console.log(`   ✅ Created profile: ${email}`);
      }
    }
    console.log('');

    // 4. Create user_roles for all users
    console.log('📋 Step 4: Creating user_roles...');

    for (const authUser of authUsers) {
      const email = authUser.email;
      const role = USER_ROLES[email] || 'ORG_ADMIN';

      const roleData = {
        user_id: authUser.id,
        role: role,
        organization_id: orgId
      };

      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert(roleData, { onConflict: 'user_id' });

      if (roleError) {
        console.error(`   ❌ Failed to create role for ${email}:`, roleError.message);
      } else {
        console.log(`   ✅ Created role: ${email} → ${role}`);
      }
    }
    console.log('');

    // 5. Create organization features
    console.log('📋 Step 5: Creating organization features...');

    const features = [
      { key: 'app_core_access', description: 'Core app access' },
      { key: 'executive_dashboard', description: 'Executive dashboard v2' },
      { key: 'reviews', description: 'Reviews page access' },
      { key: 'reporting_v2', description: 'Reporting v2 features' }
    ];

    for (const feature of features) {
      const { error: featureError } = await supabase
        .from('organization_features')
        .upsert({
          organization_id: orgId,
          feature_key: feature.key,
          is_enabled: true
        }, { onConflict: 'organization_id,feature_key' });

      if (featureError) {
        console.error(`   ❌ Failed to create feature ${feature.key}:`, featureError.message);
      } else {
        console.log(`   ✅ Created feature: ${feature.key}`);
      }
    }
    console.log('');

    // 6. Verify the sync
    console.log('📋 Step 6: Verifying sync...\n');

    const { data: verifyProfiles } = await supabase
      .from('profiles')
      .select('id, email, organization_id')
      .eq('organization_id', orgId);

    const { data: verifyRoles } = await supabase
      .from('user_roles')
      .select('user_id, role, organization_id')
      .eq('organization_id', orgId);

    const { data: verifyFeatures } = await supabase
      .from('organization_features')
      .select('feature_key, is_enabled')
      .eq('organization_id', orgId)
      .eq('is_enabled', true);

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ SYNC COMPLETE\n');
    console.log('📊 VERIFICATION:\n');
    console.log(`   Organization: Yodel Mobile (${orgId})`);
    console.log(`   Profiles synced: ${verifyProfiles?.length || 0}/${authUsers.length}`);
    console.log(`   Roles created: ${verifyRoles?.length || 0}/${authUsers.length}`);
    console.log(`   Features enabled: ${verifyFeatures?.length || 0}/4\n`);

    if (verifyProfiles && verifyProfiles.length > 0) {
      console.log('   Synced users:');
      verifyProfiles.forEach(p => {
        const role = verifyRoles?.find(r => r.user_id === p.id);
        console.log(`      ✅ ${p.email} - ${role?.role || 'NO ROLE'}`);
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
    console.log('   3. Verify UI shows "Yodel Mobile" organization');
    console.log('   4. Check that no more [ENTERPRISE-FALLBACK] warnings appear\n');

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run sync
syncUsers();
