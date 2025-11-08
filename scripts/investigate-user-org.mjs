/**
 * INVESTIGATION: User Organization Setup
 *
 * Check database state for cli@yodelmobile.com and identify any confusing data
 *
 * Run: CLI_TEST_EMAIL=cli@yodelmobile.com node scripts/investigate-user-org.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';

const TEST_EMAIL = process.env.CLI_TEST_EMAIL || 'cli@yodelmobile.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function investigateUserOrganization() {
  console.log('🔍 INVESTIGATING USER ORGANIZATION SETUP\n');
  console.log(`Email: ${TEST_EMAIL}\n`);
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // 1. Get user profile
    console.log('📋 1. USER PROFILE');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, created_at')
      .eq('email', TEST_EMAIL);

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError.message);
      process.exit(1);
    }

    if (!profiles || profiles.length === 0) {
      console.error('❌ No profile found');
      process.exit(1);
    }

    if (profiles.length > 1) {
      console.warn(`⚠️  ISSUE: Multiple profiles found (${profiles.length})`);
      console.log('   This should not happen - each email should have ONE profile\n');
      profiles.forEach((p, i) => {
        console.log(`   Profile ${i + 1}:`);
        console.log(`     ID: ${p.id}`);
        console.log(`     Email: ${p.email}`);
        console.log(`     Created: ${p.created_at}\n`);
      });
    } else {
      console.log(`✅ Profile ID: ${profiles[0].id}`);
      console.log(`✅ Email: ${profiles[0].email}\n`);
    }

    const userId = profiles[0].id;

    // 2. Check user_roles
    console.log('📋 2. USER ROLES');
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select(`
        id,
        user_id,
        email,
        role,
        organization_id,
        created_at,
        organizations (
          id,
          name,
          slug
        )
      `)
      .eq('user_id', userId);

    if (roleError) {
      console.error('❌ Error fetching user_roles:', roleError.message);
    } else if (!userRoles || userRoles.length === 0) {
      console.error('❌ CRITICAL: No user_roles found for this user');
      console.log('   This user needs a row in user_roles with:');
      console.log('   - organization_id → Yodel Mobile org ID');
      console.log('   - role → ORG_ADMIN or ORGANIZATION_ADMIN\n');
    } else if (userRoles.length > 1) {
      console.warn(`⚠️  ISSUE: Multiple user_roles found (${userRoles.length})`);
      console.log('   This should not happen - each user should have ONE role\n');
      userRoles.forEach((r, i) => {
        console.log(`   Role ${i + 1}:`);
        console.log(`     ID: ${r.id}`);
        console.log(`     Role: ${r.role}`);
        console.log(`     Organization ID: ${r.organization_id || '❌ NULL'}`);
        console.log(`     Organization Name: ${r.organizations?.name || 'N/A'}`);
        console.log(`     Created: ${r.created_at}\n`);
      });
    } else {
      const role = userRoles[0];
      console.log(`✅ Role: ${role.role}`);
      console.log(`${role.organization_id ? '✅' : '❌'} Organization ID: ${role.organization_id || 'NULL'}`);
      console.log(`${role.organizations ? '✅' : '❌'} Organization Name: ${role.organizations?.name || 'N/A'}`);
      console.log(`${role.organizations ? '✅' : '❌'} Organization Slug: ${role.organizations?.slug || 'N/A'}\n`);

      if (!role.organization_id) {
        console.error('❌ CRITICAL ISSUE: organization_id is NULL');
        console.log('   This explains the [ENTERPRISE-FALLBACK] warning\n');
      }
    }

    // 3. Check all organizations
    console.log('📋 3. ALL ORGANIZATIONS');
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, slug, created_at')
      .order('name');

    if (orgsError) {
      console.error('❌ Error fetching organizations:', orgsError.message);
    } else if (!orgs || orgs.length === 0) {
      console.error('❌ No organizations found');
    } else {
      console.log(`Found ${orgs.length} organization(s):\n`);
      orgs.forEach((org, i) => {
        console.log(`   ${i + 1}. ${org.name} (${org.slug})`);
        console.log(`      ID: ${org.id}`);
        console.log(`      Created: ${org.created_at}\n`);
      });
    }

    // 4. Check organization_features for all orgs
    console.log('📋 4. ORGANIZATION FEATURES');
    const { data: allFeatures, error: featuresError } = await supabase
      .from('organization_features')
      .select(`
        organization_id,
        feature_key,
        is_enabled,
        organizations (
          name,
          slug
        )
      `)
      .order('organization_id, feature_key');

    if (featuresError) {
      console.error('❌ Error fetching organization_features:', featuresError.message);
    } else if (!allFeatures || allFeatures.length === 0) {
      console.error('❌ No organization features found');
    } else {
      console.log(`Found ${allFeatures.length} feature(s):\n`);

      const featuresByOrg = {};
      allFeatures.forEach(f => {
        const orgName = f.organizations?.name || 'Unknown Org';
        if (!featuresByOrg[orgName]) {
          featuresByOrg[orgName] = [];
        }
        featuresByOrg[orgName].push(f);
      });

      Object.entries(featuresByOrg).forEach(([orgName, features]) => {
        console.log(`   ${orgName}:`);
        features.forEach(f => {
          const status = f.is_enabled ? '✅ ENABLED' : '❌ DISABLED';
          console.log(`     ${status}: ${f.feature_key}`);
        });
        console.log('');
      });
    }

    // 5. Summary and recommendations
    console.log('═══════════════════════════════════════════════════\n');
    console.log('📊 SUMMARY & RECOMMENDATIONS\n');

    if (!userRoles || userRoles.length === 0) {
      console.log('❌ CRITICAL: User has no entry in user_roles');
      console.log('   Action needed: Insert row in user_roles with organization_id\n');
    } else if (userRoles.length > 1) {
      console.log('⚠️  WARNING: User has multiple rows in user_roles');
      console.log('   Action needed: Delete duplicate rows, keep only one\n');
    } else if (!userRoles[0].organization_id) {
      console.log('❌ CRITICAL: User has NULL organization_id in user_roles');
      console.log('   Action needed: Update user_roles to set organization_id\n');

      if (orgs && orgs.length > 0) {
        const yodelOrg = orgs.find(o => o.slug === 'yodel-mobile' || o.name.includes('Yodel'));
        if (yodelOrg) {
          console.log(`   Suggested fix:`);
          console.log(`   UPDATE user_roles`);
          console.log(`   SET organization_id = '${yodelOrg.id}'`);
          console.log(`   WHERE user_id = '${userId}';\n`);
        }
      }
    } else {
      console.log('✅ User has valid organization_id\n');
    }

    if (profiles && profiles.length > 1) {
      console.log('⚠️  WARNING: Multiple profiles for same email');
      console.log('   This can cause confusion in UI tables/headers\n');
    }

  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run investigation
investigateUserOrganization();
