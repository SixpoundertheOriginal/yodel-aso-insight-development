/**
 * SEED YODEL MOBILE ORGANIZATION AND USER
 *
 * Creates:
 * 1. Yodel Mobile organization
 * 2. cli@yodelmobile.com user with ORG_ADMIN role
 * 3. Organization features (app_core_access, executive_dashboard, reviews, reporting_v2)
 *
 * Run: node scripts/seed-yodel-mobile.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
  console.log('   Set it in your environment or .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const TEST_EMAIL = 'cli@yodelmobile.com';
const TEST_PASSWORD = 'YodelAdmin123!';
const ORG_NAME = 'Yodel Mobile';
const ORG_SLUG = 'yodel-mobile';

async function seedDatabase() {
  console.log('🌱 SEEDING DATABASE\n');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // 1. Create organization
    console.log('📋 Step 1: Creating Yodel Mobile organization...');

    let { data: existingOrg } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', ORG_SLUG)
      .single();

    let orgId;
    if (existingOrg) {
      console.log(`✅ Organization already exists: ${existingOrg.name} (${existingOrg.id})\n`);
      orgId = existingOrg.id;
    } else {
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: ORG_NAME,
          slug: ORG_SLUG,
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

    // 2. Create user in auth.users
    console.log('📋 Step 2: Creating user in auth.users...');

    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(u => u.email === TEST_EMAIL);

    let userId;
    if (userExists) {
      console.log(`✅ User already exists in auth: ${userExists.email} (${userExists.id})\n`);
      userId = userExists.id;
    } else {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          first_name: 'CLI',
          last_name: 'Admin'
        }
      });

      if (authError) {
        console.error('❌ Failed to create user in auth:', authError.message);
        throw authError;
      }

      console.log(`✅ Created user in auth: ${authUser.user.email} (${authUser.user.id})`);
      console.log(`   Password: ${TEST_PASSWORD}\n`);
      userId = authUser.user.id;
    }

    // 3. Create profile
    console.log('📋 Step 3: Creating user profile...');

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      console.log(`✅ Profile already exists: ${existingProfile.email}\n`);
    } else {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: TEST_EMAIL,
          first_name: 'CLI',
          last_name: 'Admin',
          organization_id: orgId
        });

      if (profileError) {
        console.error('❌ Failed to create profile:', profileError.message);
        throw profileError;
      }

      console.log(`✅ Created profile for ${TEST_EMAIL}\n`);
    }

    // 4. Create user_roles entry
    console.log('📋 Step 4: Creating user_roles entry...');

    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('user_id, role, organization_id')
      .eq('user_id', userId)
      .single();

    if (existingRole) {
      console.log(`✅ User role already exists: ${existingRole.role}`);

      // Update if organization_id is NULL
      if (!existingRole.organization_id) {
        console.log('   Updating organization_id...');
        const { error: updateError } = await supabase
          .from('user_roles')
          .update({ organization_id: orgId, role: 'ORG_ADMIN' })
          .eq('user_id', userId);

        if (updateError) {
          console.error('❌ Failed to update user_roles:', updateError.message);
          throw updateError;
        }
        console.log('✅ Updated organization_id\n');
      } else {
        console.log('');
      }
    } else {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          email: TEST_EMAIL,
          role: 'ORG_ADMIN',
          organization_id: orgId
        });

      if (roleError) {
        console.error('❌ Failed to create user_roles:', roleError.message);
        throw roleError;
      }

      console.log(`✅ Created user_roles entry with ORG_ADMIN role\n`);
    }

    // 5. Create organization features
    console.log('📋 Step 5: Creating organization features...');

    const features = [
      { key: 'app_core_access', description: 'Core app access' },
      { key: 'executive_dashboard', description: 'Executive dashboard v2' },
      { key: 'reviews', description: 'Reviews page access' },
      { key: 'reporting_v2', description: 'Reporting v2 features' }
    ];

    for (const feature of features) {
      const { data: existingFeature } = await supabase
        .from('organization_features')
        .select('feature_key, is_enabled')
        .eq('organization_id', orgId)
        .eq('feature_key', feature.key)
        .single();

      if (existingFeature) {
        console.log(`   ✅ Feature already exists: ${feature.key} (${existingFeature.is_enabled ? 'enabled' : 'disabled'})`);
      } else {
        const { error: featureError } = await supabase
          .from('organization_features')
          .insert({
            organization_id: orgId,
            feature_key: feature.key,
            is_enabled: true
          });

        if (featureError) {
          console.error(`   ❌ Failed to create feature ${feature.key}:`, featureError.message);
        } else {
          console.log(`   ✅ Created feature: ${feature.key} (enabled)`);
        }
      }
    }

    console.log('');

    // 6. Verify the setup
    console.log('📋 Step 6: Verifying setup...\n');

    const { data: verifyProfile } = await supabase
      .from('profiles')
      .select('id, email, organization_id')
      .eq('id', userId)
      .single();

    const { data: verifyRole } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        role,
        organization_id,
        organizations (
          id,
          name,
          slug
        )
      `)
      .eq('user_id', userId)
      .single();

    const { data: verifyFeatures } = await supabase
      .from('organization_features')
      .select('feature_key, is_enabled')
      .eq('organization_id', orgId);

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ DATABASE SEEDED SUCCESSFULLY\n');
    console.log('📊 VERIFICATION:\n');
    console.log(`   User: ${TEST_EMAIL}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Profile Org ID: ${verifyProfile?.organization_id || '❌ NULL'}`);
    console.log(`   User Role: ${verifyRole?.role}`);
    console.log(`   Role Org ID: ${verifyRole?.organization_id || '❌ NULL'}`);
    console.log(`   Organization: ${verifyRole?.organizations?.name} (${verifyRole?.organizations?.slug})`);
    console.log(`   Features: ${verifyFeatures?.length || 0} enabled\n`);

    if (verifyFeatures && verifyFeatures.length > 0) {
      verifyFeatures.forEach(f => {
        const status = f.is_enabled ? '✅' : '❌';
        console.log(`      ${status} ${f.feature_key}`);
      });
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════\n');
    console.log('🎉 You can now login with:');
    console.log(`   Email: ${TEST_EMAIL}`);
    console.log(`   Password: ${TEST_PASSWORD}\n`);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run seeding
seedDatabase();
