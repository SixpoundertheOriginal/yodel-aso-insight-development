/**
 * COMPLETE DATABASE AUDIT
 *
 * Checks:
 * 1. Auth users (requires service role key)
 * 2. Profiles table
 * 3. Organizations table
 * 4. User_roles table (checks actual schema)
 * 5. Organization_features table
 * 6. Any legacy auth tables
 *
 * Run: node scripts/audit-complete-state.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bkbcqocpjahewqjmlgvf.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrYmNxb2NwamFoZXdxam1sZ3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTgsImV4cCI6MjA2MjM4MzA5OH0.K00WoAEZNf93P-6r3dCwOZaYah51bYuBPwHtDdW82Ek';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 COMPLETE DATABASE AUDIT\n');
console.log('═══════════════════════════════════════════════════\n');

// Create both clients
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let adminClient = null;

if (SUPABASE_SERVICE_ROLE_KEY) {
  adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log('✅ Service role key found - can check auth.users\n');
} else {
  console.log('⚠️  No service role key - limited audit (can\'t check auth.users)\n');
}

async function auditDatabase() {
  try {
    // 1. Check auth.users (requires service role)
    console.log('📋 1. AUTH.USERS TABLE (Auth System)');
    if (adminClient) {
      const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers();

      if (authError) {
        console.log(`   ❌ Error: ${authError.message}\n`);
      } else {
        console.log(`   Found ${authUsers.users.length} user(s) in auth.users:\n`);
        authUsers.users.forEach((u, i) => {
          console.log(`   ${i + 1}. ${u.email}`);
          console.log(`      ID: ${u.id}`);
          console.log(`      Email confirmed: ${u.email_confirmed_at ? '✅' : '❌'}`);
          console.log(`      Created: ${u.created_at}`);
          console.log(`      Last sign in: ${u.last_sign_in_at || 'Never'}\n`);
        });
      }
    } else {
      console.log('   ⏭️  Skipped (no service role key)\n');
    }

    // 2. Check table schema first
    console.log('📋 2. DATABASE SCHEMA CHECK');

    // Try to get schema info via RPC or information_schema
    const { data: userRolesSchema, error: schemaError } = await anonClient
      .from('user_roles')
      .select('*')
      .limit(0);

    console.log(`   user_roles query test: ${schemaError ? `❌ ${schemaError.message}` : '✅ accessible'}\n`);

    // 3. Check profiles
    console.log('📋 3. PROFILES TABLE');
    const { data: profiles, error: profileError } = await anonClient
      .from('profiles')
      .select('*');

    if (profileError) {
      console.log(`   ❌ Error: ${profileError.message}\n`);
    } else if (!profiles || profiles.length === 0) {
      console.log('   No profiles found\n');
    } else {
      console.log(`   Found ${profiles.length} profile(s):\n`);
      profiles.forEach((p, i) => {
        console.log(`   ${i + 1}. Email: ${p.email || 'N/A'}`);
        console.log(`      ID: ${p.id}`);
        console.log(`      Organization ID: ${p.organization_id || '❌ NULL'}`);
        console.log(`      Name: ${p.first_name || ''} ${p.last_name || ''}`);
        console.log(`      Created: ${p.created_at}\n`);
      });
    }

    // 4. Check organizations
    console.log('📋 4. ORGANIZATIONS TABLE');
    const { data: orgs, error: orgsError } = await anonClient
      .from('organizations')
      .select('*');

    if (orgsError) {
      console.log(`   ❌ Error: ${orgsError.message}\n`);
    } else if (!orgs || orgs.length === 0) {
      console.log('   No organizations found\n');
    } else {
      console.log(`   Found ${orgs.length} organization(s):\n`);
      orgs.forEach((org, i) => {
        console.log(`   ${i + 1}. ${org.name} (${org.slug})`);
        console.log(`      ID: ${org.id}`);
        console.log(`      Tier: ${org.subscription_tier || 'N/A'}`);
        console.log(`      Created: ${org.created_at}\n`);
      });
    }

    // 5. Check user_roles (without email field)
    console.log('📋 5. USER_ROLES TABLE');
    const { data: userRoles, error: roleError } = await anonClient
      .from('user_roles')
      .select('user_id, role, organization_id, created_at');

    if (roleError) {
      console.log(`   ❌ Error: ${roleError.message}\n`);
    } else if (!userRoles || userRoles.length === 0) {
      console.log('   No user_roles found\n');
    } else {
      console.log(`   Found ${userRoles.length} user role(s):\n`);
      userRoles.forEach((r, i) => {
        console.log(`   ${i + 1}. User ID: ${r.user_id.substring(0, 8)}...`);
        console.log(`      Role: ${r.role}`);
        console.log(`      Organization ID: ${r.organization_id || '❌ NULL'}`);
        console.log(`      Created: ${r.created_at}\n`);
      });
    }

    // 6. Check organization_features
    console.log('📋 6. ORGANIZATION_FEATURES TABLE');
    const { data: features, error: featuresError } = await anonClient
      .from('organization_features')
      .select('*');

    if (featuresError) {
      console.log(`   ❌ Error: ${featuresError.message}\n`);
    } else if (!features || features.length === 0) {
      console.log('   No organization features found\n');
    } else {
      console.log(`   Found ${features.length} feature(s):\n`);

      const byOrg = {};
      features.forEach(f => {
        const orgId = f.organization_id.substring(0, 8);
        if (!byOrg[orgId]) byOrg[orgId] = [];
        byOrg[orgId].push(f);
      });

      Object.entries(byOrg).forEach(([orgId, feats]) => {
        console.log(`   Org ${orgId}...:`);
        feats.forEach(f => {
          const status = f.is_enabled ? '✅' : '❌';
          console.log(`      ${status} ${f.feature_key}`);
        });
        console.log('');
      });
    }

    // 7. Check for legacy tables
    console.log('📋 7. LEGACY TABLES CHECK');

    const legacyTables = ['org_users', 'org_users_deprecated', 'user_permissions'];
    for (const table of legacyTables) {
      const { error } = await anonClient.from(table).select('*').limit(1);
      if (!error) {
        const { data, error: countError } = await anonClient.from(table).select('*', { count: 'exact', head: true });
        console.log(`   ⚠️  Found legacy table: ${table} (${countError ? 'unknown count' : 'exists'})`);
      }
    }
    console.log('   ✅ Legacy table check complete\n');

    // 8. Summary and diagnosis
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 AUDIT SUMMARY\n');

    const authUserCount = adminClient ? (await adminClient.auth.admin.listUsers()).data?.users.length : '?';
    const profileCount = profiles?.length || 0;
    const orgCount = orgs?.length || 0;
    const roleCount = userRoles?.length || 0;
    const featureCount = features?.length || 0;

    console.log(`   Auth Users: ${authUserCount}`);
    console.log(`   Profiles: ${profileCount}`);
    console.log(`   Organizations: ${orgCount}`);
    console.log(`   User Roles: ${roleCount}`);
    console.log(`   Features: ${featureCount}\n`);

    // Diagnose issues
    console.log('🔍 DIAGNOSIS:\n');

    if (authUserCount > 0 && profileCount === 0) {
      console.log('   ❌ ISSUE: Users exist in auth.users but NO profiles');
      console.log('      → Users can authenticate but have no profile data');
      console.log('      → Need to create profiles for existing auth users\n');
    }

    if (profileCount > 0 && roleCount === 0) {
      console.log('   ❌ ISSUE: Profiles exist but NO user_roles');
      console.log('      → Users have profiles but no role/organization assignment');
      console.log('      → Need to create user_roles entries\n');
    }

    if (roleCount > 0 && orgCount === 0) {
      console.log('   ❌ ISSUE: User_roles exist but NO organizations');
      console.log('      → Roles reference non-existent organizations');
      console.log('      → Need to create organizations\n');
    }

    if (roleCount > 0) {
      const rolesWithoutOrg = userRoles.filter(r => !r.organization_id);
      if (rolesWithoutOrg.length > 0) {
        console.log(`   ❌ ISSUE: ${rolesWithoutOrg.length} user_roles have NULL organization_id`);
        console.log('      → Users have roles but not assigned to an organization');
        console.log('      → Need to set organization_id\n');
      }
    }

    if (authUserCount === 0 && profileCount === 0 && orgCount === 0) {
      console.log('   ✅ Database is empty - ready for fresh seeding\n');
    } else if (authUserCount > 0 && profileCount > 0 && orgCount > 0 && roleCount > 0) {
      console.log('   ✅ Database appears properly configured\n');
    }

    console.log('═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Audit failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run audit
auditDatabase();
