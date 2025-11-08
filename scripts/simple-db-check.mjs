/**
 * SIMPLE DATABASE CHECK
 *
 * Check what data exists without complex joins
 *
 * Run: node scripts/simple-db-check.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function simpleDbCheck() {
  console.log('🔍 SIMPLE DATABASE CHECK\n');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // 1. Check profiles
    console.log('📋 PROFILES TABLE');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, created_at')
      .order('email');

    if (profileError) {
      console.log(`❌ Error: ${profileError.message}\n`);
    } else if (!profiles || profiles.length === 0) {
      console.log('   No profiles found\n');
    } else {
      console.log(`   Found ${profiles.length} profile(s):\n`);
      profiles.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.email}`);
        console.log(`      ID: ${p.id.substring(0, 8)}...\n`);
      });
    }

    // 2. Check organizations (without joins)
    console.log('📋 ORGANIZATIONS TABLE');
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .order('name');

    if (orgsError) {
      console.log(`❌ Error: ${orgsError.message}\n`);
    } else if (!orgs || orgs.length === 0) {
      console.log('   No organizations found\n');
    } else {
      console.log(`   Found ${orgs.length} organization(s):\n`);
      orgs.forEach((org, i) => {
        console.log(`   ${i + 1}. ${org.name} (${org.slug})`);
        console.log(`      ID: ${org.id.substring(0, 8)}...\n`);
      });
    }

    // 3. Check user_roles (without joins)
    console.log('📋 USER_ROLES TABLE');
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('id, user_id, email, role, organization_id')
      .order('email');

    if (roleError) {
      console.log(`❌ Error: ${roleError.message}\n`);
    } else if (!userRoles || userRoles.length === 0) {
      console.log('   No user_roles found\n');
    } else {
      console.log(`   Found ${userRoles.length} user role(s):\n`);
      userRoles.forEach((r, i) => {
        const orgStatus = r.organization_id ? '✅ HAS ORG' : '❌ NULL ORG';
        console.log(`   ${i + 1}. ${r.email || 'No email'} - ${r.role}`);
        console.log(`      User ID: ${r.user_id.substring(0, 8)}...`);
        console.log(`      Org ID: ${orgStatus}\n`);
      });

      // Check for NULL org_ids
      const nullOrgRoles = userRoles.filter(r => !r.organization_id);
      if (nullOrgRoles.length > 0) {
        console.log(`   ⚠️  ${nullOrgRoles.length} user(s) with NULL organization_id:\n`);
        nullOrgRoles.forEach(r => {
          console.log(`      - ${r.email || r.user_id.substring(0, 8)} (${r.role})`);
        });
        console.log('');
      }
    }

    // 4. Check organization_features
    console.log('📋 ORGANIZATION_FEATURES TABLE');
    const { data: features, error: featuresError } = await supabase
      .from('organization_features')
      .select('organization_id, feature_key, is_enabled')
      .order('organization_id, feature_key');

    if (featuresError) {
      console.log(`❌ Error: ${featuresError.message}\n`);
    } else if (!features || features.length === 0) {
      console.log('   No features found\n');
    } else {
      console.log(`   Found ${features.length} feature(s)\n`);

      // Group by org
      const featuresByOrg = {};
      features.forEach(f => {
        const orgId = f.organization_id.substring(0, 8);
        if (!featuresByOrg[orgId]) {
          featuresByOrg[orgId] = [];
        }
        featuresByOrg[orgId].push(f);
      });

      Object.entries(featuresByOrg).forEach(([orgId, orgFeatures]) => {
        console.log(`   Org ${orgId}...:`);
        orgFeatures.forEach(f => {
          const status = f.is_enabled ? '✅' : '❌';
          console.log(`     ${status} ${f.feature_key}`);
        });
        console.log('');
      });
    }

    // 5. Summary
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 SUMMARY\n');
    console.log(`   Profiles: ${profiles?.length || 0}`);
    console.log(`   Organizations: ${orgs?.length || 0}`);
    console.log(`   User Roles: ${userRoles?.length || 0}`);
    console.log(`   Features: ${features?.length || 0}\n`);

    if (userRoles && orgs && userRoles.length > 0 && orgs.length > 0) {
      // Match user_roles with orgs manually
      console.log('🔗 MATCHING USERS TO ORGANIZATIONS:\n');
      userRoles.forEach(r => {
        if (r.organization_id) {
          const org = orgs.find(o => o.id === r.organization_id);
          console.log(`   ${r.email || 'No email'} (${r.role})`);
          console.log(`   → ${org ? org.name : 'Unknown Org'}\n`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run
simpleDbCheck();
